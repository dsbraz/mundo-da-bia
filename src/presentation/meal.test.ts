import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { seatPoint } from '../domain/seats';
import type { ActorId, Item, Piece, World } from '../domain/types';
import { plateAt, plateSpot } from './meal';
import { visualPiecePoint } from './furniture-scale';
import { mealApproach } from './meal-walk';

const dish = (holder: ActorId | null = null): Item =>
  ({ id: '9:prato', kind: 'prato', recipe: 'panqueca', room: 'sala', x: 400, y: 500, holder, spot: 'floor' }) as Item;
const standing = (world: World): World => ({ ...world, actors: world.actors.map(a => ({ ...a, seat: null, x: 300 + a.id.length * 40, y: 530 })) });
const piece = (id: number, kind: Piece['kind'], x: number, y: number): Piece => ({ id, kind, room: 'sala', x, y, color: 'original', flipped: false });
const withPieces = (world: World, ...pieces: Piece[]): World => ({ ...world, layout: { ...world.layout, nextId: 60, pieces: [...world.layout.pieces, ...pieces] } });
const who = (world: World, id: ActorId) => world.actors.find(a => a.id === id)!;

it('três mordidas em 2,4 s: cheio, metade, vazio; com movimento reduzido só cheio e vazio', () => {
  expect([0, 799, 800, 1599, 1600, 2400].map(t => plateAt(t, false))).toEqual(['full', 'full', 'half', 'half', 'empty', 'empty']);
  expect([0, 1199, 1200, 2400].map(t => plateAt(t, true))).toEqual(['full', 'full', 'empty', 'empty']);
});

it('o prato vai para a mesa ao lado da cadeira, para o tampo do piquenique, ou para o colo no sofá', () => {
  const kitchen = withPieces(standing(initialWorld()), piece(40, 'chair', 60, 320));
  const table = kitchen.layout.pieces.find(p => p.kind === 'table')!;
  const atTable = transition(kitchen, { type: 'sit', actor: 'bia', seat: '40.0' }).state;
  expect(plateSpot(atTable, who(atTable, 'bia'))).toEqual({ ...visualPiecePoint(table, { x: table.x + 50, y: table.y + 56 }), on: 'table' });
  const picnic = withPieces(standing(initialWorld()), piece(41, 'picnic-table', 600, 300));
  const outside = transition(picnic, { type: 'sit', actor: 'bia', seat: '41.1' }).state, bench = outside.layout.pieces.at(-1)!;
  expect(plateSpot(outside, who(outside, 'bia'))).toEqual({ ...visualPiecePoint(bench, { x: 692, y: 362 }), on: 'table' });
  const sofa = transition(standing(initialWorld()), { type: 'sit', actor: 'bia', seat: '2.0' }).state, bia = who(sofa, 'bia');
  expect(plateSpot(sofa, bia)).toMatchObject({ x: bia.x, on: 'lap' });
  expect(plateSpot(sofa, bia).y).toBeLessThan(bia.y);
  const far = withPieces(standing(initialWorld()), piece(42, 'chair', 860, 140));
  const alone = transition(far, { type: 'sit', actor: 'bia', seat: '42.0' }).state;
  expect(plateSpot(alone, who(alone, 'bia')).on).toBe('lap');
});

it('antes de comer, quem recebe o prato anda até o assento da refeição; sentado ali, sem assento ou gato, não anda', () => {
  const world = { ...withPieces(standing(initialWorld()), piece(40, 'chair', 60, 320)), items: [...initialWorld().items, dish()] };
  const walk = mealApproach(world, { type: 'give', actor: 'luna', item: '9:prato' });
  expect(walk?.actor).toBe('luna');
  expect(Math.abs(walk!.point.x - seatPoint(world, '40.0')!.x)).toBeLessThanOrEqual(100);
  const held = { ...world, items: [...initialWorld().items, dish('bia')] };
  expect(mealApproach(held, { type: 'feed', actor: 'bia' })?.actor).toBe('bia');
  const seated = transition(world, { type: 'sit', actor: 'luna', seat: '40.0' }).state;
  expect(mealApproach(seated, { type: 'give', actor: 'luna', item: '9:prato' })).toBeNull();
  expect(mealApproach(world, { type: 'give', actor: 'mimi', item: '9:prato' })).toBeNull();
  expect(mealApproach(world, { type: 'give', actor: 'luna', item: 'ursinho' })).toBeNull();
  expect(mealApproach(world, { type: 'move', actor: 'luna', point: { x: 400, y: 500 } })).toBeNull();
  expect(mealApproach({ ...world, items: initialWorld().items }, { type: 'feed', actor: 'bia' })).toBeNull();
  // On the street she eats standing, as eat() does there: no walk.
  expect(mealApproach({ ...world, streetWidth: 1600 }, { type: 'give', actor: 'luna', item: '9:prato' })).toBeNull();
});
