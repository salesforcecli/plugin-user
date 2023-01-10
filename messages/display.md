# summary

displays information about a user of a scratch org

# description

Output includes the profile name, org ID, access token, instance URL, login URL, and alias if applicable.

# examples

- <%= config.bin %> <%= command.id %>
- <%= config.bin %> <%= command.id %> -u me@my.org --json

# securityWarning

This command will expose sensitive information that allows for subsequent activity using your current authenticated
session.
Sharing this information is equivalent to logging someone in under the current credential, resulting in unintended
access and escalation of privilege.
For additional information, please review the authorization section of
the https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_auth_web_flow.htm

# flags.target-hub.deprecation

The --target-dev-hub flag is deprecated and is not being used in this command. The flag will be removed in v57 or later.
