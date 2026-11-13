import { drawingIds, type DrawingId } from './progress';
import { needsOf, relieve } from './needs';
import { parseSeat } from './seats';
import type { ActorId, Layout, RoomId } from './types';
import type { Neighborhood, Resident } from './neighborhood-types';

/** A place is what it holds (§3.6): a room with a board and a desk is a school, in any building. */
export function isSchool(layout: Layout, room: RoomId): boolean {
  const kinds = layout.pieces.filter(p => p.room === room).map(p => p.kind);
  return kinds.includes('board') && kinds.includes('desk');
}
/** The next drawing of the day: the first theme that has not come out yet; once all 12 have, the oldest one comes back. */
export function nextTheme(drawings: readonly DrawingId[]): DrawingId {
  return drawingIds.find(id => !drawings.includes(id)) ?? drawings[0]!;
}
/** Where the lesson is: a room of a building; `grownUps` is the hook for lot 5A's adults (a grown-up standing there teaches). */
export interface Classroom { building: number; room: RoomId; grownUps?: readonly ActorId[] }
type Outcome = { kind: 'lesson'; theme: DrawingId; pupils: ActorId[]; teacher: ActorId | undefined } | { kind: 'missing'; need: 'seat'; want: 'desk' } | { kind: 'none' };
export type Taught = { town: Neighborhood; outcome: Outcome };
const inRoom = (actor: Resident, where: Classroom) =>
  actor.location.kind === 'interior' && actor.location.building === where.building && actor.location.room === where.room;
/** The children sitting at a desk of the classroom (never a cat, never a grown-up). */
export function pupilsOf(town: Neighborhood, where: Classroom): ActorId[] {
  const pieces = town.buildings.find(b => b.id === where.building)?.layout.pieces ?? [];
  const atDesk = (actor: Resident) => { const ref = actor.seat ? parseSeat(actor.seat) : null; return pieces.some(p => p.id === ref?.piece && p.room === where.room && p.kind === 'desk'); };
  return town.actors.filter(a => a.kind === 'human' && !where.grownUps?.includes(a.id) && inRoom(a, where) && atDesk(a)).map(a => a.id);
}
/** The board tapped (W3L-26): with at least one child at a desk, the lesson gives the drawing of the day (kept once, newest last) and
 *  relieves the pupils' boredom with joy. Without a pupil the desk is what is missing. */
export function lesson(town: Neighborhood, where: Classroom): Taught {
  const layout = town.buildings.find(b => b.id === where.building)?.layout;
  if (!layout?.pieces.some(p => p.room === where.room && p.kind === 'board')) return { town, outcome: { kind: 'none' } };
  const pupils = pupilsOf(town, where);
  if (!pupils.length) return { town, outcome: { kind: 'missing', need: 'seat', want: 'desk' } };
  const theme = nextTheme(town.progress.drawings), teacher = town.actors.find(a => where.grownUps?.includes(a.id) && !a.seat && inRoom(a, where))?.id;
  const drawings = [...town.progress.drawings.filter(id => id !== theme), theme];
  const actors = town.actors.map(a => pupils.includes(a.id) ? { ...a, needs: relieve(needsOf(a), 'escola') } : a);
  return { town: { ...town, actors, progress: { ...town.progress, drawings } }, outcome: { kind: 'lesson', theme, pupils, teacher } };
}
