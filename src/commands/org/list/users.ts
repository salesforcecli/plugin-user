/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection, Messages, Org, StateAggregator } from '@salesforce/core';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectory(__dirname);
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
type UserInfoMap = Record<string, UserInfo>;
type ProfileInfo = { Id: string; Name: string };
type ProfileInfoMap = Record<string, string>;

export class ListUsersCommand extends SfCommand<ListUsers> {
  // eslint-disable-next-line sf-plugin/encourage-alias-deprecation
  public static readonly aliases = ['force:user:list'];
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'target-dev-hub': Flags.optionalOrg({
      char: 'v',
      summary: messages.getMessage('flags.target-hub.summary'),
      hidden: true,
      deprecated: {
        message: messages.getMessage('flags.target-hub.deprecation'),
      },
    }),
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
  };

  private conn: Connection;
  private org: Org;

  public async run(): Promise<ListUsers> {
    const { flags } = await this.parse(ListUsersCommand);
    this.org = flags['target-org'];
    this.conn = flags['target-org'].getConnection(flags['api-version']);
    // parallelize 2 org queries and 2 fs operations
    const [userInfos, profileInfos, userAuthData, aliases] = await Promise.all([
      this.buildUserInfos(),
      this.buildProfileInfos(),
      this.org.readUserAuthFiles(),
      (await StateAggregator.getInstance()).aliases,
    ]);

    const authList: ListUsers = userAuthData.map((authData) => {
      const username = authData.getUsername();
      // if they passed in an alias see if it maps to an Alias.
      const alias = aliases.get(username);
      const userInfo = userInfos[username];
      const profileName = userInfo && profileInfos[userInfo.ProfileId];
      return {
        defaultMarker: flags['target-org']?.getUsername() === username ? '(A)' : '',
        alias: alias ?? '',
        username,
        profileName,
        orgId: flags['target-org']?.getOrgId(),
        accessToken: authData.getFields().accessToken,
        instanceUrl: authData.getFields().instanceUrl,
        loginUrl: authData.getFields().loginUrl,
        userId: userInfos[username].Id,
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

  /**
   * Build a map of { [Username]: { ProfileId, Id } } for all users in the org
   *
   * @private
   * @return Promise<UserInfo>
   */
  private async buildUserInfos(): Promise<UserInfoMap> {
    const userRecords = await this.conn.query<UserInfo>('SELECT username, profileid, id FROM User');

    if (userRecords.records) {
      return userRecords.records.reduce((userInfo, { Username, ProfileId, Id }) => {
        userInfo[Username] = { ProfileId, Id };
        return userInfo;
      }, {});
    }
    return {};
  }

  /**
   * Build a map of { [ProfileId]: ProfileName } for all profiles in the org
   *
   * @private
   * @return Promise<ProfileInfo>
   */
  private async buildProfileInfos(): Promise<ProfileInfoMap> {
    const profileRecords = await this.conn.query<ProfileInfo>('SELECT id, name FROM Profile');

    if (profileRecords.records) {
      return profileRecords.records.reduce((profileInfo, { Id, Name }) => {
        profileInfo[Id] = Name;
        return profileInfo;
      }, {});
    }
    return {};
  }
}
