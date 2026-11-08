import { expect, it } from 'vitest';
import { lookIds, pieceKinds, roomTemplates } from '../domain/types';
import { initialWorld, transition } from '../domain/world';
import { editWorld } from '../domain/design';
import { addRoom } from '../domain/rooms';
import { decode, encode } from '../persistence/save';

it('inclui móveis cotidianos e uniformes que sobrevivem ao recarregamento', () => {
  expect(pieceKinds).toEqual(expect.arrayContaining(['sink', 'washer', 'planter', 'picnic-table', 'bookcase', 'kitchen-cart']));
  expect(lookIds).toEqual(expect.arrayContaining(['chef', 'doctor', 'gardener', 'builder']));
  for (const kind of ['sink', 'washer', 'planter', 'picnic-table', 'bookcase', 'kitchen-cart'] as const) {
    const state = editWorld(editWorld(initialWorld(), { type: 'clear' }), { type: 'add', kind });
    expect(state.layout.pieces.some(p => p.kind === kind)).toBe(true);
    expect(decode(encode(state))).toEqual(state);
  }
  for (const look of ['chef', 'doctor', 'gardener', 'builder'] as const) for (const actor of ['bia', 'leo', 'rui', 'luna'] as const) {
    const state = transition(initialWorld(), { type: 'dress', actor, look }).state;
    expect(state.actors.find(a => a.id === actor)!.look).toBe(look);
    expect(decode(encode(state))).toEqual(state);
  }
});

it('cria lavanderia, biblioteca e sala de jantar mobiliadas e persistentes', () => {
  expect(roomTemplates).toEqual(expect.arrayContaining(['laundry', 'library', 'dining']));
  for (const template of ['laundry', 'library', 'dining'] as const) {
    const state = addRoom(initialWorld(), { name: template, template, cell: 2, size: 'medium' });
    expect(state.layout.pieces.filter(p => p.room === state.room).length).toBeGreaterThanOrEqual(3);
    expect(decode(encode(state))).toEqual(state);
  }
});
