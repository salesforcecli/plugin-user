/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { ensureArray } from '@salesforce/kit';
import { GenerateResult, UserPasswordGenerateBaseCommand } from '../../../baseCommands/user/password/generate';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

export type PasswordData = {
  username?: string;
  password: string;
};

export class UserPasswordGenerateCommand extends UserPasswordGenerateBaseCommand {
  public static readonly aliases = ['org:generate:password'];
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'on-behalf-of': Flags.string({
      char: 'b',
      description: messages.getMessage('flags.onBehalfOf'),
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
      description: messages.getMessage('flags.length'),
      min: 8,
      max: 1000,
      default: 13,
    }),
    // the higher the value, the stronger the password
    complexity: Flags.integer({
      char: 'c',
      description: messages.getMessage('flags.complexity'),
      min: 0,
      max: 5,
      default: 5,
    }),
    'target-org': Flags.requiredOrg({ required: true }),
    'api-version': Flags.orgApiVersion(),
  };

  public async run(): Promise<GenerateResult> {
    const { flags } = await this.parse(UserPasswordGenerateCommand);
    this.usernames = ensureArray(flags['on-behalf-of'] ?? flags['target-org'].getUsername());
    this.length = flags.length;
    this.complexity = flags.complexity;
    this.org = flags['target-org'];
    this.connection = this.org.getConnection(flags['api-version']);
    return this.generate();
  }
}