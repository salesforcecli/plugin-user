/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable  @typescript-eslint/ban-ts-comment */

import { $$, expect, test } from '@salesforce/command/lib/test';
import * as fse from 'fs-extra';
import { AuthInfo, Connection, DefaultUserFields, Logger, Org, User, UserFields } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import { Config } from '@oclif/core';
import UserCreateCommand from '../../../src/commands/force/user/create';

const username = 'defaultusername@test.com';
const originalUserId = '0052D0000043PawWWR';
const newUserId = '0052D0000044PawWWR';

describe('force:user:create', () => {
  it.skip('will properly merge fields regardless of capitalization', async () => {
    // notice the varied capitalization
    stubMethod($$.SANDBOX, fse, 'readJson').resolves({
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
    });

    const createCommand = new UserCreateCommand(['-f', 'userConfig.json'], {} as Config);

    // @ts-ignore
    createCommand.flags = { definitionfile: 'testing' };

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
    stubMethod($$.SANDBOX, Org, 'create').resolves(Org.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').returns(Connection.prototype);
    stubMethod($$.SANDBOX, DefaultUserFields, 'create').resolves({
      getFields: (): UserFields => {
        return {
          id: originalUserId,
          username: '1605130295132_test-j6asqt5qoprs@example.com',
          alias: 'testAlias',
          email: username,
          emailEncodingKey: 'UTF-8',
          languageLocaleKey: 'en_US',
          localeSidKey: 'en_US',
          profileId: '00e2D000000bNexWWR',
          lastName: 'User',
          timeZoneSidKey: 'America/Los_Angeles',
        };
      },
    });

    stubMethod($$.SANDBOX, User, 'create').callsFake(() => User.prototype);
    stubMethod($$.SANDBOX, User.prototype, 'assignPermissionSets').resolves();
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns(username);
    stubMethod($$.SANDBOX, Org.prototype, 'getOrgId').returns('abc123');
    stubMethod($$.SANDBOX, AuthInfo.prototype, 'save').resolves();
    stubMethod($$.SANDBOX, AuthInfo.prototype, 'getFields').returns({
      userId: newUserId,
      username: '1605130295132_test-j6asqt5qoprs@example.com',
      alias: 'testAlias',
      email: username,
      emailEncodingKey: 'UTF-8',
      languageLocaleKey: 'en_US',
      localeSidKey: 'en_US',
      profileId: '00e2D000000bNexWWR',
      lastName: 'User',
      timeZoneSidKey: 'America/Los_Angeles',
    });
    if (throws.license) {
      stubMethod($$.SANDBOX, User.prototype, 'createUser').throws(new Error('LICENSE_LIMIT_EXCEEDED'));
      stubMethod($$.SANDBOX, Connection.prototype, 'query').resolves({ records: [{ Name: 'testName' }] });
    } else if (throws.duplicate) {
      stubMethod($$.SANDBOX, User.prototype, 'createUser').throws(new Error('DUPLICATE_USERNAME'));
    } else {
      stubMethod($$.SANDBOX, User.prototype, 'createUser').resolves(AuthInfo.prototype);
    }

    if (readsFile) {
      stubMethod($$.SANDBOX, Connection.prototype, 'query').resolves({
        records: [{ Id: '12345678' }],
      });
      stubMethod($$.SANDBOX, Logger.prototype, 'debug');
      stubMethod($$.SANDBOX, fse, 'readJson').resolves(readsFile);
    }

    $$.stubAliases({ testAlias: '1605130295132_test-j6asqt5qoprs@example.com' });
  }
  test
    .do(async () => {
      stubMethod($$.SANDBOX, User.prototype, 'assignPassword').resolves();
      await prepareStubs({}, { profilename: 'profileFromFile', permsets: ['perm1', 'perm2'] });
    })
    .stdout()
    .command([
      'force:user:create',
      '--json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
      "permsets='permCLI, permCLI2'",
      'generatepassword=true',
      'profilename=profileFromArgs',
    ])
    .it('will handle a merge multiple permsets and profilenames from args and file (permsets from args)', (ctx) => {
      const expected = {
        orgId: 'abc123',
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
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs({}, { permsets: ['perm1', 'perm2'] });
    })
    .stdout()
    .command([
      'force:user:create',
      '--json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
      '--definitionfile',
      'tempfile.json',
      'profilename=profileFromArgs',
      'username=user@cliArgs.com',
    ])
    .it('will handle a merge multiple permsets and profilenames from args and file (permsets from file)', (ctx) => {
      const expected = {
        orgId: 'abc123',
        permissionSetAssignments: ['perm1', 'perm2'],
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
          username: 'user@cliArgs.com',
        },
      };
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs({}, false);
    })
    .stdout()
    .command([
      'force:user:create',
      '--json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
    ])
    .it('default create creates user exactly from DefaultUserFields', (ctx) => {
      const expected = {
        orgId: 'abc123',
        permissionSetAssignments: [],
        fields: {
          alias: 'testAlias',
          email: username,
          emailencodingkey: 'UTF-8',
          id: newUserId,
          languagelocalekey: 'en_US',
          lastname: 'User',
          localesidkey: 'en_US',
          profileid: '00e2D000000bNexWWR',
          timezonesidkey: 'America/Los_Angeles',
          username: '1605130295132_test-j6asqt5qoprs@example.com',
        },
      };
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs({}, { generatepassword: true, permsets: ['test1', 'test2'] });
    })
    .stdout()
    .command([
      'force:user:create',
      '--json',
      '--definitionfile',
      'parent/child/file.json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
      'email=me@my.org',
      'generatepassword=false',
    ])
    // we set generatepassword=false in the varargs, in the definitionfile we have generatepassword=true, so we SHOULD NOT generate a password
    .it('will merge fields from the cli args, and the definitionfile correctly, preferring cli args', (ctx) => {
      const expected = {
        orgId: 'abc123',
        permissionSetAssignments: ['test1', 'test2'],
        fields: {
          alias: 'testAlias',
          email: 'me@my.org',
          emailencodingkey: 'UTF-8',
          id: newUserId,
          languagelocalekey: 'en_US',
          lastname: 'User',
          localesidkey: 'en_US',
          profileid: '00e2D000000bNexWWR',
          generatepassword: false,
          timezonesidkey: 'America/Los_Angeles',
          username: '1605130295132_test-j6asqt5qoprs@example.com',
        },
      };
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs({}, { generatepassword: true, profilename: 'System Administrator' });
    })
    .stdout()
    .command([
      'force:user:create',
      '--json',
      '--definitionfile',
      'parent/child/file.json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
      'email=me@my.org',
      'generatepassword=false',
      "profilename='Chatter Free User'",
    ])
    // we set generatepassword=false in the varargs, in the definitionfile we have generatepassword=true, so we SHOULD NOT generate a password
    // we should override the profilename with 'Chatter Free User'
    .it(
      'will merge fields from the cli args, and the definitionfile correctly, preferring cli args, cli args > file > default',
      (ctx) => {
        const expected = {
          orgId: 'abc123',
          permissionSetAssignments: [],
          fields: {
            alias: 'testAlias',
            email: 'me@my.org',
            emailencodingkey: 'UTF-8',
            id: newUserId,
            languagelocalekey: 'en_US',
            lastname: 'User',
            localesidkey: 'en_US',
            generatepassword: false,
            profilename: "'Chatter Free User'",
            // note the new profileid 12345678 -> Chatter Free User from var args
            profileid: '12345678',
            timezonesidkey: 'America/Los_Angeles',
            username: '1605130295132_test-j6asqt5qoprs@example.com',
          },
        };
        const result = JSON.parse(ctx.stdout).result;
        expect(result).to.deep.equal(expected);
      }
    );

  test
    .do(async () => {
      await prepareStubs({ license: true }, false);
    })
    .stdout()
    .command([
      'force:user:create',
      '--json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
    ])
    .it('will handle a failed `createUser` call with a licenseLimitExceeded error', (ctx) => {
      const result = JSON.parse(ctx.stdout);
      expect(result.status).to.equal(1);
      expect(result.message).to.equal('There are no available user licenses for the user profile "testName".');
      expect(result.name).to.equal('licenseLimitExceeded');
    });

  test
    .do(async () => {
      await prepareStubs({ duplicate: true }, false);
    })
    .stdout()
    .command([
      'force:user:create',
      '--json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
    ])
    .it('will handle a failed `createUser` call with a DuplicateUsername error', (ctx) => {
      const result = JSON.parse(ctx.stdout);
      expect(result.status).to.equal(1);
      expect(result.name).to.equal('duplicateUsername');
      expect(result.message).to.equal(
        'The username "1605130295132_test-j6asqt5qoprs@example.com" already exists in this or another Salesforce org. Usernames must be unique across all Salesforce orgs.'
      );
    });

  test
    .do(async () => {
      await prepareStubs({}, false);
    })
    .stdout()
    .command([
      'force:user:create',
      '--json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
      'username=user@cliFlag.com',
      '--setuniqueusername',
    ])
    .it('will append the org id to the passed username if the setuniqueusername is used', (ctx) => {
      const expected = {
        orgId: 'abc123',
        permissionSetAssignments: [],
        fields: {
          alias: 'testAlias',
          email: 'defaultusername@test.com',
          emailencodingkey: 'UTF-8',
          id: newUserId,
          languagelocalekey: 'en_US',
          lastname: 'User',
          localesidkey: 'en_US',
          profileid: '00e2D000000bNexWWR',
          timezonesidkey: 'America/Los_Angeles',
          username: 'user@cliFlag.com.abc123',
        },
      };
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs({}, false);
    })
    .stdout()
    .command([
      'force:user:create',
      '--json',
      '--targetusername',
      'testUser1@test.com',
      '--targetdevhubusername',
      'devhub@test.com',
      '--setuniqueusername',
    ])
    .it(
      'will not append the org id to the username if the setuniqueusername is used but username was generated by the CLI',
      (ctx) => {
        const expected = {
          orgId: 'abc123',
          permissionSetAssignments: [],
          fields: {
            alias: 'testAlias',
            email: 'defaultusername@test.com',
            emailencodingkey: 'UTF-8',
            id: newUserId,
            languagelocalekey: 'en_US',
            lastname: 'User',
            localesidkey: 'en_US',
            profileid: '00e2D000000bNexWWR',
            timezonesidkey: 'America/Los_Angeles',
            username: '1605130295132_test-j6asqt5qoprs@example.com',
          },
        };
        const result = JSON.parse(ctx.stdout).result;
        expect(result).to.deep.equal(expected);
      }
    );
});
