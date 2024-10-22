/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, Messages, Org, SfError, StateAggregator, User } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

type SuccessMsg = {
  name: string;
  value: string;
};

type FailureMsg = {
  name: string;
  message: string;
};

export type PermsetAssignResult = {
  successes: SuccessMsg[];
  failures: FailureMsg[];
};

export abstract class UserPermSetAssignBaseCommand extends SfCommand<PermsetAssignResult> {
  protected connection?: Connection;
  protected org?: Org;
  protected aliasOrUsernames: string[] = [];
  protected permSetNames: string[] = [];
  protected readonly successes: SuccessMsg[] = [];
  protected readonly failures: FailureMsg[] = [];

  public async assign(): Promise<PermsetAssignResult> {
    if (!this.org || !this.connection) {
      throw new SfError('No org or connection found');
    }
    try {
      // sequentially to avoid auth file collisions until configFile if safer
      /* eslint-disable no-await-in-loop */
      for (const aliasOrUsername of this.aliasOrUsernames) {
        // Attempt to convert any aliases to usernames.  Not found alias will be **assumed** to be a username
        const username = (await StateAggregator.getInstance()).aliases.resolveUsername(aliasOrUsername);
        const user: User = await User.create({ org: this.org });
        // get userId of whomever the permset will be assigned to via query to avoid AuthInfo if remote user
        const queryResult = await this.connection.singleRecordQuery<{ Id: string }>(
          `SELECT Id FROM User WHERE Username='${username}'`
        );
        // this is hard to parallelize because core returns void instead of some result object we can handle.  Promise.allSettled might work
        for (const permSetName of this.permSetNames) {
          try {
            await user.assignPermissionSets(queryResult.Id, [permSetName]);
            this.successes.push({
              name: aliasOrUsername,
              value: permSetName,
            });
          } catch (e) {
            const err = e as SfError;
            this.failures.push({
              name: aliasOrUsername,
              message: err.message,
            });
          }
        }
      }
      /* eslint-enable no-await-in-loop */
    } catch (e) {
      if (e instanceof Error || typeof e === 'string') {
        throw SfError.wrap(e);
      }
      throw e;
    }

    this.print();
    this.setExitCode();

    return {
      successes: this.successes,
      failures: this.failures,
    };
  }

  private print(): void {
    if (this.failures.length > 0 && this.successes.length > 0) {
      this.styledHeader('Partial Success');
      this.styledHeader('Permsets Assigned');
      this.table({
        data: this.successes,
        columns: [
          { key: 'name', name: 'Username' },
          { key: 'value', name: 'Permission Set Assignment' },
        ],
      });
      this.log('');
      this.styledHeader('Failures');
      this.table({
        data: this.failures,
        columns: [
          { key: 'name', name: 'Username' },
          { key: 'message', name: 'Error Message' },
        ],
      });
    } else if (this.successes.length > 0) {
      this.styledHeader('Permsets Assigned');
      this.table({
        data: this.successes,
        columns: [
          { key: 'name', name: 'Username' },
          { key: 'value', name: 'Permission Set Assignment' },
        ],
      });
    } else if (this.failures.length > 0) {
      this.styledHeader('Failures');
      this.table({
        data: this.failures,
        columns: [
          { key: 'name', name: 'Username' },
          { key: 'message', name: 'Error Message' },
        ],
      });
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
}
