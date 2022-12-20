/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { PSLResult } from '../../../../src/baseCommands/user/permsetlicense/assign';
import { UserCreateOutput } from '../../../../src/commands/user/create';

describe('PermissionSetLicense tests', () => {
  const testPSL = 'IdentityConnect';
  let session: TestSession;

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

  it('assigns a psl to default user', () => {
    const commandResult = execCmd<PSLResult>(`user:permsetlicense:assign -n ${testPSL} --json`, {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(commandResult?.failures).to.be.an('array').with.length(0);
    expect(commandResult?.successes.every((success) => success.value === testPSL)).to.be.true;
    expect(commandResult).to.not.have.property('warnings');
  });

  it('assigns a psl to default user successfully if already assigned', () => {
    const commandResult = execCmd<PSLResult>(`user:permsetlicense:assign -n ${testPSL} --json`, {
      ensureExitCode: 0,
    }).jsonOutput as { status: number; result: PSLResult; warnings: string[] };
    expect(commandResult.result.failures).to.be.an('array').with.length(0);
    expect(commandResult.result.successes.every((success) => success.value === testPSL)).to.be.true;
    expect(commandResult.warnings).to.be.an('array').with.length(1);
    expect(commandResult.warnings[0]).to.include(testPSL);
  });

  it('fails for non-existing psl', () => {
    const badPSL = 'badPSL';
    execCmd<PSLResult>(`user:permsetlicense:assign -n ${badPSL} --json`, {
      ensureExitCode: 1,
    });
  });

  describe('multiple PSL via onBehalfOf', () => {
    it('assigns a psl to multiple users via onBehalfOf', async () => {
      const anotherPSL = 'SurveyCreatorPsl';
      const originalUsername = session.orgs.get('default')?.username;

      expect(originalUsername).to.be.a('string');
      // create a second user
      const secondUsername = execCmd<UserCreateOutput>(
        `user:create --json -a Other -f ${path.join('config', 'fullUser.json')}`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.fields.username as string;
      expect(secondUsername).to.be.a('string');
      const commandResult = execCmd<PSLResult>(
        `user:permsetlicense:assign -n ${anotherPSL} -o ${originalUsername},Other --json`,
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

    it('assigns a psl to multiple users via onBehalfOf (partial success)', async () => {
      // sales console user can't be assigned to a platform license
      const anotherPSL = 'SalesConsoleUser';
      const originalUsername = session.orgs.get('default')?.username;

      const secondUsername = execCmd<UserCreateOutput>(
        `user:create --json -f ${path.join('config', 'chatterUser.json')}`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result.fields.username as string;

      const commandResult = execCmd<PSLResult>(
        `user:permsetlicense:assign -n ${anotherPSL} -o ${originalUsername},${secondUsername} --json`,
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
