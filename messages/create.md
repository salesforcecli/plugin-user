# summary

Create a user for a scratch org.

# description

A scratch org includes one administrator user by default. For testing purposes, however, you sometimes need to create additional users.

The easiest way to create a user is to let this command assign default or generated characteristics to the new user. If you want to customize your new user, create a definition file and specify it with the --definition-file flag. In the file, you can include all the User sObject (SSalesforce object) fields and Salesforce DX-specific options, as described in "User Definition File for Customizing a Scratch Org User" (https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_users_def_file.htm). You can also specify these options on the command line.

If you don't customize your new user, this command creates a user with the following default characteristics:

    * The username is the existing administrator’s username prepended with a timestamp, such as 1505759162830_test-wvkpnfm5z113@example.com.
    * The user’s profile is Standard User.
    * The values of the required fields of the User sObject are the corresponding values of the administrator user.
    * The user has no password.

Use the --set-alias flag to assign a simple name to the user that you can reference in later CLI commands. This alias is local and different from the Alias field of the User sObject record of the new user, which you set in the Setup UI.

When this command completes, it displays the new username and user ID. Run the "org display user" command to get more information about the new user.

After the new user has been created, Salesforce CLI automatically authenticates it to the scratch org so the new user can immediately start using the scratch org. The CLI uses the same authentication method that was used on the associated Dev Hub org. Due to Hyperforce limitations, the scratch org user creation fails if the Dev Hub authentication used the JWT flow and the scratch org is on Hyperforce. For this reason, if you plan to create scratch org users, authenticate to the Dev Hub org with either the "org login web" or "org login sfdx-url" command, and not "org login jwt".

For more information about user limits, defaults, and other considerations when creating a new scratch org user, see https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_users.htm.

# examples

- Create a user for your default scratch org and let this command generate a username, user ID, and other characteristics:

  <%= config.bin %> <%= command.id %>

- Create a user with alias "testuser1" using a user definition file. Set the "profileName" option to "Chatter Free User", which overrides the value in the defintion file if it also exists there. Create the user for the scratch org with alias "my-scratch":

  <%= config.bin %> <%= command.id %> --set-alias testuser1 --definition-file config/project-user-def.json profileName='Chatter Free User' --target-org my-scratch

- Create a user by specifying the username, email, and perm set assignment at the command line; command fails if the username already exists in Salesforce:

  <%= config.bin %> <%= command.id %> username=testuser1@my.org email=me@my.org permsets=DreamHouse

- Create a user with a definition file, set the email value as specified (overriding any value in the definition file), and generate a password for the user. If the username in the definition file isn't unique, the command appends the org ID to make it unique:

  <%= config.bin %> <%= command.id %> --definition-file config/project-user-def.json email=me@my.org generatepassword=true --set-unique-username

# flags.set-alias.summary

Set an alias for the created username to reference in other CLI commands.

# flags.definition-file.summary

File path to a user definition file for customizing the new user.

# flags.definition-file.description

The user definition file uses JSON format and can include any Salesforce User sObject field and Salesforce DX-specific options. See https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_users_def_file.htm for more information.

# flags.set-unique-username.summary

Force the username, if specified in the definition file or at the command line, to be unique by appending the org ID.

# flags.set-unique-username.description

The new user’s username must be unique across all Salesforce orgs and in the form of an email address. If you let this command generate a username for you, it's guaranteed to be unique. If you specify an existing username in a definition file, the command fails. Set this flag to force the username to be unique; as a result, the username might be different than what you specify in the definition file.

# licenseLimitExceeded

There are no available user licenses for the user profile "%s".

# duplicateUsername

The username "%s" already exists in this or another Salesforce org. Usernames must be unique across all Salesforce orgs. Try using the --set-unique-username flag to force a unique username by appending the org ID.

# success

Successfully created user "%s" with ID %s for org %s.%s
See more details about this user by running "%s org user display -o %s".

# error.nonScratchOrg

This command works with only scratch orgs.

# error.jwtHyperforce

This command doesn't work when authorizing an org using the JWT flow if the org is on Hyperforce.

# error.jwtHyperforce.actions

- Authorize your Dev Hub with either the `org login web` or `org login sfdx-url` command. You can then successfully use the `org create user` command on scratch orgs that you create with your Dev Hub.
