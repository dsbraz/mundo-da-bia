import { harvest, nearestPlot, plotSpots, thirsty } from '../domain/garden';
import { neighborhoodAction } from '../domain/neighborhood';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { PlazaPlot } from '../domain/progress';
import type { ActorId, CropId } from '../domain/types';
import { seedBag } from '../presentation/seed-bag';
import { standPoint } from '../presentation/plaza-garden';
import { plantBase } from '../presentation/garden-art';
import type { walking } from '../presentation/walking';
import type { PlayScene } from '../presentation/scene';
import { fullBasketLine } from '../content/garden';
import type { sceneFeedback } from './scene-feedback';

/** Standing at the plot's spot (within 40 px), where a walk to it ends. */
const beside = (who: { x: number; y: number }, plot: PlazaPlot) => { const stand = standPoint(plot).point; return Math.hypot(who.x - stand.x, who.y - stand.y) <= 40; };
interface GardenDeps {
  root: HTMLElement; town: () => Neighborhood; selected: () => ActorId; building: () => boolean; walker: ReturnType<typeof walking>;
  /** The app's clock (ms): the domain only gets the time through the action. */
  now: () => number;
  /** Commits a neighborhood the garden changed (saved and drawn), outside the undo history: what she gains only grows. */
  apply: (town: Neighborhood) => void;
  scene: Pick<PlayScene, 'outdoor'>; feedback: Pick<ReturnType<typeof sceneFeedback>, 'events' | 'refuse'>;
}
/** The plaza vegetable garden (§3.3): a touch on a plot walks the selected character beside it, then plants (seed bag), waters,
 *  harvests or just sways the plant; the plaza's can waters the plot nearest to whoever is selected. */
export function gardenPlay(deps: GardenDeps) {
  let open: PlazaPlot | null = null;
  const bag = seedBag(deps.root, { plant });
  const street = () => { const actor = deps.town().actors.find(a => a.id === deps.selected()); return actor?.location.kind === 'street' ? actor : undefined; };
  function go(plot: PlazaPlot, then: (actor: ActorId) => void) {
    close(); deps.walker.cancel();
    deps.walker.start(standPoint(plot).point, () => then(deps.selected()));
  }
  /** What a plot asks for when touched: an empty one opens the seed bag, a thirsty one is watered, a ready one harvested. */
  function tend(actor: ActorId, plot: PlazaPlot, focus = false) {
    const plant = deps.town().progress.plaza[plot];
    if (!plant) { open = plot; bag.open(deps.town().progress.seeds, { x: plotSpots[plot].x, y: plotSpots[plot].y - 100 }, focus); return; }
    if (plant.stage === 4) { gather(actor, plot); return; }
    if (thirsty(plant)) { water(actor, plot); return; }
    deps.scene.outdoor.garden.sway(plot);
  }
  /** Beside the plot the drops land on its soil; from farther away (dropped somewhere else) they only fall at her feet. */
  function water(actor: ActorId, plot: PlazaPlot) {
    deps.apply(neighborhoodAction(deps.town(), { type: 'water-plot', plot, now: deps.now() }));
    const who = deps.town().actors.find(a => a.id === actor);
    deps.scene.outdoor.reaction({ type: 'outdoor', actor, target: 'water' }, standPoint(plot).facing, who && beside(who, plot) ? plantBase(plot) : undefined);
  }
  function gather(actor: ActorId, plot: PlazaPlot) {
    const crop = deps.town().progress.plaza[plot]!.crop, result = harvest(deps.town(), plot);
    if (!result.amount) { deps.scene.outdoor.garden.full(); deps.feedback.refuse('place', fullBasketLine); return; }
    deps.apply(result.town);
    deps.scene.outdoor.garden.harvested(plot, crop, result.amount); deps.feedback.events([{ type: 'harvested', actor }]);
  }
  function plant(crop: CropId) {
    const plot = open; close(); if (!plot) return;
    const next = neighborhoodAction(deps.town(), { type: 'plant', plot, crop, now: deps.now() });
    if (next === deps.town()) return;
    deps.apply(next); deps.scene.outdoor.garden.planted(plot);
  }
  function close() { open = null; bag.close(); }
  return {
    /** A touch on `plot` in the drawing or its button (`focus`: from the keyboard, the seed bag takes the focus). */
    touch(plot: PlazaPlot, focus = false) { if (street()) go(plot, actor => tend(actor, plot, focus)); },
    /** The plaza's can: whoever is selected waters the nearest plot (a thirsty one first). */
    can() { const actor = street(); if (actor) { const plot = nearestPlot(deps.town().progress, actor); go(plot, who => water(who, plot)); } },
    /** Someone dropped on a planted plot (or the can) tends it right there, without walking; an empty plot is just floor. */
    drop(actor: ActorId, plot: PlazaPlot | null): boolean {
      const who = deps.town().actors.find(a => a.id === actor);
      if (!who || (plot && !deps.town().progress.plaza[plot])) return false;
      if (plot) tend(actor, plot); else water(actor, nearestPlot(deps.town().progress, who));
      return true;
    },
    /** After every refresh: the bag closes in Create, off the street, or when the selected character is not beside its plot. */
    refresh() {
      if (!open) return;
      const actor = street();
      if (deps.building() || deps.town().location.kind !== 'street' || !actor || !beside(actor, open)) close();
    },
  };
}
