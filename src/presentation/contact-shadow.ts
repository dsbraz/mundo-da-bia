import type Phaser from 'phaser';
/** Contact shadow from the style guide: a flat ellipse at alpha 0.2 and a smaller core that darkens the centre. */
export function shadowLayers(width: number, height: number) {
  return [{ width, height, alpha: .2 }, { width: width * .55, height: height * .6, alpha: .16 }];
}
export function contactShadow(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color: number) {
  return scene.add.container(x, y, shadowLayers(width, height).map(l => scene.add.ellipse(0, 0, l.width, l.height, color, l.alpha))).setName('shadow');
}
