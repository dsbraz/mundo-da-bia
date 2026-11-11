import { plotSpots } from '../domain/garden';
import { plazaPlots } from '../domain/progress';

export interface Obstacle { name: string; left: number; right: number; top: number; bottom: number }
/** A plaza plot on the floor, with room for a body around it; the back row reaches the front one, so nobody walks between them. */
function plotBlock(plot: typeof plazaPlots[number]): Obstacle {
  const spot = plotSpots[plot], back = plot === 'praca-1' || plot === 'praca-2';
  return { name: plot, left: spot.x - 46, right: spot.x + 46, top: spot.y - 26, bottom: back ? spot.y + 26 : spot.y + 10 };
}
/** Where the plaza's solid things stand on the street floor (feet coordinates, with room for a body around them), so walks go
 *  around them: the bench, the two swing posts and the four garden plots. Drawn in `plaza-art.ts` and `garden-art.ts`. */
export const plazaObstacles: readonly Obstacle[] = [
  { name: 'bench', left: 112, right: 248, top: 430, bottom: 458 },
  { name: 'swing-left', left: 328, right: 352, top: 430, bottom: 452 },
  { name: 'swing-right', left: 448, right: 472, top: 430, bottom: 452 },
  ...plazaPlots.map(plotBlock),
];
