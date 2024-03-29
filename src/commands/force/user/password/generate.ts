/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { arrayWithDeprecation, Flags, loglevel, orgApiVersionFlagWithDeprecations } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { ensureArray } from '@salesforce/kit';
import { GenerateResult, UserPasswordGenerateBaseCommand } from '../../../../baseCommands/user/password/generate.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

export class ForceUserPasswordGenerateCommand extends UserPasswordGenerateBaseCommand {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'deprecated';
  public static readonly deprecationOptions = {
    to: 'org generate password',
  };
  public static readonly hidden = true;
  public static readonly flags = {
    'on-behalf-of': arrayWithDeprecation({
      aliases: ['onbehalfof'],
      deprecateAliases: true,
      char: 'o',
      summary: messages.getMessage('flags.onBehalfOf.summary'),
    }),
    length: Flags.integer({
      char: 'l',
      summary: messages.getMessage('flags.length.summary'),
      min: 8,
      max: 1000,
      default: 13,
    }),
    // the higher the value, the stronger the password
    complexity: Flags.integer({
      char: 'c',
      summary: messages.getMessage('flags.complexity.summary'),
      min: 0,
      max: 5,
      default: 5,
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

  public async run(): Promise<GenerateResult> {
    const { flags } = await this.parse(ForceUserPasswordGenerateCommand);
    return this.generate({
      usernames: ensureArray(flags['on-behalf-of'] ?? flags['target-org'].getUsername()),
      length: flags.length,
      complexity: flags.complexity,
      conn: flags['target-org'].getConnection(flags['api-version']),
    });
  }
}
