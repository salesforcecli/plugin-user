/*
 * Copyright 2025, Salesforce, Inc.
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

import { AuthFields, Connection, Logger, Messages, StateAggregator } from '@salesforce/core';
import { ensureString } from '@salesforce/ts-types';
import {
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'display');

export type DisplayUserResult = {
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

export class DisplayUserCommand extends SfCommand<DisplayUserResult> {
  public static readonly deprecateAliases = true;
  public static readonly aliases = ['force:user:display'];
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
  };

  public async run(): Promise<DisplayUserResult> {
    const { flags } = await this.parse(DisplayUserCommand);

    const username = ensureString(flags['target-org'].getUsername());
    const userAuthDataArray = await flags['target-org'].readUserAuthFiles();
    // userAuthDataArray contains all the Org's users AuthInfo, we just need the default or -o, which is in the username variable
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
      const logger = await Logger.child(this.constructor.name);
      logger.debug(
        `Query for the profile name failed for username: ${username} with message: ${
          err instanceof Error ? err.message : ''
        }`
      );
    }

    try {
      if (!userId) {
        const USER_QUERY = `SELECT id FROM User WHERE username='${username}'`;
        userId = (await conn.singleRecordQuery<{ Id: string }>(USER_QUERY)).Id;
      }
    } catch (err) {
      userId = 'unknown';
      const logger = await Logger.child(this.constructor.name);
      logger.debug(
        `Query for the user ID failed for username: ${username} with message: ${
          err instanceof Error ? err.message : ''
        }`
      );
    }

    const result: DisplayUserResult = {
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

  private print(result: DisplayUserResult): void {
    this.table({
      data: [
        { key: 'Username', label: result.username ?? 'unknown' },
        { key: 'Profile Name', label: result.profileName },
        { key: 'Id', label: result.id },
        { key: 'Org Id', label: result.orgId },
        ...(result.accessToken ? [{ key: 'Access Token', label: result.accessToken }] : []),
        ...(result.instanceUrl ? [{ key: 'Instance Url', label: result.instanceUrl }] : []),
        ...(result.loginUrl ? [{ key: 'Login Url', label: result.loginUrl }] : []),
        ...(result.alias ? [{ key: 'Alias', label: result.alias }] : []),
        ...(result.password ? [{ key: 'Password', label: result.password }] : []),
      ] satisfies Array<{ key: string; label: string }>,
      title: 'User Description',
    });
  }
}
