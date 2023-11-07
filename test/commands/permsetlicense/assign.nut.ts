/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join } from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { PSLResult } from '../../../src/baseCommands/user/permsetlicense/assign.js';
import { CreateUserOutput } from '../../../src/commands/org/create/user.js';

describe('PermissionSetLicense tests', () => {
  const testPSL = 'IdentityConnect';
  let session: TestSession;

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

  it('assigns a psl to default user', () => {
    const commandResult = execCmd<PSLResult>(`org:assign:permsetlicense -n ${testPSL} --json`, {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(commandResult?.failures).to.be.an('array').with.length(0);
    expect(commandResult?.successes.every((success) => success.value === testPSL)).to.be.true;
    expect(commandResult).to.not.have.property('warnings');
  });

  it('assigns a psl to default user successfully if already assigned', () => {
    const commandResult = execCmd<PSLResult>(`org:assign:permsetlicense -n ${testPSL} --json`, {
      ensureExitCode: 0,
    }).jsonOutput as { status: number; result: PSLResult; warnings: string[] };
    expect(commandResult.result.failures).to.be.an('array').with.length(0);
    expect(commandResult.result.successes.every((success) => success.value === testPSL)).to.be.true;
    expect(commandResult.warnings).to.be.an('array').with.length(1);
    expect(commandResult.warnings[0]).to.include(testPSL);
  });

  it('fails for non-existing psl', () => {
    const badPSL = 'badPSL';
    execCmd<PSLResult>(`org:assign:permsetlicense -n ${badPSL} --json`, {
      ensureExitCode: 1,
    });
  });

  describe('multiple PSL via onBehalfOf', () => {
    it('assigns a psl to multiple users via onBehalfOf', () => {
      const anotherPSL = 'SurveyCreatorPsl';
      const originalUsername = session.orgs.get('default')?.username;

      expect(originalUsername).to.be.a('string');
      // create a second user
      const secondUsername = execCmd<CreateUserOutput>(
        `org:create:user --json -a Other -f ${join('config', 'fullUser.json')}`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.fields.username as string;
      expect(secondUsername).to.be.a('string');
      const commandResult = execCmd<PSLResult>(
        `org:assign:permsetlicense -n ${anotherPSL} -b ${originalUsername} Other --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;
      expect(commandResult?.failures).to.deep.equal([]);
      expect(commandResult?.successes).to.deep.equal([
        { value: anotherPSL, name: originalUsername },
        { value: anotherPSL, name: secondUsername },
      ]);
    });

    it('assigns a psl to multiple users via onBehalfOf (partial success)', () => {
      // sales console user can't be assigned to a platform license
      const anotherPSL = 'SalesConsoleUser';
      const originalUsername = session.orgs.get('default')?.username;

      const secondUsername = execCmd<CreateUserOutput>(
        `org:create:user --json -f ${join('config', 'chatterUser.json')}`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.fields.username as string;

      const commandResult = execCmd<PSLResult>(
        `org:assign:permsetlicense -n ${anotherPSL} -b ${originalUsername} ${secondUsername} --json`,
        {
          ensureExitCode: 68,
        }
      ).jsonOutput?.result;

      expect(commandResult?.failures).to.have.length(1);
      expect(commandResult?.failures[0].name).to.equal(secondUsername);
      expect(commandResult?.failures[0].message).to.include("user license doesn't support it");
      expect(commandResult?.successes).to.deep.equal([{ value: anotherPSL, name: originalUsername }]);
    });
  });

  after(async () => {
    await session.zip(undefined, 'artifacts');
    await session.clean();
  });
});
