import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { react } from './reactions';
import { initialWorld } from '../domain/world';
afterEach(() => vi.unstubAllGlobals());
function scene() {
  const tweens: Record<string, unknown>[] = [];
  const text = { y: 0, setOrigin() { return this; }, destroy() {} };
  const fake = { add: { text: (_x: number, y: number) => { text.y = y; return text; } }, tweens: { add: (config: Record<string, unknown>) => { tweens.push(config); } } };
  return { tweens, fake: fake as unknown as Phaser.Scene };
}
it('com movimento reduzido o balão de reação fica parado e some por fade', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const world = initialWorld(), bia = world.actors[0]!, { tweens, fake } = scene();
  react(fake, world, [{ type: 'fed', actor: bia.id }]);
  expect(tweens).toHaveLength(1);
  expect(tweens[0]).toMatchObject({ y: bia.y - 150, alpha: 0, duration: 120 });
});
it('sem preferência o balão sobe enquanto esmaece', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const world = initialWorld(), bia = world.actors[0]!, { tweens, fake } = scene();
  react(fake, world, [{ type: 'dressed', actor: bia.id }]);
  expect(tweens[0]).toMatchObject({ y: bia.y - 174, alpha: 0, duration: 1300 });
});
