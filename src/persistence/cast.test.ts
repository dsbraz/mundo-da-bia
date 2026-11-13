import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { knownCast } from './cast';
import { savedWorld } from './validation';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { migrateNeighborhood } from '../domain/neighborhood';
import { actorIds, actorKinds } from '../domain/types';
import type { Neighborhood } from '../domain/neighborhood-types';

const town = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
/** The v3 envelope of `value` (a town rebuilt by hand, as another build may have written it). */
const v3 = (value: unknown) => JSON.stringify({ version: 3, town: value });
const plain = (value: Neighborhood) => JSON.parse(encodeNeighborhood(value)).town as Record<string, unknown> & { actors: Record<string, unknown>[]; items: Record<string, unknown>[] };

describe('turma tolerante no save (W3L-18, §4)', () => {
  it('um save com um ator "dragao" a mais carrega sem ele, e o que ele segurava fica no chão', () => {
    const saved = plain(town()), bia = saved.actors[0]!;
    const dragon = { ...bia, id: 'dragao', name: 'Fogo', seat: null, x: 700 };
    const held = { ...saved.items.find(i => i.kind === 'ursinho')!, holder: 'dragao', spot: 'floor', x: 700, y: bia.y };
    const loaded = decodeNeighborhood(v3({ ...saved, actors: [...saved.actors, dragon], items: saved.items.map(i => i.kind === 'ursinho' ? held : i) }))!;
    expect(loaded).not.toBeNull();
    expect(loaded.actors.map(a => a.id)).toEqual([...actorIds]);
    expect(loaded.items.find(i => i.kind === 'ursinho')).toMatchObject({ holder: null, spot: 'floor', x: 700 });
  });
  it('um save sem a Pipoca carrega com a Pipoca na sala da primeira construção, em pé, e o resto igual', () => {
    const saved = plain(town()), before = decodeNeighborhood(v3(saved))!;
    const loaded = decodeNeighborhood(v3({ ...saved, actors: saved.actors.filter(a => a.id !== 'pipoca') }))!;
    expect(loaded).toEqual(before);
    expect(loaded.actors.find(a => a.id === 'pipoca')).toMatchObject({ kind: 'cat', room: 'sala', seat: null, resting: false, fed: false,
      location: { kind: 'interior', building: before.buildings[0]!.id, room: 'sala' }, x: 610, y: 540 });
  });
  it('quem falta entra na sala da construção de menor id; sem sala, no cômodo de entrada', () => {
    const saved = plain(town()), first = saved.buildings as Record<string, unknown>[];
    const layout = first[0]!.layout as { rooms: Record<string, unknown>; pieces: Record<string, unknown>[] };
    const noSala = { ...first[0]!, entry: 'quarto', layout: { ...layout, rooms: { quarto: layout.rooms.quarto }, pieces: layout.pieces.filter(p => p.room === 'quarto') } };
    const cast = knownCast({ ...saved, buildings: [{ ...first[0]!, id: 9 }, noSala], actors: [] }) as { actors: { id: string; room: string; location: unknown }[] };
    expect(cast.actors.map(a => a.id)).toEqual([...actorIds]);
    expect(cast.actors[0]).toMatchObject({ room: 'quarto', location: { kind: 'interior', building: first[0]!.id, room: 'quarto' } });
  });
  it('a ordem dos atores não muda o tipo: o tipo vem de actorKinds, nunca da posição', () => {
    const saved = plain(town()), before = decodeNeighborhood(v3(saved))!;
    const loaded = decodeNeighborhood(v3({ ...saved, actors: [...saved.actors].reverse() }))!;
    expect(loaded).toEqual(before);
    expect(loaded.actors.map(a => [a.id, a.kind])).toEqual(actorIds.map(id => [id, actorKinds[id]]));
    expect(Object.values(actorKinds).filter(k => k === 'human')).toHaveLength(4);
  });
  it('um tipo trocado no save é corrigido pela tabela', () => {
    const saved = plain(town());
    const loaded = decodeNeighborhood(v3({ ...saved, actors: saved.actors.map(a => a.id === 'bia' ? { ...a, kind: 'cat' } : a) }))!;
    expect(loaded.actors[0]!.kind).toBe('human');
  });
  it('a lista de ids conhecidos é um parâmetro: um build com menos personagens descarta os outros (subconjunto)', () => {
    const saved = plain(town());
    const cast = knownCast(saved, ['bia', 'luna']) as { actors: { id: string }[]; items: { holder: unknown }[] };
    expect(cast.actors.map(a => a.id)).toEqual(['bia', 'luna']);
  });
  it('um ator inválido (sem id) continua inválido: a turma não conserta estrutura', () => {
    const saved = plain(town());
    expect(decodeNeighborhood(v3({ ...saved, actors: [...saved.actors, 'dragao'] }))).toBeNull();
    expect(decodeNeighborhood(v3({ ...saved, actors: [...saved.actors, saved.actors[0]] }))).toBeNull();
    expect(knownCast({ ...saved, actors: 'x' })).toEqual({ ...saved, actors: 'x' });
    expect(knownCast({ ...saved, items: 'x' })).toEqual({ ...saved, items: 'x' });
    expect(knownCast(null)).toBeNull();
    expect(knownCast({ ...saved, buildings: [] })).toEqual({ ...saved, buildings: [] });
  });
  it('o save legado de casa única (versões 1 a 4) continua carregando', () => {
    const world = initialWorld();
    for (const version of [2, 4]) expect(savedWorld({ version, state: world })?.actors.map(a => a.kind)).toEqual(actorIds.map(id => actorKinds[id]));
    expect(savedWorld({ version: 1, state: { ...world, actors: world.actors.map(a => ({ ...a })) } })).not.toBeNull();
    const { layout, ...three } = world;
    expect(savedWorld({ version: 3, state: { ...three, layout: { ...layout, nextRoomId: undefined } } })).not.toBeNull();
  });
  it('os fixtures ricos v2 e v3 continuam carregando com a turma inteira', () => {
    for (const name of ['rich-save-v2.json', 'rich-save-v3.json']) {
      const loaded = decodeNeighborhood(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
      expect(loaded?.actors.map(a => a.id)).toEqual([...actorIds]);
    }
  });
});
