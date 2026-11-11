import type { Location, Neighborhood, NeighborhoodItem } from './neighborhood-types';
import type { RecipeId } from './progress';
import type { ItemKind, Point } from './types';

/** A new object: a dish names its recipe (`fancy` when made fancy). */
export interface ItemSpec { kind: ItemKind; location: Location; point: Point; recipe?: RecipeId; fancy?: true }
/** The object is born loose on the floor at `point`, numbered `${nextItem}:${kind}`; a house may hold many of a kind. */
export function spawnItem(town: Neighborhood, spec: ItemSpec): Neighborhood {
  const { kind, location, point, recipe, fancy } = spec;
  const item: NeighborhoodItem = { id: `${town.nextItem}:${kind}`, kind, ...(recipe ? { recipe } : {}), ...(fancy ? { fancy } : {}),
    room: location.kind === 'interior' ? location.room : 'sala', location, x: point.x, y: point.y, holder: null, spot: 'floor' };
  return { ...town, items: [...town.items, item], nextItem: town.nextItem + 1 };
}
/** The object is used up: it leaves the world, and whoever held it has a free hand. */
export function consumeItem(town: Neighborhood, id: string): Neighborhood {
  return town.items.some(i => i.id === id) ? { ...town, items: town.items.filter(i => i.id !== id) } : town;
}
