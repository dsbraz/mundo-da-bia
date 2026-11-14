import type Phaser from 'phaser';

type Image = Phaser.GameObjects.Image;
type Container = Phaser.GameObjects.Container;
/** A child's garment (texture pixels of the 280 × 440 raster): its sleeves are what lies beside the torso (columns 0-80 and 200-280)
 *  from the shoulder (row 192) down to row 316; the torso is the middle columns above that row. Every child look keeps its sleeves there. */
export const sleeveBand = { top: 192, bottom: 316, left: 80, right: 200, width: 280 } as const;
/** The crops (texture pixels) of the raised arms' pieces: the torso without its sleeves and each sleeve, as `setCrop` takes them. A
 *  sleeve is drawn upside down (`flipY`, about the drawing's middle row like the arms), and Phaser mirrors a flipped image's crop, so its
 *  rows are given where they show. */
export function raisedCrops(height: number) {
  const { top, bottom, left, right, width } = sleeveBand, rows = bottom - top;
  return {
    torso: { x: left, y: 0, width: right - left, height: bottom },
    sleeves: [{ x: 0, y: height - bottom, width: left, height: rows }, { x: right, y: height - bottom, width: width - right, height: rows }],
  };
}
/** Lot 8B: a child's sleeves go up with its arms. Beside the garment (`outfit`, already cropped at the knee) it adds, hidden, the torso
 *  without sleeves and both sleeves turned up; `raiseSleeves` shows them while the arms are up. */
export function addRaisedSleeves(scene: Phaser.Scene, pose: Container, outfit: Image, knee: number) {
  const crops = raisedCrops(outfit.height), copy = (name: string) => scene.add.image(0, 0, outfit.texture.key)
    .setDisplaySize(outfit.displayWidth, outfit.displayHeight).setOrigin(.5, 1).setName(name).setVisible(false);
  const torso = copy('raised-torso').setCrop(crops.torso.x, crops.torso.y, crops.torso.width, crops.torso.height);
  // Phaser's canvas renderer only places a flipped crop right about the image's centre, so the sleeves hang from it.
  const sleeves = crops.sleeves.map((c, side) => copy(`raised-sleeve-${side}`).setOrigin(.5).setY(-outfit.displayHeight / 2).setFlipY(true)
    .setCrop(c.x, c.y, c.width, c.height));
  pose.addAt([torso, ...sleeves], pose.getIndex(outfit) + 1);
  pose.setData('outfit', { name: outfit.name, knee });
}
/** Arms up: the garment keeps only what is below its sleeves, the sleeveless torso and the raised sleeves show; down, back as drawn. */
export function raiseSleeves(pose: Container, raised: boolean) {
  const outfit = pose.getData('outfit') as { name: string; knee: number } | undefined;
  const garment = outfit && pose.getByName<Image>(outfit.name);
  if (!outfit || !garment || pose.getByName<Image>('raised-torso').visible === raised) return;
  const { bottom, width } = sleeveBand;
  if (raised) garment.setCrop(0, bottom, width, outfit.knee - bottom); else garment.setCrop(0, 0, width, outfit.knee);
  for (const name of ['raised-torso', 'raised-sleeve-0', 'raised-sleeve-1']) pose.getByName<Image>(name).setVisible(raised);
}
