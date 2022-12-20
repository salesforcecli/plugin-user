/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';

import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';

// const projectPath = 'testProject_AllUserCommandsNoJSON';
let session: TestSession;

describe('verifies all commands run successfully (no json)', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        // destinationDir: projectPath,
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

  it('user display', () => {
    execCmd('user:display', { ensureExitCode: 0 });
  });

  it('assigns a permset to the default user', () => {
    execCmd('user:permset:assign -n VolunteeringApp', { ensureExitCode: 0 });
  });

  it('creates a secondary user', () => {
    execCmd('user:create -a Other', { ensureExitCode: 0 });
  });

  it('assigns permset to the secondary user', () => {
    execCmd('user:permset:assign -n VolunteeringApp --onbehalfof Other', {
      ensureExitCode: 0,
    });
  });

  it('lists the users', () => {
    execCmd('user:list', { ensureExitCode: 0 });
  });

  it('generates new passwords for main user', () => {
    execCmd('user:password:generate', { ensureExitCode: 0 });
  });

  it('generates new password for secondary user (onbehalfof)', () => {
    execCmd('user:password:generate -o Other', { ensureExitCode: 0 });
  });

  it('assigns 2 permsets to the main user', () => {
    execCmd('user:permset:assign -n PS2,PS3', { ensureExitCode: 0 });
  });

  it('assigns 2 permsets to the secondary user', () => {
    execCmd('user:permset:assign -n PS2,PS3 -o Other', { ensureExitCode: 0 });
  });

  after(async () => {
    await session.zip(undefined, 'artifacts');
    await session.clean();
  });
});
