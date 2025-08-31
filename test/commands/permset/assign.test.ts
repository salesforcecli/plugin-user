/*
 * Copyright 2025, Salesforce, Inc.
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

import { Connection, User } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { AssignPermSetCommand } from '../../../src/commands/org/assign/permset.js';

describe('org:assign:permset', () => {
  const $$ = new TestContext();

  const testOrg = new MockTestOrgData();
  testOrg.username = 'defaultusername@test.com';

  async function prepareStubs(throws = false) {
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });

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
    const result = await AssignPermSetCommand.run([
      '--json',
      '--on-behalf-of',
      'testAlias',
      'testUser2@test.com',
      '--name',
      'DreamHouse',
      'LargeDreamHouse',
    ]);
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
    const result = await AssignPermSetCommand.run(['--json', '--permsetname', 'PERM2']);
    expect(result.failures).to.deep.equal(expected);
  });
});
