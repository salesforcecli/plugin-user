# plugin-user

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-user.svg?label=@salesforce/plugin-user)](https://www.npmjs.com/package/@salesforce/plugin-user) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-user.svg)](https://npmjs.org/package/@salesforce/plugin-user) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-user/main/LICENSE.txt)

Commands to interact with Users and Permission Sets in a scratch org

This plugin is bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli). For more information on the CLI, read the [getting started guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm).

We always recommend using the latest version of these commands bundled with the CLI, however, you can install a specific version or tag if needed.

## Install

```bash
sfdx plugins:install user@x.y.z
```

## Issues

Please report any issues at https://github.com/forcedotcom/cli/issues

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-user

# Install the dependencies and compile
yarn install
yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev user
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sfdx cli
sfdx plugins:link .
# To verify
sfdx plugins
```

### Test

Run unit tests (orgs and filesystem are mocked)

```bash
yarn test
```

Run not-unit-tests (real orgs, real FS)

```bash
# use your locally authenticated dev hub.  Supports both JWT and Refresh Token (web) auth
export TESTKIT_HUB_USERNAME=<username for dev hub>
yarn test:nuts
```

For more NUT options and examples, see <https://github.com/salesforcecli/cli-plugins-testkit>

## Commands

<!-- commands -->

- [`sf org assign permset`](#sf-org-assign-permset)
- [`sf org assign permsetlicense`](#sf-org-assign-permsetlicense)
- [`sf org create user`](#sf-org-create-user)
- [`sf org display user`](#sf-org-display-user)
- [`sf org generate password`](#sf-org-generate-password)
- [`sf org list users`](#sf-org-list-users)

## `sf org assign permset`

Assign a permission set to one or more users of a scratch org.

```
USAGE
  $ sf org assign permset -n <value> -o <value> [--json] [--flags-dir <value>] [-b <value>] [--api-version <value>]

FLAGS
  -b, --on-behalf-of=<value>...  Username or alias to assign the permission set to.
  -n, --name=<value>...          (required) Permission set to assign.
  -o, --target-org=<value>       (required) Scratch org alias or login user.
      --api-version=<value>      Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Assign a permission set to one or more users of a scratch org.

  To specify an alias for the --target-org or --on-behalf-of flags, use the CLI username alias, such as the one you set
  with the "alias set" command. Don't use the value of the Alias field of the User Salesforce object for the org user.

  To assign multiple permission sets, either set multiple --name flags or a single --name flag with multiple names
  separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to
  --on-behalf-of.

EXAMPLES
  Assign two permission sets called DreamHouse and CloudHouse to original admin user of your default scratch org:

    $ sf org assign permset --name DreamHouse --name CloudHouse

  Assign the Dreamhouse permission set to the original admin user of the scratch org with alias "my-scratch":

    $ sf org assign permset --name DreamHouse --target-org my-scratch

  Assign the Dreamhouse permission set to the specified list of users of your default scratch org:

    $ sf org assign permset --name DreamHouse --on-behalf-of user1@my.org --on-behalf-of user2 --on-behalf-of user
```

_See code: [src/commands/org/assign/permset.ts](https://github.com/salesforcecli/plugin-user/blob/3.4.3/src/commands/org/assign/permset.ts)_

## `sf org assign permsetlicense`

Assign a permission set license to one or more users of a scratch org.

```
USAGE
  $ sf org assign permsetlicense -n <value> -o <value> [--json] [--flags-dir <value>] [-b <value>] [--api-version
  <value>]

FLAGS
  -b, --on-behalf-of=<value>...  Usernames or alias to assign the permission set license to.
  -n, --name=<value>...          (required) Name of the permission set license to assign.
  -o, --target-org=<value>       (required) Scratch org alias or login user.
      --api-version=<value>      Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Assign a permission set license to one or more users of a scratch org.

  To specify an alias for the --target-org or --on-behalf-of flags, use the CLI username alias, such as the one you set
  with the "alias set" command. Don't use the value of the Alias field of the User Salesforce object for the org user.

  To assign multiple permission sets, either set multiple --name flags or a single --name flag with multiple names
  separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to
  --on-behalf-of.

EXAMPLES
  Assign the DreamHouse permission set license to original admin user of your default scratch org:

    $ sf org assign permsetlicense --name DreamHouse

  Assign two permission set licenses to the original admin user of the scratch org with alias "my-scratch":

    $ sf org assign permsetlicense --name DreamHouse --name CloudHouse --target-org my-scratch

  Assign the Dreamhouse permission set license to the specified list of users of your default scratch org:

    $ sf org assign permsetlicense --name DreamHouse --on-behalf-of user1@my.org --on-behalf-of user2 --on-behalf-of \
      user3
```

_See code: [src/commands/org/assign/permsetlicense.ts](https://github.com/salesforcecli/plugin-user/blob/3.4.3/src/commands/org/assign/permsetlicense.ts)_

## `sf org create user`

Create a user for a scratch org.

```
USAGE
  $ sf org create user -o <value> [--json] [--flags-dir <value>] [-a <value>] [-f <value>] [-s] [--api-version
    <value>]

FLAGS
  -a, --set-alias=<value>        Set an alias for the created username to reference in other CLI commands.
  -f, --definition-file=<value>  File path to a user definition file for customizing the new user.
  -o, --target-org=<value>       (required) Username or alias of the target org. Not required if the `target-org`
                                 configuration variable is already set.
  -s, --set-unique-username      Force the username, if specified in the definition file or at the command line, to be
                                 unique by appending the org ID.
      --api-version=<value>      Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Create a user for a scratch org.

  A scratch org includes one administrator user by default. For testing purposes, however, you sometimes need to create
  additional users.

  The easiest way to create a user is to let this command assign default or generated characteristics to the new user.
  If you want to customize your new user, create a definition file and specify it with the --definition-file flag. In
  the file, you can include all the User sObject (SSalesforce object) fields and Salesforce DX-specific options, as
  described in "User Definition File for Customizing a Scratch Org User"
  (https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_users_def_file.htm).
  You can also specify these options on the command line.

  If you don't customize your new user, this command creates a user with the following default characteristics:

  * The username is the existing administrator’s username prepended with a timestamp, such as
  1505759162830_test-wvkpnfm5z113@example.com.
  * The user’s profile is Standard User.
  * The values of the required fields of the User sObject are the corresponding values of the administrator user.
  * The user has no password.

  Use the --set-alias flag to assign a simple name to the user that you can reference in later CLI commands. This alias
  is local and different from the Alias field of the User sObject record of the new user, which you set in the Setup UI.

  When this command completes, it displays the new username and user ID. Run the "org display user" command to get more
  information about the new user.

  After the new user has been created, Salesforce CLI automatically authenticates it to the scratch org so the new user
  can immediately start using the scratch org. The CLI uses the same authentication method that was used on the
  associated Dev Hub org. Due to Hyperforce limitations, the scratch org user creation fails if the Dev Hub
  authentication used the JWT flow and the scratch org is on Hyperforce. For this reason, if you plan to create scratch
  org users, authenticate to the Dev Hub org with either the "org login web" or "org login sfdx-url" command, and not
  "org login jwt".

  For more information about user limits, defaults, and other considerations when creating a new scratch org user, see
  https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_users.htm.

ALIASES
  $ sf force user create

EXAMPLES
  Create a user for your default scratch org and let this command generate a username, user ID, and other
  characteristics:

    $ sf org create user

  Create a user with alias "testuser1" using a user definition file. Set the "profileName" option to "Chatter Free
  User", which overrides the value in the defintion file if it also exists there. Create the user for the scratch org
  with alias "my-scratch":

    $ sf org create user --set-alias testuser1 --definition-file config/project-user-def.json profileName='Chatter \
      Free User' --target-org my-scratch

  Create a user by specifying the username, email, and perm set assignment at the command line; command fails if the
  username already exists in Salesforce:

    $ sf org create user username=testuser1@my.org email=me@my.org permsets=DreamHouse

  Create a user with a definition file, set the email value as specified (overriding any value in the definition
  file), and generate a password for the user. If the username in the definition file isn't unique, the command
  appends the org ID to make it unique:

    $ sf org create user --definition-file config/project-user-def.json email=me@my.org generatepassword=true \
      --set-unique-username

FLAG DESCRIPTIONS
  -f, --definition-file=<value>  File path to a user definition file for customizing the new user.

    The user definition file uses JSON format and can include any Salesforce User sObject field and Salesforce
    DX-specific options. See
    https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_users_def_file.htm
    for more information.

  -s, --set-unique-username

    Force the username, if specified in the definition file or at the command line, to be unique by appending the org
    ID.

    The new user’s username must be unique across all Salesforce orgs and in the form of an email address. If you let
    this command generate a username for you, it's guaranteed to be unique. If you specify an existing username in a
    definition file, the command fails. Set this flag to force the username to be unique; as a result, the username
    might be different than what you specify in the definition file.
```

_See code: [src/commands/org/create/user.ts](https://github.com/salesforcecli/plugin-user/blob/3.4.3/src/commands/org/create/user.ts)_

## `sf org display user`

Display information about a Salesforce user.

```
USAGE
  $ sf org display user -o <value> [--json] [--flags-dir <value>] [--api-version <value>]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Display information about a Salesforce user.

  Output includes the profile name, org ID, access token, instance URL, login URL, and alias if applicable. The
  displayed alias is local and different from the Alias field of the User sObject record of the new user, which you set
  in the Setup UI.

ALIASES
  $ sf force user display

EXAMPLES
  Display information about the admin user of your default scratch org:

    $ sf org display user

  Display information about the specified user and output in JSON format:

    $ sf org display user --target-org me@my.org --json
```

_See code: [src/commands/org/display/user.ts](https://github.com/salesforcecli/plugin-user/blob/3.4.3/src/commands/org/display/user.ts)_

## `sf org generate password`

Generate a random password for scratch org users.

```
USAGE
  $ sf org generate password -o <value> [--json] [--flags-dir <value>] [-b <value>] [-l <value>] [-c <value>]
    [--api-version <value>]

FLAGS
  -b, --on-behalf-of=<value>...  Comma-separated list of usernames or aliases to assign the password to; must have been
                                 created locally with the "org create user" command.
  -c, --complexity=<value>       [default: 5] Level of password complexity or strength; the higher the value, the
                                 stronger the password.
  -l, --length=<value>           [default: 13] Number of characters in the generated password; valid values are between
                                 8 and 100.
  -o, --target-org=<value>       (required) Username or alias of the target org. Not required if the `target-org`
                                 configuration variable is already set.
      --api-version=<value>      Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate a random password for scratch org users.

  By default, new scratch orgs contain one admin user with no password. Use this command to generate or change a
  password for this admin user. After it's set, you can’t unset a password, you can only change it.

  You can also use the --on-behalf-of flag to generate a password for a scratch org user that you've created locally
  with the "org create user" command. This command doesn't work for users you created in the scratch org using Setup.

  To change the password strength, set the --complexity flag to a value between 0 and 5. Each value specifies the types
  of characters used in the generated password:

  0 - lower case letters only
  1 - lower case letters and numbers only
  2 - lower case letters and symbols only
  3 - lower and upper case letters and numbers only
  4 - lower and upper case letters and symbols only
  5 - lower and upper case letters and numbers and symbols only

  To see a password that was previously generated, run "org display user".

EXAMPLES
  Generate a password for the original admin user of your default scratch org:

    $ sf org generate password

  Generate a password that contains 12 characters for the original admin user of the scratch org with alias
  "my-scratch":

    $ sf org generate password --length 12 --target-org my-scratch

  Generate a password for your default scratch org admin user that uses lower and upper case letters and numbers only:

    $ sf org generate password --complexity 3

  Generate a password for the specified users in the default scratch org; these users must have been created locally
  with the "org create user" command:

    $ sf org generate password --on-behalf-of user1@my.org --on-behalf-of user2@my.org --on-behalf-of user3@my.org
```

_See code: [src/commands/org/generate/password.ts](https://github.com/salesforcecli/plugin-user/blob/3.4.3/src/commands/org/generate/password.ts)_

## `sf org list users`

List all locally-authenticated users of an org.

```
USAGE
  $ sf org list users -o <value> [--json] [--flags-dir <value>] [--api-version <value>]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  List all locally-authenticated users of an org.

  For scratch orgs, the list includes any users you've created with the "org create user" command; the original scratch
  org admin user is marked with "(A)". For other orgs, the list includes the users you used to authenticate to the org.

ALIASES
  $ sf force user list

EXAMPLES
  List the locally-authenticated users of your default org:

    $ sf org list users

  List the locally-authenticated users of the specified org:

    $ sf org list users --target-org me@my.org
```

_See code: [src/commands/org/list/users.ts](https://github.com/salesforcecli/plugin-user/blob/3.4.3/src/commands/org/list/users.ts)_

<!-- commandsstop -->
