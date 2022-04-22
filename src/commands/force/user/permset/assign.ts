/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Connection, GlobalInfo, Messages, Org, SfError, User } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'permset.assign');

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

export class UserPermsetAssignCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    permsetname: flags.array({
      char: 'n',
      description: messages.getMessage('flags.permsetName'),
      required: true,
    }),
    onbehalfof: flags.array({
      char: 'o',
      description: messages.getMessage('flags.onBehalfOf'),
    }),
  };
  private readonly successes: SuccessMsg[] = [];
  private readonly failures: FailureMsg[] = [];

  public async run(): Promise<PermsetAssignResult> {
    try {
      const aliasOrUsernames = (this.flags.onbehalfof as string[]) ?? [this.org.getUsername()];

      const connection: Connection = this.org.getConnection();
      const org = await Org.create({ connection });

      for (const aliasOrUsername of aliasOrUsernames) {
        // Attempt to convert any aliases to usernames.  Not found alias will be **assumed** to be a username
        const username = (await GlobalInfo.getInstance()).aliases.resolveUsername(aliasOrUsername);
        const user: User = await User.create({ org });
        // get userId of whomever the permset will be assigned to via query to avoid AuthInfo if remote user
        const queryResult = await connection.singleRecordQuery<{ Id: string }>(
          `SELECT Id FROM User WHERE Username='${username}'`
        );
        // this is hard to parallelize because core returns void instead of some result object we can handle.  Promise.allSettled might work
        for (const permsetName of this.flags.permsetname as string[]) {
          try {
            await user.assignPermissionSets(queryResult.Id, [permsetName]);
            this.successes.push({
              name: aliasOrUsername,
              value: permsetName,
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
    } catch (e) {
      if (e instanceof Error || typeof e === 'string') {
        throw SfError.wrap(e);
      }
      throw e;
    }

    this.print();

    return {
      successes: this.successes,
      failures: this.failures,
    };
  }

  private print(): void {
    if (this.successes.length > 0) {
      this.ux.styledHeader('Permsets Assigned');
      this.ux.table(this.successes, { name: { header: 'Username' }, value: { header: 'Permission Set Assignment' } });
    }

    if (this.failures.length > 0) {
      if (this.successes.length > 0) {
        this.ux.log('');
      }

      this.ux.styledHeader('Failures');
      this.ux.table(this.failures, { name: { header: 'Username' }, message: { header: 'Error Message' } });
    }
  }
}
