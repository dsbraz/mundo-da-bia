import { buy, checkout, checkoutAt, checkoutCall as calling, marketGoods, stockUp, unpaidExit } from '../domain/market';
import type { Good, Shopped } from '../domain/market';
import type { Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import type { Action, ActorId, ItemId, Piece, Point } from '../domain/types';
import { pieceBounds } from '../domain/layout';
import { isAdult } from '../domain/family';
import { sameLocation } from '../domain/location';
import { destination, type Destination } from '../domain/routine';
import { marketPanel } from '../presentation/market-play';
import type { BagView } from '../presentation/market-play';
import { checkoutCall } from '../presentation/checkout-call';
import type { PlayScene } from '../presentation/scene';
import type { sceneFeedback } from './scene-feedback';

interface MarketDeps {
  root: HTMLElement; town: () => Neighborhood; selected: () => ActorId; building: () => boolean;
  /** Commits a neighborhood changed at the market (saved and drawn), outside the undo history, like the bench. */
  apply: (town: Neighborhood) => void;
  feedback: Pick<ReturnType<typeof sceneFeedback>, 'missing' | 'sound'>;
  /** Walks the selected one to a piece and does `action` there (at the checkout: she pays). */
  perform: (action: Action) => void;
  scene: Pick<PlayScene, 'poke'>;
  /** Opens the Map with `place` marked. */
  openMap: (place: Destination) => void;
  /** The first-time hand at the checkout (lot 6F): shown once, ever. */
  hint: { seen: () => boolean; done: () => void };
}
const isBag = (town: Neighborhood, id: ItemId) => town.items.some(i => i.id === id && i.kind === 'sacola');
/** The bag or the shopper let go at the checkout of the room on screen (lot 6F: that pays). */
function atRegister(deps: MarketDeps, action: Action): boolean {
  const town = deps.town(), where = town.location, building = hereOf(town);
  const letGo = (action.type === 'move' && action.actor === deps.selected()) || (action.type === 'place' && isBag(town, action.item));
  return letGo && !!building && where.kind === 'interior' && !!checkoutAt(building.layout, where.room, action.point);
}
/** She cheers at the beep, and whoever works there waves. */
function cheer(deps: MarketDeps) {
  const town = deps.town(), shopper = town.actors.find(a => a.id === deps.selected())!;
  deps.scene.poke(shopper.id, 'cheer', '');
  town.actors.filter(a => isAdult(a.id) && a.id !== shopper.id && sameLocation(a.location, shopper.location)).forEach(a => deps.scene.poke(a.id, 'hop', ''));
}
/** Hungry with nothing at home: the Map marks the market; with no market in town yet, the Create button and the Mercado card glow. */
function toMarket(deps: MarketDeps) {
  const place = destination(deps.town(), 'mercado');
  if (place) { deps.openMap(place); return; }
  deps.root.dataset.wantMarket = 'true'; deps.root.querySelector('#build-toggle')?.classList.add('wanted');
}
/** What her bag shows: up to 6 goods and the paid ribbon. */
function bagOf(deps: MarketDeps): BagView {
  const bag = deps.town().items.find(i => i.kind === 'sacola' && i.holder === deps.selected());
  return { contents: bag?.contents ?? [], paid: bag?.paid ?? false };
}
const hereOf = (town: Neighborhood) => { const where = town.location; return where.kind === 'interior' ? town.buildings.find(b => b.id === where.building) : undefined; };
/** Applies a market step: a change is saved; a refusal shows what is missing (free hands, the checkout). */
function settled(deps: MarketDeps, result: Shopped) {
  if (result.town !== deps.town()) deps.apply(result.town);
  if (result.outcome.kind === 'missing') deps.feedback.missing(result.outcome.need, { actor: deps.selected(), want: result.outcome.need === 'checkout' ? 'checkout' : undefined });
  return result.outcome.kind;
}
/** The register on the checkout drawing, where the arrow points and the receipt pops out. */
const register = (piece: Piece): Point => ({ x: piece.x + (piece.flipped ? 32 : pieceBounds.checkout.width - 32), y: piece.y + 6 });
/** The market in play (W3L-22): the shelf panel, the checkout's beep, the bag into the fridge, and no leaving before the checkout; and the
 *  checkout that calls her while her goods are not paid for (lot 6F). */
export function marketPlay(deps: MarketDeps) {
  let shelf: number | null = null;
  const panel = marketPanel(deps.root, { buy: good => pick(good), close, pay: goPay });
  const call = checkoutCall(deps.root, { pay: goPay, hintSeen: deps.hint.seen, hintDone: deps.hint.done });
  const bagView = () => bagOf(deps), here = () => hereOf(deps.town()), settle = (result: Shopped) => settled(deps, result);
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
  /** She walks to the checkout that calls her and pays there (the arrow, the register beside the bag, the bubble). */
  function goPay() { const piece = calling(deps.town(), deps.selected()); if (piece) { close(); deps.perform({ type: 'use', id: piece.id }); } }
  /** Beep, beep: the bag gets its ribbon, the receipt pops out of the register and she cheers (whoever works there waves). */
  function pay() {
    const piece = calling(deps.town(), deps.selected());
    if (!piece || settle(checkout(deps.town(), deps.selected())) !== 'paid') return;
    deps.feedback.sound.cue('beep'); call.paid(register(piece)); cheer(deps);
    if (panel.isOpen()) panel.show(bagView(), false);
  }
  /** The arrow and the bag beside the register, while her goods are not paid for (never in Create). */
  function callOut() { const piece = deps.building() ? null : calling(deps.town(), deps.selected()); call.show(piece && register(piece), bagView().contents, shelf !== null); }
  const holdsBag = () => deps.town().items.some(i => i.kind === 'sacola' && i.holder === deps.selected());
  const kindOf = (id: number) => here()?.layout.pieces.find(p => p.id === id)?.kind;
  /** The fridge tapped with a bag in hand, or the bag dropped on it. */
  const toFridge = (action: Action) => (action.type === 'interact' && action.target === 'fridge' && holdsBag())
    || (action.type === 'put' && action.spot === 'fridge' && isBag(deps.town(), action.item));
  return {
    toMarket: () => toMarket(deps),
    /** A scene action the market takes over: the shelf, the checkout, and the fridge (tapped or the bag dropped on it) with a bag in hand;
     *  the bag or the shopper let go at the checkout pays (she still moves there; the bag stays in her hand). */
    intercept(action: Action): boolean {
      if (action.type === 'use' && kindOf(action.id) === 'market-shelf') { open(action.id); return true; }
      if (action.type === 'use' && kindOf(action.id) === 'checkout') { pay(); return true; }
      if (atRegister(deps, action) && calling(deps.town(), deps.selected())) { pay(); return action.type === 'place'; }
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
    /** Out of the market's building with an unpaid bag: refused, the bubble shows the checkout (a touch on it goes to pay) and the arrow jumps. */
    blocks(action: NeighborhoodAction): boolean {
      if (action.type !== 'transport' || !unpaidExit(deps.town(), action)) return false;
      deps.feedback.missing('checkout', { actor: action.actor ?? deps.selected(), want: 'checkout', go: goPay }); call.nudge(); return true;
    },
    /** After every refresh: the checkout calls while her goods are not paid for; the shelf closes in Create, away from its room, or when
     *  the shopper is somewhere else. */
    refresh() {
      callOut();
      if (shelf === null) return;
      const where = deps.town().location, who = deps.town().actors.find(a => a.id === deps.selected())?.location;
      const together = where.kind === 'interior' && who?.kind === 'interior' && who.building === where.building && who.room === where.room;
      if (deps.building() || !together || kindOf(shelf) !== 'market-shelf') close(); else panel.show(bagView(), false);
    },
  };
}
