import type Phaser from 'phaser';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { ActorId } from '../domain/types';
import { outdoorTargets } from './outdoor-controls';
import { hex } from './palette';

export const glowDistance = 220;
/** Plaza spots the selected actor can reach soon: a soft warm glow on the ground under each one. */
export function nearbyHotspots(town: Neighborhood, selected: ActorId) {
  const actor = town.actors.find(a => a.id === selected && a.location.kind === 'street');
  return actor ? outdoorTargets(town, selected).filter(t => Math.abs(t.point.x - actor.x) <= glowDistance) : [];
}
export function drawPlazaGlow(scene: Phaser.Scene, town: Neighborhood, selected: ActorId) {
  const g = scene.add.graphics().setName('plaza-glow');
  nearbyHotspots(town, selected).forEach(t => {
    g.fillStyle(hex('sun'), .16).fillEllipse(t.point.x, t.point.y + 8, 120, 34);
    g.fillStyle(hex('sun'), .14).fillEllipse(t.point.x, t.point.y + 8, 76, 20);
  });
}
