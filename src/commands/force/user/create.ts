/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import {
  Aliases,
  AuthInfo,
  Connection,
  DefaultUserFields,
  fs,
  Logger,
  Messages,
  Org,
  SfdxError,
  User,
  UserFields,
} from '@salesforce/core';
import { QueryResult } from 'jsforce';
import { getString, Dictionary, isArray } from '@salesforce/ts-types';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'create');

interface SuccessMsg {
  name: string;
  value: string;
}

interface FailureMsg {
  name: string;
  message: string;
}

export class UserCreateCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly requiresDevhubUsername = true;
  public static readonly varargs = true;
  public static readonly flagsConfig: FlagsConfig = {
    setalias: flags.string({
      char: 'a',
      description: messages.getMessage('flags.alias'),
    }),
    definitionfile: flags.string({
      char: 'f',
      description: messages.getMessage('flags.definitionfile'),
    }),
  };
  public logger: Logger;
  public org: Org;

  private user: User;
  private successes: SuccessMsg[] = [];
  private failures: FailureMsg[] = [];
  private authInfo: AuthInfo;

  /**
   * removes fields that cause errors in salesforce api's within sfdx-core's createUser method
   *
   * @param fields a list of combined fields from varargs and the config file
   * @private
   */
  private static stripInvalidAPIFields(fields: UserFields & Dictionary<string>): UserFields {
    const copy = Object.assign({}, fields);
    // remove invalid fields for userCreate()
    delete copy.permsets;
    delete copy.generatepassword;
    delete copy.generatePassword;
    delete copy.profileName;
    return copy as UserFields;
  }

  public async run(): Promise<UserFields> {
    this.logger = await Logger.child(this.constructor.name);
    const defaultUserFields: DefaultUserFields = await DefaultUserFields.create({
      templateUser: this.org.getUsername(),
    });
    this.user = await User.create({ org: this.org });

    // merge defaults with provided values with cli > file > defaults
    const fields = await this.aggregateFields(defaultUserFields.getFields());
    try {
      this.authInfo = await this.user.createUser(UserCreateCommand.stripInvalidAPIFields(fields));
    } catch (e) {
      await this.catchCreateUser(e, fields);
    }

    if (fields.profileName) await this.authInfo.save({ userProfileName: fields.profileName });

    // Assign permission sets to the created user
    if (fields.permsets) {
      try {
        // permsets can be passed from cli args or file we need to create an array of permset names either way it's passed
        // it will either be a comma separated string, or an array, force it into an array
        const permsetArray: string[] = isArray<string>(fields.permsets)
          ? fields.permsets
          : fields.permsets.trim().split(',');

        await this.user.assignPermissionSets(fields.id, permsetArray);
        this.successes.push({
          name: 'Permission Set Assignment',
          value: permsetArray.join(','),
        });
      } catch (err) {
        this.failures.push({
          name: 'Permission Set Assignment',
          message: err.message,
        });
      }
    }

    // Generate and set a password if specified
    if (fields.generatePassword) {
      try {
        const password = User.generatePasswordUtf8();
        await this.user.assignPassword(this.authInfo, password);
        password.value((pass: Buffer) => {
          this.authInfo.save({ password: pass.toString('utf-8') });
          this.successes.push({
            name: 'Password Assignment',
            value: pass.toString(),
          });
        });
      } catch (err) {
        this.failures.push({
          name: 'Password Assignment',
          message: err.message,
        });
      }
    }

    // Set the alias if specified
    if (this.flags.setalias) {
      const alias: Aliases = await Aliases.create(Aliases.getDefaultOptions());
      alias.set(this.flags.setalias, fields.username);
      await alias.write();
    }

    this.print(fields);

    return Object.assign({ orgId: this.org.getOrgId() }, fields);
  }

  private async catchCreateUser(respBody: Error, fields: UserFields): Promise<void> {
    // For Gacks, the error message is on response.body[0].message but for handled errors
    // the error message is on response.body.Errors[0].description.
    const errMessage = getString(respBody, 'message') || 'Unknown Error';
    const conn: Connection = this.org.getConnection();

    // Provide a more user friendly error message for certain server errors.
    if (errMessage.includes('LICENSE_LIMIT_EXCEEDED')) {
      const res = await conn.query(`SELECT name FROM profile WHERE id='${fields.profileId}'`);
      const profileName = getString(res, 'records[0].Name');
      throw SfdxError.create('@salesforce/plugin-user', 'create', 'licenseLimitExceeded', [profileName]);
    } else if (errMessage.includes('DUPLICATE_USERNAME')) {
      throw SfdxError.create('@salesforce/plugin-user', 'create', 'duplicateUsername', [fields.username]);
    } else {
      throw SfdxError.wrap(errMessage);
    }
  }

  private lowerFirstLetter(word: string): string {
    return word[0].toLowerCase() + word.substr(1);
  }

  private async aggregateFields(defaultFields: UserFields): Promise<UserFields & Dictionary<string>> {
    // start with the default fields, then add the fields from the file, then (possibly overwritting) add the fields from the cli varargs param
    if (this.flags.definitionfile) {
      const content = await fs.readJson(this.flags.definitionfile);
      Object.keys(content).forEach((key) => {
        // cast entries to lowercase to standardize
        defaultFields[this.lowerFirstLetter(key)] = content[key];
      });
    }

    if (this.varargs) {
      Object.keys(this.varargs).forEach((key) => {
        defaultFields[this.lowerFirstLetter(key)] = this.varargs[key];
      });
    }

    // check if "profileName" was passed, this needs to become a profileId before calling User.create
    if (defaultFields['profileName']) {
      const name: string = defaultFields['profileName'] || 'Standard User';
      this.logger.debug(`Querying org for profile name [${name}]`);
      const response: QueryResult<{ Id: string }> = await this.org
        .getConnection()
        .query(`SELECT id FROM profile WHERE name='${name}'`);
      defaultFields.profileId = response.records[0].Id;
    }

    // the file schema is camelCase and boolean while the cli arg is no capitialization and a string
    // we will add logic to capture camelcase in varargs just in case
    if (
      defaultFields['generatepassword'] === 'true' ||
      defaultFields['generatePassword'] === 'true' ||
      defaultFields['generatePassword'] === true
    ) {
      // since only one may be set, set both variations, prefer camelCase and boolean for coding
      // this will also maintain --json backwards compatibility for the all lower case scenario
      defaultFields['generatepassword'] = 'true';
      defaultFields['generatePassword'] = true;
    }

    return defaultFields;
  }

  private print(fields: UserFields): void {
    const userCreatedSuccessMsg = messages.getMessage('success', [
      fields.username,
      fields.id,
      this.org.getOrgId(),
      os.EOL,
      fields.username,
    ]);

    // we initialize to be an empty array to be able to push onto it
    // so we need to check that the size is greater than 0 to know we had a failure
    if (this.failures.length > 0) {
      this.ux.styledHeader('Partial Success');
      this.ux.log(userCreatedSuccessMsg);
      this.ux.log('');
      this.ux.styledHeader('Failures');
      this.ux.table(this.failures, {
        columns: [
          { key: 'name', label: 'Action' },
          { key: 'message', label: 'Error Message' },
        ],
      });
    } else {
      this.ux.log(userCreatedSuccessMsg);
    }
  }
}

export default UserCreateCommand;
