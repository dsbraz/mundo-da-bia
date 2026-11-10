import type Phaser from 'phaser';
import type { Point } from '../domain/types';
import { reducedFadeMs, reducedMotion } from './motion';
import { hex } from './palette';

export const heartDuration = 1100;
const pop = 160, fadeFrom = 750, rise = 28;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
/** The heart after a meal at `t` ms: pops in, floats up and fades out. Reduced motion: only a 120 ms fade in and out. */
export function heartFrame(t: number, reduced: boolean) {
  if (reduced) return { alpha: clamp(Math.min(t, heartDuration - t) / reducedFadeMs), rise: 0, scale: 1 };
  const k = clamp(t / heartDuration), grow = clamp(t / pop);
  return { alpha: t < fadeFrom ? 1 : clamp((heartDuration - t) / (heartDuration - fadeFrom)), rise: rise * Math.sin(k * Math.PI / 2), scale: .6 + .4 * grow + (grow < 1 ? 0 : .06 * Math.sin((t - pop) / 90)) * (1 - k) };
}
/** A drawn heart (no glyph) above whoever just ate; it never stays on screen. */
export function showHeart(scene: Phaser.Scene, id: string, head: Point) {
  const heart = scene.add.graphics().setDepth(1090).setPosition(head.x, head.y);
  heart.fillStyle(hex('coral')).fillCircle(-6, -4, 7).fillCircle(6, -4, 7).fillTriangle(-12.5, -1, 12.5, -1, 0, 13);
  heart.lineStyle(1.5, hex('actorOutline'), .5).strokeCircle(-6, -4, 7).strokeCircle(6, -4, 7);
  const reduced = reducedMotion(), clock = { t: 0 }, dataset = scene.game.canvas.dataset;
  const place = () => { const f = heartFrame(clock.t, reduced); heart.setAlpha(f.alpha).setScale(f.scale).setY(head.y - f.rise); };
  place(); dataset.heart = id;
  scene.tweens.add({ targets: clock, t: heartDuration, duration: heartDuration, onUpdate: place, onComplete: () => { heart.destroy(); if (dataset.heart === id) dataset.heart = ''; } });
}
