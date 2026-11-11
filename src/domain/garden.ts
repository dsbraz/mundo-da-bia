import type { GardenAction, Neighborhood } from './neighborhood-types';
import { basketLimit, plazaPlots } from './progress';
import type { PlazaPlot, Progress } from './progress';
import type { CropId, Plant, Point } from './types';

const minute = 60_000;
/** Minutes of real time from each stage to the next (0→1, 1→2, 2→3, 3→4), table of §3.3. */
export const growMinutes: Record<CropId, readonly [number, number, number, number]> = {
  alface: [2, 4, 4, 5], tomate: [3, 7, 10, 10], cenoura: [5, 10, 20, 25], milho: [10, 20, 40, 50], morango: [15, 45, 60, 120], abobora: [30, 90, 150, 210],
};
/** Where each plaza plot stands (the middle of the box's front edge, on the street floor): two behind, two in front, right of the swing. */
export const plotSpots: Record<PlazaPlot, Point> = {
  'praca-1': { x: 535, y: 436 }, 'praca-2': { x: 612, y: 436 }, 'praca-3': { x: 535, y: 488 }, 'praca-4': { x: 612, y: 488 },
};
/** Each harvest puts this many in the basket, as far as it holds. */
export const harvestAmount = 2;
/** Planted, still growing and waiting for water: it stays as it is (droopy leaves and a drop), never wilts. */
export const thirsty = (plant: Plant) => plant.stage < 4 && !plant.watered;
const validNow = (now: number) => Number.isFinite(now) && now >= 0;
const isPlot = (plot: string): plot is PlazaPlot => (plazaPlots as readonly string[]).includes(plot);
const withPlaza = (town: Neighborhood, plaza: Progress['plaza']): Neighborhood => ({ ...town, progress: { ...town.progress, plaza } });

function plant(town: Neighborhood, plot: PlazaPlot, crop: CropId, now: number): Neighborhood {
  if (!validNow(now) || !isPlot(plot) || town.progress.plaza[plot] || !town.progress.seeds.includes(crop)) return town;
  return withPlaza(town, { ...town.progress.plaza, [plot]: { crop, stage: 0, since: now, watered: false } });
}
function water(town: Neighborhood, plot: PlazaPlot, now: number): Neighborhood {
  const current = town.progress.plaza[plot];
  if (!validNow(now) || !current || !thirsty(current)) return town;
  return withPlaza(town, { ...town.progress.plaza, [plot]: { ...current, since: now, watered: true } });
}
/** One plant at `now`: a clock gone back rebases the watering; a watered plant past its time goes one stage up and asks for water again. */
export function grow(plant: Plant, now: number): Plant {
  if (!plant.watered || plant.stage === 4) return plant;
  if (now < plant.since) return { ...plant, since: now };
  if (now - plant.since < growMinutes[plant.crop][plant.stage] * minute) return plant;
  return { ...plant, stage: plant.stage + 1 as Plant['stage'], since: now, watered: false };
}
/** Every plot through `change`; the same neighborhood when no plant changes. */
function eachPlant(town: Neighborhood, change: (plant: Plant) => Plant): Neighborhood {
  let changed = false;
  const plaza = Object.fromEntries(Object.entries(town.progress.plaza).map(([plot, plant]) => {
    const next = change(plant); changed ||= next !== plant; return [plot, next];
  }));
  return changed ? withPlaza(town, plaza) : town;
}
const rain = (now: number) => (plant: Plant): Plant => thirsty(plant) ? { ...plant, since: now, watered: true } : plant;
/** A ready plant goes to the basket (2, as far as the 6 of its kind allow) and the plot empties; with no room it stays ready. */
export function harvest(town: Neighborhood, plot: PlazaPlot): { town: Neighborhood; amount: number } {
  const ready = town.progress.plaza[plot];
  if (!ready || ready.stage !== 4) return { town, amount: 0 };
  const have = town.progress.basket[ready.crop] ?? 0, amount = Math.min(harvestAmount, basketLimit - have);
  if (amount <= 0) return { town, amount: 0 };
  const plaza = { ...town.progress.plaza }; delete plaza[plot];
  return { town: { ...town, progress: { ...town.progress, plaza, basket: { ...town.progress.basket, [ready.crop]: have + amount } } }, amount };
}
/** The plot nearest to `point` among the thirsty ones, or among all four when none is thirsty. */
export function nearestPlot(progress: Progress, point: Point): PlazaPlot {
  const distance = (plot: PlazaPlot) => Math.hypot(plotSpots[plot].x - point.x, plotSpots[plot].y - point.y);
  const dry = plazaPlots.filter(plot => { const p = progress.plaza[plot]; return p && thirsty(p); });
  return [...dry.length ? dry : plazaPlots].sort((a, b) => distance(a) - distance(b))[0]!;
}
export const gardenActions: readonly string[] = ['plant', 'water-plot', 'harvest', 'tick', 'rain'];
export function garden(town: Neighborhood, action: GardenAction | { type: 'tick'; now: number }): Neighborhood {
  switch (action.type) {
    case 'plant': return plant(town, action.plot, action.crop, action.now);
    case 'water-plot': return water(town, action.plot, action.now);
    case 'harvest': return harvest(town, action.plot).town;
    case 'tick': return validNow(action.now) ? eachPlant(town, p => grow(p, action.now)) : town;
    default: return validNow(action.now) ? eachPlant(town, rain(action.now)) : town;
  }
}
