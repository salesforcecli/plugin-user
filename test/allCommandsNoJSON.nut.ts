/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join } from 'node:path';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

// const projectPath = 'testProject_AllUserCommandsNoJSON';
let session: TestSession;

describe('verifies all commands run successfully (no json)', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        // destinationDir: projectPath,
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
    execCmd('org:display:user', { ensureExitCode: 0 });
  });

  it('assigns a permset to the default user', () => {
    execCmd('org:assign:permset -n VolunteeringApp', { ensureExitCode: 0 });
  });

  it('creates a secondary user', () => {
    execCmd('org:create:user -a Other', { ensureExitCode: 0 });
  });

  it('assigns permset to the secondary user', () => {
    execCmd('org:assign:permset -n VolunteeringApp --onbehalfof Other', {
      ensureExitCode: 0,
    });
  });

  it('lists the users', () => {
    execCmd('org:list:users', { ensureExitCode: 0 });
  });

  it('generates new passwords for main user', () => {
    execCmd('org:generate:password', { ensureExitCode: 0 });
  });

  it('generates new password for secondary user (onbehalfof)', () => {
    execCmd('org:generate:password -b Other', { ensureExitCode: 0 });
  });

  it('assigns 2 permsets to the main user', () => {
    execCmd('org:assign:permset -n PS2 PS3', { ensureExitCode: 0 });
  });

  it('assigns 2 permsets to the secondary user', () => {
    execCmd('org:assign:permset -n PS2 PS3 -b Other', { ensureExitCode: 0 });
  });

  after(async () => {
    await session.zip(undefined, 'artifacts');
    await session.clean();
  });
});
