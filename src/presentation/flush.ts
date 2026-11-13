import type Phaser from 'phaser';
import type { Piece } from '../domain/types';
import { reducedFadeMs, reducedMotion } from './motion';
import { pieceDepth } from './piece-art';

export const flushDuration = 1100;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
/** The water in the bowl at `t` ms: it turns one and a half times, shrinks to the middle and fades at the end. Reduced motion: a still
 *  swirl that only fades in and out (120 ms). */
export function flushFrame(t: number, reduced: boolean) {
  if (reduced) return { alpha: clamp(Math.min(t, flushDuration - t) / reducedFadeMs), turn: 0, size: 1 };
  const k = clamp(t / flushDuration);
  return { alpha: t < 800 ? 1 : clamp((flushDuration - t) / (flushDuration - 800)), turn: k * Math.PI * 3, size: 1 - .5 * k };
}
/** The toilet's flush: a drawn swirl of water in the bowl (the toilet art's water, at 55, 94), never text; it never stays. */
export function showFlush(scene: Phaser.Scene, piece: Piece) {
  const swirl = scene.add.graphics().setDepth(pieceDepth(piece) + 1).setPosition(piece.x + 55, piece.y + 94).setScale(1, .26);
  const reduced = reducedMotion(), clock = { t: 0 }, dataset = scene.game.canvas.dataset;
  const draw = () => {
    const f = flushFrame(clock.t, reduced);
    swirl.clear().setAlpha(f.alpha).fillStyle(0x7cc3dc, .7).fillCircle(0, 0, 11 * f.size);
    for (let arm = 0; arm < 3; arm++) {
      const from = f.turn + arm * Math.PI * 2 / 3;
      swirl.lineStyle(4, arm ? 0x4f9fc0 : 0xffffff, .9).beginPath().arc(0, 0, 24 * f.size, from, from + 1.7).strokePath();
    }
  };
  draw(); dataset.flush = String(piece.id);
  scene.tweens.add({ targets: clock, t: flushDuration, duration: flushDuration, onUpdate: draw, onComplete: () => { swirl.destroy(); dataset.flush = ''; } });
}
