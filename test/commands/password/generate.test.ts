/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, Messages, User } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup.js';
import { SecureBuffer } from '@salesforce/core/lib/crypto/secureBuffer.js';
import { assert, expect } from 'chai';
import { Config } from '@oclif/core';
import { PasswordData, GenerateUserPasswordCommand } from '../../../src/commands/org/generate/password.js';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

describe('org:generate:password', () => {
  const $$ = new TestContext();

  class GenerateUserPasswordCommandTest extends GenerateUserPasswordCommand {
    public constructor(argv: string[], config: Config) {
      super(argv, config);
    }

    public async run(): Promise<PasswordData | PasswordData[]> {
      return super.run();
    }
  }

  const testOrg = new MockTestOrgData();
  const devHub = new MockTestOrgData();
  devHub.username = 'mydevhub.org';
  devHub.devHubUsername = 'mydevhub.org';
  devHub.isDevHub = true;
  let queryStub: sinon.SinonStub;

  async function prepareStubs(throws = false, generatePassword = true) {
    await $$.stubAuths(testOrg, devHub);
    await $$.stubConfig({ 'target-dev-hub': devHub.username, 'target-org': testOrg.username });
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
    const passwordGenerate = new GenerateUserPasswordCommandTest(
      ['--target-org', testOrg.username, '--json', '--on-behalf-of', 'testUser1@test.com', 'testUser2@test.com'],
      {} as Config
    );
    const result = await passwordGenerate.run();
    expect(result).to.deep.equal(expected);
    expect(queryStub.callCount).to.equal(2);
  });
  it('should generate a new password for the default user', async () => {
    await prepareStubs();
    const expected = { username: testOrg.username, password: 'abc' };
    const passwordGenerate = new GenerateUserPasswordCommandTest(['--json'], {} as Config);
    const result = await passwordGenerate.run();
    expect(result).to.deep.equal(expected);
    expect(queryStub.callCount).to.equal(1);
  });
  it('should generate a new passsword of length 12', async () => {
    await prepareStubs(false, false);
    const passwordGenerate = new GenerateUserPasswordCommandTest(
      ['--target-org', testOrg.username, '-l', '12', '--json'],
      {} as Config
    );
    const result = (await passwordGenerate.run()) as PasswordData;
    expect(result.password.length).to.equal(12);
  });
  it('should throw the correct error with warning message', async () => {
    await prepareStubs(true);
    const passwordGenerate = new GenerateUserPasswordCommandTest(['--json'], {} as Config);
    try {
      await passwordGenerate.run();
      expect.fail('should have thrown an error');
    } catch (result) {
      assert(result instanceof Error);
      expect(result.message).to.equal(messages.getMessage('noSelfSetError'));
      expect(result.name).to.equal('NoSelfSetError');
    }
  });
});
