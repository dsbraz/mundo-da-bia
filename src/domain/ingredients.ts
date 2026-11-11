import { specialIds } from './progress';
import type { SpecialId } from './progress';
import { cropIds } from './types';
import type { CropId } from './types';

/** Always in the pantry (§3.1); none of them is ever used up or saved. */
export const basics = ['farinha', 'ovo', 'leite', 'acucar', 'pao', 'queijo', 'peixe', 'batata', 'oleo'] as const;
export type Basic = typeof basics[number];
export type Ingredient = Basic | CropId | SpecialId;
/** The 18 ingredients: basics, crops from the garden and specials. */
export const ingredientIds: readonly Ingredient[] = [...basics, ...cropIds, ...specialIds];
export const utensils = ['tabua', 'panela', 'forno', 'liquidificador'] as const;
export type Utensil = typeof utensils[number];
