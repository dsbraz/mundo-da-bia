import { describe, expect, it } from 'vitest';
import { initialProgress, revealShelves } from './progress';
import type { Progress, RecipeId } from './progress';
import { harvest } from './garden';
import { cook } from './recipes';
import { migrateNeighborhood } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import type { Neighborhood } from './neighborhood-types';

const known = (n: number): RecipeId[] => (['pizza', 'curau', 'pudim', 'pipoca', 'salada', 'sopa-de-legumes'] as RecipeId[]).slice(0, n);
const after = (change: Partial<Progress>) => revealShelves({ ...initialProgress(), ...change }, false).shelves;

describe('a prateleira de especiais e sementes se revela (W3L-23, §3.4)', () => {
  it('nada aparece no começo; a primeira colheita traz o milho', () => {
    expect(revealShelves(initialProgress(), false).shelves).toEqual([]);
    expect(revealShelves(initialProgress(), true).shelves).toEqual(['semente-milho']);
  });
  it('receitas descobertas trazem chocolate (1), canela (3) e mel (5)', () => {
    expect(after({ recipes: known(1) })).toEqual(['chocolate']);
    expect(after({ recipes: known(2) })).toEqual(['chocolate']);
    expect(after({ recipes: known(3) })).toEqual(['chocolate', 'canela']);
    expect(after({ recipes: known(4) })).toEqual(['chocolate', 'canela']);
    expect(after({ recipes: known(5) })).toEqual(['chocolate', 'canela', 'mel']);
  });
  it('depois da primeira colheita, morango com 2 receitas e abóbora com 4', () => {
    expect(after({ recipes: known(2) })).not.toContain('semente-morango');
    expect(after({ recipes: known(1), shelves: ['semente-milho'] })).toEqual(['semente-milho', 'chocolate']);
    expect(after({ recipes: known(2), shelves: ['semente-milho'] })).toEqual(['semente-milho', 'chocolate', 'semente-morango']);
    expect(after({ recipes: known(3), shelves: ['semente-milho'] })).not.toContain('semente-abobora');
    expect(after({ recipes: known(4), shelves: ['semente-milho'] })).toEqual(['semente-milho', 'chocolate', 'canela', 'semente-morango', 'semente-abobora']);
  });
  it('só cresce, na ordem em que apareceu, sem repetir; sem nada novo devolve o mesmo progresso', () => {
    const progress = { ...initialProgress(), shelves: ['mel' as const] };
    expect(revealShelves(progress, false)).toBe(progress);
    expect(revealShelves({ ...progress, recipes: known(1) }, false).shelves).toEqual(['mel', 'chocolate']);
  });
});

describe('colher e cozinhar gravam o que apareceu', () => {
  it('a primeira colheita da praça revela o milho', () => {
    const base = migrateNeighborhood(initialAlbum(initialWorld()));
    const town: Neighborhood = { ...base, progress: { ...base.progress, plaza: { 'praca-1': { crop: 'alface', stage: 4, since: 0, watered: false } } } };
    expect(harvest(town, 'praca-1').town.progress.shelves).toEqual(['semente-milho']);
    expect(harvest(base, 'praca-1').town.progress.shelves).toEqual([]);
  });
  it('a primeira receita descoberta revela o chocolate', () => {
    const base = migrateNeighborhood(initialAlbum(initialWorld()));
    const stove = { id: 90, kind: 'stove' as const, room: 'sala' as const, x: 300, y: 250, color: 'original' as const, flipped: false };
    const town: Neighborhood = { ...base, buildings: base.buildings.map(b => b.id === 1 ? { ...b, layout: { ...b.layout, pieces: [...b.layout.pieces, stove], nextId: 100 } } : b) };
    const cooked = cook(town, { building: 1, piece: 90, cook: 'bia', ingredients: ['leite', 'ovo', 'acucar'], utensil: 'panela' });
    expect(cooked.outcome.kind).toBe('dish');
    expect(cooked.town.progress.shelves).toEqual(['chocolate']);
  });
});
