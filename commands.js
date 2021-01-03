var roles = require('roles.collection');

function rolesReport()
{
	let out = 'Role Report:';
	for(let role_name in roles)
	{
		let n = _.sum(Game.creeps, (c) => c.memory.role == role_name);
		out += '\n' + role_name + ': ' + n;
	}
	console.log(out);
}

function spawn(args)
{
	let role = roles[args[1]]
	let n = role.generate(Game.spawns['Spawn1']);
	console.log('spawn: ' + n);
}

function setRole(args)
{
	role = roles[args[1]];
	role[args[2]] = args[3];
}

Memory.cmd = '';

module.exports = 
{
	exec: function(cmd)
	{
		let args = cmd.split(" ");
		if(args[0] == 'roles_report'){ rolesReport(); }
		else if(args[0] == 'spawn') { spawn(args); }
		else if(args[0] == 'set_role') { setRole(args); }
		else { console.log('Command not recognized'); }
	}
}