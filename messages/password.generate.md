# summary

Generate a random password for scratch org users.

# description

By default, new scratch orgs contain one admin user with no password. Use the CLI to generate or change a password for any scratch org user. After it's set, you can’t unset a password, you can only change it.

To change the password strength, set the --complexity flag to a value between 0 and 5. Each value specifies the types of characters used in the generated password:

0 - lower case letters only
1 - lower case letters and numbers only
2 - lower case letters and symbols only
3 - lower and upper case letters and numbers only
4 - lower and upper case letters and symbols only
5 - lower and upper case letters and numbers and symbols only

To see a password that was previously generated, run "<%= config.bin %> org user display".

# examples

- Generate a password for the original admin user of your default scratch org:

  <%= config.bin %> <%= command.id %>

- Generate a password that contains 12 characters for the original admin user of the scratch org with alias "my-scratch":

  <%= config.bin %> <%= command.id %> --length 12 --target-org my-scratch

- Generate a password for your default scratch org admin user that uses lower and upper case letters and numbers only:

  <%= config.bin %> <%= command.id %> --complexity 3

- Generate a password for the specified users in the default scratch org:

  <%= config.bin %> <%= command.id %> --on-behalf-of "user1@my.org,user2@my.org,user3@my.org"

# flags.onBehalfOf.summary

Comma-separated list of usernames or aliases to assign the password to.

# flags.length.summary

Number of characters in the generated password; valid values are between 8 and 100.

# flags.complexity.summary

Level of password complexity or strength; the higher the value, the stronger the password.

# noSelfSetErrorV50

Create a scratch org with the enableSetPasswordInApi org security setting set to TRUE and try again.

# noSelfSetError

Starting in Spring '21, EnableSetPasswordInApi is a feature in your scratch org definition file and not a setting. This
change is a result of the field Settings.securitySettings.passwordPolicies.enableSetPasswordInApi being deprecated in
version 51.0 of the Metadata API.

# noSelfSetError.actions

- Update your scratch org definition file and remove enableSetPasswordInApi from the "securitySettings" setting. Then
  add EnableSetPasswordInApi as a feature. For example:
- "features": ["EnableSetPasswordInApi"]
- Then try creating the scratch org again.

# scratchFeaturesUrl

see https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_scratch_orgs_def_file_config_values.htm

# success

Successfully set the password "%s" for user %s.

# successMultiple

Successfully set passwords:%s

# viewWithCommand

You can see the password again by running "sfdx user:display -u %s".

# flags.target-org.summary

Scratch org alias or login user.

# onBehalfOfMultipleError

Found a comma-separated list of usernames or aliases for the --onbehalfof parameter. Either specify one per flag or
separate by a space.

# flags.target-hub.deprecation

The --target-dev-hub flag is deprecated and is no longer used by this command. The flag will be removed in API version 57.0 or later.
