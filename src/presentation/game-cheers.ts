import { hopCells } from '../domain/child-games';
import type { ChildGame } from '../domain/child-games';
import type { ActorId, Point, World } from '../domain/types';
import { gameLines } from '../content/personalities';
import type { ReactionPose } from '../content/personalities';
import { say } from '../content/feedback-text';
import { actorAt } from './targets';

/** Who a tap during a game lands on, when it is someone watching (never the child who plays). */
export function spectatorAt(world: World, player: ActorId, point: Point): ActorId | undefined {
  const who = actorAt(world, point);
  return who && who.id !== player ? who.id : undefined;
}
export interface GameReaction { who: 'player' | 'spectators'; pose: ReactionPose; line: string }
/** What the scene shows after a jump: a funny face on a rope miss; at the end of the hopscotch, arms up and the others clapping. */
export function gameReactions(before: ChildGame, next: ChildGame, name: string): GameReaction[] {
  if (next.kind === 'rope') return next.feedback === 'again' ? [{ who: 'player', pose: 'goof', line: say(gameLines.goof, name) }] : [];
  if (!hopCells(before).length || hopCells(next).length) return [];
  return [{ who: 'player', pose: 'cheer', line: say(gameLines.cheer, name) }, { who: 'spectators', pose: 'clap', line: say(gameLines.clap, name) }];
}
