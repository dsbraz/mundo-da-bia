import type Phaser from 'phaser';
import type { ActorId, PresentationEvent, World } from '../domain/types';
import type { ReactionPose } from '../content/personalities';
import type { Needs } from '../domain/types';
import { band, mood, needsOf, type Need } from '../domain/needs';
/** Faces drawn from events that already exist (entering a room, the show, a poke, waking up, a glance) and from the session's needs
 *  (W3L-12: hungry, bored, sad without tears, and the yawn); never saved. */
export type Expression = 'neutral' | 'happy' | 'laugh' | 'surprise' | 'sleepy' | 'curious' | 'silly' | 'hungry' | 'bored' | 'sad' | 'yawn';
/** `arms`: a body gesture drawn in front (the hand on the belly or under the cheek) in place of that arm hanging down. */
export interface FaceLook { eyes: string[]; brows?: string; mouth?: string; arms?: string }
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
    // Hunger: a crooked mouth and a hand on the belly; boredom: eyes to the side, half lids, cheek on the hand; sad: droopy brows and a
    // mouth turned down, never a tear (the family's choice, §6.2).
    hungry: { eyes: ['eyes'], brows: 'brows', mouth: 'mouth-wavy', arms: 'arm-belly' },
    bored: { eyes: ['eyes-side', 'lids-half'], brows: 'brows', mouth: 'mouth-flat', arms: 'arm-cheek' },
    sad: { eyes: ['eyes'], brows: 'brows-sad', mouth: 'mouth-sad' },
    yawn: { eyes: ['lids'], brows: 'brows-up', mouth: 'mouth-yawn' },
  },
  cat: {
    neutral: { eyes: ['eyes'] }, happy: { eyes: ['eyes-happy'] }, laugh: { eyes: ['eyes-happy'], mouth: 'mouth-open' },
    surprise: { eyes: ['eyes-wide'], mouth: 'mouth-open' }, sleepy: { eyes: ['lids'] }, curious: { eyes: ['eyes-wide'] }, silly: { eyes: ['eyes-happy', 'lids'], mouth: 'mouth-open' },
    hungry: { eyes: ['eyes'], mouth: 'mouth-open' }, bored: { eyes: ['eyes-side'] }, sad: { eyes: ['eyes-sad'] }, yawn: { eyes: ['lids'], mouth: 'mouth-open' },
  },
};
const layersOf = (looks: Record<Expression, FaceLook>) => [...new Set(Object.values(looks).flatMap(l => [...l.eyes, l.brows, l.mouth, l.arms].filter((p): p is string => !!p)).concat('lids'))];
/** Every face layer an actor kind draws (each a separate image so a swap never moves the figure). */
export const faceParts = { human: layersOf(faceLayers.human), cat: layersOf(faceLayers.cat) };

const needFaces: Record<Need, Expression> = { fome: 'hungry', tedio: 'bored', sono: 'sleepy' };
/** The face of the highest need in `precisa` (`pede` shows only the bubble), or null. */
function needFace(state: { needs?: Needs }): Expression | null {
  const current = needsOf(state), top = (['fome', 'sono', 'tedio'] as const).filter(n => band(current[n]) === 'precisa').sort((a, b) => current[b] - current[a])[0];
  return top ? needFaces[top] : null;
}
/** Priority: asleep, a surprise, the show or a laugh, then sad (two needs in `precisa`), happy (just fed with hunger fine, or a recent joy),
 *  a poke's face, the highest need, a glance, neutral. */
type FaceState = { resting: boolean; show: boolean; fed: boolean; needs?: Needs };
export function expressionOf(state: FaceState, triggered: Expression | null): Expression {
  if (state.resting) return 'sleepy';
  if (triggered === 'surprise' || triggered === 'sleepy') return triggered;
  if (state.show || triggered === 'laugh') return 'laugh';
  return feelingFace(state) ?? afterFeelings(state, triggered);
}
/** A poke's face, else the highest need, else a glance (curious) or neutral. */
function afterFeelings(state: FaceState, triggered: Expression | null): Expression {
  if (triggered && triggered !== 'curious') return triggered;
  return needFace(state) ?? triggered ?? 'neutral';
}
/** Sad (two needs in `precisa`), or happy (fed and hunger no longer in `precisa`, or a recent joy), or null. */
function feelingFace(state: FaceState): Expression | null {
  const current = needsOf(state);
  if (mood(state) === 'triste') return 'sad';
  return (state.fed && band(current.fome) !== 'precisa') || current.alegria > 0 ? 'happy' : null;
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
/** `arms`: the gesture may replace the arm (standing still with the hands free); the hanging arm on that side is cropped away then. */
export function paintFace(pose: Phaser.GameObjects.Container, kind: 'human' | 'cat', expression: Expression, blink: boolean, arms = false) {
  const look = faceLayers[kind][expression], eyes = blink && look.eyes.includes('eyes') ? ['lids'] : look.eyes, gesture = arms ? look.arms : undefined;
  const on = new Set([...eyes, look.brows, look.mouth, gesture]);
  faceParts[kind].forEach(part => pose.getByName<Phaser.GameObjects.Image>(part)?.setVisible(on.has(part)));
  const hands = pose.getByName<Phaser.GameObjects.Image>('hands');
  if (hands && gesture) hands.setCrop(0, 0, hands.width / 2, hands.height); else if (hands?.isCropped) hands.setCrop();
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
