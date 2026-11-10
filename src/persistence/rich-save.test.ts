import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadNeighborhood, saveNeighborhood } from './storage';
const raw = readFileSync(new URL('./fixtures/rich-save-v2.json', import.meta.url), 'utf8');
const expected = JSON.parse(raw).town;

it('carrega idêntico um save rico com três prédios, objetos espalhados e looks variados', () => {
  const map = new Map([['mundo-da-bia:neighborhood:v2', raw]]);
  const port = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const town = loadNeighborhood(port);
  expect(town).toEqual(expected);
  expect(town.buildings).toHaveLength(3);
  expect(new Set(town.actors.map(a => a.look)).size).toBe(7);
  expect(saveNeighborhood(town, port)).toBe(true);
  expect(JSON.parse(map.get('mundo-da-bia:neighborhood:v2')!)).toEqual(JSON.parse(raw));
  expect(loadNeighborhood(port)).toEqual(expected);
  expect(map.has('mundo-da-bia:neighborhood:v2:recovery')).toBe(false);
});
