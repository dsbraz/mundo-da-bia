export type GameKind = 'rope' | 'hopscotch';
export interface ChildGame { kind: GameKind; started: number; step: number; lastBeat: number; jumpedAt: number; feedback: 'ready' | 'jump' | 'again' }
export function startGame(kind: GameKind, now: number): ChildGame {
  return { kind, started: now, step: 0, lastBeat: -1, jumpedAt: -Infinity, feedback: 'ready' };
}
export function ropeCue(game: ChildGame, now: number) {
  const elapsed = now - game.started, beat = Math.round(elapsed / 1600);
  return beat >= 1 && Math.abs(elapsed - beat * 1600) <= 250;
}
export function ropeStep(game: ChildGame, now: number): ChildGame {
  if (now - game.jumpedAt < 400) return game;
  const beat = Math.round((now - game.started) / 1600);
  if (beat === game.lastBeat) return game;
  const matched = ropeCue(game, now);
  return { ...game, jumpedAt: now, lastBeat: matched ? beat : game.lastBeat, feedback: matched ? 'jump' : 'again' };
}
const hops = [[1], [2], [3, 4], [5], [6, 7], [8], [6, 7], [5], [3, 4], [2], [1]];
export function hopCells(game: ChildGame): number[] { return hops[game.step] ?? []; }
export function hopStep(game: ChildGame, cell: number) {
  return hopCells(game).includes(cell) ? { ...game, step: game.step + 1 } : game;
}
