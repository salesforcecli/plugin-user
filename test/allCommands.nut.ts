/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import { expect, use } from 'chai';
import chaiEach from 'chai-each';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

import { PermsetAssignResult } from '../src/baseCommands/user/permset/assign.js';
import { AuthList } from '../src/commands/org/list/users.js';
import { CreateUserOutput } from '../src/commands/org/create/user.js';
import { DisplayUserResult } from '../src/commands/org/display/user.js';

use(chaiEach);
let session: TestSession;

let mainUserId: string | undefined;

describe('verifies all commands run successfully ', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: join('test', 'df17AppBuilding'),
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          setDefault: true,
          config: join('config', 'project-scratch-def.json'),
          tracksSource: false,
        },
      ],
    });

    execCmd('project:deploy:start', { ensureExitCode: 0, cli: 'sf' });
  });

  it('user display', () => {
    const output = execCmd<DisplayUserResult>('org:display:user --json', { ensureExitCode: 0 }).jsonOutput;
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
    const output = execCmd<PermsetAssignResult>('org:assign:permset -n VolunteeringApp --json', {
      ensureExitCode: 0,
    }).jsonOutput;
    expect(output?.result).to.have.all.keys(['successes', 'failures']);
    expect(output?.result.successes).to.have.length(1);
    expect(output?.result.successes[0]).to.have.all.keys(['name', 'value']);
    expect(output?.result.failures).to.have.length(0);
  });

  it('creates a secondary user', () => {
    const output = execCmd<CreateUserOutput>('org:create:user --json -a Other', { ensureExitCode: 0 }).jsonOutput;

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
    const output = execCmd<PermsetAssignResult>('org:assign:permset -n VolunteeringApp --json --onbehalfof Other', {
      ensureExitCode: 0,
    }).jsonOutput;
    expect(output?.result).to.have.all.keys(['successes', 'failures']);
    expect(output?.result.successes).to.have.length(1);
    expect(output?.result.successes[0]).to.have.all.keys(['name', 'value']);
    expect(output?.result.failures).to.have.length(0);
  });

  it('lists the users', () => {
    const result = execCmd<AuthList[]>('org:list:users --json', { ensureExitCode: 0 }).jsonOutput?.result;
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

  it('generates new passwords for main user', () => {
    const output = execCmd('org:generate:password --json', { ensureExitCode: 0 }).jsonOutput;
    expect(output).to.have.property('result').includes.keys(['username', 'password']);
  });

  it('generates new passwords for main user testing default length and complexity', () => {
    const output = execCmd<{ username: string; password: string }>('org:generate:password --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    // testing default length
    expect(output?.password?.length).to.equal(13);
    const complexity5Regex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$|%^&*()[\\]_-])');
    // testing default complexity
    expect(complexity5Regex.test(output?.password ?? '')).to.be.true;
  });

  it('generates new passwords for main user testing length 11 and complexity 5', () => {
    const output = execCmd<{ username: string; password: string }>('org:generate:password --json -l 11 -c 3', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(output?.password.length).to.equal(11);
    const complexity3Regex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])');
    expect(complexity3Regex.test(output?.password ?? ''));
  });

  it('generates new password for secondary user (onbehalfof)', () => {
    const output = execCmd('org:generate:password -b Other --json', { ensureExitCode: 0 }).jsonOutput;
    expect(output).to.have.property('result').includes.keys(['username', 'password']);
  });

  it('generates new password for secondary user (onbehalfof) with length 12', () => {
    const output = execCmd<{ username: string; password: string }>('org:generate:password -b Other --json -l 12', {
      ensureExitCode: 0,
    }).jsonOutput?.result;

    expect(output?.password.length).to.equal(12);
    const complexity5Regex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$|%^&*()[\\]_-])');
    // testing the default complexity
    expect(complexity5Regex.test(output?.password ?? ''));
  });

  it('generates new password for secondary user (onbehalfof) with complexity 3', () => {
    const output = execCmd<{ username: string; password: string }>('org:generate:password -b Other --json -c 3', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    // testing default length
    expect(output?.password.length).to.equal(13);
    const complexity3Regex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])');
    expect(complexity3Regex.test(output?.password ?? ''));
  });

  it('generates new password for secondary user (onbehalfof) with complexity 7 should thrown an error', () => {
    const output = execCmd('org:generate:password -b Other --json -c 7', { ensureExitCode: 'nonZero' }).jsonOutput;
    expect(output?.message).to.include('Expected an integer less than or equal to 5 but received: 7');
  });
  it('generates new password for secondary user (onbehalfof) with length 7 should thrown an error', () => {
    const output = execCmd('org:generate:password -b Other --json -l 7', { ensureExitCode: 'nonZero' }).jsonOutput;
    expect(output?.message).to.include('Expected an integer greater than or equal to 8 but received: 7');
  });
  it('assigns 2 permsets to the main user', () => {
    const output = execCmd<PermsetAssignResult>('org:assign:permset -n PS2 -n PS3 --json', {
      ensureExitCode: 0,
    }).jsonOutput;
    expect(output?.result).to.have.all.keys(['successes', 'failures']);
    expect(output?.result.successes).to.have.length(2);
    expect(output?.result.successes[0]).to.have.all.keys(['name', 'value']);
    expect(output?.result.failures).to.have.length(0);
  });

  it('assigns 2 permsets to the secondary user', () => {
    const output = execCmd<PermsetAssignResult>('org:assign:permset -n PS2 -n PS3 -b Other --json', {
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
