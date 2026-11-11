import { basketLimit, inboxLimit, initialProgress, letterCount, plazaPlots, goalIds, recipeIds, specialIds } from '../domain/progress';
import type { Post, Progress } from '../domain/progress';
import { actorIds, cropIds } from '../domain/types';
import type { Plant } from '../domain/types';
import { member, record } from './values';

const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
/** A plant this build knows, rebuilt with only its fields, or null. */
export function knownPlant(value: unknown): Plant | null {
  if (!record(value) || !member(cropIds, value.crop) || typeof value.watered !== 'boolean') return null;
  const { stage, since } = value;
  if (!Number.isInteger(stage) || Number(stage) < 0 || Number(stage) > 4) return null;
  if (typeof since !== 'number' || !Number.isFinite(since) || since < 0) return null;
  return { crop: value.crop, stage: stage as Plant['stage'], since, watered: value.watered };
}
/** The known, distinct ids of `value` in their order; anything that is not a list gives `fallback`. */
function known<T extends string>(value: unknown, ids: readonly T[], fallback: T[]): T[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is T => member(ids, id)))] : fallback;
}
function basket(value: unknown): Progress['basket'] {
  if (!record(value)) return {};
  return Object.fromEntries(cropIds.flatMap(crop => {
    const amount = value[crop];
    return Number.isInteger(amount) && Number(amount) > 0 ? [[crop, Math.min(Number(amount), basketLimit)]] : [];
  }));
}
function plaza(value: unknown): Progress['plaza'] {
  if (!record(value)) return {};
  return Object.fromEntries(plazaPlots.flatMap(plot => { const plant = knownPlant(value[plot]); return plant ? [[plot, plant]] : []; }));
}
function post(value: unknown): Post {
  if (!record(value)) return initialProgress().post;
  const inbox = Array.isArray(value.inbox) ? [...new Set(value.inbox.filter(i => count(i) && i < letterCount))].slice(0, inboxLimit) : [];
  return { day: count(value.day) ? value.day : null, next: count(value.next) ? value.next : 0, inbox };
}
/** Save v3 progress: unknown or repeated ids, bad amounts, plants and letters drop out alone; a missing progress starts over. */
export function knownProgress(value: unknown): Progress {
  const initial = initialProgress();
  if (!record(value)) return initial;
  return { recipes: known(value.recipes, recipeIds, initial.recipes), fancy: known(value.fancy, recipeIds, initial.fancy),
    seeds: known(value.seeds, cropIds, initial.seeds), specials: known(value.specials, specialIds, initial.specials),
    basket: basket(value.basket), plaza: plaza(value.plaza), post: post(value.post),
    revealed: known(value.revealed, recipeIds, initial.revealed), favorites: known(value.favorites, actorIds, initial.favorites),
    goals: known(value.goals, goalIds, initial.goals) };
}
