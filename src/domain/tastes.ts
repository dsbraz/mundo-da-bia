import type { ActorId, ItemKind } from './types';
import type { RecipeId, SpecialId } from './progress';

/** What a character leaves at the bakery the first time it gets its favourite there: an item, a special ingredient or, for the Bia,
 *  the striped awning on the bakery's façade (drawn from `progress.favorites`, not an item). */
export type Gift = ItemKind | SpecialId | 'toldo';
/** How much faster than the base rate (§3.1) a need grows for this character; absent is ×1. */
export type Pace = Partial<Record<'fome' | 'sono' | 'tedio', number>>;
/** What a character plays (W3L-13): the rope and the hopscotch games, watering the garden, a ball, the swing, the piano, the TV. */
export type Game = 'corda' | 'amarelinha' | 'regar' | 'bola' | 'balanco' | 'piano' | 'tv';
/** `game` is the favourite one (it relieves −70 with joy, any other game −40). */
export interface Taste { favorite: RecipeId; gift: Gift; game: Game; pace?: Pace }
const cat: Pace = { sono: 1.5, fome: 0.8 };
/** Table 3.4, with the rhythms of the wave 3 life table (§3.1): Léo sleeps early, Rui gets bored first, cats sleep a lot and eat little. The Bia's favourite is batata frita (the family's choice; pastel is her second taste, only in her lines). Nobody else shares it. */
export const tastes: Record<ActorId, Taste> = {
  bia: { favorite: 'batata-frita', gift: 'toldo', game: 'corda' },
  luna: { favorite: 'pizza', gift: 'estetoscopio', game: 'amarelinha' },
  leo: { favorite: 'bolo-de-cenoura', gift: 'regador', game: 'regar', pace: { sono: 1.2 } },
  rui: { favorite: 'pipoca', gift: 'cesta', game: 'bola', pace: { tedio: 1.4 } },
  mimi: { favorite: 'petisco-de-gato', gift: 'curativo', game: 'bola', pace: cat },
  nino: { favorite: 'leite-batidinho', gift: 'lanterna', game: 'bola', pace: cat },
  pipoca: { favorite: 'ovo-mexido', gift: 'mel', game: 'bola', pace: cat },
};
