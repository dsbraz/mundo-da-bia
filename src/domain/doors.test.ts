import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { crossDoor, neighbor, roomLinks } from './doors';
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
it('liga cada cômodo aos vizinhos do andar e, no primeiro cômodo de cada andar, às escadas dos andares ocupados', () => {
  let state = initialWorld();
  expect(roomLinks(state.layout, 'sala')).toEqual({ right: 'quarto' });
  expect(roomLinks(state.layout, 'quarto')).toEqual({ left: 'sala' });
  state = addRoom(state, { name: 'Sótão', template: 'empty', size: 'small', cell: 9 });
  state = addRoom(state, { name: 'Varanda', template: 'empty', size: 'small', cell: 10 });
  // Floor 1 is empty: the stairs skip it, from the ground floor's first room to floor 2's first room and back.
  expect(roomLinks(state.layout, 'sala')).toEqual({ right: 'quarto', up: 'room-3' });
  expect(roomLinks(state.layout, 'quarto')).toEqual({ left: 'sala' });
  expect(roomLinks(state.layout, 'room-3')).toEqual({ right: 'room-4', down: 'sala' });
  expect(roomLinks(state.layout, 'room-4')).toEqual({ left: 'room-3' });
  state = addRoom(state, { name: 'Meio', template: 'empty', size: 'small', cell: 5 });
  expect(roomLinks(state.layout, 'room-5')).toEqual({ up: 'room-3', down: 'sala' });
  expect(roomLinks(state.layout, 'room-3')).toEqual({ right: 'room-4', down: 'room-5' });
  expect(roomLinks(state.layout, 'room-99')).toEqual({});
});
