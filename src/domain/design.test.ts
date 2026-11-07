import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { editWorld, history, undo, redo, recordEdit } from './design';
import { initialAlbum, duplicateHouse, selectHouse, updateHouse, renameHouse } from './houses';

it('monta um cômodo vazio, colore e move peças sem modificar a casa original', () => {
  const original = initialWorld();
  const empty = editWorld(original, { type: 'clear' });
  expect(empty.layout.pieces.some(p => p.room === 'sala')).toBe(false);
  expect(empty.layout.pieces.some(p => p.room === 'quarto')).toBe(true);
  const added = editWorld(empty, { type: 'add', kind: 'plant' });
  const piece = added.layout.pieces.at(-1)!;
  expect(piece).toMatchObject({ kind: 'plant', room: 'sala', color: 'original', flipped: false });
  const moved = editWorld(added, { type: 'move', id: piece.id, point: { x: 520, y: 380 } });
  const colored = editWorld(moved, { type: 'color', id: piece.id, color: 'mint' });
  const flipped = editWorld(colored, { type: 'flip', id: piece.id });
  expect(flipped.layout.pieces.at(-1)).toMatchObject({ x: 520, y: 380, color: 'mint', flipped: true });
  expect(added.layout.pieces.at(-1)).toEqual(piece);
  expect(original).toEqual(initialWorld());
});

it('edita acabamentos, duplica decoração e rejeita gestos fora da casa', () => {
  const initial = initialWorld();
  const wall = editWorld(initial, { type: 'finish', surface: 'wall', value: 'sky' });
  expect(wall.layout.rooms.sala.wall).toBe('sky');
  expect(wall.layout.rooms.quarto).toEqual(initial.layout.rooms.quarto);
  let state = editWorld(wall, { type: 'add', kind: 'plant' });
  state = editWorld(state, { type: 'add', kind: 'plant' });
  expect(new Set(state.layout.pieces.map(p => p.id)).size).toBe(state.layout.pieces.length);
  const id = state.layout.pieces.at(-1)!.id;
  expect(editWorld(state, { type: 'move', id, point: { x: -100, y: 400 } })).toBe(state);
  expect(editWorld(state, { type: 'move', id, point: { x: NaN, y: 400 } })).toBe(state);
  expect(editWorld(state, { type: 'remove', id }).layout.pieces.some(p => p.id === id)).toBe(false);
});

it('mover sofá leva quem está sentado, e remover devolve ao chão', () => {
  const seated = transition(initialWorld(), { type: 'sit', actor: 'bia', seat: 'sofa-left' }).state;
  const sofa = seated.layout.pieces.find(p => p.kind === 'sofa')!;
  const moved = editWorld(seated, { type: 'move', id: sofa.id, point: { x: sofa.x + 100, y: sofa.y } });
  expect(moved.actors[0]).toMatchObject({ x: 250, y: 405, seat: 'sofa-left' });
  expect(editWorld(moved, { type: 'remove', id: sofa.id }).actors[0]?.seat).toBeNull();
});

it('mesa carrega seu conteúdo e desfazer/refazer recuperam toda a edição', () => {
  const state = transition(initialWorld(), { type: 'put', item: 'lanche', spot: 'table' }).state;
  const table = state.layout.pieces.find(p => p.kind === 'table')!;
  const moved = editWorld(state, { type: 'move', id: table.id, point: { x: table.x + 100, y: table.y } });
  expect(moved.items[0]?.x).toBe(360);
  let h = recordEdit(history(state), moved);
  expect(undo(h).present).toEqual(state);
  h = redo(undo(h));
  expect(h.present).toEqual(moved);
  expect(redo(h)).toBe(h);
  expect(undo(history(state)).present).toEqual(state);
  expect(recordEdit(h, h.present)).toBe(h);
  expect(recordEdit(undo(h), editWorld(state, { type: 'clear' })).future).toEqual([]);
});

it('duplica casas independentes, troca, renomeia e preserva a original', () => {
  const album = initialAlbum(initialWorld());
  const copy = duplicateHouse(album, false);
  expect(copy.houses).toHaveLength(2);
  expect(copy.active).not.toBe(album.active);
  const edited = updateHouse(copy, editWorld(copy.houses[1]!.state, { type: 'clear' }));
  expect(edited.houses[0]).toEqual(album.houses[0]);
  expect(edited.houses[1]!.state.layout.pieces.filter(p => p.room === 'sala')).toHaveLength(0);
  expect(selectHouse(edited, album.active).active).toBe(album.active);
  expect(selectHouse(edited, 999)).toBe(edited);
  expect(renameHouse(edited, '  Palco da Bia  ').houses[1]?.name).toBe('Palco da Bia');
  expect(renameHouse(edited, '   ')).toBe(edited);
  expect(duplicateHouse(album, true).houses[1]?.state.layout.pieces).toHaveLength(0);
});
