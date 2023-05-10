/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import * as fs from 'fs';
import {
  AuthInfo,
  Connection,
  DefaultUserFields,
  Logger,
  Messages,
  REQUIRED_FIELDS,
  SfError,
  StateAggregator,
  User,
  UserFields,
} from '@salesforce/core';
import { mapKeys, omit, toBoolean } from '@salesforce/kit';
import { Dictionary, ensureString, getString, isArray, JsonMap } from '@salesforce/ts-types';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  parseVarArgs,
  optionalHubFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-user', 'create');

type SuccessMsg = {
  name: string;
  value: string;
};

type FailureMsg = {
  name: string;
  message: string;
};

const permsetsStringToArray = (fieldsPermsets: string | string[] | undefined): string[] => {
  if (!fieldsPermsets) return [];
  return isArray(fieldsPermsets)
    ? fieldsPermsets
    : fieldsPermsets.split(',').map((item) => item.replace("'", '').trim());
};

export class CreateUserCommand extends SfCommand<CreateUserOutput> {
  public static strict = false;
  public static readonly deprecateAliases = true;
  public static readonly aliases = ['force:user:create'];
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'set-alias': Flags.string({
      char: 'a',
      summary: messages.getMessage('flags.alias.summary'),
      aliases: ['setalias'],
      deprecateAliases: true,
    }),
    'definition-file': Flags.string({
      char: 'f',
      summary: messages.getMessage('flags.definitionfile.summary'),
      description: messages.getMessage('flags.definitionfile.description'),
      aliases: ['definitionfile'],
      deprecateAliases: true,
    }),
    'set-unique-username': Flags.boolean({
      char: 's',
      summary: messages.getMessage('flags.setuniqueusername.summary'),
      description: messages.getMessage('flags.setuniqueusername.description'),
      aliases: ['setuniqueusername'],
      deprecateAliases: true,
    }),
    'target-dev-hub': {
      ...optionalHubFlagWithDeprecations,
      hidden: true,
      deprecated: {
        message: messages.getMessage('flags.target-hub.deprecation'),
      },
    },
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
  };

  private successes: SuccessMsg[] = [];
  private failures: FailureMsg[] = [];

  // assert! because they're set early in run method
  private flags!: Interfaces.InferredFlags<typeof CreateUserCommand.flags>;
  private varargs!: Record<string, unknown>;

  public async run(): Promise<CreateUserOutput> {
    const { flags, argv } = await this.parse(CreateUserCommand);
    this.flags = flags;
    const logger = await Logger.child(this.constructor.name);
    this.varargs = parseVarArgs({}, argv as string[]);

    const conn = flags['target-org'].getConnection(flags['api-version']);
    const defaultUserFields = await DefaultUserFields.create({
      templateUser: ensureString(flags['target-org'].getUsername()),
    });
    const targetOrgUser = await User.create({ org: flags['target-org'] });

    // merge defaults with provided values with cli > file > defaults
    const fields = await this.aggregateFields(defaultUserFields.getFields(), logger);

    const newUserAuthInfo = await getNewUserAuthInfo(targetOrgUser, fields, conn);

    if (fields.profileName) await newUserAuthInfo?.save({ userProfileName: fields.profileName });

    // Assign permission sets to the created user
    if (fields.permsets) {
      try {
        // permsets can be passed from cli args or file we need to create an array of permset names either way it's passed
        // it will either be a comma separated string, or an array, force it into an array
        const permsetArray = permsetsStringToArray(fields.permsets);

        await targetOrgUser.assignPermissionSets(ensureString(newUserAuthInfo.getFields().userId), permsetArray);
        this.successes.push({
          name: 'Permission Set Assignment',
          value: permsetArray.join(','),
        });
      } catch (error) {
        const err = error as SfError;
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
        await targetOrgUser.assignPassword(newUserAuthInfo, password);
        password.value((pass: Buffer) => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          newUserAuthInfo.save({ password: pass.toString('utf-8') });
          this.successes.push({
            name: 'Password Assignment',
            value: pass.toString(),
          });
        });
      } catch (error) {
        const err = error as SfError;
        this.failures.push({
          name: 'Password Assignment',
          message: err.message,
        });
      }
    }

    // Set the alias if specified
    if (flags['set-alias']) {
      const stateAggregator = await StateAggregator.getInstance();
      stateAggregator.aliases.set(flags['set-alias'], fields.username);
      await stateAggregator.aliases.write();
    }

    fields.id = ensureString(newUserAuthInfo.getFields().userId);
    this.print(fields);
    this.setExitCode();

    const { permsets, ...fieldsWithoutPermsets } = fields;
    return {
      orgId: flags['target-org'].getOrgId(),
      permissionSetAssignments: permsetsStringToArray(permsets),
      fields: { ...mapKeys(fieldsWithoutPermsets, (value, key) => key.toLowerCase()) },
    };
  }

  // this method is pretty rough, so we'll ignore some TS errors
  private async aggregateFields(defaultFields: UserFields, logger: Logger): Promise<UserFields & Dictionary<string>> {
    // username can be overridden both in the file or varargs, save it to check if it was changed somewhere
    const defaultUsername = defaultFields.username;

    // start with the default fields, then add the fields from the file, then (possibly overwriting) add the fields from the cli varargs param
    if (this.flags['definition-file']) {
      const content = JSON.parse(await fs.promises.readFile(this.flags['definition-file'], 'utf-8')) as JsonMap;
      Object.entries(content).forEach(([key, value]) => {
        // @ts-expect-error cast entries to lowercase to standardize
        defaultFields[lowerFirstLetter(key)] = value as keyof typeof REQUIRED_FIELDS;
      });
    }

    if (this.varargs) {
      Object.keys(this.varargs).forEach((key) => {
        if (key.toLowerCase() === 'generatepassword') {
          // @ts-expect-error standardize generatePassword casing
          defaultFields['generatePassword'] = toBoolean(this.varargs[key]);
        } else if (key.toLowerCase() === 'profilename') {
          // @ts-expect-error standardize profileName casing
          defaultFields['profileName'] = this.varargs[key];
        } else {
          // @ts-expect-error all other varargs are left "as is"
          defaultFields[lowerFirstLetter(key)] = this.varargs[key];
        }
      });
    }

    // check if "username" was passed along with "set-unique-username" flag, if so append org id
    if (this.flags['set-unique-username'] && defaultFields.username !== defaultUsername) {
      defaultFields.username = `${defaultFields.username}.${this.flags['target-org'].getOrgId().toLowerCase()}`;
    }

    // @ts-expect-error check if "profileName" was passed, this needs to become a profileId before calling User.create
    if (defaultFields['profileName']) {
      // @ts-expect-error profileName is not a valid field on UserFields
      const name = (defaultFields['profileName'] ?? 'Standard User') as string;
      logger.debug(`Querying org for profile name [${name}]`);
      const profile = await this.flags['target-org']
        .getConnection(this.flags['api-version'])
        .singleRecordQuery<{ Id: string }>(`SELECT id FROM profile WHERE name='${name}'`);
      defaultFields.profileId = profile.Id;
    }

    return defaultFields;
  }

  private print(fields: UserFields): void {
    const userCreatedSuccessMsg = messages.getMessage('success', [
      fields.username,
      fields.id,
      this.flags['target-org'].getOrgId(),
      os.EOL,
      this.config.bin,
      fields.username,
    ]);

    // we initialize to be an empty array to be able to push onto it
    // so we need to check that the size is greater than 0 to know we had a failure
    if (this.failures.length > 0) {
      this.styledHeader('Partial Success');
      this.log(userCreatedSuccessMsg);
      this.log('');
      this.styledHeader('Failures');
      this.table(this.failures, { name: { header: 'Action' }, message: { header: 'Error Message' } });
    } else {
      this.log(userCreatedSuccessMsg);
    }
  }

  private setExitCode(): void {
    if (this.failures.length && this.successes.length) {
      process.exitCode = 68;
    } else if (this.failures.length) {
      process.exitCode = 1;
    } else if (this.successes.length) {
      process.exitCode = 0;
    }
  }
}

export default CreateUserCommand;

export interface CreateUserOutput {
  orgId: string;
  permissionSetAssignments: string[];
  fields: Record<string, unknown>;
}

const lowerFirstLetter = (word: string): string => word[0].toLowerCase() + word.substr(1);

/**
 * removes fields that cause errors in salesforce APIs within sfdx-core's createUser method
 *
 * @param fields a list of combined fields from varargs and the config file
 * @private
 */
const stripInvalidAPIFields = (fields: UserFields & Dictionary<string>): UserFields =>
  omit(fields, ['permsets', 'generatepassword', 'generatePassword', 'profileName']);

const getNewUserAuthInfo = async (
  targetOrgUser: User,
  fields: UserFields & Dictionary<string>,
  conn: Connection
): Promise<AuthInfo> => {
  try {
    return await targetOrgUser.createUser(stripInvalidAPIFields(fields));
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e;
    }
    return catchCreateUser(e, fields, conn);
  }
};

/** will definitely throw, but will throw better error messages than User.createUser was going to */
const catchCreateUser = async (respBody: Error, fields: UserFields, conn: Connection): Promise<never> => {
  // For Gacks, the error message is on response.body[0].message but for handled errors
  // the error message is on response.body.Errors[0].description.
  const errMessage = getString(respBody, 'message') ?? 'Unknown Error';

  // Provide a more user friendly error message for certain server errors.
  if (errMessage.includes('LICENSE_LIMIT_EXCEEDED')) {
    const profile = await conn.singleRecordQuery<{ Name: string }>(
      `SELECT name FROM profile WHERE id='${fields.profileId}'`
    );
    throw new SfError(messages.getMessage('licenseLimitExceeded', [profile.Name]), 'licenseLimitExceeded');
  } else if (errMessage.includes('DUPLICATE_USERNAME')) {
    throw new SfError(messages.getMessage('duplicateUsername', [fields.username]), 'duplicateUsername');
  } else {
    throw SfError.wrap(errMessage);
  }
};
