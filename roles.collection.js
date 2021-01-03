function setWorkingState(creep)
{
	if(creep.memory.working && creep.store[RESOURCE_ENERGY] == 0)
	{
		creep.memory.working = false;
	}
	if(!creep.memory.working && creep.store.getFreeCapacity() == 0)
	{
		creep.memory.working = true;
	}
}

function mineEnergy(creep)
{
	var target = creep.pos.findClosestByPath(FIND_SOURCES);
	if(target != undefined)
	{
		if(creep.harvest(target) == ERR_NOT_IN_RANGE)
		{
			creep.moveTo(target);
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
	setWorkingState(creep);
	if(creep.memory.working)
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
	else { mineEnergy(creep); }
}

function runUpgrader(creep)
{
	setWorkingState(creep);
	if(creep.memory.working) { upgradeController(creep); }
	else{ mineEnergy(creep); }
}

function runBuilder(creep)
{
	setWorkingState(creep);
	if(creep.memory.working)
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
	else
	{
		mineEnergy(creep);
	}
}

function runRepairer(creep)
{
	setWorkingState(creep);
	if(creep.memory.working)
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
	else { mineEnergy(creep); }
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

function Role(_name, _reqNumber, _body, _runFunction)
{
	this.name = _name;
	this.reqNumber = _reqNumber;
	this.body = _body;
	this.run = _runFunction;
}

Role.prototype.generate = function(spawn, _body, _name)
{
	let gen_name = ((_name != undefined) ? _name : (this.name + "_" + Game.time));
	let gen_body = ((_body != undefined) ? _body : (this.body));
	return spawn.spawnCreep(gen_body, gen_name, {memory: {role: this.name, working: false}});
}

var roles = {}

function addRole(_name, _reqNumber, _body, _runFunction)
{
	roles[_name] = new Role(_name, _reqNumber, _body, _runFunction);
}

addRole('harvester', 5, [WORK, CARRY, MOVE], runHarvester);

addRole('upgrader', 3, [WORK, CARRY, MOVE], runUpgrader);

addRole('builder', 4, [WORK, WORK, CARRY, MOVE, MOVE], runBuilder);

addRole('hugeBuilder', 0, [WORK, WORK, CARRY, MOVE, MOVE], runBuilder);

addRole('repairer', 2, [ WORK, CARRY, MOVE], runRepairer);

addRole('defender', 3, [ATTACK, ATTACK, MOVE, MOVE], runDefender);

Creep.prototype.runRole = function()
{
	if(this.memory.role != undefined)
	{
		let role = roles[this.memory.role];
		role.run(this);
	}
}

module.exports = roles