Memory.emperor = 'ivny';
Memory.default = {};
Memory.default.spawn = 'Spawn1';

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
		for(let spawn_name in Game.spawns)
		{
			if(!Game.spawns[spawn_name].spawning)
			{
				let room = Game.spawns[spawn_name].room;
				for(let role_name in roles)
				{
					let role = roles[role_name];
					let n = _.sum(room.find(FIND_CREEPS), (c) => c.memory.role == role_name);
					let req = Memory.roles[role_name].reqNumber;
					if(n < req)
					{
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
	}

    for(let name in Game.creeps)
	{
        let creep = Game.creeps[name];
		creep.runRole();
    }
	
	var towers = _.filter(Game.structures, s => s.structureType == STRUCTURE_TOWER);
    // for each tower
    for (let tower of towers) {
        // run tower logic
        tower.defend();
    }
}