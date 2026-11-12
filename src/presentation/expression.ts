import type Phaser from 'phaser';
import type { ActorId, PresentationEvent, World } from '../domain/types';
import type { ReactionPose } from '../content/personalities';
/** Faces drawn from events that already exist (entering a room, the show, a poke, waking up, a glance); never saved. */
export type Expression = 'neutral' | 'happy' | 'laugh' | 'surprise' | 'sleepy' | 'curious' | 'silly';
export interface FaceLook { eyes: string[]; brows?: string; mouth?: string }
export const surpriseMs = 1200;
export const faceLayers: Record<'human' | 'cat', Record<Expression, FaceLook>> = {
  human: {
    neutral: { eyes: ['eyes'], brows: 'brows', mouth: 'mouth' },
    happy: { eyes: ['eyes'], brows: 'brows', mouth: 'mouth-happy' },
    laugh: { eyes: ['eyes-laugh'], brows: 'brows-up', mouth: 'mouth-laugh' },
    surprise: { eyes: ['eyes'], brows: 'brows-up', mouth: 'mouth-o' },
    sleepy: { eyes: ['eyes', 'lids-half'], brows: 'brows', mouth: 'mouth' },
    curious: { eyes: ['eyes'], brows: 'brows-curious', mouth: 'mouth-curious' },
    // A funny face after a miss: squinting eyes, one brow up and an "o" mouth.
    silly: { eyes: ['eyes-laugh'], brows: 'brows-curious', mouth: 'mouth-o' },
  },
  cat: {
    neutral: { eyes: ['eyes'] }, happy: { eyes: ['eyes-happy'] }, laugh: { eyes: ['eyes-happy'], mouth: 'mouth-open' },
    surprise: { eyes: ['eyes-wide'], mouth: 'mouth-open' }, sleepy: { eyes: ['lids'] }, curious: { eyes: ['eyes-wide'] }, silly: { eyes: ['eyes-happy', 'lids'], mouth: 'mouth-open' },
  },
};
const layersOf = (looks: Record<Expression, FaceLook>) => [...new Set(Object.values(looks).flatMap(l => [...l.eyes, l.brows, l.mouth].filter((p): p is string => !!p)).concat('lids'))];
/** Every face layer an actor kind draws (each a separate image so a swap never moves the figure). */
export const faceParts = { human: layersOf(faceLayers.human), cat: layersOf(faceLayers.cat) };

export function expressionOf(state: { resting: boolean; show: boolean; fed: boolean }, triggered: Expression | null): Expression {
  if (state.resting) return 'sleepy';
  if (triggered === 'surprise' || triggered === 'sleepy') return triggered;
  if (state.show || triggered === 'laugh') return 'laugh';
  if (state.fed) return 'happy';
  return triggered ?? 'neutral';
}
/** Short-lived expressions per actor, kept outside the figures so repaints do not cut them. */
export function faces() {
  const shown = new Map<ActorId, { kind: Expression; until: number }>();
  return {
    trigger(id: ActorId, kind: Expression, now: number, ms = surpriseMs) { shown.set(id, { kind, until: now + ms }); },
    of(id: ActorId, now: number): Expression | null { const face = shown.get(id); return face && now < face.until ? face.kind : null; },
  };
}
/** Shows only the layers of `expression`; a blink closes open eyes. */
export function paintFace(pose: Phaser.GameObjects.Container, kind: 'human' | 'cat', expression: Expression, blink: boolean) {
  const look = faceLayers[kind][expression], eyes = blink && look.eyes.includes('eyes') ? ['lids'] : look.eyes;
  const on = new Set([...eyes, look.brows, look.mouth]);
  faceParts[kind].forEach(part => pose.getByName<Phaser.GameObjects.Image>(part)?.setVisible(on.has(part)));
}
/** Entering a room or being called surprises (the one who came, or the selected one who went along); waking up is sleepy for 2 s. */
export function faceEvents(store: ReturnType<typeof faces>, events: PresentationEvent[], world: Pick<World, 'actors'>, selected: ActorId, now: number) {
  for (const event of events) {
    if (event.type === 'room' || event.type === 'summoned') store.trigger(event.actor ?? selected, 'surprise', now);
    if (event.type === 'rested' && world.actors.some(a => a.id === event.actor && !a.resting)) store.trigger(event.actor!, 'sleepy', now, 2000);
  }
}
/** A poke that tickles or makes them hop gets a laugh; the others a happy face. */
export const pokeFace = (pose: ReactionPose): Expression => pose === 'goof' ? 'silly' : pose === 'shrug' ? 'curious' : ['hop', 'wiggle', 'clap', 'cheer'].includes(pose) ? 'laugh' : 'happy';
