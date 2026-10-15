# summary

Display information about a Salesforce user.

# description

Output includes the profile name, org ID, instance URL, login URL, and alias if applicable. The displayed alias is local and different from the Alias field of the User sObject record of the new user, which you set in the Setup UI.

# examples

- Display information about the admin user of your default scratch org:

  <%= config.bin %> <%= command.id %>

- Display information about the specified user and output in JSON format:

  <%= config.bin %> <%= command.id %> --target-org me@my.org --json
