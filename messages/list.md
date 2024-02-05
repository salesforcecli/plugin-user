# summary

List all locally-authenticated users of an org.

# description

For scratch orgs, the list includes any users you've created with the "org create user" command; the original scratch org admin user is marked with "(A)". For other orgs, the list includes the users you used to authenticate to the org.

# examples

- List the locally-authenticated users of your default org:

  <%= config.bin %> <%= command.id %>

- List the locally-authenticated users of the specified org:

  <%= config.bin %> <%= command.id %> --target-org me@my.org
