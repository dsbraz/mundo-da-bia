import type Phaser from 'phaser';
import type { Actor, ActorId, ItemId, Piece, Point, World } from '../domain/types';
import { pieceDepth } from './piece-art';
import { actorAt, sourceAt } from './targets';
import type { VisibleWorld } from './targets';
type Container = Phaser.GameObjects.Container;
/** What the scene shows of the world: figures where they are drawn now, objects with their drawn depth and position. */
export interface Shown {
  world: World; figures: Container[]; objects: Phaser.GameObjects.Image[]; moving: ActorId | null;
  pickPiece: (point: Point) => Piece | undefined; actorHit: (actor: Actor, point: Point) => boolean;
}
export function shownWorld(shown: Shown): VisibleWorld {
  const { world, figures, objects } = shown;
  return { ...world, occludingDepth: p => { const piece = shown.pickPiece(p); return piece ? pieceDepth(piece) : 0; },
    itemDepth: new Map(objects.map(o => [o.name as ItemId, o.depth])), actorHit: shown.actorHit,
    visibleDepth: new Map(figures.map(f => [f.name, f.depth])), visibleItems: new Map(objects.map(o => [o.name as ItemId, { x: o.x, y: o.y }])),
    actors: world.actors.map(actor => {
      const figure = figures.find(f => f.name === actor.id);
      return figure ? { ...actor, x: figure.x, y: figure.y, seat: shown.moving === actor.id ? null : actor.seat } : actor;
    }) };
}
/** Outlines what a finger over `point` would take: an object, a character (via `highlight`) or a piece of furniture. */
export function hoverHint(hint: Phaser.GameObjects.Graphics, world: VisibleWorld, objects: Phaser.GameObjects.Image[], piece: Container | undefined, point: Point, highlight: (actor: Actor) => void) {
  const token = sourceAt(world, point, false);
  const object = token && objects.find(o => o.name === token.id);
  if (object) { hint.lineStyle(2, 0x477e86, .8).strokeRoundedRect(object.x - 23, object.y - 23, 46, 46, 8); return; }
  const actor = actorAt(world, point);
  if (actor) { highlight(actor); return; }
  if (piece) { const bounds = piece.getBounds(); hint.lineStyle(2, 0x477e86, .55).strokeRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 8); }
}
