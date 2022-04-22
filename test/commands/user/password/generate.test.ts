/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { $$, expect, test } from '@salesforce/command/lib/test';
import { AuthInfo, Connection, Org, User, Messages, GlobalInfo } from '@salesforce/core';
import { StubbedType, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { MockTestOrgData } from '@salesforce/core/lib/testSetup';
import { SecureBuffer } from '@salesforce/core/lib/crypto/secureBuffer';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

describe('force:user:password:generate', () => {
  let authInfoStub: StubbedType<AuthInfo>;
  // let authInfoConfigStub: StubbedType<AuthInfoConfig>;
  const testData = new MockTestOrgData();
  let queryStub;

  async function prepareStubs(throws = false, generatePassword = true) {
    const authFields = await testData.getConfig();
    authInfoStub = stubInterface<AuthInfo>($$.SANDBOX, { getFields: () => authFields });
    // authInfoConfigStub = stubInterface<AuthInfoConfig>($$.SANDBOX, {
    //   getContents: () => authFields,
    // });
    // stubMethod($$.SANDBOX, AuthInfoConfig, 'create').callsFake(async () => authInfoConfigStub);
    stubMethod($$.SANDBOX, AuthInfo, 'create').callsFake(async () => authInfoStub);
    stubMethod($$.SANDBOX, Connection, 'create').callsFake(async () => Connection.prototype);
    stubMethod($$.SANDBOX, Org, 'create').callsFake(async () => Org.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns('defaultusername@test.com');
    stubMethod($$.SANDBOX, Org.prototype, 'retrieveMaxApiVersion').returns('51.0');
    stubMethod($$.SANDBOX, User, 'create').callsFake(async () => User.prototype);
    queryStub = stubMethod($$.SANDBOX, Connection.prototype, 'singleRecordQuery').resolves({
      Id: '0052D0000043PawWWR',
    });

    if (generatePassword) {
      const secureBuffer: SecureBuffer<void> = new SecureBuffer<void>();
      secureBuffer.consume(Buffer.from('abc', 'utf8'));
      stubMethod($$.SANDBOX, User, 'generatePasswordUtf8').returns(secureBuffer);
    }

    if (throws) {
      stubMethod($$.SANDBOX, User.prototype, 'assignPassword').throws(new Error('Cannot set password for self'));
    } else {
      stubMethod($$.SANDBOX, User.prototype, 'assignPassword').resolves();
    }
    stubMethod($$.SANDBOX, GlobalInfo, 'getInstance').resolves({
      aliases: { resolveUsername: (arg: string) => (arg === 'testUser1@test.com' ? 'testAlias' : arg) },
    });
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
      expect(authInfoStub.update.callCount).to.equal(2);
      expect(queryStub.callCount).to.equal(2);
    });

  test
    .do(() => prepareStubs())
    .stdout()
    .command(['force:user:password:generate', '--json'])
    .it('should generate a new password for the default user', (ctx) => {
      const expected = { username: 'defaultusername@test.com', password: 'abc' };
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
      expect(authInfoStub.update.callCount).to.equal(1);
      expect(queryStub.callCount).to.equal(1);
    });

  test
    .do(() => prepareStubs(false, false))
    .stdout()
    .command(['force:user:password:generate', '--json', '-u', 'testUser2@test.com', '-l', '12'])
    .it('should generate a new passsword of length 12', (ctx) => {
      const result = JSON.parse(ctx.stdout).result;
      expect(result.password.length).to.deep.equal(12);
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
      expect(authInfoStub.update.callCount).to.equal(0);
      expect(queryStub.callCount).to.equal(1);
    });
});
