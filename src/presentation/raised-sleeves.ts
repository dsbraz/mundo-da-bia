import type Phaser from 'phaser';

type Image = Phaser.GameObjects.Image;
type Container = Phaser.GameObjects.Container;
/** A child's garment (texture pixels of the 280 × 440 raster): its sleeves are what lies beside the torso (columns 0-80 and 200-280)
 *  from the shoulder (row 192) down at most to row 316; the torso is the middle columns. Every child look keeps its sleeves there. */
export const sleeveBand = { top: 192, bottom: 316, left: 80, right: 200, width: 280 } as const;
/** Where a garment's sleeves end (lot 8 polish): just below the lowest row with cloth out at the band's sides (columns that only a
 *  sleeve reaches, never a dress's side). From there down the garment is drawn whole, so a dress's side never loses its outline at the
 *  waist (the notch with the arms up). `alpha` reads the garment's texture. */
export function sleeveHem(alpha: (x: number, y: number) => number): number {
  const { top, bottom, left, width } = sleeveBand;
  for (let y = bottom; y > top; y -= 2) {
    for (let x = 0; x < left - 10; x += 4) if (alpha(x, y) > 32 || alpha(width - 1 - x, y) > 32) return Math.min(bottom, y + 4);
  }
  return top;
}
/** Which sleeves a child's garment shows: as drawn, both turned up with the arms, or in a hug (lot 8 polish) all but the one on the
 *  partner's side (1 right, -1 left), whose arm goes round the other wearing its own sleeve (`hug-embrace`). */
export type SleeveState = 'down' | 'up' | 1 | -1;
const stateOf = (raised: boolean, hugSide: number): SleeveState => raised ? 'up' : hugSide > 0 ? 1 : hugSide < 0 ? -1 : 'down';
type Rect = [number, number, number, number];
/** The crops (texture pixels, as `setCrop` takes them) of the garment, of its torso copy and of its two sleeve copies (null: hidden) in
 *  `state`, for a garment `height` tall cut at `knee` whose sleeves end at `hem`. Arms up, the garment keeps what is below the sleeves,
 *  the copy is the torso above them and the sleeves are drawn upside down (`flip`, about the drawing's middle row like the arms; Phaser
 *  mirrors a flipped image's crop, so their rows are given where they show). In a hug, only the sleeve away from the partner hangs. */
export function sleeveCrops(state: SleeveState, knee: number, hem: number, height: number) {
  const { top, left, right, width } = sleeveBand, rows = hem - top;
  const parts = { garment: [0, hem, width, knee - hem] as Rect, torso: [left, 0, right - left, hem] as Rect, flip: state === 'up' };
  if (state === 'down') return { garment: [0, 0, width, knee] as Rect, torso: null, sleeves: [null, null] as (Rect | null)[], flip: false };
  if (state === 'up') return { ...parts, sleeves: [[0, height - hem, left, rows], [right, height - hem, width - right, rows]] as (Rect | null)[] };
  return { ...parts, sleeves: (state > 0 ? [[0, top, left, rows], null] : [null, [right, top, width - right, rows]]) as (Rect | null)[] };
}
const hems = new Map<string, number>();
/** The garment texture's `sleeveHem`, read once per texture. */
function hemOf(scene: Phaser.Scene, key: string): number {
  const known = hems.get(key); if (known !== undefined) return known;
  const image = scene.textures.get(key).getSourceImage() as HTMLImageElement, canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const g = canvas.getContext('2d')!; g.drawImage(image, 0, 0);
  const data = g.getImageData(0, 0, image.width, image.height).data, hem = sleeveHem((x, y) => data[(y * image.width + x) * 4 + 3]!);
  hems.set(key, hem);
  return hem;
}
/** Lot 8B: a child's sleeves go up with its arms. Beside the garment (`outfit`, already cropped at the knee) it adds, hidden, a copy for
 *  the torso and one for each sleeve; `raiseSleeves` shows them while the arms are up or in a hug. */
export function addRaisedSleeves(scene: Phaser.Scene, pose: Container, outfit: Image, knee: number) {
  const copy = (name: string) => scene.add.image(0, 0, outfit.texture.key)
    .setDisplaySize(outfit.displayWidth, outfit.displayHeight).setOrigin(.5, 1).setName(name).setVisible(false);
  // Phaser's canvas renderer only places a flipped crop right about the image's centre, so the sleeves hang from it.
  const sleeves = [0, 1].map(side => copy(`raised-sleeve-${side}`).setOrigin(.5).setY(-outfit.displayHeight / 2));
  pose.addAt([copy('raised-torso'), ...sleeves], pose.getIndex(outfit) + 1);
  pose.setData('outfit', { name: outfit.name, knee, hem: hemOf(scene, outfit.texture.key) });
}
/** Arms up (`raised`) or hugging on `hugSide`: the garment and its copies show that state's sleeves; otherwise back as drawn. */
export function raiseSleeves(pose: Container, raised: boolean, hugSide = 0) {
  const outfit = pose.getData('outfit') as { name: string; knee: number; hem: number } | undefined;
  const garment = outfit && pose.getByName<Image>(outfit.name), state = stateOf(raised, hugSide);
  if (!outfit || !garment || pose.getData('sleeves') === state) return;
  pose.setData('sleeves', state);
  const crops = sleeveCrops(state, outfit.knee, outfit.hem, garment.height);
  garment.setCrop(...crops.garment);
  show(pose.getByName<Image>('raised-torso'), crops.torso);
  crops.sleeves.forEach((crop, side) => show(pose.getByName<Image>(`raised-sleeve-${side}`).setFlipY(crops.flip), crop));
}
const show = (image: Image, crop: Rect | null) => { image.setVisible(!!crop); if (crop) image.setCrop(...crop); };
