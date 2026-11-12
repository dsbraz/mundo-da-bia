import { textStyle } from './text-style';
import { visibleHit } from './visible-hit';
import { childGameArt } from './child-game-art';
import type { GamePreview } from './child-game-art';
import { sceneOutdoor } from './scene-outdoor';
import { sceneLife } from './scene-life';
import { contextScale, visualContext } from './pose';
import { rasterScale, logicalWidth } from './rendering';
import { captureMotion } from './settle-motion';
import { itemTexture } from './art-sheet';
import type { Neighborhood } from '../domain/neighborhood-types';
import Phaser from 'phaser';
import type { RoomId, ItemId, ItemKind } from '../domain/types';
import { actorIds, itemIds } from '../domain/types';
import type { Actor, ActorId, Piece, Point, PresentationEvent, World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { drawLighting } from './furniture-art';
import { loadArt } from './svg-assets';
import { chooseFigure, drawFigures, moveFigure, pokeActor, ringTarget, shrugActor } from './scene-figures';
import { animateFigure, type FrameContext } from './figure-frame';
import { faceEvents, faces, pokeFace } from './expression';
import { drawPieces, drawObjects, pickPiece, pieceDepth } from './piece-art';
import { actorAt, previewPoint } from './targets';
import { hoverHint, shownWorld } from './scene-view';
import { snapGhost } from './scene-ghost';
import { weightFigures } from './weight-figures';
import { objectFall } from './weight';
import { ballRolls } from './ball-figures';
import { ballSize } from './ball-motion';
import { placeSlide, placeTransfer, slidePreview, transferPreview } from './transfer-preview';
import type { DragPreview, VisibleWorld } from './targets';
import { react } from './reactions';
import { animatePieces, blinkPiece } from './use-effects';
import type { ReactionPose } from '../content/personalities';
import { reducedMotion } from './motion';
import { cookedEffect, hopDishes } from './kitchen-art';
import { hex } from './palette';
import { screenScale } from './viewport';
import { doorGlow } from './door-effect';
export class PlayScene extends Phaser.Scene {
  private gameArt: ReturnType<typeof childGameArt> | null = null;
  previewGame(value: GamePreview | null) { this.gameArt?.paint(value); }
  private world: World;
  private town: Neighborhood | null = null;
  private cameraX = 0;
  frame(width: number, height: number, x: number, y: number) {
    if (!this.ready) return;
    const w = Math.round(width * rasterScale), h = Math.round(height * rasterScale);
    if (this.scale.width !== w || this.scale.height !== h) this.scale.setGameSize(w, h);
    this.cameras.main.setScroll(x + (this.world.streetWidth ? this.cameraX : 0), y);
  }
  neighborhood(town: Neighborhood) { this.town = town; }
  camera(x: number) { this.cameraX = x; if (this.ready) { this.cameras.main.scrollX = x + Number(this.game.canvas.dataset.viewX ?? 0); this.game.canvas.dataset.cameraX = String(x); } }
  private selected: ActorId = 'bia';
  private figures: Phaser.GameObjects.Container[] = [];
  private gaze = new Map<ActorId, number>();
  private faces = faces();
  readonly ambient = sceneLife(() => this.game.canvas);
  private weight = weightFigures();
  /** Street, plaza and doors: `arrive`, `reaction` to the plaza, `push` the swing and `enterDoor`. */
  readonly outdoor = sceneOutdoor({ scene: this, ready: () => this.ready, town: () => this.town, world: () => this.world, selected: () => this.selected,
    figures: () => this.figures, faces: () => this.faces, ambient: () => this.ambient, mark: (key, value) => this.mark(key, value) });
  /** Rolling balls; `ballRest` (set by the app) places a ball where it stops, without interrupting anyone. */
  readonly balls = ballRolls(() => this.game.canvas, (id, point) => this.ballRest(id, point)); ballRest: (id: ItemId, point: Point) => void = () => {};
  throwBall(id: ItemId, from: Point, velocity: Point) { this.balls.throw(id, from, velocity, this.world, performance.now(), reducedMotion()); }
  private pieces = new Map<number, Phaser.GameObjects.Container>();
  private sliding: { room: RoomId; current: Phaser.GameObjects.Container; next: Phaser.GameObjects.Container } | null = null;
  private transferRoom: RoomId | null = null;
  private moving: ActorId | null = null;
  private ready = false;
  private wardrobe = false;
  private building = false;
  private piece: number | null = null;
  private ghost: Phaser.GameObjects.Image | null = null;
  private hint: Phaser.GameObjects.Graphics | null = null;
  private objects: Phaser.GameObjects.Image[] = [];
  private doorLight: Phaser.GameObjects.Graphics | null = null;
  /** The doorway a dragged character would go through lights up (null: none). */
  glowDoor(box: { x: number; y: number; width: number; height: number } | null) {
    this.doorLight?.destroy(); this.doorLight = box && this.ready ? doorGlow(this, box) : null;
  }
  constructor(state: World) { super('play'); this.world = state; }
  preload() { this.load.text('art-dishes', '/art/dishes.svg'); this.load.text('art-plants', '/art/plants.svg'); loadArt(this, this.world, this.town); [...itemIds, 'bola'].forEach(id => this.load.svg(id, `/icons/${id}.svg`, { width: 80, height: 80 })); actorIds.forEach(id => this.load.svg(`face-${id}`, `/icons/${id}.svg`, { width: 112, height: 112 })); }
  create() {
    this.cameras.main.setOrigin(0).setZoom(rasterScale); this.ready = true;
    const view = this.game.canvas.dataset;
    this.frame(Number(view.viewWidth ?? 1000), Number(view.viewHeight ?? 600), Number(view.viewX ?? 0), Number(view.viewY ?? 0));
    this.gameArt = childGameArt(this); this.paint(this.world, this.selected);
    this.ambient.listen();
  }
  paint(state: World, selected: ActorId) {
    this.ambient.painted(this.world, state);
    this.world = state; this.selected = selected;
    if (!this.prepareArt(state)) return;
    const width = state.streetWidth ? 1000 : roomWidth(state);
    this.game.canvas.dataset.logicalWidth = String(width);
    this.cameras.main.scrollX = Number(this.game.canvas.dataset.viewX ?? 0) + (state.streetWidth ? this.cameraX : 0);
    this.game.canvas.dataset.street = String(!!state.streetWidth); this.game.canvas.dataset.cameraX = String(state.streetWidth ? this.cameraX : 0);
    this.sliding = null; this.transferRoom = null;
    this.children.removeAll(true); this.doorLight = null; this.ghost = null; this.hint = null; this.objects = []; this.moving = null; this.game.canvas.dataset.walking = '';
    this.outdoor.paint(state, selected);
    this.pieces = drawPieces(this, state, this.wardrobe && !this.building, this.piece);
    this.figures = [];
    if (!this.building) this.paintPlay(state, selected);
    this.game.canvas.dataset.ready = 'true'; this.playCooking();
  }
  private cooking: { piece: Piece; item: ItemId | null } | null = null;
  /** The bench answered: the cooked `item` pops in by `piece` with steam, or (no item) the room's dishes hop: the table is full. Waits for the dish's art. */
  cooked(piece: Piece, item: ItemId | null) { this.cooking = { piece, item }; if (this.ready && !this.load.isLoading()) this.playCooking(); }
  private playCooking() {
    const cooking = this.cooking; if (!cooking) return; this.cooking = null;
    if (cooking.item) cookedEffect(this, cooking.piece, this.objects.find(o => o.name === cooking.item)); else hopDishes(this, this.objects.filter(o => o.texture.key.startsWith('dish-')));
  }
  private prepareArt(state: World) {
    if (!this.ready || this.load.isLoading()) return false;
    loadArt(this, state, this.town);
    if (!this.load.list.size) return true;
    this.game.canvas.dataset.ready = 'false';
    this.load.once('complete', () => this.paint(this.world, this.selected)); this.load.start(); return false;
  }
  private paintPlay(state: World, selected: ActorId) {
    this.figures = drawFigures(this, state, selected);
    this.objects = drawObjects(this, state);
    drawLighting(this, state);
    if (state.show) this.add.text(roomWidth(state) - 145, 100, '♪ Ao vivo', textStyle('live')).setOrigin(.5).setDepth(700);
  }
  pan(room: RoomId | null, fraction: number) {
    if (!this.ready) return;
    if (!room) { if (this.sliding) this.paint(this.world, this.selected); return; }
    if (this.sliding?.room !== room) { this.paint(this.world, this.selected); this.sliding = slidePreview(this, this.world, room, this.selected, this.building); }
    placeSlide(this.sliding, fraction, logicalWidth(this));
  }
  previewTransfer(room: RoomId | null, actor: ActorId | null, item: ItemId | null, point: Point | null) {
    if (!this.ready) return;
    if (!room || !point) { if (this.transferRoom) this.paint(this.world, this.selected); return; }
    if (this.transferRoom !== room) {
      this.children.removeAll(true); this.pieces.clear(); this.transferRoom = room;
      ({ figures: this.figures, objects: this.objects, ghost: this.ghost } = transferPreview(this, this.world, room, this.selected, this.building, actor, item));
    }
    placeTransfer({ figures: this.figures, objects: this.objects, ghost: this.ghost }, point.x * logicalWidth(this) / roomWidth(this.world, room), point.y);
  }
  previewLayout(state: World) {
    state.layout.pieces.forEach(piece => this.pieces.get(piece.id)?.setPosition(piece.x, piece.y).setDepth(pieceDepth(piece)));
  }
  placementHint(id: number | null, invalid: boolean) {
    this.hint?.clear(); this.game.canvas.dataset.invalidPiece = invalid && id !== null ? String(id) : '';
    const target = id !== null && invalid ? this.pieces.get(id) : undefined; if (!target) return;
    if (!this.hint) this.hint = this.add.graphics().setDepth(999);
    const b = target.getBounds(); this.hint.lineStyle(3, hex('coral'), .9).strokeRoundedRect(b.x - 4, b.y - 4, b.width + 8, b.height + 8, 14);
  }
  slidePiece(id: number, from: Point) { const piece = this.pieces.get(id), home = this.world.layout.pieces.find(p => p.id === id); if (piece && home && !reducedMotion()) this.tweens.add({ targets: piece, x: { from: from.x, to: home.x }, y: { from: from.y, to: home.y }, duration: 240, ease: 'Back.Out' }); }
  blinkPiece(kind: Piece['kind']) {
    const piece = this.world.layout.pieces.find(p => p.kind === kind && p.room === this.world.room), target = piece && this.pieces.get(piece.id); if (!target) return;
    this.game.canvas.dataset.blink = kind; blinkPiece(this, target);
  }
  /** `carried`: the finger drags the figure (it hangs, never walks); without `id` whoever moved is let go. */
  previewActor(id: ActorId | null, point: Point | null, carried = false) {
    this.moving = moveFigure({ scene: this, world: this.world, figures: this.figures, objects: this.objects, gaze: this.gaze, weight: this.weight, moving: this.moving }, id, point, carried);
  }
  /** Whoever moves for a game walks there (fades with reduced motion); call it before committing the moves. */
  stroll(moves: { actor: ActorId; point: Point }[]) { this.ambient.strolls.start(this.figures, moves); }
  private walking(figure: Phaser.GameObjects.Container, actor: Actor) { return this.ambient.walking(figure, actor, this.world, () => this.moving === actor.id && !this.weight.carrying(actor.id)); }
  captureMotion() {
    const settle = captureMotion(this, this.figures, [...this.objects, ...(this.ghost ? [this.ghost] : [])], this.world.room), name = this.ghost?.name;
    return () => settle(this.figures, this.objects, this.world.room, this.world.items.some(i => i.id === name && !i.holder) ? { name: name!, fall: objectFall(contextScale(visualContext(this.world))) } : null);
  }
  visibleWorld(): VisibleWorld {
    return { ...shownWorld({ world: this.world, figures: this.figures, objects: this.objects, moving: this.moving, pickPiece: p => this.pickPiece(p),
      actorHit: (actor, point) => { const pose = this.figures.find(f => f.name === actor.id)?.getByName<Phaser.GameObjects.Container>('pose'); return !!pose && visibleHit(this, pose, point); } }), grabSlack: 28 / screenScale(this.game.canvas), grabFirst: this.selected };
  }
  hover(point: Point | null) {
    this.hint?.clear();
    if (!point || this.building) return;
    if (!this.hint) this.hint = this.add.graphics().setDepth(999);
    const piece = this.pickPiece(point);
    hoverHint(this.hint, this.visibleWorld(), this.objects, piece && this.pieces.get(piece.id), point, actor => this.highlight(actor));
  }
  face(id: ActorId, point: Point) { const actor = this.world.actors.find(a => a.id === id); if (actor) { this.gaze.set(id, Math.sign(point.x - actor.x)); this.faces.trigger(id, 'curious', performance.now()); } }
  /** `id` shrugs; returns the point above its head (scene units) when it is drawn here. */
  shrug(id: ActorId): Point | null { return this.ready ? shrugActor({ scene: this, world: this.world, figures: this.figures }, this.faces, id) : null; }
  poke(id: ActorId, pose: ReactionPose, line: string) { if (this.ready) pokeActor({ scene: this, world: this.world, figures: this.figures }, this.faces, id, pose, line); else this.faces.trigger(id, pokeFace(pose), performance.now(), 900); }
  /** Someone new is chosen mid-touch: only the ring moves; the next `paint` draws the rest. */
  choose(id: ActorId) { this.selected = id; if (this.ready) chooseFigure(this, this.figures, this.world, id); }
  pickPiece(point: Point) { return pickPiece(this, this.world, point); }
  buildMode(enabled: boolean, selected: number | null) { this.building = enabled; this.piece = selected; }
  openWardrobe(open: boolean) { this.wardrobe = open; this.paint(this.world, this.selected); }
  react(events: PresentationEvent[], said: readonly (string | null)[]) { faceEvents(this.faces, events, this.world, this.selected, performance.now()); if (this.ready) react(this, this.world, events, said, this.selected, id => this.poke(id, 'cheer', '')); }
  preview(drag: DragPreview | null) {
    if (!this.ready) return;
    this.objects.forEach(o => o.setAlpha(drag?.kind === 'item' && o.name === drag.id ? .25 : 1));
    if (!drag) { this.clearPreview(); return; }
    const key = drag.kind === 'look' ? `look-${drag.id}` : itemTexture(this.world.items.find(i => i.id === drag.id)!);
    if (!this.ghost) this.ghost = this.add.image(drag.point.x, drag.point.y, key).setDepth(1000);
    const target = actorAt(this.visibleWorld(), drag.point);
    const point = previewPoint(this.visibleWorld(), drag);
    snapGhost(this, this.ghost, point, drag.kind === 'item' ? target?.id ?? null : null);
    this.ghost.setTexture(key).setName(drag.id).setDisplaySize(drag.kind === 'look' ? 64 : ballSize(key as ItemKind, visualContext(this.world)), drag.kind === 'look' ? 56 : ballSize(key as ItemKind, visualContext(this.world)));
    this.highlight(target);
  }
  private highlight(target: Actor | undefined) {
    if (!this.hint) this.hint = this.add.graphics().setDepth(999);
    ringTarget(this.hint, target);
  }
  private clearPreview() { this.ghost?.destroy(); this.hint?.destroy(); this.ghost = null; this.hint = null; }
  private get frameContext(): FrameContext {
    return { world: this.world, town: this.town, moving: this.moving, gaze: this.gaze, objects: this.objects, faces: this.faces, now: performance.now(), life: this.ambient.life, gaits: [],
      swing: { angle: this.outdoor.swing.angle(), legs: this.outdoor.swing.legs() }, walking: (f, a) => this.walking(f, a), weight: this.weight };
  }
  /** Whoever walks on a command (not carried, not strolling) may kick the ball. */
  private kicker() { const f = this.moving && !this.weight.carrying(this.moving) ? this.figures.find(f => f.name === this.moving) : undefined; return f ? { x: f.x, y: f.y, direction: f.getData('direction') ?? 0 } : null; }
  private mark(key: string, value: string) { if (this.game.canvas.dataset[key] !== value) this.game.canvas.dataset[key] = value; }
  update(time: number) {
    const reduced = reducedMotion(); this.outdoor.swing.step(performance.now(), reduced);
    const ctx = this.frameContext, shown: string[] = [];
    this.ambient.life.tick(this.world, this.selected, ctx.now, !reduced && !this.building && !this.wardrobe && !this.moving && !this.gameArt?.active() && !this.game.canvas.dataset.strolling);
    this.figures.forEach((figure, index) => {
      const actor = this.world.actors.find(a => a.id === figure.name)!;
      shown.push(`${actor.id}:${animateFigure(ctx, figure, actor, time, index, reduced)}`);
      this.gameArt?.animate(figure, performance.now(), reduced);
    });
    this.balls.step(this.world, this.objects, this.kicker(), ctx.now);
    this.ambient.life.flush(); this.mark('gait', ctx.gaits.join(' '));
    this.mark('faces', shown.join(' '));
    this.outdoor.frame(time, reduced);
    this.mark('uses', animatePieces(this.pieces, time, reduced));
  }
}
