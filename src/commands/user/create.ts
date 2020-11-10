/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import {
  Aliases,
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
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import get = Reflect.get;

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

  // todo: typing
  public async run(): Promise<unknown> {
    this.logger = await Logger.child(this.constructor.name);
    const defaultUserFields = await DefaultUserFields.create({ templateUser: this.org.getUsername() });
    const user: User = await User.create({ org: this.org });

    // merge defaults with provided values from cli -> file -> defaults
    const fields: UserFields = await this.aggregateFields(defaultUserFields.getFields());

    try {
      await user.createUser(fields);
    } catch (e) {
      await this.catchCreateUser(e, fields);
    }

    const permsets = this.varargs.permsets as string;
    const generatepassword = this.varargs.generatepassword;

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
    if (generatepassword) {
      try {
        const password = User.generatePasswordUtf8();
        // await this.user.assignPassword(await AuthInfo.create({ username: fields.username }), password);
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

    return Promise.resolve(Object.assign({ orgId: this.org.getOrgId() }, this.user));
  }

  private async catchCreateUser(respBody: Error, fields: UserFields): Promise<void> {
    // For Gacks, the error message is on response.body[0].message but for handled errors
    // the error message is on response.body.Errors[0].description.
    const errMessage = get(respBody, 'message') || 'Unknown Error';
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

  private async aggregateFields(defaultFields: UserFields): Promise<UserFields> {
    // take from cli params, then file, then default
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
