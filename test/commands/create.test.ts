/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable  @typescript-eslint/ban-ts-comment */

import * as fs from 'fs';
import { AuthInfo, Connection, DefaultUserFields, Logger, Org, User } from '@salesforce/core';
import { Config } from '@oclif/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { expect } from 'chai';
import { assert, JsonMap } from '@salesforce/ts-types';
import CreateUserCommand from '../../src/commands/org/create/user';

const username = 'defaultusername@test.com';
const originalUserId = '0052D0000043PawWWR';
const newUserId = '0052D0000044PawWWR';

describe('org:create:user', () => {
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

    const createCommand = new CreateUserCommand(['-f', 'userConfig.json'], {} as Config);

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

  async function prepareStubs(throws: { license?: boolean; duplicate?: boolean } = {}, readsFile?: JsonMap | boolean) {
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
    const createCommand = new CreateUserCommand(
      [
        '--json',
        '--target-org',
        testOrg.username,
        '--target-dev-hub',
        'devhub@test.com',
        '--definition-file',
        'parent/child/file.json',
        "permsets='permCLI, permCLI2'",
        'generatepassword=true',
      ],
      {} as Config
    );
    const result = await createCommand.run();
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
    const createCommand = new CreateUserCommand(
      ['--json', '--target-org', testOrg.username, '--target-dev-hub', 'devhub@test.com'],
      {} as Config
    );
    const result = await createCommand.run();
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
    const createCommand = new CreateUserCommand(
      [
        '--json',
        '--target-org',
        testOrg.username,
        '--target-dev-hub',
        'devhub@test.com',
        '--definition-file',
        'parent/child/file.json',
        'email=me@my.org',
        'generatepassword=false',
      ],
      {} as Config
    );
    const result = await createCommand.run();
    expect(result).to.deep.equal(expected);
  });

  it('will handle a failed `createUser` call with a licenseLimitExceeded error', async () => {
    await prepareStubs({ license: true }, false);
    const createCommand = new CreateUserCommand(
      ['--json', '--target-org', testOrg.username, '--target-dev-hub', 'devhub@test.com'],
      {} as Config
    );
    try {
      await createCommand.run();
      expect.fail('should have thrown an error');
    } catch (e) {
      assert(e instanceof Error);
      expect(e.message).to.equal('There are no available user licenses for the user profile "testName".');
      expect(e.name).to.equal('licenseLimitExceeded');
    }
  });

  it('will handle a failed `createUser` call with a DuplicateUsername error', async () => {
    await prepareStubs({ duplicate: true }, true);
    const createCommand = new CreateUserCommand(
      ['--json', '--target-org', testOrg.username, '--target-dev-hub', 'devhub@test.com'],
      {} as Config
    );
    try {
      await createCommand.run();
      expect.fail('should have thrown an error');
    } catch (e) {
      assert(e instanceof Error);
      expect(e.name).to.equal('duplicateUsername');
      expect(e.message).to.equal(
        'The username "1605130295132_test-j6asqt5qoprs@example.com" already exists in this or another Salesforce org. Usernames must be unique across all Salesforce orgs. Try using the --set-unique-username flag to force a unique username by appending the org ID.'
      );
    }
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
    const createCommand = new CreateUserCommand(
      [
        '--json',
        '--target-org',
        testOrg.username,
        '--target-dev-hub',
        'devhub@test.com',
        'username=user@cliFlag.com',
        '--setuniqueusername',
      ],
      {} as Config
    );
    const result = await createCommand.run();
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
    const createCommand = new CreateUserCommand(
      ['--json', '--target-org', testOrg.username, '--target-dev-hub', 'devhub@test.com', '--setuniqueusername'],
      {} as Config
    );
    const result = await createCommand.run();
    expect(result).to.deep.equal(expected);
  });
});
