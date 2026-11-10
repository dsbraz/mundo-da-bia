import type Phaser from 'phaser';
import { doorEffect, enterDoor } from './door-effect';
import { doorStep } from './neighborhood-doors';
import { outdoorEffect } from './outdoor-effects';
import { drawStreet, drawExit } from './street';
import { drawRoom } from './room';
import { swingMotion } from './swing-motion';
import { reducedMotion } from './motion';
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
    if (location?.kind === 'interior' && town!.buildings.find(b => b.id === location.building)?.entry === location.room) drawExit(view.scene);
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
    reaction(action: OutdoorAction) {
      if (action.target === 'swing') push(action.actor);
      const rider = view.world().actors.find(a => a.id === action.actor), figure = view.figures().find(f => f.name === action.actor);
      if (rider && (action.target === 'swing' || action.target === 'bench')) { if (figure) view.scene.tweens.killTweensOf(figure); view.ambient().strolls.climb(rider.id, { x: rider.x, y: rider.y }); }
      const town = view.town(); if (view.ready() && town) outdoorEffect(view.scene, town, action);
    },
    /** Through the door to `destination`: it opens and the figure fades into the doorway, then `done` (at most 240 ms, nothing held). */
    enterDoor(id: ActorId, destination: Location, done: () => void) {
      const town = view.town();
      if (view.ready() && town) enterDoor(view.scene, town, () => view.figures().find(f => f.name === id), destination, done); else done();
    },
    /** This frame of the sky and the swing rig, after the figures. */
    frame(time: number, reduced: boolean) {
      sky?.(time, reduced); (view.scene.children.getByName('swing-rig') as Container | null)?.setRotation(swing.angle());
      if (sky) { view.mark('swing', swing.amplitude().toFixed(2)); view.mark('swingAngle', swing.angle().toFixed(2)); }
    },
  };
}
