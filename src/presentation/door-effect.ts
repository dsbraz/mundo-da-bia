import type Phaser from 'phaser';
import type { Location, Neighborhood } from '../domain/neighborhood-types';
import { plotStart } from '../domain/neighborhood-geometry';
import { sameLocation } from '../domain/location';
export function doorEffect(scene: Phaser.Scene, town: Neighborhood, previous: Location) {
  if (sameLocation(town.location, previous) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const point = doorway(town, previous); if (!point) return;
  const { x, y, width, height } = point;
  const recess = scene.add.rectangle(x, y, width, height, 0x465e5b).setOrigin(0).setDepth(152);
  const leaf = scene.add.container(x, y).setDepth(153);
  leaf.add(scene.add.rectangle(0, 0, width, height, 0x789a9a).setOrigin(0));
  leaf.add(scene.add.circle(width - 14, height * .65, 4, 0xf7d786));
  scene.tweens.add({ targets: leaf, scaleX: .12, duration: 220, yoyo: true, hold: 160, ease: 'Sine.InOut', onComplete: () => { leaf.destroy(); recess.destroy(); } });
}
function doorway(town: Neighborhood, previous: Location) {
  const where = town.location;
  if (where.kind === 'interior') {
    const building = town.buildings.find(b => b.id === where.building)!;
    return where.room === building.entry ? { x: 510, y: 260, width: 80, height: 150 } : null;
  }
  if (previous.kind !== 'interior') return null;
  const building = town.buildings.find(b => b.id === previous.building)!;
  return { x: plotStart(building.plot) + 184, y: 343, width: 72, height: 104 };
}
