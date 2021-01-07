Memory.emperor = 'ivny';
Memory.default = {};
Memory.default.spawn = 'Spawn1';
if(!Memory.rooms) { Memory.rooms = {}; }

var roles = require('roles.collection');
var cmd = require('commands');

module.exports.loop = function ()
{
	if(Memory.cmd)
	{
		try
		{
			cmd.exec(Memory.cmd);
		}
		finally
		{
			Memory.cmd = '';
		}
	}
	
	if((Game.time % 500) == 0)
	{
		console.log('Cleaning creep memory');
		for (let name in Memory.creeps)
		{
			if (Game.creeps[name] == undefined)
			{
				delete Memory.creeps[name];
			}
		}
	}
	
	if((Game.time % 11) == 0)
	{
		// TODO: Evitare ripetizioni tra i due loop (magari creare pila di spawn da fare)
		for(room_name in Game.rooms)
		{
			try
			{
				let room = Game.rooms[room_name];
				if(room.controller.my)
				{
					for(role_name in roles)
					{
						let n = _.sum(room.find(FIND_CREEPS), (c) => c.memory.role == role_name);
						Memory.rooms[room_name].roles[role_name].count = n;
					}
				}
			}
			catch(err) { console.log('ERROR - room ' + room_name + ':\n' + err); }
		}
		for(let spawn_name in Game.spawns)
		{
			try
			{
				if(!Game.spawns[spawn_name].spawning)
				{
					let room = Game.spawns[spawn_name].room;
					for(let role_name in roles)
					{
						let role = roles[role_name];
						let n = _.sum(room.find(FIND_CREEPS), (c) => c.memory.role == role_name);
						let req = (Memory.rooms[room.name].roles[role_name]) ? Memory.rooms[room.name].roles[role_name].required : Memory.roles[role_name].required;
						if(n < req)
						{
							let lvl = (Memory.rooms[room.name].roles[role_name]) ? Memory.rooms[room.name].roles[role_name].body.lvl : Memory.roles[role_name].body.lvl;
							let r = role.generate(spawn_name);
							if(!(r < 0))
							{
								console.log('Generating ' + role_name + ' creep');
							}
							break;
						}
					}
				}
			}
			catch(err) { console.log('ERROR - spawn ' + spawn_name + ':\n' + err); }
		}
	}

    for(let name in Game.creeps)
	{
        let creep = Game.creeps[name];
		try { creep.runRole(); }
		catch(err) { console.log('ERROR - creep ' + name + ' (role ' + creep.memory.role + '):\n' + err); }
		
    }
	
	var towers = _.filter(Game.structures, s => s.structureType == STRUCTURE_TOWER);
    // for each tower
    for (let tower of towers) {
        // run tower logic
        tower.defend();
    }
}