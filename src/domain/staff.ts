import { doorway } from './doorway';
import { roomWidths } from './geometry';
import { pieceBounds } from './layout';
import { passages } from './passages';
import { footprint, overlap, type Footprint } from './placement';
import { seatSlots } from './seats';
import type { BuildingModel, Location, Neighborhood } from './neighborhood-types';
import type { Layout, PieceKind, Point, RoomId, RoomTemplate } from './types';

/** The grown-ups who work at each institution (lot 7): they live there, are never characters of the Turma and are never saved. */
export const professions = ['teacher', 'firefighter', 'police', 'doctor', 'coach', 'clerk'] as const;
export type Profession = typeof professions[number];
/** Who works where, and in which room of the plan: the school's classroom, the fire station's dispatch, the police reception... */
const workplaces: Partial<Record<BuildingModel, { profession: Profession; template: RoomTemplate }>> = {
  school: { profession: 'teacher', template: 'classroom' }, 'fire-station': { profession: 'firefighter', template: 'dispatch' },
  police: { profession: 'police', template: 'reception' }, hospital: { profession: 'doctor', template: 'consultation' },
  'sports-club': { profession: 'coach', template: 'gym' }, stadium: { profession: 'coach', template: 'sportsfield' }, office: { profession: 'clerk', template: 'office' },
};
export interface Staff extends Point { profession: Profession; building: number; room: RoomId }
export const professionOf = (model: BuildingModel): Profession | undefined => workplaces[model]?.profession;
/** The professional's drawing around its feet (scene units, a grown-up at the interior scale, kept a little generous). */
export const staffBody = { half: 64, height: 300 };
/** Pieces nobody may stand in front of: the board one learns at, the counter and the checkout one is served at. */
const keyKinds: readonly PieceKind[] = ['board', 'counter', 'checkout'];
/** Nor in front of a seat: whoever sits there (a pupil at her desk) stays in sight. */
const hidden = (kind: PieceKind) => keyKinds.includes(kind) || !!seatSlots[kind];
const box = (r: { x: number; y: number; width: number; height: number }): Footprint => ({ left: r.x, right: r.x + r.width, top: r.y, bottom: r.y + r.height });
/** The professional of the room shown at `where`, standing at its spot, or null (a home, the street, another room). */
export function staffAt(town: Neighborhood, where: Location): Staff | null {
  if (where.kind !== 'interior') return null;
  const building = town.buildings.find(b => b.id === where.building), work = building && workplaces[building.model];
  const room = building?.layout.rooms[where.room];
  if (!work || room?.template !== work.template) return null;
  return { profession: work.profession, building: where.building, room: where.room, ...spot(building.layout, where.room) };
}
/** Where to stand: beside the room's key piece (else the middle), never in a passage, the street door, in front of a key piece or a seat,
 *  nor in another piece's footprint; a full room takes the least crowded place. */
function spot(layout: Layout, room: RoomId): Point {
  const width = roomWidths[layout.rooms[room]!.size], pieces = layout.pieces.filter(p => p.room === room);
  const key = pieces.find(p => keyKinds.includes(p.kind)), wanted = key ? key.x + pieceBounds[key.kind].width + staffBody.half + 10 : width / 2;
  const blocked = [...passages(layout, room).map(p => box(p.zone)), ...(layout.rooms[room]!.cell === 0 ? [box(doorway.interior)] : []),
    ...pieces.filter(p => hidden(p.kind)).map(p => box({ ...pieceBounds[p.kind], x: p.x, y: p.y }))];
  const feet = pieces.map(footprint).filter((f): f is Footprint => !!f);
  const cost = (p: Point) => {
    const body = { left: p.x - staffBody.half, right: p.x + staffBody.half, top: p.y - staffBody.height, bottom: p.y };
    const stand = { left: p.x - 30, right: p.x + 30, top: p.y - 20, bottom: p.y + 5 };
    return (blocked.reduce((sum, b) => sum + overlap(body, b), 0) + feet.reduce((sum, f) => sum + overlap(stand, f), 0)) * 1000 + Math.abs(p.x - wanted);
  };
  const candidates: Point[] = [];
  for (const y of [465, 495]) for (let x = 110; x <= width - 110; x += 10) candidates.push({ x, y });
  return candidates.reduce((best, p) => cost(p) < cost(best) ? p : best);
}
