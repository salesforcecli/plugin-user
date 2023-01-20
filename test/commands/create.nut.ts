/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { AuthInfo, Connection } from '@salesforce/core';
import { CreateUserOutput } from '../../src/commands/org/create/user';
import { AuthList } from '../../src/commands/org/list/users';

let session: TestSession;

describe('creates a user from a file and verifies', () => {
  let createdUserId: string;

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

  it('creates a user with setuniqueusername from username on commandline', () => {
    const testUsername = 'test@test.test';
    const output = execCmd<CreateUserOutput>(
      `org:create:user --json --setuniqueusername username=${testUsername} profileName="Chatter Free User"`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput;
    expect(output?.result).to.have.all.keys(['orgId', 'permissionSetAssignments', 'fields']);
    const usernameResult = output?.result.fields.username as string;
    expect(usernameResult.startsWith(testUsername)).to.be.true;
    // ends with . followed by the prefix for orgId (lowercased!) and 15 more lowercase characters or digits
    expect(usernameResult).matches(/.*\.00d[a-z|\d]{15}$/);
  });

  it('creates a user with setuniqueusername without username on commandline', () => {
    const output = execCmd<CreateUserOutput>(
      `org:create:user --json -f ${path.join('config', 'fileWithUsername.json')} --setuniqueusername`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput;
    expect(output?.result).to.have.all.keys(['orgId', 'permissionSetAssignments', 'fields']);
    const usernameResult = output?.result.fields.username as string;
    expect(usernameResult).matches(/not\.unique@test\.test\.00d[a-z|\d]{15}$/);
  });

  it('creates a secondary user with password and permsets assigned', () => {
    const output = execCmd<CreateUserOutput>(
      `org:create:user --json -a Other -f ${path.join('config', 'complexUser.json')}`,
      { ensureExitCode: 0 }
    ).jsonOutput;
    expect(output?.result).to.have.all.keys(['orgId', 'permissionSetAssignments', 'fields']);
    expect(output?.result.permissionSetAssignments).to.deep.equal(['VolunteeringApp']);
    createdUserId = output?.result.fields.id as string;
  });
  it('verifies the permission set assignment in the org', async () => {
    const connection = await Connection.create({
      authInfo: await AuthInfo.create({ username: session.orgs.get('default')?.username }),
    });
    const queryResult = await connection.query<{ Id: string; PermissionSet: { Name: string } }>(
      `select PermissionSet.Name from PermissionSetAssignment where AssigneeId = '${createdUserId}'`
    );
    // there will also be a profile in there, too, with a cryptic name on it
    expect(queryResult.records.some((assignment) => assignment.PermissionSet.Name === 'VolunteeringApp'));
  });
  it('verifies the new user appears in list of users for the org', async () => {
    const output = execCmd<AuthList[]>(`org:list:users --json -u ${session.orgs.get('default')?.username}`, {
      ensureExitCode: 0,
    }).jsonOutput;
    expect(output?.result.find((user) => user.userId === createdUserId)).to.be.ok;
  });

  after(async () => {
    await session.zip(undefined, 'artifacts');
    await session.clean();
  });
});
