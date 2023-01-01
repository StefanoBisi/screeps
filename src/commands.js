var roles = require('roles.collection');

function rolesReport()
{
	const ind = '\n  ';
	let out = 'Role Report:';
	for(let room_name in Game.rooms)
	{
		let room = Game.rooms[room_name];
		if(room.controller.my)
		{
			out += '\n' + room.name;
			let creeps = room.find(FIND_MY_CREEPS);
			for(let role_name in roles)
			{
				let n = _.sum(creeps, (c) => c.memory.role == role_name);
				out += ind + role_name + ': ' + n;
			}
		}
	}
	console.log(out);
}

function roomsReport()
{
	const ind = '\n  ';
	let out = 'Rooms Report:';
	for(let room_name in Game.rooms)
	{
		let room = Game.rooms[room_name];
		if(room.controller.my)
		{
			out += '\n' + room.name;
			out += ind + 'energy: ' + room.energyAvailable + '/' + room.energyCapacityAvailable;
			out += ind + 'creeps: ' + room.find(FIND_MY_CREEPS).length;
		}
	}
	console.log(out);
}

function clearDebug()
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
	let arg_count = 1;
	let spawn_name = Memory.default.spawn;
	if(Memory.rooms[args[arg_count]])
	{
		spawn_name = Memory.rooms[args[arg_count]].default.spawn;
		arg_count += 1;
	}
	else if(Game.spawns[args[arg_count]])
	{
		spawn_name = args[arg_count];
		arg_count += 1;
	}
	let role = roles[args[arg_count]]
	let bodyLvl = (args.length > (arg_count+1)) ? parseInt(args[arg_count+1]) : Memory.roles[role.name].body.lvl;
	let n = role.generate(spawn_name, bodyLvl);
	console.log('spawn: ' + n);
}

function invade(args)
{
	if(args[1])
	{
		Memory.invasionTarget = args[1];
		//if (_.sum(Game.creeps, (c) => c.memory.role == 'claimer') == 0) { roles['claimer'].generate(Memory.default.spawn); }
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
	if(!Memory.rooms[args[1]].default) { Memory.rooms[args[1]].default = {}; }
	if(!Memory.rooms[args[1]].invaded) { Memory.rooms[args[1]].invaded = false; }
	for(let role in roles)
	{
		if(!Memory.rooms[args[1]].roles[role]){ Memory.rooms[args[1]].roles[role] = {}; }
		if(!Memory.rooms[args[1]].roles[role].body){ Memory.rooms[args[1]].roles[role].body = {}; }
		Memory.rooms[args[1]].roles[role].body.lvl = Memory.roles[role].body.lvl;
		Memory.rooms[args[1]].roles[role].required = 0;
	}
	let room = Game.rooms[args[1]];
	
	try{
		Memory.rooms[args[1]].auto = true;
		// Default Spawn
		let spawns = room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_SPAWN});
		if(spawns.length > 0) { Memory.rooms[args[1]].default.spawn = spawns[0].name; }
		else { Memory.rooms[args[1]].auto = false; }
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
			if(containers.length > 0)
			{
				Memory.rooms[args[1]].sources[source.id].container = containers[0].id;
				mines_count += 1;
			}
		}
		// Mineral Mine
		let mineral = room.find(FIND_MINERALS)[0];
		Memory.rooms[args[1]].mineral = {};
		Memory.rooms[args[1]].mineral.id = mineral.id;
		let extractors = room.find(FIND_STRUCTURES, (s) => s.structureType == STRUCTURE_EXTRACTOR);
		if(extractors.length > 0) { Memory.rooms[args[1]].mineral.extractor = extractors[0].id; }
		let containers = mineral.pos.findInRange(FIND_STRUCTURES, 1,
			{filter: (s) => s.structureType == STRUCTURE_CONTAINER});
		if(containers.length > 0)
		{
			mines_count += 1;
			Memory.rooms[args[1]].mineral.container = containers[0].id;
		}
		Memory.rooms[args[1]].mineral.ready = (extractors.length > 0 && containers.length > 0);
		
		// Distances
		let source_to_controller = [];
		let source_to_spawn = [];
		for(let i in sources)
		{
			source_to_controller.push(PathFinder.search(sources[i].pos, {pos: room.controller.pos, range: 1}));
			if(spawns.length > 0) { source_to_spawn.push(PathFinder.search(sources[i].pos, {pos: spawns[0].pos, range: 1})); }
		}
		
		// Roles Requirements
		// Miners
		let lvl = 0;
		let cost = 0;
		do
		{
			lvl += 1;
			let plus_cost = roles['storer'].bodyCost(lvl);
			if (plus_cost == cost) { break; }
			else { cost = plus_cost; }
		} while (cost < room.energyCapacityAvailable);
		lvl = (lvl == 0) ? 0 : (lvl - 1);
		Memory.rooms[args[1]].roles.miner.body.lvl = lvl;
		Memory.rooms[args[1]].roles.miner.required = mines_count;
		// Storers
		lvl = 0;
		cost = 0;
		do
		{
			lvl += 1;
			let plus_cost = roles['storer'].bodyCost(lvl);
			if (plus_cost == cost) { break; }
			else { cost = plus_cost; }
		} while (cost < (0.8 * room.energyCapacityAvailable));
		lvl = (lvl == 0) ? 0 : (lvl - 1);
		Memory.rooms[args[1]].roles.storer.required = mines_count;
		Memory.rooms[args[1]].roles.storer.body = {};
		Memory.rooms[args[1]].roles.storer.body.lvl = lvl;
		// Workers
		lvl = 0;
		cost = 0;
		let avg_travel = 50
		let miner_lvl = Memory.rooms[args[1]].roles.miner.body.lvl
		let carry_overflow = false;
		for(let i in source_to_controller) { avg_travel += source_to_controller[i].path.length; }
		do
		{
			lvl += 1;
			let plus_cost = roles['worker'].bodyCost(lvl);
			if (plus_cost == cost) { break; }
			else { cost = plus_cost; }
			carry_overflow = (miner_lvl * 2 * avg_travel) < lvl * 50;
		} while (cost < (0.8 * room.energyCapacityAvailable) && !carry_overflow);
		lvl = (lvl == 0) ? 0 : (lvl - 1);
		Memory.rooms[args[1]].roles.worker.required = 2 * Memory.rooms[args[1]].sources.total;
		Memory.rooms[args[1]].roles.worker.body = {};
		Memory.rooms[args[1]].roles.worker.body.lvl = lvl;
		// Defenders
		// TODO: Numero minimo e livello dinamici
		if(room.energyCapacityAvailable >= 500) { Memory.rooms[args[1]].roles.defender.required = 3; }
		else { Memory.rooms[args[1]].roles.defender.required = 0; }
		Memory.rooms[args[1]].roles.defender.body.lvl = 2;
		
		if(args[2] && args[2] == 'build')
		{
			//TODO
		}
		
		console.log('Room ' + args[1] + ' computed successfully');
	}
	catch(err)
	{
		if(err.stack) { console.log('Error analyzing room ' + args[1] + ':\n' + err.stack); }
		else { console.log('Error analyzing room ' + args[1] + ':\n' + err); }
		Memory.rooms[args[1]].auto = false;
	}
}


function test(args)
{
	for(let c in Game.creeps){
		let creep = Game.creeps[c];
		if(c.role == undefined){
			console.log(c.name);
		}
	}
}

Memory.cmd = '';

module.exports = 
{
	exec: function(cmd)
	{
		let args = cmd.split(" ");
		if(args[0] == 'roles_report'){ rolesReport(); }
		else if(args[0] == 'rooms_report') { roomsReport(); }
		else if(args[0] == 'clear_debug') { clearDebug(); }
		else if(args[0] == 'spawn') { spawn(args); }
		else if(args[0] == 'analyze_room') { analyzeRoom(args); }
		else if(args[0] == 'test') { test(args); }
		else { console.log('Command not recognized'); }
	}
}