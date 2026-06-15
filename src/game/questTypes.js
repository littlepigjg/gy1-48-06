import { ORE_NAMES, WORLD_WIDTH, SURFACE_Y } from './constants.js';

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

export const ORE_NAMES_CN = {
  coal: '煤炭',
  iron: '铁矿',
  gold: '金矿',
  emerald: '祖母绿',
  ruby: '红宝石',
  diamond: '钻石'
};

export const ENEMY_NAMES_CN = {
  worm: '地底蠕虫',
  bat: '洞穴蝙蝠',
  spider: '毒蜘蛛',
  demon: '岩浆恶魔'
};

export const STRUCTURE_NAMES_CN = {
  outpost: '前哨站',
  storage: '存储仓',
  beacon: '信标塔',
  relay_station: '中继站'
};

export function getRandomOreType(stars) {
  const oreTypes = ['coal', 'iron', 'gold', 'emerald', 'ruby', 'diamond'];
  const maxIndex = Math.min(oreTypes.length - 1, Math.floor(stars / 2) + 1);
  return oreTypes[Math.floor(Math.random() * (maxIndex + 1))];
}

export function getRandomEnemyType(stars) {
  const types = ['worm', 'bat', 'spider', 'demon'];
  const maxIndex = Math.min(types.length - 1, Math.floor(stars / 2));
  return types[Math.floor(Math.random() * (maxIndex + 1))];
}

export function getRandomStructureType() {
  const structures = ['outpost', 'storage', 'beacon', 'relay_station'];
  return structures[Math.floor(Math.random() * structures.length)];
}

export function getBuildMaterials(stars) {
  return {
    stone: 10 + stars * 5,
    iron: stars >= 2 ? 3 + stars * 2 : 0,
    gold: stars >= 4 ? stars - 2 : 0
  };
}

export function getBaseReward(type, stars) {
  const baseRewards = {
    [QUEST_TYPES.COLLECT]: 50,
    [QUEST_TYPES.ESCORT]: 80,
    [QUEST_TYPES.CLEAR]: 100,
    [QUEST_TYPES.EXPLORE]: 60,
    [QUEST_TYPES.BUILD]: 120
  };
  return baseRewards[type] || 50;
}

export function getTimeLimit(type, stars) {
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

export function getTarget(type, stars) {
  const targets = {
    [QUEST_TYPES.COLLECT]: {
      oreType: getRandomOreType(stars),
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
      enemyType: getRandomEnemyType(stars),
      amount: 3 + stars * 2,
      depth: SURFACE_Y + 10 + stars * 10
    },
    [QUEST_TYPES.EXPLORE]: {
      targetDepth: 20 + stars * 25,
      exploreArea: 100 + stars * 50
    },
    [QUEST_TYPES.BUILD]: {
      structureType: getRandomStructureType(),
      location: {
        x: Math.floor(WORLD_WIDTH / 2 + (Math.random() - 0.5) * 40),
        y: SURFACE_Y + 5 + stars * 8
      },
      materials: getBuildMaterials(stars)
    }
  };
  return targets[type];
}

export function generateTitle(type, stars) {
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

export function generateDescription(type, target) {
  const descs = {
    [QUEST_TYPES.COLLECT]: (t) =>
      `采集 ${t.amount} 个${ORE_NAMES_CN[t.oreType] || t.oreType}，完成后获得丰厚奖励。`,
    [QUEST_TYPES.ESCORT]: (t) =>
      `护送目标安全到达深度 ${t.destination.y - SURFACE_Y}m 的指定位置。`,
    [QUEST_TYPES.CLEAR]: (t) =>
      `清除 ${t.amount} 只${ENEMY_NAMES_CN[t.enemyType] || t.enemyType}，它们出没在深度 ${t.depth - SURFACE_Y}m 以下区域。`,
    [QUEST_TYPES.EXPLORE]: (t) =>
      `探索到达深度 ${t.targetDepth}m 的地下区域，勘探新的矿脉资源。`,
    [QUEST_TYPES.BUILD]: (t) =>
      `在深度 ${t.location.y - SURFACE_Y}m 处建造${STRUCTURE_NAMES_CN[t.structureType] || '设施'}。`
  };
  return descs[type](target);
}
