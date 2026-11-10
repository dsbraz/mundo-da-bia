import { supportedActor } from './furniture-scale';
import { textStyle } from './text-style';
import { visibleHit } from './visible-hit';
import { childGameArt } from './child-game-art';
import type { GamePreview } from './child-game-art';
import { doorEffect } from './door-effect';
import type { Location } from '../domain/neighborhood-types';
import { outdoorEffect } from './outdoor-effects';
import type { OutdoorAction } from '../domain/neighborhood-types';
import { handAnchor, contextScale, visualContext } from './pose';
import { rasterScale, logicalWidth } from './rendering';
import { captureMotion } from './settle-motion';
import { itemKind } from '../domain/item-kind';
import { drawStreet, drawExit } from './street';
import type { Neighborhood } from '../domain/neighborhood-types';
import Phaser from 'phaser';
import { roomPreview } from './room-preview';
import { enterRoom } from '../domain/room-state';
import type { RoomId, ItemId } from '../domain/types';
import { itemIds } from '../domain/types';
import type { Actor, ActorId, Piece, Point, PresentationEvent, World } from '../domain/types';
import { roomWidth } from '../domain/geometry';
import { drawLighting } from './furniture-art';
import { loadArt } from './svg-assets';
import { animateActor, drawActor, gazePose, walkPose } from './art';
import { drawRoom } from './room';
import { drawPieces, pickPiece, pieceDepth, actorDepth, objectDepth } from './piece-art';
import { actorAt, handPoint, previewPoint, itemPoint, sourceAt } from './targets';
import type { DragPreview, VisibleWorld } from './targets';
import { react } from './reactions';
import { pokeFigure, refuseAt } from './feedback';
import type { ReactionPose } from '../content/personalities';
import { reducedMotion, reducedFadeMs } from './motion';
import { hex } from './palette';
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
  arrive(previous: Location) { if (this.ready && this.town) doorEffect(this, this.town, previous); }
  outdoorReaction(action: OutdoorAction) { if (this.ready && this.town) outdoorEffect(this, this.town, action); }
  camera(x: number) { this.cameraX = x; if (this.ready) { this.cameras.main.scrollX = x + Number(this.game.canvas.dataset.viewX ?? 0); this.game.canvas.dataset.cameraX = String(x); } }
  private selected: ActorId = 'bia';
  private figures: Phaser.GameObjects.Container[] = [];
  private gaze = new Map<ActorId, number>();
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
  preload() { loadArt(this, this.world, this.town); [...itemIds, 'bola'].forEach(id => this.load.svg(id, `/icons/${id}.svg`, { width: 80, height: 80 })); }
  create() {
    this.cameras.main.setOrigin(0).setZoom(rasterScale); this.ready = true;
    const view = this.game.canvas.dataset;
    this.frame(Number(view.viewWidth ?? 1000), Number(view.viewHeight ?? 600), Number(view.viewX ?? 0), Number(view.viewY ?? 0));
    this.gameArt = childGameArt(this); this.paint(this.world, this.selected);
  }
  paint(state: World, selected: ActorId) {
    this.world = state; this.selected = selected;
    if (!this.prepareArt(state)) return;
    const width = state.streetWidth ? 1000 : roomWidth(state);
    this.game.canvas.dataset.logicalWidth = String(width);
    this.cameras.main.scrollX = Number(this.game.canvas.dataset.viewX ?? 0) + (state.streetWidth ? this.cameraX : 0);
    this.game.canvas.dataset.street = String(!!state.streetWidth); this.game.canvas.dataset.cameraX = String(state.streetWidth ? this.cameraX : 0);
    this.sliding = null; this.transferRoom = null;
    this.children.removeAll(true); this.ghost = null; this.hint = null; this.objects = []; this.moving = null; this.game.canvas.dataset.walking = '';
    if (state.streetWidth && this.town) drawStreet(this, this.town, selected);
    else { drawRoom(this, state); this.exitDoor(); }
    this.pieces = drawPieces(this, state, this.wardrobe && !this.building, this.piece);
    this.figures = [];
    if (!this.building) this.paintPlay(state, selected);
    this.game.canvas.dataset.ready = 'true';
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
      this.children.removeAll(true); this.figures = []; this.pieces.clear(); this.objects = []; this.ghost = null;
      roomPreview(this, enterRoom(this.world, room), this.selected, this.building); this.transferRoom = room;
      if (actor) {
        const value = this.world.actors.find(a => a.id === actor)!;
        this.figures = [drawActor(this, { ...value, seat: null, resting: false }, true).setDepth(750)];
        this.world.items.filter(i => i.holder === actor).forEach(i => this.objects.push(this.add.image(0, 0, itemKind(i)).setDisplaySize(40, 40).setDepth(751)));
      } else if (item) this.ghost = this.add.image(0, 0, itemKind(this.world.items.find(i => i.id === item)!)).setDisplaySize(40, 40).setDepth(750);
    }
    const x = point.x * logicalWidth(this) / roomWidth(this.world, room);
    this.figures[0]?.setPosition(x, point.y);
    this.objects.forEach(o => o.setPosition(x + 28, point.y - 55)); this.ghost?.setPosition(x, point.y - 28);
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
  slidePiece(id: number, from: Point) { const piece = this.pieces.get(id); if (piece && !reducedMotion()) this.tweens.add({ targets: piece, x: { from: from.x, to: piece.x }, y: { from: from.y, to: piece.y }, duration: 240, ease: 'Back.Out' }); }
  blinkPiece(kind: Piece['kind']) {
    const piece = this.world.layout.pieces.find(p => p.kind === kind && p.room === this.world.room), target = piece && this.pieces.get(piece.id); if (!target) return;
    this.game.canvas.dataset.blink = kind; this.tweens.killTweensOf(target); target.setAlpha(1);
    this.tweens.add({ targets: target, alpha: .35, duration: reducedMotion() ? reducedFadeMs : 160, yoyo: true, repeat: reducedMotion() ? 0 : 2, onComplete: () => target.setAlpha(1) });
  }
  previewActor(id: ActorId | null, point: Point | null) {
    const active = id ?? this.moving; if (!active) return;
    const actor = this.world.actors.find(a => a.id === active)!;
    const destination = point ?? supportedActor(this.world, actor);
    const preview = point ? { ...actor, ...point, seat: null } : actor;
    const depth = actorDepth(this.world, preview);
    const figure = this.figures.find(f => f.name === active);
    if (figure) this.tweens.killTweensOf(figure);
    this.trackSteps(figure, point);
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
    figure.setData('distance', (figure.getData('distance') ?? 0) + Math.hypot(point.x - figure.x, point.y - figure.y));
  }
  walkToDoor(id: ActorId, x: number, duration: number): Promise<void> {
    const actor = this.world.actors.find(a => a.id === id)!;
    const point = { x: actor.x, y: actor.y };
    return new Promise(resolve => this.tweens.add({ targets: point, x, y: 510, duration,
      onUpdate: () => this.previewActor(id, point), onComplete: () => resolve() }));
  }
  captureMotion() {
    const settle = captureMotion(this, this.figures, [...this.objects, ...(this.ghost ? [this.ghost] : [])], this.world.room);
    return () => settle(this.figures, this.objects, this.world.room);
  }
  visibleWorld(): VisibleWorld {
    return { ...this.world, occludingDepth: p => { const piece = this.pickPiece(p); return piece ? pieceDepth(piece) : 0; }, itemDepth: new Map(this.objects.map(o => [o.name as ItemId, o.depth])), actorHit: (actor, point) => this.actorHit(actor, point), visibleDepth: new Map(this.figures.map(f => [f.name, f.depth])), visibleItems: new Map(this.objects.map(o => [o.name as ItemId, { x: o.x, y: o.y }])), actors: this.world.actors.map(actor => {
      const figure = this.figures.find(f => f.name === actor.id);
      if (!figure) return actor;
      return { ...actor, x: figure.x, y: figure.y, seat: this.moving === actor.id ? null : actor.seat };
    }) };
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
    const world = this.visibleWorld(), token = sourceAt(world, point, false);
    const object = token && this.objects.find(o => o.name === token.id);
    if (object) { this.hint.lineStyle(2, 0x477e86, .8).strokeRoundedRect(object.x - 23, object.y - 23, 46, 46, 8); return; }
    const actor = actorAt(world, point);
    if (actor) { this.highlight(actor); return; }
    const piece = this.pickPiece(point);
    const target = piece && this.pieces.get(piece.id);
    if (target) { const bounds = target.getBounds(); this.hint.lineStyle(2, 0x477e86, .55).strokeRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 8); }
  }
  face(id: ActorId, point: Point) { const actor = this.world.actors.find(a => a.id === id); if (actor) this.gaze.set(id, Math.sign(point.x - actor.x)); }
  refuse(point: Point, text: string) { if (this.ready) refuseAt(this, point, text, this.figures.find(f => f.name === this.selected)); }
  poke(id: ActorId, pose: ReactionPose, line: string) {
    const figure = this.figures.find(f => f.name === id), actor = this.world.actors.find(a => a.id === id);
    if (this.ready && figure && actor) pokeFigure(this, figure, pose, line, (actor.kind === 'cat' ? 100 : 196) * contextScale(visualContext(this.world)));
  }
  pickPiece(point: Point) { return pickPiece(this, this.world, point); }
  buildMode(enabled: boolean, selected: number | null) { this.building = enabled; this.piece = selected; }
  openWardrobe(open: boolean) { this.wardrobe = open; this.paint(this.world, this.selected); }
  react(events: PresentationEvent[]) { if (this.ready) react(this, this.world, events); }
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
  update(time: number) {
    const reduced = reducedMotion();
    this.figures.forEach((figure, index) => {
      const actor = this.world.actors.find(a => a.id === figure.name)!;
      this.animateFigure(figure, actor, time, index, reduced);
      this.gameArt?.animate(figure, performance.now(), reduced);
    });
    this.pieces.forEach(piece => { const effect = piece.getByName<Phaser.GameObjects.Text>('effect'); if (effect) effect.y = 6 + Math.sin(time / 400) * 4; });
  }
  private animateFigure(figure: Phaser.GameObjects.Container, actor: Actor, time: number, index: number, reduced: boolean) {
    const seated = [this.town?.outdoor.bench, this.town?.outdoor.swing].includes(actor.id);
    const posed = this.moving === actor.id ? { ...actor, seat: null, resting: false } : seated ? { ...actor, seat: 'armchair' as const } : actor;
    animateActor(figure, posed, reduced ? 500 : time, index, !reduced && this.world.show, reduced);
    const pose = figure.getByName<Phaser.GameObjects.Container>('pose');
    if (this.moving === actor.id) walkPose(figure, figure.getData('distance') ?? 0, reduced, figure.getData('direction'));
    else gazePose(figure, this.gaze.get(actor.id) ?? 0);
    this.animateSwing(pose, actor, time, reduced);
    const hand = handAnchor(posed), p = pose.getWorldTransformMatrix().transformPoint(hand.x, hand.y);
    this.world.items.filter(i => i.holder === actor.id).forEach(i => this.objects.find(o => o.name === i.id)?.setPosition(p.x, p.y).setRotation(pose.rotation));
  }
  private animateSwing(pose: Phaser.GameObjects.Container, actor: Actor, time: number, reduced: boolean) {
    if (this.town?.outdoor.swing !== actor.id || this.moving === actor.id) return;
    const angle = reduced ? 0 : Math.sin(time / 600) * .08;
    (this.children.getByName('swing-rig') as Phaser.GameObjects.Container | null)?.setRotation(angle);
    pose.x = -Math.sin(angle) * 126;
    pose.y += (Math.cos(angle) - 1) * 126;
    pose.rotation = angle;
  }

}
