export const plazaWidth = 660;
export const plotWidth = 440;
export const plotStart = (plot: number) => plazaWidth + plot * plotWidth;
export const streetWidth = (plots: number) => plazaWidth + plots * plotWidth;
export const plotAt = (x: number) => Math.floor((x - plazaWidth) / plotWidth);
export const floorOf = (cell: number) => Math.floor(cell / 4);
