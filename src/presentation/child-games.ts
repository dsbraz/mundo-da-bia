import { hopCells, hopStep, ropeCue, ropeStep, startGame } from '../domain/child-games';
import type { GameKind } from '../domain/child-games';
import type { Actor, ActorId, Point, World } from '../domain/types';
import { gameSpace, hopPosition, hopTileAt } from './game-space';
import { gameControls } from './game-controls';
import type { GamePreview } from './child-game-art';
import { gamePosition } from './child-game-art';
import { reducedMotion } from './motion';
interface Actions {
  world: () => World; selected: () => ActorId; prepare: () => void; stopWalk: () => void;
  walk: (point: Point, done: () => void) => void;
  commit: (actor: ActorId, point: Point) => void; preview: (value: GamePreview | null) => void;
  follow: (point: Point) => void; select: (actor: ActorId) => void; drop: (actor: ActorId) => void;
}
export function childGames(root: HTMLElement, actions: Actions) {
  let session: GamePreview | null = null, frame = 0, pending = false, command = 0;
  const view = gameControls(root, { start, jump, cancel, tap });
  function cancel() {
    command++; const active = session, wasPending = pending; session = null; pending = false;
    cancelAnimationFrame(frame); view.close(); actions.preview(null);
    if (wasPending) actions.stopWalk();
    if (active) actions.commit(active.actor, gamePosition(active, performance.now(), reducedMotion()));
  }
  function start(kind: GameKind) {
    cancel(); actions.prepare();
    const actor = player(actions.world(), actions.selected());
    if (!actor) { view.error('Chame uma criança para brincar aqui!'); return; }
    if (actor.id !== actions.selected()) actions.select(actor.id);
    if (actions.world().items.some(i => i.holder === actor.id)) actions.drop(actor.id);
    const origin = gameSpace(actions.world(), actor, kind);
    if (!origin) { view.error('Está apertado aqui. Que tal o quintal?'); return; }
    actions.follow(origin);
    view.start(kind); view.update('walking', 'Chegando…', 'Indo até um espaço livre.', true); pending = true;
    const token = command;
    actions.walk(origin, () => {
      if (command !== token) return;
      pending = false;
      session = { actor: actor.id, origin, point: origin, from: origin, game: startGame(kind, performance.now()), jumpedAt: -Infinity, feet: 2 };
      actions.preview(session); tick();
    });
  }
  function jump(cell?: number) {
    if (!session || performance.now() - session.jumpedAt < 400) return;
    const now = performance.now(), before = session.game;
    const next = before.kind === 'rope' ? ropeStep(before, now) : hopStep(before, cell ?? hopCells(before)[0]!);
    if (next === before) return;
    const cells = hopCells(before);
    session = { ...session, game: next, from: session.point, point: before.kind === 'rope' ? session.point : hopPosition(session.origin, cells[0]!), jumpedAt: now, feet: before.kind === 'rope' ? 2 : cells.length };
    actions.preview(session); render(now);
  }
  function tap(point: Point) {
    if (!session) return;
    if (session.game.kind === 'rope') { jump(); return; }
    const tile = hopTileAt(session.origin, point);
    if (tile) jump(tile.cell);
  }
  function render(now: number) {
    const value = session!, cells = hopCells(value.game), landing = now - value.jumpedAt < 400;
    if (value.game.kind === 'rope') {
      const message = { ready: 'Espere a corda chegar.', jump: 'Isso! Continue no seu ritmo.', again: 'Tente no próximo “Agora!”.' }[value.game.feedback];
      view.update('playing', 'Pular', message, false, ropeCue(value.game, now) ? 'Agora!' : 'Prepare…');
    } else {
      const done = !cells.length;
      view.update(done ? 'complete' : 'playing', `Pular para ${cells.join(' e ')}`, done ? 'Ida e volta! Quer brincar de novo?' : cells.length === 2 ? 'Dois pés nas casas iluminadas.' : 'Um pé na casa iluminada.', landing);
    }
  }
  function tick() {
    if (!session) return;
    const now = performance.now(); render(now);
    actions.follow(gamePosition(session, now, reducedMotion()));
    frame = requestAnimationFrame(tick);
  }
  return { cancel, open: view.open };
}

/** Who plays: the selected child, or, if a cat is selected, the child nearest to it. */
export function player(world: World, selected: ActorId): Actor | undefined {
  const chosen = world.actors.find(a => a.id === selected)!;
  if (chosen.kind === 'human' && chosen.room === world.room) return chosen;
  return world.actors.filter(a => a.kind === 'human' && a.room === world.room)
    .sort((a, b) => Math.hypot(a.x - chosen.x, a.y - chosen.y) - Math.hypot(b.x - chosen.x, b.y - chosen.y))[0];
}
