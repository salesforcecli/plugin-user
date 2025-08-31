/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Messages, Org } from '@salesforce/core';
import { Flags, arrayWithDeprecation, loglevel, orgApiVersionFlagWithDeprecations } from '@salesforce/sf-plugins-core';
import { ensureArray } from '@salesforce/kit';
import { PermsetAssignResult, UserPermSetAssignBaseCommand } from '../../../../baseCommands/user/permset/assign.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'permset.assign');

export class ForceUserPermSetAssignCommand extends UserPermSetAssignBaseCommand {
  public static readonly hidden = true;
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description.force');
  public static readonly examples = messages.getMessages('examples.force');
  public static readonly state = 'deprecated';
  public static readonly deprecationOptions = {
    to: 'org assign permset',
  };
  public static readonly flags = {
    'perm-set-name': arrayWithDeprecation({
      aliases: ['permsetname'],
      deprecateAliases: true,
      char: 'n',
      summary: messages.getMessage('flags.permsetName.summary'),
      required: true,
    }),
    'on-behalf-of': arrayWithDeprecation({
      char: 'o',
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

  public async run(): Promise<PermsetAssignResult> {
    const { flags } = await this.parse(ForceUserPermSetAssignCommand);
    this.aliasOrUsernames = ensureArray(flags['on-behalf-of'] ?? flags['target-org'].getUsername());
    this.permSetNames = flags['perm-set-name'];
    this.connection = flags['target-org'].getConnection(flags['api-version']);
    this.org = await Org.create({ connection: this.connection });
    return this.assign();
  }
}
