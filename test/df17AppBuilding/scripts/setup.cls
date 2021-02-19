list<Volunteer_Event__c> events = [select Id, Start__c, End__c from Volunteer_Event__c];

integer k = 7;

for (Volunteer_Event__c ve:events){
	ve.Start__c = dateTime.newInstance(system.now().addDays(k).year(), system.now().addDays(k).month(), system.now().addDays(k).day(), 8, 0, 0);
	ve.End__c = dateTime.newInstance(system.now().addDays(k).year(), system.now().addDays(k).month(), system.now().addDays(k).day(), 12, 0, 0);
	k = k + 7;
}

update events;