# summary

assign a permission set license to one or more users of an org

# description

assign a permission set license to one or more users of an org

# examples

<%= config.bin %> <%= command.id %> -n DreamHouse,
<%= config.bin %> <%= command.id %> -n DreamHouse -u me@my.org,
<%= config.bin %> <%= command.id %> -n DreamHouse -o "user1@my.org,user2,user3"

# flags.onBehalfOf

comma-separated list of usernames or aliases to assign the permission set license to

# flags.name

the name of the permission set license to assign

# duplicateValue

The user "%s" already has the Permission Set License "%s"

# flags.target-org.summary

Scratch org alias or login user.
