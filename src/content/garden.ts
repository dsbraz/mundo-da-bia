import type { PlazaPlot } from '../domain/progress';
import type { CropId } from '../domain/types';
import { ingredientNames } from './kitchen';

/** Names for screen readers only: the garden is played by picture. No digits: the plots go by where they are. */
export const gardenText = {
  plots: { 'praca-1': 'Canteiro de trás, à esquerda', 'praca-2': 'Canteiro de trás, à direita', 'praca-3': 'Canteiro da frente, à esquerda',
    'praca-4': 'Canteiro da frente, à direita' } satisfies Record<PlazaPlot, string>,
  can: 'Regador da praça', bag: 'Saco de sementes', close: 'Fechar o saco de sementes',
  seed: (crop: CropId) => `Plantar ${ingredientNames[crop].toLowerCase()}`,
};
/** Said when the basket already holds 6 of the kind (§3.3): the plant stays ready, nothing is lost. */
export const fullBasketLine = 'Cesta cheia! Vamos cozinhar?';
