import { hopCells, hopStep, ropeCue, ropeStep, startGame } from '../domain/child-games';
import type { GameKind } from '../domain/child-games';
import type { Actor, ActorId, Point, World } from '../domain/types';
import { freestFloor, gameSpace, hopFocus, hopPosition, hopTileAt, stepAside } from './game-space';
import { gameControls } from './game-controls';
import type { GamePreview } from './child-game-art';
import { gamePosition } from './child-game-art';
import { reducedMotion } from './motion';
import { jumpMs } from './jump-motion';
import { gameReactions, spectatorAt, type GameReaction } from './game-cheers';
import { gameLines, type ReactionPose } from '../content/personalities';
import { nameOf, say } from '../content/feedback-text';
interface Actions {
  world: () => World; selected: () => ActorId; prepare: () => void; stopWalk: () => void;
  walk: (point: Point, done: () => void) => void;
  commit: (actor: ActorId, point: Point) => void; preview: (value: GamePreview | null) => void;
  follow: (point: Point, slack?: number) => void; select: (actor: ActorId) => void; drop: (actor: ActorId) => void;
  /** Draws the moves as short walks (fades with reduced motion); called before they are committed. */
  stroll: (moves: { actor: ActorId; point: Point }[]) => void;
  /** A reaction drawn in the scene only (pose, face, bubble): cheering, clapping or a funny face. */
  react: (actor: ActorId, pose: ReactionPose, line: string) => void;
  /** The game really began (W3L-13: playing relieves boredom). */
  played: (actor: ActorId, kind: GameKind) => void;
}
export function childGames(root: HTMLElement, actions: Actions) {
  let session: GamePreview | null = null, frame = 0, pending = false, command = 0, playing: ActorId | null = null, queued: { cell: number | undefined } | null = null;
  const view = gameControls(root, { start, jump, cancel, tap });
  function cancel() {
    command++; const active = session, wasPending = pending; session = null; pending = false; queued = null;
    cancelAnimationFrame(frame); view.close(); actions.preview(null);
    if (wasPending) actions.stopWalk();
    if (active) actions.commit(active.actor, gamePosition(active, performance.now(), reducedMotion()));
  }
  function start(kind: GameKind) {
    cancel(); actions.prepare();
    const actor = player(actions.world(), actions.selected());
    if (!actor) { view.error('Chame uma criança para brincar aqui!'); return; }
    if (actor.id !== actions.selected()) actions.select(actor.id);
    playing = actor.id;
    if (actions.world().items.some(i => i.holder === actor.id)) actions.drop(actor.id);
    // Short on space, the game still starts: the child walks (and the camera follows) to the freest reachable floor.
    const origin = gameSpace(actions.world(), actor, kind) ?? freestFloor(actions.world(), actor, kind);
    if (!origin) { view.error('Está apertado aqui. Que tal o quintal?'); return; }
    makeRoom(actions, kind, actor, origin);
    view.start(kind); view.update('walking', 'Chegando…', 'Indo até um espaço livre.', true); pending = true;
    const token = command;
    actions.walk(origin, () => {
      if (command !== token) return;
      pending = false;
      session = { actor: actor.id, origin, point: origin, from: origin, game: startGame(kind, performance.now()), jumpedAt: -Infinity, feet: 2 };
      actions.played(actor.id, kind);
      actions.preview(session); tick();
    });
  }
  function jump(cell?: number) {
    if (!session) return;
    // A jump pressed during the current one is kept and played as soon as it lands (in `tick`), never dropped.
    if (performance.now() - session.jumpedAt < jumpMs) { queued = { cell }; return; }
    const now = performance.now(), before = session.game;
    const next = before.kind === 'rope' ? ropeStep(before, now) : hopStep(before, cell ?? hopCells(before)[0]!);
    if (next === before) return;
    const cells = hopCells(before);
    session = { ...session, game: next, from: session.point, point: before.kind === 'rope' ? session.point : hopPosition(session.origin, cells[0]!), jumpedAt: now, feet: before.kind === 'rope' ? 2 : cells.length };
    actions.preview(session); render(view, session, now);
    cheer(actions, session.actor, gameReactions(before, next, nameOf(actions.world().actors.find(a => a.id === session!.actor)!)));
  }
  function tap(point: Point) {
    if ((session || pending) && playing && clap(actions, playing, point)) return;
    if (!session) return;
    if (session.game.kind === 'rope') { jump(); return; }
    const tile = hopTileAt(session.origin, point);
    if (tile) jump(tile.cell);
  }
  function tick() {
    if (!session) return;
    const now = performance.now();
    if (queued && now - session.jumpedAt >= jumpMs) { const { cell } = queued; queued = null; jump(cell); }
    render(view, session, now);
    follow(actions, session.game.kind, session.origin, gamePosition(session, now, reducedMotion()));
    frame = requestAnimationFrame(tick);
  }
  return { cancel, open: view.open };
}

/** The panel mirrors the scene: the label of the jump, a short line and, for the rope, the beat. */
function render(view: ReturnType<typeof gameControls>, value: GamePreview, now: number) {
  const cells = hopCells(value.game);
  if (value.game.kind === 'rope') {
    const message = { ready: 'Espere a corda chegar.', jump: 'Isso! Continue no seu ritmo.', again: 'Tente no próximo “Agora!”.' }[value.game.feedback];
    view.update('playing', 'Pular', message, false, ropeCue(value.game, now) ? 'Agora!' : 'Prepare…');
  } else {
    const done = !cells.length;
    view.update(done ? 'complete' : 'playing', `Pular para ${cells.join(' e ')}`, done ? 'Ida e volta! De novo?' : cells.length === 2 ? 'Dois pés nas casas iluminadas.' : 'Um pé na casa iluminada.', false);
  }
}
/** Someone watching claps when touched (true); the game goes on. */
function clap(actions: Actions, player: ActorId, point: Point) {
  const watcher = spectatorAt(actions.world(), player, point); if (!watcher) return false;
  actions.react(watcher, 'clap', say(gameLines.clap, nameOf(actions.world().actors.find(a => a.id === player)!))); return true;
}
/** The child's reaction, and the others in the room clapping (only the first one speaks). */
function cheer(actions: Actions, player: ActorId, reactions: GameReaction[]) {
  const world = actions.world(), watchers = world.actors.filter(a => a.id !== player && a.kind === 'human' && a.room === world.room);
  for (const r of reactions) {
    if (r.who === 'player') actions.react(player, r.pose, r.line);
    else watchers.forEach((w, i) => actions.react(w.id, r.pose, i ? '' : r.line));
  }
}
/** Hopscotch: whoever stands over the board walks a few steps off it, and the camera frames the whole board. */
function makeRoom(actions: Actions, kind: GameKind, actor: Actor, origin: Point) {
  const moves = kind === 'hopscotch' ? stepAside(actions.world(), actor, origin) : [];
  actions.stroll(moves);
  for (const move of moves) actions.commit(move.actor, move.point);
  follow(actions, kind, origin, origin);
}
/** Hopscotch frames the whole board (centred, no slack); the rope follows the child. */
function follow(actions: Actions, kind: GameKind, origin: Point, child: Point) {
  if (kind === 'hopscotch') actions.follow(hopFocus(origin), 0); else actions.follow(child);
}
/** Who plays: the selected child, or, if a cat is selected, the child nearest to it. */
export function player(world: World, selected: ActorId): Actor | undefined {
  const chosen = world.actors.find(a => a.id === selected)!;
  if (chosen.kind === 'human' && chosen.room === world.room) return chosen;
  return world.actors.filter(a => a.kind === 'human' && a.room === world.room)
    .sort((a, b) => Math.hypot(a.x - chosen.x, a.y - chosen.y) - Math.hypot(b.x - chosen.x, b.y - chosen.y))[0];
}
