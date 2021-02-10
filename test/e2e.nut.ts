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

describe('sample nut using existing org', () => {
  before(() => {
    session = TestSession.create({
      project: {
        destinationDir: projectPath,
        gitClone: 'https://github.com/mshanemc/df17AppBuilding',
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

  it('execs a simple command', () => {
    const result = execCmd('force:org:open -r --json', { ensureExitCode: 0 });
    expect(result.jsonOutput).to.have.property('status').equal(0);
  });

  after(async () => {
    await session.clean();
  });
});
