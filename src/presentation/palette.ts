// Color tokens shared by the canvas and the CSS `:root` (see style.css).
export const palette = {
  ink: '#343c53', paper: '#faf5e9', card: '#fffdf7',
  outline: '#786c62', actorOutline: '#715e58',
  coral: '#e8735a', sun: '#f2b630', turquoise: '#2ba8a0', leaf: '#6dae4f', cobalt: '#3f6fc4', lilac: '#9b7bd0',
  plum: '#79507c', moss: '#52665e', chalk: '#455c60', signBg: '#f7f1db', bubbleBg: '#fff9dd', labelBg: '#fff1d1', labelInk: '#71452e',
} as const;
export type PaletteToken = keyof typeof palette;
const cssName = (token: string) => token.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
export const cssTokens: Record<string, string> = Object.fromEntries(Object.entries(palette).map(([k, v]) => [cssName(k), v]));
export const hex = (token: PaletteToken) => Number.parseInt(palette[token].slice(1), 16);
