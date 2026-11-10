import type { GameKind } from '../domain/child-games';
import { roomWidth } from '../domain/geometry';
import { footprint, overlap } from '../domain/placement';
import type { Actor, ActorId, Point, World } from '../domain/types';
import { walkingPath } from './walking-path';
import { onFloor, walkable } from './floor-band';

const rows = [[1], [2], [3, 4], [5], [6, 7], [8]];
export const hopTiles = rows.flatMap((cells, row) => cells.map((cell, index) => ({ cell, x: row * 42 + (cells.length === 2 ? index * 52 - 26 : 0), y: -12 - row * 20 })));
/** The drawn squares' bounding box from the board's origin (each square is 94 wide and 20 deep). */
export const hopBoard = (origin: Point) => ({ left: origin.x - 47, right: origin.x + 257, top: origin.y - 122, bottom: origin.y - 2 });
/** Where the camera looks to frame the whole board (its middle, at floor level). */
export const hopFocus = (origin: Point): Point => ({ x: origin.x + 105, y: origin.y });
type Move = { actor: ActorId; point: Point };
type Zone = { left: number; right: number };
/** Hopscotch: the child sweeps the whole board, so everyone else standing over it (whatever their depth, their body would meet the child's
 *  at some square or hide one) steps sideways off it, on the floor, to a spot no furniture in front hides and nobody crowds. */
export function stepAside(world: World, player: Actor, origin: Point): Move[] {
  const zone = hopBoard(origin), moves: Move[] = [];
  for (const a of world.actors.filter(a => a.id !== player.id && a.room === world.room && a.x + half(a) > zone.left && a.x - half(a) < zone.right)) {
    const point = aside(world, player, a, zone, moves); if (point) moves.push({ actor: a.id, point });
  }
  return moves;
}
const half = (actor: Actor) => actor.kind === 'cat' ? 35 : 42;
/** The nearest free floor spot off the board at the character's depth, first with nobody within 55 sideways, then with nobody close at that depth. */
function aside(world: World, player: Actor, actor: Actor, zone: Zone, taken: Move[]): Point | undefined {
  const y = onFloor(world, actor).y, w = half(actor), blocks = world.layout.pieces.filter(p => p.room === world.room).map(footprint).filter(b => !!b);
  const others = world.actors.filter(o => o.id !== actor.id && o.id !== player.id && o.room === world.room && !taken.some(m => m.actor === o.id)).map(o => ({ x: o.x, y: o.y })).concat(taken.map(m => m.point));
  const clear = (x: number) => walkable(world, { x, y }) && (x + w <= zone.left - 6 || x - w >= zone.right + 6)
    && blocks.every(b => b.bottom + 8 <= y || x + w <= b.left || x - w >= b.right) && blocks.every(b => b.top > y + 4 || b.bottom < y - 4 || b.right <= Math.min(x, actor.x) - w || b.left >= Math.max(x, actor.x) + w);
  const spots = Array.from({ length: Math.floor(roomWidth(world) / 10) + 1 }, (_, i) => i * 10).filter(clear).sort((a, b) => Math.abs(a - actor.x) - Math.abs(b - actor.x));
  const x = spots.find(x => others.every(o => Math.abs(o.x - x) >= 55)) ?? spots.find(x => others.every(o => Math.abs(o.x - x) >= 55 || Math.abs(o.y - y) >= 60));
  return x === undefined ? undefined : { x, y };
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
