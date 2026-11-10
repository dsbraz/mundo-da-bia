/** Where the plaza's solid things stand on the street floor (feet coordinates, with room for a body around them), so walks go
 *  around them: the bench, the two swing posts and the flowerbed. Drawn in `plaza-art.ts`; the domain does not know them. */
export const plazaObstacles = [
  { name: 'bench', left: 112, right: 248, top: 430, bottom: 458 },
  { name: 'swing-left', left: 328, right: 352, top: 430, bottom: 452 },
  { name: 'swing-right', left: 448, right: 472, top: 430, bottom: 452 },
  { name: 'flowerbed', left: 508, right: 638, top: 430, bottom: 480 },
] as const;
