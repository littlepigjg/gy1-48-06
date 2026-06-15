import { TILE_SIZE, SURFACE_Y, WORLD_WIDTH, ORE_PRICES, ORE_NAMES } from './constants.js';

export const QUEST_TYPES = {
  COLLECT: 'collect',
  ESCORT: 'escort',
  CLEAR: 'clear',
  EXPLORE: 'explore',
  BUILD: 'build'
};

export const QUEST_STARS = {
  1: { name: '一星', color: '#9CA3AF', rewardMultiplier: 1 },
  2: { name: '二星', color: '#60A5FA', rewardMultiplier: 1.5 },
  3: { name: '三星', color: '#34D399', rewardMultiplier: 2.5 },
  4: { name: '四星', color: '#A78BFA', rewardMultiplier: 4 },
  5: { name: '五星', color: '#FBBF24', rewardMultiplier: 7 }
};

export const QUEST_TYPE_NAMES = {
  [QUEST_TYPES.COLLECT]: '采集任务',
  [QUEST_TYPES.ESCORT]: '护送任务',
  [QUEST_TYPES.CLEAR]: '清除任务',
  [QUEST_TYPES.EXPLORE]: '探索任务',
  [QUEST_TYPES.BUILD]: '建造任务'
};

export const QUEST_TYPE_ICONS = {
  [QUEST_TYPES.COLLECT]: '⛏️',
  [QUEST_TYPES.ESCORT]: '🚚',
  [QUEST_TYPES.CLEAR]: '⚔️',
  [QUEST_TYPES.EXPLORE]: '🔍',
  [QUEST_TYPES.BUILD]: '🏗️'
};

export class QuestManager {
  constructor(game) {
    this.game = game;
    this.activeQuests = [];
    this.completedQuests = [];
    this.availableQuests = [];
    this.maxActiveQuests = 5;
    this.questChains = {};
    this.playerLevel = 1;
    this.totalCompleted = 0;
  }

  calculatePlayerLevel() {
    const level = Math.floor(this.totalCompleted / 5) + 1;
    this.playerLevel = Math.min(10, level);
    return this.playerLevel;
  }

  generateAvailableQuests(count = 3) {
    this.availableQuests = [];
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
    const baseReward = this.getBaseReward(type, stars);
    const reward = Math.floor(baseReward * starData.rewardMultiplier);

    const timeLimit = this.getTimeLimit(type, stars);

    let quest = {
      id: 'quest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: type,
      stars: stars,
      title: this.generateTitle(type, stars),
      description: this.generateDescription(type, stars),
      reward: reward,
      timeLimit: timeLimit,
      timeRemaining: timeLimit,
      progress: 0,
      target: this.getTarget(type, stars),
      status: 'available',
      chainId: null,
      chainOrder: 0,
      acceptedAt: null,
      completedAt: null
    };

    quest = this.addQuestSpecifics(quest);

    return quest;
  }

  getBaseReward(type, stars) {
    const baseRewards = {
      [QUEST_TYPES.COLLECT]: 50,
      [QUEST_TYPES.ESCORT]: 80,
      [QUEST_TYPES.CLEAR]: 100,
      [QUEST_TYPES.EXPLORE]: 60,
      [QUEST_TYPES.BUILD]: 120
    };
    return baseRewards[type] || 50;
  }

  getTimeLimit(type, stars) {
    const baseTimes = {
      [QUEST_TYPES.COLLECT]: 180,
      [QUEST_TYPES.ESCORT]: 240,
      [QUEST_TYPES.CLEAR]: 150,
      [QUEST_TYPES.EXPLORE]: 300,
      [QUEST_TYPES.BUILD]: 200
    };
    const baseTime = baseTimes[type] || 180;
    return baseTime + stars * 30;
  }

  getTarget(type, stars) {
    const targets = {
      [QUEST_TYPES.COLLECT]: {
        oreType: this.getRandomOreType(stars),
        amount: 5 + stars * 3
      },
      [QUEST_TYPES.ESCORT]: {
        destination: {
          x: Math.floor(WORLD_WIDTH / 2 + (Math.random() - 0.5) * WORLD_WIDTH * 0.6),
          y: SURFACE_Y + 20 + stars * 15
        },
        npcId: 'escort_' + Math.random().toString(36).substr(2, 5)
      },
      [QUEST_TYPES.CLEAR]: {
        enemyType: this.getRandomEnemyType(stars),
        amount: 3 + stars * 2,
        depth: SURFACE_Y + 10 + stars * 10
      },
      [QUEST_TYPES.EXPLORE]: {
        targetDepth: 20 + stars * 25,
        exploreArea: 100 + stars * 50
      },
      [QUEST_TYPES.BUILD]: {
        structureType: this.getRandomStructureType(),
        location: {
          x: Math.floor(WORLD_WIDTH / 2 + (Math.random() - 0.5) * 40),
          y: SURFACE_Y + 5 + stars * 8
        },
        materials: this.getBuildMaterials(stars)
      }
    };
    return targets[type];
  }

  getRandomOreType(stars) {
    const oreTypes = ['coal', 'iron', 'gold', 'emerald', 'ruby', 'diamond'];
    const maxIndex = Math.min(oreTypes.length - 1, Math.floor(stars / 2) + 1);
    return oreTypes[Math.floor(Math.random() * (maxIndex + 1))];
  }

  getRandomEnemyType(stars) {
    const types = ['worm', 'bat', 'spider', 'demon'];
    const maxIndex = Math.min(types.length - 1, Math.floor(stars / 2));
    return types[Math.floor(Math.random() * (maxIndex + 1))];
  }

  getRandomStructureType() {
    const structures = ['outpost', 'storage', 'beacon', 'relay_station'];
    return structures[Math.floor(Math.random() * structures.length)];
  }

  getBuildMaterials(stars) {
    return {
      stone: 10 + stars * 5,
      iron: stars >= 2 ? 3 + stars * 2 : 0,
      gold: stars >= 4 ? stars - 2 : 0
    };
  }

  generateTitle(type, stars) {
    const starPrefix = '⭐'.repeat(stars) + ' ';
    const titles = {
      [QUEST_TYPES.COLLECT]: ['矿石采集', '资源收集', '紧急补给', '材料筹备'],
      [QUEST_TYPES.ESCORT]: ['安全护送', '物资运输', '人员转移', '重要护送'],
      [QUEST_TYPES.CLEAR]: ['清除威胁', '区域清剿', '怪物讨伐', '危险排除'],
      [QUEST_TYPES.EXPLORE]: ['深度探索', '区域勘测', '矿脉侦查', '地下探秘'],
      [QUEST_TYPES.BUILD]: ['设施建造', '基地扩建', '工程建设', '结构搭建']
    };
    const options = titles[type];
    return starPrefix + options[Math.floor(Math.random() * options.length)];
  }

  generateDescription(type, stars) {
    const descs = {
      [QUEST_TYPES.COLLECT]: (t) =>
        `采集 ${t.target.amount} 个${ORE_NAMES[t.target.oreType] || t.target.oreType}，完成后获得丰厚奖励。`,
      [QUEST_TYPES.ESCORT]: (t) =>
        `护送目标到达深度 ${t.target.destination.y - SURFACE_Y}m 的指定位置，注意保护安全。`,
      [QUEST_TYPES.CLEAR]: (t) =>
        `在深度 ${t.target.depth - SURFACE_Y}m 以下区域清除 ${t.target.amount} 只${t.target.enemyType}。`,
      [QUEST_TYPES.EXPLORE]: (t) =>
        `探索到达深度 ${t.target.targetDepth}m 的区域，勘探新的矿脉资源。`,
      [QUEST_TYPES.BUILD]: (t) =>
        `在指定位置建造设施，准备好所需材料。`
    };
    return descs[type]({ target: this.getTarget(type, stars) });
  }

  addQuestSpecifics(quest) {
    const target = this.getTarget(quest.type, quest.stars);
    quest.target = target;

    const oreNames = {
      coal: '煤炭',
      iron: '铁矿',
      gold: '金矿',
      emerald: '祖母绿',
      ruby: '红宝石',
      diamond: '钻石'
    };
    const enemyNames = {
      worm: '地底蠕虫',
      bat: '洞穴蝙蝠',
      spider: '毒蜘蛛',
      demon: '岩浆恶魔'
    };
    const structureNames = {
      outpost: '前哨站',
      storage: '存储仓',
      beacon: '信标塔',
      relay_station: '中继站'
    };

    switch (quest.type) {
      case QUEST_TYPES.COLLECT:
        quest.description = `采集 ${quest.target.amount} 个${oreNames[quest.target.oreType] || quest.target.oreType}，完成后获得丰厚奖励。`;
        quest.collected = 0;
        break;
      case QUEST_TYPES.CLEAR:
        quest.description = `清除 ${quest.target.amount} 只${enemyNames[quest.target.enemyType] || quest.target.enemyType}，它们出没在深度 ${quest.target.depth - SURFACE_Y}m 以下区域。`;
        quest.killed = 0;
        break;
      case QUEST_TYPES.EXPLORE:
        quest.description = `探索到达深度 ${quest.target.targetDepth}m 的地下区域，勘探新的矿脉资源。`;
        break;
      case QUEST_TYPES.BUILD:
        quest.description = `在深度 ${quest.target.location.y - SURFACE_Y}m 处建造${structureNames[quest.target.structureType] || '设施'}。`;
        quest.built = false;
        break;
      case QUEST_TYPES.ESCORT:
        quest.description = `护送目标安全到达深度 ${quest.target.destination.y - SURFACE_Y}m 的指定位置。`;
        quest.escortProgress = 0;
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

    this.resetQuestProgress(quest);
    this.activeQuests.push(quest);

    return { success: true, quest };
  }

  resetQuestProgress(quest) {
    switch (quest.type) {
      case QUEST_TYPES.COLLECT:
        quest.collected = 0;
        quest.progress = 0;
        break;
      case QUEST_TYPES.CLEAR:
        quest.killed = 0;
        quest.progress = 0;
        break;
      case QUEST_TYPES.EXPLORE:
        quest.progress = 0;
        break;
      case QUEST_TYPES.BUILD:
        quest.built = false;
        quest.progress = 0;
        break;
      case QUEST_TYPES.ESCORT:
        quest.escortProgress = 0;
        quest.progress = 0;
        break;
    }
  }

  abandonQuest(questId) {
    const questIndex = this.activeQuests.findIndex(q => q.id === questId);
    if (questIndex === -1) {
      return { success: false, reason: '任务不存在' };
    }

    const quest = this.activeQuests.splice(questIndex, 1)[0];
    quest.status = 'abandoned';

    return { success: true, quest };
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

    this.game.player.gold += quest.reward;
    this.completedQuests.push(quest);
    this.totalCompleted++;
    this.calculatePlayerLevel();

    this.checkQuestChain(quest);

    return { success: true, quest, reward: quest.reward };
  }

  checkQuestChain(quest) {
    if (!quest.chainId) return;

    const chain = this.questChains[quest.chainId];
    if (!chain) return;

    const nextQuest = chain.quests.find(q => q.chainOrder === quest.chainOrder + 1);
    if (nextQuest) {
      nextQuest.status = 'available';
      this.availableQuests.push(nextQuest);
    }
  }

  update(dt) {
    for (let i = this.activeQuests.length - 1; i >= 0; i--) {
      const quest = this.activeQuests[i];

      if (quest.timeLimit > 0) {
        quest.timeRemaining -= dt;
        if (quest.timeRemaining <= 0) {
          quest.timeRemaining = 0;
          quest.status = 'failed';
          this.activeQuests.splice(i, 1);
          if (this.game.ui) {
            this.game.ui.showWarning(`❌ 任务失败: ${quest.title}`, 3000, 'text-red-400');
          }
        }
      }

      this.updateQuestProgress(quest);
    }
  }

  updateQuestProgress(quest) {
    const player = this.game.player;

    switch (quest.type) {
      case QUEST_TYPES.COLLECT:
        if (player.cargo && player.cargo[quest.target.oreType]) {
          quest.collected = Math.min(quest.target.amount, player.cargo[quest.target.oreType]);
          quest.progress = (quest.collected / quest.target.amount) * 100;

          if (quest.collected >= quest.target.amount) {
            this.completeQuest(quest.id);
            if (this.game.ui) {
              this.game.ui.showWarning(`✅ 任务完成: ${quest.title} 获得 $${quest.reward}`, 3000, 'text-green-400');
            }
          }
        }
        break;

      case QUEST_TYPES.CLEAR:
        const kills = this.game.stats.enemiesKilled || 0;
        if (!quest._initialKills) {
          quest._initialKills = kills;
        }
        quest.killed = Math.min(quest.target.amount, kills - quest._initialKills);
        quest.progress = (quest.killed / quest.target.amount) * 100;

        if (quest.killed >= quest.target.amount) {
          this.completeQuest(quest.id);
          if (this.game.ui) {
            this.game.ui.showWarning(`✅ 任务完成: ${quest.title} 获得 $${quest.reward}`, 3000, 'text-green-400');
          }
        }
        break;

      case QUEST_TYPES.EXPLORE:
        const depth = Math.max(0, player.tileY - SURFACE_Y);
        quest.progress = Math.min(100, (depth / quest.target.targetDepth) * 100);

        if (depth >= quest.target.targetDepth) {
          this.completeQuest(quest.id);
          if (this.game.ui) {
            this.game.ui.showWarning(`✅ 任务完成: ${quest.title} 获得 $${quest.reward}`, 3000, 'text-green-400');
          }
        }
        break;

      case QUEST_TYPES.BUILD:
        if (quest.built) {
          quest.progress = 100;
        }
        break;

      case QUEST_TYPES.ESCORT:
        break;
    }
  }

  getActiveQuests() {
    return this.activeQuests;
  }

  getAvailableQuests() {
    return this.availableQuests;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  createQuestChain(chainId, quests) {
    this.questChains[chainId] = {
      id: chainId,
      quests: quests.map((q, i) => ({
        ...q,
        chainId: chainId,
        chainOrder: i,
        status: i === 0 ? 'available' : 'locked'
      }))
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
}
