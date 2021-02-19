/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { use, expect } from 'chai';
import * as chaiEach from 'chai-each';

import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';

import { PermsetAssignResult } from '../src/commands/force/user/permset/assign';
import { AuthList } from '../src/commands/force/user/list';
import { UserCreateOutput } from '../src/commands/force/user/create';

use(chaiEach);
let session: TestSession;

describe('verifies all commands run successfully ', () => {
  before(() => {
    session = TestSession.create({
      project: {
        sourceDir: 'test/df17AppBuilding',
      },
      // create org and push source to get a permset
      setupCommands: ['sfdx force:org:create -d 1 -s -f config/project-scratch-def.json', 'sfdx force:source:push'],
    });
  });

  it('user display', () => {
    const output = execCmd('force:user:display --json', { ensureExitCode: 0 });
    expect(output.jsonOutput)
      .to.have.property('result')
      .with.all.keys(['username', 'accessToken', 'id', 'orgId', 'profileName', 'loginUrl', 'instanceUrl']);
    const result = (output.jsonOutput as Record<string, unknown>).result as Record<string, string>;
    expect(result.orgId).to.have.length(18);
    expect(result.id).to.have.length(18);
    expect(result.accessToken.startsWith(result.orgId.substr(0, 15))).to.be.true;
  });

  it('assigns a permset to the default user', () => {
    const output = execCmd('force:user:permset:assign -n VolunteeringApp --json', { ensureExitCode: 0 });
    expect(output.jsonOutput).to.have.property('result').with.all.keys(['successes', 'failures']);
    const result = (output.jsonOutput as Record<string, unknown>).result as PermsetAssignResult;
    expect(result.successes).to.have.length(1);
    expect(result.successes[0]).to.have.all.keys(['name', 'value']);
    expect(result.failures).to.have.length(0);
  });

  it('creates a secondary user', () => {
    const output = execCmd('force:user:create --json -a Other', { ensureExitCode: 0 });
    expect(output.jsonOutput).to.have.property('result').with.all.keys(['orgId', 'permissionSetAssignments', 'fields']);
    const result = (output.jsonOutput as Record<string, unknown>).result as UserCreateOutput;
    expect(result.fields).to.have.all.keys(
      'id',
      'username',
      'alias', // because it's set in the command
      'email',
      'emailencodingkey',
      'languagelocalekey',
      'localesidkey',
      'profileid',
      'lastname',
      'timezonesidkey'
    );
  });

  it('assigns permset to the secondary user', () => {
    const output = execCmd('force:user:permset:assign -n VolunteeringApp --json --onbehalfof Other', {
      ensureExitCode: 0,
    });
    expect(output.jsonOutput).to.have.property('result').with.all.keys(['successes', 'failures']);
    const result = (output.jsonOutput as Record<string, unknown>).result as PermsetAssignResult;
    expect(result.successes).to.have.length(1);
    expect(result.successes[0]).to.have.all.keys(['name', 'value']);
    expect(result.failures).to.have.length(0);
  });

  it('lists the users', () => {
    const output = execCmd('force:user:list --json', { ensureExitCode: 0 });
    expect(output.jsonOutput).to.have.property('result').to.be.an('array').with.length(2);
    const result = (output.jsonOutput as Record<string, unknown>).result as AuthList[];
    expect(result).each.have.all.keys([
      'defaultMarker',
      'alias',
      'username',
      'profileName',
      'orgId',
      'accessToken',
      'instanceUrl',
      'loginUrl',
      'userId',
    ]);
  });

  it('generates new passwords for main user', () => {
    const output = execCmd('force:user:password:generate --json', { ensureExitCode: 0 });
    expect(output.jsonOutput).to.have.property('result').includes.keys(['username', 'password']);
  });

  it('generates new password for secondary user (onbehalfof)', () => {
    const output = execCmd('force:user:password:generate -o Other --json', { ensureExitCode: 0 });
    expect(output.jsonOutput).to.have.property('result').includes.keys(['username', 'password']);
  });

  after(async () => {
    await session.clean();
  });
});
