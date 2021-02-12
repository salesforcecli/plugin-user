/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';

const projectPath = 'testProject_hubAndOrg';
let session: TestSession;

describe('verifies all commands run successfully ', () => {
  before(() => {
    session = TestSession.create({
      project: {
        destinationDir: projectPath,
        sourceDir: 'test/df17AppBuilding',
      },
      setupCommands: [
        'sfdx force:org:create -d 1 -s -f config/project-scratch-def.json',
        'sfdx force:source:push',
        // 'sfdx force:user:permset:assign -n VolunteeringApp',
        // 'sfdx force:data:tree:import -p data/masterImportPlan.json',
        // 'sfdx force:apex:execute -f scripts/setup.cls',
      ],
    });
  });

  it('user display', () => {
    const output = execCmd('force:user:display --json', { ensureExitCode: 0 });
    expect(output.jsonOutput)
      .to.have.property('result')
      .with.keys(['username', 'accessToken', 'id', 'orgId', 'profileName', 'loginUrl', 'instanceUrl']);
    const result = (output.jsonOutput as Record<string, unknown>).result as Record<string, string>;
    expect(result.orgId).to.have.length(18);
    expect(result.id).to.have.length(18);
    expect(result.accessToken.startsWith(result.orgId.substr(0, 15))).to.be.true;
  });

  it('assigns a permset to the default user', () => {
    execCmd('force:user:permset:assign -n VolunteeringApp --json', { ensureExitCode: 0 });
  });

  it('creates a secondary user', () => {
    execCmd('force:user:create --json -a Other', { ensureExitCode: 0 });
  });

  it('assigns permset to the secondary user', () => {
    execCmd('force:user:permset:assign -n VolunteeringApp --json --onbehalfof Other', { ensureExitCode: 0 });
  });

  it('lists the users', () => {
    execCmd('force:user:list', { ensureExitCode: 0 });
  });

  it('generates new passwords for main user', () => {
    execCmd('force:user:password:generate', { ensureExitCode: 0 });
  });

  it('generates new passwords for secondary user (onbehalfof)', () => {
    execCmd('force:user:password:generate -o Other', { ensureExitCode: 0 });
  });

  after(async () => {
    await session.clean();
  });
});
