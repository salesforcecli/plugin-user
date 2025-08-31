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

import { Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { ensureArray } from '@salesforce/kit';
import { GenerateResult, UserPasswordGenerateBaseCommand } from '../../../baseCommands/user/password/generate.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

export type PasswordData = {
  username?: string;
  password: string;
};

export class GenerateUserPasswordCommand extends UserPasswordGenerateBaseCommand {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'on-behalf-of': Flags.string({
      aliases: ['onbehalfof'],
      deprecateAliases: true,
      char: 'b',
      summary: messages.getMessage('flags.onBehalfOf.summary'),
      multiple: true,
      parse: (input): Promise<string> => {
        if (input.includes(',')) {
          throw messages.createError('onBehalfOfMultipleError');
        }
        return Promise.resolve(input);
      },
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
    'target-org': Flags.requiredOrg({ required: true }),
    'api-version': Flags.orgApiVersion(),
  };

  public async run(): Promise<GenerateResult> {
    const { flags } = await this.parse(GenerateUserPasswordCommand);
    return this.generate({
      usernames: ensureArray(flags['on-behalf-of'] ?? flags['target-org'].getUsername()),
      length: flags.length,
      complexity: flags.complexity,
      conn: flags['target-org'].getConnection(flags['api-version']),
    });
  }
}
