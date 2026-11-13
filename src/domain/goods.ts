import { basics } from './ingredients';
import type { Basic } from './ingredients';
import { specialIds } from './progress';
import type { SpecialId } from './progress';
import { cropIds } from './types';
import type { CropId } from './types';

/** A seed packet sold at the market (§3.4): planting it is how a new crop starts. */
export type Seed = `semente-${CropId}`;
/** What the market sells: the basics, the specials and the seed packets. Never a price. */
export type Good = Basic | SpecialId | Seed;
export const seedGoods: readonly Seed[] = cropIds.map(crop => `semente-${crop}` as const);
export const goodIds: readonly Good[] = [...basics, ...specialIds, ...seedGoods];
