import { describe, expect, it } from 'vitest';
import { initialWorld } from './world';
import { initialAlbum } from './houses';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { work } from './work';
import type { BuildingModel, Neighborhood, Resident } from './neighborhood-types';
import type { ActorId, RoomTemplate } from './types';

const home = (): Neighborhood => migrateNeighborhood(initialAlbum(initialWorld()));
/** A neighborhood with a building of `model` on plot 1 (a market when `market`). */
const withBuilding = (model: BuildingModel, market = false): Neighborhood =>
  neighborhoodAction(home(), { type: 'construct', plot: 1, model, ...(market ? { plan: 'market' as const } : {}) });
const who = (town: Neighborhood, id: ActorId) => town.actors.find(a => a.id === id)!;
const put = (town: Neighborhood, id: ActorId, location: Resident['location']): Neighborhood =>
  ({ ...town, actors: town.actors.map(a => a.id === id ? { ...a, location, room: location.kind === 'interior' ? location.room : 'sala', seat: null } : a) });
/** The room of the newest building with `template`. */
function roomOf(town: Neighborhood, template: RoomTemplate): Resident['location'] {
  const building = town.buildings.at(-1)!, room = Object.entries(building.layout.rooms).find(([, r]) => r.template === template)![0];
  return { kind: 'interior', building: building.id, room: room as Resident['room'] };
}
const homeRoom: Resident['location'] = { kind: 'interior', building: 1, room: 'sala' };

describe('trabalho (W3L-25, §3.6)', () => {
  it.each([
    ['shop', true, 'market', 'market'], ['office', false, 'office', 'office'], ['hospital', false, 'consultation', 'doctor'],
    ['fire-station', false, 'dispatch', 'firefighter'], ['police', false, 'dispatch', 'police'],
  ] as const)('no cômodo de trabalho de %s o adulto veste o uniforme', (model, market, template, look) => {
    const town = withBuilding(model, market);
    expect(who(work(put(town, 'daniel', roomOf(town, template)), 'manha'), 'daniel').look).toBe(look);
  });
  it('o look anterior é guardado e volta ao sair; as crianças nunca trocam de roupa', () => {
    const town = withBuilding('office'), office = roomOf(town, 'office');
    const there = work(put(put(town, 'fabiana', office), 'bia', office), 'manha');
    expect(who(there, 'fabiana')).toMatchObject({ look: 'office', work: { look: 'sol' } });
    expect(who(there, 'bia').look).toBe('sol');
    const out = work(put(there, 'fabiana', { kind: 'street' }), 'manha');
    expect(who(out, 'fabiana').look).toBe('sol');
    expect(work(out, 'manha')).toBe(out);
  });
  it('sem o look anterior guardado (o save não guarda o turno), volta à roupa do dia a dia', () => {
    const town = withBuilding('office'), office = roomOf(town, 'office');
    const dressed = { ...town, actors: town.actors.map(a => a.id === 'daniel' ? { ...a, look: 'office' as const } : a) };
    const there = work(put(dressed, 'daniel', office), 'manha');
    expect(who(work(put(there, 'daniel', homeRoom), 'manha'), 'daniel').look).toBe('outing');
  });
  it('fora do trabalho e sem turno nada muda', () => {
    const town = withBuilding('office');
    expect(work(town, 'tarde')).toBe(town);
    const shop = withBuilding('shop', true), storeroom = put(shop, 'daniel', roomOf(shop, 'empty'));
    expect(work(storeroom, 'manha')).toBe(storeroom);
  });
  it('ao voltar para casa à tarde com mercado no bairro, chega com uma sacola paga dos 3 básicos mais em falta', () => {
    const office = neighborhoodAction(withBuilding('shop', true), { type: 'construct', plot: 2, model: 'office' });
    const low = { ...office, buildings: office.buildings.map(b => b.id === 1 ? { ...b, stock: { farinha: 4, ovo: 1, leite: 2, acucar: 4, pao: 3, queijo: 4, oleo: 4, batata: 4 } } : b) };
    const shift = work(put(low, 'daniel', roomOf(low, 'office')), 'manha');
    const back = work(put(work(put(shift, 'daniel', { kind: 'street' }), 'tarde'), 'daniel', homeRoom), 'tarde');
    const bag = back.items.find(i => i.holder === 'daniel')!;
    expect(bag).toMatchObject({ kind: 'sacola', paid: true, contents: ['peixe', 'ovo', 'leite'], location: homeRoom });
    expect(who(back, 'daniel').work).toBeUndefined();
    expect(work(back, 'tarde')).toBe(back);
    const evening = work(put(work(put(shift, 'daniel', { kind: 'street' }), 'entardecer'), 'daniel', homeRoom), 'entardecer');
    expect(evening.items.some(i => i.holder === 'daniel' && i.kind === 'sacola')).toBe(true);
  });
  it('de manhã, ou sem mercado no bairro, volta para casa sem sacola', () => {
    const withMarket = neighborhoodAction(withBuilding('shop', true), { type: 'construct', plot: 2, model: 'office' });
    for (const [town, phase] of [[withMarket, 'manha'], [withBuilding('office'), 'tarde']] as const) {
      const shift = work(put(town, 'daniel', roomOf(town, 'office')), 'manha');
      const back = work(put(shift, 'daniel', homeRoom), phase);
      expect(back.items.length).toBe(town.items.length);
      expect(who(back, 'daniel')).toMatchObject({ look: 'outing' }); expect(who(back, 'daniel').work).toBeUndefined();
    }
  });
  it('com as mãos ocupadas, a sacola fica no chão aos pés do adulto', () => {
    const office = neighborhoodAction(withBuilding('shop', true), { type: 'construct', plot: 2, model: 'office' });
    const shift = work(put(office, 'daniel', roomOf(office, 'office')), 'manha');
    const arrived = put(shift, 'daniel', homeRoom), daniel = who(arrived, 'daniel');
    const holding = { ...arrived, items: arrived.items.map(i => i.kind === 'ursinho' ? { ...i, holder: 'daniel' as const, location: homeRoom, room: 'sala' as const } : i) };
    const bag = work(holding, 'tarde').items.find(i => i.kind === 'sacola')!;
    expect(bag).toMatchObject({ holder: null, x: daniel.x, y: daniel.y, spot: 'floor', paid: true });
  });
  it('pela ação do bairro: { type: "work", phase }', () => {
    const town = withBuilding('office'), there = put(town, 'daniel', roomOf(town, 'office'));
    expect(neighborhoodAction(there, { type: 'work', phase: 'manha' })).toEqual(work(there, 'manha'));
  });
});
