import type Phaser from 'phaser';
import { pieceBounds } from '../domain/layout';
import { occupant, seatPiece, seatPoint } from '../domain/seats';
import type { Actor, ActorId, Piece, Point, World } from '../domain/types';
import { visualPiecePoint } from './furniture-scale';
import { seatAt } from './furniture-targets';
import { glassOf } from './mirror-reflection';
import { pieceDepth } from './piece-art';

type Rect = { x: number; y: number; width: number; height: number };
/** What a drop would reach (W3L-09), lit while dragging: a seat (and who already sits there), the mirror, or a person. The door has
 *  its own light (`doorGlow`). */
export type DropTarget =
  | { kind: 'seat'; seat: string; by?: ActorId; box: Rect; at: Point; depth: number }
  | { kind: 'mirror'; piece: number; box: Rect; depth: number }
  | { kind: 'person'; actor: ActorId; box: Rect; depth: number };
/** The piece as drawn (its furniture scale applied). */
export function drawnBox(piece: Piece): Rect {
  const box = pieceBounds[piece.kind], a = visualPiecePoint(piece, { x: piece.x, y: piece.y }), b = visualPiecePoint(piece, { x: piece.x + box.width, y: piece.y + box.height });
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}
/** Under the feet of `mover`, dragged to `feet`: the seat a drop sits on, else the mirror she would stand in front of. */
export function actorDropTarget(world: World, mover: ActorId, feet: Point): DropTarget | null {
  const seat = seatAt(world, feet);
  if (seat) {
    const piece = seatPiece(world, seat)!, by = occupant(world, { id: mover }, seat), at = visualPiecePoint(piece, seatPoint(world, seat)!);
    return { kind: 'seat', seat, ...(by ? { by } : {}), box: drawnBox(piece), at, depth: pieceDepth(piece) + .5 };
  }
  const mirror = world.layout.pieces.find(p => p.kind === 'mirror' && p.room === world.room && Math.abs(p.x + 50 - feet.x) <= 70);
  return mirror ? { kind: 'mirror', piece: mirror.id, box: glassOf(mirror), depth: pieceDepth(mirror) + .7 } : null;
}
/** A dragged object over a person: that person. */
export function personTarget(actor: Actor | undefined): DropTarget | null {
  return actor ? { kind: 'person', actor: actor.id, box: { x: actor.x - 42, y: actor.y - 12, width: 84, height: 24 }, depth: actor.y - 1 } : null;
}
/** The target's name for automation: `seat:<ref>[:<occupant>]`, `mirror:<id>` or `person:<id>`. */
export function targetName(target: DropTarget | null): string {
  if (!target) return '';
  if (target.kind === 'seat') return `seat:${target.seat}${target.by ? `:${target.by}` : ''}`;
  return target.kind === 'mirror' ? `mirror:${target.piece}` : `person:${target.actor}`;
}
const warm = 0xe8a23a, light = 0xffe08a;
/** The warm outline of `target` (a person gets a warm ring at the feet); a taken seat shows the face of who sits there. */
export function drawDropTarget(scene: Phaser.Scene, target: DropTarget): Phaser.GameObjects.Container {
  const { x, y, width, height } = target.box, glow = scene.add.graphics();
  if (target.kind === 'person') glow.fillStyle(light, .35).fillEllipse(x + width / 2, y + height / 2, width + 12, height + 8).lineStyle(5, warm, .95).strokeEllipse(x + width / 2, y + height / 2, width + 12, height + 8);
  else glow.fillStyle(light, .22).fillRoundedRect(x - 6, y - 6, width + 12, height + 12, 14).lineStyle(5, warm, .95).strokeRoundedRect(x - 6, y - 6, width + 12, height + 12, 14);
  const lit = scene.add.container(0, 0, [glow]).setDepth(target.depth);
  if (target.kind === 'seat' && target.by) {
    const { x: cx, y: cy } = { x: target.at.x + 62, y: target.at.y - 170 };
    const ring = scene.add.graphics().fillStyle(0xfffdf7).fillCircle(cx, cy, 30).lineStyle(4, warm).strokeCircle(cx, cy, 30);
    const badge = scene.add.container(0, 0, [ring, scene.add.image(cx, cy, `face-${target.by}`).setDisplaySize(50, 50)]).setDepth(1095);
    lit.once('destroy', () => badge.destroy());
  }
  return lit;
}
/** The scene's one lit target: redrawn only when it changes; under automation the canvas tells it (`data-drop-target`). */
export function dropLights(scene: Phaser.Scene) {
  let lit: Phaser.GameObjects.Container | null = null, name = '';
  function show(target: DropTarget | null) {
    const next = targetName(target);
    if (next === name && lit?.active) return;
    lit?.destroy(); lit = target ? drawDropTarget(scene, target) : null; name = next;
    if (navigator.webdriver) scene.game.canvas.dataset.dropTarget = name;
  }
  /** After a repaint (which removed everything) nothing is lit. */
  function reset() { lit = null; name = ''; }
  return { show, reset };
}
