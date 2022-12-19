/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, Messages, Org, User } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { SecureBuffer } from '@salesforce/core/lib/crypto/secureBuffer';
import { expect } from 'chai';
import { Config } from '@oclif/core';
import { PasswordData, UserPasswordGenerateCommand } from '../../../../src/commands/user/password/generate';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

describe('user:password:generate', () => {
  const $$ = new TestContext();

  class UserPasswordGenerateCommandTest extends UserPasswordGenerateCommand {
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
    $$.SANDBOXES.ORGS.stub(Org.prototype, 'retrieveMaxApiVersion').resolves('51.0');
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
    const passwordGenerate = new UserPasswordGenerateCommandTest(
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
    const passwordGenerate = new UserPasswordGenerateCommandTest(['--json'], {} as Config);
    const result = await passwordGenerate.run();
    expect(result).to.deep.equal(expected);
    expect(queryStub.callCount).to.equal(1);
  });
  it('should generate a new passsword of length 12', async () => {
    await prepareStubs(false, false);
    const passwordGenerate = new UserPasswordGenerateCommandTest(
      ['--target-org', testOrg.username, '-l', '12', '--json'],
      {} as Config
    );
    const result = (await passwordGenerate.run()) as PasswordData;
    expect(result.password.length).to.equal(12);
  });
  it('should throw the correct error with warning message', async () => {
    await prepareStubs(true);
    const passwordGenerate = new UserPasswordGenerateCommandTest(['--json'], {} as Config);
    try {
      await passwordGenerate.run();
      expect.fail('should have thrown an error');
    } catch (result) {
      expect(result.message).to.equal(messages.getMessage('noSelfSetError'));
      expect(result.name).to.equal('NoSelfSetError');
    }
  });
});
// describe('user:password:generate', () => {
//   let authInfoStub: StubbedType<AuthInfo>;
//   const testData = new MockTestOrgData();
//   let queryStub: sinon.SinonStub;
//
//   async function prepareStubs(throws = false, generatePassword = true) {
//     const authFields = await testData.getConfig();
//     authInfoStub = stubInterface<AuthInfo>($$.SANDBOX, {getFields: () => authFields});
//     stubMethod($$.SANDBOX, AuthInfo, 'create').callsFake(async () => authInfoStub);
//     stubMethod($$.SANDBOX, Connection, 'create').callsFake(async () => Connection.prototype);
//     stubMethod($$.SANDBOX, Org, 'create').callsFake(async () => Org.prototype);
//     stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns('defaultusername@test.com');
//     stubMethod($$.SANDBOX, Org.prototype, 'retrieveMaxApiVersion').returns('51.0');
//     stubMethod($$.SANDBOX, User, 'create').callsFake(async () => User.prototype);
//     queryStub = stubMethod($$.SANDBOX, Connection.prototype, 'singleRecordQuery').resolves({
//       Id: '0052D0000043PawWWR',
//     });
//
//     if (generatePassword) {
//       const secureBuffer: SecureBuffer<void> = new SecureBuffer<void>();
//       secureBuffer.consume(Buffer.from('abc', 'utf8'));
//       stubMethod($$.SANDBOX, User, 'generatePasswordUtf8').returns(secureBuffer);
//     }
//
//     if (throws) {
//       stubMethod($$.SANDBOX, User.prototype, 'assignPassword').throws(new Error('Cannot set password for self'));
//     } else {
//       stubMethod($$.SANDBOX, User.prototype, 'assignPassword').resolves();
//     }
//
//     $$.stubAliases({testAlias: 'testUser1@test.com'});
//   }
//
//   test
//     .do(async () => {
//       await prepareStubs();
//     })
//     .stdout()
//     .command(['user:password:generate', '--json', '--onbehalfof', 'testUser1@test.com, testUser2@test.com'])
//     .it('should generate a new password for the user', (ctx) => {
//       const expected = [
//         {
//           username: 'testUser1@test.com',
//           password: 'abc',
//         },
//         {
//           username: 'testUser2@test.com',
//           password: 'abc',
//         },
//       ];
//       const result = JSON.parse(ctx.stdout).result;
//       expect(result).to.deep.equal(expected);
//       expect(authInfoStub.update.callCount).to.equal(2);
//       expect(queryStub.callCount).to.equal(2);
//     });
//
//   test
//     .do(() => prepareStubs())
//     .stdout()
//     .command(['user:password:generate', '--json'])
//     .it('should generate a new password for the default user', (ctx) => {
//       const expected = {username: 'defaultusername@test.com', password: 'abc'};
//       const result = JSON.parse(ctx.stdout).result;
//       expect(result).to.deep.equal(expected);
//       expect(authInfoStub.update.callCount).to.equal(1);
//       expect(queryStub.callCount).to.equal(1);
//     });
//
//   test
//     .do(() => prepareStubs(false, false))
//     .stdout()
//     .command(['user:password:generate', '--json', '-u', 'testUser2@test.com', '-l', '12'])
//     .it('should generate a new passsword of length 12', (ctx) => {
//       const result = JSON.parse(ctx.stdout).result;
//       expect(result.password.length).to.deep.equal(12);
//     });
//
//   test
//     .do(async () => prepareStubs(true))
//
//     .stdout()
//     .command(['user:password:generate', '--json'])
//     .it('should throw the correct error with warning message', (ctx) => {
//       const result = JSON.parse(ctx.stdout);
//       expect(result.message).to.equal(messages.getMessage('noSelfSetError'));
//       expect(result.status).to.equal(1);
//       expect(result.name).to.equal('noSelfSetError');
//       expect(authInfoStub.update.callCount).to.equal(0);
//       expect(queryStub.callCount).to.equal(1);
//     });
// });
