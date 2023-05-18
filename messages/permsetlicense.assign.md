# summary

Assign a permission set license to one or more users of a scratch org.

# description

To specify an alias for the --target-org or --on-behalf-of flags, use the CLI username alias, such as the one you set with the "alias set" command. Don't use the value of the Alias field of the User Salesforce object for the org user.

To assign multiple permission sets, either set multiple --name flags or a single --name flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --on-behalf-of.

# examples

- Assign the DreamHouse permission set license to original admin user of your default scratch org:

  <%= config.bin %> <%= command.id %> --name DreamHouse

- Assign two permission set licenses to the original admin user of the scratch org with alias "my-scratch":

  <%= config.bin %> <%= command.id %> --name DreamHouse --name CloudHouse --target-org my-scratch

- Assign the Dreamhouse permission set license to the specified list of users of your default scratch org:

  <%= config.bin %> <%= command.id %> --name DreamHouse --on-behalf-of user1@my.org --on-behalf-of user2 --on-behalf-of user3

# flags.onBehalfOf.summary

Usernames or alias to assign the permission set license to.

# flags.name.summary

Name of the permission set license to assign.

# duplicateValue

The user "%s" already has the Permission Set License "%s"

# flags.target-org.summary

Scratch org alias or login user.
