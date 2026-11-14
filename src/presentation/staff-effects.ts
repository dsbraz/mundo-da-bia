import type Phaser from 'phaser';
import type { Profession } from '../domain/staff';
import type { Point } from '../domain/types';

/** How long the trade plays after a tap (lot 7). */
export const tradeMs = 1800;
/** Where the professional stands: feet, which way she faces (1 right, -1 left) and the art's scale. */
export interface Stand extends Point { side: number; k: number }
/** A point of the 140 × 264 art in the scene, the art's feet at the stand's point. */
export const artPoint = (at: Stand, x: number, y: number): Point => ({ x: at.x + (x - 70) * at.k * at.side, y: at.y + (y - 264) * at.k });
/** The point `s` (0 to 1) along the hose's arc of water, from the nozzle up and down onto the floor ahead. */
export function hoseArc(at: Stand, s: number): Point {
  const tip = artPoint(at, 141, 119);
  return { x: tip.x + at.side * s * 320 * at.k, y: tip.y - 150 * s * at.k + 290 * s * s * at.k };
}
/** The water of the hose: the jet grows out of the nozzle in 400 ms, with drops flowing along it (all of it, still, with reduced motion). */
export function hoseDrops(at: Stand, t: number, reduced: boolean): (Point & { r: number })[] {
  const reach = reduced ? 1 : Math.min(1, t / 400);
  return Array.from({ length: 16 }, (_, i) => {
    const s = (reduced ? (i + .5) / 16 : (t / 600 + i / 16) % 1) * reach;
    return { ...hoseArc(at, s), r: (8 - 3 * s) * at.k };
  });
}
function water(g: Phaser.GameObjects.Graphics, at: Stand, t: number, reduced: boolean) {
  const reach = reduced ? 1 : Math.min(1, t / 400), jet = Array.from({ length: 21 }, (_, i) => hoseArc(at, i / 20 * reach));
  g.lineStyle(9 * at.k, 0x9fd8f0, .75).strokePoints(jet);
  g.fillStyle(0xd8f1fa, .95).lineStyle(1.4, 0x3f8fb8, .9);
  hoseDrops(at, t, reduced).forEach(d => g.fillCircle(d.x, d.y, d.r).strokeCircle(d.x, d.y, d.r));
  if (reach < 1) return;
  const land = hoseArc(at, 1), wave = reduced ? .5 : (t % 500) / 500;
  g.fillStyle(0x9fd8f0, .55).fillEllipse(land.x, land.y + 4, 60 * at.k, 14 * at.k);
  [-1, 1].forEach(dir => g.fillStyle(0xd8f1fa, 1 - wave).fillCircle(land.x + dir * 18 * at.k * (1 + wave), land.y - 16 * at.k * Math.sin(wave * Math.PI), 4 * at.k));
}
function rays(g: Phaser.GameObjects.Graphics, c: Point, inner: number, outer: number, color: number, angles: readonly number[]) {
  g.lineStyle(3, color, .95);
  angles.forEach(a => g.lineBetween(c.x + Math.cos(a) * inner, c.y + Math.sin(a) * inner, c.x + Math.cos(a) * outer, c.y + Math.sin(a) * outer));
}
function heart(g: Phaser.GameObjects.Graphics, p: Point, size: number, alpha: number) {
  g.fillStyle(0xe8607a, alpha).lineStyle(1.5, 0xa83a50, alpha);
  g.fillCircle(p.x - size * .5, p.y, size * .55).fillCircle(p.x + size * .5, p.y, size * .55);
  g.fillTriangle(p.x - size * 1.02, p.y + size * .15, p.x + size * 1.02, p.y + size * .15, p.x, p.y + size * 1.3);
}
/** The whistle's sound: three short strokes ahead of the mouth, coming and going (steady with reduced motion). */
function whistle(g: Phaser.GameObjects.Graphics, at: Stand, t: number, reduced: boolean) {
  if (!reduced && Math.floor(t / 180) % 2) return;
  const a = at.side > 0 ? 0 : Math.PI;
  rays(g, artPoint(at, 92, 80), 10 * at.k, 28 * at.k, 0x3f5f8f, [a - .55, a - .18, a + .18, a + .55]);
}
/** One frame of the trade, `t` ms into it: the hose's water, the whistle, the doctor's hearts over the child, the stamp's sparkle,
 *  the chalk pointer's twinkle. */
export function drawTrade(g: Phaser.GameObjects.Graphics, profession: Profession, at: Stand, t: number, reduced: boolean, target: Point | null) {
  if (profession === 'firefighter') { water(g, at, t, reduced); return; }
  if (profession === 'police' || profession === 'coach') { whistle(g, at, t, reduced); return; }
  if (profession === 'doctor') hearts(g, target ?? artPoint(at, 70, 0), t, reduced);
  else if (profession === 'clerk') stamp(g, at, t, reduced);
  else sparkle(g, artPoint(at, 137, 14), t, reduced);
}
/** The clerk's stamp: a sheet of paper beside her, and after a moment the stamp's red heart printed on it. */
function stamp(g: Phaser.GameObjects.Graphics, at: Stand, t: number, reduced: boolean) {
  const sheet = artPoint(at, 160, 96), w = 44 * at.k, h = 56 * at.k;
  g.fillStyle(0xfffdf4, 1).lineStyle(1.6, 0x8a8478, 1).fillRect(sheet.x - w / 2, sheet.y - h / 2, w, h).strokeRect(sheet.x - w / 2, sheet.y - h / 2, w, h);
  g.lineStyle(1.4, 0xc8c2b4, 1); [-.3, -.15].forEach(f => g.lineBetween(sheet.x - w * .35, sheet.y + h * f, sheet.x + w * .35, sheet.y + h * f));
  if (reduced || t > 500) heart(g, { x: sheet.x, y: sheet.y + h * .05 }, 9 * at.k, 1);
  if (!reduced && t > 500 && t < 900) sparkle(g, sheet, t, false);
}
/** Hearts over the child the doctor listens to, once she is there (still with reduced motion). */
function hearts(g: Phaser.GameObjects.Graphics, over: Point, t: number, reduced: boolean) {
  const rise = reduced ? 0 : (t % 900) / 900;
  if (t > 400 || reduced) [-26, 0, 26].forEach((dx, i) => heart(g, { x: over.x + dx, y: over.y - 220 - 14 * i - rise * 30 }, 9 + 2 * (i % 2), 1 - rise * .6));
}
/** A twinkle at the tip of the tool (the chalk pointer, the stamp). */
function sparkle(g: Phaser.GameObjects.Graphics, tip: Point, t: number, reduced: boolean) {
  const pulse = reduced ? 1 : .6 + .4 * Math.abs(Math.sin(t / 160));
  rays(g, tip, 6 * pulse, 16 * pulse, 0xf2c84b, [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI / 4, Math.PI * 1.25]);
}
