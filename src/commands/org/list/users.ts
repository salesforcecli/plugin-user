/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, Messages, StateAggregator } from '@salesforce/core';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'list');

export type AuthList = Partial<{
  defaultMarker: string;
  alias: string;
  username: string;
  profileName: string;
  orgId: string;
  accessToken: string;
  instanceUrl: string;
  loginUrl: string;
  userId: string;
}>;

export type ListUsers = AuthList[];

type UserInfo = { Username: string; ProfileId: string; Id: string };
type UserInfoMap = Map<string, UserInfo>;
type ProfileInfo = { Id: string; Name: string };
type ProfileInfoMap = Map<string, ProfileInfo>;

export class ListUsersCommand extends SfCommand<ListUsers> {
  public static readonly aliases = ['force:user:list'];
  public static readonly deprecateAliases = true;
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'target-dev-hub': Flags.optionalOrg({
      char: 'v',
      summary: messages.getMessage('flags.target-dev-hub.summary'),
      hidden: true,
      deprecated: {
        message: messages.getMessage('flags.target-dev-hub.deprecation'),
      },
    }),
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
  };

  public async run(): Promise<ListUsers> {
    const { flags } = await this.parse(ListUsersCommand);
    const org = flags['target-org'];
    const conn = flags['target-org'].getConnection(flags['api-version']);
    // parallelize 2 org queries and 2 fs operations
    const [userInfos, profileInfos, userAuthData, aliases] = await Promise.all([
      buildUserInfos(conn),
      buildProfileInfos(conn),
      org.readUserAuthFiles(),
      (await StateAggregator.getInstance()).aliases,
    ]);

    const authList: ListUsers = userAuthData.map((authData) => {
      const username = authData.getUsername();
      // if they passed in an alias see if it maps to an Alias.
      const alias = aliases.get(username);
      const userInfo = userInfos.get(username);
      const profileName = userInfo && profileInfos.get(userInfo.ProfileId)?.Name;
      return {
        defaultMarker: flags['target-org']?.getUsername() === username ? '(A)' : '',
        alias: alias ?? '',
        username,
        profileName,
        orgId: flags['target-org']?.getOrgId(),
        accessToken: authData.getFields().accessToken,
        instanceUrl: authData.getFields().instanceUrl,
        loginUrl: authData.getFields().loginUrl,
        userId: userInfos.get(username)?.Id,
      };
    });

    const columns = {
      defaultMarker: { header: 'Default' },
      alias: { header: 'Alias' },
      username: { header: 'Username' },
      profileName: { header: 'Profile Name' },
      userId: { header: 'User Id' },
    };

    this.styledHeader(`Users in org ${flags['target-org']?.getOrgId()}`);
    this.table(authList, columns);

    return authList;
  }
}

/**
 * Build a map of { [ProfileId]: ProfileName } for all profiles in the org
 *
 * @private
 * @return Promise<ProfileInfo>
 */
const buildProfileInfos = async (conn: Connection): Promise<ProfileInfoMap> => {
  const profileRecords = await conn.query<ProfileInfo>('SELECT id, name FROM Profile');
  return new Map((profileRecords.records ?? []).map((profileInfo) => [profileInfo.Id, profileInfo]));
};

/**
 * query the user table and build a map of Username: { ProfileId, Id } } for all users in the org
 *
 * @private
 * @return Promise<UserInfo>
 */
const buildUserInfos = async (conn: Connection): Promise<UserInfoMap> => {
  const userRecords = await conn.query<UserInfo>('SELECT username, profileid, id FROM User');
  return new Map((userRecords.records ?? []).map((userInfo) => [userInfo.Username, userInfo]));
};
