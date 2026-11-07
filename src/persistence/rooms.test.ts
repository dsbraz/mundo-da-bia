import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { addRoom } from '../domain/rooms';
import { decode, encode } from './save';
import { decodeAlbum } from './album';
import { validLayout } from './layout-validation';
function oldWorld() {
  const state = initialWorld();
  return { ...state, layout: { pieces: state.layout.pieces, nextId: state.layout.nextId,
    rooms: { sala: { wall: 'rose', floor: 'mint' }, quarto: { wall: 'sky', floor: 'original' } } } };
}
it('migra casas v3 e coleção v1 mantendo decoração, roupas e luz', () => {
  const old = oldWorld(); old.home.lamp = false; old.actors[0]!.look = 'neon';
  const next = decode(JSON.stringify({ version: 3, state: old }));
  expect(next.layout.rooms.sala).toMatchObject({ name: 'Sala & palco', wall: 'rose', floor: 'mint', size: 'small' });
  expect(next.home.lamp).toBe(false); expect(next.actors[0]!.look).toBe('neon');
  const album = decodeAlbum(JSON.stringify({ version: 1, album: { active: 2, houses: [{ id: 1, name: 'Primeira', state: old }, { id: 2, name: 'Banda', state: old }] } }));
  expect(album?.active).toBe(2); expect(album?.houses[1]?.state).toEqual(next);
  const away = transition(next, { type: 'room', room: 'quarto' }).state;
  expect(transition(away, { type: 'room', room: 'sala' }).state.home.lamp).toBe(false);
});
it.each([
  { name: '' }, { name: 'x'.repeat(33) }, { template: 'castle' }, { size: 'huge' }, { cell: -1 }, { cell: 12 }, { cell: 1.5 },
  { home: null }, { home: { lamp: 1, fridge: true, drawer: false } }, { wall: 'bad' }, { floor: 'bad' },
])('rejeita metadados inválidos de cômodo %j', patch => {
  const state = initialWorld(); Object.assign(state.layout.rooms.sala, patch);
  expect(validLayout(state.layout)).toBe(false);
});
it('rejeita referências órfãs e IDs de cômodos que seriam reutilizados', () => {
  const state = addRoom(initialWorld(), { name: 'Estúdio', template: 'studio', size: 'large', cell: 3 });
  const corrupt = (patch: object) => decode(JSON.stringify({ version: 4, state: { ...state, ...patch } }));
  expect(corrupt({ room: 'room-99' })).toEqual(initialWorld());
  expect(corrupt({ actors: state.actors.map(a => a.id === 'bia' ? { ...a, room: 'room-99' } : a) })).toEqual(initialWorld());
  expect(corrupt({ items: state.items.map(i => i.id === 'ursinho' ? { ...i, room: 'room-99' } : i) })).toEqual(initialWorld());
  expect(validLayout({ ...state.layout, nextRoomId: 3 })).toBe(false);
  expect(validLayout({ ...state.layout, nextRoomId: 0 })).toBe(false);
  expect(validLayout({ ...state.layout, rooms: { ...state.layout.rooms, 'room-99': state.layout.rooms.sala } })).toBe(false);
  expect(validLayout({ ...state.layout, rooms: { ...state.layout.rooms, sala: { ...state.layout.rooms.sala, cell: 3 } } })).toBe(false);
  const piece = state.layout.pieces.at(-1)!;
  piece.room = 'room-99'; expect(validLayout(state.layout)).toBe(false);
});
it('aceita posição ampliada somente num cômodo amplo', () => {
  let state = addRoom(initialWorld(), { name: 'Amplo', template: 'empty', size: 'large', cell: 2 });
  state = transition(state, { type: 'travel', actor: 'bia', room: state.room }).state;
  state = transition(state, { type: 'move', actor: 'bia', point: { x: 1300, y: 500 } }).state;
  expect(decode(encode(state))).toEqual(state);
  state.actors[0]!.room = 'sala';
  expect(decode(encode(state))).toEqual(initialWorld());
});
it.each([null, {}, { layout: {} }, { layout: { rooms: {} } }])('não inventa uma casa para um save v3 incompleto', state => {
  expect(decode(JSON.stringify({ version: 3, state }))).toEqual(initialWorld());
});

it('rejeita versão textual da coleção', () => {
  const album = { active: 1, houses: [{ id: 1, name: 'Casa', state: initialWorld() }] };
  expect(decodeAlbum(JSON.stringify({ version: '2', album }))).toBeNull();
});
