/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { $$, expect, test } from '@salesforce/command/lib/test';
import { Connection, Org } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';

const user1 = 'defaultusername@test.com';
const user2 = 'otherUser@test.com';
const expected = [
  {
    defaultMarker: '(A)',
    alias: 'testAlias',
    username: user1,
    profileName: 'System Administrator',
    orgId: 'abc123',
    accessToken: 'accessToken',
    instanceUrl: 'instanceURL',
    loginUrl: 'login.test.com',
    userId: '0052D0000043PbGQAU',
  },
  {
    defaultMarker: '',
    alias: '',
    username: user2,
    profileName: 'System Administrator',
    orgId: 'abc123',
    accessToken: 'accessToken',
    instanceUrl: 'instanceURL',
    loginUrl: 'login.test.com',
    userId: '0052D0000043PcBQAU',
  },
];

describe('force:user:list', () => {
  beforeEach(async () => {
    stubMethod($$.SANDBOX, Org, 'create').resolves(Org.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').returns(Connection.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'readUserAuthFiles').returns([
      {
        getUsername: () => user1,
        getFields: () => {
          return {
            username: user1,
            userProfileName: 'profileName',
            userId: '1234567890',
            instanceUrl: 'instanceURL',
            loginUrl: 'login.test.com',
            accessToken: 'accessToken',
          };
        },
      },
      {
        getUsername: () => user2,
        getFields: () => {
          return {
            username: user2,
            userProfileName: 'profileName',
            userId: '1234567890',
            instanceUrl: 'instanceURL',
            loginUrl: 'login.test.com',
            accessToken: 'accessToken',
          };
        },
      },
    ]);
    stubMethod($$.SANDBOX, Org.prototype, 'getOrgId').returns('abc123');
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns(user1);
    $$.stubAliases({ testAlias: user1 });
    stubMethod($$.SANDBOX, Connection.prototype, 'query')
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
      });
  });

  test
    .stdout()
    .command(['force:user:list', '--json', '--targetusername', 'testUser', '--targetdevhubusername', 'devhub@test.com'])
    .it('should display the correct information invoked with an alias', (ctx) => {
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .stdout()
    .command(['force:user:list', '--json', '--targetusername', user1, '--targetdevhubusername', 'devhub@test.com'])
    .it('should display the correct information invoked by name', (ctx) => {
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });
});
