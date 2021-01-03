var roles = require('roles.collection');
var cmd = require('commands');

module.exports.loop = function ()
{
	if(Memory.cmd != '')
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
	
	for(let role_name in roles)
	{
		let role = roles[role_name];
		let n = _.sum(Game.creeps, (c) => c.memory.role == role_name)
		let req = (role.reqNumber == undefined) ? 2 : role.reqNumber;
		if(n < req)
		{
			let r = role.generate(Game.spawns['Spawn1']);
			if(!(r < 0))
			{
				console.log('Generating ' + role_name + ' creep');
			}
			break;
		}
	}

    for(let name in Game.creeps)
	{
        let creep = Game.creeps[name];
		creep.runRole();
    }
}