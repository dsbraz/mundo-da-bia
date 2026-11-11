import type { Ingredient, Utensil } from '../domain/ingredients';
import type { RecipeId } from '../domain/progress';

/** Names for screen readers only: the bench and the book are played by picture, without reading. */
export const ingredientNames: Record<Ingredient, string> = {
  farinha: 'Farinha', ovo: 'Ovo', leite: 'Leite', acucar: 'Açúcar', pao: 'Pão', queijo: 'Queijo', peixe: 'Peixe', batata: 'Batata', oleo: 'Óleo',
  alface: 'Alface', tomate: 'Tomate', cenoura: 'Cenoura', milho: 'Milho', morango: 'Morango', abobora: 'Abóbora',
  chocolate: 'Chocolate', canela: 'Canela', mel: 'Mel',
};
export const utensilNames: Record<Utensil, string> = { tabua: 'Tábua', panela: 'Panela', forno: 'Forno', liquidificador: 'Liquidificador' };
export const dishNames: Record<RecipeId, string> = {
  sanduiche: 'Sanduíche', 'ovo-mexido': 'Ovo mexido', panqueca: 'Panqueca', 'bolo-simples': 'Bolo simples', 'leite-batidinho': 'Leite batidinho',
  torrada: 'Torrada', 'pao-de-queijo': 'Pão de queijo', biscoito: 'Biscoito', pudim: 'Pudim', 'misto-quente': 'Misto quente', pipoca: 'Pipoca',
  salada: 'Salada', 'vitamina-de-morango': 'Vitamina de morango', 'sopa-de-legumes': 'Sopa de legumes', 'bolo-de-cenoura': 'Bolo de cenoura',
  'torta-de-abobora': 'Torta de abóbora', pizza: 'Pizza', curau: 'Curau', 'suco-de-cenoura': 'Suco de cenoura', 'sanduiche-natural': 'Sanduíche natural',
  brigadeiro: 'Brigadeiro', 'bolo-de-chocolate': 'Bolo de chocolate', 'torrada-de-canela': 'Torrada de canela', 'morango-com-mel': 'Morango com mel',
  'batata-frita': 'Batata frita', pastel: 'Pastel', 'petisco-de-gato': 'Petisco de gato', 'chocolate-quente': 'Chocolate quente', 'bolo-de-mel': 'Bolo de mel',
};
export const benchText = { region: 'Bancada da cozinha', bowl: 'Tigela', close: 'Fechar a bancada', empty: 'Lugar vazio na tigela', remove: (name: string) => `Tirar ${name} da tigela` };
/** Said when a house already has 6 loose dishes (§3.2): nothing is lost. */
export const fullTableLine = 'Mesa cheia! Quem quer comer?';
