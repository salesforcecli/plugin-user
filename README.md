# plugin-user

Commands to interact with Users and Permission Sets in a scratch org

## Getting Started

To build the plugin locally, make sure to have yarn installed and run the following commands:

```
Clone the repository
  $ git clone git@github.com:salesforcecli/plugin-user
Install the dependencies and compile
  $ yarn install
  $ yarn prepack
Link your plugin to the sfdx cli
  $ sfdx plugins:link .
To verify
  $ sfdx plugins
```

## Debugging your plugin

We recommend using the Visual Studio Code (VS Code) IDE for your plugin development. Included in the `.vscode` directory of this plugin is a `launch.json` config file, which allows you to attach a debugger to the node process when running your commands.

To debug the `force:user:list` command:

If you linked your plugin to the sfdx cli, call your command with the `dev-suspend` switch:

```sh-session
$ force:user:list -u myOrg@example.com --dev-suspend
```

Alternatively, to call your command using the `bin/run` script, set the `NODE_OPTIONS` environment variable to `--inspect-brk` when starting the debugger:

```sh-session
$ NODE_OPTIONS=--inspect-brk bin/run force:user:list -u myOrg@example.com
```

2. Set some breakpoints in your command code
3. Click on the Debug icon in the Activity Bar on the side of VS Code to open up the Debug view.
4. In the upper left hand corner of VS Code, verify that the "Attach to Remote" launch configuration has been chosen.
5. Hit the green play button to the left of the "Attach to Remote" launch configuration window. The debugger should now be suspended on the first line of the program.
6. Hit the green play button at the top middle of VS Code (this play button will be to the right of the play button that you clicked in step #5).
   ![how to debug](.images/vscodeScreenshot.png)
   Congrats, you are debugging!

## Commands

A list of the available commands

- sfdx force:user:list [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

## `sfdx force:user:list [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

lists all users of a scratch org

```
USAGE
  $ sfdx force:user:list [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -u, --targetusername=targetusername                                               username or alias for the
                                                                                    target org; overrides
                                                                                    default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the
                                                                                    dev hub org; overrides
                                                                                    default dev hub org

  --apiversion=apiversion                                                           override the api version
                                                                                    used for api requests made
                                                                                    by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging
                                                                                    level for this command
                                                                                    invocation

EXAMPLES
  sfdx force:user:list
  sfdx force:user:list -u me@my.org --json
  sfdx force:user:list --json > tmp/MyUserList.json
```

- sfdx force:user:display [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

## `sfdx force:user:display [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

displays information about a user of a scratch org

```
USAGE
  $ sfdx force:user:display [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -u, --targetusername=targetusername                                               username or alias for the
                                                                                    target org; overrides
                                                                                    default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the
                                                                                    dev hub org; overrides
                                                                                    default dev hub org

  --apiversion=apiversion                                                           override the api version
                                                                                    used for api requests made
                                                                                    by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging
                                                                                    level for this command
                                                                                    invocation

EXAMPLES
  sfdx force:user:display
  sfdx force:user:display -u me@my.org --json
```

- sfdx force:user:create [name=value...] [-a <string>] [-f <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

## `sfdx force:user:create [name=value...] [-a <string>] [-f <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

create a user for a scratch org

```USAGE
  $ sfdx force:user:create [name=value...] [-a <string>] [-f <string>] [-v <string>] [-u <string>] [--apiversion
  <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --alias=alias                                                                 set an alias for the created
                                                                                    username to reference within
                                                                                    the CLI

  -f, --definitionfile=definitionfile                                               file path to a user
                                                                                    definition

  -u, --targetusername=targetusername                                               username or alias for the
                                                                                    target org; overrides
                                                                                    default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the
                                                                                    dev hub org; overrides
                                                                                    default dev hub org

  --apiversion=apiversion                                                           override the api version
                                                                                    used for api requests made
                                                                                    by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging
                                                                                    level for this command
                                                                                    invocation

EXAMPLES
  sfdx force:user:create
  sfdx force:user:create -a testuser1 -f config/project-user-def.json
  sfdx force:user:create username=testuser1@my.org email=me@my.org permsets=DreamHouse
  sfdx force:user:create -f config/project-user-def.json email=me@my.org generatepassword=true
```

- force:user:password:generate [-o <array>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

## `force:user:password:generate [-o <array>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

generate a password for scratch org users

```
USAGE
  $ sfdx force:user:password:generate [-o <array>] [-v <string>] [-u <string>] [--apiversion <string>] [--json]
  [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -o, --onbehalfof=onbehalfof                                                       comma-separated list of
                                                                                    usernames or aliases to
                                                                                    assign the password to

  -u, --targetusername=targetusername                                               username or alias for the
                                                                                    target org; overrides
                                                                                    default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the
                                                                                    dev hub org; overrides
                                                                                    default dev hub org

  --apiversion=apiversion                                                           override the api version
                                                                                    used for api requests made
                                                                                    by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging
                                                                                    level for this command
                                                                                    invocation

EXAMPLES
  sfdx force:user:password:generate
  sfdx force:user:password:generate -u me@my.org --json
  sfdx force:user:password:generate -o "user1@my.org,user2@my.org,user3@my.org"
```

- sfdx force:user:permset:assign -n <string> [-o <array>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

## `sfdx force:user:permset:assign -n <string> [-o <array>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

assign a permission set to one or more users of an org

```
USAGE
  $ sfdx force:user:permset:assign -n <string> [-o <array>] [-u <string>] [--apiversion <string>] [--json]
  [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -n, --permsetname=permsetname                                                     (required) the name of the
                                                                                    permission set to assign

  -o, --onbehalfof=onbehalfof                                                       comma-separated list of
                                                                                    usernames or aliases to
                                                                                    assign the permission set to

  -u, --targetusername=targetusername                                               username or alias for the
                                                                                    target org; overrides
                                                                                    default target org

  --apiversion=apiversion                                                           override the api version
                                                                                    used for api requests made
                                                                                    by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging
                                                                                    level for this command
                                                                                    invocation

EXAMPLES
  sfdx force:user:permset:assign -n DreamHouse
  sfdx force:user:permset:assign -n DreamHouse -u me@my.org
  sfdx force:user:permset:assign -n DreamHouse -o "user1@my.org,user2,user3"
```
