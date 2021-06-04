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
  REQUIRED_FIELDS,
  SfdxError,
  User,
  UserFields,
} from '@salesforce/core';
import { omit, mapKeys } from '@salesforce/kit';
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

const permsetsStringToArray = (fieldsPermsets: string | string[]): string[] => {
  if (!fieldsPermsets) return [];
  return isArray<string>(fieldsPermsets)
    ? fieldsPermsets
    : fieldsPermsets.split(',').map((item) => item.replace("'", '').trim());
};

const standardizePasswordToBoolean = (input: unknown): boolean => {
  if (typeof input === 'boolean') {
    return input;
  }
  if (typeof input === 'string') {
    if (input.toLowerCase() === 'true') {
      return true;
    }
  }
  return false;
};

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
    setuniqueusername: flags.boolean({
      char: 's',
      description: messages.getMessage('flags.setuniqueusername'),
    }),
  };
  public logger: Logger;
  public org: Org;

  private user: User;
  private successes: SuccessMsg[] = [];
  private failures: FailureMsg[] = [];
  private authInfo: AuthInfo;

  /**
   * removes fields that cause errors in salesforce APIs within sfdx-core's createUser method
   *
   * @param fields a list of combined fields from varargs and the config file
   * @private
   */
  private static stripInvalidAPIFields(fields: UserFields & Dictionary<string>): UserFields {
    return omit(fields, ['permsets', 'generatepassword', 'generatePassword', 'profileName']);
  }

  public async run(): Promise<UserCreateOutput> {
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
        const permsetArray = permsetsStringToArray(fields.permsets);

        await this.user.assignPermissionSets(this.authInfo.getFields().userId, permsetArray);
        this.successes.push({
          name: 'Permission Set Assignment',
          value: permsetArray.join(','),
        });
      } catch (error) {
        const err = error as SfdxError;
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
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.authInfo.save({ password: pass.toString('utf-8') });
          this.successes.push({
            name: 'Password Assignment',
            value: pass.toString(),
          });
        });
      } catch (error) {
        const err = error as SfdxError;
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

    fields.id = this.authInfo.getFields().userId;
    this.print(fields);

    const { permsets, ...fieldsWithoutPermsets } = fields;
    return {
      orgId: this.org.getOrgId(),
      permissionSetAssignments: permsetsStringToArray(permsets),
      fields: { ...mapKeys(fieldsWithoutPermsets, (value, key) => key.toLowerCase()) },
    };
  }

  private async catchCreateUser(respBody: Error, fields: UserFields): Promise<void> {
    // For Gacks, the error message is on response.body[0].message but for handled errors
    // the error message is on response.body.Errors[0].description.
    const errMessage = getString(respBody, 'message') || 'Unknown Error';
    const conn: Connection = this.org.getConnection();

    // Provide a more user friendly error message for certain server errors.
    if (errMessage.includes('LICENSE_LIMIT_EXCEEDED')) {
      const profile = await conn.singleRecordQuery<{ Name: string }>(
        `SELECT name FROM profile WHERE id='${fields.profileId}'`
      );
      throw SfdxError.create('@salesforce/plugin-user', 'create', 'licenseLimitExceeded', [profile.Name]);
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
    // username can be overridden both in the file or varargs, save it to check if it was changed somewhere
    const defaultUsername = defaultFields.username;

    // start with the default fields, then add the fields from the file, then (possibly overwritting) add the fields from the cli varargs param
    if (this.flags.definitionfile) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
      const content = (await fs.readJson(this.flags.definitionfile)) as UserFields;
      Object.keys(content).forEach((key) => {
        // cast entries to lowercase to standardize
        defaultFields[this.lowerFirstLetter(key)] = content[key] as keyof typeof REQUIRED_FIELDS;
      });
    }

    if (this.varargs) {
      Object.keys(this.varargs).forEach((key) => {
        if (key.toLowerCase() === 'generatepassword') {
          // standardize generatePassword casing
          defaultFields['generatePassword'] = standardizePasswordToBoolean(this.varargs[key]);
        } else if (key.toLowerCase() === 'profilename') {
          // standardize profileName casing
          defaultFields['profileName'] = this.varargs[key];
        } else {
          // all other varargs are left "as is"
          defaultFields[this.lowerFirstLetter(key)] = this.varargs[key];
        }
      });
    }

    // check if "username" was passed along with "setuniqueusername" flag, if so append org id
    if (this.flags.setuniqueusername && defaultFields.username !== defaultUsername) {
      defaultFields.username = `${defaultFields.username}.${this.org.getOrgId().toLowerCase()}`;
    }

    // check if "profileName" was passed, this needs to become a profileId before calling User.create
    if (defaultFields['profileName']) {
      const name = (defaultFields['profileName'] ?? 'Standard User') as string;
      this.logger.debug(`Querying org for profile name [${name}]`);
      const profile = await this.org
        .getConnection()
        .singleRecordQuery<{ Id: string }>(`SELECT id FROM profile WHERE name='${name}'`);
      defaultFields.profileId = profile.Id;
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

export interface UserCreateOutput {
  orgId: string;
  permissionSetAssignments: string[];
  fields: Record<string, unknown>;
}
