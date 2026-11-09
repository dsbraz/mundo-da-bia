import { expect, it } from 'vitest';
import { wardrobeSlots } from './targets';
import { pieceBounds } from '../domain/layout';
it('cabides visíveis permanecem dentro do armário quando o catálogo cresce', () => {
  const box = pieceBounds.wardrobe;
  for (const slot of wardrobeSlots) {
    expect(slot.x - 21).toBeGreaterThanOrEqual(box.x);
    expect(slot.x + 21).toBeLessThanOrEqual(box.x + box.width);
    expect(slot.y - 22).toBeGreaterThanOrEqual(box.y);
    expect(slot.y + 22).toBeLessThanOrEqual(box.y + box.height);
  }
  expect(wardrobeSlots.length).toBeGreaterThan(0);
});
it('a seleção dos cabides não invade a gaveta', async () => {
  const { sourceAt } = await import('./targets');
  const { initialWorld } = await import('../domain/world');
  const { visualPiecePoint } = await import('./furniture-scale');
  const world = initialWorld(); world.actors = []; world.items = [];
  const wardrobe = world.layout.pieces.find(p => p.kind === 'wardrobe')!;
  expect(sourceAt(world, visualPiecePoint(wardrobe, { x: 320, y: 390 }), true)).toBeUndefined();
});
