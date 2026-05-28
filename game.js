// game.js

import { Player, generateMonstersForLevel, Monster } from './entities.js';
import { getRandomCards, getRandomDiceChoices, generateShopItems, getCampfireOptions, getRandomMysteryEvent } from './cards.js';
import { getEl, renderMap, renderHUD, renderCombat, animateCoinFlip, animateDiceRoll, resetCoinAndDice, renderRewards, renderShop, renderCampfire, renderMysteryEvent, showMysteryResult } from './render.js';
import { audio } from './audio.js';

// Game State variables
let player = null;
let currentEnemies = [];
let completedLevels = new Set();
let currentLocation = 'flag'; // 'flag', 'level_1', 'fork_1', 'level_2', ...
let combatState = {
    turn: 1,
    hasRolled: false,
    hasPlayerRolled: false,
    hasEnemyRolled: false,
    coinResult: null,
    diceValues: null,
    maxDiceValue: 0,
    turnDamageCalculated: null,
    activeTargetIndex: null,
    isPlayerTurn: true,
    doubleGold: false,
    mysteryAmbush: false,
    headsStreak: 0,
    tailsStreak: 0
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
    
    // Reset Combat States
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

    addCombatLog(`⚔️ 战斗开始！你进入了第 ${level} 关。`, 'important');
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

function updateCombatUI() {
    renderHUD(player);
    renderCombat(player, currentEnemies, combatState.activeTargetIndex, handleTargetSelection);
    
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
            s.calculateClashPoints(sCoin, sMaxVal);
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
                const dmgCalc = player.calculateTurnDamage(coin, maxVal);
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
            e.calculateClashPoints(eCoin, eMaxVal);
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

        // 1. Player Clashes with ALL alive monsters
        currentEnemies.forEach(enemy => {
            if (enemy.currentHp <= 0) return;

            const enemyPoints = enemy.currentRoll.clashPoints;
            addCombatLog(`⚔️ 【对比】你 (⚔️${playerPoints}点) vs ${enemy.name} (⚔️${enemyPoints}点)`);

            if (playerPoints > enemyPoints) {
                // Player wins!
                const dmgResult = enemy.takeDamage(playerPoints);
                if (dmgResult.dodged) {
                    addCombatLog(` 💨 ${enemy.name} 闪避了你的攻击！`, 'info');
                } else {
                    addCombatLog(` 💥 拼点获胜！你对 ${enemy.name} 造成了 ${dmgResult.damageDealt} 点伤害。`, 'damage-enemy');
                    if (dmgResult.thornsDamage > 0) {
                        player.takeDamage(dmgResult.thornsDamage);
                        addCombatLog(`   🌵 受到荆棘反伤！你失去了 ${dmgResult.thornsDamage} 点生命值。`, 'damage-player');
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
                    // Reduce next attack damage
                    player.halvedDamageNextTurn = true;
                }
            } else {
                // Draw
                addCombatLog(` 🤝 双方势均力敌，未造成伤害。`);
            }
        });

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

            // Reset round states
            combatState.turn += 1;
            combatState.hasRolled = false;
            combatState.hasPlayerRolled = false;
            combatState.hasEnemyRolled = false;
            combatState.coinResult = null;
            combatState.diceValues = null;
            combatState.maxDiceValue = 0;
            combatState.turnDamageCalculated = null;
            combatState.activeTargetIndex = null;

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
        
        if (res.triggerCombat) {
            // Initiate ambush combat
            combatState.doubleGold = res.doubleGold;
            combatState.mysteryAmbush = true;
            
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
        
        showScreen('select-screen');
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
