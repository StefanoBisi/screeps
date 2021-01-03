Memory.roles = {};

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

function runClaimer(creep)
{
	if(!(Memory.invasionTarget == undefined || Memory.invasionTarget == ''))
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

function Role(_name, _reqNumber, _body, _runFunction)
{
	this.name = _name;
	this.reqNumber = _reqNumber;
	this.body = [_body];
	this.run = _runFunction;
	
	Memory.roles[_name] = {};
	Memory.roles[_name].bodyLvl = 0;
	Memory.roles[_name].reqNumber = _reqNumber;
}

Role.prototype.setLevels = function(levels, _default)
{
	this.body = this.body.concat(levels);
	if(_default != undefined) { Memory.roles[this.name].bodyLvl = _default; }
}

Role.prototype.generate = function(spawn, _body_lvl, _name)
{
	let gen_name = ((_name != undefined) ? _name : (this.name + "_" + Game.time));
	let gen_body_lvl = ((_body_lvl != undefined) ? _body_lvl : Memory.roles[this.name].bodyLvl);
	let gen_body = (this.body[gen_body_lvl] != undefined) ? this.body[gen_body_lvl] : this.body[0];
	return spawn.spawnCreep(gen_body, gen_name, {memory: {role: this.name, working: false}});
}

var roles = {}

function addRole(_name, _reqNumber, _body, _runFunction)
{
	roles[_name] = new Role(_name, _reqNumber, _body, _runFunction);
}

addRole('harvester', 5, [WORK, CARRY, MOVE], runHarvester);
addRole('upgrader', 3, [WORK, CARRY, MOVE], runUpgrader);
addRole('builder', 4, [WORK, CARRY, MOVE], runBuilder);
addRole('repairer', 2, [ WORK, CARRY, MOVE], runRepairer);
addRole('defender', 3, [ATTACK, ATTACK, MOVE], runDefender);
addRole('claimer', 0, [MOVE, CLAIM], runClaimer);

roles['harvester'].setLevels([[WORK, WORK, CARRY, MOVE, MOVE]], 1);
roles['upgrader'].setLevels([[WORK, WORK, CARRY, MOVE, MOVE]], 1);
roles['builder'].setLevels([[WORK, WORK, CARRY, MOVE, MOVE]], 1);
roles['repairer'].setLevels([[WORK, WORK, CARRY, MOVE, MOVE]], 1);
roles['defender'].setLevels([[ATTACK, ATTACK, ATTACK, MOVE, MOVE]]);
roles['claimer'].setLevels([[ATTACK, MOVE, MOVE, CLAIM]], 1);

Creep.prototype.runRole = function()
{
	if(this.memory.role != undefined)
	{
		let role = roles[this.memory.role];
		role.run(this);
	}
}

// TODO: da spostare
StructureTower.prototype.defend =
    function () {
        // find closes hostile creep
        var target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        // if one is found...
        if (target != undefined) {
            // ...FIRE!
            this.attack(target);
        }
    };
	
//Memory.rolesDebug = roles;

module.exports = roles