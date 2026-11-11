import { utensils } from './ingredients';
import { known, recipes, secretRecipes } from './recipes';
import type { Ingredient, Recipe, Utensil } from './recipes';
import type { Progress, RecipeId } from './progress';

/** One recipe as the book shows it: the coloured dish with every ingredient, or the silhouette with one clue (all of them once a
 *  letter card revealed it); `fancy` puts the ribbon on. */
export interface BookEntry { recipe: RecipeId; utensil: Utensil; known: boolean; fancy: boolean; ingredients: Ingredient[] }
/** A page per utensil, plus the secrets page once the first secret is found. No counts anywhere (pillar 5). */
export interface BookPage { id: Utensil | 'segredos'; entries: BookEntry[] }

const uses = (ingredient: Ingredient) => recipes.filter(r => r.ingredients.includes(ingredient)).length;
/** The clue on a silhouette: the recipe's rarest ingredient (the first one on a tie), the one that says the most. */
export function clue(recipe: Recipe): Ingredient {
  return recipe.ingredients.reduce((best, next) => uses(next) < uses(best) ? next : best);
}
function entry(progress: Progress, recipe: Recipe): BookEntry {
  const seen = known(progress, recipe.id), all = seen || progress.revealed.includes(recipe.id);
  return { recipe: recipe.id, utensil: recipe.utensil, known: seen, fancy: seen && progress.fancy.includes(recipe.id), ingredients: all ? [...recipe.ingredients] : [clue(recipe)] };
}
export function bookPages(progress: Progress): BookPage[] {
  const open = recipes.filter(r => !secretRecipes.includes(r.id));
  const pages: BookPage[] = utensils.map(id => ({ id, entries: open.filter(r => r.utensil === id).map(r => entry(progress, r)) }));
  const secrets = recipes.filter(r => secretRecipes.includes(r.id) && known(progress, r.id));
  return secrets.length ? [...pages, { id: 'segredos', entries: secrets.map(r => entry(progress, r)) }] : pages;
}
