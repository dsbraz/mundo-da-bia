import { expect, it } from 'vitest';
import { initialAlbum } from '../domain/houses';
import { localWorld, migrateNeighborhood, neighborhoodAction } from '../domain/neighborhood';
import { initialWorld } from '../domain/world';
import { phaseAt, untilMorning } from '../domain/clock';
import { needsOf, relieve, type Need } from '../domain/needs';
import { destination, placeOf, suggestion } from '../domain/routine';
import { foodAtHome } from '../domain/larder';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { ActorId } from '../domain/types';
import { thoughtOf } from './need-bubble';
import { asking, nextAsk, type Ask } from '../domain/asks';

/** One bubble that came up on screen: when (s of play), whose, and what (a need's thought, or a routine wish). */
interface Asked { at: number; actor: ActorId; what: string; wish: boolean }
const everyone: readonly ActorId[] = ['bia', 'luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca'];
const patch = (town: Neighborhood, id: ActorId, need: Need) =>
  ({ ...town, actors: town.actors.map(a => a.id === id ? { ...a, needs: relieve(needsOf(a), need === 'fome' ? 'prato' : 'brincar') } : a) });
const sleptAll = (town: Neighborhood) => ({ ...town, actors: town.actors.map(a => ({ ...a, needs: { ...needsOf(a), sono: 0 } })) });

/** What each bubble would draw now, before the display decides: the room's thought and the Bia's routine wish. */
function wanted(town: Neighborhood, session: number, played: number) {
  const thought = thoughtOf(localWorld(town), 'bia'), bia = town.actors.find(a => a.id === 'bia')!;
  const wish = played < 30_000 ? null : suggestion(phaseAt(session, 'calmo'), bia, placeOf(town, bia.location), false, foodAtHome(town, 'bia'));
  return { thought, wish: wish && destination(town, wish, bia.location) ? wish : null };
}
/** The display since lot 8E: the thought (its loop runs first) and then the wish take turns on one ask clock. */
function turns() {
  let last: Ask | null = null;
  const may = (key: string, now: number) => { last = nextAsk(last, key, now); return asking(last, key, now); };
  return (thought: ReturnType<typeof wanted>['thought'], wish: string | null, now: number) => {
    const up = !!thought && may(`thought:${thought.actor}:${thought.need}:${thought.band}`, now);
    return { thought: up, wish: !up && !!wish && may(`wish:bia:${wish}`, now) };
  };
}
/** Plays `minutes` second by second (the needs' `live` every 30 s with the phase at its start, as the app's clock does). `care`: the
 *  child answers every thought 20 s after it shows (a dish, a game, everyone to bed: the night slept through); else nobody does
 *  anything. Bia walks about when `care`, everyone else stands still. Returns each bubble's onsets. */
function simulate(minutes: number, care: boolean): Asked[] {
  const display = turns();
  let town = migrateNeighborhood(initialAlbum(initialWorld())), session = 0, shown = { thought: false, wish: false };
  const asked: Asked[] = [], pending: { at: number; actor: ActorId; need: Need }[] = [];
  for (let s = 0; s < minutes * 60; s++) {
    if (s > 0 && s % 30 === 0) ({ town, session } = tick(town, session, care));
    const want = wanted(town, session, s * 1000), now = display(want.thought, want.wish, s * 1000);
    if (now.thought && !shown.thought) {
      asked.push({ at: s, actor: want.thought!.actor, what: want.thought!.need, wish: false });
      if (care) pending.push({ at: s + 20, actor: want.thought!.actor, need: want.thought!.need });
    }
    if (now.wish && !shown.wish) asked.push({ at: s, actor: 'bia', what: want.wish!, wish: true });
    shown = now;
    for (const job of pending.filter(p => p.at === s)) ({ town, session } = answer(town, session, job));
  }
  return asked;
}
/** The clock's 30 s tick: Bia walks about when `care`, everyone else stands still. */
function tick(town: Neighborhood, session: number, care: boolean) {
  const idle = care ? everyone.filter(id => id !== 'bia') : everyone;
  return { town: neighborhoodAction(town, { type: 'live', elapsed: 30_000, phase: phaseAt(session, 'calmo'), idle }), session: session + 30_000 };
}
/** The child answers a thought: a dish or a game for whoever asked, or everyone to bed (the night slept through, on to the morning). */
function answer(town: Neighborhood, session: number, job: { actor: ActorId; need: Need }) {
  return job.need === 'sono' ? { town: sleptAll(town), session: session + untilMorning(session, 'calmo') } : { town: patch(town, job.actor, job.need), session };
}
const report = (asked: Asked[]) => asked.map(a => `${Math.floor(a.at / 60)}:${String(a.at % 60).padStart(2, '0')} ${a.actor} ${a.what}`);
const gaps = (asked: Asked[]) => asked.slice(1).map((a, n) => a.at - asked[n]!.at);

it('lote 8E, jogo normal (quem pede é atendido): em 30 min a casa pede 4 vezes, 8 min uma da outra; a Bia, fome e depois sono', () => {
  const asked = simulate(30, true);
  // Before lot 8E the same 30 min drew 56 bubbles (24 of them the Bia's): a thought every 40 s, or the wish between two of them.
  expect(report(asked)).toEqual(['5:30 leo fome', '13:30 bia fome', '21:30 rui tedio', '29:30 bia sono']);
  expect(Math.min(...gaps(asked))).toBeGreaterThanOrEqual(8 * 60);
});
it('lote 8E, ninguém cuida de nada e todos parados: os pedidos seguem 8 min um do outro, e a Bia ainda mostra as três necessidades', () => {
  const asked = simulate(30, false);
  // Before: 17 bubbles, the Bia's hunger every 40 s from 3 min 30 s, and then for good once it needed.
  expect(report(asked)).toEqual(['5:30 leo fome', '13:30 bia fome', '21:30 bia tedio', '29:30 bia sono']);
  expect(Math.min(...gaps(asked))).toBeGreaterThanOrEqual(8 * 60);
});
