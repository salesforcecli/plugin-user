sfdx shane:org:create -f config/project-scratch-def.json -s -d 1 --userprefix blitz --userdomain back.log
sfdx force:source:push
sfdx force:user:permset:assign -n VolunteeringApp
sfdx force:data:tree:import -p data/masterImportPlan.json
sfdx force:apex:execute -f scripts/setup.cls
sfdx shane:user:password:set -p sfdx1234 -g User -l User
sfdx force:org:open
