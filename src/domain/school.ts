import { drawingIds, sumIds, wordIds, type DrawingId, type Keepsake } from './progress';
import { needsOf, relieve } from './needs';
import { parseSeat } from './seats';
import { consumeItem, spawnItem } from './portable';
import { isMarket } from './market';
import type { ActorId, ItemId, Layout, PieceKind, RoomId } from './types';
import type { Location, Neighborhood, Resident } from './neighborhood-types';

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
 *  `staffed`: the school's own teacher works there (lot 7), and she is the one who teaches; `writer`: the selected character, who
 *  writes at a board with no teacher (#30) when she is a person in the room and not a pupil at a desk. */
export interface Classroom { building: number; room: RoomId; grownUps?: readonly ActorId[]; staffed?: boolean; writer?: ActorId }
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
/** The board tapped (W3L-26): with at least one child at a desk, the lesson gives the subject's paper of the day (into the collection,
 *  kept once, newest last; never on the fridge by itself, Bia's request) and relieves the pupils' boredom with joy. Without a pupil the desk is what is missing. */
export function lesson(town: Neighborhood, where: Classroom, subject: Subject = 'desenho'): Taught {
  const layout = town.buildings.find(b => b.id === where.building)?.layout;
  if (!layout?.pieces.some(p => p.room === where.room && p.kind === 'board')) return { town, outcome: { kind: 'none' } };
  const pupils = pupilsOf(town, where);
  if (!pupils.length) return { town, outcome: { kind: 'missing', need: 'seat', want: 'school-desk' } };
  const writer = town.actors.find(a => a.id === where.writer && a.kind === 'human' && inRoom(a, where) && !pupils.includes(a.id))?.id;
  const theme = nextKeepsake(town.progress.papers, subject), teacher = where.staffed ? 'teacher' : writer ?? town.actors.find(a => where.grownUps?.includes(a.id) && !a.seat && inRoom(a, where))?.id;
  const papers = [...town.progress.papers.filter(id => id !== theme), theme];
  const actors = town.actors.map(a => pupils.includes(a.id) ? { ...a, needs: relieve(needsOf(a), 'escola') } : a);
  return { town: { ...town, actors, progress: { ...town.progress, papers } }, outcome: { kind: 'lesson', subject, theme, pupils, teacher } };
}
/** The lesson over (Bia's request): its paper goes into the hand of the selected child if she was a pupil, else of the first pupil; with
 *  her hands full it lies at her feet. A paper that comes back in the rotation is a new copy: the old one stays wherever it is. */
export function handPaper(town: Neighborhood, pupils: readonly ActorId[], paper: Keepsake, selected?: ActorId): Neighborhood {
  const who = town.actors.find(a => a.id === (selected && pupils.includes(selected) ? selected : pupils[0]));
  if (!who) return town;
  const spawned = spawnItem(town, { kind: 'papel', location: who.location, point: { x: who.x, y: who.y } }), id = spawned.items.at(-1)!.id;
  const holder = town.items.some(i => i.holder === who.id) ? null : who.id;
  return { ...spawned, items: spawned.items.map(i => i.id === id ? { ...i, holder, paper } : i) };
}
/** Whether `where` is a room with a fridge that is not a market's. */
function homeFridge(town: Neighborhood, where: Location): boolean {
  const layout = where.kind === 'interior' ? town.buildings.find(b => b.id === where.building)?.layout : undefined;
  return where.kind === 'interior' && !!layout?.pieces.some(p => p.room === where.room && p.kind === 'fridge') && !isMarket(layout, where.room);
}
/** A paper taken to a fridge (not a market's) is pinned on the door, newest last and each once, and leaves her hand; anywhere else
 *  nothing changes and it stays in the collection. */
export function pinPaper(town: Neighborhood, item: ItemId): { town: Neighborhood; outcome: 'pinned' | 'none' } {
  const paper = town.items.find(i => i.id === item && i.kind === 'papel');
  if (!paper?.paper || !homeFridge(town, paper.location)) return { town, outcome: 'none' };
  const drawings = [...town.progress.drawings.filter(id => id !== paper.paper), paper.paper];
  return { town: { ...consumeItem(town, item), progress: { ...town.progress, drawings } }, outcome: 'pinned' };
}
