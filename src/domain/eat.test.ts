import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { catDishes, edible } from './care';
import { initialAlbum } from './houses';
import { localWorld, migrateNeighborhood, storeWorld } from './neighborhood';
import { recipes } from './recipes';
import { tastes } from './tastes';
import type { RecipeId } from './progress';
import type { NeighborhoodItem } from './neighborhood-types';
import type { ActorId, Item, World } from './types';

const dish = (recipe: RecipeId, holder: ActorId | null = null): Item =>
  ({ id: '9:prato', kind: 'prato', recipe, room: 'sala', x: 400, y: 500, holder, spot: 'floor' }) as Item;
const withDish = (recipe: RecipeId, holder: ActorId | null = null): World => ({ ...initialWorld(), items: [...initialWorld().items, dish(recipe, holder)] });
const actor = (world: World, id: ActorId) => world.actors.find(a => a.id === id)!;
const dishes = (world: World) => world.items.filter(i => i.kind === 'prato');

it('Luna come pizza: o prato some, fed fica true e é o favorito dela (reação grande)', () => {
  const before = withDish('pizza');
  const result = transition(before, { type: 'give', actor: 'luna', item: '9:prato' });
  expect(dishes(result.state)).toEqual([]);
  expect(actor(result.state, 'luna')).toMatchObject({ fed: true, resting: false });
  expect(result.events).toEqual([{ type: 'ate', actor: 'luna', favorite: true }]);
  expect(result.state.items).toHaveLength(before.items.length - 1);
});

it('Mimi recusa pizza: cheira, o prato fica onde estava e ela não come', () => {
  const before = withDish('pizza');
  const result = transition(before, { type: 'give', actor: 'mimi', item: '9:prato' });
  expect(result.state).toEqual(before);
  expect(result.events).toEqual([{ type: 'sniffed', actor: 'mimi' }]);
});

it('Pipoca come ovo mexido: o favorito de cada gato é comível por gato', () => {
  const result = transition(withDish('ovo-mexido'), { type: 'give', actor: 'pipoca', item: '9:prato' });
  expect(dishes(result.state)).toEqual([]);
  expect(actor(result.state, 'pipoca').fed).toBe(true);
  expect(result.events).toEqual([{ type: 'ate', actor: 'pipoca', favorite: true }]);
  for (const cat of ['mimi', 'nino', 'pipoca'] as const) expect(catDishes).toContain(tastes[cat].favorite);
});

it('gato só come petisco de gato, leite batidinho e ovo mexido; humano come qualquer prato', () => {
  expect([...catDishes].sort()).toEqual(['leite-batidinho', 'ovo-mexido', 'petisco-de-gato']);
  for (const { id } of recipes) {
    expect(edible({ kind: 'human' }, dish(id)), id).toBe(true);
    expect(edible({ kind: 'cat' }, dish(id)), id).toBe(catDishes.includes(id));
  }
  expect(edible({ kind: 'human' }, initialWorld().items.find(i => i.id === 'lanche')!)).toBe(false);
});

it('quem não tem o prato como favorito come sem reação grande', () => {
  const result = transition(withDish('pizza'), { type: 'give', actor: 'bia', item: '9:prato' });
  expect(result.events).toEqual([{ type: 'ate', actor: 'bia' }]);
  expect(dishes(result.state)).toEqual([]);
});

it('Comer com o prato na mão: humano come e a mão fica livre; gato com pizza na mão cheira e continua segurando', () => {
  const ate = transition(withDish('torrada', 'bia'), { type: 'feed', actor: 'bia' });
  expect(dishes(ate.state)).toEqual([]);
  expect(ate.state.items.some(i => i.holder === 'bia')).toBe(false);
  expect(actor(ate.state, 'bia').fed).toBe(true);
  expect(ate.events).toEqual([{ type: 'ate', actor: 'bia' }]);
  const cat = withDish('pizza', 'nino');
  const sniffed = transition(cat, { type: 'feed', actor: 'nino' });
  expect(sniffed.state).toEqual(cat);
  expect(sniffed.events).toEqual([{ type: 'sniffed', actor: 'nino' }]);
});

it('o prato na mão da Bia, solto na Luna, é comido por ela; com algo na mão a Luna come do mesmo jeito', () => {
  const held = { ...withDish('pizza', 'bia') };
  const busy = transition(held, { type: 'pick', actor: 'luna', item: 'ursinho' }).state;
  const result = transition(busy, { type: 'give', actor: 'luna', item: '9:prato' });
  expect(dishes(result.state)).toEqual([]);
  expect(result.state.items.find(i => i.id === 'ursinho')!.holder).toBe('luna');
  expect(result.events).toEqual([{ type: 'ate', actor: 'luna', favorite: true }]);
});

it('quem dorme acorda para comer; o prato de outro cômodo não pode ser dado', () => {
  const asleep = transition(withDish('pipoca'), { type: 'rest', actor: 'rui' }).state;
  const result = transition(asleep, { type: 'give', actor: 'rui', item: '9:prato' });
  expect(actor(result.state, 'rui')).toMatchObject({ fed: true, resting: false });
  expect(result.events).toEqual([{ type: 'ate', actor: 'rui', favorite: true }]);
  const away = { ...withDish('pizza'), items: [...initialWorld().items, { ...dish('pizza'), room: 'quarto' as const }] };
  expect(transition(away, { type: 'give', actor: 'luna', item: '9:prato' }).state).toBe(away);
});

it('no bairro, o prato comido sai da cidade; pratos de outra casa ficam', () => {
  const base = migrateNeighborhood(initialAlbum(initialWorld()));
  const plate = (id: `${number}:prato`, building: number): NeighborhoodItem =>
    ({ ...dish('pizza'), id, location: { kind: 'interior', building, room: 'sala' } });
  const town = { ...base, items: [...base.items, plate('9:prato', 1), plate('10:prato', 2)] };
  const world = transition(localWorld(town), { type: 'give', actor: 'luna', item: '9:prato' }).state;
  const stored = storeWorld(town, world);
  expect(stored.items.map(i => i.id)).toEqual([...base.items.map(i => i.id), '10:prato']);
  expect(stored.actors.find(a => a.id === 'luna')!.fed).toBe(true);
  expect(storeWorld(town, localWorld(town)).items).toEqual(town.items);
});
