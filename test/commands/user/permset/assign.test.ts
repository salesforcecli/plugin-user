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

describe('force:user:permset:assign', () => {
  let authInfoStub: StubbedType<AuthInfo>;
  const testData = new MockTestOrgData();

  async function prepareStubs(throws = false) {
    const authFields = await testData.getConfig();
    authInfoStub = stubInterface<AuthInfo>($$.SANDBOX, { getFields: () => authFields });

    stubMethod($$.SANDBOX, AuthInfo, 'create').callsFake(async () => authInfoStub);
    stubMethod($$.SANDBOX, Connection, 'create').callsFake(async () => Connection.prototype);
    stubMethod($$.SANDBOX, Org, 'create').callsFake(async () => Org.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns('defaultusername@test.com');
    stubMethod($$.SANDBOX, User, 'create').callsFake(async () => User.prototype);
    stubMethod($$.SANDBOX, User.prototype, 'retrieve').resolves({
      id: '0052D0000043PawWWR',
    });
    if (throws) {
      stubMethod($$.SANDBOX, User.prototype, 'assignPermissionSets').throws(
        new Error('Permission set "abc" not found in target org. Do you need to push source?')
      );
    } else {
      stubMethod($$.SANDBOX, User.prototype, 'assignPermissionSets').resolves();
    }

    stubMethod($$.SANDBOX, Aliases, 'fetch').withArgs('testUser1@test.com').resolves('testAlias');
  }

  test
    .do(async () => {
      await prepareStubs();
    })
    .stdout()
    .command([
      'user:permset:assign',
      '--json',
      '--onbehalfof',
      'testUser1@test.com, testUser2@test.com',
      '--permsetname',
      'DreamHouse',
    ])
    .it('should assign the one permset to both users', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = [
        {
          name: 'testAlias',
          value: 'DreamHouse',
        },
        {
          name: ' testUser2@test.com',
          value: 'DreamHouse',
        },
      ];
      const result = JSON.parse(ctx.stdout).result;
      expect(result.successes).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs();
    })
    .stdout()
    .command(['user:permset:assign', '--json', '--permsetname', 'DreamHouse, PERM2'])
    .it('should assign both permsets to the default user', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = [
        {
          name: 'defaultusername@test.com',
          value: 'DreamHouse, PERM2',
        },
      ];
      const result = JSON.parse(ctx.stdout).result;
      expect(result.successes).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs(true);
    })
    .stdout()
    .command(['user:permset:assign', '--json', '--permsetname', 'PERM2'])
    .it('should fail with the correct error message', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = [
        {
          name: 'defaultusername@test.com',
          message: 'Permission set "abc" not found in target org. Do you need to push source?',
        },
      ];
      const result = JSON.parse(ctx.stdout).result;
      expect(result.failures).to.deep.equal(expected);
    });
});
