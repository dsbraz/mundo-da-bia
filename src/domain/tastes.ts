import type { ActorId, ItemKind } from './types';
import type { RecipeId, SpecialId } from './progress';

/** What a character leaves at the bakery the first time it gets its favourite there: an item, a special ingredient or, for the Bia,
 *  the striped awning on the bakery's façade (drawn from `progress.favorites`, not an item). */
export type Gift = ItemKind | SpecialId | 'toldo';
/** How much faster than the base rate (§3.1) a need grows for this character; absent is ×1. */
export type Pace = Partial<Record<'fome' | 'sono' | 'tedio', number>>;
export interface Taste { favorite: RecipeId; gift: Gift; pace?: Pace }
const cat: Pace = { sono: 1.5, fome: 0.8 };
/** Table 3.4, with the rhythms of the wave 3 life table (§3.1): Léo sleeps early, Rui gets bored first, cats sleep a lot and eat little. The Bia's favourite is batata frita (the family's choice; pastel is her second taste, only in her lines). Nobody else shares it. */
export const tastes: Record<ActorId, Taste> = {
  bia: { favorite: 'batata-frita', gift: 'toldo' },
  luna: { favorite: 'pizza', gift: 'estetoscopio' },
  leo: { favorite: 'bolo-de-cenoura', gift: 'regador', pace: { sono: 1.2 } },
  rui: { favorite: 'pipoca', gift: 'cesta', pace: { tedio: 1.4 } },
  mimi: { favorite: 'petisco-de-gato', gift: 'curativo', pace: cat },
  nino: { favorite: 'leite-batidinho', gift: 'lanterna', pace: cat },
  pipoca: { favorite: 'ovo-mexido', gift: 'mel', pace: cat },
};
