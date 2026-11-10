import type { ActorId, PieceKind, Point, World } from '../domain/types';
import { fixture, pieceBounds } from '../domain/layout';
import { followElapsed } from './motion';
import { onFloor } from './floor-band';
import { visualPiecePoint } from './furniture-scale';
import { stroll, strollAt } from './stroll';
/** Ambient life, drawn only and never saved: breathing, glances, cat tails, ears and stretches, and a cat strolling to its favourite piece
 *  after 20 s without a touch. Pure functions of time and a per-character phase, so repaints and reloads never shift anyone; with reduced
 *  motion all of it stands still (only blinks remain). */
const tau = Math.PI * 2;
export const idleMs = 20000, wanderStay = 6000, curledTail = .9;
export function phaseOf(id: ActorId) { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 6283) / 1000; }
const share = (phase: number) => phase / tau;
export function breath(time: number, phase: number, reduced: boolean) { return reduced ? 0 : .012 * Math.sin(time / 3600 * tau + phase); }
/** A 1.5 s glance at someone else, every 6 to 10 s (the interval is the character's own). */
export function glancing(time: number, phase: number, reduced: boolean) {
  return !reduced && (time + phase * 1000) % (6000 + 4000 * share(phase)) < 1500;
}
export function catTail(time: number, phase: number, resting: boolean, reduced: boolean) {
  if (resting) return curledTail;
  return reduced ? 0 : .25 * Math.sin(time / 800 + phase);
}
/** A quick 320 ms ear flick every 5 to 6 s. */
export function earTwitch(time: number, phase: number, reduced: boolean) {
  const at = (time + phase * 700) % (5300 + 900 * share(phase));
  return reduced || at >= 320 ? 0 : .12 * Math.sin(at / 320 * Math.PI);
}
/** A 1.4 s stretch (longer and lower, at most 8%) every 13 to 15 s. */
export function stretch(time: number, phase: number, reduced: boolean) {
  const at = (time + phase * 1500) % (13000 + 2000 * share(phase));
  return reduced || at >= 1400 ? 0 : .08 * Math.sin(at / 1400 * Math.PI);
}
/** Idle time counted from clamped frame steps, so a paused clock or a waking tab never jumps it. */
export function idleClock() {
  let idle = 0, previous: number | null = null;
  return {
    tick(now: number) { idle += followElapsed(now, previous); previous = now; return idle; },
    reset() { idle = 0; },
  };
}
const favorites: Partial<Record<ActorId, PieceKind>> = { mimi: 'cat-bed', nino: 'sofa', pipoca: 'rug' };
/** Where a cat goes to enjoy its favourite piece, on the painted floor; null when the piece is not in this room. */
export function favoriteSpot(world: World, id: ActorId): Point | null {
  const kind = favorites[id], piece = kind && fixture(world, kind);
  if (!piece) return null;
  const box = pieceBounds[piece.kind], lying = piece.kind === 'rug' || piece.kind === 'cat-bed';
  return onFloor(world, visualPiecePoint(piece, { x: piece.x + box.width / 2, y: piece.y + (lying ? box.height / 2 : box.height + 14) }));
}
export interface Wander { actor: ActorId; home: Point; target: Point; start: number; recall?: { from: Point; start: number } }
export type WanderPhase = 'go' | 'stay' | 'back' | 'done';
/** Where the strolling cat is drawn: going, staying a while, walking back home (or straight back once recalled by a touch). */
export function wanderAt(plan: Wander, now: number): { phase: WanderPhase; point: Point; walked: number; direction: number } {
  if (plan.recall) return walk(stroll(plan.recall.from, plan.home, plan.recall.start, false), now, 'back');
  const go = stroll(plan.home, plan.target, plan.start, false), back = go.start + go.duration + wanderStay;
  if (now < go.start + go.duration) return walk(go, now, 'go');
  if (now < back) return { phase: 'stay', point: plan.target, walked: 0, direction: 0 };
  return walk(stroll(plan.target, plan.home, back, false), now, 'back');
}
function walk(step: ReturnType<typeof stroll>, now: number, phase: WanderPhase) {
  const at = strollAt(step, now);
  return { phase: at.done ? 'done' as const : phase, point: at.point, walked: at.walked, direction: at.direction };
}
