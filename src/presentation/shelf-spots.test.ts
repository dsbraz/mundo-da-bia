import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { marketGoods } from '../domain/market';
import { goodSpots } from './market-art';
import type { Layout, Piece } from '../domain/types';

// The shelf drawing's three boards: what stands on them rests its bottom on y 82, 140 and 198.
const boards = [62, 120, 178];
const rows = (count: number) => [...new Set(goodSpots(count).map(s => s.y))];
it('a prateleira não deixa tábua vazia (lote 6B): os produtos se repartem pelas três tábuas, centrados', () => {
  expect(rows(6)).toEqual(boards);
  expect(rows(3)).toEqual(boards);
  expect(rows(9)).toEqual(boards);
  // Two per board on the bakery shelf, centred on the shelf (85 is its middle).
  const bakery = goodSpots(6);
  for (const y of boards) expect(bakery.filter(s => s.y === y).reduce((sum, s) => sum + s.x, 0) / 2).toBe(85);
  expect(goodSpots(3).every(s => s.x === 85)).toBe(true);
});
it('no máximo 9 à vista, 3 por tábua, nunca duas no mesmo lugar; com dois, um em cima e um embaixo', () => {
  expect(goodSpots(12)).toHaveLength(9);
  expect(goodSpots(12)).toEqual(goodSpots(9));
  expect(goodSpots(0)).toEqual([]);
  for (const count of [1, 2, 4, 5, 7, 8]) {
    const spots = goodSpots(count);
    expect(new Set(spots.map(s => `${s.x}:${s.y}`)).size).toBe(count);
    for (const y of boards) expect(spots.filter(s => s.y === y).length).toBeLessThanOrEqual(3);
    expect(spots.every(s => boards.includes(s.y))).toBe(true);
  }
  expect(rows(2)).toEqual([62, 178]);
  // In order, top to bottom: the first good is on the top board.
  expect(goodSpots(4)[0]!.y).toBe(62);
});
it('as duas prateleiras do mercado novo enchem as três tábuas', () => {
  const layout: Layout = { ...initialWorld().layout, pieces: [1, 2].map(id => ({ id, kind: 'market-shelf', room: 'sala', x: 0, y: 0, color: 'original', flipped: false }) as Piece) };
  for (const piece of layout.pieces) expect(rows(marketGoods(layout, piece).length)).toEqual(boards);
});
