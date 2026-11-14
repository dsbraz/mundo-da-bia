import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type Phaser from 'phaser';
import { applyReaction } from './feedback';
import { artHeight, figureHeight, handAnchor, raisedHand } from './pose';

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
const outfits = ['adult-sol-m', 'adult-sol', 'adult-sol-y', 'adult-outing-m', 'adult-outing', 'adult-outing-y', 'adult-market', 'adult-office', 'adult-doctor', 'adult-firefighter', 'adult-police'];
/** The centre of every circle and ellipse of the layer: the sleeves' round shoulders and the hands. */
const circles = (id: string) => {
  const start = sheet.indexOf(`<g id="${id}"`), end = sheet.indexOf('</g>', start);
  return [...sheet.slice(start, end).matchAll(/<(?:circle|ellipse) c[xy]="([\d.]+)" c[xy]="([\d.]+)"/g)].map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
};

it('lote 8B: o braço do adulto é desenhado sobre a roupa, com a manga, e nasce dentro do tronco (como o dos profissionais), em toda roupa', () => {
  for (const outfit of outfits) {
    const torso = paths(outfit).flatMap(outlines), arms = paths(`${outfit}-arms`);
    expect(arms.length, outfit).toBeGreaterThan(3);
    const shoulders = [...new Map(circles(`${outfit}-arms`).filter(c => c.y < 120).map(c => [`${c.x},${c.y}`, c])).values()];
    expect(shoulders.length, outfit).toBe(2);
    for (const s of shoulders) expect(torso.some(g => inside(s, g)), `${outfit} ${s.x},${s.y}`).toBe(true);
    // The torso has no sleeves of its own any more: nothing of it reaches out past the shoulders.
    expect(Math.min(...torso.flat().filter(p => p.y < 160).map(p => p.x)), outfit).toBeGreaterThanOrEqual(38);
  }
});

it('lote 8B: cada braço fica do seu lado (o gesto e o abraço cortam a imagem ao meio) e a mão pende à altura da coxa', () => {
  for (const outfit of outfits) {
    const hands = circles(`${outfit}-arms`).filter(c => c.y > 160);
    expect(hands.map(h => h.x < 70), outfit).toEqual([true, false]);
    for (const h of hands) { expect(h.y).toBeGreaterThan(178); expect(h.y).toBeLessThan(190); }
    for (const gesture of ['belly', 'cheek']) expect(paths(`${outfit}-${gesture}`).flatMap(outlines).flat().every(p => p.x > 70), `${outfit}-${gesture}`).toBe(true);
  }
});

it('lote 8B: com os braços para cima o adulto tem um desenho próprio (cotovelos abertos, mãos acima da cabeça), não o braço virado', () => {
  for (const outfit of outfits) {
    const hands = circles(`${outfit}-up`).filter(c => c.y < 70);
    expect(hands.map(h => h.x < 70), outfit).toEqual([true, false]);
  }
  const hands = { flipY: false, texture: { key: 'daniel-outing-hands' }, data: { arms: { down: 'daniel-outing-hands', up: 'daniel-outing-up' } } as Record<string, unknown>,
    getData(k: string) { return this.data[k]; }, setFlipY(v: boolean) { this.flipY = v; return this; }, setTexture(k: string) { this.texture = { key: k }; return this; }, setCrop() { return this; } };
  const pose = { scaleX: 1, scaleY: 1, x: 0, y: 0, rotation: 0, data: {} as Record<string, unknown>, setScale() { return pose; },
    getData: (k: string) => pose.data[k], setData: (k: string, v: unknown) => { pose.data[k] = v; return pose; }, getByName: () => hands };
  let arms = 1;
  const figure = { name: 'daniel', getData: (k: string) => k === 'arms' ? arms : 0 };
  applyReaction(figure as unknown as Phaser.GameObjects.Container, pose as unknown as Phaser.GameObjects.Container);
  expect(hands).toMatchObject({ flipY: false, texture: { key: 'daniel-outing-up' } });
  arms = 0; applyReaction(figure as unknown as Phaser.GameObjects.Container, pose as unknown as Phaser.GameObjects.Container);
  expect(hands.texture.key).toBe('daniel-outing-hands');
});

it('lote 8B: o que o adulto segura em pé fica na mão direita desenhada', () => {
  const daniel = { id: 'daniel' as const, kind: 'human' as const, x: 0, y: 0, room: 'sala' as const, seat: null, look: 'sol' as const, fed: true, resting: false };
  const hand = circles('adult-sol-m-arms').filter(c => c.y > 160)[1]!, k = figureHeight(daniel) / artHeight(daniel);
  const anchor = handAnchor(daniel);
  expect(anchor.x).toBeCloseTo((hand.x - 70) * k, 0);
  expect(anchor.y).toBeCloseTo(-(artHeight(daniel) - hand.y) * k, 0);
  const up = circles('adult-sol-m-up').filter(c => c.y < 70)[1]!;
  expect(raisedHand(daniel).x).toBeCloseTo((up.x - 70) * k, 0);
  expect(raisedHand(daniel).y).toBeCloseTo(-(artHeight(daniel) - up.y) * k, 0);
});
