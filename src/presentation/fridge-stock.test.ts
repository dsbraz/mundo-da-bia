import { describe, expect, it } from 'vitest';
import { fridgeIcon, fridgeSpots } from './fridge-stock';

const full = { farinha: 4, ovo: 4, leite: 4, acucar: 4, pao: 4, queijo: 4, peixe: 4, batata: 4, oleo: 4 };
describe('a geladeira aberta desenha o estoque em fileiras (W3L-23)', () => {
  it('vazia não desenha nada', () => {
    expect(fridgeSpots({})).toEqual([]);
    expect(fridgeSpots({ pao: 0 })).toEqual([]);
  });
  it('ícones grandes: pelo menos 26 px de tela a 1024 (a cena de 898 unidades cabe em 1024 px; a geladeira é desenhada a 96%)', () => {
    expect(fridgeIcon * 0.96 * 1024 / 898).toBeGreaterThanOrEqual(26);
  });
  it('cada básico tem um lugar na fileira da sua prateleira; mais unidades ficam logo atrás, sem virar torre', () => {
    const one = fridgeSpots({ leite: 1 }), four = fridgeSpots({ leite: 4 });
    expect(one).toHaveLength(1);
    expect(four).toHaveLength(4);
    expect(fridgeSpots({ leite: 9 })).toHaveLength(4);
    const front = four.at(-1)!;
    expect(front).toEqual(one[0]);
    four.slice(0, -1).forEach(s => { expect(front.y - s.y).toBeLessThanOrEqual(10); expect(s.back).toBe(true); });
    expect(front.back).toBe(false);
  });
  it('os básicos se alinham em fileiras de até 4, sem se sobrepor, dentro da geladeira', () => {
    const fronts = fridgeSpots(full).filter(s => !s.back);
    expect(fronts).toHaveLength(9);
    const rows = new Map<number, number[]>();
    fronts.forEach(s => rows.set(s.y, [...rows.get(s.y) ?? [], s.x]));
    [...rows.values()].forEach(xs => {
      expect(xs.length).toBeLessThanOrEqual(4);
      const sorted = [...xs].sort((a, b) => a - b);
      sorted.slice(1).forEach((x, n) => expect(x - sorted[n]!).toBeGreaterThanOrEqual(fridgeIcon));
    });
    fronts.forEach(s => { expect(s.x - fridgeIcon / 2).toBeGreaterThanOrEqual(10); expect(s.x + fridgeIcon / 2).toBeLessThanOrEqual(142); });
  });
});
