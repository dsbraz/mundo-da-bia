import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { knownProgress } from './progress-validation';
import { unfelt } from './neighborhood-v3';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { lesson } from '../domain/school';
import type { Neighborhood } from '../domain/neighborhood-types';
import { fromPiece } from '../domain/layout';
import { seatSlots } from '../domain/seats';

const classroom = { kind: 'interior' as const, building: 2, room: 'quarto' as const };
/** A school with the Bia at the classroom's first desk. */
function school(): Neighborhood {
  const town = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'school' });
  const desk = town.buildings[1]!.layout.pieces.find(p => p.room === 'quarto' && p.kind === 'school-desk')!;
  return { ...town, actors: town.actors.map(a => a.id === 'bia' ? { ...a, ...fromPiece(desk, seatSlots['school-desk']![0]!), location: classroom, room: 'quarto', seat: `${desk.id}.0` as const } : a) };
}
const taught = () => { const town = school(); return lesson(town, { building: 2, room: 'quarto' }).town; };
const withoutNeeds = (town: Neighborhood): Neighborhood => ({ ...town, actors: town.actors.map(unfelt) });

describe('a escola no save (W3L-26, §4)', () => {
  it('saves antigos (v2, v3 rico e um v3 sem desenhos) carregam com drawings vazio', () => {
    const v2 = readFileSync(new URL('./fixtures/rich-save-v2.json', import.meta.url), 'utf8');
    const v3 = readFileSync(new URL('./fixtures/rich-save-v3.json', import.meta.url), 'utf8');
    for (const raw of [v2, v3, encodeNeighborhood(migrateNeighborhood(initialAlbum(initialWorld())))]) expect(decodeNeighborhood(raw)!.progress.drawings).toEqual([]);
  });
  it('aplicar a aula, fazer encode e depois decode devolve o mesmo bairro (as necessidades nunca vão para o save)', () => {
    const after = taught();
    expect(after.progress.drawings).toEqual(['sol']);
    expect(decodeNeighborhood(encodeNeighborhood(after))).toEqual(withoutNeeds(after));
  });
  it('desenho desconhecido ou repetido sai sozinho; o que não é lista volta ao inicial', () => {
    expect(knownProgress({ drawings: ['gato', 'dragao', 'gato', 3, 'lua'] }).drawings).toEqual(['gato', 'lua']);
    expect(knownProgress({ drawings: 'sol' }).drawings).toEqual([]);
  });
  it('um build anterior, que não conhece a escola, lê o save novo: o campo novo é ignorado e o quadro sai sozinho', () => {
    const raw = JSON.parse(encodeNeighborhood(taught())) as { town: { progress: Record<string, unknown>; buildings: { layout: { pieces: { kind: string }[] } }[] } };
    // What an older build sees: a progress field and a piece kind it does not know.
    raw.town.progress.cadernos = ['x'];
    raw.town.buildings[1]!.layout.pieces.forEach(p => { if (p.kind === 'board') p.kind = 'lousa-do-futuro'; });
    const loaded = decodeNeighborhood(JSON.stringify(raw))!;
    expect(loaded.progress).toEqual(taught().progress);
    expect(loaded.buildings[1]!.layout.pieces).toEqual(taught().buildings[1]!.layout.pieces.filter(p => p.kind !== 'board'));
  });
});
