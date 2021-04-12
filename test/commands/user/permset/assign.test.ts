/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { $$, expect, test } from '@salesforce/command/lib/test';
import { Aliases, Connection, Org, User } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';

describe('force:user:permset:assign', () => {
  async function prepareStubs(throws = false) {
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').returns(Connection.prototype);
    stubMethod($$.SANDBOX, Connection.prototype, 'query').resolves({ records: [{ Id: 1234567890 }] });
    stubMethod($$.SANDBOX, Org, 'create').callsFake(async () => Org.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns('defaultusername@test.com');
    stubMethod($$.SANDBOX, User, 'create').callsFake(async () => User.prototype);
    if (throws) {
      stubMethod($$.SANDBOX, User.prototype, 'assignPermissionSets').throws(
        new Error('Permission set "abc" not found in target org. Do you need to push source?')
      );
    } else {
      stubMethod($$.SANDBOX, User.prototype, 'assignPermissionSets').resolves();
    }

    stubMethod($$.SANDBOX, Aliases, 'fetch').withArgs('testAlias').resolves('testUser1@test.com');
  }

  test
    .do(async () => {
      await prepareStubs();
    })
    .stdout()
    .command([
      'force:user:permset:assign',
      '--json',
      '--onbehalfof',
      'testAlias, testUser2@test.com',
      '--permsetname',
      'DreamHouse, LargeDreamHouse',
    ])
    .it('should assign both permsets to both users', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = [
        {
          name: 'testAlias',
          value: 'DreamHouse,LargeDreamHouse',
        },
        {
          name: 'testUser2@test.com',
          value: 'DreamHouse,LargeDreamHouse',
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
    .command(['force:user:permset:assign', '--json', '--permsetname', 'PERM2'])
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
