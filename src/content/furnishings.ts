import type { Palette, PieceKind } from '../domain/types';
export const furnishings: Record<PieceKind, { name: string; category: 'moveis' | 'decoracao' | 'neon' }> = {
  sofa: { name: 'Sofá aconchego', category: 'moveis' }, wardrobe: { name: 'Guarda-roupa', category: 'moveis' },
  fridge: { name: 'Geladeira', category: 'moveis' }, lamp: { name: 'Abajur', category: 'moveis' },
  table: { name: 'Mesa de centro', category: 'moveis' }, stage: { name: 'Palco', category: 'neon' },
  bed: { name: 'Cama dos sonhos', category: 'moveis' }, dresser: { name: 'Cômoda', category: 'moveis' },
  'cat-bed': { name: 'Caminha dos gatos', category: 'moveis' }, rug: { name: 'Tapete', category: 'decoracao' },
  plant: { name: 'Planta', category: 'decoracao' }, picture: { name: 'Quadro constelação', category: 'decoracao' },
  cushion: { name: 'Almofada estrela', category: 'decoracao' }, neon: { name: 'Letreiro Palco Neon', category: 'neon' },
  speaker: { name: 'Caixa de som', category: 'neon' }, mirror: { name: 'Espelho de camarim', category: 'neon' },
};
export const palettes: Record<Palette, { name: string; base: string; light: string; dark: string }> = {
  original: { name: 'Original', base: '#efb491', light: '#ffdec7', dark: '#bf835e' },
  mint: { name: 'Menta', base: '#91b7a7', light: '#c8dfcf', dark: '#638e82' },
  lilac: { name: 'Lilás', base: '#b5a0cb', light: '#e2d5ee', dark: '#8d73a6' },
  rose: { name: 'Rosa', base: '#dc9bb5', light: '#f9d5e1', dark: '#b97692' },
  sky: { name: 'Azul', base: '#8db7d1', light: '#cce5ef', dark: '#668ea9' },
  gold: { name: 'Mostarda', base: '#d9b667', light: '#f9e7b2', dark: '#b58b43' },
};
