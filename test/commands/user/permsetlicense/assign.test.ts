/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as Sinon from 'sinon';
import { $$, expect, test } from '@salesforce/command/lib/test';
import { Aliases, AuthInfo, Connection, Org } from '@salesforce/core';
import { StubbedType, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { MockTestOrgData } from '@salesforce/core/lib/testSetup';

describe.only('force:user:permsetlicense:assign', () => {
  let authInfoStub: StubbedType<AuthInfo>;
  const testData = new MockTestOrgData();

  const goodPSL = 'existingPSL';
  const badPSL = 'nonExistingPSL';

  const defaultUsername = 'defaultusername@test.com';
  const username1 = 'testUser1@test.com';
  const username2 = 'testUser2@test.com';
  async function prepareStubs() {
    const authFields = await testData.getConfig();
    authInfoStub = stubInterface<AuthInfo>($$.SANDBOX, { getFields: () => authFields });

    stubMethod($$.SANDBOX, AuthInfo, 'create').callsFake(async () => authInfoStub);
    stubMethod($$.SANDBOX, Org, 'create').callsFake(async () => Org.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').returns(Connection.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns(defaultUsername);

    stubMethod($$.SANDBOX, Aliases, 'fetch').withArgs(username1).resolves('testAlias');
    stubMethod($$.SANDBOX, Connection.prototype, 'singleRecordQuery')
      // matcher for all user queries
      .withArgs(Sinon.match((arg: string) => arg.startsWith('select Id from User')))
      .resolves({
        Id: '0051234567890123',
      })
      .withArgs(`select Id from PermissionSetLicense where DeveloperName = '${goodPSL}' or MasterLabel = '${goodPSL}'`)
      .resolves({
        Id: '0PL46000000gHHsGAM',
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
      [username1, username2].join(','),
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
          name: username2,
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
