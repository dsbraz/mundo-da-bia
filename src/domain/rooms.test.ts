import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { addRoom, renameRoom, moveRoom } from './rooms';
import { editWorld, history, recordEdit, undo } from './design';
import { decode, encode } from '../persistence/save';
import { pieceBounds } from './layout';
import { institutionWorld } from './institution-plans';
import { passages } from './passages';
it('cria um estúdio amplo, nomeia, posiciona e recupera após salvar', () => {
  const original = initialWorld();
  const state = addRoom(original, { name: '  Estúdio Aurora  ', template: 'studio', size: 'large', cell: 4 });
  expect(state.room).toBe('room-3');
  expect(state.layout.rooms[state.room]).toMatchObject({ name: 'Estúdio Aurora', size: 'large', cell: 4 });
  expect(state.layout.pieces.some(p => p.room === state.room && p.kind === 'speaker')).toBe(true);
  expect(decode(encode(state))).toEqual(state);
  expect(original).toEqual(initialWorld());
  expect(undo(recordEdit(history(original), state)).present).toEqual(original);
});
it('permite camas em quartos distintos sem mover ou ocupar a cama errada', () => {
  let state = transition(initialWorld(), { type: 'room', room: 'quarto' }).state;
  state = transition(state, { type: 'summon' }).state;
  state = transition(state, { type: 'sit', actor: 'bia', seat: '8.0' }).state;
  state = addRoom(state, { name: 'Outro quarto', template: 'bedroom', size: 'medium', cell: 2 });
  expect(state.layout.pieces.filter(p => p.kind === 'bed')).toHaveLength(2);
  const bed = state.layout.pieces.find(p => p.kind === 'bed' && p.room === state.room)!;
  const before = state.actors[0];
  state = editWorld(state, { type: 'move', id: bed.id, point: { x: bed.x + 30, y: bed.y } });
  expect(state.actors[0]).toEqual(before);
  expect(decode(encode(state))).toEqual(state);
});
it('rejeita nomes vazios, posições ocupadas e quartos inexistentes', () => {
  const state = initialWorld();
  expect(addRoom(state, { name: ' ', template: 'empty', size: 'small', cell: 2 })).toBe(state);
  expect(addRoom(state, { name: 'X', template: 'empty', size: 'small', cell: 0 })).toBe(state);
  expect(transition(state, { type: 'room', room: 'room-99' as typeof state.room }).state).toBe(state);
  expect(renameRoom(state, '')).toBe(state);
  expect(renameRoom(state, 'Sala de ensaio').layout.rooms.sala).toMatchObject({ name: 'Sala de ensaio' });
  expect(moveRoom(state, 1)).toBe(state);
  expect(moveRoom(state, 5).layout.rooms.sala).toMatchObject({ cell: 5 });
});
it('viaja com um personagem e o objeto na mão, respeitando o tamanho do destino', () => {
  let state = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'microfone' }).state;
  state = addRoom(state, { name: 'Amplo', template: 'empty', size: 'large', cell: 2 });
  state = transition(state, { type: 'travel', actor: 'bia', room: state.room }).state;
  state = transition(state, { type: 'move', actor: 'bia', point: { x: 1300, y: 500 } }).state;
  expect(state.actors[0]!.x).toBe(1300);
  const home = transition(state, { type: 'travel', actor: 'bia', room: 'sala' }).state;
  expect(home.actors[0]).toMatchObject({ x: 1140, room: 'sala', seat: null });
  expect(home.items[2]?.holder).toBe('bia');
  expect(transition(state, { type: 'travel', actor: 'bia', room: 'room-99' }).state).toBe(state);
});
it('cria todos os modelos e respeita as doze posições sem reusar IDs', () => {
  let state = initialWorld();
  for (const [index, template] of (['empty', 'bedroom', 'kitchen', 'bathroom', 'studio', 'garden'] as const).entries()) {
    state = addRoom(state, { name: template, template, size: 'medium', cell: index + 2 });
    expect(decode(encode(state))).toEqual(state);
  }
  for (let cell = 8; cell < 12; cell++) state = addRoom(state, { name: 'Novo', template: 'empty', size: 'small', cell });
  expect(Object.keys(state.layout.rooms)).toHaveLength(12);
  for (const cell of [-1, 12, 1.5, NaN]) expect(addRoom(state, { name: 'Não', template: 'empty', size: 'small', cell })).toBe(state);
  expect(renameRoom(state, 'a'.repeat(40)).layout.rooms[state.room]!.name).toHaveLength(32);
});
it('mantém assentos exclusivos por cômodo e interage com as peças novas', () => {
  let state = addRoom(initialWorld(), { name: 'Cozinha', template: 'kitchen', size: 'medium', cell: 2 });
  const stove = state.layout.pieces.find(p => p.kind === 'stove')!;
  // The kitchen's stove opens the bench (W3-16) instead of switching on.
  expect(transition(state, { type: 'use', id: stove.id }).state).toBe(state);
  expect(transition(state, { type: 'use', id: 999 }).state).toBe(state);
  expect(transition(state, { type: 'use', id: 2 }).state).toBe(state);
  state = transition(state, { type: 'interact', target: 'fridge' }).state;
  const other = transition(state, { type: 'room', room: 'sala' }).state;
  expect(other.home.fridge).toBe(true);
  expect(transition(other, { type: 'room', room: state.room }).state.home.fridge).toBe(false);
});
it('selecionar o cômodo atual não reinicia a luz ou a geladeira', () => {
  const state = transition(initialWorld(), { type: 'interact', target: 'lamp' }).state;
  expect(transition(state, { type: 'room', room: 'sala' }).state).toBe(state);
});

it('modelos novos deixam a faixa frontal livre sem alterar cômodos anteriores', async () => {
  const { roomTemplates } = await import('./types');
  const { footprint } = await import('./placement');
  const original = initialWorld();
  for (const template of roomTemplates) {
    const state = addRoom(original, { name: template, template, size: 'medium', cell: 2 });
    const pieces = state.layout.pieces.filter(p => p.room === state.room);
    for (const piece of pieces) expect(footprint(piece)?.bottom ?? 0).toBeLessThanOrEqual(500);
    // Only the bedroom's bed moves: out of the doorway the new room opens at the end of its wall.
    expect(state.layout.pieces.filter(p => p.room !== state.room && p.kind !== 'bed')).toEqual(original.layout.pieces.filter(p => p.kind !== 'bed'));
  }
});
it('o jardim e o pátio espalham as peças em colunas fixas, a terceira mais ao fundo; os outros modelos se distribuem pela parede', () => {
  for (const template of ['garden', 'playground'] as const) {
    const state = addRoom(initialWorld(), { name: template, template, size: 'medium', cell: 2 });
    const pieces = state.layout.pieces.filter(p => p.room === state.room);
    // Cell 2 opens onto the bedroom through a doorway at the left end (frame up to x 129): the columns start past it.
    expect(pieces.map(p => p.x)).toEqual([140, 320, 140]);
    const [bottom, , third] = pieces.map(p => p.y + pieceBounds[p.kind].height);
    expect(third!).toBeLessThan(bottom! - 30);
  }
  const studio = addRoom(initialWorld(), { name: 'Estúdio', template: 'studio', size: 'medium', cell: 2 });
  const pieces = studio.layout.pieces.filter(p => p.room === studio.room);
  expect(pieces.map(p => p.x)).toEqual([140, 460, 680, 1000]);
  expect(pieces.every(p => p.y + pieceBounds[p.kind].height >= 440)).toBe(true);
});
it('a sala de aula da escola tem as três carteiras numa fileira sob a lousa, entre as portas dos dois lados', () => {
  const school = institutionWorld('school')!;
  const pieces = school.layout.pieces.filter(p => p.room === 'quarto'), desks = pieces.filter(p => p.kind === 'school-desk');
  expect(new Set(desks.map(p => p.y)).size).toBe(1);
  const zones = passages(school.layout, 'quarto').map(p => p.zone);
  expect(zones).toHaveLength(2);
  for (const p of pieces) expect(zones.every(z => p.x + pieceBounds[p.kind].width <= z.x || p.x >= z.x + z.width), p.kind).toBe(true);
});
