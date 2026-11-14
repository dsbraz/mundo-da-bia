import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type Phaser from 'phaser';
import { lookIds } from '../domain/types';
import { outfitLayer } from './outfit';
import { raiseSleeves, sleeveBand, sleeveCrops, sleeveHem } from './raised-sleeves';
import { inside, outlines } from './svg-outline.test-kit';

const human = readFileSync('src/presentation/assets/human.svg', 'utf8');
/** Every outline point of a child's garment layer, in the 140 × 220 canvas (the layers are drawn `translate(0 -25.68) scale(1 1.12)`). */
function garment(id: string) {
  const start = human.indexOf(`<g id="${id}"`), end = human.indexOf('</g>', start), group = human.slice(start, end);
  expect(group.slice(0, group.indexOf('>'))).toContain('translate(0 -25.68) scale(1 1.12)');
  return [...group.matchAll(/<path d="([^"]+)"/g)].flatMap(m => outlines(m[1]!)).flat().map(p => ({ x: p.x, y: p.y * 1.12 - 25.68 }));
}
const garments = [...new Set(lookIds.flatMap(look => [outfitLayer(look, false), outfitLayer(look, true)]))];
// Canvas units of the band (the raster is twice the canvas).
const band = { top: sleeveBand.top / 2, bottom: sleeveBand.bottom / 2, left: sleeveBand.left / 2, right: sleeveBand.right / 2 };

it('lote 8B: o que fica ao lado do tronco de cada roupa de criança é só a manga, entre o ombro e a barra: é ela que sobe com o braço', () => {
  expect(garments.length).toBeGreaterThan(20);
  for (const id of garments) {
    // Below the band (a skirt's flare) stays in the garment's own crop; above the shoulder nothing would show at all.
    const beside = garment(id).filter(p => p.x < band.left - .5 || p.x > band.right + .5);
    expect(beside.filter(p => p.y >= band.top && p.y <= band.bottom).length, `${id} sem manga`).toBeGreaterThan(0);
    expect(beside.filter(p => p.y < band.top - .5).map(p => `${id} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)).toEqual([]);
  }
});

it('com os braços para cima, a roupa mostra o tronco sem mangas e as duas mangas viradas para cima junto com o braço; para baixo, volta', () => {
  type Fake = { name: string; visible: boolean; crop: number[]; flipY: boolean; height: number; setVisible(v: boolean): Fake; setCrop(...c: number[]): Fake; setFlipY(f: boolean): Fake };
  const image = (name: string, visible = false): Fake => ({ name, visible, crop: [], flipY: false, height: 440,
    setVisible(v) { this.visible = v; return this; }, setCrop(...c) { this.crop = c; return this; }, setFlipY(f) { this.flipY = f; return this; } });
  const parts = [image('sol', true), image('raised-torso'), image('raised-sleeve-0'), image('raised-sleeve-1')];
  const data = new Map<string, unknown>([['outfit', { name: 'sol', knee: 320, hem: 290 }]]);
  const pose = { getData: (k: string) => data.get(k), setData: (k: string, v: unknown) => data.set(k, v), getByName: (n: string) => parts.find(p => p.name === n) };
  raiseSleeves(pose as unknown as Phaser.GameObjects.Container, true);
  expect(parts.map(p => p.visible)).toEqual([true, true, true, true]);
  expect(parts.map(p => p.crop)).toEqual([[0, 290, 280, 30], [80, 0, 120, 290], [0, 440 - 290, 80, 98], [200, 440 - 290, 80, 98]]);
  expect(parts.map(p => p.flipY)).toEqual([false, false, true, true]);
  // In a hug with someone on her right, the right sleeve leaves the garment (her arm goes round with it); the left one hangs as drawn.
  raiseSleeves(pose as unknown as Phaser.GameObjects.Container, false, 1);
  expect(parts.map(p => p.visible)).toEqual([true, true, true, false]);
  expect([parts[2]!.crop, parts[2]!.flipY]).toEqual([[0, 192, 80, 98], false]);
  raiseSleeves(pose as unknown as Phaser.GameObjects.Container, false);
  expect(parts.map(p => p.visible)).toEqual([true, false, false, false]);
  expect(parts[0]!.crop).toEqual([0, 0, 280, 320]);
  expect(sleeveCrops(-1, 320, 290, 440).sleeves).toEqual([null, [200, 192, 80, 98]]);
});

it('lote 8: as mangas acabam onde acaba o pano dos lados; dali para baixo a roupa vai inteira, e o lado do vestido não tem degrau na cintura', () => {
  const garments = [...new Set(lookIds.flatMap(look => [outfitLayer(look, false), outfitLayer(look, true)]))];
  for (const id of garments) {
    const start = human.indexOf(`<g id="${id}"`), group = human.slice(start, human.indexOf('</g>', start));
    const shapes = [...group.matchAll(/<path d="([^"]+)"/g)].flatMap(m => outlines(m[1]!)).map(g => g.map(p => ({ x: p.x * 2, y: (p.y * 1.12 - 25.68) * 2 })));
    const hem = sleeveHem((x, y) => shapes.some(g => inside({ x, y }, g)) ? 255 : 0), points = shapes.flat();
    // Every sleeve (cloth far out at the side, in the band) is above the hem; the dresses' sides (canvas x 38-39) start above the waist
    // row and go on below the hem, drawn whole.
    expect(points.filter(p => (p.x < 70 || p.x > 210) && p.y > sleeveBand.top && p.y < sleeveBand.bottom).every(p => p.y < hem), id).toBe(true);
    if (id === 'body') expect(hem, id).toBeLessThan(290);
  }
  expect(sleeveHem(() => 0)).toBe(sleeveBand.top);
});
