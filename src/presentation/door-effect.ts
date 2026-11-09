import { palettes } from '../content/furnishings';
import { facadeKey } from './architecture-art';
import { floorCount } from '../domain/modules';
import { rasterScale } from './rendering';
import { doorway as geometry } from './door-geometry';
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
  const outside = town.location.kind === 'street' && previous.kind === 'interior' ? town.buildings.find(b => b.id === previous.building) : undefined;
  if (outside) {
    const d = geometry.facade;
    const image = scene.add.image(-d.x, -d.y, facadeKey(outside.model, floorCount(outside.layout))).setOrigin(0).setDisplaySize(440, 480).setCrop(d.x * rasterScale, d.y * rasterScale, d.width * rasterScale, d.height * rasterScale);
    if (outside.color !== 'original') image.setTint(Number.parseInt(palettes[outside.color].light.slice(1), 16));
    leaf.add(image);
  } else {
    leaf.add(scene.add.rectangle(0, 0, width, height, 0x789a9a).setOrigin(0));
    leaf.add(scene.add.circle(width - 14, height * .65, 4, 0xf7d786));
  }
  scene.tweens.add({ targets: leaf, scaleX: .12, duration: 220, yoyo: true, hold: 160, ease: 'Sine.InOut', onComplete: () => { leaf.destroy(); recess.destroy(); } });
}
function doorway(town: Neighborhood, previous: Location) {
  const where = town.location;
  if (where.kind === 'interior') {
    const building = town.buildings.find(b => b.id === where.building)!;
    return where.room === building.entry ? geometry.interior : null;
  }
  if (previous.kind !== 'interior') return null;
  const building = town.buildings.find(b => b.id === previous.building)!;
  return { ...geometry.facade, x: plotStart(building.plot) + geometry.facade.x };
}
