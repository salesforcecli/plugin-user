/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { AuthInfo, Connection, StateAggregator, Messages, Org, SfError, User } from '@salesforce/core';
import { PasswordConditions } from '@salesforce/core/lib/org/user';
Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

export type PasswordData = {
  username?: string;
  password: string;
};

export type GenerateResult = PasswordData | PasswordData[];

export abstract class UserPasswordGenerateBaseCommand extends SfCommand<GenerateResult> {
  protected usernames: string[];
  protected passwordData: PasswordData[] = [];
  protected connection: Connection;
  protected org: Org;
  protected length: number;
  protected complexity: number;

  public async generate(): Promise<GenerateResult> {
    // const { flags } = await this.parse(UserPasswordGenerateCommand);
    // this.usernames = ensureArray(flags['on-behalf-of'] ?? flags['target-org'].getUsername());

    const passwordCondition: PasswordConditions = {
      length: this.length,
      complexity: this.complexity,
    };

    // sequentially to avoid auth file collisions until configFile if safer
    /* eslint-disable no-await-in-loop */
    for (const aliasOrUsername of this.usernames) {
      try {
        // Convert any aliases to usernames
        // fetch will return undefined if there's no Alias for that name
        const username = (await StateAggregator.getInstance()).aliases.resolveUsername(aliasOrUsername);

        const authInfo: AuthInfo = await AuthInfo.create({ username });
        const connection: Connection = await Connection.create({ authInfo });
        const org = await Org.create({ connection });
        const user: User = await User.create({ org });
        const password = User.generatePasswordUtf8(passwordCondition);
        // we only need the Id, so instead of User.retrieve we'll just query
        // this avoids permission issues if ProfileId is restricted for the user querying for it
        const result: { Id: string } = await connection.singleRecordQuery(
          `SELECT Id FROM User WHERE Username='${username}'`
        );

        // userId is used by `assignPassword` so we need to set it here
        authInfo.getFields().userId = result.Id;
        await user.assignPassword(authInfo, password);

        password.value((pass) => {
          this.passwordData.push({ username, password: pass.toString('utf-8') });
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
          const org = await Org.create({ connection });
          if (parseInt(await org.retrieveMaxApiVersion(), 10) >= 51) {
            throw messages.createError('noSelfSetError');
          }
          throw new SfError(messages.getMessage('noSelfSetErrorV50'), 'noSelfSetErrorError');
        }
        throw SfError.wrap(err);
      }
    }
    /* eslint-enable no-await-in-loop */

    this.print();

    return this.passwordData.length === 1 ? this.passwordData[0] : this.passwordData;
  }

  private print(): void {
    if (this.passwordData) {
      const successMsg = messages.getMessage('success', [this.passwordData[0].password, this.passwordData[0].username]);
      const viewMsg = messages.getMessage('viewWithCommand', [this.passwordData[0].username]);
      this.log(`${successMsg}${os.EOL}${viewMsg}`);
    } else {
      this.log(messages.getMessage('successMultiple', [os.EOL]));
      const columnData = {
        username: { header: 'USERNAME' },
        password: { header: 'PASSWORD' },
      };
      this.table(this.passwordData, columnData);
    }
  }
}
