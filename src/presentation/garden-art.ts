import type Phaser from 'phaser';
import { plotSpots } from '../domain/garden';
import { plazaPlots } from '../domain/progress';
import type { PlazaPlot } from '../domain/progress';
import type { Neighborhood } from '../domain/neighborhood-types';
import { cropIds } from '../domain/types';
import type { CropId, Plant, Point } from '../domain/types';
import { reducedFadeMs, reducedMotion } from './motion';
import { basketPoint, canPoint, plantArt } from './plaza-garden';

type Image = Phaser.GameObjects.Image;
const plotSize = { width: 76, height: 44 }, plantSize = { width: 60, height: 68 }, soil = 28;
/** Test hooks on the canvas, only under automation. */
function mark(scene: Phaser.Scene, key: string, value: string) { if (navigator.webdriver) scene.game.canvas.dataset[key] = value; }
const named = (scene: Phaser.Scene, name: string) => scene.children.getByName(name) as Image | null;
/** Where a plant in `plot` grows from: the soil of its box. */
export const plantBase = (plot: PlazaPlot): Point => ({ x: plotSpots[plot].x, y: plotSpots[plot].y - soil });

/** The four plots with their plants (a thirsty one droops and a drop blinks over it), the resting can and the basket with what it
 *  holds peeking out. Drawn again as a layer of its own when only the garden changed. */
export function drawGarden(scene: Phaser.Scene, town: Neighborhood) {
  scene.children.list.filter(o => o.name.startsWith('garden:')).forEach(o => o.destroy());
  if (!scene.textures.exists('plot')) return;
  const reduced = reducedMotion(), plaza = town.progress.plaza;
  plazaPlots.forEach(plot => {
    const spot = plotSpots[plot], plant = plaza[plot];
    scene.add.image(spot.x, spot.y, plant?.watered ? 'plot-wet' : 'plot').setOrigin(.5, 1).setDisplaySize(plotSize.width, plotSize.height).setDepth(spot.y - 1).setName(`garden:plot:${plot}`);
    if (plant) drawPlant(scene, plot, plant, reduced);
  });
  scene.add.image(canPoint.x, canPoint.y, 'garden-can').setOrigin(.5, 1).setDisplaySize(50, 37).setDepth(canPoint.y).setName('garden:can');
  drawBasket(scene, town.progress.basket);
  mark(scene, 'garden', plazaPlots.map(plot => { const p = plaza[plot]; return p ? `${plot}:${p.crop}:${p.stage}:${plantArt(p).drop ? 'sede' : 'ok'}` : `${plot}:-`; }).join(' '));
}
function drawPlant(scene: Phaser.Scene, plot: PlazaPlot, plant: Plant, reduced: boolean) {
  const base = plantBase(plot), art = plantArt(plant), depth = plotSpots[plot].y;
  const image = scene.add.image(base.x, base.y, art.key).setOrigin(.5, 86 / 90).setDisplaySize(plantSize.width, plantSize.height).setRotation(art.lean).setDepth(depth).setName(`garden:plant:${plot}`);
  if (plant.stage === 4 && !reduced) scene.tweens.add({ targets: image, scaleY: image.scaleY * 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  if (!art.drop) return;
  // Just above the leaves: low over a seed or sprout, higher over taller plants.
  const drop = scene.add.image(base.x + 18, base.y - (plant.stage <= 1 ? 30 : 54), 'garden-drop').setDisplaySize(19, 24).setDepth(depth + 1).setName(`garden:drop:${plot}`);
  if (!reduced) scene.tweens.add({ targets: drop, alpha: .35, duration: 550, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
}
function drawBasket(scene: Phaser.Scene, basket: Neighborhood['progress']['basket']) {
  const inside = cropIds.filter(crop => (basket[crop] ?? 0) > 0).slice(0, 3);
  inside.forEach((crop, i) => scene.add.image(basketPoint.x + (i - (inside.length - 1) / 2) * 15, basketPoint.y - 32, `ing-${crop}`)
    .setDisplaySize(20, 20).setDepth(basketPoint.y - 1).setName(`garden:peek:${crop}`));
  scene.add.image(basketPoint.x, basketPoint.y, 'garden-basket').setOrigin(.5, 1).setDisplaySize(58, 41).setDepth(basketPoint.y).setName('garden:basket');
}
/** A seed just went in: the new sprout pops up (it fades in with reduced motion). */
export function plantPop(scene: Phaser.Scene, plot: PlazaPlot) {
  const image = named(scene, `garden:plant:${plot}`); if (!image) return;
  mark(scene, 'planted', plot);
  if (reducedMotion()) { scene.tweens.add({ targets: image.setAlpha(0), alpha: 1, duration: reducedFadeMs }); return; }
  const size = image.scaleY; scene.tweens.add({ targets: image.setScale(image.scaleX, size * .3), scaleY: size, duration: 260, ease: 'Back.Out' });
}
/** A touch on a plant that is fine as it is: it sways once. */
export function plantSway(scene: Phaser.Scene, plot: PlazaPlot) {
  const image = named(scene, `garden:plant:${plot}`); if (!image || reducedMotion()) return;
  scene.tweens.add({ targets: image, rotation: image.rotation + .12, duration: 140, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
}
/** The harvest flies from the plot into the basket in an arc, one after the other, and the basket hops; with reduced motion the
 *  crops only fade in over the basket. */
export function harvestFlight(scene: Phaser.Scene, plot: PlazaPlot, crop: CropId, amount: number) {
  const from = plantBase(plot), to = { x: basketPoint.x, y: basketPoint.y - 30 }, reduced = reducedMotion();
  mark(scene, 'harvest', crop);
  for (let i = 0; i < amount; i++) {
    const fruit = scene.add.image(from.x, from.y - 30, `ing-${crop}`).setDisplaySize(26, 26).setDepth(1040);
    const done = () => { fruit.destroy(); if (i === amount - 1) { mark(scene, 'harvest', ''); hop(scene, reduced); } };
    if (reduced) { scene.tweens.add({ targets: fruit.setPosition(to.x, to.y).setAlpha(0), alpha: 1, duration: reducedFadeMs, delay: i * 120, yoyo: true, hold: 300, onComplete: done }); continue; }
    const flight = { t: 0 };
    scene.tweens.add({ targets: flight, t: 1, duration: 520, delay: i * 140, ease: 'Sine.InOut', onComplete: done,
      onUpdate: () => { const t = flight.t; fruit.setPosition(from.x + (to.x - from.x) * t, from.y - 30 + (to.y - from.y + 30) * t - 70 * Math.sin(Math.PI * t)); } });
  }
}
function hop(scene: Phaser.Scene, reduced: boolean) {
  const basket = named(scene, 'garden:basket'); if (!basket || reduced) return;
  scene.tweens.add({ targets: basket, y: basket.y - 8, duration: 120, yoyo: true, ease: 'Sine.Out' });
}
/** The basket already holds 6 of the kind: it wobbles (it stays still with reduced motion) and nothing is lost. */
export function basketWobble(scene: Phaser.Scene) {
  mark(scene, 'basketFull', String(Date.now()));
  const basket = named(scene, 'garden:basket'); if (!basket || reducedMotion()) return;
  scene.tweens.add({ targets: basket, angle: 9, duration: 110, yoyo: true, repeat: 2, ease: 'Sine.InOut', onComplete: () => basket.setAngle(0) });
}
