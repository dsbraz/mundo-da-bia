import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { fromPiece, toPiece, validPlacement, fixture } from './layout';
import { editWorld, history, recordEdit, undo, redo } from './design';
import { pieceKinds } from './types';
import { availableSpot, foodHome } from './furniture';

it('espelha sofá, ocupante e coordenadas sem perder identidade', () => {
  const state = transition(initialWorld(), { type: 'sit', actor: 'bia', seat: 'sofa-left' }).state;
  const sofa = fixture(state, 'sofa')!;
  const flipped = editWorld(state, { type: 'flip', id: sofa.id });
  expect(flipped.actors[0]).toMatchObject({ x: 240, y: 405, seat: 'sofa-left' });
  const piece = fixture(flipped, 'sofa')!;
  expect(fromPiece(piece, { x: 150, y: 405 })).toEqual({ x: 240, y: 405 });
  expect(toPiece(piece, { x: 240, y: 405 })).toEqual({ x: 150, y: 405 });
  expect(editWorld(flipped, { type: 'flip', id: sofa.id })).toEqual(state);
});
it('impede mover peças de outro cômodo e duplicar móveis interativos', () => {
  const state = initialWorld();
  expect(editWorld(state, { type: 'remove', id: 999 })).toBe(state);
  expect(editWorld(state, { type: 'remove', id: fixture(state, 'bed')!.id })).toBe(state);
  expect(editWorld(state, { type: 'add', kind: 'sofa' })).toBe(state);
});
it.each(pieceKinds)('adiciona %s com posição válida numa casa vazia', kind => {
  let state = editWorld(initialWorld(), { type: 'clear' });
  state = editWorld({ ...state, room: 'quarto' }, { type: 'clear' });
  state = editWorld(state, { type: 'add', kind });
  const piece = state.layout.pieces[0]!;
  expect(piece.kind).toBe(kind);
  expect(piece.room).toBe('quarto');
  expect(validPlacement(piece)).toBe(true);
});
it('respeita bordas do cômodo e mantém posições de uso alcançáveis', () => {
  const plant = { id: 50, kind: 'plant' as const, room: 'sala' as const, color: 'mint' as const, flipped: false, x: 0, y: 65 };
  expect(validPlacement(plant)).toBe(true);
  expect(validPlacement({ ...plant, x: 915, y: 495 })).toBe(true);
  for (const patch of [{ x: -1 }, { y: 64 }, { x: 916 }, { y: 496 }, { x: NaN }, { y: Infinity }]) expect(validPlacement({ ...plant, ...patch })).toBe(false);
  expect(validPlacement({ ...fixture(initialWorld(), 'sofa')!, y: 65 })).toBe(false);
});
it('remove suporte sem perder objetos e bloqueia suas ações', () => {
  const state = editWorld(initialWorld(), { type: 'clear' });
  expect(state.items.slice(0, 2).every(i => i.spot === 'floor')).toBe(true);
  expect(availableSpot(state, 'fridge')).toBe(false);
  expect(transition(state, { type: 'interact', target: 'fridge' }).state).toBe(state);
  expect(transition(state, { type: 'sit', actor: 'bia', seat: 'sofa-left' }).state).toBe(state);
  expect(foodHome(state, state.items[0]!, state.actors[0]!, true)).toMatchObject({ spot: 'floor', x: 520, y: 530 });
});
it('desfaz e refaz na ordem e limita histórico às últimas cinquenta edições', () => {
  let h = history(initialWorld());
  for (let i = 0; i < 55; i++) h = recordEdit(h, editWorld(h.present, { type: 'add', kind: 'plant' }));
  expect(h.past).toHaveLength(50);
  const before = h;
  h = undo(undo(h));
  expect(h.future).toHaveLength(2);
  expect(redo(redo(h))).toEqual(before);
});
