/*
 * Copyright 2026, Salesforce, Inc.
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

import { Connection, Org } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { ListUsersCommand } from '../../src/commands/org/list/users.js';

const user1 = 'defaultusername@test.com';
const user2 = 'otherUser@test.com';
const instanceUrl = 'https://instanceURL.com';
const loginUrl = 'https://login.test.com';

const expected = [
  {
    defaultMarker: '(A)',
    alias: 'testAlias',
    username: user1,
    profileName: 'System Administrator',
    orgId: 'abc123',
    accessToken: 'accessToken',
    instanceUrl,
    loginUrl,
    userId: '0052D0000043PbGQAU',
  },
  {
    defaultMarker: '',
    alias: '',
    username: user2,
    profileName: 'System Administrator',
    orgId: 'abc123',
    accessToken: 'accessToken',
    instanceUrl,
    loginUrl,
    userId: '0052D0000043PcBQAU',
  },
];

describe('org:list:users', () => {
  const $$ = new TestContext();

  const user1Org = new MockTestOrgData();
  user1Org.username = user1;
  user1Org.orgId = 'abc123';
  user1Org.aliases = ['testAlias'];
  user1Org.accessToken = 'accessToken';
  user1Org.instanceUrl = instanceUrl;
  user1Org.loginUrl = loginUrl;
  user1Org.userId = '0052D0000043PbGQAU';

  const user2Org = new MockTestOrgData();
  user2Org.username = user2;
  user2Org.orgId = 'abc123';
  user2Org.aliases = [];
  user2Org.accessToken = 'accessToken';
  user2Org.instanceUrl = instanceUrl;
  user2Org.loginUrl = loginUrl;
  user2Org.userId = '0052D0000043PcBQAU';

  beforeEach(async () => {
    await $$.stubAuths(user1Org);
    await $$.stubConfig({ 'target-org': user1Org.username });
    $$.stubAliases({ testAlias: user1 });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    $$.SANDBOX.stub(Org.prototype, 'readUserAuthFiles').returns([
      {
        getUsername: () => user1,
        getFields: () => ({
          username: user1,
          userProfileName: 'profileName',
          userId: '1234567890',
          instanceUrl,
          loginUrl,
          accessToken: 'accessToken',
        }),
      },
      {
        getUsername: () => user2,
        getFields: () => ({
          username: user2,
          userProfileName: 'profileName',
          userId: '1234567890',
          instanceUrl,
          loginUrl,
          accessToken: 'accessToken',
        }),
      },
    ]);
    $$.SANDBOXES.CONNECTION.stub(Connection.prototype, 'query')
      .withArgs('SELECT username, profileid, id FROM User')
      .resolves({
        records: [
          {
            Username: user2,
            ProfileId: '00e2D0000043PbGQAU',
            Id: '0052D0000043PcBQAU',
          },
          {
            Username: 'automatedclean@00d2d000000dz5fuag',
            ProfileId: '00e2D000000bNeMQAU',
            Id: '0052D0000043PbBQAU',
          },
          {
            Username: user1,
            ProfileId: '00e2D0000043PbGQAU',
            Id: '0052D0000043PbGQAU',
          },
        ],
        done: true,
        totalSize: 3,
      })
      .withArgs('SELECT id, name FROM Profile')
      .resolves({
        records: [
          {
            Id: '00e2D0000043PbGQAU',
            Name: 'System Administrator',
          },
          {
            Id: '00e2D000000bNeMQAU',
            Name: 'Analytics Cloud Integration User',
          },
        ],
        done: true,
        totalSize: 2,
      });
  });

  it('should display the correct information invoked with an alias', async () => {
    const result = await ListUsersCommand.run(['--json', '--target-org', 'testAlias']);
    expect(result).to.deep.equal(expected);
  });

  it('should display the correct information invoked by name', async () => {
    const result = await ListUsersCommand.run(['--json', '--target-org', user1]);
    expect(result).to.deep.equal(expected);
  });
});
