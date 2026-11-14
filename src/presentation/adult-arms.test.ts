import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type Phaser from 'phaser';
import { applyReaction } from './feedback';
import { artHeight, figureHeight } from './pose';

const sheet = readFileSync('public/art/adult.svg', 'utf8');
type P = { x: number; y: number };
/** The `d` of every path in the layer `id`. */
const paths = (id: string) => {
  const start = sheet.indexOf(`<g id="${id}"`), end = sheet.indexOf('</g>', start);
  return [...sheet.slice(start, end).matchAll(/<path d="([^"]+)"/g)].map(m => m[1]!);
};
type Segment = (n: number[], base: P, at: P, last: P) => { to: P; ctrl?: P };
const point = (base: P, x: number, y: number) => ({ x: base.x + x, y: base.y + y });
/** Where each path command goes (and its curve's control point), with how many numbers it takes. */
const segments: Record<string, [number, Segment]> = {
  M: [2, (n, b) => ({ to: point(b, n[0]!, n[1]!) })], L: [2, (n, b) => ({ to: point(b, n[0]!, n[1]!) })],
  H: [1, (n, b, at) => ({ to: { x: b.x + n[0]!, y: at.y } })], V: [1, (n, b, at) => ({ to: { x: at.x, y: b.y + n[0]! } })],
  Q: [4, (n, b) => ({ ctrl: point(b, n[0]!, n[1]!), to: point(b, n[2]!, n[3]!) })],
  T: [2, (n, b, at, last) => ({ ctrl: { x: 2 * at.x - last.x, y: 2 * at.y - last.y }, to: point(b, n[0]!, n[1]!) })],
};
/** A path's outline as closed polygons, each straight or curved segment sampled in eight steps. */
function outlines(d: string): P[][] {
  const shapes: P[][] = [];
  let at: P = { x: 0, y: 0 }, open = at, last = at;
  for (const [, command, args] of d.matchAll(/([a-zA-Z])([^a-zA-Z]*)/g)) {
    const c = command!.toUpperCase(), rel = command !== c, nums = (args!.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (c === 'Z') { at = last = open; continue; }
    const [size, segment] = segments[c]!;
    for (let k = 0; k < nums.length; k += size) {
      const { to, ctrl = { x: (at.x + to.x) / 2, y: (at.y + to.y) / 2 } } = segment(nums.slice(k, k + size), rel ? at : { x: 0, y: 0 }, at, last);
      if (c === 'M' && k === 0) { shapes.push([to]); open = to; } else shapes.at(-1)!.push(...curve(at, ctrl, to));
      last = ctrl; at = to;
    }
  }
  return shapes;
}
const curve = (from: P, ctrl: P, to: P) => Array.from({ length: 8 }, (_, s) => {
  const t = (s + 1) / 8, u = 1 - t;
  return { x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x, y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y };
});
const inside = (p: P, polygon: P[]) => polygon.reduce((odd, a, k) => {
  const b = polygon[(k + polygon.length - 1) % polygon.length]!;
  return (a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x ? !odd : odd;
}, false);
const outfits = ['adult-sol-m', 'adult-sol', 'adult-outing-m', 'adult-outing', 'adult-market', 'adult-office', 'adult-doctor', 'adult-firefighter', 'adult-police'];

it('o braço do adulto sai de dentro da manga: do ombro até a barra da manga, ele fica coberto pela roupa, em toda roupa de adulto', () => {
  // Row 126 is above the hem of every grown-up's sleeve (the dress's short sleeve ends lowest at 128).
  const shoulder = paths('hands').flatMap(outlines).flat().filter(p => p.y < 126);
  expect(shoulder.length).toBeGreaterThan(10);
  for (const outfit of outfits) {
    const garment = paths(outfit).flatMap(outlines);
    expect(shoulder.filter(p => !garment.some(g => inside(p, g))).map(p => `${outfit} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)).toEqual([]);
  }
});

it('com os braços para cima (palmas, viva, ombros), o braço do adulto continua preso ao ombro, como o da criança', () => {
  const raised = (id: string) => {
    const hands = { y: 0, flipY: false, setFlipY(v: boolean) { this.flipY = v; return this; }, setY(v: number) { this.y = v; return this; }, setCrop() { return this; } };
    const pose = { scaleX: 1, scaleY: 1, x: 0, y: 0, rotation: 0, data: {} as Record<string, unknown>, setScale() { return pose; },
      getData: (k: string) => pose.data[k], setData: (k: string, v: unknown) => { pose.data[k] = v; return pose; }, getByName: () => hands };
    const figure = { name: id, getData: (k: string) => k === 'arms' ? 1 : 0 };
    applyReaction(figure as unknown as Phaser.GameObjects.Container, pose as unknown as Phaser.GameObjects.Container);
    return hands;
  };
  // The arms hang from row 108 of the grown-up's sheet; drawn upside down (flipY turns them about the drawing's middle) they must still
  // start there.
  const daniel = { id: 'daniel' as const, kind: 'human' as const }, height = figureHeight(daniel), row = 108 * height / artHeight(daniel);
  const up = raised('daniel');
  expect(up.flipY).toBe(true);
  expect(height - row + up.y).toBeCloseTo(row, 0);
  expect(raised('bia').y).toBe(0);
});
