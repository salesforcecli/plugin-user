/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup.js';
import { Config } from '@oclif/core';
import { assert, expect } from 'chai';
import { AssignPermSetLicenseCommand } from '../../../src/commands/org/assign/permsetlicense.js';
import { PSLResult } from '../../../src/baseCommands/user/permsetlicense/assign.js';

describe('org:assign:permsetlicense', () => {
  const $$ = new TestContext();

  class AssignPermSetLicenseCommandTest extends AssignPermSetLicenseCommand {
    public constructor(argv: string[], config: Config) {
      super(argv, config);
    }

    public async run(): Promise<PSLResult> {
      return super.run();
    }
  }

  const testOrg = new MockTestOrgData();
  testOrg.username = 'defaultusername@test.com';
  const devHub = new MockTestOrgData();
  devHub.username = 'mydevhub.org';
  devHub.devHubUsername = 'mydevhub.org';
  devHub.isDevHub = true;

  const goodPSL = 'existingPSL';
  const badPSL = 'nonExistingPSL';

  const username1 = 'testUser1@test.com';
  const username2 = 'testUser2@test.com';

  async function prepareStubs() {
    await $$.stubAuths(testOrg, devHub);
    await $$.stubConfig({ 'target-dev-hub': devHub.username, 'target-org': testOrg.username });

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
    const userPermSetLicenseAssignCommand = new AssignPermSetLicenseCommandTest(
      ['--json', '--onbehalfof', [username1, username2].join(','), '--name', goodPSL],
      {} as Config
    );
    const result = await userPermSetLicenseAssignCommand.run();
    expect(result.failures).to.deep.equal([]);
    expect(result.successes).to.deep.equal(expected);
  });

  it('should fail with the correct error message when no PSL exists', async () => {
    await prepareStubs();
    const userPermSetLicenseAssignCommand = new AssignPermSetLicenseCommandTest(
      ['--json', '--name', badPSL],
      {} as Config
    );
    try {
      await userPermSetLicenseAssignCommand.run();
    } catch (e) {
      assert(e instanceof Error);
      expect(e.message).to.equal('PermissionSetLicense not found');
    }
  });
});
