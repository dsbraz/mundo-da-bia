import { actorIds, actorKinds } from '../domain/types';
import type { ActorId } from '../domain/types';
import { initialWorld } from '../domain/world';
import { member, positiveId, record } from './values';
import type { RecordValue } from './values';

/** The cast as this build knows it (W3L-18, §4): a save may list more characters (a newer build) or fewer (an older one). Unknown ids drop
 *  out and what they held stays on the floor where it was; missing ones come in standing in the living room of the first building (its
 *  entry room without one), where a new save puts them; each one's kind comes from `actorKinds`. Anything that is not a list, or an actor
 *  that is not an object, is left for validation to reject. */
export function knownCast(value: unknown, known: readonly ActorId[] = actorIds): unknown {
  const home = record(value) ? homeOf(value.buildings) : null;
  return cast(value, known, home && (id => ({ ...standing(id, home.room), location: { kind: 'interior', building: home.building, room: home.room } })));
}
/** The same for a single-house world (album and the v1 to v4 house saves, W3L-24): who is missing stands in its living room (else the
 *  room shown). */
export function worldCast(value: unknown, known: readonly ActorId[] = actorIds): unknown {
  if (!record(value)) return value;
  const rooms = record(value.layout) && record(value.layout.rooms) ? value.layout.rooms : {};
  return cast(value, known, id => standing(id, Object.hasOwn(rooms, 'sala') ? 'sala' : value.room));
}
function cast(value: unknown, known: readonly ActorId[], arrive: ((id: ActorId) => unknown) | null): unknown {
  if (!record(value) || !Array.isArray(value.actors) || !Array.isArray(value.items)) return value;
  const kept = value.actors.filter(a => !record(a) || member(known, a.id)), gone = value.actors.filter(a => record(a) && !member(known, a.id)).map(a => (a as RecordValue).id);
  const present = kept.map(a => record(a) ? a.id : undefined);
  const missing = arrive ? known.filter(id => !present.includes(id)).map(arrive) : [];
  const rank = (a: unknown) => record(a) && member(known, a.id) ? known.indexOf(a.id) : known.length;
  return { ...value,
    actors: [...kept.map(a => record(a) ? { ...a, kind: actorKinds[a.id as ActorId] } : a), ...missing].sort((a, b) => rank(a) - rank(b)),
    items: value.items.map(i => record(i) && gone.includes(i.holder) ? { ...i, holder: null } : i) };
}
type Home = { building: number; room: string };
/** The lowest-id building's living room (or its entry room). */
function homeOf(buildings: unknown): Home | null {
  const valid = (Array.isArray(buildings) ? buildings : []).filter((b): b is RecordValue => record(b) && positiveId(b.id) && record(b.layout) && record(b.layout.rooms));
  const first = valid.sort((a, b) => Number(a.id) - Number(b.id))[0];
  if (!first) return null;
  const rooms = (first.layout as RecordValue).rooms as RecordValue;
  return { building: Number(first.id), room: Object.hasOwn(rooms, 'sala') ? 'sala' : String(first.entry) };
}
/** Where a new save puts `id`, standing in `room`. */
function standing(id: ActorId, room: unknown) {
  const start = initialWorld().actors.find(a => a.id === id)!;
  return { ...start, y: start.seat ? 530 : start.y, kind: actorKinds[id], room, seat: null };
}
