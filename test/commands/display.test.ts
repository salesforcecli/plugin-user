/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AuthInfo, Connection, Org } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { DisplayUserCommand } from '../../src/commands/org/display/user.js';

const username = 'defaultusername@test.com';

describe('org:display:user', () => {
  const $$ = new TestContext();

  const testOrg = new MockTestOrgData();
  const defaultOrg = new MockTestOrgData();
  defaultOrg.orgId = 'abc123';
  defaultOrg.username = 'defaultusername@test.com';
  defaultOrg.userId = '1234567890';
  defaultOrg.instanceUrl = 'instanceURL';
  defaultOrg.loginUrl = 'login.test.com';
  defaultOrg.password = '-a098u234/1!@#';

  async function prepareStubs(queries = false) {
    await $$.stubAuths(testOrg, defaultOrg);
    await $$.stubConfig({ 'target-org': defaultOrg.username });
    $$.stubAliases({ testAlias: 'defaultusername@test.com' });

    if (queries) {
      $$.SANDBOX.stub(Org.prototype, 'readUserAuthFiles').callsFake(
        (): Promise<AuthInfo[]> =>
          Promise.resolve([
            {
              getFields: () => ({
                username: 'defaultusername@test.com',
                instanceUrl: 'instanceURL',
                loginUrl: 'login.test.com',
              }),
            } as AuthInfo,
          ])
      );
      $$.SANDBOXES.CONNECTION.stub(Connection.prototype, 'singleRecordQuery')
        .withArgs(`SELECT name FROM Profile WHERE Id IN (SELECT ProfileId FROM User WHERE username='${username}')`)
        .resolves({ Name: 'QueriedName' })
        .withArgs(`SELECT id FROM User WHERE username='${username}'`)
        .resolves({ Id: 'QueriedId' });
    } else {
      $$.SANDBOX.stub(Org.prototype, 'readUserAuthFiles').callsFake(
        (): Promise<AuthInfo[]> =>
          Promise.resolve([
            {
              getFields: () => ({
                username: 'defaultusername@test.com',
                userProfileName: 'profileName',
                userId: '1234567890',
                instanceUrl: 'instanceURL',
                loginUrl: 'login.test.com',
                password: '-a098u234/1!@#',
              }),
            } as AuthInfo,
          ])
      );
    }
  }

  it('should display the correct information from the default user', async () => {
    await prepareStubs();
    // testUser1@test.com is aliased to testUser
    const expected = {
      accessToken: defaultOrg.accessToken,
      alias: 'testAlias',
      id: '1234567890',
      instanceUrl: 'instanceURL',
      loginUrl: 'login.test.com',
      orgId: 'abc123',
      password: '-a098u234/1!@#',
      profileName: 'profileName',
      username: 'defaultusername@test.com',
    };
    const result = await DisplayUserCommand.run(['--json', '--target-org', defaultOrg.username]);
    expect(result).to.deep.equal(expected);
  });

  it('should make queries to the server to get userId and profileName', async () => {
    await prepareStubs(true);
    // testUser1@test.com is aliased to testUser
    const expected = {
      accessToken: defaultOrg.accessToken,
      alias: 'testAlias',
      id: 'QueriedId',
      instanceUrl: 'instanceURL',
      loginUrl: 'login.test.com',
      orgId: 'abc123',
      profileName: 'QueriedName',
      username: defaultOrg.username,
    };
    const result = await DisplayUserCommand.run(['--json', '--targetusername', 'defaultusername@test.com']);
    expect(result).to.deep.equal(expected);
  });
});
