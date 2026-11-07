import Phaser from 'phaser';
import { itemIds } from '../domain/types';
import type { ActorId, PresentationEvent, World } from '../domain/types';
import { drawFurniture, drawLighting } from './furniture-art';
import { loadArt } from './svg-assets';
import { animateActor, drawActor } from './art';
import { drawRoom } from './room';
import { drawWardrobe } from './wardrobe';
import { actorAt, itemPoint } from './targets';
import type { DragPreview } from './targets';
import { react } from './reactions';

export class PlayScene extends Phaser.Scene {
  private world: World;
  private selected: ActorId = 'bia';
  private figures: Phaser.GameObjects.Container[] = [];
  private ready = false;
  private wardrobe = false;
  private ghost: Phaser.GameObjects.Container | null = null;
  private objects: Phaser.GameObjects.Image[] = [];
  constructor(state: World) { super('play'); this.world = state; }
  preload() {
    loadArt(this);
    itemIds.forEach(id => this.load.svg(id, `/icons/${id}.svg`, { width: 48, height: 48 }));
  }
  create() { this.ready = true; this.paint(this.world, this.selected); }
  paint(state: World, selected: ActorId) {
    this.world = state; this.selected = selected;
    if (!this.ready) return;
    this.children.removeAll(true);
    this.ghost = null; this.objects = [];
    drawRoom(this, state.room);
    drawFurniture(this, state);
    if (state.room === 'sala') drawWardrobe(this, this.wardrobe);
    this.figures = state.actors.filter(a => a.room === state.room).sort((a, b) => a.y - b.y).map(a => drawActor(this, a, a.id === selected));
    state.items.forEach(item => {
      const point = itemPoint(state, item);
      if (point) this.objects.push(this.add.image(point.x, point.y, item.id).setName(item.id));
    });
    drawLighting(this, state);
    this.game.canvas.dataset.ready = 'true';
    if (state.show) this.add.text(900, 145, '♪ Nosso show! ♫', { fontSize: '20px', color: '#825c90', backgroundColor: '#fff2ce', padding: { x: 18, y: 10 } }).setOrigin(0.5);
  }
  openWardrobe(open: boolean) { this.wardrobe = open; this.paint(this.world, this.selected); }
  react(events: PresentationEvent[]) { if (this.ready) react(this, this.world, events); }
  preview(drag: DragPreview | null) {
    if (!this.ready) return;
    this.ghost?.destroy(); this.ghost = null;
    this.objects.forEach(object => object.setAlpha(drag?.kind === 'item' && object.name === drag.id ? 0.25 : 1));
    if (!drag) return;
    this.ghost = this.add.container(0, 0).setDepth(1000);
    const g = this.add.graphics(); this.ghost.add(g);
    const target = actorAt(this.world, drag.point);
    if (target) g.lineStyle(4, 0xf4bf54).strokeEllipse(target.x, target.y + 3, 98, 28);
    g.fillStyle(0x4b395d, 0.15).fillEllipse(drag.point.x, drag.point.y + 32, 60, 14);
    if (drag.kind === 'look') this.ghost.add(this.add.image(drag.point.x, drag.point.y, `look-${drag.id}`).setDisplaySize(72, 63));
    else this.ghost.add(this.add.image(drag.point.x, drag.point.y, drag.id).setScale(1.2));
  }
  update(time: number) {
    this.figures.forEach((figure, index) => {
      const actor = this.world.actors.find(a => a.id === figure.name)!;
      animateActor(figure, actor, time, index, this.world.show);
    });
  }
}
