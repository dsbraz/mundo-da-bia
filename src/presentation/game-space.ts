import type { GameKind } from '../domain/child-games';
import { roomWidth } from '../domain/geometry';
import { footprint, overlap } from '../domain/placement';
import type { Actor, Point, World } from '../domain/types';
import { walkingPath } from './walking-path';

const rows = [[1], [2], [3, 4], [5], [6, 7], [8]];
export const hopTiles = rows.flatMap((cells, row) => cells.map((cell, index) => ({ cell, x: row * 42 + (cells.length === 2 ? index * 52 - 26 : 0), y: -12 - row * 20 })));
export function gameSpace(world: World, actor: Actor, kind: GameKind): Point | null {
  const candidates: Point[] = [];
  for (let x = 130; x <= roomWidth(world) - 130; x += 40) candidates.push({ x, y: 530 });
  if (kind === 'rope') candidates.unshift({ x: actor.x, y: actor.y });
  candidates.sort((a, b) => Math.hypot(a.x - actor.x, a.y - actor.y) - Math.hypot(b.x - actor.x, b.y - actor.y));
  return candidates.find(p => clearSpace(world, actor, p, kind) && walkingPath(world, actor, p)) ?? null;
}
function clearSpace(world: World, actor: Actor, p: Point, kind: GameKind) {
  const area = { left: p.x - 70, right: p.x + (kind === 'rope' ? 70 : 270), top: p.y - (kind === 'rope' ? 40 : 130), bottom: p.y + 10 };
  if (area.left < 60 || area.right > roomWidth(world) - 60 || area.top < 280 || area.bottom > 540) return false;
  if (world.streetWidth) return false;
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
