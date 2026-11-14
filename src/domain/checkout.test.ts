import { describe, expect, it } from 'vitest';
import { checkoutAt, checkoutCall } from './market';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import type { Neighborhood } from './neighborhood-types';
import type { Layout, Piece } from './types';

const counter: Piece = { id: 7, kind: 'checkout', room: 'sala', x: 600, y: 300, color: 'original', flipped: false };
const layout: Layout = { ...initialWorld().layout, pieces: [counter], nextId: 99 };
const hall = { kind: 'interior' as const, building: 2, room: 'sala' as const };
/** Bia in the market hall; `goods` already in her bag (paid or not). */
function shopping(goods: number, paid = false): Neighborhood {
  const built = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
  const ready = { ...built, location: hall, items: built.items.map(i => ({ ...i, holder: null })),
    actors: built.actors.map(a => a.id === 'bia' ? { ...a, seat: null, location: hall, room: 'sala' as const, x: 500, y: 500 } : a) };
  const shelf = ready.buildings[1]!.layout.pieces.find(p => p.kind === 'market-shelf')!.id;
  const bought = Array.from({ length: goods }).reduce<Neighborhood>(t => neighborhoodAction(t, { type: 'buy', actor: 'bia', piece: shelf, good: 'pao' }), ready);
  return paid ? neighborhoodAction(bought, { type: 'checkout', actor: 'bia' }) : bought;
}

describe('o caixa chama (lote 6F)', () => {
  it('a sacola ou a pessoa solta no caixa, ou ao lado dele no chão, está no caixa; longe ou em outro cômodo, não', () => {
    expect(checkoutAt(layout, 'sala', { x: 700, y: 360 })).toBe(counter);
    expect(checkoutAt(layout, 'sala', { x: 700, y: 520 })).toBe(counter);
    expect(checkoutAt(layout, 'sala', { x: 540, y: 470 })).toBe(counter);
    expect(checkoutAt(layout, 'sala', { x: 860, y: 470 })).toBe(counter);
    expect(checkoutAt(layout, 'sala', { x: 400, y: 470 })).toBeUndefined();
    expect(checkoutAt(layout, 'sala', { x: 700, y: 250 })).toBeUndefined();
    expect(checkoutAt(layout, 'quarto', { x: 700, y: 400 })).toBeUndefined();
  });
  it('chama quem segura uma sacola com compras sem pagar, no salão do mercado; depois de pagar, para', () => {
    expect(checkoutCall(shopping(0), 'bia')).toBeNull();
    const call = checkoutCall(shopping(2), 'bia');
    expect(call).toMatchObject({ kind: 'checkout', room: 'sala' });
    expect(checkoutCall(shopping(2, true), 'bia')).toBeNull();
    expect(checkoutCall(shopping(2), 'luna')).toBeNull();
    const elsewhere = shopping(2);
    expect(checkoutCall({ ...elsewhere, location: { kind: 'interior', building: 1, room: 'sala' } }, 'bia')).toBeNull();
  });
});
