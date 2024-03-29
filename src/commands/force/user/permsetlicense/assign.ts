/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import {
  arrayWithDeprecation,
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';
import { ensureArray } from '@salesforce/kit';
import { assignPSL, print, PSLResult, resultsToExitCode } from '../../../../baseCommands/user/permsetlicense/assign.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'permsetlicense.assign');

export class ForceUserPermSetLicenseAssignCommand extends SfCommand<PSLResult> {
  public static readonly hidden = true;
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'deprecated';
  public static readonly deprecationOptions = {
    to: 'org assign permsetlicense',
  };
  public static readonly flags = {
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      required: true,
      aliases: ['perm-set-license', 'psl'],
    }),
    'on-behalf-of': arrayWithDeprecation({
      char: 'b',
      summary: messages.getMessage('flags.onBehalfOf.summary'),
      aliases: ['onbehalfof'],
      deprecateAliases: true,
    }),
    'target-org': Flags.requiredOrg({
      char: 'u',
      summary: messages.getMessage('flags.target-org.summary'),
      aliases: ['targetusername'],
      deprecateAliases: true,
      required: true,
    }),
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
  };

  public async run(): Promise<PSLResult> {
    const { flags } = await this.parse(ForceUserPermSetLicenseAssignCommand);
    const result = await assignPSL({
      conn: flags['target-org'].getConnection(flags['api-version']),
      pslName: flags.name,
      usernamesOrAliases: ensureArray(flags['on-behalf-of'] ?? flags['target-org'].getUsername()),
    });
    process.exitCode = resultsToExitCode(result);
    if (!this.jsonEnabled()) {
      print(result);
    }
    return result;
  }
}
