import type { PieceKind } from '../domain/types';
export const everydayGroups: Record<string, readonly PieceKind[]> = {
  living: ['sofa', 'lamp', 'table', 'rug', 'picture', 'cushion', 'tv', 'aquarium', 'armchair', 'reading-lamp', 'side-table', 'shelf', 'bookcase'],
  kitchen: ['fridge', 'counter', 'stove', 'sink', 'kitchen-cart', 'table'],
  bedroom: ['bed', 'wardrobe', 'dresser', 'lamp', 'mirror', 'rug', 'cushion'],
  bathroom: ['bath', 'mirror', 'washer'],
  garden: ['plant', 'planter', 'picnic-table', 'cat-bed'],
  activities: ['stage', 'speaker', 'neon', 'piano', 'desk', 'shelf', 'bookcase'],
};
