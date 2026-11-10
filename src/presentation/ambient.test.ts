import { expect, it } from 'vitest';
import type Phaser from 'phaser';
import { initialWorld } from '../domain/world';
import type { World } from '../domain/types';
import { ambientLife } from './ambient';
import { idleMs, wanderStay } from './idle-life';

const canvas = { dataset: {} as DOMStringMap } as HTMLCanvasElement;
function figure() {
  const f = { x: 0, y: 0, data: {} as Record<string, unknown>,
    setPosition(x: number, y: number) { f.x = x; f.y = y; return f; }, setDepth() { return f; }, setData(k: string, v: unknown) { f.data[k] = v; return f; } };
  return f;
}
const cast = (f: ReturnType<typeof figure>) => f as unknown as Phaser.GameObjects.Container;
/** Ticks frame by frame (16 ms) from `from` for `ms`, returning the last time. */
function idle(life: ReturnType<typeof ambientLife>, world: World, from: number, ms: number, selected: 'bia' | 'nino' = 'bia', calm = true) {
  let t = from; for (; t < from + ms; t += 16) life.tick(world, selected, t, calm); return t;
}
const nino = (w: World) => w.actors.find(a => a.id === 'nino')!;

it('depois de 20 s sem toque, Nino vai ao sofá e volta para onde estava desenhado', () => {
  const world = initialWorld(), life = ambientLife(() => canvas), f = figure();
  let t = idle(life, world, 0, idleMs - 100);
  expect(life.step(cast(f), nino(world), world, t)).toBe(false);
  t = idle(life, world, t, 200);
  expect(life.step(cast(f), nino(world), world, t + 1)).toBe(true);
  life.flush(); expect(canvas.dataset.idle).toBe('wander');
  let walking = true; for (let n = 0; walking || n < 2; n++) { t += 500; walking = life.step(cast(f), nino(world), world, t); if (t > 60000) break; }
  t += wanderStay + 10000; life.step(cast(f), nino(world), world, t);
  expect({ x: f.x, y: f.y }).toEqual({ x: nino(world).x, y: Math.max(nino(world).y, 410) });
  // Idle starts over after the return: no second stroll right away.
  t = idle(life, world, t, 1000); expect(life.step(cast(f), nino(world), world, t)).toBe(false);
});
it('o gato escolhido não passeia, nem com algo acontecendo, nem na rua', () => {
  const world = initialWorld();
  for (const [selected, calm, street] of [['nino', true, false], ['bia', false, false], ['bia', true, true]] as const) {
    const life = ambientLife(() => canvas), place = street ? { ...world, streetWidth: 2000 } : world;
    const t = idle(life, place, 0, idleMs + 2000, selected, calm);
    expect(life.step(cast(figure()), nino(world), place, t), `${selected} ${calm} ${street}`).toBe(false);
  }
});
it('um toque manda o gato de volta e zera o ócio; um gato movido pela criança esquece o passeio', () => {
  const world = initialWorld(), life = ambientLife(() => canvas), f = figure();
  let t = idle(life, world, 0, idleMs + 100);
  life.step(cast(f), nino(world), world, t + 1500);
  life.input(t + 1500);
  expect(life.step(cast(f), nino(world), world, t + 1500)).toBe(true);
  t = idle(life, world, t + 1500, 10000); life.step(cast(f), nino(world), world, t);
  expect(life.step(cast(f), nino(world), world, t + 16)).toBe(false);
  const other = ambientLife(() => canvas);
  t = idle(other, world, 0, idleMs + 100); expect(other.step(cast(f), nino(world), world, t + 200)).toBe(true);
  const moved = { ...world, actors: world.actors.map(a => a.id === 'nino' ? { ...a, x: a.x + 100 } : a) };
  other.painted(moved, t + 300);
  expect(other.step(cast(f), nino(moved), moved, t + 400)).toBe(false);
});
