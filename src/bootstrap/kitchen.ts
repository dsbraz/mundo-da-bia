import { cook, pantry } from '../domain/recipes';
import type { Outcome } from '../domain/recipes';
import type { Ingredient, Utensil } from '../domain/ingredients';
import type { Neighborhood } from '../domain/neighborhood-types';
import { pieceBounds } from '../domain/layout';
import type { ActorId, CropId, Piece } from '../domain/types';
import { kitchenBench } from '../presentation/kitchen-bench';
import { recipeBook } from '../presentation/recipe-book';
import type { PlayScene } from '../presentation/scene';
import { fullTableLine } from '../content/kitchen';
import type { sceneFeedback } from './scene-feedback';

interface KitchenDeps {
  root: HTMLElement; town: () => Neighborhood; selected: () => ActorId; building: () => boolean;
  /** Commits a neighborhood changed by the bench (saved and drawn), outside the undo history. */
  apply: (town: Neighborhood) => void;
  scene: Pick<PlayScene, 'cooked' | 'poke'>; feedback: Pick<ReturnType<typeof sceneFeedback>, 'events' | 'refuse' | 'sound'>;
}
/** The bench of the current room's stove, counter or cart: the selected character cooks there (§3.2). */
export function kitchen(deps: KitchenDeps) {
  let piece: number | null = null;
  const book = recipeBook(deps.root, () => deps.town().progress);
  /** One thing over the scene at a time: the open tray folds away when the book opens. */
  const read = () => { const tray = deps.root.querySelector<HTMLButtonElement>('#tray-toggle'); if (tray?.getAttribute('aria-expanded') === 'true') tray.click(); void book.open(); };
  const bench = kitchenBench(deps.root, { cook: run, close, book: read });
  deps.root.querySelector('#book-toggle')!.addEventListener('click', () => { if (book.isOpen()) book.close(); else read(); });
  deps.root.querySelector('#tray-toggle')?.addEventListener('click', () => book.close());
  const current = (): Piece | undefined => {
    const where = deps.town().location;
    return where.kind === 'interior' ? deps.town().buildings.find(b => b.id === where.building)?.layout.pieces.find(p => p.id === piece && p.room === where.room) : undefined;
  };
  const stock = () => { const progress = deps.town().progress; return pantry(progress).map(id => ({ id, pile: progress.basket[id as CropId] })); };
  function open(id: number) {
    piece = id; const at = current(); if (!at) { piece = null; return; }
    deps.root.classList.add('at-bench');
    bench.open(stock(), { x: at.x + pieceBounds[at.kind].width / 2, y: at.y + pieceBounds[at.kind].height / 2 });
  }
  function close() { piece = null; deps.root.classList.remove('at-bench'); bench.close(); }
  function run(ingredients: Ingredient[], utensil: Utensil) {
    const town = deps.town(), where = town.location, at = current();
    if (!at || where.kind !== 'interior') return;
    const result = cook(town, { building: where.building, piece: at.id, cook: deps.selected(), ingredients, utensil });
    if (result.town !== town) deps.apply(result.town);
    bench.show(result.outcome); bench.refresh(stock()); answer(result.outcome, at);
  }
  function answer(outcome: Outcome, at: Piece) {
    const actor = deps.selected();
    if (outcome.kind === 'dish') { deps.scene.cooked(at, outcome.item); deps.feedback.events([{ type: 'cooked', actor }]); }
    if (outcome.kind === 'utensil' || outcome.kind === 'ghost') deps.feedback.events([{ type: 'hint', actor }]);
    if (outcome.kind === 'steam') { deps.scene.poke(actor, 'goof', ''); deps.feedback.sound.cue('poke'); }
    if (outcome.kind === 'full') { deps.scene.cooked(at, null); deps.feedback.refuse(fullTableLine, undefined, actor); }
  }
  /** After every refresh: the bench closes in Create, away from its piece's room, or when the cook is somewhere else. */
  function refresh() {
    if (deps.building()) book.close(); else book.refresh();
    if (piece === null) return;
    const where = deps.town().location, cook = deps.town().actors.find(a => a.id === deps.selected());
    const here = cook?.location.kind === 'interior' && where.kind === 'interior' && cook.location.building === where.building && cook.location.room === where.room;
    if (deps.building() || !current() || !here) close();
  }
  return { open, close, refresh };
}
