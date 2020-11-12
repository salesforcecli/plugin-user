/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { $$, expect, test } from '@salesforce/command/lib/test';
import { Aliases, Connection, DefaultUserFields, fs, Org, User } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';

const username = 'defaultusername@test.com';

describe('force:user:create', () => {
  async function prepareStubs(throws: { license?: boolean; duplicate?: boolean } = {}, readsFile = false) {
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
      stubMethod($$.SANDBOX, fs, 'readJson').resolves({ generatepassword: true });
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
      await prepareStubs({}, true);
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
        generatepassword: 'false',
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
