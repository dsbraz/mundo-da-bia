import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { posture, type FrameContext } from './figure-frame';
import type { Actor } from '../domain/types';

const ctx = (carrying: boolean, walking = false) => ({ world: initialWorld(), town: null, walking: () => walking, weight: { carrying: () => carrying } }) as unknown as FrameContext;
const sleeper: Actor = { ...initialWorld().actors[0]!, room: 'quarto', seat: '8.0', resting: true };

it('a character carried by the finger is drawn standing and awake, not walking', () => {
  const carried = posture(ctx(true), {} as never, sleeper);
  expect(carried.walking).toBe(false); expect(carried.posed).toMatchObject({ seat: null, resting: false });
});
it('left alone, a sleeper keeps the bed pose; a walker stands', () => {
  expect(posture(ctx(false), {} as never, sleeper).posed).toMatchObject({ seat: '8.0', resting: true, lying: true });
  expect(posture(ctx(false, true), {} as never, sleeper).posed).toMatchObject({ seat: null, resting: false });
});
