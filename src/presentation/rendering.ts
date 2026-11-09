import type Phaser from 'phaser';
// Two samples per scene pixel keep thin SVG strokes clear on tablet screens.
export const rasterScale = 2;
export function loadSvg(scene: Phaser.Scene, key: string, source: string) {
  if (!scene.textures.exists(key)) scene.load.svg(key, source, { scale: rasterScale });
}
export function logicalWidth(scene: Phaser.Scene) { return Number(scene.game.canvas.dataset.logicalWidth ?? scene.scale.width / rasterScale); }
