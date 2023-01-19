/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages, Org } from '@salesforce/core';
import { Flags } from '@salesforce/sf-plugins-core';
import { ensureArray } from '@salesforce/kit';
import { PermsetAssignResult, UserPermSetAssignBaseCommand } from '../../../baseCommands/user/permset/assign';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'permset.assign');

export class UserPermSetAssignCommand extends UserPermSetAssignBaseCommand {
  public static readonly aliases = ['org:assign:permset'];
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'perm-set-name': Flags.string({
      aliases: ['permsetname', 'name'],
      deprecateAliases: true,
      char: 'n',
      summary: messages.getMessage('flags.permsetName.summary'),
      required: true,
      multiple: true,
    }),
    'on-behalf-of': Flags.string({
      char: 'b',
      summary: messages.getMessage('flags.onBehalfOf.summary'),
      aliases: ['onbehalfof'],
      deprecateAliases: true,
      multiple: true,
    }),
    'target-org': Flags.requiredOrg({ summary: messages.getMessage('flags.target-org.summary'), required: true }),
    'api-version': Flags.orgApiVersion(),
  };

  public async run(): Promise<PermsetAssignResult> {
    const { flags } = await this.parse(UserPermSetAssignCommand);
    this.aliasOrUsernames = ensureArray(flags['on-behalf-of'] ?? flags['target-org'].getUsername());
    this.permSetNames = flags['perm-set-name'];
    this.connection = flags['target-org'].getConnection(flags['api-version']);
    this.org = await Org.create({ connection: this.connection });
    return this.assign();
  }
}
