# summary

generate a password for scratch org users

# description

Generates and sets a random password for one or more scratch org users. Targets the usernames listed with the --onbehalfof parameter or the --targetusername parameter. Defaults to the defaultusername.

If you haven’t set a default Dev Hub, or if your scratch org isn’t associated with your default Dev Hub, --targetdevhubusername is required.

To change the password strength, set the --complexity parameter to a value between 0 and 5. Each value specifies the types of characters used in the generated password:

0 - lower case letters only
1 - lower case letters and numbers only
2 - lower case letters and symbols only
3 - lower and upper case letters and numbers only
4 - lower and upper case letters and symbols only
5 - lower and upper case letters and numbers and symbols only

To see a password that was previously generated, run "<%= config.bin %> user:display".

# examples

- <%= config.bin %> <%= command.id %>
- <%= config.bin %> <%= command.id %> -l 12
- <%= config.bin %> <%= command.id %> -c 3
- <%= config.bin %> <%= command.id %> -u me@my.org --json
- <%= config.bin %> <%= command.id %> -o "user1@my.org,user2@my.org,user3@my.org"

# flags.onBehalfOf

comma-separated list of usernames or aliases to assign the password to

# flags.length

number of characters in the generated password; valid values are between 8 and 1000

# flags.complexity

level of password complexity or strength; the higher the value, the stronger the password

# noSelfSetErrorV50

Create a scratch org with the enableSetPasswordInApi org security setting set to TRUE and try again.

# noSelfSetError

Starting in Spring '21, EnableSetPasswordInApi is a feature in your scratch org definition file and not a setting. This change is a result of the field Settings.securitySettings.passwordPolicies.enableSetPasswordInApi being deprecated in version 51.0 of the Metadata API.

# noSelfSetError.actions

- Update your scratch org definition file and remove enableSetPasswordInApi from the "securitySettings" setting. Then add EnableSetPasswordInApi as a feature. For example:
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

Found a comma-separated list of usernames or aliases for the --onbehalfof parameter. Either specify one per flag or separate by a space.
