import { describe, expect, it } from 'vitest';
import { isSchool, lesson, nextTheme, pupilsOf } from './school';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import { drawingIds, type DrawingId } from './progress';
import { needsOf } from './needs';
import type { ActorId } from './types';
import type { Neighborhood } from './neighborhood-types';

const classroom = { kind: 'interior' as const, building: 2, room: 'quarto' as const };
/** A school on plot 1, with the Bia and the Léo standing in its classroom. */
function school(): Neighborhood {
  const town = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'school' });
  return { ...town, actors: town.actors.map(a => ['bia', 'leo'].includes(a.id) ? { ...a, location: classroom, room: 'quarto', seat: null, x: 500, y: 520 } : a) };
}
const desks = (town: Neighborhood) => town.buildings[1]!.layout.pieces.filter(p => p.room === 'quarto' && p.kind === 'school-desk');
const seated = (town: Neighborhood, ...ids: ActorId[]): Neighborhood => ({ ...town,
  actors: town.actors.map(a => { const n = ids.indexOf(a.id); return n < 0 ? a : { ...a, seat: `${desks(town)[n]!.id}.0` as const }; }) });
const here = { building: 2, room: 'quarto' as const };

describe('a escola (W3L-26)', () => {
  it('a sala de aula da escola tem quadro e carteiras: é uma escola', () => {
    const town = school(), layout = town.buildings[1]!.layout;
    expect(layout.pieces.filter(p => p.room === 'quarto').map(p => p.kind)).toEqual(expect.arrayContaining(['board', 'school-desk', 'school-desk', 'school-desk']));
    expect(isSchool(layout, 'quarto')).toBe(true);
    expect(isSchool(layout, 'sala')).toBe(false);
  });
  it('sem criança sentada numa carteira a aula não começa e mostra a carteira que falta', () => {
    const town = school();
    expect(lesson(town, here)).toEqual({ town, outcome: { kind: 'missing', need: 'seat', want: 'school-desk' } });
  });
  it('uma sala antiga com Mesa de criação no lugar da carteira continua sendo escola, e quem senta nela é aluno', () => {
    const town = school(), b = town.buildings[1]!;
    const old = { ...town, buildings: town.buildings.map(x => x === b ? { ...b, layout: { ...b.layout, pieces: b.layout.pieces.map(p => p.kind === 'school-desk' ? { ...p, kind: 'desk' as const } : p) } } : x) };
    const desk = old.buildings[1]!.layout.pieces.find(p => p.room === 'quarto' && p.kind === 'desk')!;
    expect(isSchool(old.buildings[1]!.layout, 'quarto')).toBe(true);
    const sat = { ...old, actors: old.actors.map(a => a.id === 'bia' ? { ...a, seat: `${desk.id}.0` as const } : a) };
    expect(lesson(sat, here).outcome).toMatchObject({ kind: 'lesson', pupils: ['bia'] });
  });
  it('fora de uma sala com quadro nada acontece', () => {
    const town = seated(school(), 'bia');
    expect(lesson(town, { building: 2, room: 'sala' })).toEqual({ town, outcome: { kind: 'none' } });
    expect(lesson(town, { building: 9, room: 'sala' })).toEqual({ town, outcome: { kind: 'none' } });
  });
  it('com a Bia e o Léo sentados, a aula dá o desenho do dia e tira o tédio dos dois com alegria', () => {
    const bored = seated(school(), 'bia', 'leo');
    const town = { ...bored, actors: bored.actors.map(a => ({ ...a, needs: { fome: 20, sono: 0, tedio: 60, alegria: 0 } })) };
    const { town: after, outcome } = lesson(town, here);
    expect(outcome).toEqual({ kind: 'lesson', theme: drawingIds[0], pupils: ['bia', 'leo'] });
    expect(after.progress.drawings).toEqual([drawingIds[0]]);
    for (const id of ['bia', 'leo']) expect(needsOf(after.actors.find(a => a.id === id)!)).toMatchObject({ tedio: 20, alegria: 60_000 });
    expect(needsOf(after.actors.find(a => a.id === 'luna')!).tedio).toBe(60);
  });
  it('um gato numa carteira não é aluno', () => {
    const town = school(), cat = { ...town, actors: town.actors.map(a => a.id === 'mimi' ? { ...a, location: classroom, room: 'quarto' as const, seat: `${desks(town)[0]!.id}.0` as const } : a) };
    expect(pupilsOf(cat, here)).toEqual([]);
  });
  it('um adulto de pé no cômodo vira professor, mas não é obrigatório (gancho do lote 5A)', () => {
    const town = seated(school(), 'bia');
    expect(lesson(town, { ...here, grownUps: ['luna'] }).outcome).toMatchObject({ kind: 'lesson', teacher: undefined });
    const standing = { ...town, actors: town.actors.map(a => a.id === 'luna' ? { ...a, location: classroom, room: 'quarto' as const, seat: null } : a) };
    expect(lesson(standing, { ...here, grownUps: ['luna'] }).outcome).toMatchObject({ kind: 'lesson', pupils: ['bia'], teacher: 'luna' });
  });
  it('o tema roda e não se repete até os 12 saírem; depois volta o mais antigo', () => {
    let town = seated(school(), 'bia');
    const seen: DrawingId[] = [];
    for (let n = 0; n < 12; n++) { const result = lesson(town, here); town = result.town; seen.push((result.outcome as { theme: DrawingId }).theme); }
    expect(new Set(seen).size).toBe(12);
    expect(town.progress.drawings).toEqual(seen);
    const thirteenth = lesson(town, here);
    expect(thirteenth.outcome).toMatchObject({ theme: seen[0] });
    expect(thirteenth.town.progress.drawings).toEqual([...seen.slice(1), seen[0]]);
  });
  it('nextTheme: o primeiro que ainda não saiu, ou o mais antigo quando todos saíram', () => {
    expect(nextTheme([])).toBe(drawingIds[0]);
    expect(nextTheme([drawingIds[0], drawingIds[2]])).toBe(drawingIds[1]);
    expect(nextTheme([...drawingIds].reverse())).toBe(drawingIds[11]);
  });
});
