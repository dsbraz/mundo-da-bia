import type Phaser from 'phaser';
import type { Actor, ActorId, Piece, Point, World } from '../domain/types';
import { drawActor, animateActor } from './art';
import { visualPiecePoint } from './furniture-scale';
import { pieceDepth } from './piece-art';
import { visualContext } from './pose';
import type { Expression } from './expression';

type Container = Phaser.GameObjects.Container;
export interface Glass { x: number; y: number; width: number; height: number; radius: number }
/** The mirror's glass (the rounded rect at 19,13 62×103 of the 100×150 drawing), in scene units as drawn. */
export function glassOf(piece: Piece): Glass {
  const a = visualPiecePoint(piece, { x: piece.x + 19, y: piece.y + 13 }), b = visualPiecePoint(piece, { x: piece.x + 81, y: piece.y + 116 });
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y, radius: 22 };
}
/** Who looks into `mirror`: the person standing nearest in front of it (within 110 px of its middle), if any. */
export function frontOf(mirror: Piece, people: readonly { id: ActorId; x: number }[]): ActorId | undefined {
  const middle = mirror.x + 50, near = people.filter(p => Math.abs(p.x - middle) <= 110);
  return near.sort((a, b) => Math.abs(a.x - middle) - Math.abs(b.x - middle))[0]?.id;
}
/** Where the reflection is drawn: head and chest in the glass (the legs fall below it, cut by the frame), a little to the side she
 *  stands on, at three quarters of her size and turned left for right. */
export function reflectionPlace(glass: Glass, x: number): Point & { scaleX: number; scale: number } {
  const middle = glass.x + glass.width / 2, side = Math.max(-glass.width / 4, Math.min(glass.width / 4, (x - middle) * .3));
  return { x: middle + side, y: glass.y + glass.height + 62, scaleX: -.75, scale: .75 };
}
/** The pose a reflection copies: the one its person had 100 ms before (W3L-08). */
export const echoMs = 100;
interface Snapshot { t: number; x: number; rotation: number; poseX: number; poseY: number; expression: Expression }
export function echoOf(history: readonly Snapshot[], now: number): Snapshot | undefined {
  return [...history].reverse().find(s => s.t <= now - echoMs) ?? history[0];
}
interface Reflection { mirror: Piece; glass: Glass; id: ActorId | null; holder: Container | null; mask: Phaser.GameObjects.Graphics; history: Snapshot[] }
/** The reflections of the room's mirrors: drawn on paint for whoever stands in front, then each frame they copy that person's pose
 *  with a 100 ms echo (still with reduced motion). Under automation the canvas tells who is reflected, in which look and the cost. */
export function mirrorReflections(scene: Phaser.Scene) {
  let world: World | null = null, reflections: Reflection[] = [], costs: number[] = [];
  function build(r: Reflection, actor: Actor | undefined, x: number) {
    r.holder?.destroy(); r.holder = null; r.id = actor?.id ?? null; r.history = [];
    if (!actor || !world) return;
    const figure = drawActor(scene, { ...actor, seat: null, resting: false }, false, visualContext(world));
    (figure.list[0] as Phaser.GameObjects.Graphics | undefined)?.setVisible(false);
    const place = reflectionPlace(r.glass, x);
    r.holder = scene.add.container(place.x, place.y, [figure.setPosition(0, 0)]).setScale(place.scaleX, place.scale).setAlpha(.9).setDepth(pieceDepth(r.mirror) + .5);
    r.holder.setMask(r.mask.createGeometryMask());
    const shine = scene.add.graphics().setDepth(pieceDepth(r.mirror) + .6).lineStyle(5, 0xfffaf0, .45);
    const line = (from: Point, to: Point) => { const a = visualPiecePoint(r.mirror, { x: r.mirror.x + from.x, y: r.mirror.y + from.y }), b = visualPiecePoint(r.mirror, { x: r.mirror.x + to.x, y: r.mirror.y + to.y }); shine.lineBetween(a.x, a.y, b.x, b.y); };
    line({ x: 28, y: 91 }, { x: 70, y: 44 }); line({ x: 35, y: 53 }, { x: 62, y: 24 });
    r.holder.setData('shine', shine).once('destroy', () => shine.destroy());
    if (navigator.webdriver) scene.game.canvas.dataset.reflection = `${actor.id}:${actor.look}:${Math.sign(r.holder.scaleX)}`;
  }
  function paint(state: World, figures: readonly Container[]) {
    world = state; reflections.forEach(r => r.mask.destroy()); costs = [];
    if (navigator.webdriver) scene.game.canvas.dataset.reflection = '';
    reflections = state.layout.pieces.filter(p => p.kind === 'mirror' && p.room === state.room && !state.streetWidth).map(mirror => {
      const glass = glassOf(mirror), mask = scene.make.graphics({}, false).fillStyle(0xffffff).fillRoundedRect(glass.x, glass.y, glass.width, glass.height, glass.radius);
      return { mirror, glass, id: null, holder: null, mask, history: [] };
    });
    reflections.forEach(r => follow(r, figures));
  }
  /** Rebuilds `r` when someone else stands in front of it; returns that person's figure. */
  function follow(r: Reflection, figures: readonly Container[]) {
    const people = figures.filter(f => world!.actors.find(a => a.id === f.name)?.kind === 'human').map(f => ({ id: f.name as ActorId, x: f.x }));
    const id = frontOf(r.mirror, people) ?? null, figure = figures.find(f => f.name === id);
    if (id !== r.id) build(r, world!.actors.find(a => a.id === id), figure?.x ?? 0);
    return figure;
  }
  /** One frame: each reflection copies, 100 ms late, the pose and face of whoever stands in front. */
  function frame(time: number, figures: readonly Container[], expressions: ReadonlyMap<string, Expression>, reduced: boolean) {
    if (!world || !reflections.length) return;
    const start = performance.now();
    reflections.forEach(r => echo(r, follow(r, figures), time, expressions, reduced));
    costs = [...costs.slice(-59), performance.now() - start];
    if (navigator.webdriver) scene.game.canvas.dataset.mirrorCost = (costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(3);
  }
  function echo(r: Reflection, figure: Container | undefined, time: number, expressions: ReadonlyMap<string, Expression>, reduced: boolean) {
    const actor = world!.actors.find(a => a.id === r.id), inner = r.holder?.list[0] as Container | undefined;
    if (!figure || !actor || !inner || reduced) return;
    const pose = figure.getByName<Container>('pose');
    r.history = [...r.history.filter(s => s.t > time - 400), { t: time, x: figure.x, rotation: pose.rotation, poseX: pose.x, poseY: pose.y, expression: expressions.get(actor.id) ?? 'neutral' }];
    const then = echoOf(r.history, time)!, place = reflectionPlace(r.glass, then.x);
    animateActor(inner, { ...actor, seat: null, resting: false }, time - echoMs, 0, false, false, { expression: then.expression, blink: false });
    const copy = inner.getByName<Container>('pose');
    copy.setPosition(then.poseX, then.poseY).setRotation(then.rotation);
    r.holder!.setX(place.x);
  }
  return { paint, frame };
}
