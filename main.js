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
		room_loop: for(room_name in Game.rooms)
		{
			try
			{
				let room = Game.rooms[room_name];
				if(room.controller.my && Memory.rooms[room_name] && Memory.rooms[room_name].auto)
				{
					let creeps_tot = 0;
					let spawn_name = Memory.rooms[room.name].default.spawn;
					role_loop: for(role_name in roles)
					{
						let n = _.sum(room.find(FIND_CREEPS), (c) => c.memory.role == role_name);
						Memory.rooms[room_name].roles[role_name].count = n;
						let req = Memory.rooms[room.name].roles[role_name].required;
						if(n < req && !Game.spawns[spawn_name].spawning)
						{
							let role = roles[role_name];
							let lvl =  Memory.rooms[room.name].roles[role_name].body.lvl;
							let r = role.generate(spawn_name, lvl);
							if(!(r < 0))
							{
								console.log(room_name + ' - Generating ' + role_name + ' creep');
								creeps_tot += 1;
								break role_loop;
							}
						}
						creeps_tot += n;
					}
					if(creeps_tot == 0) { roles.worker.generate(spawn_name, 0); }
				}
			}
			catch(err) { console.log('ERROR - room ' + room_name + ':\n' + err.stack); }
		}
	}

    for(let name in Game.creeps)
	{
        let creep = Game.creeps[name];
		try { creep.runRole(); }
		catch(err) { console.log('ERROR - creep ' + name + ' (role ' + creep.memory.role + '):\n' + err.stack); }
		
    }
	
	var towers = _.filter(Game.structures, s => s.structureType == STRUCTURE_TOWER);
    for (let tower of towers) { tower.defend(); }
}