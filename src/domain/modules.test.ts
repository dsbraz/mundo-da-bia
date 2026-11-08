import { expect, it } from 'vitest';
import { initialAlbum } from './houses';
import { migrateNeighborhood, neighborhoodAction } from './neighborhood';
import { neighbor } from './doors';
import { initialWorld } from './world';
const town = () => migrateNeighborhood(initialAlbum(initialWorld()));
it('creates the first room on the next floor and limits buildings to three floors', () => {
  let t = town();
  t = neighborhoodAction(t, { type: 'add-floor', building: 1 });
  expect(Object.values(t.buildings[0]!.layout.rooms).map(r => r.cell)).toContain(4);
  t = neighborhoodAction(t, { type: 'add-floor', building: 1 });
  expect(Object.values(t.buildings[0]!.layout.rooms).map(r => r.cell)).toContain(8);
  expect(neighborhoodAction(t, { type: 'add-floor', building: 1 })).toBe(t);
});
it('adds, names, swaps and replaces modules without moving the entry or losing residents', () => {
  let t = town(); const actors = t.actors, items = t.items;
  t = neighborhoodAction(t, { type: 'add-module', building: 1, cell: 2, template: 'kitchen' });
  const id = Object.keys(t.buildings[0]!.layout.rooms).find(k => k.startsWith('room-')) as `room-${number}`;
  t = neighborhoodAction(t, { type: 'rename-module', building: 1, room: id, name: ' Cozinha da Bia ' });
  expect(t.buildings[0]!.layout.rooms[id]!.name).toBe('Cozinha da Bia');
  t = neighborhoodAction(t, { type: 'move-module', building: 1, room: id, cell: 1 });
  expect(t.buildings[0]!.layout.rooms.quarto.cell).toBe(2);
  expect(t.buildings[0]!.layout.rooms[id]!.cell).toBe(1);
  expect(neighborhoodAction(t, { type: 'move-module', building: 1, room: 'sala', cell: 8 })).toBe(t);
  expect(neighborhoodAction(t, { type: 'move-module', building: 1, room: id, cell: 0 })).toBe(t);
  t = neighborhoodAction(t, { type: 'replace-module', building: 1, room: id, template: 'studio' });
  expect(t.buildings[0]!.layout.rooms[id]!.template).toBe('studio');
  expect(t.actors).toBe(actors); expect(t.items).toBe(items);
});
it('rejects invalid or occupied cells, absent rooms and empty names', () => {
  const t = town();
  for (const cell of [-1, 12, 1.5, 0, NaN]) expect(neighborhoodAction(t, { type: 'add-module', building: 1, cell, template: 'empty' })).toBe(t);
  expect(neighborhoodAction(t, { type: 'add-floor', building: 999 })).toBe(t);
  expect(neighborhoodAction(t, { type: 'rename-module', building: 1, room: 'quarto', name: '  ' })).toBe(t);
  expect(neighborhoodAction(t, { type: 'replace-module', building: 1, room: 'room-99', template: 'empty' })).toBe(t);
  expect(neighborhoodAction(t, { type: 'move-module', building: 1, room: 'quarto', cell: 12 })).toBe(t);
});
it('horizontal navigation stays on the current floor', () => {
  const w = initialWorld(); w.layout.rooms.quarto.cell = 4;
  expect(neighbor(w, 'right')).toBeUndefined();
});
