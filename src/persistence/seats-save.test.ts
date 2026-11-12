import { expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { decode, encode } from './save';
import { decodeAlbum, encodeAlbum } from './album';
import { initialAlbum } from '../domain/houses';
import { initialWorld, transition } from '../domain/world';
import { migrateNeighborhood } from '../domain/neighborhood';
import { upgradeToV3 } from './neighborhood-v3';
import type { Neighborhood } from '../domain/neighborhood-types';

const town = (): Neighborhood => upgradeToV3(migrateNeighborhood(initialAlbum(initialWorld())));
const withSeat = (value: Neighborhood, id: string, seat: unknown, patch: object = {}) =>
  ({ ...value, actors: value.actors.map(a => a.id === id ? { ...a, seat, ...patch } : a) });
const luna = (value: Neighborhood | null) => value?.actors.find(a => a.id === 'luna');

it('o save antigo com sofa-right carrega sentado na vaga 1 do primeiro sofá do cômodo, em v1, v2 e v3', () => {
  const base = town();
  expect(luna(base)!.seat).toBe('2.1');
  for (const version of [1, 2, 3]) {
    const loaded = decodeNeighborhood(JSON.stringify({ version, town: withSeat(base, 'luna', 'sofa-right') }));
    expect(luna(loaded)).toMatchObject({ seat: '2.1', x: 245, y: 405 });
  }
});
it('assento desconhecido, vaga fora do intervalo ou peça que não é assento carregam como null, e o resto fica', () => {
  const base = town(), rug = base.buildings[0]!.layout.pieces.find(p => p.kind === 'rug')!.id;
  for (const seat of ['999.0', '2.5', `${rug}.0`, 'banco-da-padaria', 'bed']) {
    const loaded = decodeNeighborhood(JSON.stringify({ version: 3, town: withSeat(base, 'luna', seat) }));
    expect(luna(loaded)).toMatchObject({ seat: null, x: 245, y: 405 });
    expect(loaded!.buildings).toEqual(base.buildings);
  }
});
it('um assento conhecido fora do lugar ainda recusa o save; um que não é texto vira null', () => {
  const base = town();
  expect(decodeNeighborhood(JSON.stringify({ version: 3, town: withSeat(base, 'luna', '2.0') }))).toBeNull();
  expect(luna(decodeNeighborhood(JSON.stringify({ version: 3, town: withSeat(base, 'luna', 7) })))!.seat).toBeNull();
});
it('sentar numa cadeira, salvar e ler devolve o mesmo bairro', () => {
  const base = town(), building = base.buildings[0]!;
  const chair = { id: building.layout.nextId, kind: 'chair' as const, room: 'sala' as const, x: 380, y: 300, color: 'mint' as const, flipped: true };
  const furnished = { ...base, buildings: [{ ...building, layout: { ...building.layout, nextId: chair.id + 1, pieces: [...building.layout.pieces, chair] } }] };
  const seated = withSeat(furnished, 'bia', `${chair.id}.0`, { x: 380 + 90 - 45, y: 408 }) as Neighborhood;
  expect(decodeNeighborhood(encodeNeighborhood(seated))).toEqual(seated);
});
it('o save da casa única e o álbum convertem os ids antigos', () => {
  const state = initialWorld();
  const old = { ...state, actors: state.actors.map(a => a.id === 'luna' ? { ...a, seat: 'sofa-right' } : a) };
  expect(decode(JSON.stringify({ version: 4, state: old }))).toEqual(state);
  expect(decode(JSON.stringify({ version: 3, state: old }))).toEqual(state);
  const sat = transition(state, { type: 'sit', actor: 'bia', seat: '2.0' }).state;
  expect(decode(encode(sat))).toEqual(sat);
  const album = initialAlbum(state);
  const raw = JSON.parse(encodeAlbum(album)) as { album: { houses: { state: unknown }[] } };
  raw.album.houses[0]!.state = old;
  expect(decodeAlbum(JSON.stringify(raw))).toEqual(album);
  expect(decodeAlbum(JSON.stringify({ version: 1, album: raw.album }))?.houses[0]!.state.actors[1]!.seat).toBe('2.1');
});
