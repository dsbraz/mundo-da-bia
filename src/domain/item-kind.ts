import { itemIds, portableKinds } from './types';
import type { Item, ItemKind } from './types';
export function itemKind(item: Item): ItemKind { return item.kind ?? item.id as ItemKind; }
export { portableKinds } from './types';
/** Every kind of object this build knows. */
export const itemKinds: readonly ItemKind[] = [...itemIds, ...portableKinds];
/** What may be kept in the fridge. */
export const fridgeKinds: readonly ItemKind[] = ['lanche', 'peixe', 'prato'];
