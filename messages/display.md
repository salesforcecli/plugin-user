# summary

Display information about a Salesforce user.

# description

Output includes the profile name, org ID, access token, instance URL, login URL, and alias if applicable. The displayed alias is local and different from the Alias field of the User sObject record of the new user, which you set in the Setup UI.

# examples

- Display information about the admin user of your default scratch org:

  <%= config.bin %> <%= command.id %>

- Display information about the specified user and output in JSON format:

  <%= config.bin %> <%= command.id %> --target-org me@my.org --json

# securityWarning

This command exposes sensitive information that allows for subsequent activity using your current authenticated session.
Sharing this information is equivalent to logging someone in under the current credential, resulting in unintended
access and escalation of privilege.
For additional information, review the authorization section of
the https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_auth_web_flow.htm
