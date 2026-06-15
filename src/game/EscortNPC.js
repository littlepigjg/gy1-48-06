import { TILE_SIZE, SURFACE_Y } from './constants.js';

export class EscortNPC {
  constructor(quest, startX, startY) {
    this.quest = quest;
    this.tileX = startX;
    this.tileY = startY;
    this.x = startX * TILE_SIZE + TILE_SIZE / 2;
    this.y = startY * TILE_SIZE + TILE_SIZE / 2;
    this.width = TILE_SIZE * 0.7;
    this.height = TILE_SIZE * 0.7;
    this.following = false;
    this.reachedDestination = false;
    this.idleAnimation = 0;
  }

  update(dt, player, world) {
    this.idleAnimation += dt * 2;

    if (this.reachedDestination) return;

    if (!this.following) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < TILE_SIZE * 2) {
        this.following = true;
      }
      return;
    }

    const targetX = player.x;
    const targetY = player.y;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > TILE_SIZE * 1.5) {
      const speed = TILE_SIZE * 2 * dt;
      const moveX = (dx / dist) * Math.min(speed, Math.abs(dx));
      const moveY = (dy / dist) * Math.min(speed, Math.abs(dy));

      const newX = this.x + moveX;
      const newY = this.y + moveY;

      const tileX = Math.floor(newX / TILE_SIZE);
      const tileY = Math.floor(newY / TILE_SIZE);

      if (!world.isSolid(tileX, Math.floor(this.y / TILE_SIZE))) {
        this.x = newX;
      }
      if (!world.isSolid(Math.floor(this.x / TILE_SIZE), tileY)) {
        this.y = newY;
      }
    }

    if (this.quest.target.destination) {
      const dest = this.quest.target.destination;
      const destX = dest.x * TILE_SIZE + TILE_SIZE / 2;
      const destY = dest.y * TILE_SIZE + TILE_SIZE / 2;

      const distToDest = Math.sqrt(
        Math.pow(this.x - destX, 2) + Math.pow(this.y - destY, 2)
      );

      if (distToDest < TILE_SIZE * 2) {
        this.reachedDestination = true;
      }
    }
  }

  render(ctx, worldToScreen) {
    const screen = worldToScreen(this.x, this.y);
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const bobY = Math.sin(this.idleAnimation) * 1.5;

    ctx.save();

    ctx.fillStyle = '#4A90D9';
    ctx.beginPath();
    ctx.roundRect(screen.x - halfW, screen.y - halfH + bobY, this.width, this.height, 4);
    ctx.fill();

    ctx.fillStyle = '#DEB887';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y - halfH * 0.3 + bobY, halfW * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(screen.x - halfW * 0.2, screen.y - halfH * 0.35 + bobY, 1.5, 0, Math.PI * 2);
    ctx.arc(screen.x + halfW * 0.2, screen.y - halfH * 0.35 + bobY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    if (!this.following) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❗', screen.x, screen.y - halfH - 8);
    }

    ctx.restore();
  }
}
