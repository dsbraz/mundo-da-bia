import { describe, expect, it } from 'vitest';
import { foodAtHome, larderOf, snacksOf } from './larder';
import { localWorld, migrateNeighborhood, neighborhoodAction, storeWorld, undoTo } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld, transition } from './world';
import { marketGoods, storeGoods } from './market';
import { work } from './work';
import { destination, suggestion } from './routine';
import { fullStock, stockOf } from './stock';
import type { Building, Neighborhood } from './neighborhood-types';
import type { ActorId, World } from './types';

const home = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
const house = (patch: Partial<Building>): Neighborhood => ({ ...home(), buildings: home().buildings.map(b => b.id === 1 ? { ...b, ...patch } : b) });
const withMarket = (town: Neighborhood = home()) => neighborhoodAction(town, { type: 'construct', plot: 1, model: 'shop', plan: 'market' });
/** `who` takes the fridge food and eats it, in the house's own world. */
function eat(world: World, who: ActorId, item: string) {
  const held = transition(world, { type: 'pick', actor: who, item: item as never });
  return held.state === world ? held : transition(held.state, { type: 'feed', actor: who });
}

describe('a comida da geladeira acaba (lote 6F)', () => {
  it('o lanche começa com 4 (casa nova e todo save antigo) e o peixe dos gatos é o peixe da despensa', () => {
    expect(snacksOf(home().buildings[0]!)).toBe(4);
    expect(larderOf(house({ stock: { peixe: 2 } }).buildings[0]!)).toEqual({ lanche: 4, peixe: 2 });
    expect(larderOf(house({ snacks: 0, stock: {} }).buildings[0]!)).toEqual({ lanche: 0, peixe: 0 });
    expect(localWorld(home()).larder).toEqual({ lanche: 4, peixe: 4 });
  });
  it('comer o lanche 4 vezes esvazia a geladeira; o quinto fica lá, em silhueta, e pegar mostra a bolha do mercado', () => {
    let world = localWorld(home());
    for (let n = 3; n >= 0; n--) {
      const fed = eat(world, 'bia', '1:lanche');
      expect(fed.events.map(e => e.type)).toContain('fed');
      world = fed.state;
      expect(world.larder!.lanche).toBe(n);
      expect(world.items.find(i => i.id === '1:lanche')).toMatchObject({ holder: null, spot: 'fridge' });
    }
    const empty = transition(world, { type: 'pick', actor: 'bia', item: '1:lanche' });
    expect(empty.state).toBe(world);
    expect(empty.events).toEqual([{ type: 'missing', actor: 'bia', need: 'market' }]);
    expect(transition(world, { type: 'give', actor: 'bia', item: '1:lanche' }).events).toEqual([{ type: 'missing', actor: 'bia', need: 'market' }]);
  });
  it('o gato come o peixe da despensa, um de cada vez, e sem peixe a bolha é do mercado', () => {
    const world = localWorld(house({ stock: { peixe: 1, ovo: 2 } }));
    const fed = transition(world, { type: 'give', actor: 'nino', item: '1:peixe' });
    expect(fed.events.map(e => e.type)).toContain('fed');
    expect(fed.state.larder).toEqual({ lanche: 4, peixe: 0 });
    expect(transition(fed.state, { type: 'give', actor: 'nino', item: '1:peixe' }).events).toEqual([{ type: 'missing', actor: 'nino', need: 'market' }]);
    const stored = storeWorld(house({ stock: { peixe: 1, ovo: 2 } }), fed.state);
    expect(stored.buildings[0]!.stock).toEqual({ ovo: 2 });
    expect(stored.buildings[0]!.snacks).toBeUndefined();
  });
  it('o que se comeu volta para a casa no bairro; sem comer, a casa não ganha campo novo', () => {
    const town = home(), fed = eat(localWorld(town), 'bia', '1:lanche').state;
    expect(storeWorld(town, fed).buildings[0]!.snacks).toBe(3);
    expect(storeWorld(town, localWorld(town)).buildings[0]).toEqual(town.buildings[0]);
    expect(Object.hasOwn(storeWorld(town, fed).buildings[0]!, 'stock')).toBe(false);
    expect(localWorld(storeWorld(town, fed)).larder).toEqual({ lanche: 3, peixe: 4 });
  });
  it('na rua, o lanche levado de casa conta na geladeira da "Minha casa"', () => {
    const town = home(), street = { ...town, location: { kind: 'street' as const },
      actors: town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' as const } } : a),
      items: town.items.map(i => i.id === '1:lanche' ? { ...i, holder: 'bia' as const, spot: 'floor' as const, location: { kind: 'street' as const } } : i) };
    const world = localWorld(street);
    expect(world.larder).toEqual({ lanche: 4, peixe: 4 });
    const fed = transition(world, { type: 'feed', actor: 'bia' });
    expect(fed.events.map(e => e.type)).toContain('fed');
    expect(storeWorld(street, fed.state).buildings[0]!.snacks).toBe(3);
  });
  it('o mercado vende o lanche na prateleira do hortifrúti (com o peixe), e guardar enche até 4; o que não cabe volta', () => {
    const town = withMarket(), market = town.buildings.find(b => b.id === 2)!;
    const [bakery, greens] = market.layout.pieces.filter(p => p.kind === 'market-shelf').sort((a, b) => a.id - b.id) as [never, never];
    expect(marketGoods(market.layout, bakery)).not.toContain('lanche');
    expect(marketGoods(market.layout, greens)).toContain('lanche');
    const low = { ...town, buildings: town.buildings.map(b => b.id === 1 ? { ...b, snacks: 2 } : b) };
    const stored = storeGoods(low, 1, ['lanche', 'lanche', 'lanche', 'ovo']);
    expect(stored.town.buildings[0]!.snacks).toBe(4);
    expect(stored.left).toEqual(['lanche', 'ovo']);
    expect(stored.town.progress.specials).toEqual(low.progress.specials);
  });
  it('desfazer em Criar não devolve lanche à geladeira', () => {
    const eaten = house({ snacks: 1 });
    expect(undoTo(home(), eaten).buildings[0]!.snacks).toBe(1);
    expect(Object.hasOwn(undoTo(home(), home()).buildings[0]!, 'snacks')).toBe(false);
  });
  it('os pais voltam do trabalho com o lanche quando é o que mais falta', () => {
    const office = neighborhoodAction(withMarket(), { type: 'construct', plot: 2, model: 'office' });
    const low = { ...office, buildings: office.buildings.map(b => b.id === 1 ? { ...b, snacks: 0, stock: { ...fullStock(), ovo: 1 } } : b) };
    const officeRoom = Object.entries(low.buildings.at(-1)!.layout.rooms).find(([, r]) => r.template === 'office')![0];
    const put = (t: Neighborhood, location: Neighborhood['location']) => ({ ...t, actors: t.actors.map(a => a.id === 'daniel' ? { ...a, location, room: location.kind === 'interior' ? location.room : 'sala' as const, seat: null } : a) });
    const shift = work(put(low, { kind: 'interior', building: 3, room: officeRoom as never }), 'manha');
    const back = work(put(work(put(shift, { kind: 'street' }), 'tarde'), { kind: 'interior', building: 1, room: 'sala' }), 'tarde');
    expect(back.items.find(i => i.holder === 'daniel')!.contents).toEqual(['lanche', 'ovo', 'farinha']);
    expect(stockOf(back.buildings[0]!)).toEqual(stockOf(low.buildings[0]!));
  });
});

describe('com fome e a geladeira vazia, o mercado (lote 6F)', () => {
  const hungry = { kind: 'human' as const, needs: { fome: 80, sono: 0, tedio: 0, alegria: 0 } };
  it('há comida em casa enquanto houver lanche (ou peixe para o gato) ou um prato na casa', () => {
    expect(foodAtHome(home(), 'bia')).toBe(true);
    expect(foodAtHome(house({ snacks: 0 }), 'bia')).toBe(false);
    expect(foodAtHome(house({ snacks: 0 }), 'nino')).toBe(true);
    expect(foodAtHome(house({ stock: {} }), 'nino')).toBe(false);
    const dish = house({ snacks: 0 });
    const plated = { ...dish, items: [...dish.items, { id: '9:prato' as const, kind: 'prato' as const, recipe: 'panqueca' as const, room: 'sala' as const, holder: null, spot: 'floor' as const, x: 400, y: 500, location: { kind: 'interior' as const, building: 1, room: 'sala' as const } }] };
    expect(foodAtHome(plated, 'bia')).toBe(true);
    // Away from home (the market), it is "Minha casa" that counts.
    const away = withMarket(house({ snacks: 0 }));
    expect(foodAtHome({ ...away, actors: away.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'interior', building: 2, room: 'sala' } } : a) }, 'bia')).toBe(false);
  });
  it('a sugestão da fome vira o mercado, e o Mapa marca o mercado (sem mercado, nenhum lugar)', () => {
    expect(suggestion('manha', hungry, 'home', false, false)).toBe('mercado');
    expect(suggestion('manha', hungry, 'home', false, true)).toBe('prato');
    expect(suggestion('manha', hungry, 'home')).toBe('prato');
    expect(suggestion('manha', { ...hungry, needs: { fome: 0, sono: 0, tedio: 0, alegria: 0 } }, 'home', false, false)).toBe('mochila');
    const at = { kind: 'interior' as const, building: 1, room: 'sala' as const };
    expect(destination(withMarket(), 'mercado', at)).toEqual({ kind: 'building', building: 2 });
    expect(destination(home(), 'mercado', at)).toBeNull();
    expect(destination(withMarket(), 'mercado', { kind: 'interior', building: 2, room: 'sala' })).toBeNull();
  });
});
