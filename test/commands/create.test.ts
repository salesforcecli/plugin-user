/*
 * Copyright 2026, Salesforce, Inc.
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

/* eslint-disable  @typescript-eslint/ban-ts-comment */

import fs from 'node:fs';
import { AuthInfo, Connection, DefaultUserFields, Logger, Org, User } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { assert, JsonMap } from '@salesforce/ts-types';
import { Config } from '@oclif/core';
import CreateUserCommand from '../../src/commands/org/create/user.js';

const username = 'defaultusername@test.com';
const originalUserId = '0052D0000043PawWWR';
const newUserId = '0052D0000044PawWWR';

const createdOrgInstanceMissing = 'MISSING';

describe('org:create:user', () => {
  const $$ = new TestContext();

  const testOrg = new MockTestOrgData();
  testOrg.isScratchOrg = true;
  const newUser = new MockTestOrgData();

  it('will properly merge fields regardless of capitalization', async () => {
    // notice the varied capitalization
    $$.SANDBOX.stub(fs.promises, 'readFile')
      .withArgs('testing')
      .resolves(
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

    const createCommand = new CreateUserCommand(['-f', 'userConfig.json'], {
      runHook: () => ({ successes: [], failures: [] }),
    } as unknown as Config);

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

  async function prepareStubs(
    throws: {
      license?: boolean;
      duplicate?: boolean;
      nonScratch?: boolean;
      isJWT?: boolean;
      createdOrgInstance?: string;
    } = {},
    readsFile?: JsonMap | boolean
  ) {
    await $$.stubAuths(testOrg);
    $$.stubUsers({ [testOrg.username]: [] });
    await $$.stubConfig({ 'target-org': testOrg.username });
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
    $$.SANDBOX.stub(AuthInfo.prototype, 'isJwt').returns(throws.isJWT ? true : false);

    $$.SANDBOX.stub(Org.prototype, 'getOrgId').returns(testOrg.orgId);
    $$.SANDBOX.stub(Org.prototype, 'getField')
      .withArgs(Org.Fields.CREATED_ORG_INSTANCE)
      .returns(
        throws.createdOrgInstance === createdOrgInstanceMissing ? undefined : throws.createdOrgInstance ?? testOrg.orgId
      );
    $$.SANDBOX.stub(Org.prototype, 'determineIfScratch').resolves(throws.nonScratch ? false : true);

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
      $$.SANDBOXES.CONNECTION.stub(Connection.prototype, 'singleRecordQuery').resolves({ Id: '12345678' });
      $$.SANDBOX.stub(Logger.prototype, 'debug');
      if (typeof readsFile !== 'boolean') {
        const fsStub = $$.SANDBOX.stub(fs.promises, 'readFile');
        fsStub.withArgs('parent/child/file.json').resolves(JSON.stringify(readsFile));
        fsStub.callThrough();
      }
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
        profilename: 'profileFromFile',
        timezonesidkey: 'America/Los_Angeles',
        username: '1605130295132_test-j6asqt5qoprs@example.com',
      },
    };
    const result = await CreateUserCommand.run([
      '--json',
      '--target-org',
      testOrg.username,
      '--definition-file',
      'parent/child/file.json',
      "permsets='permCLI, permCLI2'",
      'generatepassword=true',
    ]);
    expect(result).to.deep.equal(expected);
  });

  it('default create creates user exactly from DefaultUserFields', async () => {
    await prepareStubs({}, true);
    const expected = {
      orgId: testOrg.orgId,
      permissionSetAssignments: [],
      fields: {
        alias: 'testAlias',
        email: username,
        emailencodingkey: 'UTF-8',
        id: newUserId,
        languagelocalekey: 'en_US',
        lastname: 'User',
        localesidkey: 'en_US',
        profileid: '12345678',
        profilename: 'profileFromArgs',
        timezonesidkey: 'America/Los_Angeles',
        username: '1605130295132_test-j6asqt5qoprs@example.com',
      },
    };
    const result = await CreateUserCommand.run(['--json', '--target-org', testOrg.username]);
    expect(result).to.deep.equal(expected);
  });

  it('will merge fields from the cli args, and the definitionfile correctly, preferring cli args', async () => {
    await prepareStubs({}, { generatepassword: true, permsets: ['test1', 'test2'] });
    const expected = {
      orgId: testOrg.orgId,
      permissionSetAssignments: ['test1', 'test2'],
      fields: {
        alias: 'testAlias',
        email: 'me@my.org',
        emailencodingkey: 'UTF-8',
        id: newUserId,
        languagelocalekey: 'en_US',
        lastname: 'User',
        localesidkey: 'en_US',
        profileid: '12345678',
        profilename: 'profileFromArgs',
        generatepassword: false,
        timezonesidkey: 'America/Los_Angeles',
        username: '1605130295132_test-j6asqt5qoprs@example.com',
      },
    };
    const result = await CreateUserCommand.run([
      '--json',
      '--target-org',
      testOrg.username,
      '--definition-file',
      'parent/child/file.json',
      'email=me@my.org',
      'generatepassword=false',
    ]);

    expect(result).to.deep.equal(expected);
  });

  it('will append the org id to the passed username if the setuniqueusername is used', async () => {
    await prepareStubs({}, true);
    const expected = {
      orgId: testOrg.orgId,
      permissionSetAssignments: [],
      fields: {
        alias: 'testAlias',
        email: 'defaultusername@test.com',
        emailencodingkey: 'UTF-8',
        id: newUserId,
        languagelocalekey: 'en_US',
        lastname: 'User',
        localesidkey: 'en_US',
        profileid: '12345678',
        profilename: 'profileFromArgs',
        timezonesidkey: 'America/Los_Angeles',
        username: `user@cliFlag.com.${testOrg.orgId}`,
      },
    };
    const result = await CreateUserCommand.run([
      '--json',
      '--target-org',
      testOrg.username,
      'username=user@cliFlag.com',
      '--setuniqueusername',
    ]);

    expect(result).to.deep.equal(expected);
  });

  it('will not append the org id to the username if the setuniqueusername is used but username was generated by the CLI', async () => {
    await prepareStubs({}, true);
    const expected = {
      orgId: testOrg.orgId,
      permissionSetAssignments: [],
      fields: {
        alias: 'testAlias',
        email: 'defaultusername@test.com',
        emailencodingkey: 'UTF-8',
        id: newUserId,
        languagelocalekey: 'en_US',
        lastname: 'User',
        localesidkey: 'en_US',
        profileid: '12345678',
        profilename: 'profileFromArgs',
        timezonesidkey: 'America/Los_Angeles',
        username: '1605130295132_test-j6asqt5qoprs@example.com',
      },
    };
    const result = await CreateUserCommand.run(['--json', '--target-org', testOrg.username, '--setuniqueusername']);

    expect(result).to.deep.equal(expected);
  });

  describe('valid hyperforce/jwt combos', () => {
    it('works on hyperforce if non-JWT', async () => {
      await prepareStubs({ createdOrgInstance: 'USA100S' }, true);
      const expected = {
        orgId: testOrg.orgId,
        permissionSetAssignments: [],
        fields: {
          alias: 'testAlias',
          email: username,
          emailencodingkey: 'UTF-8',
          id: newUserId,
          languagelocalekey: 'en_US',
          lastname: 'User',
          localesidkey: 'en_US',
          profileid: '12345678',
          profilename: 'profileFromArgs',
          timezonesidkey: 'America/Los_Angeles',
          username: '1605130295132_test-j6asqt5qoprs@example.com',
        },
      };
      const result = await CreateUserCommand.run(['--json', '--target-org', testOrg.username]);
      expect(result).to.deep.equal(expected);
    });

    it('works if JWT but not hyperforce', async () => {
      await prepareStubs({ isJWT: true }, true);
      const expected = {
        orgId: testOrg.orgId,
        permissionSetAssignments: [],
        fields: {
          alias: 'testAlias',
          email: username,
          emailencodingkey: 'UTF-8',
          id: newUserId,
          languagelocalekey: 'en_US',
          lastname: 'User',
          localesidkey: 'en_US',
          profileid: '12345678',
          profilename: 'profileFromArgs',
          timezonesidkey: 'America/Los_Angeles',
          username: '1605130295132_test-j6asqt5qoprs@example.com',
        },
      };
      const result = await CreateUserCommand.run(['--json', '--target-org', testOrg.username]);
      expect(result).to.deep.equal(expected);
    });

    it('works if JWT but missing createdOrgInstance auth field', async () => {
      await prepareStubs({ isJWT: true, createdOrgInstance: createdOrgInstanceMissing }, true);
      const expected = {
        orgId: testOrg.orgId,
        permissionSetAssignments: [],
        fields: {
          alias: 'testAlias',
          email: username,
          emailencodingkey: 'UTF-8',
          id: newUserId,
          languagelocalekey: 'en_US',
          lastname: 'User',
          localesidkey: 'en_US',
          profileid: '12345678',
          profilename: 'profileFromArgs',
          timezonesidkey: 'America/Los_Angeles',
          username: '1605130295132_test-j6asqt5qoprs@example.com',
        },
      };
      const result = await CreateUserCommand.run(['--json', '--target-org', testOrg.username]);
      expect(result).to.deep.equal(expected);
    });
  });

  describe('exceptions', () => {
    it('throws if org is not a scratchOrg', async () => {
      await prepareStubs({ nonScratch: true }, false);
      try {
        await CreateUserCommand.run(['--json', '--target-org', testOrg.username]);
        expect.fail('should have thrown an error');
      } catch (e) {
        assert(e instanceof Error);
        expect(e.name).to.equal('NonScratchOrgError');
      }
    });

    it('throws if JWT and hyperforce', async () => {
      await prepareStubs({ isJWT: true, createdOrgInstance: 'USA100S' }, false);
      try {
        await CreateUserCommand.run(['--json', '--target-org', testOrg.username]);
        expect.fail('should have thrown an error');
      } catch (e) {
        assert(e instanceof Error);
        expect(e.name).to.equal('JwtHyperforceError');
      }
    });

    it('will handle a failed `createUser` call with a licenseLimitExceeded error', async () => {
      await prepareStubs({ license: true }, false);
      try {
        await CreateUserCommand.run(['--json', '--target-org', testOrg.username]);
        expect.fail('should have thrown an error');
      } catch (e) {
        assert(e instanceof Error);
        expect(e.message).to.equal('There are no available user licenses for the user profile "testName".');
        expect(e.name).to.equal('licenseLimitExceeded');
      }
    });

    it('will handle a failed `createUser` call with a DuplicateUsername error', async () => {
      await prepareStubs({ duplicate: true }, true);
      try {
        await CreateUserCommand.run(['--json', '--target-org', testOrg.username]);
        expect.fail('should have thrown an error');
      } catch (e) {
        assert(e instanceof Error);
        expect(e.name).to.equal('duplicateUsername');
        expect(e.message).to.equal(
          'The username "1605130295132_test-j6asqt5qoprs@example.com" already exists in this or another Salesforce org. Usernames must be unique across all Salesforce orgs. Try using the --set-unique-username flag to force a unique username by appending the org ID.'
        );
      }
    });
  });
});
