import type Phaser from 'phaser';
import { staffAt, type Staff } from '../domain/staff';
import { roomWidth } from '../domain/geometry';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { Point, World } from '../domain/types';
import { actorScale, figureHeight } from './pose';
import { contactShadow } from './contact-shadow';
import { drawTrade, tradeMs } from './staff-effects';

/** Drawn like the grown-ups (lot 7): their height and their 140 × 264 canvas, at the interior scale of a person. */
const grownUp = { id: 'daniel', kind: 'human', x: 0, y: 0, seat: null, room: 'sala', look: 'sol', fed: true, resting: false } as const;
export const staffScale = () => figureHeight(grownUp) * actorScale(grownUp) / 264;
/** Facing the middle of the room (her tool on that side), or the one she goes to. */
export const facing = (x: number, toward: number) => toward < x ? -1 : 1;
/** How far along the way to `target` the doctor is at `t` ms of her visit: there in 400 ms, back in the last 400 ms. */
export function visit(t: number, reduced: boolean): number {
  if (reduced) return t < tradeMs ? 1 : 0;
  return Math.max(0, Math.min(1, t / 400, (tradeMs - t) / 400));
}
/** Where she stands on the way to `target` (beside the child, facing her), `along` of the way there. */
const goes = (from: Point, target: Point | null, side: number, along: number): Point => target ? { x: from.x + (target.x - 92 * side - from.x) * along, y: from.y + (target.y - from.y) * along } : from;
type Doing = { start: number; target: Point | null };
/** How long the trade has played (a lesson without a tap shows its last frame). */
const elapsed = (doing: Doing | null, now: number) => doing ? now - doing.start : tradeMs - 1;
const sameRoom = (a: Staff | null, b: Staff | null) => a?.building === b?.building && a?.room === b?.room;
/** The professional's figure at her spot: shadow and pose (body, resting arm, working arm), facing `side`. */
function drawStaff(scene: Phaser.Scene, staff: Staff, side: number) {
  const k = staffScale(), part = (name: string) => scene.add.image(0, 0, `staff-${staff.profession}-${name}`).setName(name).setOrigin(.5, 1).setDisplaySize(140 * k, 264 * k);
  const pose = scene.add.container(0, 0, [part('body'), part('arm'), part('act')]).setName('pose').setScale(side, 1);
  return scene.add.container(staff.x, staff.y, [contactShadow(scene, 0, 2, 64, 9, 0x716858), pose]).setDepth(staff.y).setName('staff');
}
/** A slow breath, none with reduced motion. */
const breath = (now: number, reduced: boolean) => reduced ? 1 : 1 + .012 * Math.sin(now / 650);
/** The working arm instead of the resting one, the way she faces and her breath. */
function posture(figure: Phaser.GameObjects.Container, working: boolean, side: number, breath: number) {
  const pose = figure.getByName<Phaser.GameObjects.Container>('pose');
  pose.getByName<Phaser.GameObjects.Image>('arm').setVisible(!working); pose.getByName<Phaser.GameObjects.Image>('act').setVisible(working);
  pose.setScale(side, breath);
}
/** The professional of the room shown: drawn at her spot, breathing; a tap plays the trade for `tradeMs`. Never a character. */
export function staffFigures(scene: Phaser.Scene) {
  let staff: Staff | null = null, figure: Phaser.GameObjects.Container | null = null, effects: Phaser.GameObjects.Graphics | null = null;
  let doing: Doing | null = null, side = 1;
  const mark = (key: string, value: string) => { if (navigator.webdriver && scene.game.canvas.dataset[key] !== value) scene.game.canvas.dataset[key] = value; };
  /** Whether the trade is shown at `now`: a tap's, or the teacher's whole lesson. */
  const busy = (now: number, teaching: boolean) => {
    if (doing && now - doing.start >= tradeMs) doing = null;
    return !!doing || (teaching && staff?.profession === 'teacher');
  };
  return {
    at: () => staff,
    paint(town: Neighborhood | null, state: World) {
      const here = town && !state.streetWidth ? staffAt(town, town.location) : null;
      if (!sameRoom(here, staff)) doing = null;
      staff = here; figure = effects = null; mark('staff', here ? `${here.profession}:${here.x},${here.y}` : '');
      if (!here || !scene.textures.exists(`staff-${here.profession}-act`)) return;
      side = facing(here.x, roomWidth(state) / 2);
      figure = drawStaff(scene, here, side); effects = scene.add.graphics().setDepth(here.y + 1);
    },
    /** Whether `point` (scene units) touches the drawn professional. */
    hit(point: Point): boolean {
      const k = staffScale();
      return !!staff && !!figure && Math.abs(point.x - figure.x) <= 52 * k && point.y <= staff.y + 8 && point.y >= staff.y - 250 * k;
    },
    /** The trade begins (`target`: whom the doctor goes to); a second tap while it plays changes nothing. */
    act(now: number, target: Point | null = null) { if (!staff || busy(now, false)) return false; doing = { start: now, target }; return true; },
    frame(now: number, reduced: boolean, teaching: boolean) {
      if (!staff || !figure || !effects) return;
      const working = busy(now, teaching), t = elapsed(doing, now), target = doing?.target ?? null;
      mark('staffAct', working ? staff.profession : '');
      const turned = target ? facing(staff.x, target.x) : side;
      posture(figure, working, turned, breath(now, reduced));
      const at = goes(staff, target, turned, visit(t, reduced));
      figure.setPosition(at.x, at.y).setDepth(at.y + (target ? 2 : 0)); effects.setDepth(at.y + 3);
      effects.clear();
      if (working) drawTrade(effects, staff.profession, { ...at, side: turned, k: staffScale() }, t, reduced, target);
    },
  };
}
