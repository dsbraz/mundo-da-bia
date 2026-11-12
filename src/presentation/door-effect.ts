import { palettes } from '../content/furnishings';
import { facadeKey } from './architecture-art';
import { floorCount } from '../domain/modules';
import { rasterScale } from './rendering';
import { doorway as geometry } from './door-geometry';
import type Phaser from 'phaser';
import type { Building, Location, Neighborhood } from '../domain/neighborhood-types';
import { plotStart } from '../domain/neighborhood-geometry';
import { sameLocation } from '../domain/location';
import { reducedFadeMs, reducedMotion } from './motion';
type Rect = { x: number; y: number; width: number; height: number };
/** Arriving: the door just come through swings open and shut (a fade of its leaf with reduced motion). */
export function doorEffect(scene: Phaser.Scene, town: Neighborhood, previous: Location) {
  if (sameLocation(town.location, previous)) return;
  const point = doorway(town, previous); if (!point) return;
  const outside = town.location.kind === 'street' && previous.kind === 'interior' ? town.buildings.find(b => b.id === previous.building) : undefined;
  swing(scene, point, outside, 160);
}
/** Leaving through the door to `destination`: it opens and the figure fades into the doorway in 240 ms (120 ms with reduced motion), then `done`.
 *  The figure is looked up every frame, so a repaint meanwhile (a ball coming to rest) does not lose the fade. */
export function enterDoor(scene: Phaser.Scene, town: Neighborhood, figure: () => Phaser.GameObjects.Container | undefined, destination: Location, done: () => void) {
  const building = destination.kind === 'interior' ? town.buildings.find(b => b.id === destination.building) : undefined;
  const rect = building ? { ...geometry.facade, x: plotStart(building.plot) + geometry.facade.x } : geometry.interior;
  const reduced = reducedMotion(), duration = reduced ? reducedFadeMs : 240, sill = rect.y + rect.height + 2, clock = { t: 0 };
  scene.game.canvas.dataset.door = 'enter';
  swing(scene, rect, building, 0, duration);
  const from = figure(), start = from ? { y: from.y, scale: from.scaleX } : null;
  const apply = () => { const f = figure(); if (!f || !start) return; f.setAlpha(1 - clock.t); if (!reduced) f.setY(start.y + (sill - start.y) * clock.t).setScale(start.scale * (1 - .08 * clock.t)); };
  scene.tweens.add({ targets: clock, t: 1, duration, ease: 'Sine.In', onUpdate: apply, onComplete: () => { scene.game.canvas.dataset.door = ''; done(); } });
}
function swing(scene: Phaser.Scene, rect: Rect, outside: Building | undefined, hold: number, open = 220) {
  const { x, y, width, height } = rect;
  const recess = scene.add.rectangle(x, y, width, height, 0x465e5b).setOrigin(0).setDepth(152);
  const leaf = scene.add.container(x, y).setDepth(153);
  if (outside) {
    const d = geometry.facade;
    const image = scene.add.image(-d.x, -d.y, facadeKey(outside.model, floorCount(outside.layout))).setOrigin(0).setDisplaySize(440, 480).setCrop(d.x * rasterScale, d.y * rasterScale, d.width * rasterScale, d.height * rasterScale);
    if (outside.color !== 'original') image.setTint(Number.parseInt(palettes[outside.color].light.slice(1), 16));
    leaf.add(image);
  } else {
    leaf.add(scene.add.rectangle(0, 0, width, height, 0x789a9a).setOrigin(0));
    leaf.add(scene.add.circle(width - 14, height * .65, 4, 0xf7d786));
  }
  const motion = reducedMotion() ? { alpha: 0, duration: reducedFadeMs } : { scaleX: .12, duration: open, ease: 'Sine.InOut' };
  scene.tweens.add({ targets: leaf, ...motion, yoyo: true, hold, onComplete: () => { leaf.destroy(); recess.destroy(); } });
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
/** A warm light around a doorway: the drop here goes through it. */
export function doorGlow(scene: Phaser.Scene, { x, y, width, height }: Rect) {
  // Under automation only, the canvas tells whether a doorway is lit.
  const mark = (lit: boolean) => { if (navigator.webdriver) scene.game.canvas.dataset.doorGlow = String(lit); };
  mark(true);
  return scene.add.graphics().setDepth(154).fillStyle(0xffe08a, .28).fillRoundedRect(x - 6, y - 6, width + 12, height + 12, 14)
    .lineStyle(6, 0xf2b84b, .95).strokeRoundedRect(x - 6, y - 6, width + 12, height + 12, 14)
    .once('destroy', () => mark(false));
}
