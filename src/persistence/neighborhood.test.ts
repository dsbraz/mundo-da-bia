import { expect, it } from 'vitest';
import { loadNeighborhood, saveNeighborhood } from './storage';
import { encodeNeighborhood, decodeNeighborhood } from './neighborhood';
import { initialAlbum, duplicateHouse } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { encodeAlbum } from './album';
function storage() {
  const map = new Map<string, string>();
  return { map, getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
}
it('migra uma vez, conserva chaves antigas e recarrega o bairro versionado', () => {
  const port = storage(); const old = encodeAlbum(duplicateHouse(initialAlbum(initialWorld()), false));
  port.setItem('mundo-da-bia:houses:v1', old);
  const town = loadNeighborhood(port);
  expect(town.buildings).toHaveLength(2); expect(saveNeighborhood(town, port)).toBe(true);
  expect(port.getItem('mundo-da-bia:houses:v1')).toBe(old);
  expect(loadNeighborhood(port)).toEqual(town);
  expect(decodeNeighborhood(encodeNeighborhood(town))).toEqual(town);
});
it('rejeita versão desconhecida, identidade duplicada, local ausente e nomes inválidos', () => {
  const town = loadNeighborhood(storage());
  expect(decodeNeighborhood('{')).toBeNull(); expect(decodeNeighborhood(null)).toBeNull();
  expect(decodeNeighborhood(JSON.stringify({ version: 99, town }))).toBeNull();
  for (const next of [
    { ...town, items: [...town.items, town.items[0]!]  },
    { ...town, location: { kind: 'interior', building: 99, room: 'sala' } },
    { ...town, actors: town.actors.map(a => ({ ...a, name: 'x'.repeat(25) })) },
  ]) expect(decodeNeighborhood(JSON.stringify({ version: 1, town: next }))).toBeNull();
});
it('falha de armazenamento é explícita e leitura inválida recupera legado', () => {
  const port = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
  const town = loadNeighborhood(port); expect(town.actors).toHaveLength(7);
  expect(saveNeighborhood(town, port)).toBe(false);
});
it('valida invariantes de cômodos, assentos, mãos e terrenos', () => {
  const town = loadNeighborhood(storage());
  const changed = (edit: (copy: typeof town) => void) => { const copy = structuredClone(town); edit(copy); return decodeNeighborhood(encodeNeighborhood(copy)); };
  expect(changed(t => { t.actors[0]!.seat = '2.0'; })).toBeNull();
  expect(changed(t => { t.actors[0]!.seat = 'bed' as never; })?.actors[0]!.seat).toBeNull();
  expect(changed(t => { t.actors[0]!.location = { kind: 'street' }; t.actors[0]!.seat = '2.0'; })?.actors[0]!.seat).toBeNull();
  expect(changed(t => { t.items[0]!.location = { kind: 'street' }; })).toBeNull();
  expect(changed(t => { t.items[0]!.holder = 'bia'; t.items[0]!.spot = 'floor'; t.items[1]!.holder = 'bia'; t.items[1]!.spot = 'floor'; })).toBeNull();
  expect(changed(t => { t.items[2]!.holder = 'bia'; t.items[2]!.location = { kind: 'street' }; })).toBeNull();
  expect(changed(t => { t.items[2]!.id = 'bad' as typeof t.items[2]['id']; })).toBeNull();
  expect(changed(t => { t.items[2]!.kind = 'bad' as 'ursinho'; })?.items.map(i => i.id)).toEqual(['1:lanche', '1:peixe', '1:ursinho', '1:bola']);
  expect(changed(t => { t.actors[0]!.x = 941; })).toBeNull();
  expect(changed(t => { t.actors[0]!.room = 'quarto'; })).toBeNull();
  expect(changed(t => { t.buildings[0]!.entry = 'room-99'; })).toBeNull();
  expect(changed(t => { t.buildings[0]!.name = ''; })).toBeNull();
  expect(changed(t => { t.buildings[0]!.plot = 4; })).toBeNull();
  expect(changed(t => { t.plots = 3; })).toBeNull();
  expect(changed(t => { t.nextBuilding = 1; })).toBeNull();
});
