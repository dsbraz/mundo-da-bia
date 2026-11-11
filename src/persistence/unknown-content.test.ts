import { expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { loadNeighborhood } from './storage';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { migrateNeighborhood } from '../domain/neighborhood';
function town() { return migrateNeighborhood(initialAlbum(initialWorld())); }
function port(raw: string) {
  const map = new Map([['mundo-da-bia:neighborhood:v2', raw]]);
  return { map, getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
}

it('carrega o bairro sem o objeto de tipo desconhecido', () => {
  const base = town(); const extra = { ...base.items[3]!, id: '1:telescopio', kind: 'telescopio' };
  const storage = port(JSON.stringify({ version: 2, town: { ...base, items: [...base.items, extra] } }));
  expect(loadNeighborhood(storage)).toEqual(base);
  expect(storage.map.has('mundo-da-bia:neighborhood:v2:recovery')).toBe(false);
});
it('solta o objeto desconhecido que estava na mão de alguém e mantém o resto', () => {
  const base = town(); const extra = { ...base.items[3]!, id: '1:telescopio', kind: 'telescopio', holder: 'bia' };
  expect(decodeNeighborhood(JSON.stringify({ version: 2, town: { ...base, items: [extra, ...base.items] } }))?.items).toEqual(base.items);
});
it('veste com o look padrão o personagem de look desconhecido', () => {
  const base = town();
  const saved = { ...base, actors: base.actors.map(a => a.id === 'luna' ? { ...a, look: 'desconhecido' } : a) };
  const loaded = loadNeighborhood(port(JSON.stringify({ version: 2, town: saved })));
  expect(loaded.actors.find(a => a.id === 'luna')!.look).toBe('sol');
  expect(loaded.actors.filter(a => a.id !== 'luna')).toEqual(base.actors.filter(a => a.id !== 'luna'));
});
it('continua recusando objeto conhecido malformado e personagem sem registro', () => {
  const base = town();
  expect(decodeNeighborhood(encodeNeighborhood({ ...base, items: base.items.map((i, n) => n ? i : { ...i, x: Number.NaN }) }))).toBeNull();
  expect(decodeNeighborhood(JSON.stringify({ version: 2, town: { ...base, items: [null, ...base.items] } }))).toBeNull();
  expect(decodeNeighborhood(JSON.stringify({ version: 2, town: { ...base, actors: [null, ...base.actors.slice(1)] } }))).toBeNull();
  expect(decodeNeighborhood(JSON.stringify({ version: 2, town: { ...base, items: 'x', actors: 'y' } }))).toBeNull();
});
it('trata look ausente como desconhecido e descarta objeto sem tipo', () => {
  const base = town();
  const actors = base.actors.map(({ look: _look, ...a }, n) => n ? { ...a, look: _look } : a);
  const items = [...base.items, { ...base.items[0]!, id: '1:lanche', kind: undefined }].slice(1);
  const loaded = decodeNeighborhood(JSON.stringify({ version: 2, town: { ...base, actors, items } }))!;
  expect(loaded.actors[0]!.look).toBe('sol');
  expect(loaded.items).toEqual(base.items.slice(1));
});
