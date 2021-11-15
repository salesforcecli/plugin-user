/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { $$, expect, test } from '@salesforce/command/lib/test';
import { Aliases, AuthInfo, Connection, Org, User } from '@salesforce/core';
import { StubbedType, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { MockTestOrgData } from '@salesforce/core/lib/testSetup';

describe('force:user:permsetlicense:assign', () => {
  let authInfoStub: StubbedType<AuthInfo>;
  const testData = new MockTestOrgData();

  const goodPSL = 'existingPSL';
  const badPSL = 'nonExistingPSL';

  async function prepareStubs() {
    const authFields = await testData.getConfig();
    authInfoStub = stubInterface<AuthInfo>($$.SANDBOX, { getFields: () => authFields });

    stubMethod($$.SANDBOX, AuthInfo, 'create').callsFake(async () => authInfoStub);
    stubMethod($$.SANDBOX, Org, 'create').callsFake(async () => Org.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').returns(Connection.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns('defaultusername@test.com');
    stubMethod($$.SANDBOX, User, 'create').callsFake(async () => User.prototype);
    stubMethod($$.SANDBOX, User.prototype, 'retrieve').resolves({
      id: '0052D0000043PawWWR',
    });

    stubMethod($$.SANDBOX, Aliases, 'fetch').withArgs('testUser1@test.com').resolves('testAlias');
    stubMethod($$.SANDBOX, Connection.prototype, 'singleRecordQuery')
      .withArgs(`select Id from PermissionSetLicense where DeveloperName = '${goodPSL}' or MasterLabel = '${goodPSL}'`)
      .resolves({
        records: [
          {
            Id: '0PL46000000gHHsGAM',
          },
        ],
      })
      .withArgs(`select Id from PermissionSetLicense where DeveloperName = '${badPSL}' or MasterLabel = '${badPSL}'`)
      .throws();

    stubMethod($$.SANDBOX, Connection.prototype, 'sobject').callsFake(() => {
      return {
        create() {
          return Promise.resolve({ success: true });
        },
      };
    });
  }

  test
    .do(async () => {
      await prepareStubs();
    })
    .stdout()
    .command([
      'force:user:permsetlicense:assign',
      '--json',
      '--onbehalfof',
      'testUser1@test.com,testUser2@test.com',
      '--name',
      goodPSL,
    ])
    .it('should assign the one permset to both users', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = [
        {
          name: 'testAlias',
          value: goodPSL,
        },
        {
          name: 'testUser2@test.com',
          value: goodPSL,
        },
      ];
      const result = JSON.parse(ctx.stdout).result;
      expect(result.failures).to.deep.equal([]);
      expect(result.successes).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs();
    })
    .stdout()
    .command(['force:user:permsetlicense:assign', '--json', '--name', badPSL])
    .it('should fail with the correct error message when no PSL exists', (ctx) => {
      const result = JSON.parse(ctx.stdout);
      expect(result.message).to.equal('PermissionSetLicense not found');
      expect(result.status).to.equal(1);
    });
});
