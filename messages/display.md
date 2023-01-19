# summary

Display information about a Salesforce user.

# description

Output includes the profile name, org ID, access token, instance URL, login URL, and alias if applicable.

# examples

- Display information about the admin user of your default scratch org:

  <%= config.bin %> <%= command.id %>

- Display information about the specified user and output in JSON format:

  <%= config.bin %> <%= command.id %> --target-org me@my.org --json

# securityWarning

This command exposes sensitive information that allows for subsequent activity using your current authenticated session.
Sharing this information is equivalent to logging someone in under the current credential, resulting in unintended access and escalation of privilege.
For additional information, review the authorization section of
the https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_auth_web_flow.htm

# flags.target-hub.deprecation

The --target-dev-hub flag is deprecated and is no longer used by this command. The flag will be removed in API version 57.0 or later.

# flags.verbose.summary

Display additional information
