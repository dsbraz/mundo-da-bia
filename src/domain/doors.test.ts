import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { crossDoor, neighbor } from './doors';
import { addRoom, moveRoom } from './rooms';
import { encode, decode } from '../persistence/save';
it('atravessa, volta e preserva identidade, roupa e objeto carregado', () => {
  const state = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'ursinho' }).state;
  const next = transition(state, { type: 'cross', actor: 'bia', direction: 'right' }).state;
  expect(next.room).toBe('quarto'); expect(next.actors[0]).toMatchObject({ id: 'bia', room: 'quarto', x: 110, y: 510, seat: null });
  expect(next.items.find(i => i.id === 'ursinho')?.holder).toBe('bia');
  expect(next.actors).toHaveLength(7); expect(decode(encode(next))).toEqual(next);
  const back = crossDoor(next, 'bia', 'left');
  expect(back.actors[0]).toMatchObject({ room: 'sala', x: 890 });
  expect(back.actors.slice(1)).toEqual(state.actors.slice(1));
});
it('segue a ordem da planta sem dar a volta nas extremidades', () => {
  const state = initialWorld(); expect(neighbor(state, 'left')).toBeUndefined(); expect(crossDoor(state, 'bia', 'left')).toBe(state);
  let next = addRoom(state, { name: 'Estúdio', template: 'empty', size: 'large', cell: 2 });
  expect(neighbor(next, 'right')).toBeUndefined(); expect(crossDoor(next, 'bia', 'left')).toBe(next);
  next = transition(next, { type: 'travel', actor: 'bia', room: next.room }).state;
  expect(crossDoor(next, 'bia', 'left').room).toBe('quarto');
  next = moveRoom(next, 0); expect(neighbor(next, 'left')).toBe('quarto');
  next = moveRoom(next, 3); expect(neighbor(next, 'left')).toBe('quarto');
});
it('entra pela extremidade correta de um cômodo amplo e acorda o personagem', () => {
  let state = addRoom(initialWorld(), { name: 'Amplo', template: 'empty', size: 'large', cell: 2 });
  state = transition(state, { type: 'room', room: 'sala' }).state;
  state = moveRoom(state, 3);
  state = transition(state, { type: 'rest', actor: 'bia' }).state;
  const next = transition(state, { type: 'cross', actor: 'bia', direction: 'left' }).state;
  expect(next.actors[0]).toMatchObject({ room: 'room-3', x: 1290, y: 510, resting: false, seat: null });
  expect(decode(encode(next))).toEqual(next);
  expect(transition(next, { type: 'cross', actor: 'luna', direction: 'left' }).state).toBe(next);
});
