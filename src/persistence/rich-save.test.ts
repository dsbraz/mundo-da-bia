import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadNeighborhood, saveNeighborhood } from './storage';
import { knownCast } from './cast';
import type { LegacyNeighborhood, Neighborhood } from '../domain/neighborhood-types';
import { clearStairwells } from '../domain/modules';
const raw = readFileSync(new URL('./fixtures/rich-save-v2.json', import.meta.url), 'utf8');
/** The fixture as this build reads it: the same, with the grown-ups standing in "Minha casa" (W3L-24) and no piece in a stairwell (lot 8A). */
const expected = clearStairwells(knownCast(JSON.parse(raw).town) as Neighborhood) as LegacyNeighborhood;
const readV3 = (text: string) => clearStairwells(knownCast(JSON.parse(text).town) as Neighborhood);

it('carrega idêntico um save rico com três prédios, objetos espalhados e looks variados', () => {
  const map = new Map([['mundo-da-bia:neighborhood:v2', raw]]);
  const port = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const town = Object.fromEntries(Object.entries(loadNeighborhood(port)).filter(([key]) => key !== 'progress' && key !== 'nextItem')) as LegacyNeighborhood;
  expect(town).toEqual(expected);
  expect(town.buildings).toHaveLength(3);
  expect(new Set(town.actors.slice(0, 7).map(a => a.look)).size).toBe(7);
  expect(saveNeighborhood(loadNeighborhood(port), port)).toBe(true);
  expect(map.get('mundo-da-bia:neighborhood:v2')).toBe(raw);
  expect(JSON.parse(map.get('mundo-da-bia:neighborhood:v3')!).town).toMatchObject(expected);
  expect(loadNeighborhood(port)).toMatchObject(expected);
  expect(map.has('mundo-da-bia:neighborhood:v3:recovery')).toBe(false);
});
it('carrega idêntico o save v3 rico, com progresso e horta em caixa, e não toca na v2', () => {
  const v3 = readFileSync(new URL('./fixtures/rich-save-v3.json', import.meta.url), 'utf8');
  const map = new Map([['mundo-da-bia:neighborhood:v3', v3], ['mundo-da-bia:neighborhood:v2', raw]]);
  const port = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const town = loadNeighborhood(port);
  expect(town).toEqual(readV3(v3));
  expect(town.buildings.flatMap(b => b.layout.pieces).some(p => p.plant?.crop === 'tomate')).toBe(true);
  expect(saveNeighborhood(town, port)).toBe(true);
  expect(JSON.parse(map.get('mundo-da-bia:neighborhood:v3')!)).toEqual({ ...JSON.parse(v3), town: readV3(v3) });
  expect(map.get('mundo-da-bia:neighborhood:v2')).toBe(raw);
});
