/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { SfdxCommand } from '@salesforce/command';
import { Aliases, AuthFields, AuthInfo, Connection, Logger, Messages, SfdxError, sfdc } from '@salesforce/core';
import { getString } from '@salesforce/ts-types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'display');

export type UserDisplayResult = {
  username: string;
  profileName: string;
  id: string;
  orgId: string;
  accessToken: string;
  instanceUrl: string;
  loginUrl: string;
  alias?: string;
  password?: string;
};

export class UserDisplayCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly requiresDevhubUsername = true;

  public async run(): Promise<UserDisplayResult> {
    this.logger = await Logger.child(this.constructor.name);
    if (sfdc.matchesAccessToken(this.flags.targetusername as string)) {
      throw new SfdxError(messages.getMessage('accessTokenError'), 'accessTokenError', [
        messages.getMessage('accessTokenAction'),
      ]);
    }
    const username: string = this.org.getUsername();
    const userAuthDataArray: AuthInfo[] = await this.org.readUserAuthFiles();
    // userAuthD ataArray contains all of the Org's users AuthInfo, we just need the default or -u, which is in the username variable
    const userAuthData: AuthFields = userAuthDataArray
      .find((uat) => uat.getFields().username === username)
      .getFields(true);
    const conn: Connection = this.org.getConnection();

    let profileName: string = userAuthData.userProfileName;
    let userId: string = userAuthData.userId;

    try {
      // the user  executing this command may not have access to the Profile sObject.
      if (!profileName) {
        const PROFILE_NAME_QUERY = `SELECT name FROM Profile WHERE Id IN (SELECT ProfileId FROM User WHERE username='${username}')`;
        profileName = getString(await conn.query(PROFILE_NAME_QUERY), 'records[0].Name');
      }
    } catch (err) {
      profileName = 'unknown';
      this.logger.debug(
        `Query for the profile name failed for username: ${username} with message: ${getString(err, 'message')}`
      );
    }

    try {
      if (!userId) {
        const USER_QUERY = `SELECT id FROM User WHERE username='${username}'`;
        userId = getString(await conn.query(USER_QUERY), 'records[0].Id');
      }
    } catch (err) {
      userId = 'unknown';
      this.logger.debug(
        `Query for the user ID failed for username: ${username} with message: ${getString(err, 'message')}`
      );
    }

    const result: UserDisplayResult = {
      accessToken: conn.accessToken,
      id: userId,
      instanceUrl: userAuthData.instanceUrl,
      loginUrl: userAuthData.loginUrl,
      orgId: this.org.getOrgId(),
      profileName,
      username,
    };

    // if they passed in a alias and it maps to something we have an Alias.
    const alias = await Aliases.create(Aliases.getDefaultOptions());
    const aliasContent = alias.getContents().orgs;
    if (aliasContent) {
      Object.keys(aliasContent).forEach((aliasedName) => {
        if (aliasContent[aliasedName] === username) result.alias = aliasedName;
      });
    }

    if (userAuthData.password) {
      result.password = userAuthData.password;
    }

    this.ux.warn(messages.getMessage('securityWarning'));
    this.ux.log('');
    this.print(result);

    return result;
  }

  private print(result: UserDisplayResult): void {
    const columns = {
      columns: [
        { key: 'key', label: 'key' },
        { key: 'label', label: 'label' },
      ],
    };

    const tableRow = [];
    // to get proper capitalization and spacing, enter the rows
    tableRow.push({ key: 'Username', label: result.username });
    tableRow.push({ key: 'Profile Name', label: result.profileName });
    tableRow.push({ key: 'Id', label: result.id });
    tableRow.push({ key: 'Org Id', label: result.orgId });
    tableRow.push({ key: 'Access Token', label: result.accessToken });
    tableRow.push({ key: 'Instance Url', label: result.instanceUrl });
    tableRow.push({ key: 'Login Url', label: result.loginUrl });
    if (result.alias) tableRow.push({ key: 'Alias', label: result.alias });
    if (result.password) tableRow.push({ key: 'Password', label: result.password });

    this.ux.styledHeader('User Description');
    this.ux.table(tableRow, columns);
  }
}
