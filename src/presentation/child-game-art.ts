import type Phaser from 'phaser';
import { textStyle } from './text-style';
import { hopCells, ropeCue } from '../domain/child-games';
import type { ChildGame } from '../domain/child-games';
import type { ActorId, Point } from '../domain/types';
import { hopTiles } from './game-space';
const chalkOutlines = [0xe8735a, 0x2ba8a0, 0x3f6fc4, 0x6dae4f, 0x9b7bd0];
const tileCorners = (tile: { x: number; y: number }) => [{ x: tile.x - 47, y: tile.y + 10 }, { x: tile.x + 5, y: tile.y + 10 }, { x: tile.x + 47, y: tile.y - 10 }, { x: tile.x - 5, y: tile.y - 10 }];
export interface GamePreview { actor: ActorId; game: ChildGame; origin: Point; from: Point; point: Point; jumpedAt: number; feet: number }
export function gamePosition(value: GamePreview, now: number, reduced: boolean) {
  const progress = Math.min(1, Math.max(0, (now - value.jumpedAt) / 400));
  const t = reduced ? 1 : progress * progress * (3 - 2 * progress);
  return { x: value.from.x + (value.point.x - value.from.x) * t, y: value.from.y + (value.point.y - value.from.y) * t };
}

export function childGameArt(scene: Phaser.Scene) {
  let current: GamePreview | null = null;
  let ground: Phaser.GameObjects.Container | null = null, rope: Phaser.GameObjects.Graphics | null = null, glow: Phaser.GameObjects.Graphics | null = null;
  function paint(value: GamePreview | null) {
    ground?.destroy(); rope?.destroy(); ground = null; rope = null; glow = null; current = value;
    if (!value) return;
    if (value.game.kind === 'rope') { rope = scene.add.graphics().setDepth(value.point.y + 1); return; }
    ground = scene.add.container(value.origin.x, value.origin.y).setDepth(5);
    const active = hopCells(value.game), chalk = scene.add.graphics(); glow = scene.add.graphics(); ground.add([glow, chalk]);
    hopTiles.forEach(tile => {
      const corners = tileCorners(tile), on = active.includes(tile.cell);
      // White chalk with a coloured outline per square; the active square is solid sun with a thick dark outline (readable by luminance, not hue).
      chalk.fillStyle(on ? 0xf2b630 : 0xfbf8ee, on ? 1 : .92).fillPoints(corners, true);
      chalk.lineStyle(on ? 6 : 3, on ? 0x5a4a3d : chalkOutlines[(tile.cell - 1) % chalkOutlines.length]!).strokePoints(corners, true);
      if (on) glow!.lineStyle(10, 0xffffff, 1).strokePoints(corners, true);
      ground!.add(scene.add.text(tile.x, tile.y, String(tile.cell), textStyle('hopscotch')).setOrigin(.5));
    });
  }
  function animate(figure: Phaser.GameObjects.Container, now: number, reduced: boolean) {
    if (!current || figure.name !== current.actor) return;
    const value = current, progress = Math.min(1, Math.max(0, (now - value.jumpedAt) / 400));
    const position = gamePosition(value, now, reduced);
    glow?.setAlpha(reduced ? .8 : .45 + .45 * Math.sin(now / 180));
    figure.setPosition(position.x, position.y);
    figure.setDepth(figure.y + 1);
    const pose = figure.getByName<Phaser.GameObjects.Container>('pose');
    pose.rotation = 0;
    pose.y = reduced ? 0 : -Math.sin(progress * Math.PI) * 28;
    const knees = pose.getByName<Phaser.GameObjects.Container>('knees');
    knees.list.forEach(part => {
      const leg = part as Phaser.GameObjects.Image, side = Number(leg.getData('side'));
      leg.x = value.feet === 2 ? (side ? 8 : -8) : 0;
      if (value.game.kind === 'hopscotch' && value.feet === 1 && side === 1) leg.y -= 12;
    });
    if (rope) drawRope(rope, value, now, pose.y, reduced);
  }
  return { paint, animate };
}

function drawRope(rope: Phaser.GameObjects.Graphics, value: GamePreview, now: number, rise: number, reduced: boolean) {
  const phase = (now - value.game.started) / 1600 * Math.PI * 2;
  const reach = reduced ? 50 : Math.cos(phase) * 85 - 30;
  const center = { x: value.point.x, y: value.point.y - 55 + rise };
  rope.setDepth(value.point.y + (reach > 0 ? 2 : -1));
  rope.clear().lineStyle(6, ropeCue(value.game, now) ? 0x549383 : 0xb8795c);
  rope.beginPath(); rope.moveTo(center.x - 29, center.y);
  for (let i = 1; i <= 24; i++) {
    const angle = i / 24 * Math.PI;
    rope.lineTo(center.x - Math.cos(angle) * 43, center.y + Math.sin(angle) * reach);
  }
  rope.strokePath();
}
