import { describe, expect, it } from 'vitest';
import { fridgeSpots } from './fridge-stock';

describe('a geladeira aberta desenha o estoque (W3L-23)', () => {
  it('vazia não desenha nada', () => {
    expect(fridgeSpots({})).toEqual([]);
    expect(fridgeSpots({ pao: 0 })).toEqual([]);
  });
  it('cada básico tem seu lugar; a pilha sobe com a quantidade, até 4, sem número', () => {
    const one = fridgeSpots({ leite: 1 });
    expect(one).toHaveLength(1);
    const four = fridgeSpots({ leite: 4 });
    expect(four).toHaveLength(4);
    expect(four.every(s => s.id === 'leite' && s.x === one[0]!.x)).toBe(true);
    expect(four.map(s => s.y)).toEqual([...four.map(s => s.y)].sort((a, b) => b - a));
    expect(fridgeSpots({ leite: 9 })).toHaveLength(4);
  });
  it('os 9 básicos cabem dentro da geladeira sem se sobrepor e sem tapar o lanche no meio', () => {
    const full = fridgeSpots({ farinha: 1, ovo: 1, leite: 1, acucar: 1, pao: 1, queijo: 1, peixe: 1, batata: 1, oleo: 1 });
    expect(new Set(full.map(s => `${s.x},${s.y}`)).size).toBe(9);
    full.forEach(s => { expect(s.x).toBeGreaterThanOrEqual(20); expect(s.x).toBeLessThanOrEqual(104); expect(s.y).toBeGreaterThanOrEqual(84); expect(s.y).toBeLessThanOrEqual(160); });
    expect(full.filter(s => s.y > 115).every(s => Math.abs(s.x - 60) >= 20)).toBe(true);
  });
});
