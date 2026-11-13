import { describe, expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { knownCast } from './cast';
import { savedWorld } from './validation';
import { decodeAlbum, encodeAlbum } from './album';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { adultIds } from '../domain/family';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { World } from '../domain/types';

const town = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
const v3 = (value: unknown) => JSON.stringify({ version: 3, town: value });
type Plain = Record<string, unknown> & { actors: Record<string, unknown>[]; items: Record<string, unknown>[] };
const plain = (value: Neighborhood) => JSON.parse(encodeNeighborhood(value)).town as Plain;
/** The cast of the build before the adults (W3L-18 in `main`). */
const older = ['bia', 'luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca'] as const;
const adult = (id: unknown) => (adultIds as readonly unknown[]).includes(id);
const withoutAdults = <T extends { actors: readonly object[] }>(value: T): T => ({ ...value, actors: value.actors.filter(a => !adult((a as { id?: unknown }).id)) });

describe('os adultos no save (W3L-24, §4)', () => {
  it('um save v3 sem adultos carrega com Daniel e Fabiana em pé na sala da "Minha casa" (a construção de menor id)', () => {
    const saved = plain(town()), home = (saved.buildings as { id: number }[])[0]!.id;
    const loaded = decodeNeighborhood(v3(withoutAdults(saved)))!;
    for (const id of adultIds) expect(loaded.actors.find(a => a.id === id)).toMatchObject({ kind: 'human', room: 'sala', seat: null,
      location: { kind: 'interior', building: home, room: 'sala' } });
    expect(withoutAdults(loaded)).toEqual(withoutAdults(decodeNeighborhood(v3(saved))!));
  });
  it('o build anterior (sem adultos) lê o save novo e descarta só os adultos; o que um adulto segurava fica no chão', () => {
    const saved = plain(town()), teddy = saved.items.find(i => i.kind === 'ursinho')!;
    const daniel = saved.actors.find(a => a.id === 'daniel')!;
    const holding = { ...saved, items: saved.items.map(i => i === teddy ? { ...i, holder: 'daniel', x: daniel.x, y: daniel.y, spot: 'floor', room: daniel.room, location: daniel.location } : i) };
    const read = knownCast(holding, older) as Plain;
    expect(read.actors).toEqual(withoutAdults(holding).actors);
    expect(read.items.find(i => i.kind === 'ursinho')).toMatchObject({ holder: null, x: daniel.x });
    expect(read.items.filter(i => i.kind !== 'ursinho')).toEqual(holding.items.filter(i => i.kind !== 'ursinho'));
    expect({ ...read, actors: [], items: [] }).toEqual({ ...holding, actors: [], items: [] });
  });
  it('o save de casa única e o álbum, gravados antes dos adultos, carregam com os dois na sala', () => {
    const world = initialWorld(), old = withoutAdults(world);
    for (const version of [1, 2, 4]) {
      const loaded = savedWorld({ version, state: old })!;
      expect(loaded.actors.filter(a => adult(a.id)).map(a => [a.id, a.room, a.seat])).toEqual([['daniel', 'sala', null], ['fabiana', 'sala', null]]);
    }
    const album = decodeAlbum(encodeAlbum({ active: 1, houses: [{ id: 1, name: 'Minha casa', state: old as World }] }))!;
    expect(album.houses[0]!.state.actors.map(a => a.id)).toEqual(world.actors.map(a => a.id));
  });
  it('o turno de trabalho nunca vai para o save (W3L-25, §4): com ou sem ele, os bytes são os mesmos', () => {
    const value = town(), working = { ...value, actors: value.actors.map(a => a.id === 'daniel' ? { ...a, look: 'office' as const, work: { look: 'outing' as const } } : a) };
    const plainLook = { ...value, actors: value.actors.map(a => a.id === 'daniel' ? { ...a, look: 'office' as const } : a) };
    expect(encodeNeighborhood(working)).toBe(encodeNeighborhood(plainLook));
    expect(decodeNeighborhood(JSON.stringify({ version: 3, town: { ...plain(working), actors: working.actors } }))!.actors.find(a => a.id === 'daniel')!.work).toBeUndefined();
  });
  it('aplicar "work", fazer encode e decode devolve o mesmo bairro', () => {
    const value = town(), at = neighborhoodAction(value, { type: 'work', phase: 'tarde' });
    expect(decodeNeighborhood(encodeNeighborhood(at))).toEqual(at);
  });
  it('round-trip: o save novo com os adultos volta igual', () => {
    const value = town();
    expect(value.actors.filter(a => adult(a.id))).toHaveLength(2);
    expect(decodeNeighborhood(encodeNeighborhood(value))).toEqual(value);
  });
});
