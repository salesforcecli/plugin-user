/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Aliases, AuthInfo, Connection, Messages, Org, SfdxError, User, UserFields } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

interface PasswordData {
  username?: string;
  password: string;
}

export class UserPasswordGenerateCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly requiresDevhubUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    onbehalfof: flags.array({
      char: 'o',
      description: messages.getMessage('flags.onBehalfOf'),
    }),
  };
  public org: Org;

  private usernames: string[];
  private passwordData: PasswordData[] = [];

  public async run(): Promise<PasswordData[]> {
    this.usernames = this.flags.onbehalfof ?? [this.org.getUsername()];

    for (const username of this.usernames) {
      try {
        // Convert any aliases to usernames
        // fetch will return undefined if there's no Alias for that name
        const aliasOrUsername = (await Aliases.fetch(username)) || username;

        const authInfo: AuthInfo = await AuthInfo.create({ username });
        const connection: Connection = await Connection.create({ authInfo });
        const org = await Org.create({ connection });
        const user: User = await User.create({ org });
        const password = User.generatePasswordUtf8();
        const fields: UserFields = await user.retrieve(username);
        // userId is used by `assignPassword` so we need to set it here
        authInfo.getFields().userId = fields.id;
        await user.assignPassword(authInfo, password);
        password.value((pass) => {
          this.passwordData.push({ username: aliasOrUsername, password: pass.toString('utf-8') });
          authInfo.update({ password: pass.toString('utf-8') });
        });
        await authInfo.save();
      } catch (e) {
        if (
          e.message.includes('Cannot set password for self') ||
          e.message.includes('The requested Resource does not exist')
        ) {
          // we don't have access to the apiVersion from what happened in the try, so until v51 is r2, we have to check versions the hard way
          const authInfo: AuthInfo = await AuthInfo.create({ username });
          const connection: Connection = await Connection.create({ authInfo });
          const org = await Org.create({ connection });
          if (parseInt(await org.retrieveMaxApiVersion(), 10) >= 51) {
            throw new SfdxError(
              messages.getMessage('noSelfSetError'),
              'noSelfSetError',
              messages.getMessage('noSelfSetErrorActions').split(os.EOL)
            );
          }
          throw new SfdxError(messages.getMessage('noSelfSetErrorV50'), 'noSelfSetError');
        }
        throw SfdxError.wrap(e);
      }
    }

    this.print();

    return this.passwordData;
  }

  private print(): void {
    if (this.passwordData) {
      const successMsg = messages.getMessage('success', [this.passwordData[0].password, this.passwordData[0].username]);
      const viewMsg = messages.getMessage('viewWithCommand', [this.passwordData[0].username]);
      this.ux.log(`${successMsg}${os.EOL}${viewMsg}`);
    } else {
      this.ux.log(messages.getMessage('successMultiple', [os.EOL]));
      const columnData = {
        columns: [
          { key: 'username', label: 'USERNAME' },
          { key: 'password', label: 'PASSWORD' },
        ],
      };
      this.ux.table(this.passwordData, columnData);
    }
  }
}
