import { describe, expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { savedWorld } from './validation';
import { decodeAlbum, encodeAlbum } from './album';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { migrateNeighborhood } from '../domain/neighborhood';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { World } from '../domain/types';

const town = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
const v3 = (value: unknown) => JSON.stringify({ version: 3, town: value });
type Plain = Record<string, unknown> & { actors: Record<string, unknown>[] };
const plain = (value: Neighborhood) => JSON.parse(encodeNeighborhood(value)).town as Plain;
const withoutLaura = <T extends { actors: readonly object[] }>(value: T): T => ({ ...value, actors: value.actors.filter(a => (a as { id?: unknown }).id !== 'laura') });

describe('a Laura no save (lote 8B, §4)', () => {
  it('um save v3 de antes dela carrega com a Laura em pé na sala da "Minha casa", e o resto igual', () => {
    const saved = plain(town()), home = (saved.buildings as { id: number }[])[0]!.id;
    const loaded = decodeNeighborhood(v3(withoutLaura(saved)))!;
    expect(loaded.actors.at(-1)).toMatchObject({ id: 'laura', kind: 'human', look: 'sol', room: 'sala', seat: null, location: { kind: 'interior', building: home, room: 'sala' } });
    expect(withoutLaura(loaded)).toEqual(withoutLaura(decodeNeighborhood(v3(saved))!));
  });
  it('o save de casa única e o álbum, gravados antes dela, carregam com a Laura na sala', () => {
    const old = withoutLaura(initialWorld());
    for (const version of [1, 2, 4]) expect(savedWorld({ version, state: old })!.actors.find(a => a.id === 'laura')).toMatchObject({ room: 'sala', seat: null });
    const album = decodeAlbum(encodeAlbum({ active: 1, houses: [{ id: 1, name: 'Minha casa', state: old as World }] }))!;
    expect(album.houses[0]!.state.actors.map(a => a.id)).toContain('laura');
  });
  it('round-trip: um jogo novo já tem a Laura e volta igual', () => {
    const value = town();
    expect(value.actors.map(a => a.id)).toContain('laura');
    expect(decodeNeighborhood(encodeNeighborhood(value))).toEqual(value);
  });
});
