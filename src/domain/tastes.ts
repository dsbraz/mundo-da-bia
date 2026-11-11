import type { ActorId, ItemKind } from './types';
import type { RecipeId, SpecialId } from './progress';

/** What a character leaves at the bakery the first time it gets its favourite there: an item, a special ingredient or, for the Bia,
 *  the striped awning on the bakery's façade (drawn from `progress.favorites`, not an item). */
export type Gift = ItemKind | SpecialId | 'toldo';
export interface Taste { favorite: RecipeId; gift: Gift }
/** Table 3.4. The Bia's favourite is batata frita (the family's choice; pastel is her second taste, only in her lines). Nobody else shares it. */
export const tastes: Record<ActorId, Taste> = {
  bia: { favorite: 'batata-frita', gift: 'toldo' },
  luna: { favorite: 'pizza', gift: 'estetoscopio' },
  leo: { favorite: 'bolo-de-cenoura', gift: 'regador' },
  rui: { favorite: 'pipoca', gift: 'cesta' },
  mimi: { favorite: 'petisco-de-gato', gift: 'curativo' },
  nino: { favorite: 'leite-batidinho', gift: 'lanterna' },
  pipoca: { favorite: 'ovo-mexido', gift: 'mel' },
};
