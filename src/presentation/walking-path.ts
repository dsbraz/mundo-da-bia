import type { Point, World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { footprint } from '../domain/placement';
import { floorTop, walkable } from './floor-band';
export function walkingPath(world: World, start: Point, end: Point): Point[] | null {
  const blocks = furnitureBlocks(world);
  const free = (p: Point) => walkable(world, p) && !blocks.some(b => contains(b, p));
  if (!free(end)) return null;
  const exit = exitFrom(world, start, blocks, free);
  if (!exit) return null;
  if (exit !== start) { const rest = walkingPath(world, exit, end); return rest ? [exit, ...rest] : null; }
  const nodes: Point[] = [start, end], width = roomWidth(world);
  for (let y = floorTop(world); y <= 540; y += 20) for (let x = 60; x <= width - 60; x += 20) if (free({ x, y })) nodes.push({ x, y });
  return search(nodes, free);
}
/** The first step out of a spot nobody should stand on: the wall (old saves) goes straight down to the floor, a piece's footprint to its nearest free side. */
function exitFrom(world: World, start: Point, blocks: Block[], free: (p: Point) => boolean): Point | null {
  if (start.y < floorTop(world)) return { x: start.x, y: floorTop(world) };
  const initial = blocks.filter(b => contains(b, start));
  if (!initial.length) return start;
  const exits = initial.flatMap(b => [{ x: b.left - 1, y: start.y }, { x: b.right + 1, y: start.y }, { x: start.x, y: b.top - 1 }, { x: start.x, y: b.bottom + 1 }]).filter(free);
  exits.sort((a, b) => Math.hypot(a.x - start.x, a.y - start.y) - Math.hypot(b.x - start.x, b.y - start.y));
  return exits[0] ?? null;
}
type Block = { left: number; right: number; top: number; bottom: number };
function furnitureBlocks(world: World): Block[] {
  return world.layout.pieces.filter(p => p.room === world.room).flatMap(p => {
    const area = footprint(p);
    return area ? [{ left: area.left - 26, right: area.right + 26, top: area.top - 15, bottom: area.bottom + 26 }] : [];
  });
}
const contains = (b: Block, p: Point) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
function segment(a: Point, b: Point, free: (p: Point) => boolean) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 5);
  for (let i = 1; i <= steps; i++) if (!free({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps })) return false;
  return true;
}
function search(nodes: Point[], free: (p: Point) => boolean): Point[] | null {
  const queue = [0], parents = new Map<number, number>([[0, -1]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor]!, point = nodes[current]!;
    if (segment(point, nodes[1]!, free)) { parents.set(1, current); return simplify(trace(nodes, parents), nodes[0]!, free); }
    nodes.forEach((next, index) => {
      if (parents.has(index) || Math.hypot(next.x - point.x, next.y - point.y) > 30) return;
      if (segment(point, next, free)) { parents.set(index, current); queue.push(index); }
    });
  }
  return null;
}
function trace(nodes: Point[], parents: Map<number, number>) {
  const path: Point[] = []; let index = 1;
  while (index > 0) { path.unshift(nodes[index]!); index = parents.get(index)!; }
  return path;
}

function simplify(path: Point[], start: Point, free: (p: Point) => boolean) {
  const result: Point[] = []; let previous = start;
  while (path.length) {
    let next = path.length - 1;
    while (next > 0 && !segment(previous, path[next]!, free)) next--;
    previous = path[next]!; result.push(previous); path.splice(0, next + 1);
  }
  return result;
}
