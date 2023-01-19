/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, User } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { expect } from 'chai';
import { Config } from '@oclif/core';
import { AssignPermSetCommand } from '../../../src/commands/org/assign/permset';
import { PermsetAssignResult } from '../../../src/baseCommands/user/permset/assign';

describe('org:assign:permset', () => {
  const $$ = new TestContext();

  class AssignPermSetCommandTest extends AssignPermSetCommand {
    public constructor(argv: string[], config: Config) {
      super(argv, config);
    }

    public async run(): Promise<PermsetAssignResult> {
      return super.run();
    }
  }

  const testOrg = new MockTestOrgData();
  testOrg.username = 'defaultusername@test.com';
  const devHub = new MockTestOrgData();
  devHub.username = 'mydevhub.org';
  devHub.devHubUsername = 'mydevhub.org';
  devHub.isDevHub = true;

  async function prepareStubs(throws = false) {
    await $$.stubAuths(testOrg, devHub);
    await $$.stubConfig({ 'target-dev-hub': devHub.username, 'target-org': testOrg.username });

    $$.SANDBOXES.CONNECTION.stub(Connection.prototype, 'query').resolves({
      records: [{ Id: '1234567890' }],
      done: true,
      totalSize: 1,
    });

    if (throws) {
      $$.SANDBOX.stub(User.prototype, 'assignPermissionSets').throws(
        new Error('Permission set "abc" not found in target org. Do you need to push source?')
      );
    } else {
      $$.SANDBOX.stub(User.prototype, 'assignPermissionSets').resolves();
    }
    $$.stubAliases({ testAlias: 'testUser2@test.com' });
  }

  it('should assign both permsets to both users', async () => {
    await prepareStubs();
    // testUser1@test.com is aliased to testUser
    const expected = [
      {
        name: 'testAlias',
        value: 'DreamHouse',
      },
      {
        name: 'testAlias',
        value: 'LargeDreamHouse',
      },
      {
        name: 'testUser2@test.com',
        value: 'DreamHouse',
      },
      {
        name: 'testUser2@test.com',
        value: 'LargeDreamHouse',
      },
    ];
    const userPermSetAssign = new AssignPermSetCommandTest(
      ['--json', '--on-behalf-of', 'testAlias', 'testUser2@test.com', '--name', 'DreamHouse', 'LargeDreamHouse'],
      {} as Config
    );
    const result = await userPermSetAssign.run();
    expect(result.successes).to.deep.equal(expected);
  });
  it('should fail with the correct error message', async () => {
    await prepareStubs(true);
    // testUser1@test.com is aliased to testUser
    const expected = [
      {
        name: 'defaultusername@test.com',
        message: 'Permission set "abc" not found in target org. Do you need to push source?',
      },
    ];
    const userPermSetAssign = new AssignPermSetCommandTest(['--json', '--permsetname', 'PERM2'], {} as Config);
    const result = await userPermSetAssign.run();
    expect(result.failures).to.deep.equal(expected);
  });
});
