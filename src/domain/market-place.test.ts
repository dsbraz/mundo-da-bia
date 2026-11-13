import { describe, expect, it } from 'vitest';
import { hasMarket, isMarket, marketGoods, shelfDesign } from './market';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import { editWorld } from './design';
import type { Layout, Piece, PieceKind, RoomId } from './types';
import type { Neighborhood } from './neighborhood-types';

const start = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
const market = () => neighborhoodAction(start(), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
const piece = (id: number, kind: PieceKind, room: RoomId = 'sala'): Piece => ({ id, kind, room, x: 40 + id * 10, y: 200, color: 'original', flipped: false });
const layoutWith = (...pieces: Piece[]): Layout => ({ ...initialWorld().layout, pieces, nextId: 99 });

describe('o mercado (W3L-21)', () => {
  it('o plano Mercado da loja cria um salão com 2 prateleiras, geladeira e caixa, e um depósito', () => {
    const shop = market().buildings.at(-1)!;
    expect(shop).toMatchObject({ model: 'shop', name: 'Mercado 2', plot: 1 });
    const kinds = shop.layout.pieces.filter(p => p.room === 'sala').map(p => p.kind);
    expect(kinds.filter(k => k === 'market-shelf')).toHaveLength(2);
    expect(kinds).toEqual(expect.arrayContaining(['fridge', 'checkout']));
    expect(shop.layout.rooms.sala).toMatchObject({ name: 'Mercado', template: 'market' });
    expect(shop.layout.rooms.quarto).toMatchObject({ name: 'Depósito' });
    expect(isMarket(shop.layout, 'sala')).toBe(true);
    expect(isMarket(shop.layout, 'quarto')).toBe(false);
  });
  it('a loja sem plano continua como era, e o plano só vale para a loja', () => {
    const plain = neighborhoodAction(start(), { type: 'construct', plot: 1, model: 'shop' }).buildings.at(-1)!;
    expect(plain.layout.pieces.some(p => p.kind === 'market-shelf' || p.kind === 'checkout')).toBe(false);
    expect(plain.name).toBe('Loja 2');
    const house = neighborhoodAction(start(), { type: 'construct', plot: 1, model: 'house', plan: 'market' }).buildings.at(-1)!;
    expect(house.layout.pieces.some(p => p.kind === 'market-shelf')).toBe(false);
  });
  it('um lugar é o que tem dentro: prateleira e caixa no mesmo cômodo fazem um mercado, em qualquer casa', () => {
    expect(isMarket(layoutWith(piece(1, 'market-shelf'), piece(2, 'checkout')), 'sala')).toBe(true);
    expect(isMarket(layoutWith(piece(1, 'market-shelf')), 'sala')).toBe(false);
    expect(isMarket(layoutWith(piece(2, 'checkout')), 'sala')).toBe(false);
    expect(isMarket(layoutWith(piece(1, 'market-shelf'), piece(2, 'checkout', 'quarto')), 'sala')).toBe(false);
    const built = editWorld(editWorld(initialWorld(), { type: 'add', kind: 'market-shelf' }), { type: 'add', kind: 'checkout' });
    expect(isMarket(built.layout, built.room)).toBe(true);
  });
  it('há mercado no bairro quando algum cômodo de alguma construção é mercado', () => {
    expect(hasMarket(start())).toBe(false);
    expect(hasMarket(market())).toBe(true);
  });
  it('as prateleiras de um cômodo se revezam nos 3 desenhos, pela ordem em que entraram', () => {
    const layout = layoutWith(piece(5, 'market-shelf'), piece(3, 'market-shelf'), piece(9, 'market-shelf'), piece(4, 'market-shelf', 'quarto'), piece(12, 'market-shelf'));
    expect(layout.pieces.map(p => shelfDesign(layout, p))).toEqual([1, 0, 2, 0, 0]);
  });
  it('cada desenho vende o seu: padaria e laticínios, hortifrúti e óleo; o que se revelou vai para a de especiais, ou para a última', () => {
    const progress = ['chocolate', 'semente-milho'] as const;
    const two = layoutWith(piece(1, 'market-shelf'), piece(2, 'market-shelf'));
    expect(marketGoods(two, two.pieces[0]!)).toEqual(['pao', 'leite', 'queijo', 'ovo', 'farinha', 'acucar']);
    expect(marketGoods(two, two.pieces[1]!)).toEqual(['batata', 'oleo', 'peixe']);
    expect(marketGoods(two, two.pieces[1]!, progress)).toEqual(['batata', 'oleo', 'peixe', 'chocolate', 'semente-milho']);
    const three = layoutWith(piece(1, 'market-shelf'), piece(2, 'market-shelf'), piece(3, 'market-shelf'));
    expect(marketGoods(three, three.pieces[1]!, progress)).toEqual(['batata', 'oleo', 'peixe']);
    expect(marketGoods(three, three.pieces[2]!, progress)).toEqual(['chocolate', 'semente-milho']);
    const one = layoutWith(piece(1, 'market-shelf'));
    expect(marketGoods(one, one.pieces[0]!, progress)).toEqual(['pao', 'leite', 'queijo', 'ovo', 'farinha', 'acucar', 'chocolate', 'semente-milho']);
    expect(marketGoods(one, piece(7, 'stove'), progress)).toEqual([]);
  });
});
