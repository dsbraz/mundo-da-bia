import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { knownStock } from './stock-validation';
import { migrateNeighborhood } from '../domain/neighborhood';
import { initialAlbum } from '../domain/houses';
import { initialWorld } from '../domain/world';
import { fullStock, stockOf } from '../domain/stock';
import type { Neighborhood } from '../domain/neighborhood-types';

const town = () => migrateNeighborhood(initialAlbum(initialWorld()));
const withStock = (stock: unknown): string => {
  const base = town();
  return JSON.stringify({ version: 3, town: { ...base, buildings: base.buildings.map(b => ({ ...b, stock })) } });
};
const loadedStock = (raw: string) => decodeNeighborhood(raw)!.buildings[0]!.stock;

describe('a despensa no save (W3L-20, §4)', () => {
  it('um save antigo (v2, v3 sem despensa e o v3 rico) carrega com 4 de cada', () => {
    const v2 = readFileSync(new URL('./fixtures/rich-save-v2.json', import.meta.url), 'utf8');
    const v3 = readFileSync(new URL('./fixtures/rich-save-v3.json', import.meta.url), 'utf8');
    for (const raw of [v2, v3, encodeNeighborhood(town())]) {
      const loaded = decodeNeighborhood(raw)!;
      expect(loaded.buildings.every(b => !Object.hasOwn(b, 'stock'))).toBe(true);
      expect(loaded.buildings.map(stockOf)).toEqual(loaded.buildings.map(() => fullStock()));
    }
  });
  it('estoque 9 vira 4; zero, negativo, fração e chave desconhecida saem sozinhos', () => {
    expect(loadedStock(withStock({ ovo: 9, leite: 2, pao: 0, queijo: -1, farinha: 1.5, kiwi: 3, mel: 2 }))).toEqual({ ovo: 4, leite: 2 });
    expect(knownStock({ acucar: 4, oleo: '3', batata: 1 })).toEqual({ acucar: 4, batata: 1 });
  });
  it('a despensa vazia continua vazia depois de salvar e carregar; o que não é despensa vira cheia', () => {
    const empty: Neighborhood = { ...town(), buildings: town().buildings.map(b => ({ ...b, stock: {} })) };
    expect(decodeNeighborhood(encodeNeighborhood(empty))).toEqual(empty);
    for (const stock of ['muito', 7, null, [1, 2]]) expect(Object.hasOwn(decodeNeighborhood(withStock(stock))!.buildings[0]!, 'stock')).toBe(false);
    expect(knownStock(undefined)).toBeUndefined();
  });
  it('cozinhar, salvar e carregar devolve o mesmo bairro', () => {
    const cooked: Neighborhood = { ...town(), buildings: town().buildings.map(b => ({ ...b, stock: { ...fullStock(), ovo: 3 } })) };
    expect(decodeNeighborhood(encodeNeighborhood(cooked))).toEqual(cooked);
  });
});
