# summary

List all locally-authenticated users of an org.

# description

For scratch orgs, the list includes any users you've created with the "<%= config.bin %> org create user" command; the original scratch org admin user is marked with "(A)". For other orgs, the list includes the users you used to authenticate to the org.

# examples

- List the locally-authenticated users of your default org:

  <%= config.bin %> <%= command.id %>

- List the locally-authenticated users of the specified org:

  <%= config.bin %> <%= command.id %> --target-org me@my.org

# flags.target-hub.summary

Username or alias of the Dev Hub org.

# flags.target-hub.deprecation

The --target-dev-hub flag is deprecated and is no longer used by this command. The flag will be removed in API version 57.0 or later.
