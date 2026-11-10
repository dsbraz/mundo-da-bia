import type { GameKind } from '../domain/child-games';
import { roomWidth } from '../domain/geometry';
import { footprint, overlap } from '../domain/placement';
import type { Actor, ActorId, Point, World } from '../domain/types';
import { walkingPath } from './walking-path';

const rows = [[1], [2], [3, 4], [5], [6, 7], [8]];
export const hopTiles = rows.flatMap((cells, row) => cells.map((cell, index) => ({ cell, x: row * 42 + (cells.length === 2 ? index * 52 - 26 : 0), y: -12 - row * 20 })));
/** The drawn squares' bounding box from the board's origin (each square is 94 wide and 20 deep). */
export const hopBoard = (origin: Point) => ({ left: origin.x - 47, right: origin.x + 257, top: origin.y - 122, bottom: origin.y - 2 });
/** Where the camera looks to frame the whole board (its middle, at floor level). */
export const hopFocus = (origin: Point): Point => ({ x: origin.x + 105, y: origin.y });
/** Hopscotch: everyone else whose body would hide a square (standing on or in front of the chalk) steps back behind the board. */
export function stepAside(world: World, player: Actor, origin: Point): { actor: ActorId; point: Point }[] {
  const board = hopBoard(origin), behind = board.top - 13;
  return world.actors.filter(a => a.id !== player.id && a.room === world.room && hides(a, board))
    .map(a => ({ actor: a.id, point: { x: a.x, y: behind } }));
}
function hides(actor: Actor, board: ReturnType<typeof hopBoard>) {
  const half = actor.kind === 'cat' ? 35 : 42, height = actor.kind === 'cat' ? 94 : 189, foot = actor.y + (actor.seat ? 19 : 0);
  return actor.x + half > board.left && actor.x - half < board.right && foot > board.top && foot - height < board.bottom;
}
function candidates(world: World, actor: Actor, kind: GameKind) {
  const points: Point[] = [];
  for (let x = 130; x <= roomWidth(world) - 130; x += 40) points.push({ x, y: 530 });
  if (kind === 'rope') points.unshift({ x: actor.x, y: actor.y });
  return points.sort((a, b) => Math.hypot(a.x - actor.x, a.y - actor.y) - Math.hypot(b.x - actor.x, b.y - actor.y));
}
const gameArea = (p: Point, kind: GameKind) => ({ left: p.x - 70, right: p.x + (kind === 'rope' ? 70 : 270), top: p.y - (kind === 'rope' ? 40 : 130), bottom: p.y + 10 });
const inRoom = (world: World, area: ReturnType<typeof gameArea>) => !world.streetWidth && area.left >= 60 && area.right <= roomWidth(world) - 60 && area.top >= 280 && area.bottom <= 540;
export function gameSpace(world: World, actor: Actor, kind: GameKind): Point | null {
  return candidates(world, actor, kind).find(p => clearSpace(world, actor, p, kind) && walkingPath(world, actor, p)) ?? null;
}
/** With no fully clear spot, the reachable floor the furniture covers least (people and loose objects ignored): the game goes there instead of refusing. */
export function freestFloor(world: World, actor: Actor, kind: GameKind): Point | null {
  const blocks = world.layout.pieces.filter(piece => piece.room === world.room).map(footprint).filter(b => !!b);
  const covered = (p: Point) => blocks.reduce((sum, b) => sum + overlap(gameArea(p, kind), b), 0);
  const options = candidates(world, actor, kind).filter(p => inRoom(world, gameArea(p, kind)) && walkingPath(world, actor, p));
  return options.reduce<Point | null>((best, p) => !best || covered(p) < covered(best) ? p : best, null);
}
function clearSpace(world: World, actor: Actor, p: Point, kind: GameKind) {
  const area = gameArea(p, kind);
  if (!inRoom(world, area)) return false;
  const blocks = world.layout.pieces.filter(piece => piece.room === world.room).map(footprint);
  if (blocks.some(b => b && overlap(area, { left: b.left - 26, right: b.right + 26, top: b.top - 15, bottom: b.bottom + 26 }) > 0)) return false;
  if (world.items.some(i => i.room === world.room && !i.holder && i.spot === 'floor' && i.x > area.left - 20 && i.x < area.right + 20 && i.y > area.top && i.y < area.bottom + 20)) return false;
  return !world.actors.some(a => a.id !== actor.id && a.room === world.room && a.x > area.left - 30 && a.x < area.right + 30 && a.y > area.top && a.y < area.bottom + 20);
}
export function hopPosition(origin: Point, cell: number): Point {
  const row = rows.findIndex(cells => cells.includes(cell));
  return { x: origin.x + row * 42, y: origin.y - 12 - row * 20 };
}
export function hopTileAt(origin: Point, point: Point) {
  return hopTiles.find(t => {
    const dx = point.x - origin.x - t.x, dy = point.y - origin.y - t.y;
    return Math.abs(dx + dy * 2.1) <= 26 && Math.abs(dy) <= 10;
  });
}
