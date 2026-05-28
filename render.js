// render.js

import { CARD_GRADES } from './cards.js';

// DOM Element Helpers
export function getEl(id) {
    return document.getElementById(id);
}

// 1. Render Map Progression
export function renderMap(currentLocationId, completedLevels) {
    const track = getEl('map-track');
    track.innerHTML = '';

    // Nodes are: Flag (Start) -> Level 1 -> Fork 1 -> Level 2 -> Fork 2 -> ... -> Level 36 -> Castle
    // We represent locations with unique IDs:
    // 'flag', 'level_1', 'fork_1', 'level_2', 'fork_2', ..., 'level_36', 'castle'
    
    // Create Start Flag Node
    const flagNode = createMapNode('flag', '🚩', '起点', currentLocationId, completedLevels);
    track.appendChild(flagNode);

    for (let lvl = 1; lvl <= 36; lvl++) {
        // Connector
        track.appendChild(createConnector(currentLocationId, completedLevels, `level_${lvl}`));
        
        // Level Node
        const isBoss = lvl % 6 === 0;
        const nodeChar = isBoss ? '👹' : `${lvl}`;
        const nodeLabel = isBoss ? `Boss ${lvl/6}` : `关卡 ${lvl}`;
        const lvlNode = createMapNode(`level_${lvl}`, nodeChar, nodeLabel, currentLocationId, completedLevels, isBoss);
        track.appendChild(lvlNode);

        // If not level 36, append a Fork Node
        if (lvl < 36) {
            track.appendChild(createConnector(currentLocationId, completedLevels, `fork_${lvl}`));
            const forkNode = createMapNode(`fork_${lvl}`, '🛣️', `岔口 ${lvl}`, currentLocationId, completedLevels, false, true);
            track.appendChild(forkNode);
        }
    }

    // Castle Connector & Node at the end
    track.appendChild(createConnector(currentLocationId, completedLevels, 'castle'));
    const castleNode = createMapNode('castle', '🏰', '终点城堡', currentLocationId, completedLevels);
    track.appendChild(castleNode);

    // Scroll active node into view
    setTimeout(() => {
        const activeNode = track.querySelector('.map-node.active');
        if (activeNode) {
            activeNode.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, 100);
}

function createMapNode(id, character, label, currentId, completedSet, isBoss = false, isFork = false) {
    const node = document.createElement('div');
    node.className = 'map-node';
    node.id = `map-node-${id}`;

    // Add extra class lists
    if (isBoss) node.classList.add('boss-node');
    if (isFork) node.classList.add('fork-node');

    // Status classes
    if (currentId === id) {
        node.classList.add('active');
    } else if (completedSet.has(id) || isCompletedBefore(id, currentId)) {
        node.classList.add('completed');
    } else {
        node.classList.add('future');
    }

    node.innerHTML = `
        ${character}
        <span class="map-node-label">${label}</span>
    `;

    return node;
}

function createConnector(currentId, completedSet, nextNodeId) {
    const conn = document.createElement('div');
    conn.className = 'map-connector';

    if (completedSet.has(nextNodeId) || isCompletedBefore(nextNodeId, currentId)) {
        conn.classList.add('completed');
    } else if (currentId === nextNodeId) {
        conn.classList.add('active');
    }

    return conn;
}

// Simple sequence checker to see if a node is completed
function isCompletedBefore(targetId, currentId) {
    if (targetId === 'flag') return true;
    if (currentId === 'flag') return false;

    const parseNode = (id) => {
        if (id === 'castle') return 999;
        const pts = id.split('_');
        const num = parseInt(pts[1]);
        const isFork = pts[0] === 'fork';
        return num * 2 + (isFork ? 1 : 0); // Level 1 -> 2, Fork 1 -> 3, Level 2 -> 4 ...
    };

    return parseNode(targetId) < parseNode(currentId);
}

// 2. Render HUD details
export function renderHUD(player) {
    getEl('hud-name').textContent = player.name;
    getEl('hud-class').textContent = player.getDefaultName(player.type);
    
    // HP Bar
    const hpPct = Math.max(0, (player.currentHp / player.maxHp) * 100);
    getEl('hud-hp-bar').style.width = `${hpPct}%`;
    getEl('hud-hp-text').textContent = `${player.currentHp} / ${player.maxHp}`;
    if (player.currentHp <= player.maxHp * 0.25) {
        getEl('hud-hp-bar').style.background = 'linear-gradient(90deg, #ef4444, #b91c1c)'; // critical Red
    } else {
        getEl('hud-hp-bar').style.background = 'linear-gradient(90deg, #ef4444, #f43f5e)';
    }

    getEl('hud-atk').textContent = player.attack;
    getEl('hud-gold').textContent = player.gold;
    getEl('hud-dice-desc').textContent = `${player.diceCount}个 (${player.diceMin}-${player.diceMax})`;
    getEl('hud-level').textContent = `${player.level} / 36`;

    // Summons
    const summonsEl = getEl('hud-summons-list');
    if (player.summons.length === 0) {
        summonsEl.textContent = '无';
    } else {
        summonsEl.textContent = player.summons.map(s => `${s.name} (${s.currentHp} HP)`).join(', ');
    }
}

// 3. Render Combat Screen
export function renderCombat(player, enemies, activeTargetIndex, onTargetSelect) {
    // Stage Tag
    getEl('combat-stage-tag').textContent = `第 ${player.level} 关 - ${enemies[0].isBoss ? '领主首领' : '普通怪物'}`;

    // Player Card
    getEl('player-combat-name').textContent = player.name;
    const playerHpPct = Math.max(0, (player.currentHp / player.maxHp) * 100);
    getEl('combat-player-hp-bar').style.width = `${playerHpPct}%`;
    getEl('combat-player-hp-text').textContent = `${player.currentHp} / ${player.maxHp}`;
    getEl('combat-player-atk').textContent = player.attack;
    getEl('combat-player-dice').textContent = `${player.diceCount}个 (${player.diceMin}-${player.diceMax})`;

    // Toggle Mage Form button visibility
    const mageToggle = getEl('mage-toggle-container');
    if (player.type === 'mage') {
        mageToggle.classList.remove('hidden');
        getEl('mage-current-form').textContent = player.mageForm === 'light' ? '光形态 (正面加成)' : '暗形态 (倒转利弊)';
    } else {
        mageToggle.classList.add('hidden');
    }

    // Player Buffs
    const playerBuffsEl = getEl('player-buffs');
    playerBuffsEl.innerHTML = '';
    if (player.halvedDamageNextTurn) {
        playerBuffsEl.innerHTML += `<span class="buff-badge" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: #f87171;">虚弱：伤害减半</span>`;
    }
    player.mechanisms.forEach(mech => {
        playerBuffsEl.innerHTML += `<span class="buff-badge">🛡️ ${mech.name}</span>`;
    });

    // Summons
    const summonsContainer = getEl('combat-summons-container');
    summonsContainer.innerHTML = '';
    if (player.summons.length === 0) {
        summonsContainer.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted);">暂无召唤物</p>';
    } else {
        player.summons.forEach(s => {
            const card = document.createElement('div');
            card.className = 'summon-card';
            const hpPct = Math.max(0, (s.currentHp / s.maxHp) * 100);
            
            let rollInfoHtml = '';
            if (s.currentRoll) {
                const coinText = s.currentRoll.coinResult === 'heads' ? '正面🪙' : '反面🪙';
                rollInfoHtml = `<div style="font-size:0.75rem; color:var(--accent-color); margin-top:2px;">投掷: ${coinText} ➔ ⚔️${s.currentRoll.clashPoints}点</div>`;
            }

            card.innerHTML = `
                <div style="font-size: 1.5rem;">🐾</div>
                <div class="summon-details">
                    <div class="summon-header">
                        <span>${s.name} (⚔️${s.attack})</span>
                        <span>${s.currentHp}/${s.maxHp}</span>
                    </div>
                    <div class="summon-hp-bar">
                        <div class="summon-hp-fill" style="width: ${hpPct}%;"></div>
                    </div>
                    ${rollInfoHtml}
                </div>
            `;
            summonsContainer.appendChild(card);
        });
    }

    // Enemies
    const enemiesContainer = getEl('combat-enemies-container');
    enemiesContainer.innerHTML = '';
    
    enemies.forEach((enemy, index) => {
        const card = document.createElement('div');
        card.className = 'combat-entity-card';
        if (enemy.currentHp <= 0) {
            card.style.opacity = '0.3';
            card.style.pointerEvents = 'none';
        } else {
            // Apply clickable/active target classes & click listeners
            if (activeTargetIndex === index) {
                card.classList.add('active-target');
            } else {
                card.classList.add('clickable-target');
            }
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => onTargetSelect(index));
        }

        // Attack & HP info
        const enemyHpPct = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);
        
        // Mechanisms badges
        let mechanismsHtml = '';
        enemy.mechanisms.forEach(mech => {
            mechanismsHtml += `<span class="buff-badge">${mech.name}</span>`;
        });

        if (enemy.shield > 0) {
            mechanismsHtml += `<span class="buff-badge shield-badge">🛡️ 护盾 ${enemy.shield}</span>`;
        }

        // Show roll results if available
        if (enemy.currentRoll) {
            const coinText = enemy.currentRoll.coinResult === 'heads' ? '正面🪙' : '反面🪙';
            mechanismsHtml += `<span class="buff-badge" style="background: rgba(234, 179, 8, 0.15); border-color: rgba(234, 179, 8, 0.3); color: var(--accent-color);">投掷: ${coinText} ➔ ⚔️${enemy.currentRoll.clashPoints}点</span>`;
        }

        const avatar = enemy.isBoss ? '👿' : '👾';

        card.innerHTML = `
            <div class="entity-avatar">${avatar}</div>
            <h3>${enemy.name}</h3>
            <div class="entity-hp-container">
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${enemyHpPct}%; background: linear-gradient(90deg, #db2777, #9333ea);"></div>
                    <span class="progress-text">${enemy.currentHp} / ${enemy.maxHp}</span>
                </div>
            </div>
            <div class="entity-stats">
                <span>⚔️ 攻击: ${enemy.calculateAttackDamage()}</span>
            </div>
            <div class="entity-buffs">
                ${mechanismsHtml}
            </div>
        `;

        enemiesContainer.appendChild(card);
    });
}

// 4. Flip Coin Animation
export function animateCoinFlip(result, callback) {
    const coin = getEl('coin');
    
    // Clear existing animation classes
    coin.classList.remove('flipping-heads', 'flipping-tails');
    void coin.offsetWidth; // Trigger reflow to restart animation

    // Apply animation
    const animClass = result === 'heads' ? 'flipping-heads' : 'flipping-tails';
    coin.classList.add(animClass);

    // Wait for animation to finish (1.2s)
    setTimeout(() => {
        callback();
    }, 1200);
}

// 5. Roll Dice Animation
export function animateDiceRoll(values, min, max, callback) {
    const container = getEl('dice-container');
    container.innerHTML = '';

    // Create the physical die elements
    const diceElements = values.map(() => {
        const die = document.createElement('div');
        die.className = 'die rolling';
        die.textContent = '?';
        container.appendChild(die);
        return die;
    });

    // Rapid randomization interval to simulate spinning
    const interval = setInterval(() => {
        diceElements.forEach(die => {
            die.textContent = Math.floor(Math.random() * (max - min + 1)) + min;
        });
    }, 80);

    // End after 800ms
    setTimeout(() => {
        clearInterval(interval);
        diceElements.forEach((die, index) => {
            die.classList.remove('rolling');
            die.textContent = values[index];
            
            // Add neat transition pop
            die.style.transform = 'scale(1.1)';
            setTimeout(() => {
                die.style.transform = 'scale(1)';
            }, 150);
        });
        
        if (callback) callback();
    }, 800);
}

// Clear coin and dice visual state
export function resetCoinAndDice() {
    const coin = getEl('coin');
    coin.classList.remove('flipping-heads', 'flipping-tails');
    coin.style.transform = '';
    
    const container = getEl('dice-container');
    container.innerHTML = '<span style="color:var(--text-muted); font-size:0.9rem;">等待投掷...</span>';
}

// 6. Post-Level Double Choice Rewards
export function renderRewards(phase, choices, onChoiceSelected) {
    if (phase === 1) {
        getEl('reward-phase1').classList.remove('hidden');
        getEl('reward-phase2').classList.add('hidden');
        
        const container = getEl('card-rewards-container');
        container.innerHTML = '';

        choices.forEach(card => {
            const cardEl = document.createElement('div');
            const gradeInfo = CARD_GRADES[card.grade];
            cardEl.className = `reward-card card-grade-${card.grade.toLowerCase()}`;
            
            cardEl.innerHTML = `
                <div class="card-grade-tag">${card.grade}级</div>
                <div class="card-type-tag">${card.type === 'mechanism' ? '机制被动' : (card.type === 'summon' ? '召唤随从' : '属性提升')}</div>
                <h4>${card.name}</h4>
                <p>${card.desc}</p>
            `;

            cardEl.addEventListener('click', () => onChoiceSelected(card));
            container.appendChild(cardEl);
        });
    } else {
        getEl('reward-phase1').classList.add('hidden');
        getEl('reward-phase2').classList.remove('hidden');

        const container = getEl('dice-rewards-container');
        container.innerHTML = '';

        choices.forEach(upgrade => {
            const cardEl = document.createElement('div');
            cardEl.className = 'dice-choice-card';
            
            cardEl.innerHTML = `
                <h4>${upgrade.name}</h4>
                <p>${upgrade.desc}</p>
            `;

            cardEl.addEventListener('click', () => onChoiceSelected(upgrade));
            container.appendChild(cardEl);
        });
    }
}

// 7. Shop Render
export function renderShop(items, playerGold, onBuyItem) {
    getEl('shop-player-gold').textContent = playerGold;
    
    const container = getEl('shop-items-container');
    container.innerHTML = '';

    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'shop-item-card';

        // Styling based on quality 1 to 5
        let borderColor = 'rgba(255,255,255,0.05)';
        if (item.quality === 2) borderColor = 'rgba(59, 130, 246, 0.3)';
        else if (item.quality === 3) borderColor = 'rgba(168, 85, 247, 0.4)';
        else if (item.quality === 4) borderColor = 'rgba(234, 179, 8, 0.5)';
        else if (item.quality === 5) borderColor = 'rgba(239, 68, 68, 0.6)';

        card.style.borderColor = borderColor;

        const isAffordable = playerGold >= item.cost;

        card.innerHTML = `
            <div class="shop-item-quality">品质 ${item.quality}</div>
            <h4 style="color:${item.quality >= 4 ? 'var(--accent-color)' : 'white'};">${item.name}</h4>
            <p>${item.desc}</p>
            <button class="btn shop-item-buy ${isAffordable ? 'primary-btn' : 'secondary-btn disabled'}" ${isAffordable ? '' : 'disabled'}>
                ${item.cost} 金币
            </button>
        `;

        const buyBtn = card.querySelector('.shop-item-buy');
        buyBtn.addEventListener('click', () => onBuyItem(index));

        container.appendChild(card);
    });
}

// 8. Campfire Render
export function renderCampfire(options, onSelectOption) {
    const container = getEl('campfire-options-container');
    container.innerHTML = '';

    options.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'camp-option-card';
        
        card.innerHTML = `
            <h4>${opt.name}</h4>
            <p>${opt.desc}</p>
        `;

        card.addEventListener('click', () => onSelectOption(opt));
        container.appendChild(card);
    });
}

// 9. Mystery Lane Render
export function renderMysteryEvent(event, onSelectChoice) {
    getEl('mystery-event-title').textContent = `🌀 旋行道事件：${event.name}`;
    getEl('mystery-desc').textContent = event.desc;
    
    // Hide results panel first
    getEl('mystery-results-container').classList.add('hidden');
    
    const container = getEl('mystery-choices-container');
    container.innerHTML = '';
    container.classList.remove('hidden');

    event.choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'mystery-choice-btn';
        btn.textContent = choice.text;
        btn.addEventListener('click', () => onSelectChoice(index));
        container.appendChild(btn);
    });
}

export function showMysteryResult(text, onFinish) {
    getEl('mystery-choices-container').classList.add('hidden');
    const resultsContainer = getEl('mystery-results-container');
    resultsContainer.classList.remove('hidden');
    
    getEl('mystery-result-text').textContent = text;
    
    const exitBtn = getEl('exit-mystery-btn');
    // Recreate to clear previous event listeners
    const newExitBtn = exitBtn.cloneNode(true);
    exitBtn.replaceWith(newExitBtn);
    newExitBtn.addEventListener('click', onFinish);
}
