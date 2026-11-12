import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { editWorld } from './design';
import { seatPoint } from './seats';
import type { RecipeId } from './progress';
import type { ActorId, Item, Piece, World } from './types';

const dish = (recipe: RecipeId, holder: ActorId | null = null): Item =>
  ({ id: '9:prato', kind: 'prato', recipe, room: 'sala', x: 400, y: 500, holder, spot: 'floor' }) as Item;
const standing = (world: World): World => ({ ...world, actors: world.actors.map(a => ({ ...a, seat: null, x: 300 + a.id.length * 40, y: 530 })) });
const chairAt = (world: World, id: number, x: number): World => ({ ...world, layout: { ...world.layout, nextId: id + 1,
  pieces: [...world.layout.pieces, { id, kind: 'chair', room: 'sala', x, y: 320, color: 'original', flipped: false } as Piece] } });
const bia = (world: World) => world.actors.find(a => a.id === 'bia')!;

it('comer sentado consome o prato, e quem está em pé senta primeiro, numa cadeira se houver', () => {
  const world = { ...chairAt(standing(initialWorld()), 40, 820), items: [...initialWorld().items, dish('sanduiche', 'bia')] };
  const result = transition(world, { type: 'feed', actor: 'bia' });
  expect(result.state.items.some(i => i.id === '9:prato')).toBe(false);
  expect(bia(result.state)).toMatchObject({ seat: '40.0', fed: true, ...seatPoint(world, '40.0') });
  expect(result.events).toEqual([{ type: 'ate', actor: 'bia', recipe: 'sanduiche' }]);
});
it('quem já está sentado come ali mesmo', () => {
  const seated = transition(standing(initialWorld()), { type: 'sit', actor: 'bia', seat: '2.0' }).state;
  const result = transition({ ...seated, items: [...seated.items, dish('panqueca')] }, { type: 'give', actor: 'bia', item: '9:prato' });
  expect(bia(result.state)).toMatchObject({ seat: '2.0', x: 150, y: 405, fed: true });
  expect(result.events[0]).toMatchObject({ type: 'ate', actor: 'bia', recipe: 'panqueca' });
});
it('sem assento livre devolve missing:table e o prato fica na mão', () => {
  const empty = standing(editWorld(initialWorld(), { type: 'clear' }));
  const fromFloor = transition({ ...empty, items: [...empty.items, dish('torrada')] }, { type: 'give', actor: 'bia', item: '9:prato' });
  expect(fromFloor.events).toEqual([{ type: 'missing', actor: 'bia', need: 'table' }]);
  expect(fromFloor.state.items.find(i => i.id === '9:prato')).toMatchObject({ holder: 'bia', spot: 'floor' });
  expect(bia(fromFloor.state).fed).toBe(false);
  const inHand = { ...empty, items: [...empty.items, dish('torrada', 'bia')] };
  const fed = transition(inHand, { type: 'feed', actor: 'bia' });
  expect(fed.state.items).toEqual(inHand.items);
  expect(fed.events).toEqual([{ type: 'missing', actor: 'bia', need: 'table' }]);
});
it('a cama não serve para comer: deitada num quarto sem cadeira, falta mesa', () => {
  const bedroom = transition(standing(initialWorld()), { type: 'room', room: 'quarto' }).state;
  const lying = transition(transition(bedroom, { type: 'summon' }).state, { type: 'sit', actor: 'bia', seat: '8.0' }).state;
  const result = transition({ ...lying, items: [...lying.items, { ...dish('sanduiche', 'bia'), room: 'quarto' }] }, { type: 'feed', actor: 'bia' });
  expect(result.events).toEqual([{ type: 'missing', actor: 'bia', need: 'table' }]);
});
it('o gato come no chão, como antes, sem procurar assento', () => {
  const empty = standing(editWorld(initialWorld(), { type: 'clear' }));
  const result = transition({ ...empty, items: [...empty.items, dish('petisco-de-gato')] }, { type: 'give', actor: 'mimi', item: '9:prato' });
  expect(result.state.actors.find(a => a.id === 'mimi')).toMatchObject({ seat: null, fed: true });
  expect(result.events[0]).toMatchObject({ type: 'ate', actor: 'mimi' });
});
it('na rua come em pé, como antes', () => {
  const street = { ...standing(editWorld(initialWorld(), { type: 'clear' })), streetWidth: 2000 };
  const result = transition({ ...street, items: [...street.items, dish('sanduiche', 'bia')] }, { type: 'feed', actor: 'bia' });
  expect(bia(result.state)).toMatchObject({ seat: null, fed: true });
});
