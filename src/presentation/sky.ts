import type Phaser from 'phaser';
/** Living street sky, drawn only: clouds drifting, tree crowns swaying and a bird now and then. Everything is a pure function of time,
 *  so repaints do not jump, and all of it stands still with reduced motion. */
const period = 480, drift = .006, sway = 1.5 * Math.PI / 180, flight = 6000;
export const birdPeriod = 14000;
export function cloudShift(time: number, reduced: boolean) { return reduced ? 0 : (time * drift) % period; }
export function crownSway(time: number, tree: number, reduced: boolean) { return reduced ? 0 : sway * Math.sin(time / 1700 + tree * 1.3); }
export interface View { x: number; y: number; width: number }
/** The world rectangle the canvas shows, as the viewport writes it on the canvas. */
export function shownView(data: DOMStringMap): View {
  return { x: Number(data.viewX ?? 0) + Number(data.cameraX ?? 0), y: Number(data.viewY ?? 0), width: Number(data.viewWidth ?? 1000) };
}
/** The bird crosses the visible view near its top in the last 6 s of every 14 s; `flap` swings its wings. */
export function birdAt(time: number, view: View, reduced: boolean) {
  const into = time % birdPeriod - (birdPeriod - flight);
  if (reduced || into < 0) return null;
  const u = into / flight;
  return { x: view.x - 40 + (view.width + 80) * u, y: view.y + 48 + 12 * Math.sin(u * Math.PI * 6), flap: Math.sin(time / 90) || 1 };
}

type Graphics = Phaser.GameObjects.Graphics;
/** Clouds and crowns of the street backdrop as their own layers (same look as before when still); returns the frame animator. */
export function drawSky(scene: Phaser.Scene, width: number) {
  const clouds = scene.add.graphics().setName('sky-clouds'), crowns: Graphics[] = [];
  for (let x = -720; x < width + period; x += period) clouds.fillStyle(0xffffff, .5).fillEllipse(x + 140, 135, 160, 28).fillEllipse(x + 120, 123, 75, 36);
  for (let x = -240; x < width; x += period) crowns.push(scene.add.graphics({ x: x + 410, y: 335 }).fillStyle(0xb5c9a4).fillEllipse(0, -30, 75, 60));
  return { clouds, crowns };
}
export function skyAnimator(scene: Phaser.Scene, sky: { clouds: Graphics; crowns: Graphics[] }) {
  let bird: Graphics | null = null;
  return (time: number, reduced: boolean) => {
    if (!sky.clouds.active) return;
    const view = shownView(scene.game.canvas.dataset);
    const shift = cloudShift(time, reduced), at = birdAt(time, view, reduced);
    sky.clouds.x = shift;
    sky.crowns.forEach((crown, i) => crown.setRotation(crownSway(time, i, reduced)));
    bird ??= scene.add.graphics().setDepth(4).setName('bird');
    bird.clear();
    if (at) bird.lineStyle(2.5, 0x6d7a80).beginPath().moveTo(at.x - 9, at.y - 5 * at.flap).lineTo(at.x, at.y).lineTo(at.x + 9, at.y - 5 * at.flap).strokePath();
    scene.game.canvas.dataset.sky = `${shift.toFixed(1)},${crownSway(time, 0, reduced).toFixed(4)},${at ? Math.round(at.x) : '-'}`;
  };
}
