import { drawingIds, sumIds, wordIds, type DrawingId, type Keepsake } from './progress';
import { needsOf, relieve } from './needs';
import { parseSeat } from './seats';
import type { ActorId, Layout, PieceKind, RoomId } from './types';
import type { Neighborhood, Resident } from './neighborhood-types';

/** What a pupil sits at: the school desk, or any creation desk (classrooms from before the school desk keep working). */
const deskKinds: readonly PieceKind[] = ['school-desk', 'desk'];
/** A place is what it holds (§3.6): a room with a board and a desk is a school, in any building. */
export function isSchool(layout: Layout, room: RoomId): boolean {
  const kinds = layout.pieces.filter(p => p.room === room).map(p => p.kind);
  return kinds.includes('board') && kinds.some(kind => deskKinds.includes(kind));
}
/** What a lesson at the board is about (lot 8D), chosen with three drawn buttons: drawing, writing or math. */
export const subjects = ['desenho', 'escrita', 'matematica'] as const;
export type Subject = typeof subjects[number];
const papers: Record<Subject, readonly Keepsake[]> = { desenho: drawingIds, escrita: wordIds, matematica: sumIds };
/** The subject's next paper: the first of its own that has not come out yet; once all have, its oldest one comes back. */
export function nextKeepsake(kept: readonly Keepsake[], subject: Subject): Keepsake {
  const own = papers[subject];
  return own.find(id => !kept.includes(id)) ?? kept.find(id => own.includes(id))!;
}
/** The next drawing of the day: the first theme that has not come out yet; once all 12 have, the oldest one comes back. */
export function nextTheme(drawings: readonly Keepsake[]): DrawingId {
  return nextKeepsake(drawings, 'desenho') as DrawingId;
}
/** Where the lesson is: a room of a building; `grownUps` is the hook for lot 5A's adults (a grown-up standing there teaches);
 *  `staffed`: the school's own teacher works there (lot 7), and she is the one who teaches. */
export interface Classroom { building: number; room: RoomId; grownUps?: readonly ActorId[]; staffed?: boolean }
type Outcome = { kind: 'lesson'; subject: Subject; theme: Keepsake; pupils: ActorId[]; teacher: ActorId | 'teacher' | undefined } | { kind: 'missing'; need: 'seat'; want: 'school-desk' } | { kind: 'none' };
export type Taught = { town: Neighborhood; outcome: Outcome };
const inRoom = (actor: Resident, where: Classroom) =>
  actor.location.kind === 'interior' && actor.location.building === where.building && actor.location.room === where.room;
/** The children sitting at a desk of the classroom (never a cat, never a grown-up). */
export function pupilsOf(town: Neighborhood, where: Classroom): ActorId[] {
  const pieces = town.buildings.find(b => b.id === where.building)?.layout.pieces ?? [];
  const atDesk = (actor: Resident) => { const ref = actor.seat ? parseSeat(actor.seat) : null; return pieces.some(p => p.id === ref?.piece && p.room === where.room && deskKinds.includes(p.kind)); };
  return town.actors.filter(a => a.kind === 'human' && !where.grownUps?.includes(a.id) && inRoom(a, where) && atDesk(a)).map(a => a.id);
}
/** The board tapped (W3L-26): with at least one child at a desk, the lesson gives the subject's paper of the day (kept once, newest
 *  last) and relieves the pupils' boredom with joy. Without a pupil the desk is what is missing. */
export function lesson(town: Neighborhood, where: Classroom, subject: Subject = 'desenho'): Taught {
  const layout = town.buildings.find(b => b.id === where.building)?.layout;
  if (!layout?.pieces.some(p => p.room === where.room && p.kind === 'board')) return { town, outcome: { kind: 'none' } };
  const pupils = pupilsOf(town, where);
  if (!pupils.length) return { town, outcome: { kind: 'missing', need: 'seat', want: 'school-desk' } };
  const theme = nextKeepsake(town.progress.drawings, subject), teacher = where.staffed ? 'teacher' : town.actors.find(a => where.grownUps?.includes(a.id) && !a.seat && inRoom(a, where))?.id;
  const drawings = [...town.progress.drawings.filter(id => id !== theme), theme];
  const actors = town.actors.map(a => pupils.includes(a.id) ? { ...a, needs: relieve(needsOf(a), 'escola') } : a);
  return { town: { ...town, actors, progress: { ...town.progress, drawings } }, outcome: { kind: 'lesson', subject, theme, pupils, teacher } };
}
