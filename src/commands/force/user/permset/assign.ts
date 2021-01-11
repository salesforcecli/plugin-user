/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Aliases, Connection, Messages, User, AuthInfo, Org, UserFields, SfdxError } from '@salesforce/core';

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

type Result = {
  successes: SuccessMsg[];
  failures: FailureMsg[];
};

export class UserPermsetAssignCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    permsetname: flags.string({
      char: 'n',
      description: messages.getMessage('flags.permsetName'),
      required: true,
    }),
    onbehalfof: flags.array({
      char: 'o',
      description: messages.getMessage('flags.onBehalfOf'),
    }),
  };
  private usernames: string[];
  private readonly successes: SuccessMsg[] = [];
  private readonly failures: FailureMsg[] = [];

  public async run(): Promise<Result> {
    try {
      if (this.flags.onbehalfof) {
        // trim the usernames to avoid whitespace
        this.usernames = this.flags.onbehalfof.map((user) => user.trim());
      } else {
        this.usernames = [this.org.getUsername()];
      }

      for (const username of this.usernames) {
        // Convert any aliases to usernames
        const aliasOrUsername = (await Aliases.fetch(username)) || username;
        const connection: Connection = await Connection.create({
          authInfo: await AuthInfo.create({ username }),
        });
        const org = await Org.create({ connection });
        const user: User = await User.create({ org });
        const fields: UserFields = await user.retrieve(username);

        try {
          await user.assignPermissionSets(fields.id, [this.flags.permsetname]);
          this.successes.push({
            name: aliasOrUsername,
            value: this.flags.permsetname,
          });
        } catch (e) {
          this.failures.push({
            name: aliasOrUsername,
            message: e.message,
          });
        }
      }
    } catch (e) {
      throw SfdxError.wrap(e);
    }

    this.print();

    const result: Result = {
      successes: this.successes,
      failures: this.failures,
    };

    return result;
  }

  private print(): void {
    if (this.successes.length > 0) {
      this.ux.styledHeader('Permsets Assigned');
      this.ux.table(this.successes, {
        columns: [
          { key: 'name', label: 'Username' },
          { key: 'value', label: 'Permission Set Assignment' },
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
