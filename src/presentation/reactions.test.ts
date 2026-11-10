import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { react } from './reactions';
import { initialWorld } from '../domain/world';
import { bubbleDuration } from './feedback';
import { heartDuration } from './care-heart';
afterEach(() => vi.unstubAllGlobals());
function scene() {
  const tweens: Record<string, unknown>[] = [], said: string[] = [];
  const object = () => { const o: Record<string, unknown> = { width: 80, height: 30, active: true }; for (const m of ['setOrigin', 'setDepth', 'setY', 'setPosition', 'setAlpha', 'setScale', 'fillStyle', 'fillRoundedRect', 'fillTriangle', 'fillCircle', 'lineStyle', 'strokeRoundedRect', 'strokeCircle', 'destroy']) o[m] = () => o; return o; };
  const fake = { game: { canvas: { dataset: {} } }, cameras: { main: { scrollX: 0, scrollY: 0, width: 2000, height: 1200, zoom: 2 } }, add: { text: (_x: number, _y: number, text: string) => { said.push(text); return object(); }, graphics: object, container: object },
    tweens: { add: (config: Record<string, unknown>) => { tweens.push(config); } } };
  return { tweens, said, fake: fake as unknown as Phaser.Scene };
}
it('com movimento reduzido o balão de reação fica parado e some por fade', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const world = initialWorld(), bia = world.actors[0]!, { tweens, said, fake } = scene();
  react(fake, world, [{ type: 'fed', actor: bia.id }]);
  expect(tweens).toHaveLength(2);
  expect(tweens[0]).toMatchObject({ y: bia.y - 196, alpha: 0, duration: 120, delay: bubbleDuration(said[0]!) - 120 });
  // The heart after eating is transient: one tween that ends it, and it marks who ate while it shows.
  expect(tweens[1]).toMatchObject({ t: heartDuration, duration: heartDuration });
  expect((fake.game.canvas.dataset as Record<string, string>).heart).toBe('bia');
});
it('só comer mostra o coração', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const world = initialWorld(), { tweens, fake } = scene();
  react(fake, world, [{ type: 'dressed', actor: 'bia' }]);
  expect(tweens).toHaveLength(2);
  expect((fake.game.canvas.dataset as Record<string, string>).heart).toBeUndefined();
});
it('sem preferência o balão sobe enquanto esmaece e fala o nome de quem reagiu', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const world = initialWorld(), bia = world.actors[0]!, { tweens, said, fake } = scene();
  react(fake, world, [{ type: 'dressed', actor: bia.id }]);
  expect(said[0]).toContain('Bia');
  expect(tweens.at(-1)).toMatchObject({ y: bia.y - 196 - 18, alpha: 0, duration: bubbleDuration(said[0]!) });
});
it('mudar de lugar não gera fala', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const world = initialWorld(), { said, fake } = scene();
  react(fake, world, [{ type: 'moved', actor: 'bia' }]);
  expect(said).toEqual([]);
});
