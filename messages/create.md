# summary

create a user for a scratch org

# description

Create a user for a scratch org, optionally setting an alias for use by the CLI, assigning permission sets (e.g., permsets=ps1,ps2), generating a password (e.g., generatepassword=true), and setting User sObject fields.,

# examples

- <%= config.bin %> <%= command.id %>
- <%= config.bin %> <%= command.id %> -a testuser1 -f config/project-user-def.json profileName='Chatter Free User'
- <%= config.bin %> <%= command.id %> username=testuser1@my.org email=me@my.org permsets=DreamHouse
- <%= config.bin %> <%= command.id %> -f config/project-user-def.json email=me@my.org generatepassword=true

# flags.alias.summary

set an alias for the created username to reference within the CLI,

# flags.definitionfile.summary

file path to a user definition,

# flags.setuniqueusername.summary

force the username, if specified in the definition file or at the command line, to be unique by appending the org ID

# licenseLimitExceeded

There are no available user licenses for the user profile "%s".

# duplicateUsername

The username "%s" already exists in this or another Salesforce org. Usernames must be unique across all Salesforce orgs.

# success

Successfully created user "%s" with ID %s for org %s.%s
You can see more details about this user by running "<%= config.bin %> user:display -u %s".
