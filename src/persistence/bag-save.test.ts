import { describe, expect, it } from 'vitest';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { knownBags, validBag } from './bag-validation';
import { migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import type { Neighborhood } from '../domain/neighborhood-types';

const hall = { kind: 'interior' as const, building: 2, room: 'sala' as const };
const home = { kind: 'interior' as const, building: 1, room: 'sala' as const };
/** Bia in the market hall (building 2) with a bag of bread and milk, not paid yet. */
function shopping(): Neighborhood {
  const built = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
  const ready = { ...built, location: hall, items: built.items.map(i => ({ ...i, holder: null })),
    actors: built.actors.map(a => a.id === 'bia' ? { ...a, seat: null, location: hall, room: 'sala' as const, x: 500, y: 500 } : a) };
  const shelf = ready.buildings[1]!.layout.pieces.find(p => p.kind === 'market-shelf')!.id;
  return (['pao', 'leite'] as const).reduce<Neighborhood>((t, good) => neighborhoodAction(t, { type: 'buy', actor: 'bia', piece: shelf, good }), ready);
}
const roundTrip = (town: Neighborhood) => decodeNeighborhood(encodeNeighborhood(town));
const raw = (town: Neighborhood, change: (bag: Record<string, unknown>) => Record<string, unknown>) => {
  const saved = JSON.parse(encodeNeighborhood(town)) as { town: { items: Record<string, unknown>[] } };
  saved.town.items = saved.town.items.map(i => i.kind === 'sacola' ? change(i) : i);
  return JSON.stringify(saved);
};
const bagOf = (town: Neighborhood | null) => town?.items.find(i => i.kind === 'sacola');

describe('a sacola no save (W3L-22, §4)', () => {
  it('comprar, passar no caixa, levar para casa e guardar: cada passo sobrevive a encode → decode igual', () => {
    const bought = shopping();
    expect(roundTrip(bought)).toEqual(bought);
    const paid = neighborhoodAction(bought, { type: 'checkout', actor: 'bia' });
    expect(roundTrip(paid)).toEqual(paid);
    const street = neighborhoodAction(paid, { type: 'transport', actor: 'bia', location: { kind: 'street' }, point: { x: 600, y: 500 } });
    expect(bagOf(street)).toMatchObject({ holder: 'bia', location: { kind: 'street' } });
    expect(roundTrip(street)).toEqual(street);
    const atHome = neighborhoodAction(street, { type: 'transport', actor: 'bia', location: home, point: { x: 500, y: 500 } });
    const stored = neighborhoodAction(atHome, { type: 'stock-up', actor: 'bia' });
    expect(roundTrip(stored)).toEqual(stored);
  });
  it('o ingrediente desconhecido sai da sacola; a sacola vazia no chão some, e na mão continua', () => {
    const bought = shopping();
    expect(bagOf(decodeNeighborhood(raw(bought, bag => ({ ...bag, contents: ['kiwi', 'pao', 'kiwi'] }))))!.contents).toEqual(['pao']);
    expect(bagOf(decodeNeighborhood(raw(bought, bag => ({ ...bag, contents: ['kiwi'] }))))).toMatchObject({ contents: [], holder: 'bia' });
    const dropped = decodeNeighborhood(raw(bought, bag => ({ ...bag, holder: null, contents: ['kiwi'] })))!;
    expect(bagOf(dropped)).toBeUndefined();
    expect(dropped.actors).toEqual(bought.actors);
  });
  it('mais de 6 viram 6; paga que não é sim ou não vira não paga; um objeto que não é sacola perde os campos de sacola', () => {
    const bought = shopping();
    const seven = decodeNeighborhood(raw(bought, bag => ({ ...bag, contents: ['pao', 'pao', 'pao', 'pao', 'pao', 'pao', 'leite'], paid: 'sim' })));
    expect(bagOf(seven)).toMatchObject({ contents: ['pao', 'pao', 'pao', 'pao', 'pao', 'pao'], paid: false });
    const saved = JSON.parse(encodeNeighborhood(bought)) as { town: { items: Record<string, unknown>[] } };
    saved.town.items = saved.town.items.map(i => i.kind === 'ursinho' ? { ...i, contents: ['pao'], paid: true } : i);
    expect(decodeNeighborhood(JSON.stringify(saved))!.items.find(i => i.kind === 'ursinho')).toEqual(bought.items.find(i => i.kind === 'ursinho'));
    expect(knownBags('nada')).toBe('nada');
  });
  it('só uma sacola tem conteúdo e fita, e sempre de mercadorias conhecidas, até 6', () => {
    expect(validBag({ kind: 'sacola', contents: ['pao'], paid: false })).toBe(true);
    expect(validBag({ kind: 'sacola', contents: [], paid: true })).toBe(true);
    expect(validBag({ kind: 'sacola', contents: ['kiwi'], paid: true })).toBe(false);
    expect(validBag({ kind: 'sacola', contents: ['pao'] })).toBe(false);
    expect(validBag({ kind: 'sacola', paid: true })).toBe(false);
    expect(validBag({ kind: 'sacola', contents: Array(7).fill('pao'), paid: true })).toBe(false);
    expect(validBag({ kind: 'ursinho' })).toBe(true);
    expect(validBag({ kind: 'ursinho', paid: false })).toBe(false);
    expect(validBag({ kind: 'ursinho', contents: [] })).toBe(false);
  });
});
