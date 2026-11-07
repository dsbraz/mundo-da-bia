import Phaser from 'phaser';
import { roomPreview } from './room-preview';
import { enterRoom } from '../domain/room-state';
import type { RoomId, ItemId } from '../domain/types';
import { itemIds } from '../domain/types';
import type { ActorId, Point, PresentationEvent, World } from '../domain/types';
import { fixture } from '../domain/layout';
import { roomWidth } from '../domain/geometry';
import { spotKind } from '../domain/furniture';
import { drawLighting } from './furniture-art';
import { loadArt } from './svg-assets';
import { animateActor, drawActor } from './art';
import { drawRoom } from './room';
import { drawPieces, pickPiece, pieceDepth } from './piece-art';
import { actorAt, itemPoint } from './targets';
import type { DragPreview } from './targets';
import { react } from './reactions';
export class PlayScene extends Phaser.Scene {
  private world: World;
  private selected: ActorId = 'bia';
  private figures: Phaser.GameObjects.Container[] = [];
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
  preload() { loadArt(this); itemIds.forEach(id => this.load.svg(id, `/icons/${id}.svg`, { width: 40, height: 40 })); }
  create() { this.ready = true; this.paint(this.world, this.selected); }
  paint(state: World, selected: ActorId) {
    this.world = state; this.selected = selected;
    if (!this.ready) return;
    if (this.scale.width !== roomWidth(state)) this.scale.setGameSize(roomWidth(state), 600);
    this.sliding = null; this.transferRoom = null;
    this.children.removeAll(true); this.ghost = null; this.hint = null; this.objects = []; this.moving = null;
    drawRoom(this, state);
    this.pieces = drawPieces(this, state, this.wardrobe && !this.building, this.piece);
    this.figures = [];
    if (!this.building) this.paintPlay(state, selected);
    this.game.canvas.dataset.ready = 'true';
  }
  private paintPlay(state: World, selected: ActorId) {
    this.figures = state.actors.filter(a => a.room === state.room).map(a => {
      const depth = a.seat === 'bed' ? pieceDepth(fixture(state, 'bed')!) + 1 : a.y;
      return drawActor(this, a, a.id === selected).setDepth(depth);
    });
    state.items.forEach(item => {
      const point = itemPoint(state, item); if (!point) return;
      const holder = state.actors.find(a => a.id === item.holder);
      const support = item.spot === 'floor' ? undefined : fixture(state, spotKind(item.spot));
      const depth = holder ? this.figures.find(f => f.name === holder.id)!.depth + 2 : support ? pieceDepth(support) + 2 : item.y + 1;
      this.objects.push(this.add.image(point.x, point.y, item.id).setName(item.id).setDepth(depth));
    });
    drawLighting(this, state);
    if (state.show) this.add.text(roomWidth(state) - 145, 100, '♪ Ao vivo', { fontSize: '18px', color: '#425b66', backgroundColor: '#f3efe4', padding: { x: 12, y: 8 } }).setOrigin(.5).setDepth(700);
  }
  pan(room: RoomId | null, fraction: number) {
    if (!this.ready) return;
    if (!room) { if (this.sliding) this.paint(this.world, this.selected); return; }
    if (this.sliding?.room !== room) {
      this.paint(this.world, this.selected);
      const objects = [...this.children.list].sort((a, b) => (a as Phaser.GameObjects.Container).depth - (b as Phaser.GameObjects.Container).depth);
      const current = this.add.container(0, 0, objects);
      const next = roomPreview(this, enterRoom(this.world, room), this.selected, this.building);
      this.sliding = { room, current, next };
    }
    const width = this.scale.width;
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
        this.world.items.filter(i => i.holder === actor).forEach(i => this.objects.push(this.add.image(0, 0, i.id).setDepth(751)));
      } else if (item) this.ghost = this.add.image(0, 0, item).setDepth(750);
    }
    const x = point.x * this.scale.width / roomWidth(this.world, room);
    this.figures[0]?.setPosition(x, point.y);
    this.objects.forEach(o => o.setPosition(x + 28, point.y - 55)); this.ghost?.setPosition(x, point.y - 28);
  }
  previewLayout(state: World) {
    state.layout.pieces.forEach(piece => this.pieces.get(piece.id)?.setPosition(piece.x, piece.y).setDepth(pieceDepth(piece)));
  }
  previewActor(id: ActorId | null, point: Point | null) {
    const active = id ?? this.moving; if (!active) return;
    const actor = this.world.actors.find(a => a.id === active)!;
    const destination = point ?? actor;
    const depth = actor.seat === 'bed' ? pieceDepth(fixture(this.world, 'bed')!) + 1 : actor.y;
    this.figures.find(f => f.name === active)?.setPosition(destination.x, destination.y).setDepth(point ? 750 : depth);
    this.moving = id;
    this.world.items.filter(i => i.holder === active).forEach(item => {
      const p = itemPoint(this.world, item)!;
      this.objects.find(o => o.name === item.id)?.setPosition(p.x + destination.x - actor.x, p.y + destination.y - actor.y).setDepth(point ? 751 : depth + 2);
    });
  }
  walkToDoor(id: ActorId, x: number, duration: number): Promise<void> {
    const actor = this.world.actors.find(a => a.id === id)!;
    const point = { x: actor.x, y: actor.y };
    return new Promise(resolve => this.tweens.add({ targets: point, x, y: 510, duration,
      onUpdate: () => this.previewActor(id, point), onComplete: () => resolve() }));
  }
  pickPiece(point: Point) { return pickPiece(this, this.world, point); }
  buildMode(enabled: boolean, selected: number | null) { this.building = enabled; this.piece = selected; }
  openWardrobe(open: boolean) { this.wardrobe = open; this.paint(this.world, this.selected); }
  react(events: PresentationEvent[]) { if (this.ready) react(this, this.world, events); }
  preview(drag: DragPreview | null) {
    if (!this.ready) return;
    this.objects.forEach(o => o.setAlpha(drag?.kind === 'item' && o.name === drag.id ? .25 : 1));
    if (!drag) { this.clearPreview(); return; }
    const key = drag.kind === 'look' ? `look-${drag.id}` : drag.id;
    if (!this.ghost) this.ghost = this.add.image(0, 0, key).setDepth(1000);
    this.ghost.setTexture(key).setPosition(drag.point.x, drag.point.y).setDisplaySize(drag.kind === 'look' ? 64 : 44, drag.kind === 'look' ? 56 : 44);
    if (!this.hint) this.hint = this.add.graphics().setDepth(999);
    this.hint.clear(); const target = actorAt(this.world, drag.point);
    if (target) this.hint.lineStyle(3, 0x477e86).strokeEllipse(target.x, target.y + 3, 76, 22);
  }
  private clearPreview() { this.ghost?.destroy(); this.hint?.destroy(); this.ghost = null; this.hint = null; }
  update(time: number) {
    this.figures.forEach((figure, index) => {
      const actor = this.world.actors.find(a => a.id === figure.name)!;
      animateActor(figure, this.moving === actor.id ? { ...actor, seat: null, resting: false } : actor, time, index, this.world.show);
    });
    this.pieces.forEach(piece => { const effect = piece.getByName<Phaser.GameObjects.Text>('effect'); if (effect) effect.y = 6 + Math.sin(time / 400) * 4; });
  }
}
