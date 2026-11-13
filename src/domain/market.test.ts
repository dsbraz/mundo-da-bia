import { describe, expect, it } from 'vitest';
import { bagLimit, buy, checkout, storeGoods, stockUp, unpaidExit } from './market';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import { fullStock, stockOf } from './stock';
import type { Neighborhood, NeighborhoodItem } from './neighborhood-types';
import type { ActorId, RoomId } from './types';

const hall = { kind: 'interior' as const, building: 2, room: 'sala' as const };
const home = { kind: 'interior' as const, building: 1, room: 'sala' as const };
/** Home (1) and a market (2); Bia in the market hall with empty hands, Luna at home. */
function town(): Neighborhood {
  const built = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
  return { ...built, location: hall, items: built.items.map(i => ({ ...i, holder: null })),
    actors: built.actors.map(a => a.id === 'bia' ? { ...a, seat: null, location: hall, room: 'sala' as const, x: 500, y: 500 } : a) };
}
const shelves = (t: Neighborhood) => t.buildings.find(b => b.id === 2)!.layout.pieces.filter(p => p.kind === 'market-shelf').map(p => p.id);
const bag = (t: Neighborhood, who: ActorId = 'bia') => t.items.find(i => i.kind === 'sacola' && i.holder === who);
const shop = (t: Neighborhood, ...goods: string[]) => goods.reduce((next, good) => buy(next, { actor: 'bia', piece: shelves(next)[good === 'batata' || good === 'oleo' ? 1 : 0]!, good: good as never }).town, t);
const carried = (t: Neighborhood, where: { kind: 'interior'; building: number; room: RoomId } = home, who: ActorId = 'bia'): Neighborhood => ({ ...t, location: where,
  actors: t.actors.map(a => a.id === who ? { ...a, location: where, room: where.room } : a), items: t.items.map(i => i.holder === who ? { ...i, location: where, room: where.room } : i) });

describe('as compras (W3L-22)', () => {
  it('tocar no pão da prateleira põe uma sacola na mão, com o pão dentro, ainda sem pagar', () => {
    const result = buy(town(), { actor: 'bia', piece: shelves(town())[0]!, good: 'pao' });
    expect(result.outcome).toEqual({ kind: 'bagged' });
    expect(bag(result.town)).toMatchObject({ kind: 'sacola', contents: ['pao'], paid: false, holder: 'bia', location: hall, spot: 'floor' });
    expect(result.town.nextItem).toBe(town().nextItem + 1);
  });
  it('a sacola leva até 6; o 7º não entra e nada muda', () => {
    expect(bagLimit).toBe(6);
    const full = shop(town(), 'pao', 'leite', 'ovo', 'pao', 'queijo', 'acucar');
    expect(bag(full)!.contents).toEqual(['pao', 'leite', 'ovo', 'pao', 'queijo', 'acucar']);
    const seventh = buy(full, { actor: 'bia', piece: shelves(full)[0]!, good: 'farinha' });
    expect(seventh).toEqual({ town: full, outcome: { kind: 'full' } });
  });
  it('só se compra o que a prateleira tem, no mercado, com a mão livre ou com a sacola', () => {
    const t = town(), [bakery, greens] = shelves(t);
    expect(buy(t, { actor: 'bia', piece: bakery!, good: 'batata' }).town).toBe(t);
    expect(buy(t, { actor: 'bia', piece: greens!, good: 'batata' }).outcome).toEqual({ kind: 'bagged' });
    expect(buy(t, { actor: 'bia', piece: bakery!, good: 'chocolate' }).outcome).toEqual({ kind: 'none' });
    expect(buy(t, { actor: 'luna', piece: bakery!, good: 'pao' }).outcome).toEqual({ kind: 'none' });
    expect(buy(t, { actor: 'bia', piece: 999, good: 'pao' }).outcome).toEqual({ kind: 'none' });
    const busy = { ...t, items: t.items.map(i => i.id === '1:ursinho' ? { ...i, holder: 'bia' as const, location: hall, room: 'sala' as const } : i) };
    expect(buy(busy, { actor: 'bia', piece: bakery!, good: 'pao' })).toEqual({ town: busy, outcome: { kind: 'missing', need: 'hands' } });
    const revealed = { ...t, progress: { ...t.progress, shelves: ['chocolate' as const] } };
    expect(buy(revealed, { actor: 'bia', piece: greens!, good: 'chocolate' }).outcome).toEqual({ kind: 'bagged' });
  });
  it('o caixa faz bipe e põe a fita de paga; sem sacola ou fora do mercado, nada muda', () => {
    const bagged = shop(town(), 'pao', 'leite');
    const paid = checkout(bagged, 'bia');
    expect(paid.outcome).toEqual({ kind: 'paid' });
    expect(bag(paid.town)).toMatchObject({ contents: ['pao', 'leite'], paid: true });
    expect(checkout(town(), 'bia')).toEqual({ town: town(), outcome: { kind: 'none' } });
    expect(checkout(carried(bagged), 'bia').outcome).toEqual({ kind: 'none' });
    expect(checkout(paid.town, 'bia').outcome).toEqual({ kind: 'paid' });
  });
  it('sair do mercado sem pagar devolve a falta do caixa; dentro do mercado anda livre; paga, sai', () => {
    const bagged = shop(town(), 'pao');
    const out = { type: 'transport' as const, actor: 'bia' as const, location: { kind: 'street' as const }, point: { x: 600, y: 500 } };
    expect(unpaidExit(bagged, out)).toEqual({ kind: 'missing', need: 'checkout' });
    expect(neighborhoodAction(bagged, out)).toBe(bagged);
    expect(unpaidExit(bagged, { ...out, location: { ...hall, room: 'quarto' } })).toBeNull();
    expect(unpaidExit(town(), out)).toBeNull();
    const paid = checkout(bagged, 'bia').town;
    expect(unpaidExit(paid, out)).toBeNull();
    expect(neighborhoodAction(paid, out).actors.find(a => a.id === 'bia')!.location).toEqual({ kind: 'street' });
    const dropped = { ...bagged, items: bagged.items.map(i => i.kind === 'sacola' ? { ...i, holder: null } : i) };
    expect(unpaidExit(dropped, { type: 'transport', item: bag(bagged)!.id, location: home, point: { x: 500, y: 500 } })).toEqual({ kind: 'missing', need: 'checkout' });
  });
  it('stock-up: 3 ovos sobre 3 em casa deixa 4 na despensa e 2 na sacola, que fica na mão', () => {
    const t = town(), atHome = { ...t, buildings: t.buildings.map(b => b.id === 1 ? { ...b, stock: { ...fullStock(), ovo: 3 } } : b) };
    const paid = carried(checkout(shop(atHome, 'ovo', 'ovo', 'ovo'), 'bia').town);
    const result = stockUp(paid, 'bia');
    expect(result.outcome).toEqual({ kind: 'stored', left: 2 });
    expect(stockOf(result.town.buildings[0]!).ovo).toBe(4);
    expect(bag(result.town)).toMatchObject({ contents: ['ovo', 'ovo'], paid: true });
  });
  it('guardar tudo some com a sacola; especiais e sementes viram conquista; sacola sem pagar pede o caixa', () => {
    const t = town(), atHome = { ...t, buildings: t.buildings.map(b => b.id === 1 ? { ...b, stock: { leite: 1 } } : b), progress: { ...t.progress, shelves: ['chocolate' as const, 'semente-milho' as const] } };
    const goods = shop(atHome, 'leite', 'pao');
    const withSpecials = buy(buy(goods, { actor: 'bia', piece: shelves(goods)[1]!, good: 'chocolate' }).town, { actor: 'bia', piece: shelves(goods)[1]!, good: 'semente-milho' }).town;
    expect(stockUp(carried(withSpecials), 'bia')).toEqual({ town: carried(withSpecials), outcome: { kind: 'missing', need: 'checkout' } });
    const stored = stockUp(carried(checkout(withSpecials, 'bia').town), 'bia');
    expect(stored.outcome).toEqual({ kind: 'stored', left: 0 });
    expect(bag(stored.town)).toBeUndefined();
    expect(stored.town.buildings[0]!.stock).toEqual({ leite: 2, pao: 1 });
    expect(stored.town.progress.specials).toEqual(['chocolate']);
    expect(stored.town.progress.seeds).toEqual(['alface', 'tomate', 'cenoura', 'milho']);
  });
  it('sem geladeira no cômodo, ou sem sacola, não guarda', () => {
    const paid = checkout(shop(town(), 'pao'), 'bia').town;
    const noFridge = carried(paid, { ...home, room: 'quarto' });
    expect(stockUp(noFridge, 'bia').outcome).toEqual({ kind: 'none' });
    expect(stockUp(carried(town()), 'bia').outcome).toEqual({ kind: 'none' });
  });
  it('storeGoods (para quem traz compras do trabalho, lote 5): enche até 4 e devolve o que sobrou, sem sacola', () => {
    const result = storeGoods(town(), 1, ['ovo', 'leite', 'semente-morango', 'mel']);
    expect(result.left).toEqual(['ovo', 'leite']);
    expect(result.town.buildings[0]!.stock).toBeUndefined();
    expect(result.town.progress.specials).toEqual(['mel']);
    expect(storeGoods(town(), 99, ['ovo']).left).toEqual(['ovo']);
  });
  it('as ações do bairro aplicam as mesmas regras', () => {
    const t = town(), piece = shelves(t)[0]!;
    const bought = neighborhoodAction(t, { type: 'buy', actor: 'bia', piece, good: 'pao' });
    expect(bought).toEqual(buy(t, { actor: 'bia', piece, good: 'pao' }).town);
    const paid = neighborhoodAction(bought, { type: 'checkout', actor: 'bia' });
    expect((paid.items.find(i => i.kind === 'sacola') as NeighborhoodItem).paid).toBe(true);
    const stored = neighborhoodAction(carried(paid), { type: 'stock-up', actor: 'bia' });
    expect(stored).toEqual(stockUp(carried(paid), 'bia').town);
  });
});
