/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { $$, expect, test } from '@salesforce/command/lib/test';
import { Aliases, Connection, Org } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import { Crypto } from '@salesforce/core/lib/crypto';

const username = 'defaultusername@test.com';

describe('force:user:display', () => {
  async function prepareStubs(queries = false) {
    stubMethod($$.SANDBOX, Crypto.prototype, 'decrypt').returns('fakepassword');
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').callsFake(() => Connection.prototype);
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
        .withArgs(`SELECT name FROM Profile WHERE Id IN (SELECT profileid FROM User WHERE username='${username}')`)
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

    stubMethod($$.SANDBOX, Aliases, 'fetch').resolves('testAlias');
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
      const expected = [
        {
          Key: 'Access Token',
        },
        {
          Key: 'Id',
          Value: '1234567890',
        },
        {
          Key: 'Instance Url',
          Value: 'instanceURL',
        },
        {
          Key: 'Login Url',
          Value: 'login.test.com',
        },
        {
          Key: 'Org Id',
          Value: 'abc123',
        },
        {
          Key: 'Profile Name',
          Value: 'profileName',
        },
        {
          Key: 'Username',
          Value: 'defaultusername@test.com',
        },
        { Key: 'Alias', Value: 'testAlias' },
        {
          Key: 'Password',
          Value: 'fakepassword',
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
      'force:user:display',
      '--json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
    ])
    .it('should make queries to the server to get userId and profileName', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = [
        {
          Key: 'Access Token',
        },
        {
          Key: 'Id',
          Value: 'QueriedId',
        },
        {
          Key: 'Instance Url',
          Value: 'instanceURL',
        },
        {
          Key: 'Login Url',
          Value: 'login.test.com',
        },
        {
          Key: 'Org Id',
          Value: 'abc123',
        },
        {
          Key: 'Profile Name',
          Value: 'QueriedName',
        },
        {
          Key: 'Username',
          Value: 'defaultusername@test.com',
        },
        {
          Key: 'Alias',
          Value: 'testAlias',
        },
      ];
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });
});
