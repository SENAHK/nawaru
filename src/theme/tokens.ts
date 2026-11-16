export const palette = {
  stone: {
    0: '#FFFDF9', 50: '#F7F3EE', 100: '#ECE6DD', 200: '#D9D1C6', 300: '#BDB3A6',
    400: '#9C9184', 500: '#7A6F63', 600: '#5A5148', 700: '#3D362F', 800: '#2C2722',
    850: '#221E1A', 900: '#1A1714', 950: '#12100E',
  },
  heather: {
    50: '#F4F0FA', 100: '#E6DDF5', 200: '#CDBDEB', 300: '#B39CE0', 400: '#9A7DD4',
    500: '#8263C2', 600: '#6A4DA8', 700: '#533B85', 800: '#3D2C62', 900: '#2A1F44',
  },
  moss: { 300: '#8BAA67', 500: '#6F8F4E', 700: '#4F6B3A', 900: '#2F4026' },
  sky: { 300: '#7FA3C4', 700: '#3F6488', 900: '#2E4459' },
  clay: { 300: '#E0745A', 600: '#B4432A', 900: '#5A3E2B' },
  sand: { 300: '#D9C49A', 600: '#9C8455' },
} as const;

const p = palette;

export const darkColors = {
  bg: p.stone[950],
  surface: p.stone[900],
  surfaceRaised: p.stone[850],
  surfaceSunken: '#0C0B09',
  border: p.stone[800],
  borderStrong: p.stone[700],
  textPrimary: p.stone[50],
  textSecondary: p.stone[300],
  textTertiary: p.stone[500],
  accent: p.heather[400],
  accentPressed: p.heather[500],
  onAccent: p.stone[950],
  accentText: p.heather[300],
  accentSubtle: 'rgba(154, 125, 212, 0.16)',
  success: p.moss[300],
  danger: p.clay[300],
  info: p.sky[300],
  missed: p.stone[500],
} as const;

export type ColorTokens = { [K in keyof typeof darkColors]: string };

export const lightColors: ColorTokens = {
  bg: p.stone[50],
  surface: p.stone[0],
  surfaceRaised: '#FFFFFF',
  surfaceSunken: p.stone[100],
  border: p.stone[200],
  borderStrong: p.stone[300],
  textPrimary: p.stone[900],
  textSecondary: p.stone[600],
  textTertiary: p.stone[500],
  accent: p.heather[400],
  accentPressed: p.heather[500],
  onAccent: p.stone[950],
  accentText: p.heather[700],
  accentSubtle: 'rgba(154, 125, 212, 0.18)',
  success: p.moss[700],
  danger: p.clay[600],
  info: p.sky[700],
  missed: p.stone[500],
};

// Same in both themes
export const timerPhases = {
  prep: { bg: p.stone[800], fg: p.heather[300] },
  on: { bg: p.heather[400], fg: p.stone[950] },
  off: { bg: p.moss[700], fg: p.stone[50] },
  rest: { bg: p.sky[900], fg: p.stone[50] },
  switch: { bg: p.clay[900], fg: p.stone[50] },
  done: { bg: p.moss[500], fg: p.stone[950] },
} as const;

export const categoryColors = {
  fingers: p.heather[400],
  strength: p.clay[300],
  climbing: p.moss[300],
  mobility: p.sky[300],
  conditioning: p.sand[300],
  warmup: p.stone[400],
} as const;

export const programColors = [
  p.heather[400], p.sky[300], p.moss[300], p.clay[300], p.sand[300], p.stone[300],
] as const;

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;

export const radius = { sm: 6, md: 10, lg: 16, xl: 24, full: 999 } as const;

export const motion = { fast: 120, base: 200, slow: 320 } as const;

export const touch = { min: 48, workout: 56, timer: 64 } as const;

export const typography = {
  timer: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 160, lineHeight: 160 },
  timerCompact: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 96, lineHeight: 96 },
  displayL: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 56, lineHeight: 60 },
  displayM: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 40, lineHeight: 44 },
  title1: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 28, lineHeight: 32 },
  title2: { fontFamily: 'Barlow_600SemiBold', fontSize: 20, lineHeight: 26 },
  title3: { fontFamily: 'Barlow_600SemiBold', fontSize: 17, lineHeight: 22 },
  body: { fontFamily: 'Barlow_400Regular', fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: 'Barlow_600SemiBold', fontSize: 16, lineHeight: 22 },
  bodySm: { fontFamily: 'Barlow_400Regular', fontSize: 14, lineHeight: 20 },
  label: { fontFamily: 'Barlow_600SemiBold', fontSize: 13, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  caption: { fontFamily: 'Barlow_500Medium', fontSize: 12, lineHeight: 16 },
} as const;
