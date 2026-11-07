import type Phaser from 'phaser';
import type { RoomId } from '../domain/types';
type Figure = Phaser.GameObjects.Container | Phaser.GameObjects.Image;
export function captureMotion(scene: Phaser.Scene, figures: Figure[], objects: Figure[], room: RoomId) {
  const before = new Map([...figures, ...objects].map(f => [f.name, { x: f.x, y: f.y }]));
  return (nextFigures: Figure[], nextObjects: Figure[], nextRoom: RoomId) => {
    if (room !== nextRoom || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    [...nextFigures, ...nextObjects].forEach(figure => {
      const previous = before.get(figure.name);
      if (!previous || (previous.x === figure.x && previous.y === figure.y)) return;
      const target = { x: figure.x, y: figure.y };
      figure.setPosition(previous.x, previous.y);
      scene.tweens.add({ targets: figure, ...target, duration: 140, ease: 'Sine.Out' });
    });
  };
}
