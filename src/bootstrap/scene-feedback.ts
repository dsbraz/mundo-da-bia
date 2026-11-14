import type { ActorId, Need, PieceKind, Point, PresentationEvent, RoomId, World } from '../domain/types';
import { lineRotation, marketThought, nameOf, needLine, say, thoughtLine } from '../content/feedback-text';
import { cards, personalities, pickReaction } from '../content/personalities';
import { createSound } from '../presentation/sound';
import { missingBubble, missingWay } from '../presentation/missing-bubble';
import { needBubbles } from '../presentation/need-bubble';
import { speaking } from '../presentation/feedback';
import { worldToScreen } from '../presentation/viewport';
import type { PlayScene } from '../presentation/scene';
import { loadSoundOn, saveSoundOn } from '../persistence/storage';
import { unspoken } from '../domain/toilet';
interface Deps { root: HTMLElement; scene: PlayScene; state: () => World; selected: () => ActorId; playing: () => boolean;
  /** The selected one goes to `room` of this house (a touch on a bubble's door, W3L-15). */
  goRoom?: (room: RoomId) => void;
  /** Lot 6F: whether home still has food for `actor` (else her hunger draws the market), and a touch on the market bubble (the Map). */
  food?: (actor: ActorId) => boolean; toMarket?: () => void }
/** What a refusal adds: who sits there, the piece that is not in this room, where to point, the screen-reader line. */
interface Lack { actor?: ActorId | undefined; by?: ActorId | undefined; want?: PieceKind | undefined; point?: Point | undefined; text?: string | undefined;
  /** A touch on the bubble does this (the checkout's: she goes to pay). */
  go?: (() => void) | undefined }
/** Feedback near the finger (bubble, motion, sound); `#announcement` only mirrors it for screen readers. */
export function sceneFeedback(deps: Deps) {
  const status = deps.root.querySelector('#announcement')!;
  const announce = (text: string) => { status.textContent = text; };
  const sound = createSound({ button: deps.root.querySelector<HTMLButtonElement>('#sound-toggle')!, enabled: loadSoundOn(), remember: on => { saveSoundOn(on); }, unlock: window });
  const actor = (id: ActorId) => deps.state().actors.find(a => a.id === id);
  const last = new Map<ActorId, number>(), line = lineRotation();
  /** A bubble about who is there points at their head. */
  const pointAt = (by?: ActorId) => by ? deps.scene.head(by) : null;
  const bubble = missingBubble(deps.root, () => deps.root.querySelector('#world')!.getBoundingClientRect());
  needBubbles(deps.root, { world: deps.state, selected: deps.selected, head: id => deps.scene.head(id), canvas: () => deps.root.querySelector('canvas'),
    playing: deps.playing, label: (id, need, market) => market ? marketThought(nameOf(actor(id)!)) : thoughtLine(need, nameOf(actor(id)!)), speaking: id => speaking(deps.scene, id),
    ...(deps.food ? { food: deps.food } : {}), ...(deps.toMarket ? { toMarket: deps.toMarket } : {}) });
  /** What a touch on the bubble does: what the refusal asks (the checkout), the market's Map, or the door's room. */
  const goOf = (need: Need, lack: Lack) => { const go = lack.go ?? (need === 'market' ? deps.toMarket : undefined); return go ? { go } : {}; };
  /** The shrug, the drawn bubble (with a door when the piece is in another room) and the soft cue; a piece found nowhere lights its card in Create. */
  function missing(need: Need, lack: Lack = {}) {
    const who = lack.actor ?? deps.selected(), head = deps.scene.shrug(who), canvas = deps.root.querySelector('canvas');
    const anchor = pointAt(lack.by) || lack.point || head || above(actor(who));
    const label = lack.text ?? needLine(need, lack.by && nameOf(actor(lack.by)!));
    bubble({ need, ...(lack.by ? { by: lack.by } : {}), ...doorOf(lack.want, who), ...goOf(need, lack), label }, canvas ? worldToScreen(canvas, anchor) : anchor);
    announce(label); sound.cue('refuse');
  }
  /** The door in the bubble when `want` is in another room, and for the selected one a touch there goes to a room with it (W3L-15). */
  function doorOf(want: PieceKind | undefined, who: ActorId): { door: boolean; go?: () => void } {
    const state = deps.state(), door = elsewhere(deps.root, state, want);
    const room = door && who === deps.selected() ? state.layout.pieces.find(p => p.kind === want && p.room !== state.room)?.room : undefined;
    return room && deps.goRoom ? { door, go: () => deps.goRoom!(room) } : { door };
  }
  return {
    announce, sound, missing,
    events(events: PresentationEvent[]) {
      // Each line is taken from the rotation once: the bubble and the announcement say the same.
      // Sitting down on the toilet says nothing.
      const said = events.map(event => { const who = event.actor && actor(event.actor); return unspoken(deps.state(), event) ? null : line(event.type, who || undefined, who ? who.kind === 'cat' : false, event.favorite === true); });
      deps.scene.react(events, said); sound.events(events, id => actor(id)?.kind === 'cat', id => deps.state().layout.pieces.find(p => p.id === id && (p.active || p.kind === 'toilet'))?.kind);
      if (said[0]) announce(said[0]);
      events.forEach(event => { if (event.type === 'missing') missing(event.need!, event); });
    },
    /** A refusal from outside the domain (no way there, a full basket, a taken swing): always a drawing, never a sentence on screen. */
    refuse(need: Need, text?: string, point?: Point, face?: ActorId) { missing(need, { text, point, by: face }); },
    poke(id: ActorId) {
      const who = actor(id); if (!who) return;
      const pool = personalities[id], index = pickReaction(pool.length, last.get(id), Math.random), reaction = pool[index]!;
      last.set(id, index);
      const line = say(reaction.line, nameOf(who));
      deps.scene.poke(id, reaction.pose, line); sound.cue(reaction.cue, cards[id].voice); announce(line);
    },
  };
}
const above = (who?: { x: number; y: number }): Point => ({ x: who?.x ?? 500, y: (who?.y ?? 520) - 200 });
/** A door in the bubble when `want` is in another room of this house; found nowhere, its Create card and the Create button glow. */
function elsewhere(root: HTMLElement, state: World, want?: PieceKind) {
  const way = missingWay(state, want);
  if (way === 'create') { root.querySelector('#build-toggle')?.classList.add('wanted'); root.querySelector(`.catalog-piece[data-kind="${want}"]`)?.classList.add('wanted'); }
  return way === 'door';
}
