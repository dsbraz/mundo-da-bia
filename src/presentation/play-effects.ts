import type Phaser from 'phaser';
import type { PieceKind } from '../domain/types';
import { hex } from './palette';

type Graphics = Phaser.GameObjects.Graphics;
/** Three notes that rise about 40 px, drift right and fade, one after the other; still and half-risen with reduced motion. */
export function noteFrame(time: number, reduced: boolean) {
  return Array.from({ length: 3 }, (_, i) => {
    const k = reduced ? .35 : (time / 1600 + i / 3) % 1;
    return { dx: (i - 1) * 14 + k * 10, rise: k * 40, alpha: reduced ? .9 : Math.min(1, (1 - k) * 2) };
  });
}
/** The TV's signal: three arcs that grow outward and fade (W3L-09, instead of a text sign); all three still with reduced motion. */
export function waveFrame(time: number, reduced: boolean) {
  return Array.from({ length: 3 }, (_, i) => {
    const k = reduced ? (i + 1) / 4 : (time / 1200 + i / 3) % 1;
    return { radius: 10 + k * 26, alpha: reduced ? .8 : 1 - k };
  });
}
function note(g: Graphics, x: number, y: number, color: number, alpha: number) {
  g.fillStyle(color, alpha).fillEllipse(x, y, 11, 8).lineStyle(2.5, color, alpha).lineBetween(x + 5, y, x + 5, y - 16).lineBetween(x + 5, y - 16, x + 11, y - 11);
}
function notes(g: Graphics, x: number, y: number, time: number, reduced: boolean) {
  const colors = [hex('cobalt'), hex('coral'), hex('lilac')];
  noteFrame(time, reduced).forEach((n, i) => note(g, x + n.dx, y - n.rise, colors[i]!, n.alpha));
}
/** Foam bubbles bobbing on the bath's rim. */
function foam(g: Graphics, time: number, reduced: boolean) {
  for (let i = 0; i < 7; i++) {
    const bob = reduced ? 0 : Math.sin(time / 300 + i * 1.7) * 3;
    g.fillStyle(0xffffff, .9).fillCircle(48 + i * 24, 44 + bob - (i % 2) * 6, 9 + (i % 3) * 2).lineStyle(1.5, 0x8fbfd2, .8).strokeCircle(48 + i * 24, 44 + bob - (i % 2) * 6, 9 + (i % 3) * 2);
  }
}
/** The drawn effects of the playroom and workshop pieces when on: they replace the old text signs (♫, ◦ ○, ✦). */
export const playPainters: Partial<Record<PieceKind, (g: Graphics, time: number, reduced: boolean) => void>> = {
  speaker(g, time, reduced) { notes(g, 32, -4, time, reduced); },
  piano(g, time, reduced) { notes(g, 70, -6, time, reduced); notes(g, 150, -10, time + 800, reduced); },
  tv(g, time, reduced) { for (const w of waveFrame(time, reduced)) g.lineStyle(3.5, hex('turquoise'), w.alpha).beginPath().arc(100, 46, w.radius, Math.PI * 1.2, Math.PI * 1.8).strokePath(); },
  aquarium(g, time, reduced) {
    for (let i = 0; i < 5; i++) {
      const k = reduced ? i / 6 : (time / 1500 + i / 5) % 1, x = 60 + i * 14 + (reduced ? 0 : Math.sin(time / 260 + i) * 3), y = 120 - k * 70;
      g.fillStyle(0xffffff, .65 * (1 - k * .6)).fillCircle(x, y, 3 + (i % 3)).lineStyle(1.5, 0x7fb3c9, 1 - k * .6).strokeCircle(x, y, 3 + (i % 3));
    }
  },
  bath: foam,
  desk(g, time, reduced) {
    const k = reduced ? 1 : (time / 1800) % 1;
    g.fillStyle(0xfffdf7).fillRect(70, 18, 56, 30).lineStyle(1.5, hex('outline'), .8).strokeRect(70, 18, 56, 30).lineStyle(2.5, hex('coral')).beginPath();
    for (let s = 0; s <= Math.round(k * 12); s++) { const px = 76 + s * 3.6, py = 33 + Math.sin(s * 1.3) * 6; if (s) g.lineTo(px, py); else g.moveTo(px, py); }
    g.strokePath();
  },
  'reading-lamp'(g, time, reduced) { g.fillStyle(hex('sun'), reduced ? .22 : .18 + .06 * Math.sin(time / 500)).fillTriangle(50, 40, 6, 150, 94, 150); },
};
