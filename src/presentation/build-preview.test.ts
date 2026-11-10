import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { editWorld } from '../domain/design';
import { canPlace } from '../domain/placement';
import { dragPreview, settleMove } from './build-preview';

const sofaOverFridge = () => {
  const world = initialWorld(), sofa = world.layout.pieces.find(p => p.kind === 'sofa')!, fridge = world.layout.pieces.find(p => p.kind === 'fridge')!;
  return { world, sofa, action: { type: 'move' as const, id: sofa.id, point: { x: fridge.x - 60, y: fridge.y + 25 } } };
};
it('an invalid drag keeps the piece under the finger and marks it invalid', () => {
  const { world, sofa, action } = sofaOverFridge();
  expect(editWorld(world, action)).toBe(world);
  const preview = dragPreview(world, action);
  expect(preview.invalid).toBe(true);
  expect(preview.world.layout.pieces.find(p => p.id === sofa.id)).toMatchObject(action.point);
  const valid = { ...action, point: { x: sofa.x, y: sofa.y + 10 } };
  expect(dragPreview(world, valid)).toEqual({ world: editWorld(world, valid), invalid: false });
});
it('dropping on an invalid spot slides to the nearest valid fit beside it', () => {
  const { world, sofa, action } = sofaOverFridge();
  const settled = settleMove(world, action)!;
  expect(settled.type).toBe('move');
  const next = editWorld(world, settled), placed = next.layout.pieces.find(p => p.id === sofa.id)!;
  expect(next).not.toBe(world); expect(canPlace(next, placed)).toBe(true);
  expect(Math.hypot(placed.x - action.point.x, placed.y - action.point.y)).toBeLessThan(260);
  expect(settleMove(world, { ...action, point: { x: sofa.x, y: sofa.y + 10 } })).toEqual({ ...action, point: { x: sofa.x, y: sofa.y + 10 } });
});
