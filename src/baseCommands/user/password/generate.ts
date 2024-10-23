/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { EOL } from 'node:os';

import { SfCommand } from '@salesforce/sf-plugins-core';
import { AuthInfo, Connection, Messages, Org, SfError, StateAggregator, User } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

export type PasswordData = {
  username?: string;
  password: string;
};

export type GenerateResult = PasswordData | PasswordData[];

export type GenerateInput = {
  usernames: string[];
  conn: Connection;
  length: number;
  complexity: number;
};
export abstract class UserPasswordGenerateBaseCommand extends SfCommand<GenerateResult> {
  public async generate({ usernames, conn, length, complexity }: GenerateInput): Promise<GenerateResult> {
    const passwordData: PasswordData[] = [];
    // sequentially to avoid auth file collisions until configFile if safer
    /* eslint-disable no-await-in-loop */
    for (const aliasOrUsername of usernames) {
      try {
        // Convert any aliases to usernames
        // fetch will return undefined if there's no Alias for that name
        const username = (await StateAggregator.getInstance()).aliases.resolveUsername(aliasOrUsername);

        const authInfo: AuthInfo = await AuthInfo.create({ username });
        const connection: Connection = await Connection.create({ authInfo });
        connection.setApiVersion(conn.getApiVersion());
        const org = await Org.create({ connection });
        const user: User = await User.create({ org });
        const password = User.generatePasswordUtf8({
          length,
          complexity,
        });
        // we only need the Id, so instead of User.retrieve we'll just query
        // this avoids permission issues if ProfileId is restricted for the user querying for it
        const result = await connection.singleRecordQuery<{ Id: string }>(
          `SELECT Id FROM User WHERE Username='${username}'`
        );

        // userId is used by `assignPassword` so we need to set it here
        authInfo.update({ userId: result.Id });
        await user.assignPassword(authInfo, password);

        password.value((pass) => {
          passwordData.push({ username, password: pass.toString('utf-8') });
          authInfo.update({ password: pass.toString('utf-8') });
        });

        await authInfo.save();
      } catch (e) {
        const err = e as SfError;
        if (
          err.message.includes('Cannot set password for self') ||
          err.message.includes('The requested Resource does not exist')
        ) {
          // we don't have access to the apiVersion from what happened in the try, so until v51 is r2, we have to check versions the hard way
          const authInfo: AuthInfo = await AuthInfo.create({ username: aliasOrUsername });
          const connection: Connection = await Connection.create({ authInfo });
          connection.setApiVersion(conn.getApiVersion());
          if (parseInt(connection.getApiVersion(), 10) >= 51) {
            throw messages.createError('noSelfSetError');
          }
          throw new SfError(messages.getMessage('noSelfSetErrorV50'), 'noSelfSetErrorError');
        }
        throw SfError.wrap(err);
      }
    }
    /* eslint-enable no-await-in-loop */

    this.print(passwordData);

    return passwordData.length === 1 ? passwordData[0] : passwordData;
  }

  private print(passwordData: PasswordData[]): void {
    if (passwordData) {
      const successMsg = messages.getMessage('success', [passwordData[0].password, passwordData[0].username]);
      const viewMsg = messages.getMessage('viewWithCommand', [this.config.bin, passwordData[0].username]);
      this.log(`${successMsg}${EOL}${viewMsg}`);
    } else {
      this.log(messages.getMessage('successMultiple', [EOL]));
      this.table({
        data: passwordData,
        columns: [
          { key: 'username', name: 'USERNAME' },
          { key: 'password', name: 'PASSWORD' },
        ],
      });
    }
  }
}
