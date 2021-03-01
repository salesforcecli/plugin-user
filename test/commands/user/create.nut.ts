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

  before(() => {
    session = TestSession.create({
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

  it('creates a secondary user with password and permsets assigned', () => {
    const output = execCmd(`force:user:create --json -a Other -f ${path.join('config', 'complexUser.json')}`, {
      ensureExitCode: 0,
    });
    expect(output.jsonOutput).to.have.property('result').with.all.keys(['orgId', 'permissionSetAssignments', 'fields']);
    const result = (output.jsonOutput as Record<string, unknown>).result as UserCreateOutput;
    expect(result.permissionSetAssignments).to.deep.equal(['VolunteeringApp']);
    // const fileContents = fs.readJsonSync('config/complexUser.json', true);
    createdUserId = result.fields.id as string;
  });

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
