import type { ActorId, Point, World } from '../domain/types';
import { band, needsOf, type Band, type Need } from '../domain/needs';
import { besideMenu, bubblePlace, placeBubble } from './missing-bubble';
export { besideMenu } from './missing-bubble';
import { worldToScreen } from './viewport';

/** What the room thinks (W3L-12): one thought bubble at most, of who is selected if she asks for something, else of the highest need. */
export interface Thought { actor: ActorId; need: Need; band: Exclude<Band, 'bem'> }
const order: readonly Need[] = ['fome', 'sono', 'tedio'];
/** The highest need of `actor` that is not `bem`, or null. */
function topNeed(actor: World['actors'][number]): { need: Need; value: number } | null {
  const current = needsOf(actor), need = [...order].sort((a, b) => current[b] - current[a])[0]!;
  return band(current[need]) === 'bem' ? null : { need, value: current[need] };
}
export function thoughtOf(world: World, selected: ActorId): Thought | null {
  const here = world.actors.filter(a => a.room === world.room && !a.resting).map(a => ({ id: a.id, top: topNeed(a) })).filter(a => a.top);
  const chosen = here.find(a => a.id === selected) ?? here.sort((a, b) => b.top!.value - a.top!.value)[0];
  return chosen ? { actor: chosen.id, need: chosen.top!.need, band: band(chosen.top!.value) as Thought['band'] } : null;
}
/** `pede`: shown 4 s, back every 40 s from `since` (when the thought began); `precisa`: always there. */
export function thoughtShown(level: Thought['band'], since: number, now: number) { return level === 'precisa' || (now - since) % 40_000 < 4000; }
const icons: Record<Need, string> = { fome: '/art/needs.svg#food', sono: '/art/needs.svg#pillow', tedio: '/icons/bola.svg' };
export const thoughtIcon = (need: Need) => icons[need];
const marketIcon = '/art/market.svg#market';
/** The small bubble of a Turma portrait: what someone elsewhere asks for (in view, the scene's bubble says it). */
export function portraitNeed(world: World, id: ActorId): Need | null {
  const actor = world.actors.find(a => a.id === id);
  return actor && actor.room !== world.room ? topNeed(actor)?.need ?? null : null;
}

interface Deps {
  world: () => World; selected: () => ActorId; head: (id: ActorId) => Point | null; canvas: () => HTMLCanvasElement | null;
  /** Only in Brincar. */
  playing: () => boolean; label: (actor: ActorId, need: Need, market?: boolean) => string;
  /** Whether `actor` is saying something: the thought waits for the line to go, so the two never cover each other (lot 6B). */
  speaking?: (actor: ActorId) => boolean;
  /** Lot 6F: whether home still has food for `actor`; hungry without it, the thought draws the market and a touch shows where it is. */
  food?: (actor: ActorId) => boolean; toMarket?: () => void;
}
/** The room's thought bubble, drawn (never text) in the same bubble as what is missing, which it gives way to; it follows the head. Also
 *  keeps the Turma portraits' small bubbles. */
export function needBubbles(host: HTMLElement, deps: Deps) {
  const bubble = document.createElement('div'), image = document.createElement('img');
  // Only in the page while shown, so a refusal's bubble stays the one `.missing-bubble` there.
  bubble.className = 'missing-bubble thought'; bubble.setAttribute('role', 'img');
  image.className = 'need'; image.alt = ''; image.draggable = false; bubble.append(image);
  let key = '', since = 0;
  bubble.addEventListener('click', event => { if (bubble.dataset.market !== 'true') return; event.preventDefault(); event.stopPropagation(); deps.toMarket?.(); });
  /** Hungry with nothing left at home (lot 6F): the market instead of the plate. */
  const toMarket = (thought: Thought) => thought.need === 'fome' && deps.food?.(thought.actor) === false;
  /** The thought waits outside Brincar, while `actor` says a line and under a refusal's bubble. */
  const waits = (actor: ActorId) => !deps.playing() || !!deps.speaking?.(actor) || !!host.querySelector('.missing-bubble:not(.thought)');
  /** Where the bubble's tip goes on screen, or null when it is not shown now (Criar, a refusal bubble up, between two `pede` showings). */
  function anchor(thought: Thought | null, now: number): Point | null {
    const next = thought ? `${thought.actor}:${thought.need}:${thought.band}` : '';
    if (next !== key) { key = next; since = now; }
    if (!thought || !thoughtShown(thought.band, since, now) || waits(thought.actor)) return null;
    const head = deps.head(thought.actor), canvas = deps.canvas();
    return head && canvas ? bubblePlace(worldToScreen(canvas, head), canvas.getBoundingClientRect()) : null;
  }
  /** The thought's drawing: the need's, or the market (a button then) when she is hungry and home has nothing left. */
  function paint(thought: Thought) {
    const market = toMarket(thought), src = market ? marketIcon : thoughtIcon(thought.need);
    if (image.getAttribute('src') !== src) image.src = src;
    bubble.dataset.market = String(market); bubble.classList.toggle('tappable', market); bubble.setAttribute('role', market ? 'button' : 'img');
    bubble.classList.toggle('urgent', thought.band === 'precisa'); bubble.setAttribute('aria-label', deps.label(thought.actor, thought.need, market));
  }
  function show(thought: Thought | null, now: number) {
    const place = anchor(thought, now);
    if (!place || !thought) { bubble.remove(); return; }
    if (!bubble.isConnected) host.append(bubble);
    const menu = host.querySelector<HTMLElement>('#actor-context')?.getBoundingClientRect() ?? null;
    placeBubble(bubble, place, besideMenu(place, { width: bubble.offsetWidth, height: bubble.offsetHeight }, menu?.width ? menu : null, window.innerWidth));
    paint(thought);
    if (navigator.webdriver) Object.assign(bubble.dataset, { actor: thought.actor, need: thought.need, band: thought.band });
  }
  function portraits(world: World) {
    host.querySelectorAll<HTMLElement>('button[data-actor]').forEach(button => {
      const need = portraitNeed(world, button.dataset.actor as ActorId) ?? '';
      if ((button.dataset.need ?? '') === need) return;
      button.dataset.need = need; button.querySelector('.portrait-need')?.remove();
      if (!need) return;
      const small = document.createElement('img'); small.className = 'portrait-need'; small.alt = ''; small.draggable = false; small.src = thoughtIcon(need as Need);
      button.append(small);
    });
  }
  function frame(now: number) {
    const world = deps.world();
    show(thoughtOf(world, deps.selected()), now); portraits(world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
