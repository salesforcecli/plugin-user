/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Aliases, Connection, Messages, User, AuthInfo, Org, UserFields, SfdxError } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'permsetlicense.assign');

type SuccessMsg = {
  name: string;
  value: string;
};

type FailureMsg = {
  name: string;
  message: string;
};

type Result = {
  successes: SuccessMsg[];
  failures: FailureMsg[];
};

export class UserPermsetLicenseAssignCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    name: flags.string({
      char: 'n',
      description: messages.getMessage('flags.name'),
      required: true,
    }),
    onbehalfof: flags.array({
      char: 'o',
      description: messages.getMessage('flags.onBehalfOf'),
    }),
  };
  private usernames: string[];
  private readonly successes: SuccessMsg[] = [];
  private readonly failures: FailureMsg[] = [];

  public async run(): Promise<Result> {
    try {
      if (this.flags.onbehalfof) {
        // trim the usernames to avoid whitespace
        // @Reflect: is there a reason this isn't part of the flags.array's default behavior?
        this.usernames = this.flags.onbehalfof.map((user) => user.trim());
      } else {
        this.usernames = [this.org.getUsername()];
      }

      // @Reflect: why not Promise.all these?  any reason to run them sequentially?
      // @Reflect: permset can work across users/orgs.  it'd be way simpler to make the user an input and limit it to one PSL at a time.  I kept the approach for consistency
      for (const username of this.usernames) {
        // Convert any aliases to usernames
        const aliasOrUsername = (await Aliases.fetch(username)) || username;
        const connection: Connection = await Connection.create({
          authInfo: await AuthInfo.create({ username }),
        });
        const org = await Org.create({ connection });
        const user: User = await User.create({ org });
        const fields: UserFields = await user.retrieve(username);

        // @Reflect: putting this.flags.name into the template literal gives https://github.com/typescript-eslint/typescript-eslint/blob/v2.34.0/packages/eslint-plugin/docs/rules/restrict-template-expressions.md,
        // so I have to cast it even though flags **should** know its type.
        const pslName = this.flags.name as string;

        const psl =
          // find the psl id
          // @Reflect: this is such a common pattern I did this to share logic https://github.com/mshanemc/plugin-helpers/blob/master/src/queries.ts
          // Another useful feature: returning the list of possible PermissionSetLicenses using returnChoices = true, choiceField = 'Master Label'.
          // Current approach throws           message: "Cannot read property 'Id' of undefined",
          // probably belongs in core connection
          (
            await connection.query(
              `select Id from PermissionSetLicense where DeveloperName = '${pslName}' or MasterLabel = '${pslName}'`
            )
          ).records[0] as PermissionSetLicense;

        // @Reflect: --dev-debug vs. --verbose approach.  For customers who want to know what's happening.
        // verbose is for human-readable
        if (!this.flags.json && this.flags.verbose) {
          this.ux.logJson(psl);
        }
        try {
          await connection.sobject('PermissionSetLicenseAssign').create({
            AssigneeId: fields.id,
            PermissionSetLicenseId: psl.Id,
          });
          this.successes.push({
            name: aliasOrUsername,
            value: this.flags.name,
          });
        } catch (e) {
          // @Reflect: idempotency.  If they already have it, the API will throw an error.  But should it?  Would it be better to think, "oh, it's already the way you wanted it, so we're all good"
          if (e.message.startsWith('duplicate value found')) {
            this.successes.push({
              name: aliasOrUsername,
              value: this.flags.name,
            });
          } else {
            this.failures.push({
              name: aliasOrUsername,
              message: e.message,
            });
          }
        }
      }
    } catch (e) {
      // @Reflect: is this a "we should always wrap the whole thing in try/catch just in case?"
      throw SfdxError.wrap(e);
    }

    this.print();

    const result: Result = {
      successes: this.successes,
      failures: this.failures,
    };

    return result;
  }

  private print(): void {
    if (this.successes.length > 0) {
      this.ux.styledHeader('Permset Licenses Assigned');
      this.ux.table(this.successes, {
        columns: [
          { key: 'name', label: 'Username' },
          { key: 'value', label: 'Permission Set License Assignment' },
        ],
      });
    }

    if (this.failures.length > 0) {
      if (this.successes.length > 0) {
        this.ux.log('');
      }

      this.ux.styledHeader('Failures');
      this.ux.table(this.failures, {
        columns: [
          { key: 'name', label: 'Username' },
          { key: 'message', label: 'Error Message' },
        ],
      });
    }
  }
}

// @Reflect there must be some standardized types for sobjects somewhere, right?
interface PermissionSetLicense {
  Id: string;
}
