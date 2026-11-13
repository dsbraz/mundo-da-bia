import { palettes } from '../content/furnishings';
import { buildingFacadeKey } from './architecture-art';
import { rasterScale } from './rendering';
import { doorway as geometry } from './door-geometry';
import type Phaser from 'phaser';
import type { Building, Location, Neighborhood } from '../domain/neighborhood-types';
import { sameLocation } from '../domain/location';
import { reducedFadeMs, reducedMotion } from './motion';
import { doors, type Door } from './neighborhood-doors';
type Rect = { x: number; y: number; width: number; height: number };
/** Arriving: the door just come through swings open and shut (a fade of its leaf with reduced motion); doorways and stairs have no leaf. */
export function doorEffect(scene: Phaser.Scene, town: Neighborhood, previous: Location) {
  if (sameLocation(town.location, previous)) return;
  const door = arrival(town, previous); if (door?.kind !== 'door') return;
  const outside = town.location.kind === 'street' && previous.kind === 'interior' ? town.buildings.find(b => b.id === previous.building) : undefined;
  swing(scene, door.box, outside, 160);
}
/** Leaving through the door to `destination`: a door opens and the figure fades into its doorway (or onto the stairs) in 240 ms
 *  (120 ms with reduced motion), then `done`. The figure is looked up every frame, so a repaint meanwhile (a ball coming to rest) does not lose the fade. */
export function enterDoor(scene: Phaser.Scene, town: Neighborhood, figure: () => Phaser.GameObjects.Container | undefined, destination: Location, done: () => void) {
  const building = destination.kind === 'interior' && town.location.kind === 'street' ? town.buildings.find(b => b.id === destination.building) : undefined;
  const { box: rect, sill, kind } = exit(town, destination, building);
  const reduced = reducedMotion(), duration = reduced ? reducedFadeMs : 240, clock = { t: 0 };
  scene.game.canvas.dataset.door = 'enter';
  if (kind === 'door') swing(scene, rect, building, 0, duration);
  const from = figure(), start = from ? { x: from.x, y: from.y, scale: from.scaleX } : null;
  const apply = () => {
    const f = figure(); if (!f || !start) return; f.setAlpha(1 - clock.t);
    if (!reduced) f.setPosition(start.x + (sill.x - start.x) * clock.t, start.y + (sill.y - start.y) * clock.t).setScale(start.scale * (1 - .08 * clock.t));
  };
  scene.tweens.add({ targets: clock, t: 1, duration, ease: 'Sine.In', onUpdate: apply, onComplete: () => { scene.game.canvas.dataset.door = ''; done(); } });
}
function swing(scene: Phaser.Scene, rect: Rect, outside: Building | undefined, hold: number, open = 220) {
  const { x, y, width, height } = rect;
  const recess = scene.add.rectangle(x, y, width, height, 0x465e5b).setOrigin(0).setDepth(152);
  const leaf = scene.add.container(x, y).setDepth(153);
  if (outside) {
    const d = geometry.facade;
    const image = scene.add.image(-d.x, -d.y, buildingFacadeKey(outside)).setOrigin(0).setDisplaySize(440, 480).setCrop(d.x * rasterScale, d.y * rasterScale, d.width * rasterScale, d.height * rasterScale);
    if (outside.color !== 'original') image.setTint(Number.parseInt(palettes[outside.color].light.slice(1), 16));
    leaf.add(image);
  } else {
    leaf.add(scene.add.rectangle(0, 0, width, height, 0x789a9a).setOrigin(0));
    leaf.add(scene.add.circle(width - 14, height * .65, 4, 0xf7d786));
  }
  const motion = reducedMotion() ? { alpha: 0, duration: reducedFadeMs } : { scaleX: .12, duration: open, ease: 'Sine.InOut' };
  scene.tweens.add({ targets: leaf, ...motion, yoyo: true, hold, onComplete: () => { leaf.destroy(); recess.destroy(); } });
}
/** The door out to `destination` (the facade of `building` on the street); without one, the "Rua" door's place. */
function exit(town: Neighborhood, destination: Location, building: Building | undefined): Pick<Door, 'box' | 'sill' | 'kind'> {
  const door = building ? arrival(town, destination) : doors(town).find(d => sameLocation(d.location, destination));
  return door ?? { box: geometry.interior, sill: { x: geometry.interior.x + geometry.interior.width / 2, y: geometry.interior.y + geometry.interior.height + 2 }, kind: 'door' };
}
/** The door someone arriving from `previous` came through (or, given a house, the facade door to it on the street): on the street, the
 *  facade of that house; inside, the matching doorway or stairs, else (the Map) the house's "Rua" door. */
function arrival(town: Neighborhood, previous: Location): Door | undefined {
  const all = doors(town);
  if (town.location.kind === 'street') return previous.kind === 'interior' ? all.find(d => d.location.kind === 'interior' && d.location.building === previous.building) : undefined;
  return all.find(d => sameLocation(d.location, previous)) ?? all.find(d => d.location.kind === 'street');
}
/** A warm light around a doorway: the drop here goes through it. `depth`: above what is drawn there (a side doorway is in front of the furniture). */
export function doorGlow(scene: Phaser.Scene, { x, y, width, height, depth = 154 }: Rect & { depth?: number }) {
  // Under automation only, the canvas tells whether a doorway is lit.
  const mark = (lit: boolean) => { if (navigator.webdriver) scene.game.canvas.dataset.doorGlow = String(lit); };
  mark(true);
  return scene.add.graphics().setDepth(depth).fillStyle(0xffe08a, .28).fillRoundedRect(x - 6, y - 6, width + 12, height + 12, 14)
    .lineStyle(6, 0xf2b84b, .95).strokeRoundedRect(x - 6, y - 6, width + 12, height + 12, 14)
    .once('destroy', () => mark(false));
}
