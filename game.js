// game.js

import { Player, generateMonstersForLevel, Monster } from './entities.js';
import { getRandomCards, getRandomDiceChoices, generateShopItems, getCampfireOptions, getRandomMysteryEvent } from './cards.js';
import { getEl, renderMap, renderHUD, renderCombat, animateCoinFlip, animateDiceRoll, resetCoinAndDice, renderRewards, renderShop, renderCampfire, renderMysteryEvent, showMysteryResult, showWeatherToast } from './render.js';
import { audio } from './audio.js';

// Game State variables
let player = null;
let currentEnemies = [];
let completedLevels = new Set();
let currentLocation = 'flag'; // 'flag', 'level_1', 'fork_1', 'level_2', ...
let maxUnlockedDifficulty = localStorage.getItem('maxUnlockedDifficulty') || 'easy';
let selectedDifficulty = 'easy';
let activeEnvironmentalEvent = null;

const COMBAT_EVENTS = [
    {
        id: 'storm',
        name: '暴风雨',
        icon: '🌧️',
        summonAtkModifier: -1,
        desc: '暴风雨呼啸：本场战斗所有召唤物的攻击力 -1！'
    },
    {
        id: 'blizzard',
        name: '暴风雪',
        icon: '❄️',
        tempMaxHpDebuff: 10,
        desc: '暴风雪肆虐：本次战斗玩家最大生命值上限临时减少 10 点！'
    },
    {
        id: 'wings_of_fury',
        name: '狂暴之翼',
        icon: '🦅',
        extraMonsterCount: 1,
        summonAtkModifier: 1,
        desc: '狂暴兽群涌现：本场战斗额外增加 1 个怪物，但我方召唤物攻击力 +1！'
    },
    {
        id: 'sunny',
        name: '阳光明媚',
        icon: '☀️',
        playerAtkModifier: 1,
        desc: '暖阳高照：阳光普照大地，本场战斗英雄基础攻击力 +1！'
    },
    {
        id: 'thunderstorm',
        name: '雷霆风暴',
        icon: '⚡',
        thunderBonusDamage: 2,
        desc: '雷鸣电闪：电光狂舞，我方拼点获胜并造成伤害时，额外追加 2 点真实雷击伤害！'
    },
    {
        id: 'volcano',
        name: '火山爆发',
        icon: '🌋',
        volcanoDamage: 2,
        desc: '熔岩喷发：火山喷发，每回合结束时，玩家与所有怪物同时受到 2 点真实火焰伤害！'
    },
    {
        id: 'fog',
        name: '迷雾重重',
        icon: '🌫️',
        fogEffect: true,
        desc: '迷雾笼罩：浓雾弥漫，双方拼点最终值有 30% 几率随机增加或减少 1 点！'
    },
    {
        id: 'lucky_star',
        name: '幸运星降临',
        icon: '⭐',
        luckyStarEffect: true,
        desc: '群星闪烁：好运眷顾，本场战斗英雄投掷硬币正面几率额外提升 15%！'
    }
];

let combatState = {
    turn: 1,
    hasRolled: false,
    hasPlayerRolled: false,
    hasEnemyRolled: false,
    coinResult: null,
    appliedMaxHpDebuff: 0, // Track blizzard HP penalty
    diceValues: null,
    maxDiceValue: 0,
    turnDamageCalculated: null,
    activeTargetIndex: null,
    isPlayerTurn: true,
    doubleGold: false,
    mysteryAmbush: false,
    headsStreak: 0,
    tailsStreak: 0,
    nextTurnAtkBonus: 0 // Track Burn mechanism stacks
};

// 1. Initial Setup and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    setupCharacterSelection();
    setupCombatListeners();
    setupShopListeners();
    setupForkListeners();
    setupGameOverListeners();
    setupAudioControls();
    setupGlobalClickAudio();
    setupDifficultySelector();
});

function triggerAudioInit() {
    audio.resumeContext();
    audio.startBgm();
}

function setupAudioControls() {
    const toggleBgmBtn = getEl('toggle-bgm');
    const toggleSfxBtn = getEl('toggle-sfx');

    toggleBgmBtn.addEventListener('click', () => {
        triggerAudioInit();
        const enabled = !audio.bgmEnabled;
        audio.toggleBgm(enabled);
        if (enabled) {
            toggleBgmBtn.textContent = '🎵 音乐: 开启';
            toggleBgmBtn.classList.remove('muted');
        } else {
            toggleBgmBtn.textContent = '🎵 音乐: 静音';
            toggleBgmBtn.classList.add('muted');
        }
    });

    toggleSfxBtn.addEventListener('click', () => {
        triggerAudioInit();
        const enabled = !audio.sfxEnabled;
        audio.toggleSfx(enabled);
        if (enabled) {
            toggleSfxBtn.textContent = '🔊 音效: 开启';
            toggleSfxBtn.classList.remove('muted');
        } else {
            toggleSfxBtn.textContent = '🔊 音效: 静音';
            toggleSfxBtn.classList.add('muted');
        }
    });
}

function setupGlobalClickAudio() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, .char-card, .reward-card, .dice-choice-card, .shop-item-card, .camp-option-card, .mystery-choice-btn, .map-node');
        if (btn) {
            triggerAudioInit();
            if (btn.id !== 'toggle-bgm' && btn.id !== 'toggle-sfx') {
                audio.playClick();
            }
        }
    });
}

function setupDifficultySelector() {
    const select = getEl('difficulty-select');
    maxUnlockedDifficulty = localStorage.getItem('maxUnlockedDifficulty') || 'easy';
    
    const difficulties = ['easy', 'normal', 'hard', 'hell'];
    const maxIndex = difficulties.indexOf(maxUnlockedDifficulty);
    
    if (maxIndex >= 1) {
        getEl('opt-normal').removeAttribute('disabled');
        getEl('opt-normal').textContent = '普通模式 (敌生命x1.2, 攻击x1.1) - 已解锁';
    }
    if (maxIndex >= 2) {
        getEl('opt-hard').removeAttribute('disabled');
        getEl('opt-hard').textContent = '困难模式 (敌生命x1.7, 攻击x1.4, 机制+1) - 已解锁';
    }
    if (maxIndex >= 3) {
        getEl('opt-hell').removeAttribute('disabled');
        getEl('opt-hell').textContent = '地狱模式 (敌生命x2.5, 攻击x2.0, 机制+2, 骰上限+1) - 已解锁';
    }
    
    // Set default selected to max unlocked difficulty
    select.value = maxUnlockedDifficulty;
    selectedDifficulty = maxUnlockedDifficulty;
    
    select.addEventListener('change', (e) => {
        selectedDifficulty = e.target.value;
    });
}

function getDifficultyName(diff) {
    switch (diff) {
        case 'easy': return '简单';
        case 'normal': return '普通';
        case 'hard': return '困难';
        case 'hell': return '地狱';
        default: return '简单';
    }
}

// Screen Switching Router
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    getEl(screenId).classList.add('active');
}

function showActionView(viewId) {
    document.querySelectorAll('.action-view').forEach(v => v.classList.remove('active'));
    getEl(viewId).classList.add('active');
}

// 2. Character Selection Page Logic
function setupCharacterSelection() {
    const cards = document.querySelectorAll('.char-card');
    const startBtn = getEl('start-game-btn');
    let selectedChar = null;

    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedChar = card.dataset.char;
            
            // Enable start button
            startBtn.classList.remove('disabled');
            startBtn.removeAttribute('disabled');
        });
    });

    startBtn.addEventListener('click', () => {
        if (!selectedChar) return;
        
        const nameInput = getEl('player-name-input').value.trim();
        player = new Player(selectedChar, nameInput);
        player.difficulty = selectedDifficulty;
        
        // Initial Game Setup
        completedLevels = new Set();
        currentLocation = 'level_1';
        
        showScreen('main-screen');
        renderHUD(player);
        renderMap(currentLocation, completedLevels);
        
        // Start Level 1
        startCombatForLevel(1);
    });
}

// 3. Combat Flow Controller
function startCombatForLevel(level) {
    player.level = level;
    currentEnemies = generateMonstersForLevel(level);
    
    // If no environmental event was preset by mystery lane, roll one!
    if (!activeEnvironmentalEvent) {
        const randomIndex = Math.floor(Math.random() * COMBAT_EVENTS.length);
        activeEnvironmentalEvent = { ...COMBAT_EVENTS[randomIndex] };
    }
    
    // Trigger toast notification for the special event
    showWeatherToast(activeEnvironmentalEvent);
    
    // Apply environmental wings of fury extra monster
    if (activeEnvironmentalEvent && activeEnvironmentalEvent.extraMonsterCount > 0) {
        const normalMechanisms = [
            { id: 'thorns', name: '荆棘', desc: '反弹25%受到的伤害给攻击者。' },
            { id: 'regen', name: '再生', desc: '每回合结束时恢复5%的最大生命值。' },
            { id: 'dodge', name: '闪避', desc: '有20%的几率完全闪避该次攻击。' },
            { id: 'vampire', name: '吸血', desc: '攻击造成伤害的50%转化为自身生命值。' },
            { id: 'weakness', name: '虚弱', desc: '攻击时有30%几率降低玩家1点基础攻击，持续1回合。' }
        ];
        const monsterNames = ["绿皮史莱姆", "洞穴蝙蝠", "蛮荒哥布林", "骷髅弓箭手", "深渊爬行者", "亡灵巫师", "熔岩史莱姆", "嗜血豺狼人", "石雕守卫", "暗影幽灵"];
        const name = monsterNames[Math.floor(Math.random() * monsterNames.length)] + " (支援)";
        const hp = Math.floor((12 + level * 3.5) * 0.6);
        const atk = Math.floor((1.5 + level * 0.3) * 0.8);
        
        let mechsPool = [...normalMechanisms];
        if (level > 12) {
            mechsPool = mechsPool.filter(m => m.id !== 'weakness');
        }
        const selectedMechs = [mechsPool[Math.floor(Math.random() * mechsPool.length)]];
        currentEnemies.push(new Monster(name, hp, atk, selectedMechs, false));
    }
    
    // Scale and enhance monster stats based on selectedDifficulty
    currentEnemies.forEach(enemy => {
        if (selectedDifficulty === 'easy') {
            enemy.maxHp = Math.max(5, Math.floor(enemy.maxHp * 0.8));
            enemy.currentHp = enemy.maxHp;
            enemy.attack = Math.max(1, Math.floor(enemy.attack * 0.8));
        } else if (selectedDifficulty === 'normal') {
            enemy.maxHp = Math.floor(enemy.maxHp * 1.2);
            enemy.currentHp = enemy.maxHp;
            enemy.attack = Math.max(1, Math.floor(enemy.attack * 1.1));
        } else if (selectedDifficulty === 'hard') {
            enemy.maxHp = Math.floor(enemy.maxHp * 1.7);
            enemy.currentHp = enemy.maxHp;
            enemy.attack = Math.max(2, Math.floor(enemy.attack * 1.4));
            
            // Extra +1 random mechanism card
            addRandomMechanismsToMonster(enemy, 1, level % 6 === 0, level);
            
            // Elite/Boss gets +1 extra die count
            if (enemy.isBoss || level % 3 === 0) {
                enemy.diceCount += 1;
            }
        } else if (selectedDifficulty === 'hell') {
            enemy.maxHp = Math.floor(enemy.maxHp * 2.5);
            enemy.currentHp = enemy.maxHp;
            enemy.attack = Math.max(2, Math.floor(enemy.attack * 2.0));
            
            // Extra +2 random mechanism cards
            addRandomMechanismsToMonster(enemy, 2, level % 6 === 0, level);
            
            // All monsters get +1 max dice bounds
            enemy.diceMax += 1;
            
            // Elite/Boss gets +1 extra die count
            if (enemy.isBoss || level % 3 === 0) {
                enemy.diceCount += 1;
            }
        }

        // Apply +10% HP and +20% Attack scaling after the third boss (level > 18)
        if (level > 18) {
            enemy.maxHp = Math.round(enemy.maxHp * 1.1);
            enemy.currentHp = enemy.maxHp;
            enemy.attack = Math.round(enemy.attack * 1.2);
        }
    });

    // Reset Combat States
    combatState.hasUsedMask = false;
    combatState.hasUsedSacrifice = false;
    combatState.sacrificedMaxHpTotal = 0;
    player.shield = 0;

    if (player.originalType === 'maskmaster') {
        if (player.type !== 'maskmaster') {
            if (player.type === 'dicemaster') {
                player.diceCount = Math.max(1, player.diceCount - 1);
            }
            player.type = 'maskmaster';
        }
        
        // Reset skills UI elements
        getEl('maskmaster-skills-container').classList.remove('hidden');
        getEl('mask-choices-container').classList.add('hidden');
        
        const maskBtn = getEl('mask-skill-btn');
        maskBtn.disabled = false;
        maskBtn.classList.remove('disabled');
        maskBtn.textContent = '🎭 假面变身';
        
        const shieldBtn = getEl('shield-skill-btn');
        shieldBtn.disabled = false;
        shieldBtn.classList.remove('disabled');
        shieldBtn.textContent = '🛡️ 献祭血契';
    } else {
        const maskCont = getEl('maskmaster-skills-container');
        const choicesCont = getEl('mask-choices-container');
        if (maskCont) maskCont.classList.add('hidden');
        if (choicesCont) choicesCont.classList.add('hidden');
    }

    combatState.turn = 1;
    combatState.hasRolled = false;
    combatState.hasPlayerRolled = false;
    combatState.hasEnemyRolled = false;
    combatState.coinResult = null;
    combatState.diceValues = null;
    combatState.maxDiceValue = 0;
    combatState.turnDamageCalculated = null;
    combatState.activeTargetIndex = null;
    combatState.isPlayerTurn = true;
    combatState.headsStreak = 0;
    combatState.tailsStreak = 0;
    combatState.appliedMaxHpDebuff = 0;
    // Reset temporary attack bonuses from Burn
    player.tempAttackBonus = 0;
    combatState.nextTurnAtkBonus = 0;
    
    // Apply environmental blizzard HP penalty
    if (activeEnvironmentalEvent && activeEnvironmentalEvent.tempMaxHpDebuff > 0) {
        const debuff = activeEnvironmentalEvent.tempMaxHpDebuff;
        combatState.appliedMaxHpDebuff = debuff;
        player.maxHp = Math.max(10, player.maxHp - debuff);
        if (player.currentHp > player.maxHp) {
            player.currentHp = player.maxHp;
        }
    }
    
    // Don't overwrite doubleGold if it was set externally (e.g. by Mystery Ambush)
    if (!combatState.mysteryAmbush) {
        combatState.doubleGold = false;
    }
    
    resetCoinAndDice();
    clearCombatLogs();
    
    // Setup Action Area
    showActionView('combat-view');
    
    // Mage toggle visibility reset
    if (player.type === 'mage') {
        getEl('mage-toggle-container').classList.remove('hidden');
    } else {
        getEl('mage-toggle-container').classList.add('hidden');
    }

    addCombatLog(`⚔️ 战斗开始！你进入了第 ${level} 关 (${getDifficultyName(selectedDifficulty)}难度)。`, 'important');
    if (activeEnvironmentalEvent) {
        addCombatLog(`🌌 【环境天气】当前战场处于【${activeEnvironmentalEvent.name}】状态！`, 'important');
        if (activeEnvironmentalEvent.id === 'storm') {
            addCombatLog(`🌧️ 暴风雨呼啸：本场战斗所有召唤物的攻击力 -1！`, 'damage-player');
        } else if (activeEnvironmentalEvent.id === 'blizzard') {
            addCombatLog(`❄️ 暴风雪肆虐：本场战斗你的最大生命值上限临时 -10！`, 'damage-player');
        } else if (activeEnvironmentalEvent.id === 'wings_of_fury') {
            addCombatLog(`🦅 狂暴之翼：额外增加 1 个怪物，但我方召唤物攻击力 +1！`, 'info');
        } else if (activeEnvironmentalEvent.id === 'sunny') {
            addCombatLog(`☀️ 阳光明媚：本场战斗我方英雄基础攻击力 +1！`, 'info');
        } else if (activeEnvironmentalEvent.id === 'thunderstorm') {
            addCombatLog(`⚡ 雷霆风暴：拼点获胜时，对敌方额外追加 2 点真实雷击伤害！`, 'info');
        } else if (activeEnvironmentalEvent.id === 'volcano') {
            addCombatLog(`🌋 火山爆发：每回合结束时，玩家与怪物同时受到 2 点真实火焰伤害！`, 'damage-player');
        } else if (activeEnvironmentalEvent.id === 'fog') {
            addCombatLog(`🌫️ 迷雾重重：双方拼点结算时有 30% 几率随机增加或减少 1 点！`, 'info');
        } else if (activeEnvironmentalEvent.id === 'lucky_star') {
            addCombatLog(`⭐ 幸运星降临：本场战斗英雄投掷硬币正面率提升 15%！`, 'info');
        }
    }
    
    if (currentEnemies[0].isBoss) {
        addCombatLog(`⚠️ 领主警告：【${currentEnemies[0].name}】降临！它带有 ${currentEnemies[0].mechanisms.length} 个特殊机制！`, 'damage-player');
    } else {
        addCombatLog(`遭遇了 ${currentEnemies.length} 个怪物。击败它们以继续！`);
    }
    
    currentEnemies.forEach(e => {
        addCombatLog(` - ${e.name} (HP: ${e.maxHp}, 攻击: ${e.attack}) [机制: ${e.mechanisms.map(m => m.name).join(', ') || '无'}]`);
    });

    updateCombatUI();
}

function addRandomMechanismsToMonster(monster, count, isBossLevel, level = 1) {
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
    
    let pool = isBossLevel ? bossMechanisms : normalMechanisms;
    if (level > 12) {
        pool = pool.filter(m => m.id !== 'weakness');
    }
    
    for (let i = 0; i < count; i++) {
        const available = pool.filter(p => !monster.mechanisms.some(m => m.id === p.id));
        if (available.length === 0) break;
        const picked = available[Math.floor(Math.random() * available.length)];
        monster.mechanisms.push(picked);
    }
}

function updateCombatUI() {
    renderHUD(player);
    renderCombat(player, currentEnemies, combatState.activeTargetIndex, handleTargetSelection, activeEnvironmentalEvent);
    
    // Roll / Attack button toggling
    const rollBtn = getEl('roll-btn');
    const enemyRollBtn = getEl('enemy-roll-btn');
    const attackBtn = getEl('attack-btn');
    const targetTip = getEl('target-tip');

    if (!combatState.hasPlayerRolled) {
        rollBtn.classList.remove('hidden');
        enemyRollBtn.classList.add('hidden');
        attackBtn.classList.add('hidden');
        targetTip.classList.remove('active');
        
        getEl('mage-switch-btn').disabled = false;
        getEl('mage-switch-btn').classList.remove('disabled');
    } else if (!combatState.hasEnemyRolled) {
        rollBtn.classList.add('hidden');
        enemyRollBtn.classList.remove('hidden');
        attackBtn.classList.add('hidden');
        targetTip.classList.remove('active');
        
        const hasBoss = currentEnemies.some(e => e.isBoss && e.currentHp > 0);
        if (hasBoss) {
            enemyRollBtn.textContent = '👿 开始领主投掷 🎲';
        } else {
            enemyRollBtn.textContent = '👾 开始怪物投掷 🎲';
        }
        
        getEl('mage-switch-btn').disabled = true;
        getEl('mage-switch-btn').classList.add('disabled');
    } else {
        rollBtn.classList.add('hidden');
        enemyRollBtn.classList.add('hidden');
        attackBtn.classList.remove('hidden');
        getEl('mage-switch-btn').disabled = true;
        getEl('mage-switch-btn').classList.add('disabled');
        
        // Show target selector tip if damage is greater than 0
        if (combatState.turnDamageCalculated.damage > 0) {
            targetTip.classList.add('active');
            targetTip.textContent = '← 投掷完毕，点击敌方卡牌进行攻击结算';
            // Enable attack button only if a target is chosen
            if (combatState.activeTargetIndex !== null) {
                attackBtn.removeAttribute('disabled');
                attackBtn.classList.remove('disabled');
                attackBtn.textContent = '⚔️ 确认攻击';
            } else {
                attackBtn.setAttribute('disabled', 'true');
                attackBtn.classList.add('disabled');
                attackBtn.textContent = '⚔️ 确认攻击';
            }
        } else {
            // If damage is 0 (negative attack), attack button acts as "end turn" directly
            targetTip.classList.remove('active');
            attackBtn.removeAttribute('disabled');
            attackBtn.classList.remove('disabled');
            attackBtn.textContent = '确认结束回合 (伤害为0)';
        }
    }
}

function handleTargetSelection(index) {
    if (!combatState.hasRolled || combatState.turnDamageCalculated.damage <= 0) return;
    
    combatState.activeTargetIndex = index;
    updateCombatUI();
}

function setupCombatListeners() {
    // Mask Master "Mask" transform toggle Choices UI
    getEl('mask-skill-btn').addEventListener('click', () => {
        if (player.originalType !== 'maskmaster' || combatState.hasUsedMask) return;
        getEl('mask-choices-container').classList.toggle('hidden');
    });

    // Mask Master choosing which character to mimic
    document.querySelectorAll('.mask-choice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (combatState.hasUsedMask) return;
            const targetType = e.target.getAttribute('data-target');
            
            combatState.hasUsedMask = true;
            player.type = targetType;
            
            // Apply corresponding passive changes
            if (targetType === 'dicemaster') {
                player.diceCount += 1;
                addCombatLog(`🎭 【假面变身】变身为【骰子大师】！获得额外 1 个骰子！`, 'important');
            } else if (targetType === 'knight') {
                addCombatLog(`🎭 【假面变身】变身为【骑士】！回合结束时受伤会恢复生命值！`, 'important');
            } else if (targetType === 'mage') {
                player.mageForm = 'light';
                // Show mage form switch button container
                getEl('mage-toggle-container').classList.remove('hidden');
                addCombatLog(`🎭 【假面变身】变身为【光暗法师】！可以使用光/暗形态切换！`, 'important');
            } else if (targetType === 'archer') {
                addCombatLog(`🎭 【假面变身】变身为【风行弓箭手】！随从攻击力大于5时，伤害加1！`, 'important');
            }
            
            getEl('mask-choices-container').classList.add('hidden');
            const maskBtn = getEl('mask-skill-btn');
            maskBtn.disabled = true;
            maskBtn.classList.add('disabled');
            maskBtn.textContent = `🎭 变身为: ${player.getDefaultName(targetType)}`;
            
            updateCombatUI();
        });
    });

    // Mask Master "Sacrifice" Shield skill
    getEl('shield-skill-btn').addEventListener('click', () => {
        if (player.originalType !== 'maskmaster' || combatState.hasUsedSacrifice) return;
        combatState.hasUsedSacrifice = true;
        
        // Sacrifice 5% max HP, rounded, min 1
        const sacrificeAmount = Math.max(1, Math.round(player.maxHp * 0.05));
        
        player.maxHp = Math.max(1, player.maxHp - sacrificeAmount);
        combatState.sacrificedMaxHpTotal = (combatState.sacrificedMaxHpTotal || 0) + sacrificeAmount;
        
        if (player.currentHp > player.maxHp) {
            player.currentHp = player.maxHp;
        }
        
        const shieldGained = sacrificeAmount * 5;
        player.shield = (player.shield || 0) + shieldGained;
        
        addCombatLog(`🛡️ 【献祭血契】你牺牲了 ${sacrificeAmount} 点最大生命上限，换取了五倍的护盾：${shieldGained} 点！`, 'important');
        
        const shieldBtn = getEl('shield-skill-btn');
        shieldBtn.disabled = true;
        shieldBtn.classList.add('disabled');
        shieldBtn.textContent = '🛡️ 已献祭';
        
        updateCombatUI();
    });

    // Mage toggle form action
    getEl('mage-switch-btn').addEventListener('click', () => {
        if (player.type !== 'mage' || combatState.hasPlayerRolled) return;
        player.toggleMageForm();
        addCombatLog(`☯️ 你切换到了【${player.mageForm === 'light' ? '光形态' : '暗形态'}】。`);
        updateCombatUI();
    });

    // Roll Coin & Dice action (Player side)
    getEl('roll-btn').addEventListener('click', () => {
        if (combatState.hasPlayerRolled || !combatState.isPlayerTurn) return;
        
        triggerAudioInit(); // Ensure AudioContext is active
        audio.playCoinFlip();
        
        combatState.isPlayerTurn = false; // Disable during roll animation
        getEl('roll-btn').disabled = true;
        getEl('roll-btn').classList.add('disabled');

        // Calculate Coin Flip result with dynamic streak probabilities
        let headsChance = 0.50 - combatState.headsStreak * 0.01 + combatState.tailsStreak * 0.01;
        
        // Apply lucky star bonus
        if (activeEnvironmentalEvent && activeEnvironmentalEvent.id === 'lucky_star') {
            headsChance += 0.15;
            addCombatLog(`⭐ 【幸运星降临】好运眷顾！本回合硬币正面率提升 15%！`, 'info');
        }

        headsChance = Math.max(0, Math.min(1, headsChance));

        let coin = Math.random() < headsChance ? 'heads' : 'tails';
        
        // SS/SSS passive override: fate_weaver (first 2 turns always Heads)
        const hasFateWeaver = player.mechanisms.find(m => m.id === 'sss_fate_weaver');
        if (hasFateWeaver && combatState.turn <= 2) {
            coin = 'heads';
            addCombatLog(`【命运编织者】在前2回合锁定了硬币为【正面】！`, 'info');
        }

        // Boss passive override: tails_curse (20% increased tails chance)
        const bossHasTailsCurse = currentEnemies.find(e => e.currentHp > 0 && e.mechanisms.find(m => m.id === 'tails_curse'));
        if (bossHasTailsCurse && !hasFateWeaver) {
            headsChance = Math.max(0, headsChance - 0.20);
            coin = Math.random() < headsChance ? 'heads' : 'tails';
            addCombatLog(`【反面诅咒】在空中回荡，干扰了你的硬币轨迹！(正面率减少20%)`, 'damage-player');
        }

        // 1. Determine Dice Roll results for Player
        const diceValues = [];
        for (let i = 0; i < player.diceCount; i++) {
            const roll = Math.floor(Math.random() * (player.diceMax - player.diceMin + 1)) + player.diceMin;
            diceValues.push(roll);
        }
        const maxVal = Math.max(...diceValues);

        // 2. Roll for each Summon (inherits player's dice bounds)
        player.summons.forEach(s => {
            if (s.currentHp <= 0) return;
            const sCoin = Math.random() < 0.5 ? 'heads' : 'tails';
            const sDiceValues = [];
            for (let i = 0; i < player.diceCount; i++) {
                const sRoll = Math.floor(Math.random() * (player.diceMax - player.diceMin + 1)) + player.diceMin;
                sDiceValues.push(sRoll);
            }
            const sMaxVal = Math.max(...sDiceValues);
            const isFog = activeEnvironmentalEvent && activeEnvironmentalEvent.id === 'fog';
            s.calculateClashPoints(sCoin, sMaxVal, activeEnvironmentalEvent ? (activeEnvironmentalEvent.summonAtkModifier || 0) : 0, player.type === 'archer', isFog);
        });

        // Run animations
        animateCoinFlip(coin, () => {
            audio.playDiceRoll();
            animateDiceRoll(diceValues, player.diceMin, player.diceMax, () => {
                // Post-roll calculation
                combatState.coinResult = coin;
                combatState.diceValues = diceValues;
                combatState.maxDiceValue = maxVal;
                combatState.hasPlayerRolled = true;

                // Update coin streaks
                if (coin === 'heads') {
                    combatState.headsStreak += 1;
                    combatState.tailsStreak = 0;
                } else {
                    combatState.tailsStreak += 1;
                    combatState.headsStreak = 0;
                }

                // Calculate final damage
                const playerAtkMod = activeEnvironmentalEvent && activeEnvironmentalEvent.id === 'sunny' ? 1 : 0;
                const isFog = activeEnvironmentalEvent && activeEnvironmentalEvent.id === 'fog';
                const dmgCalc = player.calculateTurnDamage(coin, maxVal, playerAtkMod, isFog);
                combatState.turnDamageCalculated = dmgCalc;

                addCombatLog(`🎲 我方投掷结果：硬币【${coin === 'heads' ? '正面' : '反面'}】，骰子 [${diceValues.join(', ')}]。`);
                const nextHeadsChance = Math.max(0, Math.min(1, 0.50 - combatState.headsStreak * 0.01 + combatState.tailsStreak * 0.01));
                addCombatLog(`📢 连击状态：正面连投 ${combatState.headsStreak} 次，反面连投 ${combatState.tailsStreak} 次。下回合硬币基础正面率：${(nextHeadsChance * 100).toFixed(0)}%。`, 'info');
                addCombatLog(`🗡️ ${dmgCalc.log}`);

                // Print summons' roll logs
                player.summons.forEach(s => {
                    if (s.currentHp <= 0) return;
                    addCombatLog(`🐾 [${s.name}] 投掷: ${s.currentRoll.coinResult === 'heads' ? '正面' : '反面'} ➔ 拼点 ${s.currentRoll.clashPoints} 点。`);
                });

                // If dice rolled is max, check lucky_six passive
                const isMaxRoll = diceValues.includes(player.diceMax);
                const hasLuckySix = player.mechanisms.find(m => m.id === 'ss_lucky_six');
                if (hasLuckySix && isMaxRoll) {
                    addCombatLog(`【天数六星】绽放！对所有敌人额外造成 5 点真实伤害！`, 'info');
                    currentEnemies.forEach(e => {
                        if (e.currentHp > 0) {
                            e.takeDamage(5);
                        }
                    });
                }

                combatState.isPlayerTurn = true;
                getEl('roll-btn').disabled = false;
                getEl('roll-btn').classList.remove('disabled');
                
                updateCombatUI();
            });
        });
    });

    // Roll Monster Coin & Dice action (Enemy side, manually triggered)
    getEl('enemy-roll-btn').addEventListener('click', () => {
        if (!combatState.hasPlayerRolled || combatState.hasEnemyRolled) return;
        
        triggerAudioInit();
        audio.playCoinFlip();

        getEl('enemy-roll-btn').disabled = true;
        getEl('enemy-roll-btn').classList.add('disabled');

        const aliveEnemies = currentEnemies.filter(e => e.currentHp > 0);
        if (aliveEnemies.length === 0) return;

        // Roll for each Monster
        currentEnemies.forEach(e => {
            if (e.currentHp <= 0) return;
            const eCoin = Math.random() < 0.5 ? 'heads' : 'tails';
            const eDiceValues = [];
            for (let i = 0; i < e.diceCount; i++) {
                const eRoll = Math.floor(Math.random() * (e.diceMax - e.diceMin + 1)) + e.diceMin;
                eDiceValues.push(eRoll);
            }
            const eMaxVal = Math.max(...eDiceValues);
            const isFog = activeEnvironmentalEvent && activeEnvironmentalEvent.id === 'fog';
            e.calculateClashPoints(eCoin, eMaxVal, isFog);
            e.currentRoll.diceValues = eDiceValues; // Store all dice values for animation display
        });

        // Use the first alive enemy's result for the central 3D animation
        const primaryEnemy = aliveEnemies[0];
        const coin = primaryEnemy.currentRoll.coinResult;
        const diceValues = primaryEnemy.currentRoll.diceValues;

        animateCoinFlip(coin, () => {
            audio.playDiceRoll();
            animateDiceRoll(diceValues, primaryEnemy.diceMin, primaryEnemy.diceMax, () => {
                combatState.hasEnemyRolled = true;
                combatState.hasRolled = true;

                addCombatLog(`🎲 敌方投掷结果：`);
                currentEnemies.forEach(e => {
                    if (e.currentHp <= 0) return;
                    addCombatLog(`👾 [${e.name}] 投掷: ${e.currentRoll.coinResult === 'heads' ? '正面' : '反面'} [${e.currentRoll.diceValues.join(', ')}] ➔ 拼点 ${e.currentRoll.clashPoints} 点。`);
                });

                getEl('enemy-roll-btn').disabled = false;
                getEl('enemy-roll-btn').classList.remove('disabled');

                updateCombatUI();
            });
        });
    });

    // Execute Player attack (Clash Resolution)
    getEl('attack-btn').addEventListener('click', () => {
        if (!combatState.hasRolled) return;

        addCombatLog(`⚡ 拼点结算开始！`, 'important');
        audio.playClash();

        const playerPoints = combatState.turnDamageCalculated.damage;

        let hitsDealt = 0;
        const hasBurn = player.mechanisms.find(m => m.id === 'mech_burn');
        const hasSweeping = player.mechanisms.find(m => m.id === 'mech_sweeping_blade');
        const freezeMech = player.mechanisms.find(m => m.id === 'mech_freeze');

        // 1. Player Clashes with ALL alive monsters
        currentEnemies.forEach((enemy, idx) => {
            if (enemy.currentHp <= 0) return;

            const enemyPoints = enemy.currentRoll.clashPoints;
            const isPrimary = (idx === combatState.activeTargetIndex);
            
            if (isPrimary) {
                addCombatLog(`⚔️ 【主决斗】你 (⚔️${playerPoints}点) vs ${enemy.name} (⚔️${enemyPoints}点)`);
                if (playerPoints > enemyPoints) {
                    // Player wins!
                    const dmgResult = enemy.takeDamage(playerPoints);
                    if (dmgResult.dodged) {
                        addCombatLog(` 💨 ${enemy.name} 闪避了你的攻击！`, 'info');
                    } else {
                        addCombatLog(` 💥 拼点获胜！你对 ${enemy.name} 造成了 ${dmgResult.damageDealt} 点伤害。`, 'damage-enemy');
                        hitsDealt++;

                        // Check thunderstorm bonus damage
                        if (activeEnvironmentalEvent && activeEnvironmentalEvent.id === 'thunderstorm') {
                            const thunderDmg = activeEnvironmentalEvent.thunderBonusDamage;
                            enemy.takeDamage(thunderDmg);
                            addCombatLog(`   ⚡ 【雷霆风暴】降临！额外对 ${enemy.name} 造成了 ${thunderDmg} 点真实雷击伤害。`, 'damage-enemy');
                        }
                        
                        // Check Freeze mechanism
                        if (freezeMech && freezeMech.cooldown === 0 && Math.random() < 0.35) {
                            enemy.frozenTurns = 1;
                            freezeMech.cooldown = 4; // Set 3 turns cooldown (+1 decay at end of turn)
                            addCombatLog(`❄️ 【寒冰之咬】触发！${enemy.name} 被彻底冰封！下回合将无法行动！`, 'info');
                        }

                        if (dmgResult.thornsDamage > 0) {
                            player.takeDamage(dmgResult.thornsDamage);
                            addCombatLog(`   🌵 受到 ${enemy.name} 的荆棘反伤！你失去了 ${dmgResult.thornsDamage} 点生命值。`, 'damage-player');
                        }
                    }
                } else if (enemyPoints > playerPoints) {
                    // Monster wins!
                    player.takeDamage(enemyPoints);
                    addCombatLog(` 👹 拼点失败！${enemy.name} 对你造成了 ${enemyPoints} 点伤害。`, 'damage-player');

                    // Monster Vampire mechanism
                    const hasVamp = enemy.mechanisms.find(m => m.id === 'vampire');
                    if (hasVamp) {
                        const healVal = Math.floor(enemyPoints * 0.5) || 1;
                        enemy.heal(healVal);
                        audio.playHeal();
                        addCombatLog(`   🩸 ${enemy.name} 触发【吸血】：恢复了 ${healVal} 点生命值。`);
                    }

                    // Monster Weakness mechanism
                    const hasWeakness = enemy.mechanisms.find(m => m.id === 'weakness');
                    if (hasWeakness && Math.random() < 0.3) {
                        addCombatLog(`   🧪 ${enemy.name} 散发出虚弱毒气！你下回合基础伤害将减半。`, 'damage-player');
                        player.halvedDamageNextTurn = true;
                    }
                } else {
                    addCombatLog(` 🤝 双方势均力敌，未造成伤害。`);
                }
            } else {
                // For non-primary targets: they only attack player if they roll higher
                if (enemyPoints > playerPoints) {
                    addCombatLog(`⚔️ 【偷袭】${enemy.name} (⚔️${enemyPoints}点) vs 你 (⚔️${playerPoints}点)`);
                    player.takeDamage(enemyPoints);
                    addCombatLog(` 👹 拼点落败！${enemy.name} 从侧翼对你造成了 ${enemyPoints} 点伤害。`, 'damage-player');

                    const hasVamp = enemy.mechanisms.find(m => m.id === 'vampire');
                    if (hasVamp) {
                        const healVal = Math.floor(enemyPoints * 0.5) || 1;
                        enemy.heal(healVal);
                        audio.playHeal();
                        addCombatLog(`   🩸 ${enemy.name} 触发【吸血】：恢复了 ${healVal} 点生命值。`);
                    }
                }
            }
        });

        // 1.5 Apply Sweeping Blade cleave if player won the primary clash
        const primaryEnemy = currentEnemies[combatState.activeTargetIndex];
        if (hasSweeping && primaryEnemy && primaryEnemy.currentHp > 0 && playerPoints > primaryEnemy.currentRoll.clashPoints) {
            // Find other alive enemies that lost their clash to the player
            const otherLosers = currentEnemies.filter((e, idx) => {
                return idx !== combatState.activeTargetIndex &&
                       e.currentHp > 0 &&
                       playerPoints > e.currentRoll.clashPoints;
            });

            const sweepingCount = Math.min(2, otherLosers.length);
            if (sweepingCount > 0) {
                addCombatLog(`⚔️ 【横扫之刃】狂啸！横扫风暴撕裂空气：`, 'info');
                const shuffled = otherLosers.sort(() => 0.5 - Math.random());
                for (let sIdx = 0; sIdx < sweepingCount; sIdx++) {
                    const sweepEnemy = shuffled[sIdx];
                    const sDmgResult = sweepEnemy.takeDamage(playerPoints);
                    if (sDmgResult.dodged) {
                        addCombatLog(`   💨 ${sweepEnemy.name} 躲过了横扫攻击。`);
                    } else {
                        addCombatLog(`   💥 剑气击中 ${sweepEnemy.name}！造成了 ${sDmgResult.damageDealt} 点溅射伤害。`, 'damage-enemy');
                        hitsDealt++;

                        // Check thunderstorm bonus damage
                        if (activeEnvironmentalEvent && activeEnvironmentalEvent.id === 'thunderstorm') {
                            const thunderDmg = activeEnvironmentalEvent.thunderBonusDamage;
                            sweepEnemy.takeDamage(thunderDmg);
                            addCombatLog(`     ⚡ 【雷霆风暴】闪电击中 ${sweepEnemy.name}！额外追加了 ${thunderDmg} 点真实雷击伤害。`, 'damage-enemy');
                        }
                        
                        // Check Freeze on cleave
                        if (freezeMech && freezeMech.cooldown === 0 && Math.random() < 0.35) {
                            sweepEnemy.frozenTurns = 1;
                            freezeMech.cooldown = 4;
                            addCombatLog(`❄️ 【寒冰之咬】触发！${sweepEnemy.name} 被横扫风暴彻底冰封！`, 'info');
                        }

                        if (sDmgResult.thornsDamage > 0) {
                            player.takeDamage(sDmgResult.thornsDamage);
                            addCombatLog(`   🌵 受到 ${sweepEnemy.name} 的荆棘反伤！你失去了 ${sDmgResult.thornsDamage} 点生命值。`, 'damage-player');
                        }
                    }
                }
            }
        }

        // 2. Summons Clash with Random Monsters
        if (player.summons.length > 0 && hasAliveEnemies() && player.currentHp > 0) {
            player.summons.forEach(s => {
                if (s.currentHp <= 0 || !hasAliveEnemies()) return;

                const summonPoints = s.currentRoll.clashPoints;

                if (s.type === 'phoenix') {
                    // Phoenix clashes with all monsters
                    addCombatLog(`🔥 炼狱凤凰展翅！与所有存活怪物进行大范围拼点！`, 'info');
                    currentEnemies.forEach(enemy => {
                        if (enemy.currentHp <= 0) return;
                        const enemyPoints = enemy.currentRoll.clashPoints;
                        addCombatLog(` 🐾 【对比】凤凰 (⚔️${summonPoints}点) vs ${enemy.name} (⚔️${enemyPoints}点)`);

                        if (summonPoints > enemyPoints) {
                            const dmgResult = enemy.takeDamage(summonPoints);
                            if (!dmgResult.dodged) {
                                addCombatLog(`   💥 拼点获胜！凤凰对 ${enemy.name} 造成了 ${dmgResult.damageDealt} 点火焰伤害。`, 'damage-enemy');
                                hitsDealt++;

                                // Check thunderstorm bonus damage
                                if (activeEnvironmentalEvent && activeEnvironmentalEvent.id === 'thunderstorm') {
                                    const thunderDmg = activeEnvironmentalEvent.thunderBonusDamage;
                                    enemy.takeDamage(thunderDmg);
                                    addCombatLog(`     ⚡ 【雷霆风暴】闪电击中 ${enemy.name}！额外追加了 ${thunderDmg} 点真实雷击伤害。`, 'damage-enemy');
                                }

                                if (dmgResult.thornsDamage > 0) {
                                    s.takeDamage(dmgResult.thornsDamage);
                                    addCombatLog(`     🌵 凤凰受到 ${dmgResult.thornsDamage} 点荆棘反伤。`, 'damage-player');
                                }
                            } else {
                                addCombatLog(`   💨 ${enemy.name} 闪避了凤凰的火焰。`);
                            }
                        } else if (enemyPoints > summonPoints) {
                            s.takeDamage(enemyPoints);
                            addCombatLog(`   💀 拼点落败！凤凰承受了 ${enemy.name} 的 ${enemyPoints} 点反击伤害。`, 'damage-player');
                        } else {
                            addCombatLog(`   🤝 双方战平。`);
                        }
                    });
                } else {
                    // Normal single-target clashing summon
                    const alive = currentEnemies.map((e, idx) => ({e, idx})).filter(item => item.e.currentHp > 0);
                    if (alive.length > 0) {
                        const targetItem = alive[Math.floor(Math.random() * alive.length)];
                        const enemy = targetItem.e;
                        const enemyPoints = enemy.currentRoll.clashPoints;

                        addCombatLog(`🐾 【对比】${s.name} (⚔️${summonPoints}点) vs ${enemy.name} (⚔️${enemyPoints}点)`);

                        if (summonPoints > enemyPoints) {
                            const dmgResult = enemy.takeDamage(summonPoints);
                            if (dmgResult.dodged) {
                                addCombatLog(`   💨 ${enemy.name} 闪避了 ${s.name} 的扑击。`);
                            } else {
                                 addCombatLog(`   💥 拼点获胜！${s.name} 对 ${enemy.name} 造成了 ${dmgResult.damageDealt} 点伤害。`, 'damage-enemy');
                                 hitsDealt++;

                                 // Check thunderstorm bonus damage
                                 if (activeEnvironmentalEvent && activeEnvironmentalEvent.id === 'thunderstorm') {
                                     const thunderDmg = activeEnvironmentalEvent.thunderBonusDamage;
                                     enemy.takeDamage(thunderDmg);
                                     addCombatLog(`     ⚡ 【雷霆风暴】闪电击中 ${enemy.name}！额外追加了 ${thunderDmg} 点真实雷击伤害。`, 'damage-enemy');
                                 }
                                if (dmgResult.thornsDamage > 0) {
                                    s.takeDamage(dmgResult.thornsDamage);
                                    addCombatLog(`     🌵 ${s.name} 受到 ${dmgResult.thornsDamage} 点荆棘反伤。`, 'damage-player');
                                }
                            }
                        } else if (enemyPoints > summonPoints) {
                            s.takeDamage(enemyPoints);
                            addCombatLog(`   💀 拼点落败！${s.name} 承受了 ${enemy.name} 的 ${enemyPoints} 点反击伤害。`, 'damage-player');
                        } else {
                            addCombatLog(`   🤝 双方战平。`);
                        }
                    }
                }
            });

            // Filter out dead summons
            player.summons = player.summons.filter(s => s.currentHp > 0);
        }

        // 3. Check HP pools and resolve round end
        if (!hasAliveEnemies()) {
            triggerVictory();
        } else if (player.currentHp <= 0) {
            triggerGameOver();
        } else {
            // Battle continues: progress round
            addCombatLog(`🤖 结算各单位回合结束状态...`, 'info');
            
            // Knight heal or other passive
            const playerPassiveLog = player.endOfTurnPassive();
            if (playerPassiveLog) {
                addCombatLog(playerPassiveLog, 'info');
                audio.playHeal();
            }

            // Summon passives (Fairy healer)
            player.summons.forEach(s => {
                if (s.id === 'summon_fairy' || s.id === 'shop_fairy') {
                    const healVal = 3;
                    const healed = player.heal(healVal);
                    if (healed > 0) {
                        addCombatLog(`🧚 ${s.name} 释放治愈微光：恢复了你 ${healed} 点 HP。`, 'info');
                        audio.playHeal();
                    }
                }
            });

            // Monster passives (Regen, Shield)
            currentEnemies.forEach(e => {
                if (e.currentHp > 0) {
                    const ePassiveLog = e.endOfTurnAction();
                    if (ePassiveLog) addCombatLog(ePassiveLog);
                }
            });

            // Volcano end of turn damage
            if (activeEnvironmentalEvent && activeEnvironmentalEvent.id === 'volcano') {
                const volcanoDamage = activeEnvironmentalEvent.volcanoDamage;
                player.takeDamage(volcanoDamage);
                addCombatLog(`🌋 【火山爆发】熔岩四溅！你受到了 ${volcanoDamage} 点真实火焰伤害。`, 'damage-player');
                currentEnemies.forEach(e => {
                    if (e.currentHp > 0) {
                        e.currentHp = Math.max(0, e.currentHp - volcanoDamage);
                        addCombatLog(`🌋 【火山爆发】熔岩四溅！${e.name} 受到了 ${volcanoDamage} 点真实火焰伤害。`, 'damage-enemy');
                    }
                });
            }

            // Reset round states
            const hasBurn = player.mechanisms.find(m => m.id === 'mech_burn');
            const freezeMech = player.mechanisms.find(m => m.id === 'mech_freeze');

            if (hasBurn && hitsDealt > 0) {
                combatState.nextTurnAtkBonus = hitsDealt;
                addCombatLog(`🔥 【热血燃烧】激燃！本回合共击中敌人 ${hitsDealt} 次，下回合临时基础攻击力 +${hitsDealt}！`, 'info');
            }

            if (freezeMech && freezeMech.cooldown > 0) {
                freezeMech.cooldown--;
                if (freezeMech.cooldown === 0) {
                    addCombatLog(`❄️ 【寒冰之咬】冷却完毕，已准备好下一次冰封！`, 'info');
                }
            }

            combatState.turn += 1;
            combatState.hasRolled = false;
            combatState.hasPlayerRolled = false;
            combatState.hasEnemyRolled = false;
            combatState.coinResult = null;
            combatState.diceValues = null;
            combatState.maxDiceValue = 0;
            combatState.turnDamageCalculated = null;
            combatState.activeTargetIndex = null;
            
            // Carry over Burn temporary attack bonus
            player.tempAttackBonus = combatState.nextTurnAtkBonus || 0;
            combatState.nextTurnAtkBonus = 0;

            // Reset currentRoll variables on entities so the UI clears previous results
            player.summons.forEach(s => s.currentRoll = null);
            currentEnemies.forEach(e => e.currentRoll = null);

            // Filter out dead summons again in case they died of status/thorns
            player.summons = player.summons.filter(s => s.currentHp > 0);

            // Clean entity rolls for visual updates
            resetCoinAndDice();

            addCombatLog(`--- 第 ${combatState.turn} 回合 ---`, 'info');
            updateCombatUI();
        }
    });
}

function hasAliveEnemies() {
    return currentEnemies.some(e => e.currentHp > 0);
}

// 4. Combat Victory Actions
function triggerVictory() {
    addCombatLog(`🎉 胜利！所有敌方怪物已被消灭。`, 'info');
    
    // 在遭遇小镇事件过后，卫兵和猎手将会离开队伍
    const hasVillagers = player.summons.some(s => s.id === 'summon_town_guard' || s.id === 'summon_town_hunter');
    if (hasVillagers) {
        player.summons = player.summons.filter(s => s.id !== 'summon_town_guard' && s.id !== 'summon_town_hunter');
        addCombatLog(`👋 战斗结束，小镇卫兵与猎手离开了队伍。`, 'info');
    }
    
    // Restore player's maxHp from blizzard debuff
    if (combatState.appliedMaxHpDebuff > 0) {
        player.maxHp += combatState.appliedMaxHpDebuff;
        addCombatLog(`❄️ 【暴风雪】已离去：最大生命值上限恢复了 ${combatState.appliedMaxHpDebuff} 点！`, 'info');
    }

    // Restore player's maxHp from 假面大师 sacrifice
    if (combatState.sacrificedMaxHpTotal > 0) {
        player.maxHp += combatState.sacrificedMaxHpTotal;
        addCombatLog(`🎭 【献祭血契】效果结束：牺牲的最大生命值上限恢复了 ${combatState.sacrificedMaxHpTotal} 点！`, 'info');
        combatState.sacrificedMaxHpTotal = 0;
    }
    
    // Revert Mask Master transformation
    if (player.originalType === 'maskmaster' && player.type !== 'maskmaster') {
        if (player.type === 'dicemaster') {
            player.diceCount = Math.max(1, player.diceCount - 1);
        }
        player.type = 'maskmaster';
        addCombatLog(`🎭 战斗结束：你卸下了面具，变回了【假面大师】。`, 'info');
    }
    player.shield = 0;
    
    // Clean environmental status
    activeEnvironmentalEvent = null;
    combatState.appliedMaxHpDebuff = 0;
    
    // Gold rewards: Level 1-35 is standard, Bosses are high
    let baseGold = player.level * 2 + 5;
    if (player.level % 6 === 0) {
        baseGold = player.level * 5 + 15;
    }
    
    if (combatState.doubleGold) {
        baseGold *= 2;
        addCombatLog(`💰 伏击反击大成功！获得双倍金币奖励。`, 'info');
    }

    player.gold += baseGold;
    addCombatLog(`获得金币 🪙 ${baseGold}。当前共持有 🪙 ${player.gold}。`, 'info');

    // Register completion
    completedLevels.add(`level_${player.level}`);
    currentLocation = `level_${player.level}`;
    renderMap(currentLocation, completedLevels);

    // Disable double gold ambush flag
    combatState.mysteryAmbush = false;

    // Wait 1.5s then show double choice reward screen
    setTimeout(() => {
        startDoubleChoiceRewards();
    }, 1500);
}

// 5. Post-level Rewards Page (Double Choice)
function startDoubleChoiceRewards() {
    showActionView('reward-view');
    getEl('reward-title').textContent = `🎁 通关战利品 (关卡 ${player.level})`;
    
    // Draft Choice 1: Upgrade/Mechanism Cards
    const cards = getRandomCards(3);
    renderRewards(1, cards, (chosenCard) => {
        const standardSummonsCount = player.summons.filter(s => s.id !== 'summon_town_guard' && s.id !== 'summon_town_hunter').length;
        if (chosenCard.type === 'summon' && standardSummonsCount >= 3) {
            alert("您的召唤物数量已达上限（最多3个），无法招募新召唤物！请选择其他卡牌。");
            return;
        }
        const log = chosenCard.apply(player);
        addCombatLog(`💎 选择了卡牌：【${chosenCard.name}】。${log}`);
        
        // Transition to Choice 2: Dice customizations
        const diceUpgrades = getRandomDiceChoices();
        renderRewards(2, diceUpgrades, (chosenUpgrade) => {
            const log2 = chosenUpgrade.apply(player);
            addCombatLog(`🎲 进行了骰子调整：【${chosenUpgrade.name}】。${log2}`);
            
            // Advance game track
            advanceGameTrack();
        });
    });
}

function advanceGameTrack() {
    // If completed level 36, game is won!
    if (player.level === 36) {
        triggerGameWin();
        return;
    }

    // Go to Fork choice
    currentLocation = `fork_${player.level}`;
    renderMap(currentLocation, completedLevels);
    
    // Show Fork selection screen
    showActionView('fork-view');
}

// 6. Fork Option Router
function setupForkListeners() {
    getEl('fork-shop-btn').addEventListener('click', () => {
        enterShop();
    });
    getEl('fork-camp-btn').addEventListener('click', () => {
        enterCampfire();
    });
    getEl('fork-mystery-btn').addEventListener('click', () => {
        enterMysteryLane();
    });
}

// Shop page
let currentShopItems = [];
function enterShop() {
    showActionView('shop-view');
    currentShopItems = generateShopItems(player.level);
    renderShop(currentShopItems, player.gold, handleBuyItem);
}

function handleBuyItem(index) {
    const item = currentShopItems[index];
    if (player.gold >= item.cost) {
        const standardSummonsCount = player.summons.filter(s => s.id !== 'summon_town_guard' && s.id !== 'summon_town_hunter').length;
        if (item.type === 'summon' && standardSummonsCount >= 3) {
            alert("您的召唤物数量已达上限（最多3个），无法购买新召唤物！");
            return;
        }
        player.gold -= item.cost;
        const msg = item.apply(player);
        
        addCombatLog(`🛒 购买了【${item.name}】：${msg}`);
        
        // Remove item from shop after buying
        currentShopItems.splice(index, 1);
        renderShop(currentShopItems, player.gold, handleBuyItem);
        renderHUD(player);
    }
}

function setupShopListeners() {
    getEl('exit-shop-btn').addEventListener('click', () => {
        exitNonCombatPath();
    });
}

// Campfire page
function enterCampfire() {
    showActionView('campfire-view');
    const options = getCampfireOptions(player);
    renderCampfire(options, (opt) => {
        const msg = opt.apply(player);
        addCombatLog(`🔥 营火憩息：${msg}`);
        
        // Advance to next level directly after campfire choice
        setTimeout(() => {
            exitNonCombatPath();
        }, 1200);
    });
}

// Mystery Event page
function enterMysteryLane() {
    showActionView('mystery-view');
    const event = getRandomMysteryEvent();
    
    renderMysteryEvent(event, (choiceIndex) => {
        const choice = event.choices[choiceIndex];
        const res = choice.effect(player);
        
        if (res.isSummonLimit) {
            alert(res.log);
            return;
        }
        
        if (res.triggerCombat) {
            // Initiate ambush combat
            combatState.doubleGold = res.doubleGold;
            combatState.mysteryAmbush = true;
            activeEnvironmentalEvent = res.environmentalEvent || null;
            
            showMysteryResult(`${res.log} 准备进入迎击战斗！`, () => {
                // Ambush battle uses same level scale
                startCombatForLevel(player.level);
            });
        } else {
            showMysteryResult(res.log, () => {
                exitNonCombatPath();
            });
        }
    });
}

// Exit shop, campfire, or mystery lane and head to next level
function exitNonCombatPath() {
    const nextLevel = player.level + 1;
    currentLocation = `level_${nextLevel}`;
    completedLevels.add(`fork_${player.level}`);
    
    renderMap(currentLocation, completedLevels);
    renderHUD(player);
    
    startCombatForLevel(nextLevel);
}

// 7. Game End (Over / Win) Handlers
function triggerGameOver() {
    audio.stopBgm();
    audio.playGameOver();
    showScreen('gameover-screen');
    
    getEl('go-name').textContent = player.name;
    getEl('go-level').textContent = `${player.level} / 36`;
    getEl('go-gold').textContent = player.gold;
}

function triggerGameWin() {
    audio.stopBgm();
    audio.playGameWin();
    showScreen('win-screen');
    
    getEl('win-name').textContent = player.name;
    getEl('win-gold').textContent = player.gold;
    getEl('win-dice').textContent = `${player.diceCount}个 (${player.diceMin}-${player.diceMax})`;
    getEl('win-hp').textContent = player.maxHp;
    getEl('win-atk').textContent = player.attack;
    
    // Unlock next difficulty progression
    const difficulties = ['easy', 'normal', 'hard', 'hell'];
    const currentIdx = difficulties.indexOf(selectedDifficulty);
    maxUnlockedDifficulty = localStorage.getItem('maxUnlockedDifficulty') || 'easy';
    const maxIdx = difficulties.indexOf(maxUnlockedDifficulty);
    
    if (currentIdx === maxIdx && maxIdx < difficulties.length - 1) {
        const nextDiff = difficulties[maxIdx + 1];
        localStorage.setItem('maxUnlockedDifficulty', nextDiff);
        maxUnlockedDifficulty = nextDiff;
        alert(`🎉 恭喜通关！您已成功通关【${getDifficultyName(selectedDifficulty)}】难度，解锁了更高难度的选择：【${getDifficultyName(nextDiff)}】以及新的命运属性卡！`);
    } else if (selectedDifficulty === 'hell') {
        alert(`🏆 宿命征服！您已通关【地狱】最高难度，主宰了命运城堡！`);
    }
    
    // Mark castle as completed
    completedLevels.add('castle');
    currentLocation = 'castle';
    renderMap(currentLocation, completedLevels);
}

function setupGameOverListeners() {
    const restartGame = () => {
        // Resume BGM sequencer for the next run
        audio.startBgm();
        
        // Clear variables and switch to Selection page
        player = null;
        currentEnemies = [];
        completedLevels = new Set();
        currentLocation = 'flag';
        activeEnvironmentalEvent = null;
        combatState.sacrificedMaxHpTotal = 0;
        
        showScreen('select-screen');
        setupDifficultySelector(); // Refresh dropdown options to reflect newly unlocked states
        
        // Unselect characters
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        const startBtn = getEl('start-game-btn');
        startBtn.classList.add('disabled');
        startBtn.setAttribute('disabled', 'true');
        getEl('player-name-input').value = '';
    };

    getEl('restart-game-btn').addEventListener('click', restartGame);
    getEl('restart-win-btn').addEventListener('click', restartGame);
}

// Combat Console log outputs
function clearCombatLogs() {
    getEl('combat-log-list').innerHTML = '';
}

function addCombatLog(text, className = '') {
    const logList = getEl('combat-log-list');
    const entry = document.createElement('div');
    entry.className = `log-entry ${className}`;
    entry.textContent = text;
    logList.appendChild(entry);
    
    // Auto scroll to bottom
    logList.scrollTop = logList.scrollHeight;
}
