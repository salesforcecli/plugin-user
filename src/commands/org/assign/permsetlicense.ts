/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { arrayWithDeprecation, Flags } from '@salesforce/sf-plugins-core';
import { ensureArray } from '@salesforce/kit';
import { PSLResult, UserPermSetLicenseAssignBaseCommand } from '../../../baseCommands/user/permsetlicense/assign';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'permsetlicense.assign');

export class AssignPermSetLicenseCommand extends UserPermSetLicenseAssignBaseCommand {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
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
    'target-org': Flags.requiredOrg({ summary: messages.getMessage('flags.target-org.summary'), required: true }),
    'api-version': Flags.orgApiVersion(),
  };

  public async run(): Promise<PSLResult> {
    const { flags } = await this.parse(AssignPermSetLicenseCommand);
    const username = flags['target-org'].getUsername();
    this.usernamesOrAliases = ensureArray(flags['on-behalf-of'] ?? username);
    this.pslName = flags.name;
    this.connection = flags['target-org'].getConnection(flags['api-version']);
    return this.assign();
  }
}