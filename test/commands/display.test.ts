/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AuthInfo, Connection, Org } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { expect } from 'chai';
import { Config } from '@oclif/core';
import { UserDisplayCommand } from '../../src/commands/user/display';

const username = 'defaultusername@test.com';

describe('user:display', () => {
  const $$ = new TestContext();

  const testOrg = new MockTestOrgData();
  const devHub = new MockTestOrgData();
  devHub.username = 'mydevhub.org';
  devHub.devHubUsername = 'mydevhub.org';
  devHub.isDevHub = true;
  const defaultOrg = new MockTestOrgData();
  defaultOrg.orgId = 'abc123';
  defaultOrg.username = 'defaultusername@test.com';
  defaultOrg.userId = '1234567890';
  defaultOrg.instanceUrl = 'instanceURL';
  defaultOrg.loginUrl = 'login.test.com';
  defaultOrg.password = '-a098u234/1!@#';

  async function prepareStubs(queries = false) {
    await $$.stubAuths(testOrg, devHub, defaultOrg);
    await $$.stubConfig({ 'target-dev-hub': devHub.username, 'target-org': defaultOrg.username });
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
      $$.SANDBOXES.CONNECTION.stub(Connection.prototype, 'query')
        .withArgs(`SELECT name FROM Profile WHERE Id IN (SELECT ProfileId FROM User WHERE username='${username}')`)
        .resolves({
          records: [{ Name: 'QueriedName' }],
          done: true,
          totalSize: 1,
        })
        .withArgs(`SELECT id FROM User WHERE username='${username}'`)
        .resolves({
          records: [{ Id: 'QueriedId' }],
          done: true,
          totalSize: 1,
        });
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
    const displayCommand = new UserDisplayCommand(
      ['--json', '--target-org', defaultOrg.username, '--target-dev-hub', devHub.username],
      {} as Config
    );
    const result = await displayCommand.run();
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
    const displayCommand = new UserDisplayCommand(
      ['--json', '--targetusername', 'defaultusername@test.com', '--targetdevhubusername', devHub.username],
      {} as Config
    );
    const result = await displayCommand.run();
    expect(result).to.deep.equal(expected);
  });
});
