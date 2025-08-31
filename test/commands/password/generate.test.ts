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

import { Connection, Messages, User } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { assert, expect } from 'chai';
// dirty import to stub something we don't want to export from sfdx-core
import { SecureBuffer } from '../../../node_modules/@salesforce/core/lib/crypto/secureBuffer.js';
import { PasswordData, GenerateUserPasswordCommand } from '../../../src/commands/org/generate/password.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

describe('org:generate:password', () => {
  const $$ = new TestContext();

  const testOrg = new MockTestOrgData();
  let queryStub: sinon.SinonStub;

  async function prepareStubs(throws = false, generatePassword = true) {
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });
    queryStub = $$.SANDBOXES.CONNECTION.stub(Connection.prototype, 'singleRecordQuery').resolves({
      Id: '0052D0000043PawWWR',
    });
    $$.SANDBOX.stub(Connection.prototype, 'getApiVersion').returns('51.0');
    if (generatePassword) {
      const secureBuffer: SecureBuffer<void> = new SecureBuffer<void>();
      secureBuffer.consume(Buffer.from('abc', 'utf8'));
      $$.SANDBOX.stub(User, 'generatePasswordUtf8').returns(secureBuffer);
    }

    if (throws) {
      $$.SANDBOX.stub(User.prototype, 'assignPassword').throws(new Error('Cannot set password for self'));
    } else {
      $$.SANDBOX.stub(User.prototype, 'assignPassword').resolves();
    }

    $$.stubAliases({ testAlias: 'testUser1@test.com' });
  }

  it('should generate a new password for the user', async () => {
    await prepareStubs();
    const expected = [
      {
        username: 'testUser1@test.com',
        password: 'abc',
      },
      {
        username: 'testUser2@test.com',
        password: 'abc',
      },
    ];

    const result = await GenerateUserPasswordCommand.run([
      '--target-org',
      testOrg.username,
      '--json',
      '--on-behalf-of',
      'testUser1@test.com',
      'testUser2@test.com',
    ]);
    expect(result).to.deep.equal(expected);
    expect(queryStub.callCount).to.equal(2);
  });
  it('should generate a new password for the default user', async () => {
    await prepareStubs();
    const expected = { username: testOrg.username, password: 'abc' };
    const result = await GenerateUserPasswordCommand.run(['--json']);
    expect(result).to.deep.equal(expected);
    expect(queryStub.callCount).to.equal(1);
  });
  it('should generate a new passsword of length 12', async () => {
    await prepareStubs(false, false);
    const result = (await GenerateUserPasswordCommand.run([
      '--target-org',
      testOrg.username,
      '-l',
      '12',
      '--json',
    ])) as PasswordData;
    expect(result.password.length).to.equal(12);
  });
  it('should throw the correct error with warning message', async () => {
    await prepareStubs(true);
    try {
      await GenerateUserPasswordCommand.run(['--json']);
      expect.fail('should have thrown an error');
    } catch (result) {
      assert(result instanceof Error);
      expect(result.message).to.equal(messages.getMessage('noSelfSetError'));
      expect(result.name).to.equal('NoSelfSetError');
    }
  });
});
