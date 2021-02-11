/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { $$, expect, test } from '@salesforce/command/lib/test';
import { Aliases, Connection, Org } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';

const expected = [
  {
    defaultMarker: '(A)',
    alias: 'testAlias',
    username: 'defaultusername@test.com',
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
    username: 'otherUser@test.com',
    profileName: 'System Administrator',
    orgId: 'abc123',
    accessToken: 'accessToken',
    instanceUrl: 'instanceURL',
    loginUrl: 'login.test.com',
    userId: '0052D0000043PcBQAU',
  },
];

describe('force:user:list', () => {
  async function prepareStubs() {
    stubMethod($$.SANDBOX, Org, 'create').resolves(Org.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').callsFake(() => Connection.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'readUserAuthFiles').returns([
      {
        getUsername: () => 'defaultusername@test.com',
        getFields: () => {
          return {
            username: 'defaultusername@test.com',
            userProfileName: 'profileName',
            userId: '1234567890',
            instanceUrl: 'instanceURL',
            loginUrl: 'login.test.com',
            accessToken: 'accessToken',
          };
        },
      },
      {
        getUsername: () => 'otherUser@test.com',
        getFields: () => {
          return {
            username: 'otherUser@test.com',
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
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns('defaultusername@test.com');
    stubMethod($$.SANDBOX, Aliases.prototype, 'getKeysByValue')
      .withArgs('defaultusername@test.com')
      .returns(['testAlias']);
    stubMethod($$.SANDBOX, Connection.prototype, 'query')
      .withArgs('SELECT username, profileid, id FROM User')
      .resolves({
        records: [
          {
            Username: 'otherUser@test.com',
            ProfileId: '00e2D0000043PbGQAU',
            Id: '0052D0000043PcBQAU',
          },
          {
            Username: 'automatedclean@00d2d000000dz5fuag',
            ProfileId: '00e2D000000bNeMQAU',
            Id: '0052D0000043PbBQAU',
          },
          {
            Username: 'defaultusername@test.com',
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
  }

  test
    .do(async () => {
      await prepareStubs();
    })
    .stdout()
    .command(['force:user:list', '--json', '--targetusername', 'testUser', '--targetdevhubusername', 'devhub@test.com'])
    .it('should display the correct information invoked with an alias', (ctx) => {
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs();
    })
    .stdout()
    .command([
      'force:user:list',
      '--json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
    ])
    .it('should display the correct information invoked by name', (ctx) => {
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });
});
