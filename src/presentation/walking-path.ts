import type { Point, World } from '../domain/types';
import { roomWidth, validPoint } from '../domain/geometry';
import { pieceBounds } from '../domain/layout';
const flat = ['rug', 'picture', 'neon', 'mirror', 'cushion'];
export function walkingPath(world: World, start: Point, end: Point): Point[] | null {
  const width = roomWidth(world), blocks = world.layout.pieces.filter(p => p.room === world.room && !flat.includes(p.kind)).map(p => {
    const box = pieceBounds[p.kind];
    return { left: p.x - 18, right: p.x + box.width + 18, top: p.y + box.height - 75, bottom: p.y + box.height + 18 };
  });
  const contains = (b: typeof blocks[number], p: Point) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
  if (!validPoint(end, width) || blocks.some(b => contains(b, end))) return null;
  const free = (p: Point) => validPoint(p, width) && !blocks.some(b => contains(b, p));
  const initial = blocks.filter(b => contains(b, start));
  if (initial.length) {
    const exits = initial.flatMap(b => [{ x: b.left - 1, y: start.y }, { x: b.right + 1, y: start.y }, { x: start.x, y: b.top - 1 }, { x: start.x, y: b.bottom + 1 }]).filter(free);
    exits.sort((a, b) => Math.hypot(a.x - start.x, a.y - start.y) - Math.hypot(b.x - start.x, b.y - start.y));
    const exit = exits[0]; if (!exit) return null;
    const rest = walkingPath(world, exit, end); return rest ? [exit, ...rest] : null;
  }
  const nodes: Point[] = [start, end];
  for (let y = 280; y <= 540; y += 20) for (let x = 60; x <= width - 60; x += 20) if (free({ x, y })) nodes.push({ x, y });
  return search(nodes, free);
}
function segment(a: Point, b: Point, free: (p: Point) => boolean) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 5);
  for (let i = 1; i <= steps; i++) if (!free({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps })) return false;
  return true;
}
function search(nodes: Point[], free: (p: Point) => boolean): Point[] | null {
  const queue = [0], parents = new Map<number, number>([[0, -1]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor]!, point = nodes[current]!;
    if (segment(point, nodes[1]!, free)) { parents.set(1, current); return trace(nodes, parents); }
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
