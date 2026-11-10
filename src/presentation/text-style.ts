import type Phaser from 'phaser';
import { palette } from './palette';
type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;
export const fontStack = '"Nunito", "Trebuchet MS", system-ui, sans-serif';
const base = { fontFamily: fontStack, resolution: 2 };
const bold = { ...base, fontStyle: '800' };
export const textStyles = {
  label: { ...bold, fontSize: '16px', color: palette.labelInk, backgroundColor: palette.labelBg, padding: { x: 10, y: 4 } },
  bubble: { ...bold, fontSize: '22px', color: palette.plum, align: 'center' },
  sign: { ...bold, fontSize: '16px', color: palette.moss },
  plaza: { ...bold, fontSize: '22px', color: '#587563', backgroundColor: palette.signBg, padding: { x: 18, y: 10 } },
  hopscotch: { ...bold, fontSize: '22px', color: palette.chalk },
  live: { ...bold, fontSize: '18px', color: '#425b66', backgroundColor: '#f3efe4', padding: { x: 12, y: 8 } },
  effect: { ...bold, fontSize: '24px', color: '#3f8799' },
  mark: { ...bold, fontSize: '21px', color: '#77558b' },
  heart: { ...bold, fontSize: '20px', color: '#d75c78' },
} satisfies Record<string, TextStyle>;
export type TextStyleName = keyof typeof textStyles;
export function textStyle(name: TextStyleName, overrides: Omit<TextStyle, 'fontFamily'> = {}): TextStyle {
  return { ...textStyles[name], ...overrides, fontFamily: fontStack };
}
export function loadFonts(limitMs = 1500): Promise<void> {
  const fonts = (globalThis.document as Document | undefined)?.fonts;
  if (!fonts) return Promise.resolve();
  const loaded = Promise.all(['600', '800'].map(weight => fonts.load(`${weight} 16px Nunito`))).then(() => {}, () => {});
  return Promise.race([loaded, new Promise<void>(resolve => setTimeout(resolve, limitMs))]);
}
