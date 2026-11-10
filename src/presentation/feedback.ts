import type Phaser from 'phaser';
import type { Point } from '../domain/types';
import type { ReactionPose } from '../content/personalities';
import { bubbleExit, reducedMotion } from './motion';
import { hex, palette } from './palette';
import { textStyle } from './text-style';

type Container = Phaser.GameObjects.Container;
const bubbles = new WeakMap<Phaser.Scene, Map<string, Container>>();
export const bubbleDuration = (text: string) => 1800 + 60 * text.length;

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

/** A refusal: gentle shake of whoever tried, and a neutral bubble near the target. Never a red "×". */
export function refuseAt(scene: Phaser.Scene, point: Point, text: string, figure?: Container, face?: string) {
  speechBubble(scene, point, text, 'refusal', 'neutral', face);
  if (!figure || reducedMotion()) return;
  const state = { x: -1 };
  scene.tweens.add({ targets: state, x: 1, duration: 70, yoyo: true, repeat: 2, onUpdate: () => figure.setData('shake', state.x * 4), onComplete: () => figure.setData('shake', 0) });
}

const poses: Record<ReactionPose, (t: number) => { hop?: number; tilt?: number; shake?: number; squash?: number }> = {
  hop: t => ({ hop: -Math.sin(t * Math.PI) * 22, squash: Math.sin(t * Math.PI * 2) * .06 }),
  wiggle: t => ({ tilt: Math.sin(t * Math.PI * 4) * .12 * (1 - t) }),
  stretch: t => ({ squash: Math.sin(t * Math.PI) * .08 }),
  purr: t => ({ shake: Math.sin(t * Math.PI * 16) * 1.5, tilt: Math.sin(t * Math.PI) * .05 }),
};
/** Presentation-only touch reaction: no dispatch, nothing saved, walking untouched. */
export function pokeFigure(scene: Phaser.Scene, figure: Container, pose: ReactionPose, line: string, height: number) {
  scene.game.canvas.dataset.reaction = `${figure.name}:${line}`;
  if (line) speechBubble(scene, { x: figure.x, y: figure.y - height - 8 }, line, figure.name);
  if (reducedMotion()) return;
  const state = { t: 0 };
  const write = (value: ReturnType<typeof poses.hop>) => ['hop', 'tilt', 'shake', 'squash'].forEach(k => figure.setData(k, value[k as keyof typeof value] ?? 0));
  scene.tweens.add({ targets: state, t: 1, duration: 360, ease: 'Sine.Out', onUpdate: () => write(poses[pose](state.t)), onComplete: () => write({}) });
}

/** Called every frame after the base pose is set: layers the touch reaction or shake on top. */
export function applyReaction(figure: Container, pose: Container) {
  const base = Number(pose.getData('baseScale') ?? pose.scaleX); pose.setData('baseScale', base);
  const squash = Number(figure.getData('squash') ?? 0);
  pose.setScale(base * (1 - squash / 2), base * (1 + squash));
  pose.x += Number(figure.getData('shake') ?? 0);
  pose.y += Number(figure.getData('hop') ?? 0);
  pose.rotation += Number(figure.getData('tilt') ?? 0);
}
