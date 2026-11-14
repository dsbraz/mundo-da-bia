import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type Phaser from 'phaser';
import { lookIds } from '../domain/types';
import { outfitLayer } from './outfit';
import { raisedCrops, raiseSleeves, sleeveBand } from './raised-sleeves';
import { outlines } from './svg-outline.test-kit';

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
  type Fake = { name: string; visible: boolean; crop: number[]; flipY: boolean; setVisible(v: boolean): Fake; setCrop(...c: number[]): Fake };
  const image = (name: string, visible = false): Fake => ({ name, visible, crop: [], flipY: name.startsWith('raised-sleeve'),
    setVisible(v) { this.visible = v; return this; }, setCrop(...c) { this.crop = c; return this; } });
  const parts = [image('sol', true), image('raised-torso'), image('raised-sleeve-0'), image('raised-sleeve-1')];
  const pose = { getData: (k: string) => k === 'outfit' ? { name: 'sol', knee: 320 } : undefined, getByName: (n: string) => parts.find(p => p.name === n) };
  raiseSleeves(pose as unknown as Phaser.GameObjects.Container, true);
  expect(parts.map(p => p.visible)).toEqual([true, true, true, true]);
  expect(parts[0]!.crop).toEqual([0, sleeveBand.bottom, 280, 320 - sleeveBand.bottom]);
  raiseSleeves(pose as unknown as Phaser.GameObjects.Container, false);
  expect(parts.map(p => p.visible)).toEqual([true, false, false, false]);
  expect(parts[0]!.crop).toEqual([0, 0, 280, 320]);
  // The sleeves are the band beside the torso, mirrored (they are drawn upside down, as the arms).
  const crops = raisedCrops(440);
  expect(crops.sleeves.map(c => [c.x, c.y, c.width, c.height])).toEqual([[0, 440 - 316, 80, 124], [200, 440 - 316, 80, 124]]);
  expect(crops.torso).toEqual({ x: 80, y: 0, width: 120, height: 316 });
});
