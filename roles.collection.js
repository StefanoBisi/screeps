if(!Memory.roles) { Memory.roles = {}; }
var defaultBodyLvl = 4;

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

const states = {mining: 0, working: 1, mineral: 2}

function setState(creep)
{
	for(let min in creep.store)
	{
		if(min != RESOURCE_ENERGY)
		{
			let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: function(s){return(s.structureType == STRUCTURE_CONTAINER);}});
			if(target)
			{
				creep.memory.state = states.mineral;
				if(creep.transfer(target, min) == ERR_NOT_IN_RANGE)
				{
					creep.moveTo(target);
				}
				return 0;
			}
		}
	}
	if(creep.memory.state == states.working && creep.store[RESOURCE_ENERGY] == 0)
	{
		creep.memory.state = states.mining;
	}
	if(creep.memory.state == states.mining && creep.store.getFreeCapacity() == 0)
	{
		creep.memory.state = states.working;
	}
}

/*for(let min in creep.store)
	{
		if(min != RESOURCE_ENERGY)
		{
			let target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, (s) => s.structureType == STRUCTURE_CONTAINER);
			if(target)
			{
				if(creep.transfer(target, min) == ERR_NOT_IN_RANGE)
				{
					creep.moveTo(target);
				}
			}
		}
	}*/

function mineEnergy(creep)
{
	let target = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
	if(target)
	{
		if(creep.pickup(target) == ERR_NOT_IN_RANGE)
		{
			creep.moveTo(target);
		}
	}
	else
	{
		target = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
		if(target != undefined)
		{
			if(creep.harvest(target) == ERR_NOT_IN_RANGE)
			{
				let n = creep.moveTo(target);
			}
		}
		else if (creep.store[RESOURCE_ENERGY] > 0)
		{
			creep.memory.state = states.working;
		}
	}
}

function upgradeController(creep)
{
	if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE)
	{
		creep.moveTo(creep.room.controller);
	}
}

function runHarvester(creep)
{
	setState(creep);
	if(creep.memory.state == states.working)
	{
		let structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
				filter: (s) => (s.structureType == STRUCTURE_SPAWN
					|| s.structureType == STRUCTURE_EXTENSION
					|| s.structureType == STRUCTURE_TOWER)
					&& s.energy < s.energyCapacity
			});
		
		if(structure == undefined) { upgradeController(creep); }
		else
		{
			if(creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
			{
				creep.moveTo(structure);
			}			
		}
	}
	else if(creep.memory.state == states.mining) { mineEnergy(creep); }
}

function runUpgrader(creep)
{
	
	setState(creep);
	if(creep.memory.state == states.working) { upgradeController(creep); }
	else if(creep.memory.state == states.mining){ mineEnergy(creep); }
}

function runBuilder(creep)
{
	setState(creep);
	if(creep.memory.state == states.working)
	{
		var target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
		if(target != undefined)
		{
			if(creep.build(target) == ERR_NOT_IN_RANGE)
			{
				creep.moveTo(target);
			}
		}
		else
		{
			upgradeController(creep);
		}
	}
	else if(creep.memory.state == states.mining)
	{
		mineEnergy(creep);
	}
}

function runRepairer(creep)
{
	setState(creep);
	if(creep.memory.state == states.working)
	{
		let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => s.hits < s.hitsMax && s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART
            });
		if (target != undefined)
		{
			if (creep.repair(target) == ERR_NOT_IN_RANGE) {
				creep.moveTo(target);
			}
		}
		else
		{
			target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
			if(target != undefined)
			{
				if(creep.build(target) == ERR_NOT_IN_RANGE)
				{
					creep.moveTo(target);
				}
			}
			else
			{
				upgradeController(creep);
			}
		}	
	}
	else if(creep.memory.state == states.mining) { mineEnergy(creep); }
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

function Role(_name, _reqNumber, _body, _runFunction, _defaultBodyLvl = defaultBodyLvl)
{
	this.name = _name;
	this.generateBody = _body;
	this.run = _runFunction;
	
	if(!Memory.roles[_name]) { Memory.roles[_name] = {}; }
	if(!Memory.roles[_name].body) { Memory.roles[_name].body = {}; }
	Memory.roles[_name].body.lvl = _defaultBodyLvl;
	Memory.roles[_name].reqNumber = _reqNumber;
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
	let spawn = (_spawn_name != undefined) ? Game.spawns[_spawn_name] : Game.spawns[Memory.default.spawn];
	let gen_name = ((_name != undefined) ? _name : (this.name + "_" + Game.time));
	let gen_body_lvl = ((_body_lvl != undefined) ? _body_lvl : Memory.roles[this.name].body.lvl);
	let gen_body = this.body(gen_body_lvl);
	return spawn.spawnCreep(gen_body, gen_name, {memory: {role: this.name, state: states.mining}});
}

var roles = {}

function addRole(_role)
{
	roles[_role.name] = _role;
}

addRole(new Role('harvester', 3, workerBody, runHarvester));
addRole(new Role('upgrader', 2, workerBody, runUpgrader));
addRole(new Role('builder', 1, workerBody, runBuilder));
addRole(new Role('repairer', 1, workerBody, runRepairer));
addRole(new Role('defender', 3, defenderBody, runDefender, 1));
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