import { expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { initialWorld } from '../domain/world';
import { drawLighting } from './furniture-art';
it('apaga também a continuação do ambiente exposta pelo enquadramento', () => {
  const rectangle = vi.fn(() => ({ setDepth: vi.fn() }));
  const scene = { add: { rectangle } } as unknown as Phaser.Scene;
  const world = initialWorld();
  drawLighting(scene, world); expect(rectangle).not.toHaveBeenCalled();
  world.home.lamp = false; drawLighting(scene, world);
  const [x, y, width, height] = rectangle.mock.calls[0] as unknown as number[];
  for (const point of [{ x: -100, y: -300 }, { x: 1100, y: 900 }]) {
    expect(point.x).toBeGreaterThanOrEqual(x! - width! / 2);
    expect(point.x).toBeLessThanOrEqual(x! + width! / 2);
    expect(point.y).toBeGreaterThanOrEqual(y! - height! / 2);
    expect(point.y).toBeLessThanOrEqual(y! + height! / 2);
  }
});
