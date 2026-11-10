import type Phaser from 'phaser';
import type { RoomId } from '../domain/types';
import { reducedMotion, reducedFadeMs } from './motion';
import { bounceOnce } from './weight';
type Figure = Phaser.GameObjects.Container | Phaser.GameObjects.Image;
export function captureMotion(scene: Phaser.Scene, figures: Figure[], objects: Figure[], room: RoomId) {
  const poses = new Map(figures.map(f => [f.name, poseValues(f)]));
  const before = new Map([...figures, ...objects].map(f => [f.name, { x: f.x, y: f.y }]));
  /** `landing`: the object just let go on the floor or a surface, which falls `fall` px and bounces once (fades in with reduced motion). */
  return (nextFigures: Figure[], nextObjects: Figure[], nextRoom: RoomId, landing: { name: string; fall: number } | null = null) => {
    if (room !== nextRoom) return;
    const dropped = landing && nextObjects.find(o => o.name === landing.name);
    if (dropped && reducedMotion()) landed(scene, dropped.name, { targets: dropped, alpha: { from: .3, to: 1 }, duration: reducedFadeMs });
    if (reducedMotion()) return;
    nextFigures.forEach(f => {
      const previous = poses.get(f.name), pose = poseOf(f);
      if (previous && pose) { pose.setData('restingAngle', previous.angle); pose.setData('seatAmount', previous.seat); }
    });
    [...nextFigures, ...nextObjects].forEach(figure => {
      const previous = before.get(figure.name);
      if (figure === dropped) { fall(scene, figure, previous ?? figure, landing!.fall); return; }
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
function fall(scene: Phaser.Scene, figure: Figure, from: { x: number; y: number }, height: number) {
  const target = { x: figure.x, y: figure.y };
  figure.setPosition(from.x, Math.min(from.y, target.y) - height);
  scene.tweens.add({ targets: figure, x: target.x, duration: 200, ease: 'Sine.Out' });
  landed(scene, figure.name, { targets: figure, y: target.y, duration: 380, ease: bounceOnce });
}
/** `data-landing` names the object while it falls (or fades in). */
function landed(scene: Phaser.Scene, name: string, tween: Phaser.Types.Tweens.TweenBuilderConfig) {
  scene.game.canvas.dataset.landing = name;
  scene.tweens.add({ ...tween, onComplete: () => { if (scene.game.canvas.dataset.landing === name) scene.game.canvas.dataset.landing = ''; } });
}
