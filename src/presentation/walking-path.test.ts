import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { walkingPath } from './walking-path';
const empty = (): import('../domain/types').World => { const w = initialWorld(); return { ...w, layout: { ...w.layout, pieces: [] } }; };
it('reaches the exact destination within the walkable floor', () => {
  expect(walkingPath(empty(), { x: 100, y: 500 }, { x: 333, y: 510 })?.at(-1)).toEqual({ x: 333, y: 510 });
  expect(walkingPath(empty(), { x: 100, y: 500 }, { x: 300, y: 200 })).toBeNull();
});
it('routes around the physical footprint of furniture', () => {
  const w = empty(); w.layout.pieces = [{ id: 1, kind: 'table', room: 'sala', x: 250, y: 350, flipped: false, color: 'original' }];
  const path = walkingPath(w, { x: 100, y: 450 }, { x: 650, y: 450 });
  expect(path).not.toBeNull(); expect(path!.some(p => p.y < 400 || p.y > 485)).toBe(true);
  expect(walkingPath(w, { x: 100, y: 450 }, { x: 350, y: 450 })).toBeNull();
});
it('rejects unreachable destinations and ignores decoration and other rooms', () => {
  const w = empty();
  w.layout.pieces = [0, 1, 2, 3].map(i => ({ id: i, kind: 'table', room: 'sala', x: 300, y: 200 + i * 80, flipped: false, color: 'original' }));
  expect(walkingPath(w, { x: 100, y: 450 }, { x: 800, y: 450 })).toBeNull();
  w.layout.pieces = w.layout.pieces.map(p => ({ ...p, room: 'quarto' }));
  expect(walkingPath(w, { x: 100, y: 450 }, { x: 800, y: 450 })).not.toBeNull();
});
it('lets a seated actor leave its own furniture footprint', () => {
  const w = empty(); w.layout.pieces = [{ id: 1, kind: 'sofa', room: 'sala', x: 60, y: 270, flipped: false, color: 'original' }];
  expect(walkingPath(w, { x: 150, y: 405 }, { x: 500, y: 510 })).not.toBeNull();
});
it('exits the nearest edge of a seat before routing, instead of walking through it', () => {
  const w = empty(); w.layout.pieces = [{ id: 1, kind: 'table', room: 'sala', x: 250, y: 350, flipped: false, color: 'original' }];
  const path = walkingPath(w, { x: 240, y: 465 }, { x: 700, y: 465 });
  expect(path).not.toBeNull(); expect(path![0]!.x).toBeLessThan(250);
});
