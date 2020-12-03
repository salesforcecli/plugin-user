/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { exec, exec2JSON } from '@mshanemc/plugin-helpers';
import testutils = require('@mshanemc/plugin-helpers/dist/testutilsChai');

import fs = require('fs-extra');
import { expect } from 'chai';
import * as chai from 'chai';
import * as subset from 'chai-subset';

chai.use(subset);
// add a unique folder name for this test
const testProjectName = 'testProjectUserDisplay';

describe('UserDisplay tests', () => {
  // some tests run locally (operate on metadata, use filesystem, but don't need an org)
  // this flag makes the org optional
  if (!process.env.LOCALONLY) {
    // jest.setTimeout(testutils.remoteTimeout);

    before(async () => {
      await fs.remove(testProjectName);
      await exec(`sfdx force:project:create -n ${testProjectName}`);
      await testutils.orgCreate(testProjectName);
    });

    it('runs the command with --json', async () => {
      const commandResult = await exec2JSON('sfdx force:user:display --json', {
        cwd: testProjectName,
      });
      // console.log(JSON.stringify(commandResult.result.searchRecords));
      expect(commandResult).to.have.property('status').equal(0);
      expect(commandResult.result).to.be.an('object').with.property('username');
      expect(commandResult.result).to.have.property('profileName');
      expect(commandResult.result).to.have.property('id');
      expect(commandResult.result).to.have.property('orgId');
      expect(commandResult.result).to.have.property('instanceUrl');
      expect(commandResult.result).to.have.property('accessToken');
      expect(commandResult.result).to.have.property('loginUrl');
    });

    after(async () => {
      await testutils.orgDelete(testProjectName);
      await fs.remove(testProjectName);
    });
  }
});
