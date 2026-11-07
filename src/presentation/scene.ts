import Phaser from 'phaser';
import { items } from '../content/catalog';
import type { ActorId, World } from '../domain/types';
import { drawActor } from './art';
import { drawRoom } from './room';

export class PlayScene extends Phaser.Scene {
  private world: World;
  private selected: ActorId = 'bia';
  private figures: Phaser.GameObjects.Container[] = [];
  private ready = false;
  constructor(state: World) { super('play'); this.world = state; }
  create() { this.ready = true; this.paint(this.world, this.selected); }
  paint(state: World, selected: ActorId) {
    this.world = state; this.selected = selected;
    if (!this.ready) return;
    this.children.removeAll(true);
    drawRoom(this, state.room);
    this.figures = state.actors.filter(a => a.room === state.room).sort((a, b) => a.y - b.y).map(a => drawActor(this, a, a.id === selected));
    state.items.forEach(item => {
      const holder = state.actors.find(a => a.id === item.holder);
      const room = holder ? holder.room : item.room;
      if (room !== state.room) return;
      this.add.text(holder ? holder.x + 28 : item.x, holder ? holder.y - 55 : item.y - 28, items[item.id].icon, { fontSize: '30px' }).setOrigin(0.5);
    });
    if (state.show) this.add.text(500, 110, '♪  ♫  Nosso grande show!  ♫  ♪', { fontSize: '28px', color: '#825c90', backgroundColor: '#fff2ce', padding: { x: 18, y: 10 } }).setOrigin(0.5);
  }
  update(time: number) {
    this.figures.forEach((figure, index) => { figure.rotation = this.world.show ? Math.sin(time / 220 + index) * 0.06 : 0; });
  }
}
