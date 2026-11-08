import Phaser from 'phaser';
import type { Point } from '../domain/types';
type Crop = { x: number; y: number; width: number; height: number };
function outside(crop: Crop | undefined, x: number, y: number) {
  return crop && (x < crop.x || y < crop.y || x >= crop.x + crop.width || y >= crop.y + crop.height);
}
export function visibleHit(scene: Phaser.Scene, container: Phaser.GameObjects.Container, point: Point): boolean {
  return container.list.some(child => {
    if (!child.active || !(child as Phaser.GameObjects.Image).visible) return false;
    if (child instanceof Phaser.GameObjects.Container) return visibleHit(scene, child, point);
    if (!(child instanceof Phaser.GameObjects.Image)) return false;
    const local = child.getWorldTransformMatrix().applyInverse(point.x, point.y);
    const x = Math.floor(local.x + child.displayOriginX), y = Math.floor(local.y + child.displayOriginY);
    const crop = child.getData('hitCrop') as Crop | undefined;
    if (outside(crop, x, y)) return false;
    return (scene.textures.getPixelAlpha(x, y, child.texture.key) ?? 0) > 32;
  });
}
