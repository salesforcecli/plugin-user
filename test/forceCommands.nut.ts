/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { expect, use } from 'chai';
import * as chaiEach from 'chai-each';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

import { PermsetAssignResult } from '../src/baseCommands/user/permset/assign';
import { AuthList } from '../src/commands/org/list/users';
import { CreateUserOutput } from '../src/commands/org/create/user';
import { DisplayUserResult } from '../src/commands/org/display/user';

use(chaiEach);
let session: TestSession;

let mainUserId;

describe('verifies legacy force commands run successfully ', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: path.join('test', 'df17AppBuilding'),
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          executable: 'sfdx',
          duration: 1,
          setDefault: true,
          config: path.join('config', 'project-scratch-def.json'),
        },
      ],
    });

    execCmd('force:source:push', { cli: 'sfdx', ensureExitCode: 0 });
  });

  it('user display', () => {
    const output = execCmd<DisplayUserResult>('force:user:display --json', { ensureExitCode: 0 }).jsonOutput;
    expect(output?.result).to.have.all.keys([
      'username',
      'accessToken',
      'id',
      'orgId',
      'profileName',
      'loginUrl',
      'instanceUrl',
    ]);

    expect(output?.result.orgId).to.have.length(18);
    expect(output?.result.id).to.have.length(18);
    expect(output?.result?.accessToken?.startsWith(output?.result.orgId.substr(0, 15))).to.be.true;
    mainUserId = output?.result.id;
  });

  it('assigns a permset to the default user', () => {
    const output = execCmd<PermsetAssignResult>('force:user:permset:assign -n VolunteeringApp --json', {
      ensureExitCode: 0,
    }).jsonOutput;
    expect(output?.result).to.have.all.keys(['successes', 'failures']);
    expect(output?.result.successes).to.have.length(1);
    expect(output?.result.successes[0]).to.have.all.keys(['name', 'value']);
    expect(output?.result.failures).to.have.length(0);
  });

  it('creates a secondary user', () => {
    const output = execCmd<CreateUserOutput>('force:user:create --json -a Other', { ensureExitCode: 0 }).jsonOutput;

    expect(output?.result).to.have.all.keys(['orgId', 'permissionSetAssignments', 'fields']);
    expect(output?.result.fields).to.have.all.keys(
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
    expect(output?.result.fields.id).to.not.equal(mainUserId);
  });

  it('assigns permset to the secondary user', () => {
    const output = execCmd<PermsetAssignResult>(
      'force:user:permset:assign -n VolunteeringApp --json --onbehalfof Other',
      {
        ensureExitCode: 0,
      }
    ).jsonOutput;
    expect(output?.result).to.have.all.keys(['successes', 'failures']);
    expect(output?.result.successes).to.have.length(1);
    expect(output?.result.successes[0]).to.have.all.keys(['name', 'value']);
    expect(output?.result.failures).to.have.length(0);
  });

  it('lists the users', () => {
    const result = execCmd<AuthList[]>('force:user:list --json', { ensureExitCode: 0 }).jsonOutput?.result;
    expect(result).to.be.an('array').with.length(2);
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

  it('generates new password for main user', () => {
    const output = execCmd('force:user:password:generate --json', { ensureExitCode: 0 }).jsonOutput;
    expect(output).to.have.property('result').includes.keys(['username', 'password']);
  });

  it('generates new password for main user testing default length and complexity', () => {
    const output = execCmd<{ username: string; password: string }>('force:user:password:generate --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    // testing default length
    expect(output?.password?.length).to.equal(13);
    const complexity5Regex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$|%^&*()[\\]_-])');
    // testing default complexity
    expect(complexity5Regex.test(output?.password ?? '')).to.be.true;
  });

  it('generates new password for main user testing length 11 and complexity 5', () => {
    const output = execCmd<{ username: string; password: string }>('force:user:password:generate --json -l 11 -c 3', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(output?.password.length).to.equal(11);
    const complexity3Regex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])');
    expect(complexity3Regex.test(output?.password ?? ''));
  });

  it('generates new password for secondary user (onbehalfof)', () => {
    const output = execCmd('force:user:password:generate -o Other --json', { ensureExitCode: 0 }).jsonOutput;
    expect(output).to.have.property('result').includes.keys(['username', 'password']);
  });

  it('generates new password for secondary user (onbehalfof) with length 12', () => {
    const output = execCmd<{ username: string; password: string }>(
      'force:user:password:generate -o Other --json -l 12',
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;

    expect(output?.password.length).to.equal(12);
    const complexity5Regex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$|%^&*()[\\]_-])');
    // testing the default complexity
    expect(complexity5Regex.test(output?.password ?? ''));
  });

  it('generates new password for secondary user (onbehalfof) with complexity 3', () => {
    const output = execCmd<{ username: string; password: string }>(
      'force:user:password:generate -o Other --json -c 3',
      {
        ensureExitCode: 0,
      }
    ).jsonOutput?.result;
    // testing default length
    expect(output?.password.length).to.equal(13);
    const complexity3Regex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])');
    expect(complexity3Regex.test(output?.password ?? ''));
  });

  it('generates new password for secondary user (onbehalfof) with complexity 7 should thrown an error', () => {
    const output = execCmd('force:user:password:generate -o Other --json -c 7', { ensureExitCode: 1 }).jsonOutput;
    expect(output?.message).to.include('Expected an integer less than or equal to 5 but received: 7');
  });
  it('generates new password for secondary user (onbehalfof) with length 7 should thrown an error', () => {
    const output = execCmd('force:user:password:generate -o Other --json -l 7', { ensureExitCode: 1 }).jsonOutput;
    expect(output?.message).to.include('Expected an integer greater than or equal to 8 but received: 7');
  });
  it('assigns 2 permsets to the main user', () => {
    const output = execCmd<PermsetAssignResult>('force:user:permset:assign -n PS2,PS3 --json', {
      ensureExitCode: 0,
    }).jsonOutput;
    expect(output?.result).to.have.all.keys(['successes', 'failures']);
    expect(output?.result.successes).to.have.length(2);
    expect(output?.result.successes[0]).to.have.all.keys(['name', 'value']);
    expect(output?.result.failures).to.have.length(0);
  });

  it('assigns 2 permsets to the secondary user', () => {
    const output = execCmd<PermsetAssignResult>('force:user:permset:assign -n PS2,PS3 -o Other --json', {
      ensureExitCode: 0,
    }).jsonOutput;
    expect(output?.result).to.have.all.keys(['successes', 'failures']);
    expect(output?.result.successes).to.have.length(2);
    expect(output?.result.successes[0]).to.have.all.keys(['name', 'value']);
    expect(output?.result.failures).to.have.length(0);
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });
});
