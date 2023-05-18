# summary

Assign a permission set to one or more users of a scratch org.

# description

To specify an alias for the --target-org or --on-behalf-of flags, use the CLI username alias, such as the one you set with the "alias set" command. Don't use the value of the Alias field of the User Salesforce object for the org user.

To assign multiple permission sets, either set multiple --name flags or a single --name flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --on-behalf-of.

# description.force

To specify an alias for the --target-org or --on-behalf-of flags, use the CLI username alias, such as the one you set with the "alias set" command. Don't use the value of the Alias field of the User Salesforce object for the org user.

To assign multiple permission sets, either set multiple --perm-set-name flags or a single --perm-set-name flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --on-behalf-of.

# examples

- Assign two permission sets called DreamHouse and CloudHouse to original admin user of your default scratch org:

  <%= config.bin %> <%= command.id %> --name DreamHouse --name CloudHouse

- Assign the Dreamhouse permission set to the original admin user of the scratch org with alias "my-scratch":

  <%= config.bin %> <%= command.id %> --name DreamHouse --target-org my-scratch

- Assign the Dreamhouse permission set to the specified list of users of your default scratch org:

  <%= config.bin %> <%= command.id %> --name DreamHouse --on-behalf-of user1@my.org --on-behalf-of user2 --on-behalf-of user

# examples.force

- Assign two permission sets called DreamHouse and CloudHouse to original admin user of your default scratch org:

  <%= config.bin %> <%= command.id %> --perm-set-name DreamHouse --perm-set-name CloudHouse

- Assign the Dreamhouse permission set to the original admin user of the scratch org with alias "my-scratch":

  <%= config.bin %> <%= command.id %> --perm-set-name DreamHouse --target-org my-scratch

- Assign the Dreamhouse permission set to the specified list of users of your default scratch org:

  <%= config.bin %> <%= command.id %> --perm-set-name DreamHouse --on-behalf-of user1@my.org --on-behalf-of user2 --on-behalf-of user

# flags.onBehalfOf.summary

Username or alias to assign the permission set to.

# flags.permsetName.summary

Permission set to assign.

# flags.target-org.summary

Scratch org alias or login user.
