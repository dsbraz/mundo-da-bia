import type { ActorId, Point, PresentationEvent, World } from '../domain/types';
import { lineRotation, nameOf, say } from '../content/feedback-text';
import { cards, personalities, pickReaction } from '../content/personalities';
import { createSound } from '../presentation/sound';
import type { PlayScene } from '../presentation/scene';
import { loadSoundOn, saveSoundOn } from '../persistence/storage';
interface Deps { root: HTMLElement; scene: PlayScene; state: () => World; selected: () => ActorId }
/** Feedback near the finger (bubble, motion, sound); `#announcement` only mirrors it for screen readers. */
export function sceneFeedback(deps: Deps) {
  const status = deps.root.querySelector('#announcement')!;
  const announce = (text: string) => { status.textContent = text; };
  const sound = createSound({ button: deps.root.querySelector<HTMLButtonElement>('#sound-toggle')!, enabled: loadSoundOn(), remember: on => { saveSoundOn(on); }, unlock: window });
  const actor = (id: ActorId) => deps.state().actors.find(a => a.id === id);
  const last = new Map<ActorId, number>(), line = lineRotation();
  return {
    announce, sound,
    events(events: PresentationEvent[]) {
      // Each line is taken from the rotation once: the bubble and the announcement say the same.
      const said = events.map(event => { const who = event.actor && actor(event.actor); return line(event.type, who || undefined, who ? who.kind === 'cat' : false, event.favorite === true); });
      deps.scene.react(events, said); sound.events(events, id => actor(id)?.kind === 'cat', id => deps.state().layout.pieces.find(p => p.id === id && p.active)?.kind);
      if (said[0]) announce(said[0]);
    },
    refuse(text: string, point?: Point, face?: ActorId) {
      const self = actor(deps.selected());
      announce(text); sound.cue('refuse');
      deps.scene.refuse(point ?? { x: self?.x ?? 500, y: (self?.y ?? 520) - 200 }, text, face);
    },
    poke(id: ActorId) {
      const who = actor(id); if (!who) return;
      const pool = personalities[id], index = pickReaction(pool.length, last.get(id), Math.random), reaction = pool[index]!;
      last.set(id, index);
      const line = say(reaction.line, nameOf(who));
      deps.scene.poke(id, reaction.pose, line); sound.cue(reaction.cue, cards[id].voice); announce(line);
    },
  };
}
