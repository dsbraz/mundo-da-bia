import type Phaser from 'phaser';
import type { Piece } from '../domain/types';
import { reducedFadeMs, reducedMotion } from './motion';
import { pieceDepth } from './piece-art';

export const flushDuration = 1100;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
/** The water in the bowl at `t` ms: it turns one and a half times, shrinks to the middle and fades at the end, while three bubbles rise
 *  out of the bowl (`rise` 0 to 1). Reduced motion: a still swirl with the bubbles halfway up, that only fades in and out (120 ms). */
export function flushFrame(t: number, reduced: boolean) {
  if (reduced) return { alpha: clamp(Math.min(t, flushDuration - t) / reducedFadeMs), turn: 0, size: 1, rise: .5 };
  const k = clamp(t / flushDuration);
  return { alpha: t < 800 ? 1 : clamp((flushDuration - t) / (flushDuration - 800)), turn: k * Math.PI * 3, size: 1 - .45 * k, rise: k };
}
const bubbles = [{ x: -16, r: 5, lag: 0 }, { x: 4, r: 4, lag: .25 }, { x: 18, r: 6, lag: .45 }];
/** The toilet's flush: a bold drawn swirl of water in the bowl (the toilet art's water, at 55, 94) and a few bubbles over it, never text;
 *  it never stays. */
export function showFlush(scene: Phaser.Scene, piece: Piece) {
  const x = piece.x + 55, y = piece.y + 94, depth = pieceDepth(piece) + 1;
  const swirl = scene.add.graphics().setDepth(depth).setPosition(x, y).setScale(1, .3), foam = scene.add.graphics().setDepth(depth).setPosition(x, y);
  const reduced = reducedMotion(), clock = { t: 0 }, dataset = scene.game.canvas.dataset;
  const draw = () => {
    const f = flushFrame(clock.t, reduced);
    swirl.clear().setAlpha(f.alpha).fillStyle(0x2f86b0, .85).fillCircle(0, 0, 12 * f.size);
    for (let arm = 0; arm < 3; arm++) {
      const from = f.turn + arm * Math.PI * 2 / 3;
      swirl.lineStyle(7, arm ? 0x3b97c4 : 0xffffff, 1).beginPath().arc(0, 0, 25 * f.size, from, from + 1.9).strokePath();
    }
    foam.clear().setAlpha(f.alpha);
    for (const b of bubbles) {
      const up = clamp((f.rise - b.lag) / (1 - b.lag)) || (reduced ? f.rise : 0);
      if (up) foam.fillStyle(0xffffff, .9).fillCircle(b.x, -6 - up * 46, b.r).lineStyle(2, 0x3b97c4, 1).strokeCircle(b.x, -6 - up * 46, b.r);
    }
  };
  draw(); dataset.flush = String(piece.id);
  scene.tweens.add({ targets: clock, t: flushDuration, duration: flushDuration, onUpdate: draw, onComplete: () => { swirl.destroy(); foam.destroy(); dataset.flush = ''; } });
}
