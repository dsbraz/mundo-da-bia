import { describe, expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { knownLoans, validLoan } from './book-validation';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { borrow } from '../domain/library';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import type { Neighborhood } from '../domain/neighborhood-types';

const classroom = { kind: 'interior' as const, building: 2, room: 'quarto' as const };
/** Bia in the school's classroom with a book lent from its bookcase. */
function lent(): Neighborhood {
  const built = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'school' });
  const ready = { ...built, location: classroom, items: built.items.map(i => ({ ...i, holder: null })),
    actors: built.actors.map(a => a.id === 'bia' ? { ...a, seat: null, location: classroom, room: 'quarto' as const, x: 500, y: 520 } : a) };
  return borrow(ready, 'bia', ready.buildings[1]!.layout.pieces.find(p => p.room === 'quarto' && p.kind === 'bookcase')!.id).town;
}
const roundTrip = (town: Neighborhood) => decodeNeighborhood(encodeNeighborhood(town));
const raw = (town: Neighborhood, change: (book: Record<string, unknown>) => Record<string, unknown>) => {
  const saved = JSON.parse(encodeNeighborhood(town)) as { town: { items: Record<string, unknown>[] } };
  saved.town.items = saved.town.items.map(i => i.kind === 'livro' ? change(i) : i);
  return JSON.stringify(saved);
};
const bookOf = (town: Neighborhood | null) => town?.items.find(i => i.kind === 'livro');

describe('o livro no save (lote 8C)', () => {
  it('na mão, no chão e levado para casa: cada passo sobrevive a encode → decode igual', () => {
    const inHand = lent();
    expect(bookOf(inHand)).toMatchObject({ holder: 'bia', loan: { building: 2, slot: 0 } });
    expect(roundTrip(inHand)).toEqual(inHand);
    const dropped = { ...inHand, items: inHand.items.map(i => i.kind === 'livro' ? { ...i, holder: null } : i) };
    expect(roundTrip(dropped)).toEqual(dropped);
    const home = neighborhoodAction(inHand, { type: 'transport', actor: 'bia', location: { kind: 'interior', building: 1, room: 'sala' }, point: { x: 500, y: 520 } });
    expect(roundTrip(home)).toEqual(home);
  });
  it('um empréstimo estragado é esquecido (o livro fica, sem estante); outro objeto perde o empréstimo', () => {
    const town = lent();
    for (const loan of [{ building: 2, piece: 0, slot: 0 }, { building: 2, piece: 3, slot: 3 }, 'estante', { building: 'b', piece: 3, slot: 1 }]) {
      const read = bookOf(decodeNeighborhood(raw(town, book => ({ ...book, loan }))));
      expect(read).toMatchObject({ kind: 'livro', holder: 'bia' });
      expect(read).not.toHaveProperty('loan');
    }
    const saved = JSON.parse(encodeNeighborhood(town)) as { town: { items: Record<string, unknown>[] } };
    saved.town.items = saved.town.items.map(i => i.kind === 'ursinho' ? { ...i, loan: { building: 2, piece: 3, slot: 0 } } : i);
    expect(decodeNeighborhood(JSON.stringify(saved))!.items.find(i => i.kind === 'ursinho')).not.toHaveProperty('loan');
    expect(knownLoans('nada')).toBe('nada');
    const plain = { kind: 'livro' }, kept = { kind: 'livro', loan: { building: 2, piece: 3, slot: 1 } };
    const read = knownLoans([null, plain, kept, { kind: 'livro', loan: { building: 2, piece: 3, slot: -1 } }]) as unknown[];
    expect(read[0]).toBeNull(); expect(read[1]).toBe(plain); expect(read[2]).toBe(kept); expect(read[3]).toEqual({ kind: 'livro' });
  });
  it('só um livro tem empréstimo, e de uma estante e um lugar válidos', () => {
    expect(validLoan({ kind: 'livro' })).toBe(true);
    expect(validLoan({ kind: 'livro', loan: { building: 2, piece: 5, slot: 2 } })).toBe(true);
    expect(validLoan({ kind: 'livro', loan: { building: 2, piece: 5, slot: 0 } })).toBe(true);
    expect(validLoan({ kind: 'livro', loan: { building: 2, piece: 5, slot: 3 } })).toBe(false);
    expect(validLoan({ kind: 'livro', loan: { building: 2, piece: 5, slot: -1 } })).toBe(false);
    expect(validLoan({ kind: 'livro', loan: { building: 2, piece: 5, slot: 1.5 } })).toBe(false);
    expect(validLoan({ kind: 'livro', loan: { building: 0, piece: 5, slot: 1 } })).toBe(false);
    expect(validLoan({ kind: 'ursinho', loan: { building: 2, piece: 5, slot: 0 } })).toBe(false);
    expect(validLoan({ kind: 'ursinho' })).toBe(true);
  });
  it('um save de antes dos livros carrega como sempre', () => {
    const before = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'school' });
    expect(roundTrip(before)).toEqual(before);
  });
});
