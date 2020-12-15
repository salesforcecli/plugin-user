/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { SfdxCommand } from '@salesforce/command';
import { Aliases, AuthFields, AuthInfo, Connection, Logger, Messages } from '@salesforce/core';
import { get } from '@salesforce/ts-types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'display');

type Row = {
  Key: string;
  Value: string;
};

export class UserDisplayCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly requiresDevhubUsername = true;
  public logger: Logger;

  public async run(): Promise<Row[]> {
    this.logger = await Logger.child(this.constructor.name);

    const username: string = this.org.getUsername();
    const userAuthDataArray: AuthInfo[] = await this.org.readUserAuthFiles();
    // userAuthDataArray contains all of the Org's users AuthInfo, we just need the default or -u, which is in the username variable
    const userAuthData: AuthFields = userAuthDataArray
      .find((uat) => uat.getFields().username === username)
      .getFields(true);
    const conn: Connection = this.org.getConnection();

    let profileName: string = userAuthData.userProfileName;
    let userId: string = userAuthData.userId;

    try {
      // the user executing this command may not have access to the Profile sObject.
      if (!profileName) {
        const PROFILE_NAME_QUERY = `SELECT name FROM Profile WHERE Id IN (SELECT ProfileId FROM User WHERE username='${username}')`;
        profileName = get(await conn.query(PROFILE_NAME_QUERY), 'records[0].Name') as string;
      }
    } catch (err) {
      profileName = 'unknown';
      this.logger.debug(
        `Query for the profile name failed for username: ${username} with message: ${get(err, 'message') as string}`
      );
    }

    try {
      if (!userId) {
        const USER_QUERY = `SELECT id FROM User WHERE username='${username}'`;
        userId = get(await conn.query(USER_QUERY), 'records[0].Id') as string;
      }
    } catch (err) {
      userId = 'unknown';
      this.logger.debug(
        `Query for the user ID failed for username: ${username} with message: ${get(err, 'message') as string}`
      );
    }

    const rows: Row[] = [
      { Key: 'Access Token', Value: conn.accessToken },
      { Key: 'Id', Value: userId },
      { Key: 'Instance Url', Value: userAuthData.instanceUrl },
      { Key: 'Login Url', Value: userAuthData.loginUrl },
      { Key: 'Org Id', Value: this.org.getOrgId() },
      { Key: 'Profile Name', Value: profileName },
      { Key: 'Username', Value: username },
    ];

    const alias: string = await Aliases.fetch(username);

    if (alias) {
      rows.push({ Key: 'Alias', Value: alias });
    }

    if (userAuthData.password) {
      rows.push({ Key: 'Password', Value: userAuthData.password });
    }

    const columns = ['Key', 'Value'];
    this.ux.styledHeader('User Description');
    this.ux.table(rows, columns);

    return rows;
  }
}
