/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AuthFields, Connection, Logger, Messages, StateAggregator } from '@salesforce/core';
import { ensureString, getString } from '@salesforce/ts-types';
import {
  Flags,
  loglevel,
  optionalHubFlagWithDeprecations,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'display');

export type UserDisplayResult = {
  username: string;
  profileName: string;
  id: string;
  orgId: string;
  accessToken?: string;
  instanceUrl?: string;
  loginUrl?: string;
  alias?: string;
  password?: string;
};

export class UserDisplayCommand extends SfCommand<UserDisplayResult> {
  public static readonly aliases = ['force:user:display', 'org:display:user'];
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'target-dev-hub': {
      ...optionalHubFlagWithDeprecations,
      hidden: true,
      deprecated: {
        message: messages.getMessage('flags.target-hub.deprecation'),
      },
    },
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    verbose: Flags.boolean(),
  };

  private logger: Logger;

  public async run(): Promise<UserDisplayResult> {
    const { flags } = await this.parse(UserDisplayCommand);
    this.logger = await Logger.child(this.constructor.name);

    const username = ensureString(flags['target-org'].getUsername());
    const userAuthDataArray = await flags['target-org'].readUserAuthFiles();
    // userAuthDataArray contains all of the Org's users AuthInfo, we just need the default or -u, which is in the username variable
    const userAuthData: AuthFields | undefined = userAuthDataArray
      .find((uat) => uat.getFields().username === username)
      ?.getFields(true);
    const conn: Connection = flags['target-org'].getConnection(flags['api-version']);

    let profileName = userAuthData?.userProfileName;
    let userId = userAuthData?.userId;

    try {
      // the user executing this command may not have access to the Profile sObject.
      if (!profileName) {
        const PROFILE_NAME_QUERY = `SELECT name FROM Profile WHERE Id IN (SELECT ProfileId FROM User WHERE username='${username}')`;
        profileName = (await conn.singleRecordQuery<{ Name: string }>(PROFILE_NAME_QUERY)).Name;
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
        userId = (await conn.singleRecordQuery<{ Id: string }>(USER_QUERY)).Id;
      }
    } catch (err) {
      userId = 'unknown';
      this.logger.debug(
        `Query for the user ID failed for username: ${username} with message: ${getString(err, 'message')}`
      );
    }

    const result: UserDisplayResult = {
      accessToken: conn.accessToken as string,
      id: userId,
      instanceUrl: userAuthData?.instanceUrl,
      loginUrl: userAuthData?.loginUrl,
      orgId: flags['target-org'].getOrgId(),
      profileName,
      username,
    };

    const stateAggregator = await StateAggregator.getInstance();
    const alias = stateAggregator.aliases.get(username);
    if (alias) {
      result.alias = alias;
    }

    if (userAuthData?.password) {
      result.password = userAuthData.password;
    }

    this.warn(messages.getMessage('securityWarning'));
    this.log('');
    this.print(result);

    return result;
  }

  private print(result: UserDisplayResult): void {
    const columns = {
      key: { header: 'key' },
      label: { header: 'label' },
    };
    type TT = { key: string; label: string };
    const tableRow: TT[] = [];
    // to get proper capitalization and spacing, enter the rows
    tableRow.push({ key: 'Username', label: result.username ?? 'unknown' });
    tableRow.push({ key: 'Profile Name', label: result.profileName });
    tableRow.push({ key: 'Id', label: result.id });
    tableRow.push({ key: 'Org Id', label: result.orgId });
    tableRow.push({ key: 'Access Token', label: result.accessToken ?? '' });
    tableRow.push({ key: 'Instance Url', label: result.instanceUrl ?? '' });
    tableRow.push({ key: 'Login Url', label: result.loginUrl ?? '' });
    if (result.alias) tableRow.push({ key: 'Alias', label: result.alias });
    if (result.password) tableRow.push({ key: 'Password', label: result.password });

    this.styledHeader('User Description');
    this.table(tableRow, columns);
  }
}
