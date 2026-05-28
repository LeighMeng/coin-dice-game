// entities.js

export class Player {
    constructor(type, name = "") {
        this.type = type; // 'random', 'dicemaster', 'knight', 'mage'
        this.name = name || this.getDefaultName(type);
        this.gold = 0;
        this.level = 1; // 1 to 36

        // Set initial stats based on selected archetype
        this.initStats(type);
        this.currentHp = this.maxHp;

        this.summons = [];
        this.mechanisms = []; // Passive card effects
        this.halvedDamageNextTurn = false;
        this.tempAttackBonus = 0; // Stacks from Burn mechanism
        
        // Mage specific
        this.mageForm = 'light'; // 'light' or 'dark'
    }

    getDefaultName(type) {
        switch (type) {
            case 'dicemaster': return "骰子大师";
            case 'knight': return "骑士";
            case 'mage': return "光暗法师";
            case 'random': return "命运浪人";
            default: return "冒险者";
        }
    }

    initStats(type) {
        this.diceCount = 1;
        this.diceMin = 1;
        this.diceMax = 6;

        switch (type) {
            case 'dicemaster':
                this.maxHp = 30;
                this.attack = 1;
                this.diceCount = 2;
                break;
            case 'knight':
                this.maxHp = 50;
                this.attack = 1;
                break;
            case 'mage':
                this.maxHp = 25;
                this.attack = 2;
                break;
            case 'random':
            default:
                // Random stats: HP 20-30, Attack 1-5, Dice 1
                this.maxHp = Math.floor(Math.random() * 11) + 20; // 20 to 30
                this.attack = Math.floor(Math.random() * 5) + 1; // 1 to 5
                break;
        }
    }

    // Toggle mage form
    toggleMageForm() {
        if (this.type !== 'mage') return;
        this.mageForm = this.mageForm === 'light' ? 'dark' : 'light';
        return this.mageForm;
    }

    // Apply end-of-turn passives
    endOfTurnPassive(combatLog) {
        let logText = "";
        if (this.type === 'knight') {
            const healAmount = 2;
            const actualHeal = Math.min(healAmount, this.maxHp - this.currentHp);
            this.currentHp += actualHeal;
            if (actualHeal > 0) {
                logText += `【骑士被动】生命值固定恢复了 ${actualHeal} 点 HP。 `;
            }
        }
        return logText;
    }

    // Calculate attack damage for this turn
    calculateTurnDamage(coinResult, maxDiceValue) {
        let damage = 0;
        let baseLog = "";
        let currentAtk = this.attack + this.tempAttackBonus;
        let bonusLog = this.tempAttackBonus > 0 ? `(含燃烧加成+${this.tempAttackBonus})` : "";

        if (this.type === 'mage') {
            if (this.mageForm === 'light') {
                if (coinResult === 'heads') {
                    // Heads: rolled + Base Atk + 2
                    damage = currentAtk + maxDiceValue + 2;
                    baseLog = `【光形态-正面】基础攻击 ${currentAtk}${bonusLog} + 骰子最大值 ${maxDiceValue} + 额外攻击 2 = ${damage}`;
                } else {
                    // Tails: Base Atk - Math.max(0, rolled - 2)
                    const reduction = Math.max(0, maxDiceValue - 2);
                    damage = currentAtk - reduction;
                    baseLog = `【光形态-反面】基础攻击 ${currentAtk}${bonusLog} - 骰子最大值减少值 ${reduction} (原骰子最大值为 ${maxDiceValue}) = ${damage}`;
                }
            } else { // Dark form
                if (coinResult === 'tails') {
                    // Tails: adds rolled
                    damage = currentAtk + maxDiceValue;
                    baseLog = `【暗形态-反面】基础攻击 ${currentAtk}${bonusLog} + 骰子最大值 ${maxDiceValue} = ${damage}`;
                } else {
                    // Heads: subtracts rolled
                    damage = currentAtk - maxDiceValue;
                    baseLog = `【暗形态-正面】基础攻击 ${currentAtk}${bonusLog} - 骰子最大值 ${maxDiceValue} = ${damage}`;
                }
            }
        } else {
            // Normal formula
            if (coinResult === 'heads') {
                damage = currentAtk + maxDiceValue;
                baseLog = `【投掷正面】基础攻击 ${currentAtk}${bonusLog} + 骰子最大值 ${maxDiceValue} = ${damage}`;
            } else {
                damage = currentAtk - maxDiceValue;
                baseLog = `【投掷反面】基础攻击 ${currentAtk}${bonusLog} - 骰子最大值 ${maxDiceValue} = ${damage}`;
            }
        }

        // Apply mechanisms that modify damage
        // E.g., if player has passive cards
        this.mechanisms.forEach(mech => {
            if (mech.id === 'fate_shield' && coinResult === 'tails') {
                // E.g., shield on tails, or damage mitigation
            }
            if (mech.id === 'lucky_strike' && maxDiceValue === this.diceMax) {
                damage += 3;
                baseLog += ` (幸运一击增加3点伤害!)`;
            }
        });

        let finalDamage = damage;
        let negativeAtkLog = "";

        if (damage < 0) {
            finalDamage = 0;
            this.halvedDamageNextTurn = true;
            negativeAtkLog = ` (攻击力为负数！本回合无法攻击，下回合攻击伤害减半！)`;
        } else if (this.halvedDamageNextTurn) {
            finalDamage = Math.floor(damage / 2);
            this.halvedDamageNextTurn = false; // reset
            negativeAtkLog = ` (受上回合负攻击影响，伤害减半：${damage} -> ${finalDamage})`;
        }

        return {
            rawDamage: damage,
            damage: finalDamage,
            log: baseLog + negativeAtkLog
        };
    }

    heal(amount) {
        const actual = Math.min(amount, this.maxHp - this.currentHp);
        this.currentHp += actual;
        return actual;
    }

    takeDamage(amount) {
        this.currentHp = Math.max(0, this.currentHp - amount);
        return this.currentHp;
    }
}

export class Summon {
    constructor(id, name, hp, attack, description, type) {
        this.id = id;
        this.name = name;
        this.maxHp = hp;
        this.currentHp = hp;
        this.attack = attack;
        this.description = description;
        this.type = type; // 'wolf', 'golem', 'fairy', 'fire'
        
        // Clash properties
        this.halvedDamageNextTurn = false;
        this.currentRoll = null;
    }

    calculateClashPoints(coinResult, maxDiceValue) {
        let damage = coinResult === 'heads' ? (this.attack + maxDiceValue) : (this.attack - maxDiceValue);
        let baseLog = `【${coinResult === 'heads' ? '正面' : '反面'}】基础攻击 ${this.attack} ${coinResult === 'heads' ? '+' : '-'} 骰子值 ${maxDiceValue} = ${damage}`;
        
        let finalDamage = damage;
        let suffix = "";
        
        if (damage < 0) {
            finalDamage = 0;
            this.halvedDamageNextTurn = true;
            suffix = " (点数为负！下回合伤害减半)";
        } else if (this.halvedDamageNextTurn) {
            finalDamage = Math.floor(damage / 2);
            this.halvedDamageNextTurn = false;
            suffix = " (上回合负伤减半)";
        }
        
        this.currentRoll = {
            coinResult,
            maxDiceValue,
            clashPoints: finalDamage,
            log: baseLog + suffix
        };
        
        return finalDamage;
    }

    takeDamage(amount) {
        this.currentHp = Math.max(0, this.currentHp - amount);
        return this.currentHp;
    }

    heal(amount) {
        const actual = Math.min(amount, this.maxHp - this.currentHp);
        this.currentHp += actual;
        return actual;
    }
}

export class Monster {
    constructor(name, hp, attack, mechanisms = [], isBoss = false) {
        this.name = name;
        this.maxHp = hp;
        this.currentHp = hp;
        this.attack = attack;
        this.mechanisms = mechanisms; // Array of mechanism objects
        this.isBoss = isBoss;
        this.shield = 0;

        // Clash properties
        this.diceCount = isBoss ? 2 : 1;
        this.diceMin = 1;
        this.diceMax = 6;
        this.halvedDamageNextTurn = false;
        this.currentRoll = null;
        this.frozenTurns = 0; // Frozen status bypass
    }

    calculateClashPoints(coinResult, maxDiceValue) {
        if (this.frozenTurns > 0) {
            this.frozenTurns--;
            this.currentRoll = {
                coinResult: 'tails',
                maxDiceValue: 0,
                clashPoints: 0,
                log: `🥶 处于冰冻状态！无法行动。`
            };
            return 0;
        }
        
        let baseAttack = this.calculateAttackDamage(); // Handles Rage
        let damage = coinResult === 'heads' ? (baseAttack + maxDiceValue) : (baseAttack - maxDiceValue);
        let baseLog = `【${coinResult === 'heads' ? '正面' : '反面'}】基础攻击 ${baseAttack} ${coinResult === 'heads' ? '+' : '-'} 骰子值 ${maxDiceValue} = ${damage}`;
        
        let finalDamage = damage;
        let suffix = "";
        
        if (damage < 0) {
            finalDamage = 0;
            this.halvedDamageNextTurn = true;
            suffix = " (点数为负！下回合伤害减半)";
        } else if (this.halvedDamageNextTurn) {
            finalDamage = Math.floor(damage / 2);
            this.halvedDamageNextTurn = false;
            suffix = " (上回合负伤减半)";
        }
        
        this.currentRoll = {
            coinResult,
            maxDiceValue,
            clashPoints: finalDamage,
            log: baseLog + suffix
        };
        
        return finalDamage;
    }

    takeDamage(amount) {
        // Handle Dodge mechanism
        const hasDodge = this.mechanisms.find(m => m.id === 'dodge');
        if (hasDodge && Math.random() < 0.20) {
            return { damageDealt: 0, dodged: true, thornsDamage: 0 };
        }

        // Apply to shield first
        let damageToHp = amount;
        let shieldBroken = 0;
        if (this.shield > 0) {
            if (amount <= this.shield) {
                this.shield -= amount;
                damageToHp = 0;
            } else {
                damageToHp = amount - this.shield;
                shieldBroken = this.shield;
                this.shield = 0;
            }
        }

        this.currentHp = Math.max(0, this.currentHp - damageToHp);

        // Check thorns mechanism
        let thornsDamage = 0;
        const hasThorns = this.mechanisms.find(m => m.id === 'thorns');
        if (hasThorns && damageToHp > 0) {
            thornsDamage = Math.max(1, Math.floor(damageToHp * 0.25)); // 25% thorns damage
        }

        return {
            damageDealt: amount,
            dodged: false,
            thornsDamage: thornsDamage
        };
    }

    heal(amount) {
        const actual = Math.min(amount, this.maxHp - this.currentHp);
        this.currentHp += actual;
        return actual;
    }

    // Trigger end of turn abilities
    endOfTurnAction(player, combatLog) {
        let logs = [];
        
        // Regen mechanism
        const hasRegen = this.mechanisms.find(m => m.id === 'regen');
        if (hasRegen && this.currentHp > 0 && this.currentHp < this.maxHp) {
            const regenAmount = Math.floor(this.maxHp * 0.05) || 1;
            const actualRegen = Math.min(regenAmount, this.maxHp - this.currentHp);
            this.currentHp += actualRegen;
            logs.push(`${this.name} 触发【再生】：恢复了 ${actualRegen} 点生命值。`);
        }

        // Shield mechanism (Boss specific or elite)
        const hasShield = this.mechanisms.find(m => m.id === 'shield');
        if (hasShield && this.currentHp > 0 && Math.random() < 0.4) {
            const shieldAmount = Math.floor(this.maxHp * 0.1);
            this.shield += shieldAmount;
            logs.push(`${this.name} 触发【神圣护盾】：获得了 ${shieldAmount} 点护盾。`);
        }

        return logs.join(" ");
    }

    // Calculate attack damage (can vary by mechanisms like Rage)
    calculateAttackDamage() {
        let baseDamage = this.attack;
        const hasRage = this.mechanisms.find(m => m.id === 'rage');
        
        if (hasRage) {
            const missingHpPct = (this.maxHp - this.currentHp) / this.maxHp;
            if (missingHpPct > 0) {
                const bonus = Math.floor(this.attack * missingHpPct * 1.5);
                baseDamage += bonus;
            }
        }
        
        return baseDamage;
    }
}

// Factory helper to generate monsters based on level
export function generateMonstersForLevel(level) {
    const isBossLevel = level % 6 === 0;
    
    // Mechanism templates
    const normalMechanisms = [
        { id: 'thorns', name: '荆棘', desc: '反弹25%受到的伤害给攻击者。' },
        { id: 'regen', name: '再生', desc: '每回合结束时恢复5%的最大生命值。' },
        { id: 'dodge', name: '闪避', desc: '有20%的几率完全闪避该次攻击。' },
        { id: 'vampire', name: '吸血', desc: '攻击造成伤害的50%转化为自身生命值。' },
        { id: 'weakness', name: '虚弱', desc: '攻击时有30%几率降低玩家1点基础攻击，持续1回合。' }
    ];

    const bossMechanisms = [
        ...normalMechanisms,
        { id: 'rage', name: '狂暴', desc: '每损失1%生命值，攻击力提升1.5%。' },
        { id: 'shield', name: '护盾', desc: '每回合有40%几率获得自身最大HP 10%的护盾。' },
        { id: 'tails_curse', name: '反面诅咒', desc: '诅咒玩家，使玩家投掷硬币为反面的概率提升20%（如果未满）。' },
        { id: 'double_strike', name: '连击', desc: '每回合进行两次攻击。' },
        { id: 'blockade', name: '骰子限制', desc: '降低玩家骰子最大值1点。' }
    ];

    if (isBossLevel) {
        // Boss names and designs
        const bossIndex = level / 6;
        let bossName = "";
        let baseHp = 50 + level * 10;
        let baseAtk = 2 + Math.floor(level / 3);
        let mechanismsCount = 3 + (bossIndex > 3 ? 1 : 0); // 3-4 mechanisms
        
        // Pick random unique mechanisms
        const selectedMechs = [];
        const pool = [...bossMechanisms];
        for (let i = 0; i < mechanismsCount; i++) {
            if (pool.length === 0) break;
            const randIdx = Math.floor(Math.random() * pool.length);
            selectedMechs.push(pool.splice(randIdx, 1)[0]);
        }

        switch (bossIndex) {
            case 1: bossName = "守门巨魔 (Lvl 6 Boss)"; break;
            case 2: bossName = "剧毒蜘蛛女王 (Lvl 12 Boss)"; break;
            case 3: bossName = "堕落大天使 (Lvl 18 Boss)"; break;
            case 4: bossName = "炼狱炎魔 (Lvl 24 Boss)"; break;
            case 5: bossName = "冰霜巨龙 (Lvl 30 Boss)"; break;
            case 6: bossName = "终焉命运之神 (Lvl 36 Final Boss)"; break;
        }

        return [new Monster(bossName, baseHp, baseAtk, selectedMechs, true)];
    } else {
        // Normal levels: 1-3 monsters
        let monsterCount = 1;
        if (level > 24) {
            monsterCount = Math.floor(Math.random() * 3) + 1; // 1-3
        } else if (level > 8) {
            monsterCount = Math.floor(Math.random() * 2) + 1; // 1-2
        }

        const monsters = [];
        const monsterNames = ["绿皮史莱姆", "洞穴蝙蝠", "蛮荒哥布林", "骷髅弓箭手", "深渊爬行者", "亡灵巫师", "熔岩史莱姆", "嗜血豺狼人", "石雕守卫", "暗影幽灵"];
        
        for (let i = 0; i < monsterCount; i++) {
            const suffix = monsterCount > 1 ? ` ${String.fromCharCode(65 + i)}` : "";
            const name = monsterNames[Math.floor(Math.random() * monsterNames.length)] + suffix;
            
            // Stats scale with level and number of monsters (less HP if multiple monsters)
            const countFactor = monsterCount === 1 ? 1.0 : (monsterCount === 2 ? 0.7 : 0.55);
            const hp = Math.floor((12 + level * 3.5) * countFactor);
            const atk = Math.floor((1.5 + level * 0.3) * (monsterCount === 1 ? 1.0 : 0.8));
            
            // 1-2 mechanisms for normal monsters
            const mechanismsCount = level > 15 ? (Math.random() < 0.5 ? 2 : 1) : 1;
            const selectedMechs = [];
            const pool = [...normalMechanisms];
            for (let j = 0; j < mechanismsCount; j++) {
                const randIdx = Math.floor(Math.random() * pool.length);
                selectedMechs.push(pool.splice(randIdx, 1)[0]);
            }

            monsters.push(new Monster(name, hp, atk, selectedMechs, false));
        }

        return monsters;
    }
}
