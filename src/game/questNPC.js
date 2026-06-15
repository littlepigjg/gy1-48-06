import { TILE_SIZE, SURFACE_Y } from './constants.js';

export class QuestNPC {
  constructor(tileX, tileY, name = '任务发布官') {
    this.tileX = tileX;
    this.tileY = tileY;
    this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
    this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
    this.width = TILE_SIZE * 0.9;
    this.height = TILE_SIZE * 0.9;
    this.name = name;

    this.dialogBubble = null;
    this.bubbleTimer = 0;
    this.notificationActive = false;
    this.notificationTimer = 0;
    this.notificationPulse = 0;

    this.idleAnimation = 0;
    this.talkAnimation = 0;

    this.interactionRange = TILE_SIZE * 2.5;
  }

  update(dt, player) {
    this.idleAnimation += dt * 2;
    this.notificationPulse += dt * 4;

    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= dt;
      this.talkAnimation += dt * 8;
      if (this.bubbleTimer <= 0) {
        this.dialogBubble = null;
      }
    }

    if (this.notificationTimer > 0) {
      this.notificationTimer -= dt;
      if (this.notificationTimer <= 0) {
        this.notificationActive = false;
      }
    }
  }

  isPlayerNearby(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.interactionRange;
  }

  showDialog(text, duration = 4) {
    this.dialogBubble = {
      text: text,
      lines: this.wrapText(text, 25)
    };
    this.bubbleTimer = duration;
  }

  wrapText(text, maxChars) {
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (currentLine.length >= maxChars && char !== '，' && char !== '。' && char !== '！' && char !== '？') {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine += char;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  showNotification(duration = 2) {
    this.notificationActive = true;
    this.notificationTimer = duration;
  }

  render(ctx, worldToScreen) {
    const screen = worldToScreen(this.x, this.y);
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const bobY = Math.sin(this.idleAnimation) * 2;

    this.renderNPCBody(ctx, screen.x, screen.y + bobY, halfW, halfH);
    this.renderNameTag(ctx, screen.x, screen.y - halfH - 15);

    if (this.notificationActive) {
      this.renderNotification(ctx, screen.x, screen.y - halfH - 35);
    }

    if (this.dialogBubble) {
      this.renderDialogBubble(ctx, screen.x, screen.y - halfH - 10);
    }
  }

  renderNPCBody(ctx, x, y, halfW, halfH) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.roundRect(-halfW * 0.7, -halfH * 0.3, halfW * 1.4, halfH * 1.2, 4);
    ctx.fill();

    ctx.fillStyle = '#A0522D';
    ctx.beginPath();
    ctx.roundRect(-halfW * 0.6, -halfH * 0.2, halfW * 1.2, halfH * 0.5, 3);
    ctx.fill();

    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.arc(0, -halfH * 0.5, halfW * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, -halfH * 0.7, halfW * 0.45, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-halfW * 0.15, -halfH * 0.5, 2, 0, Math.PI * 2);
    ctx.arc(halfW * 0.15, -halfH * 0.5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -halfH * 0.35, halfW * 0.15, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📜', 0, halfH * 0.3);

    ctx.restore();
  }

  renderNameTag(ctx, x, y) {
    ctx.save();

    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const textWidth = ctx.measureText(this.name).width;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - textWidth / 2 - 6, y - 10, textWidth + 12, 16);

    ctx.fillStyle = '#FFD700';
    ctx.fillText(this.name, x, y + 2);

    ctx.restore();
  }

  renderNotification(ctx, x, y) {
    ctx.save();

    const pulseScale = 1 + Math.sin(this.notificationPulse) * 0.15;
    const glowAlpha = 0.5 + Math.sin(this.notificationPulse * 1.5) * 0.3;

    const notifY = y - 40;

    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15 * pulseScale;

    ctx.fillStyle = `rgba(255, 215, 0, ${glowAlpha})`;
    ctx.beginPath();
    ctx.arc(x, notifY, 18 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x, notifY, 14 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8B4513';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x, notifY + 6);

    ctx.restore();
  }

  renderDialogBubble(ctx, x, y) {
    if (!this.dialogBubble) return;

    ctx.save();

    const lines = this.dialogBubble.lines;
    const lineHeight = 16;
    const paddingX = 12;
    const paddingY = 8;
    const maxLineWidth = Math.max(...lines.map(l => {
      ctx.font = '13px sans-serif';
      return ctx.measureText(l).width;
    }));

    const bubbleWidth = maxLineWidth + paddingX * 2;
    const bubbleHeight = lines.length * lineHeight + paddingY * 2;

    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = y - bubbleHeight - 20;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, bubbleY + bubbleHeight);
    ctx.lineTo(x, bubbleY + bubbleHeight + 8);
    ctx.lineTo(x + 8, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';

    lines.forEach((line, i) => {
      ctx.fillText(line, bubbleX + paddingX, bubbleY + paddingY + lineHeight * (i + 0.7));
    });

    ctx.restore();
  }
}

export class NPCManager {
  constructor() {
    this.npcs = [];
  }

  addNPC(npc) {
    this.npcs.push(npc);
    return npc;
  }

  createQuestNPC(baseBuildingX) {
    const npc = new QuestNPC(
      baseBuildingX + 4,
      SURFACE_Y - 1,
      '任务发布官'
    );
    this.addNPC(npc);
    return npc;
  }

  update(dt, player) {
    for (const npc of this.npcs) {
      npc.update(dt, player);
    }
  }

  getNearbyNPC(player) {
    for (const npc of this.npcs) {
      if (npc.isPlayerNearby(player)) {
        return npc;
      }
    }
    return null;
  }

  render(ctx, worldToScreen) {
    for (const npc of this.npcs) {
      npc.render(ctx, worldToScreen);
    }
  }

  showQuestNotification() {
    for (const npc of this.npcs) {
      if (npc instanceof QuestNPC) {
        npc.showNotification(3);
      }
    }
  }

  showGreetingDialog() {
    for (const npc of this.npcs) {
      if (npc instanceof QuestNPC) {
        npc.showDialog('欢迎来到任务大厅！按 E 键打开任务面板查看可用任务。', 4);
      }
    }
  }
}
