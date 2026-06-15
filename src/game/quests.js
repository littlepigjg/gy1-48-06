import {
  QUEST_TYPES,
  QUEST_STARS,
  QUEST_TYPE_NAMES,
  QUEST_TYPE_ICONS,
  ORE_NAMES_CN,
  ENEMY_NAMES_CN,
  STRUCTURE_NAMES_CN,
  getBaseReward,
  getTimeLimit,
  getTarget,
  generateTitle,
  generateDescription
} from './questTypes.js';
import { QuestProgressTracker } from './QuestProgressTracker.js';
import { EscortNPC } from './EscortNPC.js';
import { TILE_SIZE, SURFACE_Y, ORE_NAMES } from './constants.js';

export {
  QUEST_TYPES,
  QUEST_STARS,
  QUEST_TYPE_NAMES,
  QUEST_TYPE_ICONS
};

export class QuestManager {
  constructor(game) {
    this.game = game;
    this.activeQuests = [];
    this.completedQuests = [];
    this.availableQuests = [];
    this.failedQuests = [];
    this.maxActiveQuests = 5;
    this.questChains = {};
    this.playerLevel = 1;
    this.totalCompleted = 0;
    this.progressTracker = new QuestProgressTracker(game);
    this.escortNPCs = [];
  }

  calculatePlayerLevel() {
    const level = Math.floor(this.totalCompleted / 5) + 1;
    this.playerLevel = Math.min(10, level);
    return this.playerLevel;
  }

  generateAvailableQuests(count = 3) {
    this.availableQuests = this.availableQuests.filter(q => q.chainId);
    const level = this.calculatePlayerLevel();

    for (let i = 0; i < count; i++) {
      const quest = this.generateQuest(level);
      if (quest) {
        this.availableQuests.push(quest);
      }
    }

    return this.availableQuests;
  }

  generateQuest(playerLevel) {
    const types = Object.values(QUEST_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];

    const minStars = Math.max(1, Math.min(3, playerLevel - 1));
    const maxStars = Math.min(5, playerLevel + 1);
    const stars = minStars + Math.floor(Math.random() * (maxStars - minStars + 1));

    const starData = QUEST_STARS[stars];
    const baseReward = getBaseReward(type, stars);
    const reward = Math.floor(baseReward * starData.rewardMultiplier);
    const timeLimit = getTimeLimit(type, stars);
    const target = getTarget(type, stars);

    const quest = {
      id: 'quest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: type,
      stars: stars,
      title: generateTitle(type, stars),
      description: generateDescription(type, target),
      reward: reward,
      timeLimit: timeLimit,
      timeRemaining: timeLimit,
      progress: 0,
      target: target,
      status: 'available',
      chainId: null,
      chainOrder: 0,
      acceptedAt: null,
      completedAt: null
    };

    return this._initializeQuestFields(quest);
  }

  _initializeQuestFields(quest) {
    switch (quest.type) {
      case QUEST_TYPES.COLLECT:
        quest.collected = 0;
        break;
      case QUEST_TYPES.CLEAR:
        quest.killed = 0;
        quest._killsBeforeAccept = 0;
        break;
      case QUEST_TYPES.BUILD:
        quest.built = false;
        break;
      case QUEST_TYPES.ESCORT:
        quest.escortProgress = 0;
        quest._escortActive = false;
        quest._escortNPC = null;
        break;
    }
    return quest;
  }

  acceptQuest(questId) {
    if (this.activeQuests.length >= this.maxActiveQuests) {
      return { success: false, reason: '已达最大任务数量（5个）' };
    }

    const questIndex = this.availableQuests.findIndex(q => q.id === questId);
    if (questIndex === -1) {
      return { success: false, reason: '任务不存在' };
    }

    const quest = this.availableQuests.splice(questIndex, 1)[0];
    quest.status = 'active';
    quest.acceptedAt = Date.now();
    quest.timeRemaining = quest.timeLimit;

    this.progressTracker.trackQuest(quest);
    this.activeQuests.push(quest);

    if (quest.type === QUEST_TYPES.ESCORT) {
      this._spawnEscortNPC(quest);
    }

    if (this.progressTracker.checkCompletion(quest)) {
      setTimeout(() => this.completeQuest(quest.id), 100);
    }

    return { success: true, quest };
  }

  _spawnEscortNPC(quest) {
    const npc = new EscortNPC(
      quest,
      this.game.player.tileX + 2,
      SURFACE_Y - 1
    );
    quest._escortNPC = npc;
    quest._escortActive = true;
    this.escortNPCs.push(npc);
  }

  abandonQuest(questId) {
    const questIndex = this.activeQuests.findIndex(q => q.id === questId);
    if (questIndex === -1) {
      return { success: false, reason: '任务不存在' };
    }

    const quest = this.activeQuests.splice(questIndex, 1)[0];
    quest.status = 'abandoned';

    this.progressTracker.stopTracking(questId);

    if (quest.type === QUEST_TYPES.ESCORT && quest._escortNPC) {
      const idx = this.escortNPCs.indexOf(quest._escortNPC);
      if (idx !== -1) {
        this.escortNPCs.splice(idx, 1);
      }
      quest._escortNPC = null;
      quest._escortActive = false;
    }

    this._handleQuestChainAbandon(quest);

    return { success: true, quest };
  }

  _handleQuestChainAbandon(quest) {
    if (!quest.chainId) return;

    const chain = this.questChains[quest.chainId];
    if (!chain) return;

    const currentQuest = chain.quests.find(q => q.id === quest.id);
    if (currentQuest) {
      currentQuest.status = 'available';
      currentQuest.progress = 0;
      currentQuest.acceptedAt = null;
      currentQuest.completedAt = null;
      this._initializeQuestFields(currentQuest);
      this._resetChainQuestProgress(currentQuest);

      const inAvailable = this.availableQuests.find(q => q.id === currentQuest.id);
      if (!inAvailable) {
        this.availableQuests.push(currentQuest);
      }
    }
  }

  _resetChainQuestProgress(quest) {
    switch (quest.type) {
      case QUEST_TYPES.COLLECT:
        quest.collected = 0;
        break;
      case QUEST_TYPES.CLEAR:
        quest.killed = 0;
        quest._killsBeforeAccept = 0;
        break;
      case QUEST_TYPES.BUILD:
        quest.built = false;
        break;
      case QUEST_TYPES.ESCORT:
        quest.escortProgress = 0;
        quest._escortActive = false;
        quest._escortNPC = null;
        break;
    }
    quest.progress = 0;
  }

  completeQuest(questId) {
    const questIndex = this.activeQuests.findIndex(q => q.id === questId);
    if (questIndex === -1) {
      return { success: false, reason: '任务不存在' };
    }

    const quest = this.activeQuests.splice(questIndex, 1)[0];
    quest.status = 'completed';
    quest.completedAt = Date.now();
    quest.progress = 100;

    this.progressTracker.consumeQuestRequirements(quest);
    this.progressTracker.stopTracking(questId);

    if (quest.type === QUEST_TYPES.ESCORT && quest._escortNPC) {
      const idx = this.escortNPCs.indexOf(quest._escortNPC);
      if (idx !== -1) {
        this.escortNPCs.splice(idx, 1);
      }
      quest._escortNPC = null;
      quest._escortActive = false;
    }

    this.game.player.gold += quest.reward;
    this.completedQuests.push(quest);
    this.totalCompleted++;
    this.calculatePlayerLevel();

    this._checkQuestChain(quest);

    return { success: true, quest, reward: quest.reward };
  }

  _checkQuestChain(quest) {
    if (!quest.chainId) return;

    const chain = this.questChains[quest.chainId];
    if (!chain) return;

    const nextQuest = chain.quests.find(q => q.chainOrder === quest.chainOrder + 1);
    if (nextQuest) {
      nextQuest.status = 'available';
      this._resetChainQuestProgress(nextQuest);
      this.availableQuests.push(nextQuest);

      if (this.game.npcManager) {
        this.game.npcManager.showQuestNotification();
      }
    }
  }

  update(dt) {
    for (let i = this.activeQuests.length - 1; i >= 0; i--) {
      const quest = this.activeQuests[i];

      if (quest.timeLimit > 0) {
        quest.timeRemaining -= dt;
        if (quest.timeRemaining <= 0) {
          this._failQuest(quest, i);
          continue;
        }
      }

      if (this.progressTracker.checkCompletion(quest)) {
        const result = this.completeQuest(quest.id);
        if (result.success && this.game.ui) {
          this.game.ui.showWarning(
            `✅ 任务完成: ${quest.title} 获得 $${result.reward}`,
            3000,
            'text-green-400'
          );
        }
      }
    }

    for (const npc of this.escortNPCs) {
      npc.update(dt, this.game.player, this.game.world);
    }
  }

  _failQuest(quest, index) {
    quest.timeRemaining = 0;
    quest.status = 'failed';
    this.activeQuests.splice(index, 1);
    this.failedQuests.push(quest);
    this.progressTracker.stopTracking(quest.id);

    if (quest.type === QUEST_TYPES.ESCORT && quest._escortNPC) {
      const idx = this.escortNPCs.indexOf(quest._escortNPC);
      if (idx !== -1) {
        this.escortNPCs.splice(idx, 1);
      }
      quest._escortNPC = null;
    }

    this._handleQuestChainAbandon(quest);

    if (this.game.ui) {
      this.game.ui.showWarning(`❌ 任务失败: ${quest.title}`, 3000, 'text-red-400');
    }
  }

  emitEvent(eventName, data) {
    this.progressTracker.emit(eventName, data);

    for (const quest of this.activeQuests) {
      if (this.progressTracker.checkCompletion(quest)) {
        setTimeout(() => {
          if (quest.status === 'active') {
            const result = this.completeQuest(quest.id);
            if (result.success && this.game.ui) {
              this.game.ui.showWarning(
                `✅ 任务完成: ${quest.title} 获得 $${result.reward}`,
                3000,
                'text-green-400'
              );
            }
          }
        }, 50);
      }
    }
  }

  getActiveQuests() {
    return this.activeQuests;
  }

  getAvailableQuests() {
    return this.availableQuests;
  }

  getProgressText(quest) {
    return this.progressTracker.getProgressText(quest);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  createQuestChain(chainId, quests) {
    this.questChains[chainId] = {
      id: chainId,
      quests: quests.map((q, i) => {
        const quest = {
          ...q,
          chainId: chainId,
          chainOrder: i,
          status: i === 0 ? 'available' : 'locked'
        };
        return this._initializeQuestFields(quest);
      })
    };

    const firstQuest = this.questChains[chainId].quests[0];
    if (firstQuest) {
      this.availableQuests.push(firstQuest);
    }
  }

  getQuestChainProgress(chainId) {
    const chain = this.questChains[chainId];
    if (!chain) return null;

    const completed = chain.quests.filter(q => q.status === 'completed').length;
    return {
      total: chain.quests.length,
      completed: completed,
      progress: (completed / chain.quests.length) * 100
    };
  }

  renderEscortNPCs(ctx, worldToScreen) {
    for (const npc of this.escortNPCs) {
      npc.render(ctx, worldToScreen);
    }
  }
}
