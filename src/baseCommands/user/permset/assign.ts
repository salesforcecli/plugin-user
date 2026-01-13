/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
      this.table({
        data: this.successes,
        columns: [
          { key: 'name', name: 'Username' },
          { key: 'value', name: 'Permission Set Assignment' },
        ],
        title: 'Partial Success',
      });
      this.log('');
      this.table({
        data: this.failures,
        columns: [
          { key: 'name', name: 'Username' },
          { key: 'message', name: 'Error Message' },
        ],
        title: 'Failures',
      });
    } else if (this.successes.length > 0) {
      this.table({
        data: this.successes,
        columns: [
          { key: 'name', name: 'Username' },
          { key: 'value', name: 'Permission Set Assignment' },
        ],
        title: 'Permsets Assigned',
      });
    } else if (this.failures.length > 0) {
      this.table({
        data: this.failures,
        columns: [
          { key: 'name', name: 'Username' },
          { key: 'message', name: 'Error Message' },
        ],
        title: 'Failures',
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
