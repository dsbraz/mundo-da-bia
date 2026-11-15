import { adultIds } from '../domain/family';
import { lesson, type Classroom, type Subject } from '../domain/school';
import { staffAt } from '../domain/staff';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { Action, ActorId, Point, World } from '../domain/types';
import { pieceBounds } from '../domain/layout';
import { nearestApproach } from '../presentation/equipment-interaction';
import type { PlayScene } from '../presentation/scene';
import { subjectChooser } from '../presentation/subject-chooser';
import '../presentation/subject-chooser.css';
import type { sceneFeedback } from './scene-feedback';

interface SchoolDeps {
  /** The app root: its action ring is put away while the board is written, so it never covers the lesson. */
  root: HTMLElement;
  town: () => Neighborhood; selected: () => ActorId;
  /** Commits a neighborhood changed by the lesson (saved and drawn), outside the undo history, like the market. */
  apply: (town: Neighborhood) => void;
  scene: Pick<PlayScene, 'lessons' | 'poke'>;
  feedback: Pick<ReturnType<typeof sceneFeedback>, 'missing' | 'sound'>;
  /** Walks the selected character to the side of board `piece`, then `done` (#30); false when there is no way there. */
  walkToBoard?: (piece: number, done: () => void) => boolean;
}
/** Where `actor` stands to write at board `piece` (#30): on the floor beside it, to its right, where she can walk; null if she can't. */
export function boardSide(world: World, actor: ActorId, piece: number): Point | null {
  const board = world.layout.pieces.find(p => p.id === piece), resident = world.actors.find(a => a.id === actor);
  if (!board || !resident) return null;
  return nearestApproach(world, resident, { x: board.x + pieceBounds.board.width + 40, y: board.y + pieceBounds.board.height + 40 });
}
/** The school in play (W3L-26): the board tapped, with children at the desks, offers the subject (lot 8D: drawing, writing or math)
 *  and the chosen one starts the lesson; nobody at a desk shows the desk missing (Daniel and Fabiana never count as pupils). */
export function schoolPlay(deps: SchoolDeps) {
  let board: number | null = null;
  deps.scene.lessons.finished = pupils => { pupils.forEach(id => deps.scene.poke(id, 'cheer', '')); deps.feedback.sound.cue('cheer'); };
  const boardAt = (id: number): Classroom | null => {
    const where = deps.town().location;
    if (where.kind !== 'interior') return null;
    const piece = deps.town().buildings.find(b => b.id === where.building)?.layout.pieces.find(p => p.id === id && p.room === where.room);
    return piece?.kind === 'board' ? { building: where.building, room: where.room, grownUps: adultIds, staffed: staffAt(deps.town(), where)?.profession === 'teacher', writer: deps.selected() } : null;
  };
  const roomBoard = () => { const where = deps.town().location; return where.kind === 'interior' ? deps.town().buildings.find(b => b.id === where.building)?.layout.pieces.find(p => p.room === where.room && p.kind === 'board') : undefined; };
  /** The subject chosen: the lesson begins on the board tapped, if it is still in view with a child at a desk. With no teacher there,
   *  the selected child walks to the board first and writes it herself (#30); `walked`: she is there. */
  function choose(subject: Subject, walked = false) {
    const room = board === null ? null : boardAt(board);
    if (!room || deps.scene.lessons.active()) return;
    const result = lesson(deps.town(), room, subject);
    if (result.outcome.kind !== 'lesson') return;
    const teacher = result.outcome.teacher;
    if (!walked && teacher === deps.selected() && deps.walkToBoard?.(board!, () => choose(subject, true))) return;
    deps.root.classList.remove('actor-chosen');
    deps.scene.lessons.start(board!, result.outcome.theme, result.outcome.pupils, performance.now(), teacher);
    deps.apply(result.town);
    deps.feedback.sound.cue('pick');
  }
  const chooser = subjectChooser(deps.root, { choose });
  return {
    /** The teacher tapped (lot 7): the same as tapping her board. */
    teach(): boolean { const piece = roomBoard(); return !!piece && this.intercept({ type: 'use', id: piece.id }); },
    /** A tap on a board: the subjects are offered (a tap while they are, or while the lesson is written, changes nothing). */
    intercept(action: Action): boolean {
      const room = action.type === 'use' ? boardAt(action.id) : null;
      if (!room || action.type !== 'use') return false;
      if (deps.scene.lessons.active()) return true;
      const outcome = lesson(deps.town(), room).outcome;
      if (outcome.kind === 'missing') deps.feedback.missing('seat', { actor: deps.selected(), want: 'school-desk' });
      if (outcome.kind !== 'lesson') return true;
      board = action.id; chooser.open();
      return true;
    },
    /** After every change: away from the board tapped, the subjects are put away. */
    refresh() { if (chooser.isOpen() && (board === null || !boardAt(board))) chooser.close(); },
  };
}
