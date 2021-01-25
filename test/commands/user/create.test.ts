/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable  @typescript-eslint/ban-ts-ignore */

import { $$, expect, test } from '@salesforce/command/lib/test';
import { Aliases, Connection, DefaultUserFields, fs, Logger, Org, User } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import { IConfig } from '@oclif/config';
import UserCreateCommand from '../../../src/commands/force/user/create';

const username = 'defaultusername@test.com';

describe('force:user:create', () => {
  it('will properly merge fields regardless of capitalization', async () => {
    // notice the varied capitalization
    stubMethod($$.SANDBOX, fs, 'readJson').resolves({
      id: '0052D0000043PawWWR',
      Username: '1605130295132_test-j6asqt5qoprs@example.com',
      Alias: 'testAlias',
      Email: username,
      EmailEncodingKey: 'UTF-8',
      LanguageLocaleKey: 'en_US',
      localeSidKey: 'en_US',
      ProfileId: '00e2D000000bNexWWR',
      LastName: 'User',
      timeZoneSidKey: 'America/Los_Angeles',
    });

    const createCommand = new UserCreateCommand(['-f', 'userConfig.json'], {} as IConfig);

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
      localeSidKey: 'en_US',
      profileId: '00e2D000000bNexWWR',
      timeZoneSidKey: 'America/Los_Angeles',
      username: '1605130295132_test-j6asqt5qoprs@example.com',
    });
  });

  async function prepareStubs(throws: { license?: boolean; duplicate?: boolean } = {}, readsFile?) {
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').callsFake(() => Connection.prototype);
    stubMethod($$.SANDBOX, DefaultUserFields, 'create').resolves({
      getFields: () => {
        return {
          id: '0052D0000043PawWWR',
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
    stubMethod($$.SANDBOX, Aliases, 'fetch').resolves('testAlias');
    stubMethod($$.SANDBOX, User, 'create').callsFake(() => User.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns(username);
    stubMethod($$.SANDBOX, Org.prototype, 'getOrgId').returns('abc123');

    if (throws.license) {
      stubMethod($$.SANDBOX, User.prototype, 'createUser').throws(new Error('LICENSE_LIMIT_EXCEEDED'));
      stubMethod($$.SANDBOX, Connection.prototype, 'query').resolves({ records: [{ Name: 'testName' }] });
    } else if (throws.duplicate) {
      stubMethod($$.SANDBOX, User.prototype, 'createUser').throws(new Error('DUPLICATE_USERNAME'));
    } else {
      stubMethod($$.SANDBOX, User.prototype, 'createUser').resolves();
    }

    if (readsFile) {
      stubMethod($$.SANDBOX, Connection.prototype, 'query').resolves({
        records: [{ Id: '12345678' }],
      });
      stubMethod($$.SANDBOX, Logger.prototype, 'debug');
      stubMethod($$.SANDBOX, fs, 'readJson').resolves(readsFile);
    }
  }

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
        alias: 'testAlias',
        email: username,
        emailEncodingKey: 'UTF-8',
        id: '0052D0000043PawWWR',
        languageLocaleKey: 'en_US',
        lastName: 'User',
        localeSidKey: 'en_US',
        orgId: 'abc123',
        profileId: '00e2D000000bNexWWR',
        timeZoneSidKey: 'America/Los_Angeles',
        username: '1605130295132_test-j6asqt5qoprs@example.com',
      };
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs({}, { generatepassword: true });
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
        alias: 'testAlias',
        email: 'me@my.org',
        emailEncodingKey: 'UTF-8',
        id: '0052D0000043PawWWR',
        languageLocaleKey: 'en_US',
        lastName: 'User',
        localeSidKey: 'en_US',
        orgId: 'abc123',
        profileId: '00e2D000000bNexWWR',
        timeZoneSidKey: 'America/Los_Angeles',
        username: '1605130295132_test-j6asqt5qoprs@example.com',
      };
      const result = JSON.parse(ctx.stdout).result;
      expect(result).to.deep.equal(expected);
    });

  test
    .do(async () => {
      await prepareStubs({}, { generatepassword: true, profileName: 'System Administrator' });
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
      "profileName='Chatter Free User'",
    ])
    // we set generatepassword=false in the varargs, in the definitionfile we have generatepassword=true, so we SHOULD NOT generate a password
    // we should override the profileName with 'Chatter Free User'
    .it(
      'will merge fields from the cli args, and the definitionfile correctly, preferring cli args, cli args > file > default',
      (ctx) => {
        const expected = {
          alias: 'testAlias',
          email: 'me@my.org',
          emailEncodingKey: 'UTF-8',
          id: '0052D0000043PawWWR',
          languageLocaleKey: 'en_US',
          lastName: 'User',
          localeSidKey: 'en_US',
          orgId: 'abc123',
          // note the new profileId 12345678 -> Chatter Free User from var args
          profileId: '12345678',
          timeZoneSidKey: 'America/Los_Angeles',
          username: '1605130295132_test-j6asqt5qoprs@example.com',
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
});
