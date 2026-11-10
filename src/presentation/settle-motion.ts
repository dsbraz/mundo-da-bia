import type Phaser from 'phaser';
import type { RoomId } from '../domain/types';
import { reducedMotion } from './motion';
type Figure = Phaser.GameObjects.Container | Phaser.GameObjects.Image;
export function captureMotion(scene: Phaser.Scene, figures: Figure[], objects: Figure[], room: RoomId) {
  const poses = new Map(figures.map(f => [f.name, poseValues(f)]));
  const before = new Map([...figures, ...objects].map(f => [f.name, { x: f.x, y: f.y }]));
  return (nextFigures: Figure[], nextObjects: Figure[], nextRoom: RoomId) => {
    if (room !== nextRoom || reducedMotion()) return;
    nextFigures.forEach(f => {
      const previous = poses.get(f.name), pose = poseOf(f);
      if (previous && pose) { pose.setData('restingAngle', previous.angle); pose.setData('seatAmount', previous.seat); }
    });
    [...nextFigures, ...nextObjects].forEach(figure => {
      const previous = before.get(figure.name);
      if (!previous || (previous.x === figure.x && previous.y === figure.y)) return;
      const target = { x: figure.x, y: figure.y };
      figure.setPosition(previous.x, previous.y);
      scene.tweens.add({ targets: figure, ...target, duration: 140, ease: 'Sine.Out' });
    });
  };
}

function poseOf(figure: Figure) {
  return 'getByName' in figure ? figure.getByName<Phaser.GameObjects.Container>('pose') : null;
}
function poseValues(figure: Figure) {
  const pose = poseOf(figure);
  return pose ? { angle: pose.getData('restingAngle') ?? 0, seat: pose.getData('seatAmount') ?? 0 } : null;
}
