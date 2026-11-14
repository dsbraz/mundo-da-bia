import { adultIds } from '../domain/family';
import { lesson } from '../domain/school';
import { staffAt } from '../domain/staff';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { Action, ActorId } from '../domain/types';
import type { PlayScene } from '../presentation/scene';
import type { sceneFeedback } from './scene-feedback';

interface SchoolDeps {
  /** The app root: its action ring is put away while the board draws, so it never covers the lesson. */
  root: HTMLElement;
  town: () => Neighborhood; selected: () => ActorId;
  /** Commits a neighborhood changed by the lesson (saved and drawn), outside the undo history, like the market. */
  apply: (town: Neighborhood) => void;
  scene: Pick<PlayScene, 'lessons' | 'poke'>;
  feedback: Pick<ReturnType<typeof sceneFeedback>, 'missing' | 'sound'>;
}
/** The school in play (W3L-26): the board tapped starts the lesson where the children sit (Daniel and Fabiana never count as pupils);
 *  nobody at a desk shows the desk missing. */
export function schoolPlay(deps: SchoolDeps) {
  deps.scene.lessons.finished = pupils => { pupils.forEach(id => deps.scene.poke(id, 'cheer', '')); deps.feedback.sound.cue('cheer'); };
  const boardAt = (id: number) => {
    const where = deps.town().location;
    if (where.kind !== 'interior') return null;
    const piece = deps.town().buildings.find(b => b.id === where.building)?.layout.pieces.find(p => p.id === id && p.room === where.room);
    return piece?.kind === 'board' ? { building: where.building, room: where.room, grownUps: adultIds, staffed: staffAt(deps.town(), where)?.profession === 'teacher' } : null;
  };
  const board = () => { const where = deps.town().location; return where.kind === 'interior' ? deps.town().buildings.find(b => b.id === where.building)?.layout.pieces.find(p => p.room === where.room && p.kind === 'board') : undefined; };
  return {
    /** The teacher tapped (lot 7): the same as tapping her board. */
    teach(): boolean { const piece = board(); return !!piece && this.intercept({ type: 'use', id: piece.id }); },
    /** A tap on a board: the lesson begins (a second tap while it is drawn changes nothing). */
    intercept(action: Action): boolean {
      const room = action.type === 'use' ? boardAt(action.id) : null;
      if (!room || action.type !== 'use') return false;
      if (deps.scene.lessons.active()) return true;
      const result = lesson(deps.town(), room);
      if (result.outcome.kind === 'missing') deps.feedback.missing('seat', { actor: deps.selected(), want: 'school-desk' });
      if (result.outcome.kind !== 'lesson') return true;
      deps.root.classList.remove('actor-chosen');
      deps.scene.lessons.start(action.id, result.outcome.theme, result.outcome.pupils, performance.now());
      deps.apply(result.town);
      deps.feedback.sound.cue('pick');
      return true;
    },
  };
}
