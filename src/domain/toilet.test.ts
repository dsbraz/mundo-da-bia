import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { addRoom } from './rooms';
import { pieceBounds } from './layout';
import { passages } from './passages';
import { unspoken } from './toilet';
import { freeFor, mealSeat, seatPoint } from './seats';
import { roomSizes, type Piece, type RoomSize, type World } from './types';

/** A new bathroom with everyone in it, standing. */
function bathroom(size: RoomSize = 'medium', cell = 2): World {
  const state = addRoom(initialWorld(), { name: 'Banheiro', template: 'bathroom', size, cell });
  return { ...state, actors: state.actors.map((a, i) => ({ ...a, room: state.room, seat: null, x: 300 + i * 40, y: 530, resting: false })) };
}
const toiletOf = (state: World) => state.layout.pieces.find(p => p.room === state.room && p.kind === 'toilet')!;
const seat = (piece: Piece) => `${piece.id}.0` as const;
const who = (state: World, id: string) => state.actors.find(a => a.id === id)!;

it.each(roomSizes.flatMap(size => [2, 3, 5].map(cell => [size, cell] as const)))('um banheiro novo (%s, célula %i) já vem com o vaso, fora de portas e escadas, e dá para sentar nele', (size, cell) => {
  const state = bathroom(size, cell), toilet = toiletOf(state), box = pieceBounds.toilet;
  expect(state.layout.pieces.filter(p => p.room === state.room && p.kind === 'toilet')).toHaveLength(1);
  for (const { zone } of passages(state.layout, state.room)) {
    const apart = toilet.x + box.width <= zone.x || zone.x + zone.width <= toilet.x || toilet.y + box.height <= zone.y || zone.y + zone.height <= toilet.y;
    expect(apart).toBe(true);
  }
  expect(freeFor(state, who(state, 'bia'), seat(toilet))).toBe(true);
});
it('sentar no vaso senta de frente, como numa cadeira; gato não senta no vaso', () => {
  const state = bathroom(), toilet = toiletOf(state);
  const sat = transition(state, { type: 'sit', actor: 'bia', seat: seat(toilet) });
  expect(who(sat.state, 'bia')).toMatchObject({ seat: seat(toilet), ...seatPoint(state, seat(toilet)), resting: false });
  expect(sat.events).toEqual([{ type: 'rested', actor: 'bia' }]);
  const cat = transition(state, { type: 'sit', actor: 'mimi', seat: seat(toilet) });
  expect(cat.state).toBe(state);
  expect(cat.events).toEqual([{ type: 'missing', actor: 'mimi', need: 'seat' }]);
});
it('dar descarga com alguém sentado: a descarga toca e ela se levanta ao lado do vaso, deixando a água à vista; o vaso não fica "ligado"', () => {
  const toilet = toiletOf(bathroom());
  const sat = transition(bathroom(), { type: 'sit', actor: 'bia', seat: seat(toilet) }).state;
  const flushed = transition(sat, { type: 'use', id: toilet.id });
  const bia = who(flushed.state, 'bia'), box = pieceBounds.toilet;
  expect(bia.seat).toBeNull();
  expect(bia.x).toBe(toilet.x + box.width + 40);
  expect(bia.y).toBeGreaterThan(toilet.y + box.height);
  expect(bia.y).toBeLessThanOrEqual(540);
  expect(flushed.events).toEqual([{ type: 'furniture', piece: toilet.id, actor: 'bia' }]);
  expect(flushed.state.layout).toBe(sat.layout);
  expect(flushed.state.actors.filter(a => a.id !== 'bia')).toEqual(sat.actors.filter(a => a.id !== 'bia'));
});
it('encostado na parede direita, ela se levanta do lado esquerdo do vaso', () => {
  const state = bathroom('small'), toilet = toiletOf(state), x = 1000 - pieceBounds.toilet.width - 10;
  const moved = { ...state, layout: { ...state.layout, pieces: state.layout.pieces.map(p => p.id === toilet.id ? { ...p, x } : p) } };
  const sat = transition(moved, { type: 'sit', actor: 'bia', seat: seat(toilet) }).state;
  expect(who(transition(sat, { type: 'use', id: toilet.id }).state, 'bia').x).toBe(x - 40);
});
it('dar descarga sem ninguém sentado não muda nada', () => {
  const state = bathroom();
  expect(transition(state, { type: 'use', id: toiletOf(state).id })).toEqual({ state, events: [] });
});
it('o vaso nunca é lugar de comer: sentada nele, ou com ele como único assento livre, não há assento para a refeição', () => {
  const state = bathroom(), toilet = toiletOf(state);
  expect(mealSeat(state, who(state, 'bia'))).toBeUndefined();
  const sat = transition(state, { type: 'sit', actor: 'bia', seat: seat(toilet) }).state;
  expect(mealSeat(sat, who(sat, 'bia'))).toBeUndefined();
});
it('sentar no vaso não tem fala: o evento de sentar ali é silencioso; sentar noutro lugar segue com fala', () => {
  const state = bathroom(), toilet = toiletOf(state);
  const sat = transition(state, { type: 'sit', actor: 'bia', seat: seat(toilet) });
  expect(sat.events.map(event => unspoken(sat.state, event))).toEqual([true]);
  const sofa = transition(initialWorld(), { type: 'sit', actor: 'luna', seat: '2.0' });
  expect(sofa.events.map(event => unspoken(sofa.state, event))).toEqual([false]);
});
