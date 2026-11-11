import type Phaser from 'phaser';
import { plotSpots, thirsty } from '../domain/garden';
import type { PlazaPlot } from '../domain/progress';
import { cropIds } from '../domain/types';
import type { Plant, Point } from '../domain/types';
import { sheetPart } from './art-sheet';
import type { Box } from './art-sheet';
import { loadSvg } from './rendering';

/** The plaza's vegetable garden (§3.3), as drawn: where things stand and which drawing of `public/art/plants.svg` each one uses. */
export const plotBox: Box = { width: 90, height: 52 };
export const plantBox: Box = { width: 80, height: 90 };
const dropBox: Box = { width: 24, height: 30 }, canBox: Box = { width: 60, height: 44 }, basketBox: Box = { width: 70, height: 50 };
/** The plaza's watering can rests left of the plots; the basket sits in front of them, on the sidewalk. */
export const canPoint: Point = { x: 470, y: 528 };
export const basketPoint: Point = { x: 573, y: 532 };
/** How a plant is drawn: its texture, how far it leans (thirsty flower) and whether the thirsty drop blinks over it. */
export function plantArt(plant: Plant): { key: string; lean: number; drop: boolean } {
  const dry = thirsty(plant);
  const keys = ['plant-seed', dry ? 'plant-sprout-droop' : 'plant-sprout', dry ? 'plant-leaves-droop' : 'plant-leaves', `plant-flower-${plant.crop}`, `plant-ready-${plant.crop}`];
  return { key: keys[plant.stage]!, lean: dry && plant.stage === 3 ? .3 : 0, drop: dry };
}
/** Every garden texture: the sheet parts it is cut from, drawn in order, and its box. */
export function gardenParts(): Record<string, { ids: string[]; box: Box }> {
  const plant = (ids: string[]) => ({ ids, box: plantBox });
  return {
    plot: { ids: ['plot'], box: plotBox }, 'plot-wet': { ids: ['plot', 'soil-wet'], box: plotBox },
    'plant-seed': plant(['seed']), 'plant-sprout': plant(['sprout']), 'plant-sprout-droop': plant(['sprout-droop']),
    'plant-leaves': plant(['leaves']), 'plant-leaves-droop': plant(['leaves-droop']),
    ...Object.fromEntries(cropIds.flatMap(crop => [[`plant-flower-${crop}`, plant(['leaves', `bloom-${crop}`])], [`plant-ready-${crop}`, plant([`ready-${crop}`])]])),
    'garden-drop': { ids: ['drop'], box: dropBox }, 'garden-can': { ids: ['can'], box: canBox }, 'garden-basket': { ids: ['basket'], box: basketBox },
  };
}
/** The plot a touch at `point` means: its box or the plant above it. The front row comes first, where its plants cross the back boxes. */
export function plotAt(point: Point): PlazaPlot | null {
  const order: PlazaPlot[] = ['praca-3', 'praca-4', 'praca-1', 'praca-2'];
  return order.find(plot => {
    const spot = plotSpots[plot], back = plot === 'praca-1' || plot === 'praca-2';
    return Math.abs(point.x - spot.x) <= 40 && point.y >= spot.y - (back ? 90 : 44) && point.y <= spot.y + 8;
  }) ?? null;
}
/** Where whoever tends `plot` stands: beside it, on the free side of its column, facing it. */
export function standPoint(plot: PlazaPlot): { point: Point; facing: 1 | -1 } {
  const spot = plotSpots[plot], left = plot === 'praca-1' || plot === 'praca-3';
  return { point: { x: spot.x + (left ? -55 : 56), y: spot.y + 10 }, facing: left ? 1 : -1 };
}
/** Cuts the garden textures from the plants sheet (read in the scene's preload) once, and the crop icons that fly to the basket. */
export function loadGarden(scene: Phaser.Scene) {
  const source = scene.cache.text.get('art-plants') as string | undefined;
  if (!source || scene.textures.exists('plot')) return;
  Object.entries(gardenParts()).forEach(([key, part]) => loadSvg(scene, key, sheetPart(source, part.ids, part.box)));
  cropIds.forEach(crop => { if (!scene.textures.exists(`ing-${crop}`)) scene.load.svg(`ing-${crop}`, `/icons/ing-${crop}.svg`, { width: 64, height: 64 }); });
}
