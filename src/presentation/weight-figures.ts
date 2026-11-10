import type Phaser from 'phaser';
import type { Actor, ActorId } from '../domain/types';
import { carryFrame, dropFrame, trackCarry, type CarryTrack } from './weight';

type Container = Phaser.GameObjects.Container;
/** Who the finger carries and who was just let go, kept over repaints (the save only knows where they end). */
export function weightFigures() {
  let carried: { id: ActorId; track: CarryTrack } | null = null;
  const drops = new Map<ActorId, number>();
  return {
    /** Each preview of a moving figure: carried by the finger, walking (nothing to do) or, without `id`, let go. */
    follow(id: ActorId | null, point: { x: number } | null, carry: boolean, now: number) {
      if (id && point && carry) carried = { id, track: trackCarry(carried?.id === id ? carried.track : undefined, now, point.x) };
      else if (!id && carried) { drops.set(carried.id, now); carried = null; }
    },
    carrying: (id: ActorId) => carried?.id === id,
    /** Layers this frame's carry or drop on the posed figure; returns 'carried', 'drop' or ''. */
    pose(pose: Container, actor: Actor, now: number, scale: number, reduced: boolean): string {
      if (carried?.id === actor.id) {
        const frame = carryFrame(now, carried.track.speed, scale, reduced);
        pose.y -= frame.lift; pose.rotation += frame.lean;
        pose.getByName<Container>('knees')?.list.forEach(part => { const leg = part as Phaser.GameObjects.Image; leg.x = frame.legs[Number(leg.getData('side'))]!; });
        return 'carried';
      }
      const start = drops.get(actor.id); if (start === undefined) return '';
      const frame = dropFrame(now - start, scale, reduced);
      if (frame.done) { drops.delete(actor.id); return ''; }
      pose.y -= frame.lift; pose.setScale(pose.scaleX * (1 - frame.squash / 2), pose.scaleY * (1 + frame.squash));
      return 'drop';
    },
  };
}
