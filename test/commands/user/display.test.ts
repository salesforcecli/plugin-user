/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { $$, expect, test } from '@salesforce/command/lib/test';
import { Connection, GlobalInfo, Org } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';

const username = 'defaultusername@test.com';

describe('force:user:display', () => {
  async function prepareStubs(queries = false) {
    stubMethod($$.SANDBOX, Org, 'create').resolves(Org.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').returns(Connection.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns(username);
    stubMethod($$.SANDBOX, Org.prototype, 'getOrgId').returns('abc123');
    if (queries) {
      stubMethod($$.SANDBOX, Org.prototype, 'readUserAuthFiles').returns([
        {
          getFields: () => {
            return {
              username: 'defaultusername@test.com',
              instanceUrl: 'instanceURL',
              loginUrl: 'login.test.com',
            };
          },
        },
      ]);
      stubMethod($$.SANDBOX, Connection.prototype, 'query')
        .withArgs(`SELECT name FROM Profile WHERE Id IN (SELECT ProfileId FROM User WHERE username='${username}')`)
        .resolves({
          records: [{ Name: 'QueriedName' }],
        })
        .withArgs(`SELECT id FROM User WHERE username='${username}'`)
        .resolves({ records: [{ Id: 'QueriedId' }] });
    } else {
      stubMethod($$.SANDBOX, Org.prototype, 'readUserAuthFiles').returns([
        {
          getFields: () => {
            return {
              username: 'defaultusername@test.com',
              userProfileName: 'profileName',
              userId: '1234567890',
              instanceUrl: 'instanceURL',
              loginUrl: 'login.test.com',
              password: '-a098u234/1!@#',
            };
          },
        },
      ]);
    }

    stubMethod($$.SANDBOX, GlobalInfo, 'getInstance').resolves({
      aliases: { get: () => 'testAlias' },
    });
  }

  test
    .do(async () => {
      await prepareStubs();
    })
    .stdout()
    .command([
      'force:user:display',
      '--json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
    ])
    .it('should display the correct information from the default user', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = {
        alias: 'testAlias',
        id: '1234567890',
        instanceUrl: 'instanceURL',
        loginUrl: 'login.test.com',
        orgId: 'abc123',
        password: '-a098u234/1!@#',
        profileName: 'profileName',
        username: 'defaultusername@test.com',
      };
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs(true);
    })
    .stdout()
    .command([
      'force:user:display',
      '--json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
    ])
    .it('should make queries to the server to get userId and profileName', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = {
        alias: 'testAlias',
        id: 'QueriedId',
        instanceUrl: 'instanceURL',
        loginUrl: 'login.test.com',
        orgId: 'abc123',
        profileName: 'QueriedName',
        username: 'defaultusername@test.com',
      };
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .stdout()
    .do(async () => {
      await prepareStubs();
    })
    .command([
      'force:user:display',
      '--json',
      '--targetusername',
      '00D54000000GxYk!ARwAQOZEBxYvKxKlNJfvJEGyj7fNj6TA61Fn5RxJzaYm79hR9IYjx2x147a2GH2DGtne21DW.g_8DD0rzNF.COIAXcmq0FfJ',
      '--targetdevhubusername',
      'devhub@test.com',
    ])
    .it('should throw when username is an accessToken', (ctx) => {
      const response = JSON.parse(ctx.stdout);
      expect(response.status).to.equal(1);
      expect(response.name).to.equal('accessTokenError');
    });
});
