import { isAdult } from '../domain/family';
import type { Profession } from '../domain/staff';
import type { Actor, Point, World } from '../domain/types';
import type { PlayScene } from '../presentation/scene';
import type { Cue } from '../presentation/sound';
import type { sceneFeedback } from './scene-feedback';
import type { schoolPlay } from './school';

interface StaffDeps {
  state: () => World;
  scene: Pick<PlayScene, 'staff' | 'poke'>;
  school: Pick<ReturnType<typeof schoolPlay>, 'teach'>;
  feedback: Pick<ReturnType<typeof sceneFeedback>, 'sound'>;
}
const cues: Record<Profession, Cue> = { teacher: 'page', firefighter: 'splash', police: 'beep', doctor: 'clink', coach: 'pop', clerk: 'page' };
/** The children standing or sitting in the room shown (never a cat, never a grown-up). */
const children = (state: World) => state.actors.filter(a => a.room === state.room && a.kind === 'human' && !isAdult(a.id));
const nearest = (kids: Actor[], x: number) => kids.reduce<Actor | undefined>((best, a) => !best || Math.abs(a.x - x) < Math.abs(best.x - x) ? a : best, undefined);
/** The professionals in play (lot 7): a tap on one plays the trade. The teacher starts the lesson, as her board does; the doctor
 *  listens to the nearest child's heart (a happy child, nothing relieved); the coach's and the police officer's whistle make the
 *  children hop. Nothing is saved. */
export function staffPlay(deps: StaffDeps) {
  return {
    /** A tap at `point` (scene units): true when it touched the professional (the tap is hers, nobody walks there). */
    tap(point: Point): boolean {
      const staff = deps.scene.staff.at();
      if (!staff || !deps.scene.staff.hit(point)) return false;
      const kid = staff.profession === 'doctor' ? nearest(children(deps.state()), staff.x) : undefined;
      if (!deps.scene.staff.act(performance.now(), kid ? { x: kid.x, y: kid.y } : null)) return true;
      if (staff.profession === 'teacher') deps.school.teach();
      if (kid) deps.scene.poke(kid.id, 'cheer', '');
      if (staff.profession === 'coach' || staff.profession === 'police') children(deps.state()).forEach(a => deps.scene.poke(a.id, 'hop', ''));
      deps.feedback.sound.cue(cues[staff.profession]);
      return true;
    },
  };
}
