import type { Item, ItemKind } from './types';
export function itemKind(item: Item): ItemKind { return item.kind ?? item.id as ItemKind; }
