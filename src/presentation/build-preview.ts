import { editWorld } from '../domain/design';
import { freePlacement } from '../domain/placement';
import type { EditAction, World } from '../domain/types';

/** While dragging, the piece always follows the finger; an invalid spot is only marked, never snapped back mid-gesture. */
export function dragPreview(state: World, action: EditAction): { world: World; invalid: boolean } {
  const next = editWorld(state, action);
  if (next !== state || action.type !== 'move') return { world: next, invalid: false };
  const pieces = state.layout.pieces.map(p => p.id === action.id ? { ...p, ...action.point } : p);
  return { world: { ...state, layout: { ...state.layout, pieces } }, invalid: true };
}
/** On drop: keep a valid spot, otherwise slide to the nearest valid fit; null means the piece flies back home. */
export function settleMove(state: World, action: Extract<EditAction, { type: 'move' }>): Extract<EditAction, { type: 'move' }> | null {
  if (editWorld(state, action) !== state) return action;
  const piece = state.layout.pieces.find(p => p.id === action.id);
  const fit = piece && freePlacement(state, { ...piece, ...action.point });
  if (!fit) return null;
  const moved = { ...action, point: { x: fit.x, y: fit.y } };
  return editWorld(state, moved) !== state ? moved : null;
}
