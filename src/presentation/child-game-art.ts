import type Phaser from 'phaser';
import { textStyle } from './text-style';
import { hopCells, ropeCue } from '../domain/child-games';
import type { ChildGame } from '../domain/child-games';
import type { ActorId, Point } from '../domain/types';
import { hopTiles } from './game-space';
import { jumpFrame, type JumpFrame } from './jump-motion';
const chalkOutlines = [0xe8735a, 0x2ba8a0, 0x3f6fc4, 0x6dae4f, 0x9b7bd0];
const tileCorners = (tile: { x: number; y: number }) => [{ x: tile.x - 47, y: tile.y + 10 }, { x: tile.x + 5, y: tile.y + 10 }, { x: tile.x + 47, y: tile.y - 10 }, { x: tile.x - 5, y: tile.y - 10 }];
export interface GamePreview { actor: ActorId; game: ChildGame; origin: Point; from: Point; point: Point; jumpedAt: number; feet: number }
export function gamePosition(value: GamePreview, now: number, reduced: boolean) {
  const t = jumpFrame(now - value.jumpedAt, reduced).travel;
  return { x: value.from.x + (value.point.x - value.from.x) * t, y: value.from.y + (value.point.y - value.from.y) * t };
}

export function childGameArt(scene: Phaser.Scene) {
  let current: GamePreview | null = null;
  let dust: Phaser.GameObjects.Graphics | null = null;
  let ground: Phaser.GameObjects.Container | null = null, rope: Phaser.GameObjects.Graphics | null = null, glow: Phaser.GameObjects.Graphics | null = null;
  function paint(value: GamePreview | null) {
    ground?.destroy(); rope?.destroy(); dust?.destroy(); ground = null; rope = null; glow = null; dust = null; current = value;
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
    const value = current, jump = jumpFrame(now - value.jumpedAt, reduced);
    const position = gamePosition(value, now, reduced);
    glow?.setAlpha(reduced ? .8 : .45 + .45 * Math.sin(now / 180));
    figure.setPosition(position.x, position.y);
    figure.setDepth(figure.y + 1);
    const pose = figure.getByName<Phaser.GameObjects.Container>('pose');
    pose.rotation = 0;
    pose.y = -jump.lift;
    jumpBody(figure, pose, jump);
    scene.game.canvas.dataset.jump = jump.phase;
    dust = drawDust(scene, dust, position, jump);
    const knees = pose.getByName<Phaser.GameObjects.Container>('knees');
    knees.list.forEach(part => {
      const leg = part as Phaser.GameObjects.Image, side = Number(leg.getData('side'));
      leg.x = value.feet === 2 ? (side ? 8 : -8) : 0;
      if (value.game.kind === 'hopscotch' && value.feet === 1 && side === 1) leg.y -= 12;
    });
    if (rope) drawRope(rope, value, now, pose.y, reduced);
  }
  return { paint, animate, active: () => current !== null };
}

/** Crouch and landing: bent knees with the body lowered so the feet stay planted, plus a squash of at most 10%;
 *  the contact shadow shrinks while in the air. */
function jumpBody(figure: Phaser.GameObjects.Container, pose: Phaser.GameObjects.Container, jump: JumpFrame) {
  const base = Number(pose.getData('baseScale') ?? pose.scaleX), bend = Math.max(0, -jump.squash) / .08;
  pose.setScale(base * (1 - jump.squash / 2), base * (1 + jump.squash));
  const knees = pose.getByName<Phaser.GameObjects.Container>('knees');
  if (knees && bend) { knees.setScale(1, 1 - .4 * bend); pose.y += 60 * .4 * bend * pose.scaleY; }
  const shadow = figure.getByName<Phaser.GameObjects.Container>('shadow'), size = Number(shadow?.getData('base') ?? 1);
  shadow?.setScale(size * jump.shadow).setAlpha(.6 + .4 * jump.shadow);
}
/** Two little chalk puffs beside the feet that grow and fade after landing (never with reduced motion: dust stays 0). */
function drawDust(scene: Phaser.Scene, dust: Phaser.GameObjects.Graphics | null, feet: Point, jump: JumpFrame) {
  if (!jump.dust) { dust?.clear(); return dust; }
  const g = dust ?? scene.add.graphics(), spread = 14 + 16 * jump.dust;
  g.clear().setDepth(feet.y + 2).fillStyle(0xfbf8ee, .85 * (1 - jump.dust));
  for (const side of [-1, 1]) g.fillCircle(feet.x + side * spread, feet.y - 3 - 4 * jump.dust, 4 + 4 * jump.dust).fillCircle(feet.x + side * (spread + 9), feet.y - 1, 3 + 2 * jump.dust);
  return g;
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
