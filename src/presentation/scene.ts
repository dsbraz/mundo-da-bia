import { supportedActor } from './furniture-scale';
import { textStyle } from './text-style';
import { visibleHit } from './visible-hit';
import { childGameArt } from './child-game-art';
import type { GamePreview } from './child-game-art';
import { doorEffect } from './door-effect';
import type { Location } from '../domain/neighborhood-types';
import { outdoorEffect } from './outdoor-effects';
import type { OutdoorAction } from '../domain/neighborhood-types';
import { contextScale, visualContext } from './pose';
import { rasterScale, logicalWidth } from './rendering';
import { captureMotion } from './settle-motion';
import { strollFigures } from './stroll-figures';
import { itemKind } from '../domain/item-kind';
import { drawStreet, drawExit } from './street';
import type { Neighborhood } from '../domain/neighborhood-types';
import Phaser from 'phaser';
import { roomPreview } from './room-preview';
import { enterRoom } from '../domain/room-state';
import type { RoomId, ItemId } from '../domain/types';
import { actorIds, itemIds } from '../domain/types';
import type { Actor, ActorId, Piece, Point, PresentationEvent, World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { drawLighting } from './furniture-art';
import { loadArt } from './svg-assets';
import { drawActor } from './art';
import { animateFigure, type FrameContext } from './figure-frame';
import { faceEvents, faces, pokeFace } from './expression';
import { ambientLife } from './ambient';
import { drawRoom } from './room';
import { drawPieces, pickPiece, pieceDepth, actorDepth, objectDepth } from './piece-art';
import { actorAt, handPoint, previewPoint, itemPoint } from './targets';
import { hoverHint, shownWorld } from './scene-view';
import { trackGait } from './gait';
import { weightFigures } from './weight-figures';
import { objectFall } from './weight';
import { placeTransfer, transferPreview } from './transfer-preview';
import type { DragPreview, VisibleWorld } from './targets';
import { react } from './reactions';
import { pokeFigure, refuseAt } from './feedback';
import type { ReactionPose } from '../content/personalities';
import { reducedMotion, reducedFadeMs } from './motion';
import { hex } from './palette';
export class PlayScene extends Phaser.Scene {
  private gameArt: ReturnType<typeof childGameArt> | null = null;
  private sky: ReturnType<typeof drawStreet> | null = null;
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
  arrive(previous: Location) { this.faces.trigger(this.selected, 'surprise', performance.now()); if (this.ready && this.town) doorEffect(this, this.town, previous); }
  outdoorReaction(action: OutdoorAction) { if (this.ready && this.town) outdoorEffect(this, this.town, action); }
  camera(x: number) { this.cameraX = x; if (this.ready) { this.cameras.main.scrollX = x + Number(this.game.canvas.dataset.viewX ?? 0); this.game.canvas.dataset.cameraX = String(x); } }
  private selected: ActorId = 'bia';
  private figures: Phaser.GameObjects.Container[] = [];
  private gaze = new Map<ActorId, number>();
  private faces = faces();
  private life = ambientLife(() => this.game.canvas);
  private strolls = strollFigures(() => this.game.canvas);
  private weight = weightFigures();
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
  constructor(state: World) { super('play'); this.world = state; }
  preload() { loadArt(this, this.world, this.town); [...itemIds, 'bola'].forEach(id => this.load.svg(id, `/icons/${id}.svg`, { width: 80, height: 80 })); actorIds.forEach(id => this.load.svg(`face-${id}`, `/icons/${id}.svg`, { width: 112, height: 112 })); }
  create() {
    this.cameras.main.setOrigin(0).setZoom(rasterScale); this.ready = true;
    const view = this.game.canvas.dataset;
    this.frame(Number(view.viewWidth ?? 1000), Number(view.viewHeight ?? 600), Number(view.viewX ?? 0), Number(view.viewY ?? 0));
    this.gameArt = childGameArt(this); this.paint(this.world, this.selected);
    for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => this.life.input(performance.now()), { capture: true });
  }
  paint(state: World, selected: ActorId) {
    this.strolls.leave(this.world, state); this.life.painted(state, performance.now());
    this.world = state; this.selected = selected;
    if (!this.prepareArt(state)) return;
    const width = state.streetWidth ? 1000 : roomWidth(state);
    this.game.canvas.dataset.logicalWidth = String(width);
    this.cameras.main.scrollX = Number(this.game.canvas.dataset.viewX ?? 0) + (state.streetWidth ? this.cameraX : 0);
    this.game.canvas.dataset.street = String(!!state.streetWidth); this.game.canvas.dataset.cameraX = String(state.streetWidth ? this.cameraX : 0);
    this.sliding = null; this.transferRoom = null;
    this.children.removeAll(true); this.ghost = null; this.hint = null; this.objects = []; this.moving = null; this.game.canvas.dataset.walking = '';
    this.drawPlace(state, selected);
    this.pieces = drawPieces(this, state, this.wardrobe && !this.building, this.piece);
    this.figures = [];
    if (!this.building) this.paintPlay(state, selected);
    this.game.canvas.dataset.ready = 'true';
  }
  private drawPlace(state: World, selected: ActorId) {
    this.sky = state.streetWidth && this.town ? drawStreet(this, this.town, selected) : null;
    if (!this.sky) { drawRoom(this, state); this.exitDoor(); }
  }
  private prepareArt(state: World) {
    if (!this.ready || this.load.isLoading()) return false;
    loadArt(this, state, this.town);
    if (!this.load.list.size) return true;
    this.game.canvas.dataset.ready = 'false';
    this.load.once('complete', () => this.paint(this.world, this.selected)); this.load.start(); return false;
  }
  private exitDoor() {
    const location = this.town?.location;
    if (location?.kind === 'interior' && this.town!.buildings.find(b => b.id === location.building)?.entry === location.room) drawExit(this);
  }
  private paintPlay(state: World, selected: ActorId) {
    this.figures = state.actors.filter(a => a.room === state.room).map(a => {
      const depth = actorDepth(state, a);
      return drawActor(this, supportedActor(state, a), a.id === selected, visualContext(state)).setDepth(depth);
    });
    state.items.forEach(item => {
      const point = itemPoint(state, item); if (!point) return;
      const depth = objectDepth(state, item);
      this.objects.push(this.add.image(point.x, point.y, itemKind(item)).setDisplaySize(40 * contextScale(visualContext(state)), 40 * contextScale(visualContext(state))).setName(item.id).setDepth(depth));
    });
    drawLighting(this, state);
    if (state.show) this.add.text(roomWidth(state) - 145, 100, '♪ Ao vivo', textStyle('live')).setOrigin(.5).setDepth(700);
  }
  pan(room: RoomId | null, fraction: number) {
    if (!this.ready) return;
    if (!room) { if (this.sliding) this.paint(this.world, this.selected); return; }
    if (this.sliding?.room !== room) {
      this.paint(this.world, this.selected);
      const objects = [...this.children.list].sort((a, b) => (a as Phaser.GameObjects.Container).depth - (b as Phaser.GameObjects.Container).depth);
      const current = this.add.container(0, 0, objects);
      const next = roomPreview(this, enterRoom(this.world, room), this.selected, this.building, false);
      this.sliding = { room, current, next };
    }
    const width = logicalWidth(this);
    this.sliding.current.x = fraction * width;
    this.sliding.next.x = fraction * width + (fraction < 0 ? width : -width);
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
    this.game.canvas.dataset.blink = kind; this.tweens.killTweensOf(target); target.setAlpha(1);
    this.tweens.add({ targets: target, alpha: .35, duration: reducedMotion() ? reducedFadeMs : 160, yoyo: true, repeat: reducedMotion() ? 0 : 2, onComplete: () => target.setAlpha(1) });
  }
  /** `carried`: the finger drags the figure (it hangs, never walks); without `id` whoever moved is let go. */
  previewActor(id: ActorId | null, point: Point | null, carried = false) {
    this.weight.follow(id, point, carried, performance.now());
    const active = id ?? this.moving; if (!active) return;
    const actor = this.world.actors.find(a => a.id === active)!;
    const destination = point ?? supportedActor(this.world, actor);
    const preview = point ? { ...actor, ...point, seat: null } : actor;
    const depth = actorDepth(this.world, preview);
    const figure = this.figures.find(f => f.name === active);
    if (figure) this.tweens.killTweensOf(figure);
    this.trackSteps(figure, carried ? null : point);
    figure?.setPosition(destination.x, destination.y).setDepth(depth);
    this.moving = id; this.game.canvas.dataset.walking = id ?? '';
    this.game.canvas.dataset.walkX = String(destination.x); this.game.canvas.dataset.walkY = String(destination.y);
    this.world.items.filter(i => i.holder === active).forEach(item => {
      const p = handPoint(preview, visualContext(this.world));
      this.objects.find(o => o.name === item.id)?.setPosition(p.x, p.y).setDepth(depth + 2);
    });
  }
  private trackSteps(figure: Phaser.GameObjects.Container | undefined, point: Point | null) {
    if (!figure || !point) return;
    figure.setData('direction', Math.sign(point.x - figure.x)); this.gaze.delete(figure.name as ActorId);
    const distance = (figure.getData('distance') ?? 0) + Math.hypot(point.x - figure.x, point.y - figure.y);
    figure.setData('distance', distance).setData('gait', trackGait(figure.getData('gait'), performance.now(), distance));
  }
  walkToDoor(id: ActorId, x: number, duration: number): Promise<void> {
    const actor = this.world.actors.find(a => a.id === id)!;
    const point = { x: actor.x, y: actor.y };
    return new Promise(resolve => this.tweens.add({ targets: point, x, y: 510, duration,
      onUpdate: () => this.previewActor(id, point), onComplete: () => resolve() }));
  }
  /** Whoever moves for a game walks there (fades with reduced motion); call it before committing the moves. */
  stroll(moves: { actor: ActorId; point: Point }[]) { this.strolls.start(this.figures, moves); }
  private walking(figure: Phaser.GameObjects.Container, actor: Actor) { return this.strolls.step(figure, actor, this.world) || this.life.step(figure, actor, this.world, performance.now()) || (this.moving === actor.id && !this.weight.carrying(actor.id)); }
  captureMotion() {
    const settle = captureMotion(this, this.figures, [...this.objects, ...(this.ghost ? [this.ghost] : [])], this.world.room), name = this.ghost?.name;
    return () => settle(this.figures, this.objects, this.world.room, this.world.items.some(i => i.id === name && !i.holder) ? { name: name!, fall: objectFall(contextScale(visualContext(this.world))) } : null);
  }
  visibleWorld(): VisibleWorld {
    return shownWorld({ world: this.world, figures: this.figures, objects: this.objects, moving: this.moving, pickPiece: p => this.pickPiece(p), actorHit: (actor, point) => this.actorHit(actor, point) });
  }
  private actorHit(actor: Actor, point: Point) {
    const pose = this.figures.find(f => f.name === actor.id)?.getByName<Phaser.GameObjects.Container>('pose');
    if (!pose) return false;
    return visibleHit(this, pose, point);
  }
  hover(point: Point | null) {
    this.hint?.clear();
    if (!point || this.building) return;
    if (!this.hint) this.hint = this.add.graphics().setDepth(999);
    const piece = this.pickPiece(point);
    hoverHint(this.hint, this.visibleWorld(), this.objects, piece && this.pieces.get(piece.id), point, actor => this.highlight(actor));
  }
  face(id: ActorId, point: Point) { const actor = this.world.actors.find(a => a.id === id); if (actor) { this.gaze.set(id, Math.sign(point.x - actor.x)); this.faces.trigger(id, 'curious', performance.now()); } }
  /** With `face` (who is there), the bubble points at that character's head from above, never over the face. */
  refuse(point: Point, text: string, face?: ActorId) {
    if (!this.ready) return;
    const owner = face && this.figures.find(f => f.name === face), head = owner ? owner.getBounds() : null;
    refuseAt(this, head ? { x: head.centerX, y: head.top - 6 } : point, text, this.figures.find(f => f.name === this.selected), face);
  }
  poke(id: ActorId, pose: ReactionPose, line: string) {
    this.faces.trigger(id, pokeFace(pose), performance.now(), 900);
    const figure = this.figures.find(f => f.name === id), actor = this.world.actors.find(a => a.id === id);
    if (this.ready && figure && actor) pokeFigure(this, figure, pose, line, (actor.kind === 'cat' ? 100 : 196) * contextScale(visualContext(this.world)));
  }
  pickPiece(point: Point) { return pickPiece(this, this.world, point); }
  buildMode(enabled: boolean, selected: number | null) { this.building = enabled; this.piece = selected; }
  openWardrobe(open: boolean) { this.wardrobe = open; this.paint(this.world, this.selected); }
  react(events: PresentationEvent[]) { faceEvents(this.faces, events, this.world, this.selected, performance.now()); if (this.ready) react(this, this.world, events); }
  preview(drag: DragPreview | null) {
    if (!this.ready) return;
    this.objects.forEach(o => o.setAlpha(drag?.kind === 'item' && o.name === drag.id ? .25 : 1));
    if (!drag) { this.clearPreview(); return; }
    const key = drag.kind === 'look' ? `look-${drag.id}` : itemKind(this.world.items.find(i => i.id === drag.id)!);
    if (!this.ghost) this.ghost = this.add.image(drag.point.x, drag.point.y, key).setDepth(1000);
    const target = actorAt(this.visibleWorld(), drag.point);
    const point = previewPoint(this.visibleWorld(), drag);
    this.snapGhost(point, drag.kind === 'item' ? target?.id ?? null : null);
    this.ghost.setTexture(key).setName(drag.id).setDisplaySize(drag.kind === 'look' ? 64 : 40 * contextScale(visualContext(this.world)), drag.kind === 'look' ? 56 : 40 * contextScale(visualContext(this.world)));
    this.highlight(target);
  }
  private highlight(target: Actor | undefined) {
    if (!this.hint) this.hint = this.add.graphics().setDepth(999);
    this.hint.clear();
    if (target) this.hint.lineStyle(3, 0x477e86).strokeEllipse(target.x, target.y + 3, 76, 22);
  }
  private snapGhost(point: Point, target: ActorId | null) {
    const ghost = this.ghost!;
    if (ghost.getData('target') !== target) {
      this.tweens.killTweensOf(ghost);
      if (target && !reducedMotion()) this.tweens.add({ targets: ghost, ...point, duration: 100, ease: 'Sine.Out' });
      else ghost.setPosition(point.x, point.y);
    } else if (!target) ghost.setPosition(point.x, point.y);
    ghost.setData('target', target);
  }
  private clearPreview() { this.ghost?.destroy(); this.hint?.destroy(); this.ghost = null; this.hint = null; }
  private get frameContext(): FrameContext {
    return { world: this.world, town: this.town, moving: this.moving, gaze: this.gaze, objects: this.objects, faces: this.faces, now: performance.now(), life: this.life, gaits: [],
      swingRig: () => this.children.getByName('swing-rig') as Phaser.GameObjects.Container | null, walking: (f, a) => this.walking(f, a), weight: this.weight };
  }
  private mark(key: string, value: string) { if (this.game.canvas.dataset[key] !== value) this.game.canvas.dataset[key] = value; }
  update(time: number) {
    const reduced = reducedMotion(), ctx = this.frameContext, shown: string[] = [];
    this.life.tick(this.world, this.selected, ctx.now, !reduced && !this.building && !this.wardrobe && !this.moving && !this.gameArt?.active() && !this.game.canvas.dataset.strolling);
    this.figures.forEach((figure, index) => {
      const actor = this.world.actors.find(a => a.id === figure.name)!;
      shown.push(`${actor.id}:${animateFigure(ctx, figure, actor, time, index, reduced)}`);
      this.gameArt?.animate(figure, performance.now(), reduced);
    });
    this.life.flush(); this.mark('gait', ctx.gaits.join(' '));
    this.mark('faces', shown.join(' '));
    this.sky?.(time, reduced);
    this.pieces.forEach(piece => { const effect = piece.getByName<Phaser.GameObjects.Text>('effect'); if (effect) effect.y = 6 + Math.sin(time / 400) * 4; });
  }
}
