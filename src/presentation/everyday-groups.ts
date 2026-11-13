import type { PieceKind } from '../domain/types';
export const everydayGroups: Record<string, readonly PieceKind[]> = {
  living: ['sofa', 'chair', 'lamp', 'table', 'rug', 'picture', 'cushion', 'tv', 'aquarium', 'armchair', 'reading-lamp', 'side-table', 'shelf', 'bookcase'],
  kitchen: ['fridge', 'counter', 'stove', 'sink', 'kitchen-cart', 'table', 'chair', 'market-shelf', 'checkout'],
  bedroom: ['bed', 'wardrobe', 'dresser', 'lamp', 'mirror', 'rug', 'cushion'],
  bathroom: ['bath', 'toilet', 'mirror', 'washer'],
  garden: ['plant', 'planter', 'picnic-table', 'cat-bed'],
  activities: ['stage', 'speaker', 'neon', 'piano', 'desk', 'shelf', 'bookcase'],
};
