import type Phaser from 'phaser';
import type { Point } from '../domain/types';
import { staffLooks } from './staff-art';
import { staffScale } from './staff-figure';
import { artPoint } from './staff-effects';
import { writeWindow } from './board-content';

/** The teacher's arm in her art (140 × 264): shoulder, and the upper arm and forearm, a little long so the chalk reaches the board. */
const arm = { shoulder: { x: 97, y: 108 }, upper: 36, fore: 34, chalk: 9 };
const sleeve = { line: 0x9a7a32, fill: 0xe2b04a }, skinLine = 0x6b5440;
const skin = Number.parseInt(staffLooks.teacher.skin.slice(1), 16);
/** Elbow and hand of an arm from `shoulder` to `target` (two bones of `upper` and `fore`): the hand at the target when it reaches,
 *  else as far as the arm goes; the elbow bends below the line from the shoulder. */
export function armJoints(shoulder: Point, target: Point, upper: number, fore: number): { elbow: Point; hand: Point } {
  const dx = target.x - shoulder.x, dy = target.y - shoulder.y, d = Math.min(Math.hypot(dx, dy), upper + fore - .001);
  const a = Math.atan2(dy, dx), cos = Math.max(-1, Math.min(1, (upper * upper + d * d - fore * fore) / (2 * upper * d || 1)));
  const bend = Math.acos(cos), sign = Math.cos(a) < 0 ? -1 : 1;
  const elbow = { x: shoulder.x + upper * Math.cos(a + sign * bend), y: shoulder.y + upper * Math.sin(a + sign * bend) };
  const reaches = Math.hypot(dx, dy) <= upper + fore;
  return { elbow, hand: reaches ? target : { x: shoulder.x + d * Math.cos(a), y: shoulder.y + d * Math.sin(a) } };
}
/** Where she stands to write at `chalk` (scene units): to its right, on the side not written yet, at the back of the floor (`floor`),
 *  as far aside as her arm allows, so her body covers as little of the board as it can. */
export function standFor(chalk: Point, floor: number, k: number): Point {
  const up = floor - (264 - arm.shoulder.y) * k - chalk.y, reach = (arm.upper + arm.fore) * k * .92;
  const aside = Math.min(46, Math.max(10, Math.sqrt(Math.max(0, reach * reach - up * up))));
  return { x: chalk.x + aside + (arm.shoulder.x - 70) * k, y: floor };
}
const walkMs = writeWindow.start;
const ease = (t: number) => t * t * (3 - 2 * t);
/** Her place `t` ms after she sets off for the board: from her own place (`from`) in the first 1.5 s, or fading in at the board
 *  when she has none; already there with reduced motion. */
export function writerAt(from: Point | null, stand: Point, t: number, reduced: boolean): Point & { alpha: number } {
  const f = reduced ? 1 : ease(Math.min(1, Math.max(0, t / walkMs)));
  if (!from) return { ...stand, alpha: f };
  return { x: from.x + (stand.x - from.x) * f, y: from.y + (stand.y - from.y) * f, alpha: 1 };
}
/** What the writer does this frame: where she is, facing the board (-1: left), and the chalk's point (null: arm resting). */
export interface WriterPose extends Point { alpha: number; chalk: Point | null; bob: number }
/** The teacher who writes the lesson on the board (lot 8D): her body drawn like the school's teacher, and an arm that holds the chalk
 *  and follows it, stroke by stroke. Redrawn after each repaint. */
export function lessonWriter(scene: Phaser.Scene) {
  let body: Phaser.GameObjects.Image | null = null, limb: Phaser.GameObjects.Graphics | null = null;
  return {
    /** After a repaint (every object was destroyed): the figure again, hidden until the next frame places it. */
    paint(shown: boolean) {
      body = limb = null;
      if (!shown || !scene.textures.exists('staff-teacher-body')) return;
      const k = staffScale();
      body = scene.add.image(0, 0, 'staff-teacher-body').setOrigin(.5, 1).setDisplaySize(140 * k, 264 * k).setVisible(false).setName('lesson-writer');
      limb = scene.add.graphics().setVisible(false);
    },
    frame(pose: WriterPose | null) {
      if (!body?.scene || !limb?.scene) return;
      body.setVisible(!!pose); limb.setVisible(!!pose); limb.clear();
      if (!pose) return;
      const k = staffScale(), side = -1, at = { x: pose.x, y: pose.y, side, k };
      body.setPosition(pose.x, pose.y - pose.bob).setScale(side * Math.abs(body.scaleX), body.scaleY).setAlpha(pose.alpha).setDepth(pose.y);
      limb.setAlpha(pose.alpha).setDepth(pose.y + .5);
      const shoulder = artPoint({ ...at, y: at.y - pose.bob }, arm.shoulder.x, arm.shoulder.y);
      const rest = { x: shoulder.x + 6 * k, y: shoulder.y + 62 * k };
      drawArm(limb, shoulder, pose.chalk, rest, k);
    },
  };
}
/** The arm: the sleeve (outlined), the hand and, when writing, the chalk between the fingers touching the board at `chalk`. */
function drawArm(g: Phaser.GameObjects.Graphics, shoulder: Point, chalk: Point | null, rest: Point, k: number) {
  const reach = chalk ? { x: chalk.x + arm.chalk * k * .5, y: chalk.y + arm.chalk * k * .85 } : rest;
  const { elbow, hand } = armJoints(shoulder, reach, arm.upper * k, arm.fore * k);
  for (const [width, color] of [[17 * k, sleeve.line], [14 * k, sleeve.fill]] as const) {
    g.lineStyle(width, color, 1).lineBetween(shoulder.x, shoulder.y, elbow.x, elbow.y).lineBetween(elbow.x, elbow.y, hand.x, hand.y);
    g.fillStyle(color, 1).fillCircle(elbow.x, elbow.y, width / 2).fillCircle(shoulder.x, shoulder.y, width / 2);
  }
  if (chalk) g.lineStyle(4.5 * k, 0xfffdf7, 1).lineBetween(hand.x, hand.y, chalk.x, chalk.y);
  g.fillStyle(skin, 1).lineStyle(1.4, skinLine, 1).fillCircle(hand.x, hand.y, 6.5 * k).strokeCircle(hand.x, hand.y, 6.5 * k);
}
