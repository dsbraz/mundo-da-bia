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
