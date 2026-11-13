import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { initialAlbum } from './houses';
import { localWorld, migrateNeighborhood, neighborhoodAction, storeWorld } from './neighborhood';
import { endShow } from './show';
import type { Piece, World } from './types';

/** The living room with a piano (id 900). */
function withPiano(): World {
  const world = initialWorld(), piano: Piece = { id: 900, kind: 'piano', room: 'sala', x: 600, y: 250, color: 'original', flipped: false };
  return { ...world, layout: { ...world.layout, pieces: [...world.layout.pieces, piano] } };
}
const piano = (world: Pick<World, 'layout'>) => world.layout.pieces.find(p => p.id === 900)!;

it('o show acaba e o piano que o tocava para junto (lote 6B)', () => {
  const playing = transition(withPiano(), { type: 'use', id: 900 }).state;
  expect([playing.show, piano(playing).active]).toEqual([true, true]);
  const ended = endShow(playing);
  expect([ended.show, piano(ended).active]).toEqual([false, false]);
  expect(endShow(ended)).toBe(ended);
});
it('o show acabou com o piano ainda ligado (outro caminho): um toque começa um show novo, e o piano continua tocando', () => {
  const playing = transition(withPiano(), { type: 'use', id: 900 }).state, quiet = { ...playing, show: false };
  const again = transition(quiet, { type: 'use', id: 900 });
  expect([again.state.show, piano(again.state).active]).toEqual([true, true]);
  // Tocar de novo durante o show desliga os dois.
  const off = transition(again.state, { type: 'use', id: 900 }).state;
  expect([off.show, piano(off).active]).toEqual([false, false]);
});
it('sair de casa durante o show encerra o show daquela casa: ao voltar, ninguém dança de novo', () => {
  let town = migrateNeighborhood(initialAlbum(withPiano()));
  town = storeWorld(town, transition(localWorld(town), { type: 'use', id: 900 }).state);
  expect(town.buildings[0]!.show).toBe(true);
  const out = neighborhoodAction(town, { type: 'visit', location: { kind: 'street' } });
  expect(out.buildings[0]!.show).toBe(false);
  expect(piano(out.buildings[0]!).active).toBe(false);
  const back = neighborhoodAction(out, { type: 'visit', location: { kind: 'interior', building: 1, room: 'sala' } });
  expect(localWorld(back).show).toBe(false);
});
it('levar alguém para a rua durante o show também encerra o show da casa; mudar de cômodo na mesma casa, não', () => {
  let town = migrateNeighborhood(initialAlbum(withPiano()));
  town = storeWorld(town, transition(localWorld(town), { type: 'use', id: 900 }).state);
  const street = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'street' }, point: { x: 300, y: 520 } });
  expect(street.location.kind).toBe('street');
  expect(street.buildings[0]!.show).toBe(false);
  const inside = neighborhoodAction(town, { type: 'visit', location: { kind: 'interior', building: 1, room: 'quarto' } });
  expect(inside.buildings[0]!.show).toBe(true);
  expect(neighborhoodAction(town, { type: 'visit', location: { kind: 'interior', building: 999, room: 'sala' } })).toBe(town);
});
it('quem segura o microfone quando o show acaba continua com ele: só o show e o piano param', () => {
  const singing = transition(transition(withPiano(), { type: 'pick', actor: 'bia', item: 'microfone' }).state, { type: 'use', id: 900 }).state;
  expect(singing.items.find(i => i.id === 'microfone')!.holder).toBe('bia');
  const ended = endShow(singing);
  expect(ended.show).toBe(false);
  expect(ended.items).toBe(singing.items);
  expect(ended.actors).toBe(singing.actors);
});
