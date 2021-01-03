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

function roomsReport()
{
	let out = 'Rooms Report:';
	const ind = '\n  ';
	for(let room_name in Game.rooms)
	{
		let room = Game.rooms[room_name];
		/*if(room.controller.my) { */
		out += '\n' + room.name;
		out += ind + 'energy: ' + room.energyAvailable + '/' + room.energyCapacityAvailable;
		out += ind + 'creeps: ' + room.find(FIND_CREEPS).length;
	}
	console.log(out);
}

function cleanDebug()
{
	let out = 'Deleted:';
	for(let entry in Memory)
	{
		if(entry.toLowerCase().includes('debug'))
		{
			delete Memory[entry];
			out += '\n' + entry;
		}
	}
	console.log(out);
}

function spawn(args)
{
	let role = roles[args[1]]
	//let bodyLvl = (args.length >= 2) ? args[2] : 0;
	let n = role.generate(Game.spawns['Spawn1']/*, bodyLvl*/);
	console.log('spawn: ' + n);
}

function setRole(args)
{
	Memory.roles[args[1]][args[2]] = args[3];
}

function invade(args)
{
}

Memory.cmd = '';

module.exports = 
{
	exec: function(cmd)
	{
		let args = cmd.split(" ");
		if(args[0] == 'roles_report'){ rolesReport(); }
		else if(args[0] == 'rooms_report') { roomsReport(); }
		else if(args[0] == 'clean_debug') { cleanDebug(); }
		else if(args[0] == 'spawn') { spawn(args); }
		else if(args[0] == 'set_role') { setRole(args); }
		else { console.log('Command not recognized'); }
	}
}