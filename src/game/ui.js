import { ORE_PRICES, ORE_NAMES, UPGRADE_DEFS, TILE_SIZE, SURFACE_Y, DEPTH_BONUS_MULTIPLIER } from './constants.js';
import { QUEST_TYPE_NAMES, QUEST_TYPE_ICONS, QUEST_STARS } from './quests.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.warningTimeout = null;
    this.setupShopButtons();
    this.setupTeleportButton();
    this.setupQuestPanelButtons();
  }

  setupTeleportButton() {
    document.getElementById('teleportBtn').addEventListener('click', () => {
      this.game.tryTeleport();
    });
  }

  setupQuestPanelButtons() {
    document.getElementById('closeQuestPanelBtn').addEventListener('click', () => {
      this.closeQuestPanel();
    });

    document.getElementById('refreshQuestsBtn').addEventListener('click', () => {
      this.game.questManager.generateAvailableQuests(3);
      this.updateQuestPanel();
      this.showWarning('任务列表已刷新', 1500, 'text-blue-300');
    });
  }

  setupShopButtons() {
    document.getElementById('sellAllBtn').addEventListener('click', () => {
      const maxDepth = this.game.player.maxDepth;
      const depthBonus = 1 + maxDepth * DEPTH_BONUS_MULTIPLIER;
      const result = this.game.player.sellOres(ORE_PRICES, depthBonus);
      if (result.total > 0) {
        let msg = `售出矿石获得 $${result.total}`;
        if (result.bonus > 0) {
          msg += ` (含深度加成 +$${result.bonus})`;
        }
        this.showWarning(msg, 2000, 'text-green-300');
      }
      this.updateShop();
    });

    document.getElementById('refuelBtn').addEventListener('click', () => {
      if (this.game.player.gold >= 50) {
        this.game.player.gold -= 50;
        this.game.player.fuel = this.game.player.maxFuel;
        this.updateShop();
      }
    });

    document.getElementById('refillOxygenBtn').addEventListener('click', () => {
      if (this.game.player.gold >= 30) {
        this.game.player.gold -= 30;
        this.game.player.oxygen = this.game.player.maxOxygen;
        this.updateShop();
      }
    });

    document.getElementById('coolBtn').addEventListener('click', () => {
      if (this.game.player.gold >= 20) {
        this.game.player.gold -= 20;
        this.game.player.heat = 20;
        this.updateShop();
      }
    });

    document.getElementById('repairBtn').addEventListener('click', () => {
      if (this.game.player.gold >= 40) {
        this.game.player.gold -= 40;
        this.game.player.health = this.game.player.maxHealth;
        this.updateShop();
      }
    });

    document.getElementById('closeShopBtn').addEventListener('click', () => {
      this.closeShop();
    });
  }

  updateHUD() {
    const p = this.game.player;
    const depth = Math.max(0, p.tileY - SURFACE_Y);

    this.setBar('fuel', p.fuel, p.maxFuel);
    this.setBar('oxygen', p.oxygen, p.maxOxygen);
    this.setBar('heat', p.heat, p.maxHeat);
    this.setBar('cargo', p.cargoUsed, p.maxCargo);
    this.setBar('health', p.health, p.maxHealth);

    document.getElementById('goldText').textContent = Math.floor(p.gold);
    document.getElementById('depthText').textContent = depth;

    const depthBonus = Math.floor(depth * DEPTH_BONUS_MULTIPLIER * 100);
    const bonusEl = document.getElementById('depthBonus');
    if (depthBonus > 0) {
      bonusEl.classList.remove('hidden');
      document.getElementById('depthBonusText').textContent = `+${depthBonus}%`;
    } else {
      bonusEl.classList.add('hidden');
    }

    document.getElementById('oreGold').textContent = p.cargo.gold;
    document.getElementById('oreIron').textContent = p.cargo.iron;
    document.getElementById('oreDiamond').textContent = p.cargo.diamond;
    document.getElementById('oreCoal').textContent = p.cargo.coal;
    document.getElementById('oreEmerald').textContent = p.cargo.emerald;
    document.getElementById('oreRuby').textContent = p.cargo.ruby;

    this.updateTeleportUI();
    this.updateQuestTracker();
    this.checkWarnings();
  }

  updateTeleportUI() {
    const tele = this.game.teleport;
    const p = this.game.player;
    const depth = Math.max(0, p.tileY - SURFACE_Y);
    const cost = tele.calculateCost(depth);

    const btn = document.getElementById('teleportBtn');
    const costEl = document.getElementById('teleportCost');
    const progressWrap = document.getElementById('teleportProgressWrap');
    const progressBar = document.getElementById('teleportProgressBar');
    const cooldownEl = document.getElementById('teleportCooldown');
    const cooldownText = document.getElementById('teleportCooldownText');

    costEl.textContent = `$${cost}`;

    if (depth < 2) {
      btn.style.opacity = '0.4';
      btn.style.cursor = 'not-allowed';
      costEl.textContent = '已在地面';
    } else {
      btn.style.opacity = p.gold >= cost ? '1' : '0.6';
      btn.style.cursor = 'pointer';
    }

    if (tele.isTeleporting()) {
      progressWrap.classList.remove('hidden');
      progressBar.style.width = tele.getProgressPercent() + '%';
      btn.classList.add('hidden');
      cooldownEl.classList.add('hidden');
    } else {
      progressWrap.classList.add('hidden');
      btn.classList.remove('hidden');

      const cooldown = tele.getCooldownPercent();
      if (cooldown > 0) {
        cooldownEl.classList.remove('hidden');
        cooldownText.textContent = Math.ceil((cooldown / 100) * 5) + 's';
        btn.style.opacity = '0.4';
      } else {
        cooldownEl.classList.add('hidden');
      }
    }
  }

  setBar(name, value, max) {
    const bar = document.getElementById(name + 'Bar');
    const text = document.getElementById(name + 'Text');
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    bar.style.width = pct + '%';
    text.textContent = `${Math.floor(value)}/${Math.floor(max)}`;
  }

  checkWarnings() {
    const p = this.game.player;
    const warnings = [];

    if (p.fuel < p.maxFuel * 0.15) warnings.push('⚠️ 燃料不足！');
    if (p.oxygen < p.maxOxygen * 0.15) warnings.push('⚠️ 氧气不足！');
    if (p.heat > p.maxHeat * 0.8) warnings.push('⚠️ 温度过高！');
    if (p.health < p.maxHealth * 0.2) warnings.push('⚠️ 机身受损严重！');
    if (p.cargoUsed >= p.maxCargo) warnings.push('📦 货仓已满！');

    const msg = warnings.join('  ');
    if (msg && !this.warningTimeout) {
      this.showWarning(msg, 2000);
    }
  }

  showWarning(text, duration = 2000, colorClass = 'text-red-200') {
    const el = document.getElementById('warningMessage');
    const textEl = document.getElementById('warningText');
    textEl.textContent = text;
    textEl.className = `font-game text-lg ${colorClass}`;
    el.classList.remove('hidden');

    if (this.warningTimeout) clearTimeout(this.warningTimeout);
    this.warningTimeout = setTimeout(() => {
      el.classList.add('hidden');
      this.warningTimeout = null;
    }, duration);
  }

  openShop() {
    if (!this.game.player.isOnSurface()) {
      this.showWarning('需要返回地面才能打开商店！', 1500);
      return false;
    }
    this.updateShop();
    document.getElementById('shopMenu').classList.remove('hidden');
    document.getElementById('shopMenu').classList.add('flex');
    this.game.paused = true;
    return true;
  }

  closeShop() {
    document.getElementById('shopMenu').classList.add('hidden');
    document.getElementById('shopMenu').classList.remove('flex');
    this.game.paused = false;
  }

  isShopOpen() {
    return !document.getElementById('shopMenu').classList.contains('hidden');
  }

  updateShop() {
    const p = this.game.player;
    document.getElementById('shopGold').textContent = Math.floor(p.gold);

    const sellArea = document.getElementById('sellArea');
    sellArea.innerHTML = '';
    for (const [type, count] of Object.entries(p.cargo)) {
      if (count > 0) {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center text-gray-300';
        div.innerHTML = `
          <span>${this.getOreIcon(type)} ${ORE_NAMES[type]} x${count}</span>
          <span class="text-yellow-400">$${count * ORE_PRICES[type]}</span>
        `;
        sellArea.appendChild(div);
      }
    }
    if (sellArea.children.length === 0) {
      sellArea.innerHTML = '<div class="text-gray-500 text-center py-2">货仓为空</div>';
    }

    const upgradeArea = document.getElementById('upgradeArea');
    upgradeArea.innerHTML = '';
    for (const [key, def] of Object.entries(UPGRADE_DEFS)) {
      const level = p.upgrades[key];
      const cost = p.getUpgradeCost(key);
      const isMaxed = cost === null;
      const canAfford = !isMaxed && p.gold >= cost;

      const div = document.createElement('div');
      div.className = 'bg-black/30 rounded p-3 border border-yellow-900';
      div.innerHTML = `
        <div class="flex justify-between items-center mb-1">
          <span class="text-yellow-300 font-bold">${def.icon} ${def.name}</span>
          <span class="text-xs text-gray-400">Lv.${level}/${def.maxLevel}</span>
        </div>
        <div class="text-xs text-gray-400 mb-2">${def.description}</div>
        <button class="w-full py-1 px-2 rounded text-xs font-bold transition-all ${
          isMaxed ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
          canAfford ? 'bg-yellow-700 hover:bg-yellow-600 text-white border border-yellow-500' :
          'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
        }" ${isMaxed || !canAfford ? 'disabled' : `data-upgrade="${key}"`}>
          ${isMaxed ? '已满级' : `$${cost}`}
        </button>
      `;
      upgradeArea.appendChild(div);
    }

    upgradeArea.querySelectorAll('button[data-upgrade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.upgrade;
        if (p.buyUpgrade(type)) {
          this.updateShop();
        }
      });
    });
  }

  getOreIcon(type) {
    const icons = {
      coal: '⬛',
      iron: '🔩',
      gold: '🪙',
      emerald: '💚',
      ruby: '❤️',
      diamond: '💎'
    };
    return icons[type] || '🪨';
  }

  showGameOver(stats) {
    const screen = document.getElementById('gameOverScreen');
    const statsEl = document.getElementById('gameOverStats');
    statsEl.innerHTML = `
      <div>💰 最终金币: ${Math.floor(stats.gold)}</div>
      <div>📍 最深深度: ${stats.maxDepth}m</div>
      <div>⚔️ 击杀敌人: ${stats.enemiesKilled || 0}</div>
      <div>🪨 挖掘方块: ${stats.blocksDug || 0}</div>
    `;
    screen.classList.remove('hidden');
    screen.classList.add('flex');
  }

  hideGameOver() {
    const screen = document.getElementById('gameOverScreen');
    screen.classList.add('hidden');
    screen.classList.remove('flex');
  }

  showHUD() {
    document.getElementById('hud').classList.remove('hidden');
  }

  hideHUD() {
    document.getElementById('hud').classList.add('hidden');
  }

  updateQuestTracker() {
    const quests = this.game.questManager.getActiveQuests();
    const tracker = document.getElementById('questTracker');
    const countEl = document.getElementById('activeQuestCount');
    const listEl = document.getElementById('questTrackerList');

    if (quests.length === 0) {
      tracker.classList.add('hidden');
      return;
    }

    tracker.classList.remove('hidden');
    countEl.textContent = quests.length;

    listEl.innerHTML = '';
    const displayQuests = quests.slice(0, 3);

    for (const quest of displayQuests) {
      const div = document.createElement('div');
      div.className = 'bg-black/40 rounded p-2 border border-amber-800/50';

      const starData = QUEST_STARS[quest.stars];
      const timeText = quest.timeLimit > 0
        ? `<span class="text-orange-400">⏱ ${this.game.questManager.formatTime(quest.timeRemaining)}</span>`
        : '';

      div.innerHTML = `
        <div class="flex justify-between items-start mb-1">
          <span class="text-amber-300 font-bold text-xs">${QUEST_TYPE_ICONS[quest.type]} ${quest.title}</span>
        </div>
        <div class="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
          <div class="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all" style="width: ${quest.progress}%"></div>
        </div>
        <div class="flex justify-between text-xs text-gray-400">
          <span>进度: ${Math.floor(quest.progress)}%</span>
          ${timeText}
        </div>
      `;

      listEl.appendChild(div);
    }

    if (quests.length > 3) {
      const moreDiv = document.createElement('div');
      moreDiv.className = 'text-center text-gray-500 text-xs';
      moreDiv.textContent = `还有 ${quests.length - 3} 个任务...`;
      listEl.appendChild(moreDiv);
    }
  }

  openQuestPanel() {
    if (!this.game.player.isOnSurface()) {
      this.showWarning('需要返回地面才能打开任务面板！', 1500);
      return false;
    }

    this.updateQuestPanel();
    document.getElementById('questPanel').classList.remove('hidden');
    document.getElementById('questPanel').classList.add('flex');
    this.game.paused = true;
    return true;
  }

  closeQuestPanel() {
    document.getElementById('questPanel').classList.add('hidden');
    document.getElementById('questPanel').classList.remove('flex');
    this.game.paused = false;
  }

  isQuestPanelOpen() {
    return !document.getElementById('questPanel').classList.contains('hidden');
  }

  updateQuestPanel() {
    const qm = this.game.questManager;
    const p = this.game.player;

    document.getElementById('questPanelGold').textContent = Math.floor(p.gold);
    document.getElementById('questPlayerLevel').textContent = qm.playerLevel;
    document.getElementById('totalCompletedQuests').textContent = qm.totalCompleted;
    document.getElementById('activeQuestCountPanel').textContent = qm.activeQuests.length;

    this.updateAvailableQuestsList();
    this.updateActiveQuestsList();
  }

  updateAvailableQuestsList() {
    const qm = this.game.questManager;
    const listEl = document.getElementById('availableQuestsList');
    const quests = qm.getAvailableQuests();

    listEl.innerHTML = '';

    if (quests.length === 0) {
      listEl.innerHTML = '<div class="text-gray-500 text-center py-4">暂无可用任务，点击刷新按钮获取新任务</div>';
      return;
    }

    for (const quest of quests) {
      const div = this.createQuestCard(quest, 'available');
      listEl.appendChild(div);
    }
  }

  updateActiveQuestsList() {
    const qm = this.game.questManager;
    const listEl = document.getElementById('activeQuestsList');
    const quests = qm.getActiveQuests();

    listEl.innerHTML = '';

    if (quests.length === 0) {
      listEl.innerHTML = '<div class="text-gray-500 text-center py-4">暂无进行中的任务</div>';
      return;
    }

    for (const quest of quests) {
      const div = this.createQuestCard(quest, 'active');
      listEl.appendChild(div);
    }
  }

  createQuestCard(quest, mode) {
    const div = document.createElement('div');
    div.className = 'bg-black/50 rounded-lg p-3 border-2 transition-all hover:border-amber-500/50';

    const starData = QUEST_STARS[quest.stars];
    const stars = '⭐'.repeat(quest.stars);

    let progressInfo = '';
    let actionButton = '';

    if (mode === 'available') {
      const canAccept = this.game.questManager.activeQuests.length < 5;
      actionButton = `
        <button class="w-full mt-2 py-1.5 px-3 rounded text-xs font-bold transition-all ${
          canAccept
            ? 'bg-green-700 hover:bg-green-600 text-white border border-green-500'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600'
        }" ${canAccept ? `data-accept="${quest.id}"` : 'disabled'}>
          📥 接受任务
        </button>
      `;
    } else {
      const progressText = this.getQuestProgressText(quest);
      const timeText = quest.timeLimit > 0
        ? `<div class="text-orange-400 text-xs mt-1">⏱ 剩余时间: ${this.game.questManager.formatTime(quest.timeRemaining)}</div>`
        : '';

      progressInfo = `
        <div class="mt-2">
          <div class="flex justify-between text-xs text-gray-400 mb-1">
            <span>进度</span>
            <span>${Math.floor(quest.progress)}%</span>
          </div>
          <div class="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all" style="width: ${quest.progress}%"></div>
          </div>
          <div class="text-xs text-gray-400 mt-1">${progressText}</div>
          ${timeText}
        </div>
      `;

      actionButton = `
        <button class="w-full mt-2 py-1.5 px-3 rounded text-xs font-bold bg-red-800 hover:bg-red-700 text-white border border-red-600 transition-all" data-abandon="${quest.id}">
          ❌ 放弃任务
        </button>
      `;
    }

    div.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <div>
          <div class="text-amber-300 font-bold text-sm">${QUEST_TYPE_ICONS[quest.type]} ${quest.title}</div>
          <div class="text-gray-400 text-xs">${QUEST_TYPE_NAMES[quest.type]} ${quest.chainId ? '📿 任务链' : ''}</div>
        </div>
        <div class="text-right">
          <div class="text-yellow-400 text-sm font-bold">💰 $${quest.reward}</div>
          <div class="text-xs" style="color: ${starData.color}">${stars}</div>
        </div>
      </div>
      <div class="text-gray-300 text-xs leading-relaxed">${quest.description}</div>
      ${progressInfo}
      ${actionButton}
    `;

    if (mode === 'available') {
      const acceptBtn = div.querySelector('[data-accept]');
      if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
          const result = this.game.questManager.acceptQuest(quest.id);
          if (result.success) {
            this.showWarning(`✅ 已接受任务: ${quest.title}`, 2000, 'text-green-400');
            this.game.npcManager.showGreetingDialog();
          } else {
            this.showWarning(`❌ ${result.reason}`, 2000, 'text-red-400');
          }
          this.updateQuestPanel();
        });
      }
    } else {
      const abandonBtn = div.querySelector('[data-abandon]');
      if (abandonBtn) {
        abandonBtn.addEventListener('click', () => {
          const result = this.game.questManager.abandonQuest(quest.id);
          if (result.success) {
            this.showWarning(`已放弃任务: ${quest.title}`, 1500, 'text-yellow-400');
          }
          this.updateQuestPanel();
        });
      }
    }

    return div;
  }

  getQuestProgressText(quest) {
    return this.game.questManager.getProgressText(quest);
  }
}
