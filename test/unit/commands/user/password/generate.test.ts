/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { $$, expect, test } from '@salesforce/command/lib/test';
import { Aliases, AuthInfo, Connection, Org, User, AuthInfoConfig, Messages } from '@salesforce/core';
import { StubbedType, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { MockTestOrgData } from '@salesforce/core/lib/testSetup';
import { SecureBuffer } from '@salesforce/core/lib/secureBuffer';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

describe('force:user:password:generate', () => {
  let authInfoStub: StubbedType<AuthInfo>;
  let authInfoConfigStub: StubbedType<AuthInfoConfig>;
  const testData = new MockTestOrgData();

  async function prepareStubs(throws = false) {
    const authFields = await testData.getConfig();
    authInfoStub = stubInterface<AuthInfo>($$.SANDBOX, { getFields: () => authFields });
    authInfoConfigStub = stubInterface<AuthInfoConfig>($$.SANDBOX, {
      getContents: () => authFields,
    });
    stubMethod($$.SANDBOX, AuthInfoConfig, 'create').callsFake(async () => authInfoConfigStub);
    stubMethod($$.SANDBOX, AuthInfo, 'create').callsFake(async () => authInfoStub);
    stubMethod($$.SANDBOX, Connection, 'create').callsFake(async () => Connection.prototype);
    stubMethod($$.SANDBOX, Org, 'create').callsFake(async () => Org.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns('defaultusername@test.com');
    stubMethod($$.SANDBOX, User, 'create').callsFake(async () => User.prototype);
    stubMethod($$.SANDBOX, User.prototype, 'retrieve').resolves({
      id: '0052D0000043PawWWR',
    });

    const secureBuffer: SecureBuffer<void> = new SecureBuffer<void>();
    secureBuffer.consume(Buffer.from('abc', 'utf8'));
    stubMethod($$.SANDBOX, User, 'generatePasswordUtf8').returns(secureBuffer);

    if (throws) {
      stubMethod($$.SANDBOX, User.prototype, 'assignPassword').throws(new Error('Cannot set password for self'));
    } else {
      stubMethod($$.SANDBOX, User.prototype, 'assignPassword').resolves();
    }
    stubMethod($$.SANDBOX, Aliases, 'fetch').withArgs('testUser1@test.com').resolves('testAlias');
  }

  test
    .do(async () => {
      await prepareStubs();
    })
    .stdout()
    .command(['force:user:password:generate', '--json', '--onbehalfof', 'testUser1@test.com, testUser2@test.com'])
    .it('should generate a new password for the user', (ctx) => {
      // testUser1@test.com is aliased to testUser
      const expected = [
        {
          username: 'testAlias',
          password: 'abc',
        },
        {
          username: 'testUser2@test.com',
          password: 'abc',
        },
      ];
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(() => prepareStubs())
    .stdout()
    .command(['force:user:password:generate', '--json'])
    .it('should generate a new password for the default user', (ctx) => {
      const expected = [{ username: 'defaultusername@test.com', password: 'abc' }];
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => await prepareStubs(true))

    .stdout()
    .command(['force:user:password:generate', '--json'])
    .it('should throw the correct error with warning message', (ctx) => {
      const result = JSON.parse(ctx.stdout);
      expect(result.message).to.equal(messages.getMessage('noSelfSetError'));
      expect(result.status).to.equal(1);
      expect(result.name).to.equal('noSelfSetError');
    });
});
