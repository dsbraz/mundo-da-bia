import type Phaser from 'phaser';
import type { Point } from '../domain/types';
import type { ReactionPose } from '../content/personalities';
import { bubbleExit, reducedMotion } from './motion';
import { hex, palette } from './palette';
import { textStyle } from './text-style';

type Container = Phaser.GameObjects.Container;
const bubbles = new WeakMap<Phaser.Scene, Map<string, Container>>();
export const bubbleDuration = (text: string) => 1800 + 60 * text.length;
/** Whether `owner`'s speech bubble is up (the room's thought bubble waits for it, lot 6B). */
export const speaking = (scene: Phaser.Scene, owner: string) => bubbles.get(scene)?.get(owner)?.active === true;

/** The single speech bubble of `owner` (an actor id or a place), drawn near the touch. */
const tones = { happy: { color: palette.plum, fill: 'bubbleBg' }, neutral: { color: palette.chalk, fill: 'card' } } as const;
const facePortrait = (scene: Phaser.Scene, face?: string) => face && scene.textures.exists(`face-${face}`) ? scene.add.image(0, -34, `face-${face}`).setDisplaySize(56, 56) : null;
/** Visible world rectangle of the scene camera. */
const shown = (scene: Phaser.Scene) => { const c = scene.cameras.main; return { left: c.scrollX, right: c.scrollX + c.width / c.zoom, top: c.scrollY }; };
const tail = 14;
/** Where a bubble sits: the tail tip on `anchor`, the box above it, slid sideways to stay whole in `view` with the tail still pointing. */
export function bubblePlace(anchor: Point, width: number, height: number, view: { left: number; right: number }) {
  const half = width / 2, low = view.left + half + 8, x = Math.min(Math.max(anchor.x, low), Math.max(low, view.right - half - 8));
  return { x, base: Math.max(-half + 24, Math.min(half - 24, anchor.x - x)), tip: anchor.x - x, center: -tail - height / 2 };
}
/** Label (and portrait at the start) centred on the bubble box. */
function arrange(label: Phaser.GameObjects.Text, portrait: Phaser.GameObjects.Image | null, width: number, center: number) {
  label.setY(center);
  if (portrait) { portrait.setPosition(-width / 2 + 44, center); label.setX(32); }
}
/** `face` (an actor id) puts that character's portrait at the start of the bubble: "who is there" without reading. */
export function speechBubble(scene: Phaser.Scene, anchor: Point, text: string, owner: string, tone: 'happy' | 'neutral' = 'happy', face?: string) {
  const owned = bubbles.get(scene) ?? new Map<string, Container>(); bubbles.set(scene, owned);
  const previous = owned.get(owner);
  if (previous?.active) previous.destroy();
  const look = tones[tone];
  const label = scene.add.text(0, 0, text, textStyle('bubble', { color: look.color, wordWrap: { width: 340 } })).setOrigin(.5);
  const portrait = facePortrait(scene, face), room = portrait ? 64 : 0;
  const width = label.width + 32 + room, height = Math.max(label.height, room) + 18, place = bubblePlace(anchor, width, height, shown(scene));
  arrange(label, portrait, width, place.center);
  const shape = scene.add.graphics(), top = place.center - height / 2;
  shape.fillStyle(hex(look.fill)).fillRoundedRect(-width / 2, top, width, height, 18).fillTriangle(place.base - 10, -tail - 1, place.base + 10, -tail - 1, place.tip, 0);
  shape.lineStyle(1.5, hex('outline'), .6).strokeRoundedRect(-width / 2, top, width, height, 18);
  const bubble = scene.add.container(place.x, anchor.y, portrait ? [shape, portrait, label] : [shape, label]).setDepth(1100);
  owned.set(owner, bubble);
  const reduced = reducedMotion();
  if (!reduced) scene.tweens.add({ targets: bubble, scaleX: { from: .6, to: 1 }, scaleY: { from: .6, to: 1 }, duration: 160, ease: 'Back.Out' });
  scene.tweens.add({ targets: bubble, ...bubbleExit(anchor.y, 18, bubbleDuration(text), reduced), onComplete: () => bubble.destroy() });
  const box = [place.x - width / 2, anchor.y + top, width, height].map(Math.round).join(',');
  Object.assign(scene.game.canvas.dataset, { said: text, saidX: String(Math.round(anchor.x)), saidFace: portrait ? face : '', saidBox: box });
  return bubble;
}

/** Where a figure's line starts (offset from its feet): at its usual place `head`, but for whoever is selected over the star drawn at
 *  `star` above the name tag (lot 6B: the line never covers the name). */
export const speechTop = (head: number, star?: number) => Math.min(head, star === undefined ? 0 : star - 22);
/** A refusal: gentle shake of whoever tried, and a neutral bubble near the target. Never a red "×". */
type PoseFrame = { hop?: number; tilt?: number; shake?: number; squash?: number; arms?: number };
const poses: Record<ReactionPose, (t: number) => PoseFrame> = {
  hop: t => ({ hop: -Math.sin(t * Math.PI) * 22, squash: Math.sin(t * Math.PI * 2) * .06 }),
  wiggle: t => ({ tilt: Math.sin(t * Math.PI * 4) * .12 * (1 - t) }),
  stretch: t => ({ squash: Math.sin(t * Math.PI) * .08 }),
  purr: t => ({ shake: Math.sin(t * Math.PI * 16) * 1.5, tilt: Math.sin(t * Math.PI) * .05 }),
  // A spectator claps: three small bounces with the hands up.
  clap: t => ({ hop: -Math.abs(Math.sin(t * Math.PI * 3)) * 8, arms: 1 }),
  // The end of the hopscotch: arms up and one big jump.
  cheer: t => ({ hop: -Math.sin(t * Math.PI) * 26, squash: Math.sin(t * Math.PI * 2) * .05, arms: 1 }),
  // A funny face after a miss: a wobbly shake of the head.
  goof: t => ({ tilt: Math.sin(t * Math.PI * 6) * .1 * (1 - t), shake: Math.sin(t * Math.PI * 10) * 2 * (1 - t) }),
  // Something is missing: palms up, shoulders in, a small tilt of the head (W3L-02).
  shrug: t => ({ arms: t > .1 && t < .85 ? 1 : 0, squash: -Math.sin(t * Math.PI) * .04, tilt: Math.sin(t * Math.PI) * .06 }),
};
const poseMs: Partial<Record<ReactionPose, number>> = { clap: 700, cheer: 900, goof: 600, shrug: 400 };
const stillArms: ReactionPose[] = ['cheer', 'shrug'];
const frameKeys = ['hop', 'tilt', 'shake', 'squash', 'arms'] as const;
/** Presentation-only touch reaction: no dispatch, nothing saved, walking untouched. With reduced motion only the bubble (and the face)
 *  shows, and a cheer or a shrug keeps the arms up for a moment, without moving. */
export function pokeFigure(scene: Phaser.Scene, figure: Container, pose: ReactionPose, line: string, height: number) {
  scene.game.canvas.dataset.reaction = `${figure.name}:${line}`;
  if (line) speechBubble(scene, { x: figure.x, y: figure.y + speechTop(-height - 8, figure.getByName<Container>('selection-star')?.y) }, line, figure.name);
  const write = (value: PoseFrame) => frameKeys.forEach(k => figure.setData(k, value[k] ?? 0));
  const duration = poseMs[pose] ?? 360;
  if (reducedMotion()) { if (stillArms.includes(pose)) { write({ arms: 1 }); scene.time.delayedCall(duration, () => write({})); } return; }
  const state = { t: 0 };
  scene.tweens.add({ targets: state, t: 1, duration, ease: 'Sine.Out', onUpdate: () => write(poses[pose](state.t)), onComplete: () => write({}) });
  if (pose === 'cheer') chalkConfetti(scene, { x: figure.x, y: figure.y - height }, duration);
}
const chalk = [0xe8735a, 0x2ba8a0, 0x3f6fc4, 0x6dae4f, 0x9b7bd0, 0xf2b630];
/** Chalk confetti over a celebrating child (never with reduced motion: no particles). */
function chalkConfetti(scene: Phaser.Scene, top: Point, duration: number) {
  const bits = scene.add.graphics({ x: top.x, y: top.y }).setDepth(1095);
  for (let i = 0; i < 14; i++) bits.fillStyle(chalk[i % chalk.length]!).fillRect(Math.cos(i * 2.4) * (30 + i * 4), -10 - (i % 4) * 12, 7, 4);
  scene.game.canvas.dataset.confetti = 'on';
  scene.tweens.add({ targets: bits, y: top.y + 90, alpha: 0, duration, ease: 'Sine.In', onComplete: () => { bits.destroy(); scene.game.canvas.dataset.confetti = ''; } });
}

/** Called every frame after the base pose is set: layers the touch reaction or shake on top. */
export function applyReaction(figure: Container, pose: Container) {
  const base = Number(pose.getData('baseScale') ?? pose.scaleX); pose.setData('baseScale', base);
  const squash = Number(figure.getData('squash') ?? 0);
  pose.setScale(base * (1 - squash / 2), base * (1 + squash));
  const lean = Number(figure.getData('lean') ?? 0);
  pose.x += Number(figure.getData('shake') ?? 0) + lean;
  pose.y += Number(figure.getData('hop') ?? 0);
  pose.rotation += Number(figure.getData('tilt') ?? 0) + lean * .003;
  const hands = pose.getByName<Phaser.GameObjects.Image>('hands');
  hands?.setFlipY(Number(figure.getData('arms') ?? 0) > .5);
  hugArm(hands, Number(figure.getData('hugSide') ?? 0));
}
/** In a hug (lot 6B) the arm on the partner's side goes around them: the hanging one on that side is not drawn. */
function hugArm(hands: Phaser.GameObjects.Image | null, side: number) {
  if (hands && side) hands.setCrop(side > 0 ? 0 : hands.width / 2, 0, hands.width / 2, hands.height);
}
