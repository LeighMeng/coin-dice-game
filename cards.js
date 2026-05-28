// cards.js

import { Summon } from './entities.js';

export const CARD_GRADES = {
    R: { name: 'R级 (稀有)', color: '#3b82f6', shadow: 'rgba(59, 130, 246, 0.6)' },
    S: { name: 'S级 (超稀有)', color: '#a855f7', shadow: 'rgba(168, 85, 247, 0.6)' },
    SS: { name: 'SS级 (史诗)', color: '#eab308', shadow: 'rgba(234, 179, 8, 0.6)' },
    SSS: { name: 'SSS级 (传说)', color: '#ef4444', shadow: 'rgba(239, 68, 68, 0.8)' }
};

export const CARD_POOL = [
    // R Grade
    {
        id: 'r_max_hp',
        name: '生命源泉',
        grade: 'R',
        type: 'stat',
        desc: '最大生命值 +10，并恢复10点生命值。',
        apply: (player) => {
            player.maxHp += 10;
            player.heal(10);
            return "最大生命值增加了 10 点！";
        }
    },
    {
        id: 'r_atk',
        name: '锋利之刃',
        grade: 'R',
        type: 'stat',
        desc: '基础攻击力 +1。',
        apply: (player) => {
            player.attack += 1;
            return "基础攻击力增加了 1 点！";
        }
    },
    {
        id: 'r_tails_shield',
        name: '反面护甲',
        grade: 'R',
        type: 'mechanism',
        desc: '硬币为反面时，本回合额外获得 4 点临时护盾。',
        apply: (player) => {
            player.mechanisms.push({ id: 'r_tails_shield', name: '反面护甲' });
            return "获得了被动机制【反面护甲】！";
        }
    },
    {
        id: 'r_summon_wolf',
        name: '召唤小狼',
        grade: 'R',
        type: 'summon',
        desc: '召唤一只幽灵小狼 (15 HP, 2 攻击)。',
        apply: (player) => {
            const wolf = new Summon('summon_wolf', '幽灵小狼', 15, 2, '小狼每回合会撕咬怪物。', 'wolf');
            player.summons.push(wolf);
            return "幽灵小狼加入战斗！";
        }
    },

    // S Grade
    {
        id: 's_max_hp',
        name: '泰坦之躯',
        grade: 'S',
        type: 'stat',
        desc: '最大生命值 +18，并恢复18点生命值。',
        apply: (player) => {
            player.maxHp += 18;
            player.heal(18);
            return "最大生命值增加了 18 点！";
        }
    },
    {
        id: 's_atk',
        name: '巨剑重击',
        grade: 'S',
        type: 'stat',
        desc: '基础攻击力 +2。',
        apply: (player) => {
            player.attack += 2;
            return "基础攻击力增加了 2 点！";
        }
    },
    {
        id: 's_dice_min',
        name: '幸运之底',
        grade: 'S',
        type: 'mechanism',
        desc: '骰子最小点数 +1。',
        apply: (player) => {
            player.diceMin += 1;
            return "所有骰子的最小点数增加了 1 点！";
        }
    },
    {
        id: 's_summon_golem',
        name: '召唤岩石傀儡',
        grade: 'S',
        type: 'summon',
        desc: '召唤岩石傀儡 (35 HP, 1 攻击)，具有极高的防御生命。',
        apply: (player) => {
            const golem = new Summon('summon_golem', '岩石傀儡', 35, 1, '傀儡拥有厚重的血量。', 'golem');
            player.summons.push(golem);
            return "岩石傀儡加入战斗！";
        }
    },
    {
        id: 's_burn',
        name: '热血燃烧',
        grade: 'S',
        type: 'mechanism',
        desc: '每次成功对敌人造成伤害，下回合基础攻击力临时 +1 点（可叠加，持续1回合）。',
        apply: (player) => {
            player.mechanisms.push({ id: 'mech_burn', name: '热血燃烧' });
            return "获得了被动机制【热血燃烧】！";
        }
    },

    // SS Grade
    {
        id: 'ss_max_hp',
        name: '星辰不灭',
        grade: 'SS',
        type: 'stat',
        desc: '最大生命值 +30，并恢复30点生命值。',
        apply: (player) => {
            player.maxHp += 30;
            player.heal(30);
            return "最大生命值增加了 30 点！";
        }
    },
    {
        id: 'ss_atk',
        name: '宇宙之力',
        grade: 'SS',
        type: 'stat',
        desc: '基础攻击力 +3。',
        apply: (player) => {
            player.attack += 3;
            return "基础攻击力增加了 3 点！";
        }
    },
    {
        id: 'ss_lucky_six',
        name: '天数六星',
        grade: 'SS',
        type: 'mechanism',
        desc: '当投出最大骰子点数时，对所有敌方造成额外 5 点真实伤害。',
        apply: (player) => {
            player.mechanisms.push({ id: 'ss_lucky_six', name: '天数六星' });
            return "获得了被动机制【天数六星】！";
        }
    },
    {
        id: 'ss_summon_fairy',
        name: '召唤治愈花仙',
        grade: 'SS',
        type: 'summon',
        desc: '召唤治愈花仙 (12 HP, 1 攻击)，每回合结束时恢复角色 3 点生命值。',
        apply: (player) => {
            const fairy = new Summon('summon_fairy', '治愈花仙', 12, 1, '花仙会在回合结束时治愈你。', 'fairy');
            player.summons.push(fairy);
            return "治愈花仙加入战斗！";
        }
    },
    {
        id: 'ss_sweeping_blade',
        name: '横扫之刃',
        grade: 'SS',
        type: 'mechanism',
        desc: '拼点获胜时，除主要目标外，还会对额外最多 2 个随机存活且拼点失败的敌方造成等量伤害。',
        apply: (player) => {
            player.mechanisms.push({ id: 'mech_sweeping_blade', name: '横扫之刃' });
            return "获得了被动机制【横扫之刃】！";
        }
    },

    // SSS Grade
    {
        id: 'sss_immortal',
        name: '不灭神魂',
        grade: 'SSS',
        type: 'stat',
        desc: '最大生命值 +50，并完全恢复全部生命值。',
        apply: (player) => {
            player.maxHp += 50;
            player.currentHp = player.maxHp;
            return "生命上限巨幅增加 50 点，并且血量已回满！";
        }
    },
    {
        id: 'sss_sword_destiny',
        name: '宿命主宰之剑',
        grade: 'SSS',
        type: 'stat',
        desc: '基础攻击力 +5。',
        apply: (player) => {
            player.attack += 5;
            return "基础攻击力暴涨了 5 点！";
        }
    },
    {
        id: 'sss_fate_weaver',
        name: '命运编织者',
        grade: 'SSS',
        type: 'mechanism',
        desc: '每场战斗的前 2 个回合，投掷硬币必为【正面】（光暗法师不受反面影响）。',
        apply: (player) => {
            player.mechanisms.push({ id: 'sss_fate_weaver', name: '命运编织者' });
            return "获得了被动机制【命运编织者】！";
        }
    },
    {
        id: 'sss_summon_phoenix',
        name: '召唤炼狱凤凰',
        grade: 'SSS',
        type: 'summon',
        desc: '召唤炼狱凤凰 (20 HP, 4 攻击)，每次攻击时对所有怪物造成伤害。',
        apply: (player) => {
            const phoenix = new Summon('summon_phoenix', '炼狱凤凰', 20, 4, '凤凰每次攻击时进行全体灼烧。', 'phoenix');
            player.summons.push(phoenix);
            return "炼狱凤凰降临战场！";
        }
    },
    {
        id: 'sss_freeze',
        name: '寒冰之咬',
        grade: 'SSS',
        type: 'mechanism',
        desc: '拼点获胜并造成伤害时，有 35% 几率将目标冰冻1回合（下回合无法行动），冰冻冷却时间为 3 回合。',
        apply: (player) => {
            player.mechanisms.push({ id: 'mech_freeze', name: '寒冰之咬', cooldown: 0 });
            return "获得了被动机制【寒冰之咬】！";
        }
    }
];

// Filter card pool based on active difficulty settings
export function getFilteredCardPool(difficulty = 'easy') {
    return CARD_POOL.filter(card => {
        if (difficulty === 'easy') {
            if (card.id === 's_burn' || card.id === 'ss_sweeping_blade' || card.id === 'sss_freeze') return false;
        } else if (difficulty === 'normal') {
            if (card.id === 'ss_sweeping_blade' || card.id === 'sss_freeze') return false;
        } else if (difficulty === 'hard') {
            if (card.id === 'sss_freeze') return false;
        }
        return true;
    });
}

// Helper to pull random cards of a specific grade, or random mixed grades
export function getRandomCards(count = 3, difficulty = 'easy') {
    const cards = [];
    const pool = getFilteredCardPool(difficulty);
    
    // Weighted selection of grades: R: 79%, S: 15%, SS: 5%, SSS: 1%
    for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let targetGrade = 'R';
        if (rand < 0.01) targetGrade = 'SSS';
        else if (rand < 0.06) targetGrade = 'SS';
        else if (rand < 0.21) targetGrade = 'S';
        
        const matchingCards = pool.filter(c => c.grade === targetGrade);
        if (matchingCards.length > 0) {
            const chosen = matchingCards[Math.floor(Math.random() * matchingCards.length)];
            cards.push(chosen);
            // Remove from pool to prevent duplicates in the same draft
            const idx = pool.findIndex(c => c.id === chosen.id);
            if (idx > -1) pool.splice(idx, 1);
        } else {
            // Fallback to any card left
            if (pool.length > 0) {
                const chosen = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
                cards.push(chosen);
            }
        }
    }
    return cards;
}

// Dice Upgrade choices
export function getRandomDiceChoices() {
    const choices = [
        {
            id: 'dice_count_inc',
            name: '骰子数目增加',
            desc: '骰子数量 +1 (多一个骰子，取最大值)',
            apply: (player) => {
                player.diceCount += 1;
                return "骰子数量 +1！";
            }
        },
        {
            id: 'dice_max_inc',
            name: '骰子最大值提升',
            desc: '骰子最大点数 +1',
            apply: (player) => {
                player.diceMax += 1;
                return "骰子最大点数 +1！";
            }
        },
        {
            id: 'dice_min_inc',
            name: '骰子最小值提升',
            desc: '骰子最小点数 +1',
            apply: (player) => {
                player.diceMin += 1;
                if (player.diceMin > player.diceMax) {
                    player.diceMax = player.diceMin;
                }
                return "骰子最小点数 +1！";
            }
        },
        {
            id: 'dice_count_dec',
            name: '骰子数目减少 (加血补偿)',
            desc: '骰子数量 -1，但最大生命值增加 15 点 (最小为1个骰子)',
            apply: (player) => {
                if (player.diceCount > 1) {
                    player.diceCount -= 1;
                    player.maxHp += 15;
                    player.heal(15);
                    return "骰子数目 -1，最大生命值 +15 作为补偿！";
                }
                return "骰子数量已经是 1，无法再减少！获得 5 金币补偿。";
            }
        },
        {
            id: 'dice_max_dec',
            name: '骰子上限降低 (暴击补偿)',
            desc: '骰子最大点数 -1，但基础攻击力永久 +3 (最大值最小为2)',
            apply: (player) => {
                if (player.diceMax > 2) {
                    player.diceMax -= 1;
                    if (player.diceMin > player.diceMax) {
                        player.diceMin = player.diceMax;
                    }
                    player.attack += 3;
                    return "骰子最大值 -1，攻击力 +3 作为补偿！";
                }
                return "骰子上限过低，无法再降低！获得 5 金币补偿。";
            }
        }
    ];

    // Pick 3 random unique choices
    const result = [];
    const pool = [...choices];
    for (let i = 0; i < 3; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        result.push(pool.splice(idx, 1)[0]);
    }
    return result;
}

// Shop items generation: quality 1 to 5
export function generateShopItems(level, difficulty = 'easy') {
    // Quality based on stage level: L1-6 -> Quality 1-2, L7-18 -> Quality 2-4, L19-36 -> Quality 3-5
    // Decreased the probability of higher quality items
    const getQuality = () => {
        const rand = Math.random();
        if (level <= 6) return rand < 0.85 ? 1 : 2;
        if (level <= 18) return rand < 0.60 ? 2 : (rand < 0.90 ? 3 : 4);
        return rand < 0.50 ? 3 : (rand < 0.85 ? 4 : 5);
    };

    const items = [];
    // Generating 4 items in shop: 2 upgrades, 1 summon, 1 card
    
    // Item 1 & 2: Upgrades (HP / Attack / Dice)
    for (let i = 0; i < 2; i++) {
        const q = getQuality();
        const rand = Math.random();
        let name = "";
        let desc = "";
        let cost = q * 10 + Math.floor(Math.random() * 5);
        let effect = null;

        if (rand < 0.4) {
            name = `生命结晶 (品质 ${q})`;
            const val = q * 6;
            desc = `增加最大生命值 ${val} 点并恢复。`;
            effect = (p) => {
                p.maxHp += val;
                p.heal(val);
                return `最大生命值 +${val}`;
            };
        } else if (rand < 0.8) {
            name = `力量药剂 (品质 ${q})`;
            const val = Math.ceil(q * 0.8);
            desc = `增加基础攻击力 ${val} 点。`;
            effect = (p) => {
                p.attack += val;
                return `基础攻击力 +${val}`;
            };
        } else {
            name = `精炼骰石 (品质 ${q})`;
            desc = `使你的骰子最大值增加 1 (品质 4-5 时骰子数 +1)。`;
            if (q >= 4) {
                desc = `使你的骰子数量增加 1 点。`;
                effect = (p) => {
                    p.diceCount += 1;
                    return `骰子数量 +1`;
                };
            } else {
                effect = (p) => {
                    p.diceMax += 1;
                    return `骰子上限 +1`;
                };
            }
        }

        items.push({ name, desc, cost, quality: q, type: 'upgrade', apply: effect });
    }

    // Item 3: Summon
    const summonsPool = [
        { id: 'wolf', name: '召唤野狼契约', hp: 20, atk: 3, type: 'wolf', desc: '签订野狼契约，召唤幽灵野狼 (20 HP, 3 Atk)。' },
        { id: 'golem', name: '钢铁傀儡核心', hp: 45, atk: 1, type: 'golem', desc: '钢铁核心，召唤钢铁傀儡 (45 HP, 1 Atk)。' },
        { id: 'fairy', name: '自然花仙密卷', hp: 15, atk: 1, type: 'fairy', desc: '花仙密卷，召唤自然花仙 (15 HP, 1 Atk，每回合末回血 3)。' },
        { id: 'phoenix', name: '烈焰雏凤火种', hp: 25, atk: 4, type: 'phoenix', desc: '烈焰火种，召唤烈焰雏凤 (25 HP, 4 Atk，AOE伤害)。' }
    ];
    const sBase = summonsPool[Math.floor(Math.random() * summonsPool.length)];
    const sq = getQuality();
    const sCost = sq * 12 + 10;
    const scaledHp = sBase.hp + (sq - 1) * 5;
    const scaledAtk = sBase.atk + Math.floor((sq - 1) * 0.7);
    
    items.push({
        name: `${sBase.name} (品质 ${sq})`,
        desc: `${sBase.desc} (强化版: ${scaledHp} HP, ${scaledAtk} 攻击)`,
        cost: sCost,
        quality: sq,
        type: 'summon',
        apply: (player) => {
            const sm = new Summon(`shop_${sBase.id}`, sBase.name.substring(2, 6), scaledHp, scaledAtk, sBase.desc, sBase.type);
            player.summons.push(sm);
            return `契约召唤：${sm.name} 加入了你的队伍！`;
        }
    });

    // Item 4: High Rarity Card (R / S / SS / SSS)
    const cardq = getQuality();
    let cardGrade = 'R';
    if (cardq === 3) cardGrade = 'S';
    else if (cardq === 4) cardGrade = 'SS';
    else if (cardq === 5) cardGrade = 'SSS';

    const filteredCardPool = getFilteredCardPool(difficulty);
    let cardPoolForGrade = filteredCardPool.filter(c => c.grade === cardGrade);
    if (cardPoolForGrade.length === 0) {
        cardPoolForGrade = CARD_POOL.filter(c => c.grade === cardGrade);
    }
    const shopCard = cardPoolForGrade[Math.floor(Math.random() * cardPoolForGrade.length)];
    const cardCost = cardq * 15;

    items.push({
        name: `秘籍：${shopCard.name} (${cardGrade}级)`,
        desc: shopCard.desc,
        cost: cardCost,
        quality: cardq,
        type: 'card',
        apply: (player) => {
            return shopCard.apply(player);
        }
    });

    return items;
}

// Campfire options: Player upgrades and summon upgrades
export function getCampfireOptions(player) {
    const options = [
        {
            id: 'camp_rest',
            name: '营火休整',
            desc: '恢复角色 50% 的最大生命值。',
            apply: (p) => {
                const healed = p.heal(Math.floor(p.maxHp * 0.5));
                return `你在营火旁休息，恢复了 ${healed} 点生命值。`;
            }
        },
        {
            id: 'camp_train',
            name: '自我磨砺',
            desc: '基础攻击力 +2。',
            apply: (p) => {
                p.attack += 2;
                return `你打磨了武器，基础攻击力 +2。`;
            }
        },
        {
            id: 'camp_body',
            name: '体质锻炼',
            desc: '最大生命值 +15 点，并恢复 15 点生命值。',
            apply: (p) => {
                p.maxHp += 15;
                p.heal(15);
                return `你在营火旁锻炼体魄，最大生命值 +15。`;
            }
        }
    ];

    // If player has summons, add summon upgrade option
    if (player.summons && player.summons.length > 0) {
        options.push({
            id: 'camp_summons',
            name: '召唤强化',
            desc: '强化所有召唤物：最大生命值 +10，攻击力 +1。',
            apply: (p) => {
                p.summons.forEach(s => {
                    s.maxHp += 10;
                    s.heal(10);
                    s.attack += 1;
                });
                return `你在营火旁为召唤物注入能量！所有召唤物生命上限 +10，攻击 +1。`;
            }
        });
    }

    return options;
}

// Mystery Lane events (旋行道事件)
export const MYSTERY_EVENTS = [
    {
        id: 'gold_chest',
        name: '命运宝箱',
        desc: '你发现了一个散发着金光的宝箱。',
        choices: [
            {
                text: '直接打开宝箱',
                effect: (player) => {
                    const gold = Math.floor(Math.random() * 21) + 15; // 15-35 gold
                    player.gold += gold;
                    return { success: true, log: `箱子里装满了金币！获得金币 ${gold}。` };
                }
            },
            {
                text: '用硬币卜算后打开',
                effect: (player) => {
                    const coin = Math.random() < 0.5 ? 'heads' : 'tails';
                    if (coin === 'heads') {
                        const gold = 45;
                        player.gold += gold;
                        return { success: true, log: `硬币显示【正面】！好运连连，你开出了超级大奖！获得金币 ${gold}。` };
                    } else {
                        const dmg = 5;
                        player.takeDamage(dmg);
                        return { success: false, log: `硬币显示【反面】。宝箱上附带了致命毒素，你受到了 ${dmg} 点伤害。` };
                    }
                }
            }
        ]
    },
    {
        id: 'fairy_fountain',
        name: '妖精泉水',
        desc: '一汪清澈的泉水，上面飘动着几只发光的森林妖精。',
        choices: [
            {
                text: '饮用泉水 (恢复 HP)',
                effect: (player) => {
                    const healVal = Math.floor(player.maxHp * 0.4);
                    const actual = player.heal(healVal);
                    return { success: true, log: `甘甜的泉水滋润了你，恢复了 ${actual} 点生命值。` };
                }
            },
            {
                text: '向泉水投掷金币 (祈求好运)',
                effect: (player) => {
                    if (player.gold >= 10) {
                        player.gold -= 10;
                        const cards = getRandomCards(1);
                        cards[0].apply(player);
                        return { success: true, log: `你投入了 10 金币。水池发出了璀璨光芒！你获得了：【${cards[0].name}】。` };
                    } else {
                        return { success: false, log: `你没有足够的金币（需要 10 金币），妖精们对你投来嫌弃的目光。` };
                    }
                }
            }
        ]
    },
    {
        id: 'card_trade',
        name: '流浪收藏家',
        desc: '一个披着厚重斗篷的神秘人向你招手，希望跟你做个交易。',
        choices: [
            {
                text: '用最大生命值换取随机S级卡片 (-5 最大HP)',
                effect: (player) => {
                    player.maxHp = Math.max(10, player.maxHp - 5);
                    if (player.currentHp > player.maxHp) player.currentHp = player.maxHp;
                    const sPool = CARD_POOL.filter(c => c.grade === 'S');
                    const card = sPool[Math.floor(Math.random() * sPool.length)];
                    card.apply(player);
                    return { success: true, log: `你的最大生命值减少了 5 点，但神秘人塞给你一张秘卷：【${card.name}】！` };
                }
            },
            {
                text: '用金币购买高级卡片 (-20 金币)',
                effect: (player) => {
                    if (player.gold >= 20) {
                        player.gold -= 20;
                        const ssPool = CARD_POOL.filter(c => c.grade === 'SS');
                        const card = ssPool[Math.floor(Math.random() * ssPool.length)];
                        card.apply(player);
                        return { success: true, log: `你花费了 20 金币，买下了一本古老的卷轴：【${card.name}】！` };
                    } else {
                        return { success: false, log: `金币不足！收藏家并不理会你。` };
                    }
                }
            }
        ]
    },
    {
        id: 'ambush',
        name: '幽暗密林伏击',
        desc: '草丛中突然窜出一个猩红的身影！你被伏击了。',
        choices: [
            {
                text: '拔剑迎战！(触发一场战斗，获胜可得双倍金币)',
                effect: (player) => {
                    return { success: true, triggerCombat: true, doubleGold: true, log: `你大喝一声冲上前去！` };
                }
            },
            {
                text: '仓皇逃跑！(丢弃 10 金币)',
                effect: (player) => {
                    const lost = Math.min(player.gold, 10);
                    player.gold -= lost;
                    return { success: false, log: `你狼狈地逃跑了，在林子里跌跌撞撞，丢失了 ${lost} 个金币。` };
                }
            }
        ]
    },
    {
        id: 'storm',
        name: '暴风雨',
        desc: '突然乌云密布，雷电交加，狂风暴雨席卷了整片森林。潮湿冰冷的风雨拍打在身上，让你的召唤物感到极其不适。前方传来了怪物的低吼声。',
        choices: [
            {
                text: '顶着暴风雨强行通过 (触发战斗，本场战斗召唤物攻击力 -1)',
                effect: (player) => {
                    return {
                        success: true,
                        triggerCombat: true,
                        environmentalEvent: {
                            id: 'storm',
                            name: '暴风雨',
                            icon: '🌧️',
                            summonAtkModifier: -1
                        },
                        log: '你拔出武器，冒着狂风暴雨迎击怪物！'
                    };
                }
            },
            {
                text: '寻找山洞避雨 (消耗 10 金币)',
                effect: (player) => {
                    if (player.gold >= 10) {
                        player.gold -= 10;
                        return { success: true, log: '你消耗了 10 金币找到一处避雨的山洞，安全度过了这场暴风雨。' };
                    } else {
                        return {
                            success: false,
                            triggerCombat: true,
                            environmentalEvent: {
                                id: 'storm',
                                name: '暴风雨',
                                icon: '🌧️',
                                summonAtkModifier: -1
                            },
                            log: '你金币不足（需要 10 金币），无法租借避雨设施！你被淋得浑身冰凉，且被迫迎战怪物！'
                        };
                    }
                }
            }
        ]
    },
    {
        id: 'sunny',
        name: '阳光明媚',
        desc: '金色的微光洒在林间，微风轻拂。阳光温暖而明媚，是一个绝佳的前行日子。你感觉整个人都充满了活力。',
        choices: [
            {
                text: '晒晒太阳并赶路 (恢复 10% 最大生命值)',
                effect: (player) => {
                    const healVal = Math.floor(player.maxHp * 0.1) || 2;
                    const actual = player.heal(healVal);
                    return { success: true, log: `温暖的阳光滋润着你，你惬意地舒展身心，恢复了 ${actual} 点生命值。` };
                }
            },
            {
                text: '在林间空地野餐 (消耗 5 金币，祈求命运卡牌)',
                effect: (player) => {
                    if (player.gold >= 5) {
                        player.gold -= 5;
                        const card = getRandomCards(1, player.difficulty || 'easy')[0];
                        card.apply(player);
                        return { success: true, log: `你消耗了 5 金币进行野餐，引来了林间神灵的注视，获得了命运赐予：【${card.name}】！` };
                    } else {
                        return { success: false, log: '你身上甚至掏不出 5 金币来买野餐干粮！只能摸摸干瘪的肚皮继续赶路。' };
                    }
                }
            }
        ]
    },
    {
        id: 'blizzard',
        name: '暴风雪',
        desc: '气温骤降，刺骨的寒风夹杂着积雪呼啸而过。极寒正在无情地侵蚀你的体温与防御机能，使你的承受极限大幅度下降，而怪物的嚎叫在雪中回荡！',
        choices: [
            {
                text: '强行突围 (触发战斗，本次战斗最大生命值上限临时减 10)',
                effect: (player) => {
                    return {
                        success: true,
                        triggerCombat: true,
                        environmentalEvent: {
                            id: 'blizzard',
                            name: '暴风雪',
                            icon: '❄️',
                            tempMaxHpDebuff: 10
                        },
                        log: '你裹紧斗篷迎雪而上，迎战前方的怪物！'
                    };
                }
            },
            {
                text: '生火防寒避雨 (消耗 15 金币)',
                effect: (player) => {
                    if (player.gold >= 15) {
                        player.gold -= 15;
                        return { success: true, log: '你消耗了 15 金币购买物资生火取暖，安全避开了暴风雪的中心区域。' };
                    } else {
                        return {
                            success: false,
                            triggerCombat: true,
                            environmentalEvent: {
                                id: 'blizzard',
                                name: '暴风雪',
                                icon: '❄️',
                                tempMaxHpDebuff: 10
                            },
                            log: '你没有足够的金币（需要 15 金币）购买生火物资！你在寒风中冻得瑟瑟发抖，并被迫卷入战斗！'
                        };
                    }
                }
            }
        ]
    },
    {
        id: 'wings_of_fury',
        name: '狂暴之翼',
        desc: '天空中掠过成群的双翼猛禽，它们的戾鸣激怒了周围的怪物，引来了额外的支援！不过，狂暴的气流和猛禽的战意也同样刺激了你召唤物的斗志。',
        choices: [
            {
                text: '正面迎战兽群 (触发战斗，怪物数 +1，但召唤物攻击力 +1)',
                effect: (player) => {
                    return {
                        success: true,
                        triggerCombat: true,
                        environmentalEvent: {
                            id: 'wings_of_fury',
                            name: '狂暴之翼',
                            icon: '🦅',
                            extraMonsterCount: 1,
                            summonAtkModifier: 1
                        },
                        log: '你无惧空中与陆地的包围，拔剑与它们战在一起！'
                    };
                }
            },
            {
                text: '强行突围逃走 (消耗 6 点生命值)',
                effect: (player) => {
                    if (player.currentHp > 6) {
                        player.takeDamage(6);
                        return { success: true, log: '你冒着俯冲攻击的危险强行突围，在付出 6 点生命值被抓伤的代价后成功逃脱。' };
                    } else {
                        return {
                            success: false,
                            triggerCombat: true,
                            environmentalEvent: {
                                id: 'wings_of_fury',
                                name: '狂暴之翼',
                                icon: '🦅',
                                extraMonsterCount: 1,
                                summonAtkModifier: 1
                            },
                            log: '你的生命值过于微弱（不足 6 点），无法强行突围！只能在飞禽和怪物的包围中被迫应战！'
                        };
                    }
                }
            }
        ]
    },
    {
        id: 'town',
        name: '遭遇。小镇',
        desc: '森林的古道尽头意外浮现一座安静祥和的小镇，居民们听说你正在挑战命运之神，纷纷表示愿意助你一臂之力，甚至有英勇的村民请求随行！',
        choices: [
            {
                text: '招募小镇卫兵 (召唤物：攻 3 / HP 14)',
                effect: (player) => {
                    const guard = new Summon('summon_town_guard', '小镇卫兵', 14, 3, '防守坚韧的小镇护卫兵。', 'guard');
                    player.summons.push(guard);
                    return { success: true, log: '【小镇卫兵】（HP: 14, 攻: 3）手持长盾加入了你的队伍，誓死守护你的安全！' };
                }
            },
            {
                text: '招募小镇猎手 (召唤物：攻 4 / HP 10)',
                effect: (player) => {
                    const hunter = new Summon('summon_town_hunter', '小镇猎手', 10, 4, '箭法高强的小镇精英猎人。', 'hunter');
                    player.summons.push(hunter);
                    return { success: true, log: '【小镇猎手】（HP: 10, 攻: 4）挽起长弓加入了你的队伍，誓将射穿前方阻碍！' };
                }
            },
            {
                text: '去旅店借宿休整 (消耗 10 金币，恢复 25 生命值)',
                effect: (player) => {
                    if (player.gold >= 10) {
                        player.gold -= 10;
                        const healed = player.heal(25);
                        return { success: true, log: `你花费 10 金币入住温泉客栈，恢复了 ${healed} 点生命值。` };
                    } else {
                        return { success: false, log: '你没有 10 金币付房费，尴尬地被老板赶了出来，没能得到休息。' };
                    }
                }
            }
        ]
    }
];

export function getRandomMysteryEvent() {
    return MYSTERY_EVENTS[Math.floor(Math.random() * MYSTERY_EVENTS.length)];
}
