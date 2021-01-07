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
		if(room.controller.my)
		{
			out += '\n' + room.name;
			out += ind + 'energy: ' + room.energyAvailable + '/' + room.energyCapacityAvailable;
			out += ind + 'creeps: ' + room.find(FIND_CREEPS).length;
		}
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
	let bodyLvl = (args.length >= 2) ? parseInt(args[2]) : 0;
	let n = role.generate(Memory.default.spawn, bodyLvl);
	console.log('spawn: ' + n);
}

function invade(args)
{
	if(args[1])
	{
		Memory.invasionTarget = args[1];
		if (_.sum(Game.creeps, (c) => c.memory.role == 'claimer') == 0) { roles['claimer'].generate(Memory.default.spawn); }
	}
	else { console.log('Missing target argument'); }
}

function analyzeRoom(args)
{
	if(!args[1])
	{
		console.log('ERROR: missing room name');
		return(-1);
	}
	if(!Game.rooms[args[1]])
	{
		console.log('ERROR: requested room doesn\'t exist');
		return(-1);
	}
	if(!Memory.rooms[args[1]]) {Memory.rooms[args[1]] = {}; }
	if(!Memory.rooms[args[1]].roles) { Memory.rooms[args[1]].roles = {}; }
	for(let role in roles)
	{
		if(!Memory.rooms[args[1]].roles[role]){ Memory.rooms[args[1]].roles[role] = {}; }
		if(!Memory.rooms[args[1]].roles[role].body){ Memory.rooms[args[1]].roles[role].body = {}; }
		Memory.rooms[args[1]].roles[role].body.lvl = Memory.roles[role].body.lvl;
	}
	let room = Game.rooms[args[1]];
	
	//Sources and Containers
	Memory.rooms[args[1]].sources = {};
	let sources = room.find(FIND_SOURCES);
	Memory.rooms[args[1]].sources.total = sources.length;
	let mines_count = 0;
	for(let i in sources)
	{
		let source = sources[i];
		Memory.rooms[args[1]].sources[source.id] = {};
		let containers = source.pos.findInRange(FIND_STRUCTURES, 1, {filter: (s) => s.structureType == STRUCTURE_CONTAINER});
		if(containers)
		{
			Memory.rooms[args[1]].sources[source.id].container = containers[0].id;
			mines_count += 1;
		}
	}
	Memory.rooms[args[1]].roles.miner.required = mines_count;
	Memory.rooms[args[1]].roles.miner.body.lvl = 4;
	
	// Roles Requirements
	// Storers
	let lvl = 0;
	let cost = 0;
	do
	{
		lvl += 1;
		let plus_cost = roles['storer'].bodyCost(lvl);
		if (plus_cost == cost) { break; }
		else { cost = plus_cost; }
	} while (cost < (0.7 * room.energyCapacityAvailable));
	if(mines_count == 0) { Memory.rooms[args[1]].roles.storer.required = 0; }
	else { Memory.rooms[args[1]].roles.storer.required = Math.ceil((room.energyCapacityAvailable /
		(200 * _.sum(roles['storer'].body(lvl), (b) => b == CARRY)))); } // 200 = 50 * 4
	Memory.rooms[args[1]].roles.storer.body = {};
	Memory.rooms[args[1]].roles.storer.body.lvl = lvl;
	// Workers
	lvl = 0;
	cost = 0;
	do
	{
		lvl += 1;
		let plus_cost = roles['worker'].bodyCost(lvl);
		if (plus_cost == cost) { break; }
		else { cost = plus_cost; }
	} while (cost < (0.8 * room.energyCapacityAvailable))
	Memory.rooms[args[1]].roles.worker.required = Math.ceil((900 * Memory.rooms[args[1]].sources.total / // 900 = 0.3 * 3000
		(50 * _.sum(roles['worker'].body(lvl), (b) => b == CARRY))));
	Memory.rooms[args[1]].roles.worker.body = {};
	Memory.rooms[args[1]].roles.worker.body.lvl = lvl;
	// Defenders
	if(room.energyCapacityAvailable >= 500) { Memory.rooms[args[1]].roles.defender.required = 3; }
	else { Memory.rooms[args[1]].roles.defender.required = 0; }
	Memory.rooms[args[1]].roles.defender.body.lvl = 1;
	
	if(args[2] && args[2] == 'build')
	{
		//TODO
	}
	
	console.log('Room ' + args[1] + ' computed successfully');
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
		else if(args[0] == 'analyze_room') { analyzeRoom(args); }
		else { console.log('Command not recognized'); }
	}
}