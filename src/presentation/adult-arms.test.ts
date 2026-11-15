import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type Phaser from 'phaser';
import { applyReaction } from './feedback';
import { artHeight, figureHeight, handAnchor, raisedHand } from './pose';
import { inside, outlines } from './svg-outline.test-kit';

const sheet = readFileSync('public/art/adult.svg', 'utf8');
/** The `d` of every path in the layer `id`. */
const paths = (id: string) => {
  const start = sheet.indexOf(`<g id="${id}"`), end = sheet.indexOf('</g>', start);
  return [...sheet.slice(start, end).matchAll(/<path d="([^"]+)"/g)].map(m => m[1]!);
};
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
