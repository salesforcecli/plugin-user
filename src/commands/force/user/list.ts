/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { SfdxCommand } from '@salesforce/command';
import { Messages, Connection, Aliases, AuthInfo, ConfigAggregator } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'list');

type AuthList = {
  defaultMarker: string;
  alias: string;
  username: string;
  profileName: string;
  orgId: string;
  accessToken: string;
  instanceUrl: string;
  loginUrl: string;
  userId: string;
};

type UserInfo = { Username: string; ProfileId: string; Id: string };
type ProfileInfo = { Id: string; Name: string };

export class UserListCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly supportsDevhubUsername = true;
  private conn: Connection;

  public async run(): Promise<AuthList[]> {
    this.conn = this.org.getConnection();
    const userInfos: UserInfo = await this.buildUserInfos();
    const profileInfos: ProfileInfo = await this.buildProfileInfos();
    const userAuthData: AuthInfo[] = await this.org.readUserAuthFiles();
    const aliases = await Aliases.create(Aliases.getDefaultOptions());

    const authList: AuthList[] = userAuthData.map((authData) => {
      const username = authData.getUsername();
      // if they passed in a alias and it maps to something we have an Alias.
      const alias = aliases.getKeysByValue(authData.getUsername())[0];
      const configAgg = ConfigAggregator.getInstance();
      const defaultUserOrAlias = configAgg.getLocalConfig().get('defaultusername');
      return {
        defaultMarker: defaultUserOrAlias === username || defaultUserOrAlias === alias ? '(A)' : '',
        alias: alias || '',
        username,
        profileName: profileInfos[userInfos[username].ProfileId],
        orgId: this.org.getOrgId(),
        accessToken: authData.getFields().accessToken,
        instanceUrl: authData.getFields().instanceUrl,
        loginUrl: authData.getFields().loginUrl,
        userId: userInfos[username].Id,
      };
    });

    const columns = {
      columns: [
        { key: 'defaultMarker', label: 'Default' },
        { key: 'alias', label: 'Alias' },
        { key: 'username', label: 'Username' },
        { key: 'profileName', label: 'Profile Name' },
        { key: 'userId', label: 'User Id' },
      ],
    };

    this.ux.styledHeader(`Users in org ${this.org.getOrgId()}`);
    this.ux.table(authList, columns);

    return authList;
  }

  /**
   * Build a map of { [Username]: { ProfileId, Id } } for all users in the org
   *
   * @private
   * @return Promise<UserInfo>
   */
  private async buildUserInfos(): Promise<UserInfo> {
    const userRecords = await this.conn.query<UserInfo>('SELECT username, profileid, id FROM User');

    if (userRecords.records) {
      return userRecords.records.reduce((userInfo, { Username, ProfileId, Id }) => {
        userInfo[Username] = { ProfileId, Id };
        return userInfo;
      });
    }
  }

  /**
   * Build a map of { [ProfileId]: ProfileName } for all profiles in the org
   *
   * @private
   * @return Promise<ProfileInfo>
   */
  private async buildProfileInfos(): Promise<ProfileInfo> {
    const profileRecords = await this.conn.query<ProfileInfo>('SELECT id, name FROM Profile');

    if (profileRecords.records) {
      return profileRecords.records.reduce((profileInfo, { Id, Name }) => {
        profileInfo[Id] = Name;
        return profileInfo;
      });
    }
  }
}
