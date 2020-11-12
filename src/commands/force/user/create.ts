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
import { get, Dictionary } from '@salesforce/ts-types';
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
    alias: flags.string({
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
  private successes: SuccessMsg[];
  private failures: FailureMsg[];

  public async run(): Promise<UserFields> {
    this.logger = await Logger.child(this.constructor.name);
    const defaultUserFields: DefaultUserFields = await DefaultUserFields.create({
      templateUser: this.org.getUsername(),
    });
    const user: User = await User.create({ org: this.org });

    // merge defaults with provided values with cli > file > defaults
    const fields: UserFields & Dictionary<string> = await this.aggregateFields(defaultUserFields.getFields());

    try {
      await user.createUser(fields);
    } catch (e) {
      await this.catchCreateUser(e, fields);
    }

    // because fields is type UserFields & Dictionary<string> we can access these
    const permsets: string = fields['permsets'];
    const generatepassword: string = fields['generatepassword'];

    // Assign permission sets to the created user
    if (permsets) {
      try {
        await this.user.assignPermissionSets(fields.id, permsets.trim().split(','));
        this.successes.push({
          name: 'Permission Set Assignment',
          value: permsets.trim(),
        });
      } catch (err) {
        this.failures.push({
          name: 'Permission Set Assignment',
          message: err.message,
        });
      }
    }

    // Generate and set a password if specified
    if (generatepassword === 'true') {
      try {
        const password = User.generatePasswordUtf8();
        await this.user.assignPassword(await AuthInfo.create({ username: fields.username }), password);
        password.value((pass: Buffer) => {
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
    }

    this.print(fields);

    return Promise.resolve(Object.assign({ orgId: this.org.getOrgId() }, fields));
  }

  private async catchCreateUser(respBody: Error, fields: UserFields): Promise<void> {
    // For Gacks, the error message is on response.body[0].message but for handled errors
    // the error message is on response.body.Errors[0].description.
    const errMessage = (get(respBody, 'message') as string) || 'Unknown Error';
    const conn: Connection = this.org.getConnection();

    // Provide a more user friendly error message for certain server errors.
    if (errMessage.includes('LICENSE_LIMIT_EXCEEDED')) {
      const res = await conn.query(`SELECT name FROM profile WHERE id='${fields.profileId}'`);
      const profileName = get(res, 'records[0].Name') as string;
      throw SfdxError.create('@salesforce/plugin-user', 'create', 'licenseLimitExceeded', [profileName]);
    } else if (errMessage.includes('DUPLICATE_USERNAME')) {
      throw SfdxError.create('@salesforce/plugin-user', 'create', 'duplicateUsername', [fields.username]);
    } else {
      throw SfdxError.wrap(errMessage);
    }
  }

  private async aggregateFields(defaultFields: UserFields): Promise<UserFields & Dictionary<string>> {
    // start with the default fields, then add the fields from the file, then (possibly overwritting) add the fields from the cli varargs param
    if (this.flags.definitionfile) {
      const content = await fs.readJson(this.flags.definitionfile);
      Object.keys(content).forEach((key) => {
        defaultFields[key] = content[key];
      });
    }

    if (this.varargs) {
      Object.keys(this.varargs).forEach((key) => {
        if (defaultFields[key]) {
          defaultFields[key] = this.varargs[key];
        }
      });
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

    if (this.failures) {
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
