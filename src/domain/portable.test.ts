import { expect, it } from 'vitest';
import { consumeItem, spawnItem } from './portable';
import { migrateNeighborhood } from './neighborhood';
import { initialAlbum } from './houses';
import { initialWorld } from './world';
import { put } from './furniture';
import { localWorld } from './neighborhood';
import { fridgeKinds, portableKinds } from './item-kind';

const town = () => ({ ...migrateNeighborhood(initialAlbum(initialWorld())), nextItem: 7 });
const kitchen = { kind: 'interior' as const, building: 1, room: 'sala' as const };

it('spawnItem duas vezes cria 7:prato e 8:prato na mesma casa', () => {
  const once = spawnItem(town(), { kind: 'prato', recipe: 'panqueca', location: kitchen, point: { x: 400, y: 520 } });
  const twice = spawnItem(once, { kind: 'prato', recipe: 'pizza', fancy: true, location: kitchen, point: { x: 450, y: 520 } });
  expect(twice.items.slice(-2)).toEqual([
    { id: '7:prato', kind: 'prato', recipe: 'panqueca', room: 'sala', location: kitchen, x: 400, y: 520, holder: null, spot: 'floor' },
    { id: '8:prato', kind: 'prato', recipe: 'pizza', fancy: true, room: 'sala', location: kitchen, x: 450, y: 520, holder: null, spot: 'floor' }]);
  expect(twice.nextItem).toBe(9);
  expect(spawnItem(town(), { kind: 'colher', location: { kind: 'street' }, point: { x: 900, y: 520 } }).items.at(-1))
    .toEqual({ id: '7:colher', kind: 'colher', room: 'sala', location: { kind: 'street' }, x: 900, y: 520, holder: null, spot: 'floor' });
});
it('consumeItem remove o item e libera a mão de quem o segurava', () => {
  const base = spawnItem(town(), { kind: 'prato', recipe: 'panqueca', location: kitchen, point: { x: 520, y: 530 } });
  const held = { ...base, items: base.items.map(i => i.id === '7:prato' ? { ...i, holder: 'bia' as const } : i) };
  const eaten = consumeItem(held, '7:prato');
  expect(eaten.items.map(i => i.id)).toEqual(town().items.map(i => i.id));
  expect(eaten.items.some(i => i.holder === 'bia')).toBe(false);
  expect(eaten.nextItem).toBe(8);
  expect(consumeItem(held, '99:prato')).toBe(held);
});
it('prato vai para a geladeira; microfone continua sem ir', () => {
  expect(fridgeKinds).toEqual(['lanche', 'peixe', 'prato']);
  expect(portableKinds).toEqual(['bola', 'prato', 'estetoscopio', 'curativo', 'regador', 'lanterna', 'colher', 'cesta', 'sacola']);
  const withDish = spawnItem(town(), { kind: 'prato', recipe: 'panqueca', location: kitchen, point: { x: 520, y: 530 } });
  const world = localWorld(withDish);
  expect(put(world, '7:prato', 'fridge').state.items.find(i => i.id === '7:prato')!.spot).toBe('fridge');
  expect(put(world, '1:microfone', 'fridge').events).toEqual([{ type: 'missing', need: 'place' }]);
});
