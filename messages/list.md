# summary

list all authenticated users of an org

# description

The original scratch org admin is marked with "(A)"

# examples

- <%= config.bin %> <%= command.id %>
- <%= config.bin %> <%= command.id %> -u me@my.org --json
- <%= config.bin %> <%= command.id %> --json > tmp/MyUserList.json

# flags.target-hub.summary

Username or alias of the Dev Hub org.

# flags.target-hub.deprecation

The --target-dev-hub flag is deprecated and is not being used in this command. The flag will be removed in v57 or later.
