/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Aliases, AuthInfo, Connection, Messages, Org, SfdxError, User } from '@salesforce/core';
Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'password.generate');

interface PasswordData {
  username?: string;
  password: string;
}

interface PasswordConditions {
  length: number;
  complexity: number;
}

interface OrgPasswordPolicy {
  passwordPolicies?: {
    minimumPasswordLength: number;
    complexity: string;
  };
}

enum PasswordComplexityTypes {
  NoRestriction = 0,
  AlphaNumeric = 1,
  UpperLowerCaseNumeric = 3,
  UpperLowerCaseNumericSpecialCharacters = 4,
  Any3UpperLowerCaseNumericSpecialCharacters = 5,
  SpecialCharacters = 5,
}

export class UserPasswordGenerateCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly requiresDevhubUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    onbehalfof: flags.array({
      char: 'o',
      description: messages.getMessage('flags.onBehalfOf'),
    }),
  };
  public org: Org;

  private usernames: string[];
  private passwordData: PasswordData[] = [];

  public async run(): Promise<PasswordData[] | PasswordData> {
    this.usernames = (this.flags.onbehalfof as string[]) ?? [this.org.getUsername()];

    for (const aliasOrUsername of this.usernames) {
      try {
        // Convert any aliases to usernames
        // fetch will return undefined if there's no Alias for that name
        const username = (await Aliases.fetch(aliasOrUsername)) || aliasOrUsername;

        const authInfo: AuthInfo = await AuthInfo.create({ username });
        const connection: Connection = await Connection.create({ authInfo });
        const org = await Org.create({ connection });
        const user: User = await User.create({ org });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list: any = await connection.metadata.list({ type: 'ProfilePasswordPolicy' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const profPasswordPolicies: any = await connection.metadata.read('ProfilePasswordPolicy', [list.fullName]);
        const passwordCondition: PasswordConditions = {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          length: profPasswordPolicies.minimumPasswordLength,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          complexity: profPasswordPolicies.passwordComplexity,
        };

        if (!passwordCondition.length || !passwordCondition.complexity) {
          const orgPasswordPolicies = await connection.metadata.read('SecuritySettings', ['passwordPolicies']);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const orgPasswordPolicy: OrgPasswordPolicy = JSON.parse(JSON.stringify(orgPasswordPolicies));
          passwordCondition.length = passwordCondition.length
            ? passwordCondition.length
            : orgPasswordPolicy.passwordPolicies.minimumPasswordLength;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          passwordCondition.complexity = passwordCondition.complexity
            ? passwordCondition.length
            : PasswordComplexityTypes[orgPasswordPolicy.passwordPolicies.complexity];
        }
        const password = User.generatePasswordUtf8(passwordCondition);
        // we only need the Id, so instead of User.retrieve we'll just query
        // this avoids permission issues if ProfileId is restricted for the user querying for it
        const result: { Id: string } = await connection.singleRecordQuery(
          `SELECT Id FROM User WHERE Username='${username}'`
        );
        // userId is used by `assignPassword` so we need to set it here
        authInfo.getFields().userId = result.Id;
        await user.assignPassword(authInfo, password);

        password.value((pass) => {
          this.passwordData.push({ username, password: pass.toString('utf-8') });
          authInfo.update({ password: pass.toString('utf-8') });
        });

        await authInfo.save();
      } catch (e) {
        const err = e as SfdxError;
        if (
          err.message.includes('Cannot set password for self') ||
          err.message.includes('The requested Resource does not exist')
        ) {
          // we don't have access to the apiVersion from what happened in the try, so until v51 is r2, we have to check versions the hard way
          const authInfo: AuthInfo = await AuthInfo.create({ username: aliasOrUsername });
          const connection: Connection = await Connection.create({ authInfo });
          const org = await Org.create({ connection });
          if (parseInt(await org.retrieveMaxApiVersion(), 10) >= 51) {
            throw new SfdxError(
              messages.getMessage('noSelfSetError'),
              'noSelfSetError',
              messages.getMessage('noSelfSetErrorActions').split(os.EOL)
            );
          }
          throw new SfdxError(messages.getMessage('noSelfSetErrorV50'), 'noSelfSetError');
        }
        throw SfdxError.wrap(err);
      }
    }

    this.print();

    return this.passwordData.length === 1 ? this.passwordData[0] : this.passwordData;
  }

  private print(): void {
    if (this.passwordData) {
      const successMsg = messages.getMessage('success', [this.passwordData[0].password, this.passwordData[0].username]);
      const viewMsg = messages.getMessage('viewWithCommand', [this.passwordData[0].username]);
      this.ux.log(`${successMsg}${os.EOL}${viewMsg}`);
    } else {
      this.ux.log(messages.getMessage('successMultiple', [os.EOL]));
      const columnData = {
        columns: [
          { key: 'username', label: 'USERNAME' },
          { key: 'password', label: 'PASSWORD' },
        ],
      };
      this.ux.table(this.passwordData, columnData);
    }
  }
}
