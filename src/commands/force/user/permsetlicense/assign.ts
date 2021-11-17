/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Aliases, Messages, SfdxError, User, UserFields } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'permsetlicense.assign');

type SuccessMsg = {
  name: string;
  value: string;
};

type FailureMsg = {
  name: string;
  message: string;
};

export type PSLResult = {
  successes: SuccessMsg[];
  failures: FailureMsg[];
};

interface PermissionSetLicense {
  Id: string;
}

export class UserPermsetLicenseAssignCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    name: flags.string({
      char: 'n',
      description: messages.getMessage('flags.name'),
      required: true,
    }),
    onbehalfof: flags.array({
      char: 'o',
      description: messages.getMessage('flags.onBehalfOf'),
    }),
  };
  private readonly successes: SuccessMsg[] = [];
  private readonly failures: FailureMsg[] = [];
  private pslId: string;

  public async run(): Promise<PSLResult> {
    const usernamesOrAliases = (this.flags.onbehalfof as string[]) ?? [this.org.getUsername()];
    this.logger.debug(`will assign permset to users: ${usernamesOrAliases.join(', ')}`);
    const pslName = this.flags.name as string;

    const conn = this.org.getConnection();
    try {
      this.pslId = (
        await conn.singleRecordQuery<PermissionSetLicense>(
          `select Id from PermissionSetLicense where DeveloperName = '${pslName}' or MasterLabel = '${pslName}'`
        )
      ).Id;
    } catch {
      throw new SfdxError('PermissionSetLicense not found');
    }
    (
      await Promise.all(
        usernamesOrAliases.map((usernameOrAlias) => this.usernameToPSLAssignment({ pslName, usernameOrAlias }))
      )
    ).map((result) => {
      if (isSuccess(result)) {
        this.successes.push(result);
      } else {
        this.failures.push(result);
      }
    });

    this.print();
    this.setExitCode();

    return {
      successes: this.successes,
      failures: this.failures,
    };
  }

  // handles one username/psl combo so these can run in parallel
  private async usernameToPSLAssignment({
    pslName,
    usernameOrAlias,
  }: {
    pslName: string;
    usernameOrAlias: string;
  }): Promise<SuccessMsg | FailureMsg> {
    // Convert any aliases to usernames
    const resolvedUsername = (await Aliases.fetch(usernameOrAlias)) || usernameOrAlias;

    const user: User = await User.create({ org: this.org });
    const fields: UserFields = await user.retrieve(resolvedUsername);

    try {
      await this.org.getConnection().sobject('PermissionSetLicenseAssign').create({
        AssigneeId: fields.id,
        PermissionSetLicenseId: this.pslId,
      });
      return {
        name: resolvedUsername,
        value: pslName,
      };
    } catch (e) {
      // idempotency.  If user(s) already have PSL, the API will throw an error about duplicate value.
      // but we're going to call that a success
      if (e instanceof Error && e.message.startsWith('duplicate value found')) {
        this.ux.warn(messages.getMessage('duplicateValue', [resolvedUsername, pslName]));
        return {
          name: resolvedUsername,
          value: pslName,
        };
      } else {
        return {
          name: resolvedUsername,
          message: e instanceof Error ? e.message : 'error contained no message',
        };
      }
    }
  }

  private setExitCode(): void {
    if (this.failures.length && this.successes.length) {
      process.exitCode = 69;
    } else if (this.failures.length) {
      process.exitCode = 1;
    } else if (this.successes.length) {
      process.exitCode = 0;
    }
  }

  private print(): void {
    if (this.successes.length > 0) {
      this.ux.styledHeader('Permset Licenses Assigned');
      this.ux.table(this.successes, {
        columns: [
          { key: 'name', label: 'Username' },
          { key: 'value', label: 'Permission Set License Assignment' },
        ],
      });
    }

    if (this.failures.length > 0) {
      if (this.successes.length > 0) {
        this.ux.log('');
      }

      this.ux.styledHeader('Failures');
      this.ux.table(this.failures, {
        columns: [
          { key: 'name', label: 'Username' },
          { key: 'message', label: 'Error Message' },
        ],
      });
    }
  }
}

const isSuccess = (input: SuccessMsg | FailureMsg): input is SuccessMsg => {
  return (input as SuccessMsg).value !== undefined;
};
