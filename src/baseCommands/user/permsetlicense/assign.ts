/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, Logger, Messages, SfError, StateAggregator } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';

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

export abstract class UserPermSetLicenseAssignBaseCommand extends SfCommand<PSLResult> {
  protected usernamesOrAliases: string[] = [];
  protected pslName: string;
  protected connection: Connection;

  private logger: Logger;
  private readonly successes: SuccessMsg[] = [];
  private readonly failures: FailureMsg[] = [];
  private pslId: string;

  public async assign(): Promise<PSLResult> {
    this.logger = await Logger.child(this.constructor.name);
    this.logger.debug(`will assign perm set license "${this.pslName}" to users: ${this.usernamesOrAliases.join(', ')}`);
    try {
      this.pslId = (
        await this.connection.singleRecordQuery<PermissionSetLicense>(
          `select Id from PermissionSetLicense where DeveloperName = '${this.pslName}' or MasterLabel = '${this.pslName}'`
        )
      ).Id;
    } catch {
      throw new SfError('PermissionSetLicense not found');
    }
    (
      await Promise.all(
        this.usernamesOrAliases.map((usernameOrAlias) =>
          this.usernameToPSLAssignment({
            pslName: this.pslName,
            usernameOrAlias,
          })
        )
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
    const resolvedUsername = (await StateAggregator.getInstance()).aliases.resolveUsername(usernameOrAlias);

    try {
      const AssigneeId = (
        await this.connection.singleRecordQuery<{ Id: string }>(
          `select Id from User where Username = '${resolvedUsername}'`
        )
      ).Id;

      await this.connection.sobject('PermissionSetLicenseAssign').create({
        AssigneeId,
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
        this.warn(messages.getMessage('duplicateValue', [resolvedUsername, pslName]));
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
      process.exitCode = 68;
    } else if (this.failures.length) {
      process.exitCode = 1;
    } else if (this.successes.length) {
      process.exitCode = 0;
    }
  }

  private print(): void {
    if (this.failures.length > 0 && this.successes.length > 0) {
      this.styledHeader('Partial Success');
    }
    if (this.successes.length > 0) {
      this.styledHeader('Permset Licenses Assigned');
      this.table(this.successes, {
        name: { header: 'Username' },
        value: { header: 'Permission Set License Assignment' },
      });
    }

    if (this.failures.length > 0) {
      if (this.successes.length > 0) {
        this.log('');
      }

      this.styledHeader('Failures');
      this.table(this.failures, { name: { header: 'Username' } }, { message: { header: 'Error Message' } });
    }
  }
}

const isSuccess = (input: SuccessMsg | FailureMsg): input is SuccessMsg => (input as SuccessMsg).value !== undefined;
