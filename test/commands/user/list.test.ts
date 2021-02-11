/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { $$, expect, test } from '@salesforce/command/lib/test';
import { Aliases, ConfigAggregator, Connection, Org } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';

describe('force:user:list', () => {
  async function prepareStubs(defaultUser?: boolean) {
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').callsFake(() => Connection.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'readUserAuthFiles').returns([
      {
        getUsername: () => 'testuser@test.com',
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
    ]);
    stubMethod($$.SANDBOX, Org.prototype, 'getOrgId').returns('abc123');
    stubMethod($$.SANDBOX, Aliases.prototype, 'getKeysByValue').returns(['testAlias']);
    if (defaultUser) {
      const cfa = ConfigAggregator.getInstance();
      stubMethod($$.SANDBOX, cfa, 'getLocalConfig').returns({ get: () => 'testAlias' });
    }
    stubMethod($$.SANDBOX, Connection.prototype, 'query')
      .withArgs('SELECT username, profileid, id FROM User')
      .resolves({
        records: [
          {
            Username: 'automatedclean@00d2d000000dz5fuag',
            ProfileId: '00e2D000000bNeMQAU',
            Id: '0052D0000043PbBQAU',
          },
          {
            Username: 'testuser@test.com',
            ProfileId: '00e2D000000bNeMQAU',
            Id: '0052D0000043PbGQAU',
          },
        ],
      })
      .withArgs('SELECT id, name FROM Profile')
      .resolves({
        records: [
          {
            Id: '0052D0000043PbGQAU',
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
    .it('should display the correct information from the default user', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = [
        {
          defaultMarker: '',
          alias: 'testAlias',
          username: 'testuser@test.com',
          profileName: 'Analytics Cloud Integration User',
          orgId: 'abc123',
          accessToken: 'accessToken',
          instanceUrl: 'instanceURL',
          loginUrl: 'login.test.com',
          userId: '0052D0000043PbGQAU',
        },
      ];
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
    .it('should display the correct information from the default user with alias', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = [
        {
          defaultMarker: '',
          alias: 'testAlias',
          username: 'testuser@test.com',
          profileName: 'Analytics Cloud Integration User',
          orgId: 'abc123',
          accessToken: 'accessToken',
          instanceUrl: 'instanceURL',
          loginUrl: 'login.test.com',
          userId: '0052D0000043PbGQAU',
        },
      ];
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs();
      const cfa = ConfigAggregator.getInstance();
      stubMethod($$.SANDBOX, cfa, 'getLocalConfig').returns(undefined);
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
    .it('handles scenario with no localConfig available', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = [
        {
          defaultMarker: '',
          alias: 'testAlias',
          username: 'testuser@test.com',
          profileName: 'Analytics Cloud Integration User',
          orgId: 'abc123',
          accessToken: 'accessToken',
          instanceUrl: 'instanceURL',
          loginUrl: 'login.test.com',
          userId: '0052D0000043PbGQAU',
        },
      ];
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs(true);
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
    .it('should display the correct information from the default user with alias and it default', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = [
        {
          defaultMarker: '(A)',
          alias: 'testAlias',
          username: 'testuser@test.com',
          profileName: 'Analytics Cloud Integration User',
          orgId: 'abc123',
          accessToken: 'accessToken',
          instanceUrl: 'instanceURL',
          loginUrl: 'login.test.com',
          userId: '0052D0000043PbGQAU',
        },
      ];
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });
});
