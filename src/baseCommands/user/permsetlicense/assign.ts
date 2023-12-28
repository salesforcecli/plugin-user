/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */



import { Connection, Logger, Messages, SfError, StateAggregator } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url)
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
  private readonly successes: SuccessMsg[] = [];
  private readonly failures: FailureMsg[] = [];

  public async assign({
    conn,
    pslName,
    usernamesOrAliases,
  }: {
    conn: Connection;
    pslName: string;
    usernamesOrAliases: string[];
  }): Promise<PSLResult> {
    const logger = await Logger.child(this.constructor.name);

    logger.debug(`will assign perm set license "${pslName}" to users: ${usernamesOrAliases.join(', ')}`);
    const pslId = await queryPsl(conn, pslName);

    (
      await Promise.all(
        usernamesOrAliases.map((usernameOrAlias) =>
          this.usernameToPSLAssignment({
            pslName,
            usernameOrAlias,
            pslId,
            conn,
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
    pslId,
    conn,
  }: {
    pslName: string;
    usernameOrAlias: string;
    pslId: string;
    conn: Connection;
  }): Promise<SuccessMsg | FailureMsg> {
    // Convert any aliases to usernames
    const resolvedUsername = (await StateAggregator.getInstance()).aliases.resolveUsername(usernameOrAlias);

    try {
      const AssigneeId = (
        await conn.singleRecordQuery<{ Id: string }>(`select Id from User where Username = '${resolvedUsername}'`)
      ).Id;

      await conn.sobject('PermissionSetLicenseAssign').create({
        AssigneeId,
        PermissionSetLicenseId: pslId,
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

const queryPsl = async (conn: Connection, pslName: string): Promise<string> => {
  try {
    return (
      await conn.singleRecordQuery<PermissionSetLicense>(
        `select Id from PermissionSetLicense where DeveloperName = '${pslName}' or MasterLabel = '${pslName}'`
      )
    ).Id;
  } catch (e) {
    throw new SfError('PermissionSetLicense not found');
  }
};
