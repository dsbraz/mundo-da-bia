import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadNeighborhood, saveNeighborhood } from './storage';
import type { LegacyNeighborhood } from '../domain/neighborhood-types';
const raw = readFileSync(new URL('./fixtures/rich-save-v2.json', import.meta.url), 'utf8');
const expected = JSON.parse(raw).town;

it('carrega idêntico um save rico com três prédios, objetos espalhados e looks variados', () => {
  const map = new Map([['mundo-da-bia:neighborhood:v2', raw]]);
  const port = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const town = Object.fromEntries(Object.entries(loadNeighborhood(port)).filter(([key]) => key !== 'progress' && key !== 'nextItem')) as LegacyNeighborhood;
  expect(town).toEqual(expected);
  expect(town.buildings).toHaveLength(3);
  expect(new Set(town.actors.map(a => a.look)).size).toBe(7);
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
  expect(town).toEqual(JSON.parse(v3).town);
  expect(town.buildings.flatMap(b => b.layout.pieces).some(p => p.plant?.crop === 'tomate')).toBe(true);
  expect(saveNeighborhood(town, port)).toBe(true);
  expect(JSON.parse(map.get('mundo-da-bia:neighborhood:v3')!)).toEqual(JSON.parse(v3));
  expect(map.get('mundo-da-bia:neighborhood:v2')).toBe(raw);
});
