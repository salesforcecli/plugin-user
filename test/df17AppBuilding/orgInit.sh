sfdx shane:org:create -f config/project-scratch-def.json -s -d 1 --userprefix blitz --userdomain back.log
sfdx source:push
sfdx user:permset:assign -n VolunteeringApp
sfdx data:tree:import -p data/masterImportPlan.json
sfdx apex:execute -f scripts/setup.cls
sfdx shane:user:password:set -p sfdx1234 -g User -l User
sfdx org:open
