/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthFields, Connection, Logger, Messages, StateAggregator } from '@salesforce/core';
import { ensureString } from '@salesforce/ts-types';
import {
  loglevel,
  optionalHubFlagWithDeprecations,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectory(dirname(fileURLToPath(import.meta.url)));
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
    this.styledHeader('User Description');
    this.table(
      // to get proper capitalization and spacing, enter th e rows
      [
        { key: 'Username', label: result.username ?? 'unknown' },
        { key: 'Profile Name', label: result.profileName },
        { key: 'Profile Name', label: result.profileName },
        { key: 'Id', label: result.id },
        { key: 'Org Id', label: result.orgId },
        ...(result.accessToken ? [{ key: 'Access Token', label: result.accessToken }] : []),
        ...(result.instanceUrl ? [{ key: 'Instance Url', label: result.instanceUrl }] : []),
        ...(result.loginUrl ? [{ key: 'Login Url', label: result.loginUrl }] : []),
        ...(result.alias ? [{ key: 'Alias', label: result.alias }] : []),
        ...(result.password ? [{ key: 'Password', label: result.password }] : []),
      ] satisfies Array<{ key: string; label: string }>,
      {
        key: { header: 'key' },
        label: { header: 'label' },
      }
    );
  }
}
