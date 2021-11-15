/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { PSLResult } from '../../../../src/commands/force/user/permsetlicense/assign';

type PSLResultWithWarnings = PSLResult & { warnings?: string[] };
describe('PermissionSetLicense tests', () => {
  const testPSL = 'WaveEmbeddedApp';
  let session: TestSession;

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

  it('assigns a psl to default user', () => {
    const commandResult = execCmd<PSLResultWithWarnings>(`sfdx force:user:permsetlicense:assign -n ${testPSL} --json`, {
      ensureExitCode: 0,
    }).jsonOutput.result;
    expect(commandResult.failures).to.be.an('array').with.length(0);
    expect(commandResult.successes).to.deep.equal([{ value: 'WaveEmbeddedApp' }]);
    expect(commandResult).to.not.have.property('warnings');
  });

  it('assigns a psl to default user successfully if already assigned', () => {
    const commandResult = execCmd<PSLResultWithWarnings>(`sfdx force:user:permsetlicense:assign -n ${testPSL} --json`, {
      ensureExitCode: 0,
    }).jsonOutput.result;
    expect(commandResult.failures).to.be.an('array').with.length(0);
    expect(commandResult.successes).to.deep.equal([{ value: 'WaveEmbeddedApp' }]);
    expect(commandResult.warnings).to.be.an('array').with.length(1);
    expect(commandResult.warnings[0]).to.include(testPSL);
  });

  it('fails properly for non-existing psl', () => {
    const badPSL = 'badPSL';
    const commandResult = execCmd<PSLResultWithWarnings>(`sfdx force:user:permsetlicense:assign -n ${badPSL} --json`, {
      ensureExitCode: 1,
    }).jsonOutput.result;
    expect(commandResult.successes).to.be.an('array').with.length(0);
    expect(commandResult.failures).to.be.an('array').with.length.greaterThan(0);
  });

  it('assigns a psl to multiple users via onBehalfOf', async () => {});

  after(async () => {
    await session.zip(undefined, 'artifacts');
    await session.clean();
  });
});
