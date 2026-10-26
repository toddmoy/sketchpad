import { DEFAULT_THEME, TLDefaultColor, TLTheme, TLUiOverrides } from 'tldraw'

declare module 'tldraw' {
  interface TLThemeDefaultColors {
    'grey-1': TLDefaultColor
    'grey-2': TLDefaultColor
    'grey-3': TLDefaultColor
    'grey-4': TLDefaultColor
  }
}

// Four neutral greys, darkest to lightest, filling the gap between black and white.
// In dark mode the ramp flips, the same way tldraw's black becomes near-white.
const LIGHT = ['#3d3d3d', '#5f5f5f', '#828282', '#c4c4c4']
const DARK = ['#cfcfcf', '#a8a8a8', '#808080', '#4d4d4d']

function mix(a: string, b: string, t: number) {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return (
    '#' +
    [0, 1, 2]
      .map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0'))
      .join('')
  )
}

function grey(solid: string, dark: boolean): TLDefaultColor {
  const bg = dark ? '#101011' : '#ffffff'
  const text = dark ? '#f2f2f2' : '#000000'
  return {
    solid,
    fill: solid,
    linedFill: mix(solid, bg, 0.2),
    semi: mix(solid, bg, 0.8),
    pattern: mix(solid, bg, 0.3),
    frameHeadingStroke: mix(solid, bg, 0.3),
    frameHeadingFill: mix(solid, bg, 0.9),
    frameStroke: mix(solid, bg, 0.3),
    frameFill: mix(solid, bg, 0.95),
    frameText: text,
    noteFill: mix(solid, bg, 0.4),
    noteText: text,
    highlightSrgb: mix(solid, bg, 0.5),
    highlightP3: mix(solid, bg, 0.5),
  }
}

const greys = (ramp: string[], dark: boolean) =>
  Object.fromEntries(ramp.map((hex, i) => [`grey-${i + 1}`, grey(hex, dark)])) as Record<
    'grey-1' | 'grey-2' | 'grey-3' | 'grey-4',
    TLDefaultColor
  >

const theme: TLTheme = {
  ...DEFAULT_THEME,
  colors: {
    light: { ...DEFAULT_THEME.colors.light, ...greys(LIGHT, false) },
    dark: { ...DEFAULT_THEME.colors.dark, ...greys(DARK, true) },
  },
}

export const themes = { default: theme }

export const paletteTranslations: TLUiOverrides['translations'] = {
  en: {
    'color-style.grey-1': 'Darkest grey',
    'color-style.grey-2': 'Dark grey',
    'color-style.grey-3': 'Mid grey',
    'color-style.grey-4': 'Light grey',
  },
}
