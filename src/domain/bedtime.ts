import type { Actor, PieceKind, PresentationEvent, RoomId, SeatRef, Transition, World } from './types';
import { freeSeat, seatPiece, seatPoint } from './seats';
import { missingEvent } from './missing';
import { rest } from './care';

/** Where each one sleeps at bedtime, best first: a person in a bed, else on a sofa; a cat in a cat bed (sofas and beds stay for the
 *  people, as when a cat lies down on its own). */
const spots: Record<Actor['kind'], readonly PieceKind[]> = { human: ['bed', 'sofa'], cat: ['cat-bed'] };
/** The spot of the house for `actor`: the one she sits on if it is a place to sleep, else a free one by kind (a bed before a sofa), in
 *  her own room before the others. */
function spotFor(state: World, actor: Actor): { seat: SeatRef; room: RoomId } | undefined {
  const own = actor.seat ? seatPiece(state, actor.seat, actor.room) : undefined;
  if (own && spots[actor.kind].includes(own.kind)) return { seat: actor.seat!, room: actor.room };
  const rooms = [actor.room, ...Object.keys(state.layout.rooms).filter(room => room !== actor.room)] as RoomId[];
  for (const kind of spots[actor.kind]) for (const room of rooms) {
    const here = { ...state, room };
    const seat = state.layout.pieces.filter(p => p.room === room && p.kind === kind).map(p => freeSeat(here, p, actor)).find(Boolean);
    if (seat) return { seat, room };
  }
  return undefined;
}
/** "Todos para a cama" (lot 6B): everyone of the house who is not resting yet goes to sleep, the people first. A free spot anywhere in
 *  the house (`spotFor`) takes her there, lying down; a cat with no cat bed curls up on a rug of its room. Whoever finds no place stays
 *  where she is and asks for a bed (the missing bubble, one event each). */
export function bedtime(state: World): Transition {
  const awake = state.actors.filter(a => !a.resting).sort((a, b) => Number(a.kind === 'cat') - Number(b.kind === 'cat'));
  const result = awake.reduce<Transition>(({ state: next, events }, { id }) => {
    const actor = next.actors.find(a => a.id === id)!, spot = spotFor(next, actor);
    const point = spot && seatPoint(next, spot.seat, spot.room);
    if (spot && point) return lie(next, events, actor, { room: spot.room, seat: spot.seat, x: point.x, y: point.y, resting: true });
    if (actor.kind === 'cat') { const curled = rest({ ...next, room: actor.room }, actor, true); return { state: { ...curled.state, room: next.room }, events: [...events, ...curled.events] }; }
    return { state: next, events: [...events, missingEvent('bed', actor.id, undefined, 'bed')] };
  }, { state, events: [] });
  // One line for the room (the first in view who lies down), not one bubble per sleeper over each other; the zzz show the others. The
  // missing bubble shows one at a time, the last: someone in view who has no bed.
  const here = (e: PresentationEvent) => result.state.actors.find(a => a.id === e.actor)?.room === state.room;
  const rested = result.events.filter(e => e.type === 'rested' && here(e)).slice(0, 1), missing = result.events.filter(e => e.type === 'missing');
  return { state: result.state, events: [...rested, ...missing.filter(e => !here(e)), ...missing.filter(here)] };
}
const lie = (state: World, events: PresentationEvent[], actor: Actor, patch: Partial<Actor>): Transition =>
  ({ state: { ...state, actors: state.actors.map(a => a.id === actor.id ? { ...a, ...patch } : a) }, events: [...events, { type: 'rested', actor: actor.id }] });
