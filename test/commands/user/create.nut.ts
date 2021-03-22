/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { expect } from 'chai';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { env } from '@salesforce/kit';
import { UserCreateOutput } from '../../../src/commands/force/user/create';

let session: TestSession;

describe('creates a user from a file and verifies', () => {
  let createdUserId: string;

  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: path.join('test', 'df17AppBuilding'),
      },
      // create org and push source to get a permset
      setupCommands: [
        `sfdx force:org:create -d 1 -s -f ${path.join('config', 'project-scratch-def.json')}`,
        'sfdx force:source:push',
      ],
    });
  });

  it('creates a user with setuniqueusername from username on commandline', () => {
    const testUsername = 'test@test.test';
    const output = execCmd<UserCreateOutput>(
      `force:user:create --json --setuniqueusername username=${testUsername} profileName="Chatter Free User"`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput;
    expect(output.result).to.have.all.keys(['orgId', 'permissionSetAssignments', 'fields']);
    const usernameResult = output.result.fields.username as string;
    expect(usernameResult.startsWith(testUsername)).to.be.true;
    // ends with . followed by the prefix for orgId (lowercased!) and 15 more lowercase characters or digits
    expect(usernameResult).matches(/.*\.00d[a-z|\d]{15}$/);
  });

  it('creates a user with setuniqueusername from username on commandline', () => {
    const output = execCmd<UserCreateOutput>(
      `force:user:create --json -f ${path.join('config', 'fileWithUsername.json')} --setuniqueusername`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput;
    expect(output.result).to.have.all.keys(['orgId', 'permissionSetAssignments', 'fields']);
    const usernameResult = output.result.fields.username as string;
    expect(usernameResult).matches(/not\.unique@test\.test\.00d[a-z|\d]{15}$/);
  });

  it('creates a secondary user with password and permsets assigned', () => {
    const output = execCmd<UserCreateOutput>(
      `force:user:create --json -a Other -f ${path.join('config', 'complexUser.json')}`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput;
    // expect(output.jsonOutput).to.have.property('result').with.all.keys(['orgId', 'permissionSetAssignments', 'fields']);
    expect(output.result).to.have.all.keys(['orgId', 'permissionSetAssignments', 'fields']);
    expect(output.result.permissionSetAssignments).to.deep.equal(['VolunteeringApp']);
    createdUserId = output.result.fields.id as string;
  });

  // LEAVE this test last because it changes the executable path
  it('verifies the permission set assignment in the org', () => {
    // use sfdx since queries won't be part of this plugin
    env.setString('TESTKIT_EXECUTABLE_PATH', 'sfdx');
    const output = execCmd(
      `force:data:soql:query --json -q "select PermissionSet.Name from PermissionSetAssignment where AssigneeId = '${createdUserId}'"`,
      { ensureExitCode: 0 }
    );
    const result = (output.jsonOutput as Record<string, unknown>).result as {
      records: [{ Id: string; PermissionSet: { Name: string } }];
    };
    // there will also be a profile in there, too, with a cryptic name on it
    expect(result.records.some((assignment) => assignment.PermissionSet.Name === 'VolunteeringApp'));
  });

  after(async () => {
    await session.zip(undefined, 'artifacts');
    await session.clean();
  });
});
