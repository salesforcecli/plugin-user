# summary

assign a permission set to one or more users of an org

# description

To specify an alias for the -u or -o parameter, use the username alias you set with the "alias:set" CLI command, not the User.Alias value of the org user.

# examples

- <%= config.bin %> <%= command.id %> -n "DreamHouse, LargeDreamHouse",
- <%= config.bin %> <%= command.id %> -n DreamHouse -u me@my.org,
- <%= config.bin %> <%= command.id %> -n DreamHouse -o "user1@my.org,user2,user3"

# flags.onBehalfOf

comma-separated list of usernames or aliases to assign the permission set to

# flags.permsetName

comma-separated list of permission sets to assign

# flags.target-org.summary

Scratch org alias or login user.
