import { buy, checkout, marketGoods, stockUp, unpaidExit } from '../domain/market';
import type { Good, Shopped } from '../domain/market';
import type { Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import type { Action, ActorId, ItemId } from '../domain/types';
import { marketPanel } from '../presentation/market-play';
import type { BagView } from '../presentation/market-play';
import type { sceneFeedback } from './scene-feedback';

interface MarketDeps {
  root: HTMLElement; town: () => Neighborhood; selected: () => ActorId; building: () => boolean;
  /** Commits a neighborhood changed at the market (saved and drawn), outside the undo history, like the bench. */
  apply: (town: Neighborhood) => void;
  feedback: Pick<ReturnType<typeof sceneFeedback>, 'missing' | 'sound'>;
}
/** The market in play (W3L-22): the shelf panel, the checkout's beep, the bag into the fridge, and no leaving before the checkout. */
export function marketPlay(deps: MarketDeps) {
  let shelf: number | null = null;
  const panel = marketPanel(deps.root, { buy: good => pick(good), close });
  const bagView = (town = deps.town()): BagView => {
    const bag = town.items.find(i => i.kind === 'sacola' && i.holder === deps.selected());
    return { contents: bag?.contents ?? [], paid: bag?.paid ?? false };
  };
  const here = () => { const where = deps.town().location; return where.kind === 'interior' ? deps.town().buildings.find(b => b.id === where.building) : undefined; };
  /** Applies a market step: a change is saved; a refusal shows what is missing (free hands, the checkout). */
  function settle(result: Shopped) {
    if (result.town !== deps.town()) deps.apply(result.town);
    if (result.outcome.kind === 'missing') deps.feedback.missing(result.outcome.need, { actor: deps.selected(), want: result.outcome.need === 'checkout' ? 'checkout' : undefined });
    return result.outcome.kind;
  }
  function open(piece: number) {
    const building = here(), at = building?.layout.pieces.find(p => p.id === piece);
    if (!building || !at) return;
    shelf = piece; panel.open(marketGoods(building.layout, at, deps.town().progress.shelves), bagView());
  }
  function pick(good: Good) {
    if (shelf === null) return;
    const outcome = settle(buy(deps.town(), { actor: deps.selected(), piece: shelf, good }));
    if (outcome === 'bagged') deps.feedback.sound.cue('pick');
    panel.show(bagView(), outcome === 'full');
  }
  function close() { shelf = null; panel.close(); }
  /** Beep, beep: the bag gets its ribbon. */
  function pay() {
    if (settle(checkout(deps.town(), deps.selected())) !== 'paid') return;
    deps.feedback.sound.cue('beep');
    if (panel.isOpen()) panel.show(bagView(), false);
  }
  const holdsBag = () => deps.town().items.some(i => i.kind === 'sacola' && i.holder === deps.selected());
  const kindOf = (id: number) => here()?.layout.pieces.find(p => p.id === id)?.kind;
  /** The fridge tapped with a bag in hand, or the bag dropped on it. */
  const toFridge = (action: Action) => (action.type === 'interact' && action.target === 'fridge' && holdsBag())
    || (action.type === 'put' && action.spot === 'fridge' && deps.town().items.some(i => i.id === action.item && i.kind === 'sacola'));
  return {
    /** A scene action the market takes over: the shelf, the checkout, and the fridge (tapped or the bag dropped on it) with a bag in hand. */
    intercept(action: Action): boolean {
      if (action.type === 'use' && kindOf(action.id) === 'market-shelf') { open(action.id); return true; }
      if (action.type === 'use' && kindOf(action.id) === 'checkout') { pay(); return true; }
      if (!toFridge(action)) return false;
      const outcome = settle(stockUp(deps.town(), deps.selected()));
      if (outcome === 'stored') deps.feedback.sound.cue('clink');
      // Nothing to put away here (the market's own fridge): the fridge just opens.
      return outcome !== 'none';
    },
    /** A tap on what is in the fridge, with a bag in hand: she walks to the fridge to put the shopping away instead of swapping it for the snack. */
    instead(item: ItemId): Action | null {
      return holdsBag() && deps.town().items.some(i => i.id === item && i.spot === 'fridge') ? { type: 'interact', target: 'fridge' } : null;
    },
    /** Out of the market's building with an unpaid bag: refused, and the bubble shows the checkout. */
    blocks(action: NeighborhoodAction): boolean {
      if (action.type !== 'transport' || !unpaidExit(deps.town(), action)) return false;
      deps.feedback.missing('checkout', { actor: action.actor ?? deps.selected(), want: 'checkout' }); return true;
    },
    /** After every refresh: the shelf closes in Create, away from its room, or when the shopper is somewhere else. */
    refresh() {
      if (shelf === null) return;
      const where = deps.town().location, who = deps.town().actors.find(a => a.id === deps.selected())?.location;
      const together = where.kind === 'interior' && who?.kind === 'interior' && who.building === where.building && who.room === where.room;
      if (deps.building() || !together || kindOf(shelf) !== 'market-shelf') close(); else panel.show(bagView(), false);
    },
  };
}
