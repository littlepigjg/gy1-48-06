import { QUEST_TYPES, ORE_NAMES_CN, ENEMY_NAMES_CN, STRUCTURE_NAMES_CN } from './questTypes.js';
import { SURFACE_Y } from './constants.js';

export class QuestProgressTracker {
  constructor(game) {
    this.game = game;
    this.quests = [];
    this.eventHandlers = new Map();
    this._setupEventHandlers();
  }

  _setupEventHandlers() {
    this.eventHandlers.set('ore_collected', (data) => this._handleOreCollected(data));
    this.eventHandlers.set('enemy_killed', (data) => this._handleEnemyKilled(data));
    this.eventHandlers.set('tile_dug', (data) => this._handleTileDug(data));
    this.eventHandlers.set('structure_built', (data) => this._handleStructureBuilt(data));
    this.eventHandlers.set('player_moved', (data) => this._handlePlayerMoved(data));
  }

  trackQuest(quest) {
    if (!quest._trackerInitialized) {
      this._initializeQuestTracking(quest);
      quest._trackerInitialized = true;
    }
    if (!this.quests.includes(quest)) {
      this.quests.push(quest);
    }
  }

  stopTracking(questId) {
    const index = this.quests.findIndex(q => q.id === questId);
    if (index !== -1) {
      this.quests.splice(index, 1);
    }
  }

  _initializeQuestTracking(quest) {
    const player = this.game.player;

    switch (quest.type) {
      case QUEST_TYPES.COLLECT: {
        const existingAmount = player.cargo[quest.target.oreType] || 0;
        quest.collected = Math.min(quest.target.amount, existingAmount);
        quest.progress = (quest.collected / quest.target.amount) * 100;
        break;
      }

      case QUEST_TYPES.CLEAR: {
        const totalKills = this.game.stats.enemiesKilled || 0;
        quest.killed = Math.min(quest.target.amount, totalKills);
        quest.progress = (quest.killed / quest.target.amount) * 100;
        quest._killsBeforeAccept = 0;
        break;
      }

      case QUEST_TYPES.EXPLORE: {
        const depth = Math.max(0, player.tileY - SURFACE_Y);
        const exploredArea = this.game.stats.blocksDug || 0;
        const depthProgress = Math.min(100, (depth / quest.target.targetDepth) * 100);
        const areaProgress = Math.min(100, (exploredArea / quest.target.exploreArea) * 100);
        quest.progress = Math.min(100, (depthProgress + areaProgress) / 2);
        break;
      }

      case QUEST_TYPES.BUILD: {
        quest.built = false;
        quest.progress = 0;
        break;
      }

      case QUEST_TYPES.ESCORT: {
        quest.escortProgress = 0;
        quest.progress = 0;
        quest._escortActive = false;
        quest._escortNPC = null;
        break;
      }
    }
  }

  emit(eventName, data) {
    const handler = this.eventHandlers.get(eventName);
    if (handler) {
      handler(data);
    }
  }

  _handleOreCollected({ oreType, amount }) {
    for (const quest of this.quests) {
      if (quest.type === QUEST_TYPES.COLLECT && quest.target.oreType === oreType) {
        const total = this.game.player.cargo[oreType] || 0;
        quest.collected = Math.min(quest.target.amount, total);
        quest.progress = (quest.collected / quest.target.amount) * 100;
      }
    }
  }

  _handleEnemyKilled({ enemyType, count = 1 }) {
    const totalKills = this.game.stats.enemiesKilled || 0;

    for (const quest of this.quests) {
      if (quest.type === QUEST_TYPES.CLEAR) {
        if (quest.target.enemyType === enemyType || quest.target.enemyType === 'any') {
          quest.killed = Math.min(quest.target.amount, totalKills);
          quest.progress = (quest.killed / quest.target.amount) * 100;
        }
      }
    }
  }

  _handleTileDug({ tileX, tileY }) {
    for (const quest of this.quests) {
      if (quest.type === QUEST_TYPES.EXPLORE) {
        const depth = Math.max(0, this.game.player.tileY - SURFACE_Y);
        const exploredArea = this.game.stats.blocksDug || 0;
        const depthProgress = Math.min(100, (depth / quest.target.targetDepth) * 100);
        const areaProgress = Math.min(100, (exploredArea / quest.target.exploreArea) * 100);
        quest.progress = Math.min(100, (depthProgress + areaProgress) / 2);
      }
    }
  }

  _handleStructureBuilt({ structureType, x, y }) {
    for (const quest of this.quests) {
      if (quest.type === QUEST_TYPES.BUILD) {
        if (quest.target.structureType === structureType) {
          const targetX = quest.target.location.x;
          const targetY = quest.target.location.y;
          const dist = Math.abs(x - targetX) + Math.abs(y - targetY);

          if (dist <= 2) {
            quest.built = true;
            quest.progress = 100;
          }
        }
      }
    }
  }

  _handlePlayerMoved({ tileX, tileY }) {
    const depth = Math.max(0, tileY - SURFACE_Y);

    for (const quest of this.quests) {
      if (quest.type === QUEST_TYPES.EXPLORE) {
        const exploredArea = this.game.stats.blocksDug || 0;
        const depthProgress = Math.min(100, (depth / quest.target.targetDepth) * 100);
        const areaProgress = Math.min(100, (exploredArea / quest.target.exploreArea) * 100);
        quest.progress = Math.min(100, (depthProgress + areaProgress) / 2);
      }

      if (quest.type === QUEST_TYPES.ESCORT && quest._escortNPC) {
        const npc = quest._escortNPC;
        const dest = quest.target.destination;

        const startY = SURFACE_Y - 1;
        const totalDistance = Math.abs(dest.y - startY);
        const currentDistance = Math.abs(Math.min(tileY, dest.y) - startY);

        quest.escortProgress = Math.min(100, (currentDistance / totalDistance) * 100);
        quest.progress = quest.escortProgress;

        if (tileY >= dest.y - 1) {
          quest.progress = 100;
        }
      }
    }
  }

  checkCompletion(quest) {
    switch (quest.type) {
      case QUEST_TYPES.COLLECT:
        return quest.collected >= quest.target.amount;

      case QUEST_TYPES.CLEAR:
        return quest.killed >= quest.target.amount;

      case QUEST_TYPES.EXPLORE:
        return quest.progress >= 100;

      case QUEST_TYPES.BUILD:
        return quest.built === true;

      case QUEST_TYPES.ESCORT:
        return quest.progress >= 100;

      default:
        return quest.progress >= 100;
    }
  }

  getProgressText(quest) {
    switch (quest.type) {
      case QUEST_TYPES.COLLECT:
        return `已采集: ${quest.collected || 0}/${quest.target.amount} ${ORE_NAMES_CN[quest.target.oreType] || quest.target.oreType}`;

      case QUEST_TYPES.CLEAR:
        return `已击杀: ${quest.killed || 0}/${quest.target.amount} ${ENEMY_NAMES_CN[quest.target.enemyType] || quest.target.enemyType}`;

      case QUEST_TYPES.EXPLORE: {
        const currentDepth = Math.max(0, this.game.player.tileY - SURFACE_Y);
        return `深度: ${currentDepth}/${quest.target.targetDepth}m | 勘探: ${this.game.stats.blocksDug || 0}/${quest.target.exploreArea}块`;
      }

      case QUEST_TYPES.BUILD:
        return quest.built
          ? `✓ ${STRUCTURE_NAMES_CN[quest.target.structureType] || '设施'} 已建造`
          : `待建造: ${STRUCTURE_NAMES_CN[quest.target.structureType] || '设施'}`;

      case QUEST_TYPES.ESCORT:
        return `护送进度: ${Math.floor(quest.escortProgress || 0)}%`;

      default:
        return `进度: ${Math.floor(quest.progress)}%`;
    }
  }

  consumeQuestRequirements(quest) {
    switch (quest.type) {
      case QUEST_TYPES.COLLECT:
        if (this.game.player.cargo[quest.target.oreType]) {
          this.game.player.cargo[quest.target.oreType] -= quest.target.amount;
          if (this.game.player.cargo[quest.target.oreType] < 0) {
            this.game.player.cargo[quest.target.oreType] = 0;
          }
          this.game.player.cargoUsed -= quest.target.amount;
          if (this.game.player.cargoUsed < 0) {
            this.game.player.cargoUsed = 0;
          }
        }
        break;

      case QUEST_TYPES.BUILD:
        if (quest.target.materials) {
          for (const [material, amount] of Object.entries(quest.target.materials)) {
            if (amount > 0 && this.game.player.cargo[material]) {
              this.game.player.cargo[material] -= amount;
              this.game.player.cargoUsed -= amount;
            }
          }
        }
        break;
    }
  }

  clear() {
    this.quests = [];
  }
}
