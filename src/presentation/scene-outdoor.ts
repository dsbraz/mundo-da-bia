import type Phaser from 'phaser';
import { doorEffect, enterDoor } from './door-effect';
import { doorStep, doorTo } from './neighborhood-doors';
import { stroll } from './stroll';
import { outdoorEffect } from './outdoor-effects';
import { drawStreet, drawExit } from './street';
import { drawRoom } from './room';
import { drawPassages } from './room-passages';
import { swingMotion } from './swing-motion';
import { reducedMotion } from './motion';
import { basketWobble, drawGarden, harvestFlight, plantPop, plantSway } from './garden-art';
import type { PlazaPlot } from '../domain/progress';
import type { CropId, Point } from '../domain/types';
import type { faces } from './expression';
import type { sceneLife } from './scene-life';
import type { Location, Neighborhood, OutdoorAction } from '../domain/neighborhood-types';
import type { ActorId, World } from '../domain/types';

type Container = Phaser.GameObjects.Container;
/** What the outdoor painting reads from the scene, always current. */
export interface OutdoorView {
  scene: Phaser.Scene; ready: () => boolean; town: () => Neighborhood | null; world: () => World; selected: () => ActorId;
  figures: () => Container[]; faces: () => ReturnType<typeof faces>; ambient: () => ReturnType<typeof sceneLife>;
  mark: (key: string, value: string) => void;
}
/** The place behind the figures (the street with its sky and plaza, or a room with its exit), doors and the plaza swing. */
export function sceneOutdoor(view: OutdoorView) {
  const swing = swingMotion();
  let sky: ReturnType<typeof drawStreet> | null = null;
  function exitDoor(town: Neighborhood | null) {
    const location = town?.location;
    const building = location?.kind === 'interior' ? town!.buildings.find(b => b.id === location.building) : undefined;
    if (!building || location?.kind !== 'interior') return;
    if (building.entry === location.room) drawExit(view.scene);
    drawPassages(view.scene, building.layout, location.room);
  }
  /** Lot 8A: across a floor edge the figure walks on, legs moving, past the room's side to `x` (a fade with reduced motion), then `done`. */
  function walkOff(id: ActorId, x: number, done: () => void, from?: number) {
    const figure = view.figures().find(f => f.name === id); if (!figure) { done(); return; }
    if (from !== undefined) figure.x = from; // dropped on the edge: she leaves from where she was let go, not from her old spot
    const step = stroll({ x: figure.x, y: figure.y }, { x, y: figure.y }, 0, reducedMotion());
    view.ambient().strolls.start(view.figures(), [{ actor: id, point: { x, y: figure.y } }]);
    view.mark('door', 'edge');
    view.scene.tweens.addCounter({ duration: step.duration, onComplete: () => { view.mark('door', ''); done(); } });
  }
  /** A touch on the swing (or its rider, or sitting down on it): a push, and the rider laughs. */
  function push(rider: ActorId) { view.faces().trigger(rider, 'laugh', performance.now(), 900); swing.push(performance.now(), reducedMotion()); }
  return {
    swing, push,
    paint(state: World, selected: ActorId) {
      const town = view.town();
      sky = state.streetWidth && town ? drawStreet(view.scene, town, selected) : null;
      if (!sky) { drawRoom(view.scene, state); exitDoor(town); }
    },
    /** A new place: the door just come through swings, and `walker` (if they came along) walks out of its doorway. */
    arrive(previous: Location, walker?: ActorId) {
      view.faces().trigger(view.selected(), 'surprise', performance.now()); const town = view.town(); if (!view.ready() || !town) return;
      doorEffect(view.scene, town, previous); const sill = walker && doorStep(town, previous); if (sill) view.ambient().strolls.emerge(view.figures(), walker, sill);
    },
    /** The plaza garden's answers: `redraw` only the garden layer (the clock moved a plant), or play a planting, sway, harvest or full basket. */
    garden: {
      redraw() { const town = view.town(); if (view.ready() && sky && town) drawGarden(view.scene, town); },
      planted(plot: PlazaPlot) { if (view.ready()) plantPop(view.scene, plot); },
      sway(plot: PlazaPlot) { if (view.ready()) plantSway(view.scene, plot); },
      harvested(plot: PlazaPlot, crop: CropId, amount: number) { if (view.ready()) harvestFlight(view.scene, plot, crop, amount); },
      full() { if (view.ready()) basketWobble(view.scene); },
    },
    /** `soil` (watering a plot): where the drops land. */
    reaction(action: OutdoorAction, facing: 1 | -1 = 1, soil?: Point) {
      if (action.target === 'swing') push(action.actor);
      const rider = view.world().actors.find(a => a.id === action.actor), figure = view.figures().find(f => f.name === action.actor);
      if (rider && (action.target === 'swing' || action.target === 'bench')) { if (figure) view.scene.tweens.killTweensOf(figure); view.ambient().strolls.climb(rider.id, { x: rider.x, y: rider.y }); }
      const town = view.town(); if (view.ready() && town) outdoorEffect(view.scene, town, action, facing, soil);
    },
    /** Through the door to `destination`: it opens and the figure fades into the doorway, then `done` (at most 240 ms, nothing held). */
    enterDoor(id: ActorId, destination: Location, done: () => void, from?: number) {
      const town = view.town();
      if (!view.ready() || !town) { done(); return; }
      const edge = doorTo(town, destination);
      if (edge?.kind === 'edge') walkOff(id, edge.sill.x, done, from);
      else enterDoor(view.scene, town, () => view.figures().find(f => f.name === id), destination, done);
    },
    /** This frame of the sky and the swing rig, after the figures. */
    frame(time: number, reduced: boolean) {
      sky?.(time, reduced); (view.scene.children.getByName('swing-rig') as Container | null)?.setRotation(swing.angle());
      if (sky) { view.mark('swing', swing.amplitude().toFixed(2)); view.mark('swingAngle', swing.angle().toFixed(2)); }
    },
  };
}
