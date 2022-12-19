/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable  @typescript-eslint/ban-ts-comment */

import * as fs from 'fs';
import { AuthInfo, Connection, DefaultUserFields, Logger, User, Org } from '@salesforce/core';
import { Config } from '@oclif/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { expect } from 'chai';
import UserCreateCommand from '../../src/commands/user/create';

const username = 'defaultusername@test.com';
const originalUserId = '0052D0000043PawWWR';
const newUserId = '0052D0000044PawWWR';

describe('user:create', () => {
  const $$ = new TestContext();

  const testOrg = new MockTestOrgData();
  const devHub = new MockTestOrgData();
  const newUser = new MockTestOrgData();
  devHub.username = 'mydevhub.org';
  devHub.aliases = ['mydevhub'];
  devHub.devHubUsername = 'mydevhub.org';
  devHub.isDevHub = true;

  it('will properly merge fields regardless of capitalization', async () => {
    // notice the varied capitalization
    $$.SANDBOX.stub(fs.promises, 'readFile').resolves(
      JSON.stringify({
        id: originalUserId,
        Username: '1605130295132_test-j6asqt5qoprs@example.com',
        Alias: 'testAlias',
        Email: username,
        EmailEncodingKey: 'UTF-8',
        LanguageLocaleKey: 'en_US',
        localeSidKey: 'en_US',
        ProfileId: '00e2D000000bNexWWR',
        LastName: 'User',
        timeZoneSidKey: 'America/Los_Angeles',
        permsets: ['permset1', 'permset2'],
      })
    );

    const createCommand = new UserCreateCommand(['-f', 'userConfig.json'], {} as Config);

    // @ts-ignore
    createCommand.flags = { 'definition-file': 'testing' };

    // @ts-ignore private method
    const res = await createCommand.aggregateFields({
      id: '00555000006lCspAAE',
      emailEncodingKey: 'UTF-8',
      languageLocaleKey: 'en_US',
      localeSidKey: 'en_US',
      profileId: '00e55000000fvDdAAI',
      lastName: 'User',
      timeZoneSidKey: 'America/Los_Angeles',
    });
    expect(res).to.deep.equal({
      alias: 'testAlias',
      email: 'defaultusername@test.com',
      emailEncodingKey: 'UTF-8',
      id: '0052D0000043PawWWR',
      languageLocaleKey: 'en_US',
      lastName: 'User',
      permsets: ['permset1', 'permset2'],
      localeSidKey: 'en_US',
      profileId: '00e2D000000bNexWWR',
      timeZoneSidKey: 'America/Los_Angeles',
      username: '1605130295132_test-j6asqt5qoprs@example.com',
    });
  });

  async function prepareStubs(throws: { license?: boolean; duplicate?: boolean } = {}, readsFile?) {
    await $$.stubAuths(testOrg, devHub);
    $$.stubUsers({ [testOrg.username]: [] });
    await $$.stubConfig({ 'target-dev-hub': devHub.username, 'target-org': testOrg.username });
    $$.stubAliases({ testAlias: '1605130295132_test-j6asqt5qoprs@example.com' });

    const userInfo = {
      id: newUserId,
      username: '1605130295132_test-j6asqt5qoprs@example.com',
      alias: 'testAlias',
      email: username,
      emailEncodingKey: 'UTF-8',
      languageLocaleKey: 'en_US',
      localeSidKey: 'en_US',
      profileId: '00e2D000000bNexWWR',
      profileName: 'profileFromArgs',
      lastName: 'User',
      timeZoneSidKey: 'America/Los_Angeles',
    };
    // @ts-ignore
    $$.SANDBOX.stub(DefaultUserFields, 'create').callsFake(() => {
      const defaultFields = new DefaultUserFields({ templateUser: userInfo.username });
      // @ts-ignore
      defaultFields.userFields = userInfo;
      return Promise.resolve(defaultFields);
    });
    $$.SANDBOX.stub(AuthInfo.prototype, 'getFields').returns({
      userId: newUserId,
      username: '1605130295132_test-j6asqt5qoprs@example.com',
      alias: 'testAlias',
    });
    $$.SANDBOX.stub(Org.prototype, 'getOrgId').returns(testOrg.orgId);

    if (throws.license) {
      $$.SANDBOX.stub(User.prototype, 'createUser').throws(new Error('LICENSE_LIMIT_EXCEEDED'));
      $$.SANDBOXES.CONNECTION.stub(Connection.prototype, 'query').resolves({
        records: [{ Name: 'testName' }],
        done: true,
        totalSize: 1,
      });
    } else if (throws.duplicate) {
      $$.SANDBOX.stub(User.prototype, 'createUser').throws(new Error('DUPLICATE_USERNAME'));
    } else {
      $$.SANDBOX.stub(User.prototype, 'createUser').callsFake(async (): Promise<AuthInfo> => {
        const authInfo = await AuthInfo.create({ username: newUser.username });
        newUser.orgId = (await Org.create({ aliasOrUsername: testOrg.username })).getOrgId();
        return authInfo.save(newUser);
      });
    }

    if (readsFile) {
      $$.SANDBOXES.CONNECTION.stub(Connection.prototype, 'query').resolves({
        records: [{ Id: '12345678' }],
        done: true,
        totalSize: 1,
      });
      $$.SANDBOX.stub(Logger.prototype, 'debug');
    }
  }

  it('will handle a merge multiple permsets and profilenames from args and file (permsets from args)', async () => {
    await prepareStubs({}, { profilename: 'profileFromFile', permsets: ['perm1', 'perm2'] });
    $$.SANDBOX.stub(User.prototype, 'assignPassword').resolves();
    const expected = {
      orgId: testOrg.orgId,
      permissionSetAssignments: ['permCLI', 'permCLI2'],
      fields: {
        alias: 'testAlias',
        email: 'defaultusername@test.com',
        emailencodingkey: 'UTF-8',
        id: newUserId,
        languagelocalekey: 'en_US',
        lastname: 'User',
        localesidkey: 'en_US',
        generatepassword: true,
        profileid: '12345678',
        profilename: 'profileFromArgs',
        timezonesidkey: 'America/Los_Angeles',
        username: '1605130295132_test-j6asqt5qoprs@example.com',
      },
    };
    const createCommand = new UserCreateCommand(
      [
        '--json',
        '--target-org',
        testOrg.username,
        '--target-dev-hub',
        'devhub@test.com',
        "permsets='permCLI, permCLI2'",
        'generatepassword=true',
      ],
      {} as Config
    );
    const result = await createCommand.run();
    expect(result).to.deep.equal(expected);
  });

  // test
  //   .do(async () => {
  //     await prepareStubs({}, {permsets: ['perm1', 'perm2']});
  //   })
  //   .stdout()
  //   .command([
  //     'user:create',
  //     '--json',
  //     '--targetusername',
  //     'testUser1@test.com',
  //     '--targetdevhubusername',
  //     'devhub@test.com',
  //     '--definitionfile',
  //     'tempfile.json',
  //     'profilename=profileFromArgs',
  //     'username=user@cliArgs.com',
  //   ])
  //   .it('will handle a merge multiple permsets and profilenames from args and file (permsets from file)', (ctx) => {
  //     const expected = {
  //       orgId: 'abc123',
  //       permissionSetAssignments: ['perm1', 'perm2'],
  //       fields: {
  //         alias: 'testAlias',
  //         email: 'defaultusername@test.com',
  //         emailencodingkey: 'UTF-8',
  //         id: newUserId,
  //         languagelocalekey: 'en_US',
  //         lastname: 'User',
  //         localesidkey: 'en_US',
  //         profileid: '12345678',
  //         profilename: 'profileFromArgs',
  //         timezonesidkey: 'America/Los_Angeles',
  //         username: 'user@cliArgs.com',
  //       },
  //     };
  //     const result = JSON.parse(ctx.stdout).result;
  //     expect(result).to.deep.equal(expected);
  //   });
  //
  // test
  //   .do(async () => {
  //     await prepareStubs({}, false);
  //   })
  //   .stdout()
  //   .command([
  //     'user:create',
  //     '--json',
  //     '--targetusername',
  //     'testUser1@test.com',
  //     '--targetdevhubusername',
  //     'devhub@test.com',
  //   ])
  //   .it('default create creates user exactly from DefaultUserFields', (ctx) => {
  //     const expected = {
  //       orgId: 'abc123',
  //       permissionSetAssignments: [],
  //       fields: {
  //         alias: 'testAlias',
  //         email: username,
  //         emailencodingkey: 'UTF-8',
  //         id: newUserId,
  //         languagelocalekey: 'en_US',
  //         lastname: 'User',
  //         localesidkey: 'en_US',
  //         profileid: '00e2D000000bNexWWR',
  //         timezonesidkey: 'America/Los_Angeles',
  //         username: '1605130295132_test-j6asqt5qoprs@example.com',
  //       },
  //     };
  //     const result = JSON.parse(ctx.stdout).result;
  //     expect(result).to.deep.equal(expected);
  //   });
  //
  // test
  //   .do(async () => {
  //     await prepareStubs({}, {generatepassword: true, permsets: ['test1', 'test2']});
  //   })
  //   .stdout()
  //   .command([
  //     'user:create',
  //     '--json',
  //     '--definitionfile',
  //     'parent/child/file.json',
  //     '--targetusername',
  //     'testUser1@test.com',
  //     '--targetdevhubusername',
  //     'devhub@test.com',
  //     'email=me@my.org',
  //     'generatepassword=false',
  //   ])
  //   // we set generatepassword=false in the varargs, in the definitionfile we have generatepassword=true, so we SHOULD NOT generate a password
  //   .it('will merge fields from the cli args, and the definitionfile correctly, preferring cli args', (ctx) => {
  //     const expected = {
  //       orgId: 'abc123',
  //       permissionSetAssignments: ['test1', 'test2'],
  //       fields: {
  //         alias: 'testAlias',
  //         email: 'me@my.org',
  //         emailencodingkey: 'UTF-8',
  //         id: newUserId,
  //         languagelocalekey: 'en_US',
  //         lastname: 'User',
  //         localesidkey: 'en_US',
  //         profileid: '00e2D000000bNexWWR',
  //         generatepassword: false,
  //         timezonesidkey: 'America/Los_Angeles',
  //         username: '1605130295132_test-j6asqt5qoprs@example.com',
  //       },
  //     };
  //     const result = JSON.parse(ctx.stdout).result;
  //     expect(result).to.deep.equal(expected);
  //   });
  //
  // test
  //   .do(async () => {
  //     await prepareStubs({}, {generatepassword: true, profilename: 'System Administrator'});
  //   })
  //   .stdout()
  //   .command([
  //     'user:create',
  //     '--json',
  //     '--definitionfile',
  //     'parent/child/file.json',
  //     '--targetusername',
  //     'testUser1@test.com',
  //     '--targetdevhubusername',
  //     'devhub@test.com',
  //     'email=me@my.org',
  //     'generatepassword=false',
  //     "profilename='Chatter Free User'",
  //   ])
  //   // we set generatepassword=false in the varargs, in the definitionfile we have generatepassword=true, so we SHOULD NOT generate a password
  //   // we should override the profilename with 'Chatter Free User'
  //   .it(
  //     'will merge fields from the cli args, and the definitionfile correctly, preferring cli args, cli args > file > default',
  //     (ctx) => {
  //       const expected = {
  //         orgId: 'abc123',
  //         permissionSetAssignments: [],
  //         fields: {
  //           alias: 'testAlias',
  //           email: 'me@my.org',
  //           emailencodingkey: 'UTF-8',
  //           id: newUserId,
  //           languagelocalekey: 'en_US',
  //           lastname: 'User',
  //           localesidkey: 'en_US',
  //           generatepassword: false,
  //           profilename: "'Chatter Free User'",
  //           // note the new profileid 12345678 -> Chatter Free User from var args
  //           profileid: '12345678',
  //           timezonesidkey: 'America/Los_Angeles',
  //           username: '1605130295132_test-j6asqt5qoprs@example.com',
  //         },
  //       };
  //       const result = JSON.parse(ctx.stdout).result;
  //       expect(result).to.deep.equal(expected);
  //     }
  //   );
  //
  // test
  //   .do(async () => {
  //     await prepareStubs({license: true}, false);
  //   })
  //   .stdout()
  //   .command([
  //     'user:create',
  //     '--json',
  //     '--targetusername',
  //     'testUser1@test.com',
  //     '--targetdevhubusername',
  //     'devhub@test.com',
  //   ])
  //   .it('will handle a failed `createUser` call with a licenseLimitExceeded error', (ctx) => {
  //     const result = JSON.parse(ctx.stdout);
  //     expect(result.status).to.equal(1);
  //     expect(result.message).to.equal('There are no available user licenses for the user profile "testName".');
  //     expect(result.name).to.equal('licenseLimitExceeded');
  //   });
  //
  // test
  //   .do(async () => {
  //     await prepareStubs({duplicate: true}, false);
  //   })
  //   .stdout()
  //   .command([
  //     'user:create',
  //     '--json',
  //     '--targetusername',
  //     'testUser1@test.com',
  //     '--targetdevhubusername',
  //     'devhub@test.com',
  //   ])
  //   .it('will handle a failed `createUser` call with a DuplicateUsername error', (ctx) => {
  //     const result = JSON.parse(ctx.stdout);
  //     expect(result.status).to.equal(1);
  //     expect(result.name).to.equal('duplicateUsername');
  //     expect(result.message).to.equal(
  //       'The username "1605130295132_test-j6asqt5qoprs@example.com" already exists in this or another Salesforce org. Usernames must be unique across all Salesforce orgs.'
  //     );
  //   });
  //
  // test
  //   .do(async () => {
  //     await prepareStubs({}, false);
  //   })
  //   .stdout()
  //   .command([
  //     'user:create',
  //     '--json',
  //     '--targetusername',
  //     'testUser1@test.com',
  //     '--targetdevhubusername',
  //     'devhub@test.com',
  //     'username=user@cliFlag.com',
  //     '--setuniqueusername',
  //   ])
  //   .it('will append the org id to the passed username if the setuniqueusername is used', (ctx) => {
  //     const expected = {
  //       orgId: 'abc123',
  //       permissionSetAssignments: [],
  //       fields: {
  //         alias: 'testAlias',
  //         email: 'defaultusername@test.com',
  //         emailencodingkey: 'UTF-8',
  //         id: newUserId,
  //         languagelocalekey: 'en_US',
  //         lastname: 'User',
  //         localesidkey: 'en_US',
  //         profileid: '00e2D000000bNexWWR',
  //         timezonesidkey: 'America/Los_Angeles',
  //         username: 'user@cliFlag.com.abc123',
  //       },
  //     };
  //     const result = JSON.parse(ctx.stdout).result;
  //     expect(result).to.deep.equal(expected);
  //   });
  //
  // test
  //   .do(async () => {
  //     await prepareStubs({}, false);
  //   })
  //   .stdout()
  //   .command([
  //     'user:create',
  //     '--json',
  //     '--targetusername',
  //     'testUser1@test.com',
  //     '--targetdevhubusername',
  //     'devhub@test.com',
  //     '--setuniqueusername',
  //   ])
  //   .it(
  //     'will not append the org id to the username if the setuniqueusername is used but username was generated by the CLI',
  //     (ctx) => {
  //       const expected = {
  //         orgId: 'abc123',
  //         permissionSetAssignments: [],
  //         fields: {
  //           alias: 'testAlias',
  //           email: 'defaultusername@test.com',
  //           emailencodingkey: 'UTF-8',
  //           id: newUserId,
  //           languagelocalekey: 'en_US',
  //           lastname: 'User',
  //           localesidkey: 'en_US',
  //           profileid: '00e2D000000bNexWWR',
  //           timezonesidkey: 'America/Los_Angeles',
  //           username: '1605130295132_test-j6asqt5qoprs@example.com',
  //         },
  //       };
  //       const result = JSON.parse(ctx.stdout).result;
  //       expect(result).to.deep.equal(expected);
  //     }
  //   );
});
