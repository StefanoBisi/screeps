if(!Memory.roles) { Memory.roles = {}; }
var defaultBodyLvl = 0;

function minerBody(lvl = 0)
{
	if(lvl < 0) { lvl = 0; }
	if(lvl > 4) { lvl = 4; }
	let _body = [];
	for(let i=0; i<(lvl+1); i++) { _body.push(WORK) }
	_body.push(MOVE);
	return _body;
}

function storerBody(lvl = 0)
{
	if(lvl < 0) { lvl = 0; }
	if(lvl > 6) { lvl = 6; }
	let _body = [];
	let n = Math.ceil((lvl+1)/2);
	for(let i=0; i<(lvl+1); i++) { _body.push(CARRY); }
	for(let i=0; i<(n); i++) { _body.push(MOVE); }
	return _body;
}

function workerBody(lvl = 0)
{
	if(lvl < 0) { lvl = 0; }
	if(lvl > 15) { lvl = 15; }
	let w = [], c = [], m = [];
	let _body = [];
	for(let i=0; i<(lvl+1); i++) { _body.push(WORK); }
	for(let i=0; i<(lvl+1); i++) { _body.push(CARRY); }
	for(let i=0; i<(lvl+1); i++) { _body.push(MOVE); }
	return _body;
}

function defenderBody(lvl = 0)
{
	if(lvl < 0) { lvl = 0; }
	let _body = [];
	for(let i=0; i<(lvl); i++) { _body.push(TOUGH); }
	for(let i=0; i<(lvl+2); i++) { _body.push(ATTACK); }
	for(let i=0; i<(lvl+1); i++) { _body.push(MOVE); }
	return _body;
}

function trooperBody(lvl = 0)
{
	if(lvl < 0) { lvl = 0; }
	let _body = [];
	for(let i=0; i<(lvl+1); i++) { _body.push(ATTACK); }
	for(let i=0; i<(lvl+1); i++) { _body.push(MOVE); }
	return _body;
}

function claimerBody(lvl = 0)
{
	if(lvl < 0) { lvl = 0; }
	let _body = [];
	for(let i=1; i<lvl; i++) { _body.push(TOUGH) }
	if(lvl > 0) { _body.push(ATTACK); }
	for(let i=0; i<(lvl+1); i++) { _body.push(MOVE); }
	_body.push(CLAIM);
	return _body;
}

function bodyCost(body)
{
	let _cost = 0;
	for(let i in body) { _cost += BODYPART_COST[body[i]]; }
	return _cost;
}

const TASKS = {none: 0, upgrade: 1, build: 2, repair: 3, store:4, refill: 5, harvest: 6, mine: 7};
const TARGET_TYPES = {ENERGY_STORE: 0, MINERAL_STORE: 1, RESOURCE: 2};

function upgradeController(creep)
{
	if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE)
	{
		creep.moveTo(creep.room.controller);
	}
}

function runMiner(creep)
{
	if(creep.memory.target)
	{
		if(creep.memory.task == TASKS.harvest)
		{
			let source = Game.getObjectById(creep.memory.target);
			let container = undefined;
			if(source) { container = Game.getObjectById(Memory.rooms[source.room.name].sources[source.id].container); }
			if(!source || !container)
			{
				creep.memory.target = undefined;
			}
			else
			{
				if(creep.pos != container.pos) { creep.moveTo(container); }
				if(source.energy > 0 && container.store.getFreeCapacity() > 0) { creep.harvest(source); }

			}
		}
		else if (creep.memory.task == TASKS.mine)
		{
			let mineral = Game.getObjectById(creep.memory.target);
			let extractor = Game.getObjectById(Memory.rooms[creep.room.name].mineral.extractor);
			let container = Game.getObjectById(Memory.rooms[creep.room.name].mineral.container);
			if(!extractor || !container)
			{
				creep.memory.target = undefined;
			}
			else
			{
				if(creep.pos != container.pos) { creep.moveTo(container); }
				if(mineral.mineralAmount > 0 && container.store.getFreeCapacity() > 0)
					{ creep.harvest(mineral); }

			}
		}
	}
	else
	{
		let target = undefined;
		let room = creep.room.name;
		for(let id in Memory.rooms[room].sources)
		{
			if(id == 'total') { continue; }
			let check = true;
			for(let c in Game.creeps)
			{
				if(c == creep.name) { continue; }
				if(Game.creeps[c].memory.role == 'miner' && Game.creeps[c].memory.target == id)
				{
					check = false;
					break;
				}
			}
			if(check)
			{
				target = id;
				creep.memory.task = TASKS.harvest;
			}
		}
		if(!target && Memory.rooms[room].mineral.ready) // Minerali
		{
			let check = true;
			let id = Memory.rooms[room].mineral.id;
			for(let c in Game.creeps)
			{
				if(c == creep.name) { continue; }
				if(Game.creeps[c].memory.role == 'miner' && Game.creeps[c].memory.target == id)
				{
					check = false;
					break;
				}
			}
			if(check)
			{
				target = id;
				creep.memory.task = TASKS.mine;
			}
		}
		creep.memory.target = target;
	}
}

function runStorer(creep)
{
	let task = creep.memory.task;
	let energyRequired = creep.room.energyAvailable < creep.room.energyCapacityAvailable;
	let mineralType = Game.getObjectById(Memory.rooms[creep.room.name].mineral.id).mineralType;
	let findEnergyDeposit = function()
	{
		let target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, { filter: function(s)
			{
				let type = (s.structureType == STRUCTURE_SPAWN
				|| s.structureType == STRUCTURE_EXTENSION
				|| s.structureType == STRUCTURE_TOWER);
				let not_full = s.energy < s.energyCapacity;
				let free = true;
				for(let creep_name in Game.creeps)
				{
					let creep = Game.creeps[creep_name];
					if(creep.memory.role == 'storer' && creep.memory.target == s.id)
					{
						free = false;
						break;
					}
				}
				return(type && not_full && free);
			}
		});
		return target;
	}
	let findMineralDeposit = function()
	{
		let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: function(s)
		{
			if(s.structureType == STRUCTURE_CONTAINER &&  s.store.getFreeCapacity() > 0)
			{
				not_mineral_mine = s.id != Memory.rooms[creep.room.name].mineral.container;
				not_energy_mine = s.pos.findInRange(FIND_SOURCES, 1).length == 0;
				return not_mineral_mine && not_energy_mine;
			}
			else if (s.structureType == STRUCTURE_STORAGE &&  s.store.getFreeCapacity() > 0) { return true; }
			else { return false; }
		}});
		return target;
	};
	
	if(task == TASKS.none)
	{
		if(creep.store.getUsedCapacity() == 0)
		{
			let target = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: function(r)
				{
					for(let creep_name in Game.creeps)
					{
						let creep = Game.creeps[creep_name];
						if(creep.memory.role == 'storer' && creep.memory.target == r.id) { return false; }
					}
					return false;
				}
			});
			if(target) { creep.memory.target_type = TARGET_TYPES.RESOURCE; }
			if(energyRequired && !target)
			{
				target = creep.pos.findClosestByPath(FIND_STRUCTURES,
					{filter: (c) => c.structureType == STRUCTURE_CONTAINER && c.store[RESOURCE_ENERGY] >= creep.store.getCapacity()});
				if(!target) { target = creep.pos.findClosestByPath(FIND_STRUCTURES,
					{filter: (c) => c.structureType == STRUCTURE_CONTAINER && c.store[RESOURCE_ENERGY] > 0}); }
				if(!target) { target = creep.pos.findClosestByPath(FIND_TOMBSTONES, {filter: (t) => t.store.getUsedCapacity() > 0}); }
				if(!target) { target = creep.pos.findClosestByPath(FIND_RUINS, {filter: (t) => t.store.getUsedCapacity() > 0}); }
				if(target) { creep.memory.target_type = TARGET_TYPES.ENERGY_STORE; }
			}
			if(!target)
			{
				let container = Game.getObjectById(Memory.rooms[creep.room.name].mineral.container);
				if(container.store.getUsedCapacity() > 0)
				{
					target = container;
					creep.memory.target_type = TARGET_TYPES.MINERAL_STORE;
				}
			}
			if(target)
			{
				creep.memory.target = target.id;
				creep.memory.task = TASKS.refill;
			}
		}
		else if(creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && energyRequired)
		{
			let target = findEnergyDeposit();
			if(target)
			{
				creep.memory.target = target.id;
				creep.memory.target_type = TARGET_TYPES.ENERGY_STORE;
				creep.memory.task = TASKS.store;
			}
		}
		else if (creep.store.getUsedCapacity(mineralType) > 0)
		{
			let target = findMineralDeposit();
			if(target)
			{
				creep.memory.target = target.id;
				creep.memory.target_type = TARGET_TYPES.MINERAL_STORE;
				creep.memory.task = TASKS.store;
			}
		}
	}
	if(task == TASKS.refill)
	{
		let target = Game.getObjectById(creep.memory.target);
		let target_type = creep.memory.target_type;
		let n = OK;
		if(!creep.pos.isNearTo(target.pos)) { creep.moveTo(target);}
		else if(target_type == TARGET_TYPES.RESOURCE) { n = creep.pickup(target); }
		else if(target_type == TARGET_TYPES.ENERGY_STORE) { n = creep.withdraw(target, RESOURCE_ENERGY); }
		else if(target_type == TARGET_TYPES.MINERAL_STORE)
			{n = creep.withdraw(target, Memory.rooms[creep.room.name].mineral.type); }
		if(n != OK) { creep.memory.task = TASKS.none; }
	}
	else if(task == TASKS.store)
	{
		let type = undefined;
		if(creep.memory.target_type == TARGET_TYPES.ENERGY_STORE) { type = RESOURCE_ENERGY; }
		else if(creep.memory.target_type == TARGET_TYPES.MINERAL_STORE) { type = mineralType; }
		if(creep.store.getUsedCapacity(type) == 0) { creep.memory.task = TASKS.none; return(OK); }
		if(type == RESOURCE_ENERGY && !energyRequired) { creep.memory.task = TASKS.none; return(OK); }

		let target = Game.getObjectById(creep.memory.target);
		if(target.store.getFreeCapacity() == 0) { creep.memory.task = TASKS.none; return(OK); }
		if(!creep.pos.isNearTo(target.pos)) { creep.moveTo(target); }
		else
		{
			let n = creep.transfer(target, type);
			creep.memory.task = TASKS.none;
		}
	}
}

function runWorker(creep)
{
	if(creep.memory.task == TASKS.refill)
	{
		if(creep.store.getFreeCapacity() == 0)
		{
			creep.memory.task = TASKS.none;
			creep.memory.target = undefined;
		}
		else
		{
			if(Memory.rooms[creep.room.name].roles.miner.count == 0)
			{
				// Handle "no miner(s)" case
				let target = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
				if(target)
				{
					if(creep.harvest(target) == ERR_NOT_IN_RANGE) { creep.moveTo(target); }
					return(OK);
				}
			}
			let target = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES,
				{filter: (r) => r.resourceType == RESOURCE_ENERGY && r.amount >= creep.store.getCapacity()});
			if(target) { if(creep.pickup(target) == ERR_NOT_IN_RANGE) { creep.moveTo(target); } }
			else
			{
				target = creep.pos.findClosestByPath(FIND_STRUCTURES,
					{filter: (s) => s.structureType == STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] >= creep.store.getCapacity()});
				if(!target) { target = creep.pos.findClosestByPath(FIND_STRUCTURES,
					{filter: (s) => s.structureType == STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 0}); }
				if(target)
				{
					let n = creep.withdraw(target, RESOURCE_ENERGY);
					if( n == ERR_NOT_IN_RANGE) { creep.moveTo(target); }
					else
					{
						creep.memory.task = TASKS.none;
						creep.memory.target = undefined;
					}
				}
			}
		}
	}
	else
	{
		if(!creep.memory.task) { creep.memory.task = TASKS.none; }
		if(creep.store.getUsedCapacity() == 0) { creep.memory.task = TASKS.refill; }
		if(creep.memory.task == TASKS.none) // Find a target and task
		{
			// If the controller's timer is expiring, upgrade
			if(creep.room.controller.ticksToDowngrade <= 1000)
			{
				creep.memory.target = creep.room.controller.id;
				creep.memory.task = TASKS.upgrade;
				return(OK);
			}
			// If storers are missing, act like a harvester
			if(Memory.rooms[creep.room.name].roles.storer.count == 0
				|| Memory.rooms[creep.room.name].roles.miner.count == 0)
			{
				let target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
				filter: (s) => (s.structureType == STRUCTURE_SPAWN
					|| s.structureType == STRUCTURE_EXTENSION
					|| s.structureType == STRUCTURE_TOWER)
					&& s.energy < s.energyCapacity
				});
				if(target)
				{
					creep.memory.target = target.id;
					creep.memory.task = TASKS.store;
					return(OK);
				}
			}
			// Look for a structure to repair (not being repaired already)
			let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: function(s)
				{
					for(let _c in Game.creeps)
					{
						//if _c == creep.name { continue; }
						if(Memory.creeps[_c].role == 'worker' && Memory.creeps[_c].target == s.id) { return(false); }
					}
					return(s.hits < s.hitsMax && s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART);
				}});
			if(target)
			{
				creep.memory.target = target.id;
				creep.memory.task = TASKS.repair;
				return(OK);
			}
			// Look for a site to build
			target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
			if(target)
			{
				creep.memory.target = target.id;
				creep.memory.task = TASKS.build;
				return(OK);
			}
			// Upgrade the controller
			creep.memory.target = creep.room.controller.id;
			creep.memory.task = TASKS.upgrade;
			return(OK);
		}
		// Execute task
		let n = OK;
		let _target = Game.getObjectById(creep.memory.target);
		if(creep.memory.task == TASKS.store)
		{
			// Store
			n = creep.transfer(_target, RESOURCE_ENERGY);
		}
		if(creep.memory.task == TASKS.repair)
		{
			// Repair
			if(_target.hits == _target.hitsMax) { creep.memory.task = TASKS.none; }
			else { n = creep.repair(Game.getObjectById(creep.memory.target)); }
		}
		else if (creep.memory.task == TASKS.build)
		{
			// Build
			n = creep.build(Game.getObjectById(creep.memory.target));
		}
		else if (creep.memory.task == TASKS.upgrade)
		{
			// Upgrade
			n = creep.upgradeController(Game.getObjectById(creep.memory.target));
		}
		if(n == ERR_NOT_IN_RANGE) { creep.moveTo(Game.getObjectById(creep.memory.target)); }
		else if(n != OK)
		{
			creep.memory.target = undefined;
			creep.memory.task = TASKS.none;
		}
	}
}

function runDefender(creep)
{
	let target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
	if(target != undefined)
	{
		if(creep.attack(target) == ERR_NOT_IN_RANGE)
		{
			creep.moveTo(target);
		}
	}
	else
	{
		if(Math.abs(creep.pos.x - creep.room.controller.pos.x > 5)
			|| Math.abs(creep.pos.y - creep.room.controller.pos.y > 5))
			{ creep.moveTo(creep.room.controller); }
	}
	
}

function runTrooper(creep)
{
	if(Memory.invasionTarget)
	{
		if(creep.room.name != Memory.invasionTarget)
		{
			creep.moveTo(creep.pos.findClosestByRange(creep.room.findExitTo(Memory.invasionTarget)));
		}
		else
		{
			let target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
			if (target != undefined)
			{
				if(creep.attack(target) == ERR_NOT_IN_RANGE) { creep.moveTo(target); }
			}
			else { creep.moveTo(creep.room.controller) }
		}
	}
}

function runClaimer(creep)
{
	if(Memory.invasionTarget)
	{
		if(creep.room.name != Memory.invasionTarget)
		{
			creep.moveTo(creep.pos.findClosestByRange(creep.room.findExitTo(Memory.invasionTarget)));
		}
		else
		{
			let target = creep.room.controller;
			if (target.my) { Memory.invasionTarget = ''; }
			else
			{
				if(target.level > 0)
				{
					if(creep.attackController(target) == ERR_NOT_IN_RANGE)
					{
						creep.moveTo(target);
					}
				}
				else
				{
					if(creep.claimController(target) == ERR_NOT_IN_RANGE)
					{
						creep.moveTo(target);
					}
				}
			}
		}
	}
}

function Role(_name, _required, _body, _runFunction, _defaultBodyLvl = defaultBodyLvl)
{
	this.name = _name;
	this.generateBody = _body;
	this.run = _runFunction;
	
	if(!Memory.roles[_name]) { Memory.roles[_name] = {}; }
	if(!Memory.roles[_name].body) { Memory.roles[_name].body = {}; }
	Memory.roles[_name].body.lvl = _defaultBodyLvl;
	Memory.roles[_name].required = _required;
}

Role.prototype.body = function(lvl = 0)
{
	if(!Memory.roles[this.name].body[lvl])
	{
		Memory.roles[this.name].body[lvl] = {};
		let _parts = this.generateBody(lvl);
		Memory.roles[this.name].body[lvl].parts = _parts;
		Memory.roles[this.name].body[lvl].cost = bodyCost(_parts);
	}
	return Memory.roles[this.name].body[lvl].parts;
}

Role.prototype.bodyCost = function(lvl = 0)
{
	if(!Memory.roles[this.name].body[lvl])
	{
		Memory.roles[this.name].body[lvl] = {}
		let _parts = this.generateBody(lvl);
		Memory.roles[this.name].body[lvl].parts = _parts;
		Memory.roles[this.name].body[lvl].cost = bodyCost(_parts);
	}
	return Memory.roles[this.name].body[lvl].cost;
}

Role.prototype.generate = function(_spawn_name, _body_lvl, _name)
{
	let spawn = _spawn_name ? Game.spawns[_spawn_name] : Game.spawns[Memory.default.spawn];
	let gen_name = _name ? _name : (this.name + "_" + Game.time);
	let gen_body_lvl = _body_lvl ? _body_lvl : Memory.roles[this.name].body.lvl;
	let gen_body = this.body(gen_body_lvl);
	return spawn.spawnCreep(gen_body, gen_name, {memory: {role: this.name, task: TASKS.none}});
}

var roles = {}

function addRole(_role) { roles[_role.name] = _role; }

addRole(new Role('miner', 0, minerBody, runMiner));
addRole(new Role('storer', 0, storerBody, runStorer));
addRole(new Role('worker', 2, workerBody, runWorker, 0));
addRole(new Role('defender', 0, defenderBody, runDefender, 1));
addRole(new Role('trooper', 0, trooperBody, runTrooper, 0));
addRole(new Role('claimer', 0, claimerBody, runClaimer, 0));

Creep.prototype.runRole = function()
{
	if(this.memory.role && !this.spawning)
	{
		let role = roles[this.memory.role];
		role.run(this);
	}
}

StructureTower.prototype.defend = function ()
{
	var target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
	if (target != undefined)
	{
		this.attack(target);
	}
};

//Memory.rolesDebug = roles;

module.exports = roles