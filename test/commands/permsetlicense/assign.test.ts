/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { assert, expect } from 'chai';
import { AssignPermSetLicenseCommand } from '../../../src/commands/org/assign/permsetlicense.js';

describe('org:assign:permsetlicense', () => {
  const $$ = new TestContext();

  const testOrg = new MockTestOrgData();
  testOrg.username = 'defaultusername@test.com';
  const goodPSL = 'existingPSL';
  const badPSL = 'nonExistingPSL';

  const username1 = 'testUser1@test.com';
  const username2 = 'testUser2@test.com';

  async function prepareStubs() {
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });

    $$.stubAliases({ testAlias: username1 });

    $$.SANDBOXES.CONNECTION.stub(Connection.prototype, 'singleRecordQuery')
      // matcher for all user queries
      .withArgs(`select Id from User where Username = '${username1}'`)
      .resolves({ Id: '0051234567890123' })
      .withArgs(`select Id from User where Username = '${username2}'`)
      .resolves({ Id: '0051234567890123' })
      .withArgs(`select Id from PermissionSetLicense where DeveloperName = '${goodPSL}' or MasterLabel = '${goodPSL}'`)
      .resolves({
        Id: '0PL46000000gHHsGAM',
      })
      .withArgs(`select Id from PermissionSetLicense where DeveloperName = '${badPSL}' or MasterLabel = '${badPSL}'`)
      .throws();

    $$.SANDBOX.stub(Connection.prototype, 'sobject').callsFake(() => ({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      create() {
        return Promise.resolve({ success: true });
      },
    }));
  }

  it('should assign the one permset to both users', async () => {
    await prepareStubs();
    const expected = [
      {
        name: username1,
        value: goodPSL,
      },
      {
        name: username2,
        value: goodPSL,
      },
    ];
    const result = await AssignPermSetLicenseCommand.run([
      '--json',
      '--onbehalfof',
      [username1, username2].join(','),
      '--name',
      goodPSL,
    ]);
    expect(result.failures).to.deep.equal([]);
    expect(result.successes).to.deep.equal(expected);
  });

  it('should fail with the correct error message when no PSL exists', async () => {
    await prepareStubs();

    try {
      await AssignPermSetLicenseCommand.run(['--json', '--name', badPSL]);
    } catch (e) {
      assert(e instanceof Error);
      expect(e.message).to.equal('PermissionSetLicense not found');
    }
  });
});
