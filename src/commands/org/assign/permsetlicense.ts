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

import { Messages } from '@salesforce/core';
import { arrayWithDeprecation, Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { ensureArray } from '@salesforce/kit';
import {
  aggregate,
  assignPSL,
  print,
  PSLResult,
  resultsToExitCode,
} from '../../../baseCommands/user/permsetlicense/assign.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'permsetlicense.assign');

export class AssignPermSetLicenseCommand extends SfCommand<PSLResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      required: true,
      aliases: ['perm-set-license', 'psl'],
      multiple: true,
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
    const result = aggregate(
      await Promise.all(
        flags.name.map((pslName) =>
          assignPSL({
            conn: flags['target-org'].getConnection(flags['api-version']),
            pslName,
            usernamesOrAliases: ensureArray(flags['on-behalf-of'] ?? flags['target-org'].getUsername()),
          })
        )
      )
    );

    process.exitCode = resultsToExitCode(result);
    if (!this.jsonEnabled()) {
      print(result);
    }
    return result;
  }
}
