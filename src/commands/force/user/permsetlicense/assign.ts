/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Aliases, Connection, Messages, User, AuthInfo, Org, UserFields } from '@salesforce/core';

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

  public async run(): Promise<PSLResult> {
    const usernames = (this.flags.onbehalfof as string[]) ?? [this.org.getUsername()];

    for (const username of usernames) {
      // Convert any aliases to usernames
      const aliasOrUsername = (await Aliases.fetch(username)) || username;
      const connection: Connection = await Connection.create({
        authInfo: await AuthInfo.create({ username }),
      });
      const org = await Org.create({ connection });
      const user: User = await User.create({ org });
      const fields: UserFields = await user.retrieve(username);

      const pslName = this.flags.name as string;

      const psl = await connection.singleRecordQuery<PermissionSetLicense>(
        `select Id from PermissionSetLicense where DeveloperName = '${pslName}' or MasterLabel = '${pslName}'`
      );

      try {
        await connection.sobject('PermissionSetLicenseAssign').create({
          AssigneeId: fields.id,
          PermissionSetLicenseId: psl.Id,
        });
        this.successes.push({
          name: aliasOrUsername,
          value: this.flags.name as string,
        });
      } catch (e) {
        // idempotency.  If user(s) already have PSL, the API will throw an error about duplicate value.
        if (e instanceof Error && e.message.startsWith('duplicate value found')) {
          this.ux.warn(messages.getMessage('duplicateValue', [aliasOrUsername, pslName]));
          this.successes.push({
            name: aliasOrUsername,
            value: pslName,
          });
        } else {
          this.failures.push({
            name: aliasOrUsername,
            message: e instanceof Error ? e.message : 'error contained no message',
          });
        }
      }
    }

    this.print();

    return {
      successes: this.successes,
      failures: this.failures,
    };
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
