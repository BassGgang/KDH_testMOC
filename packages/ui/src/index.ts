export const designTokens = {
  colors: {
    navy950: '#020617',
    navy900: '#0A192F',
    navy800: '#112240',
    accentRed: '#B91C1C',
    white: '#FFFFFF',
  },
  fontFamily: {
    sans: '"Inter", system-ui, -apple-system, sans-serif',
  },
} as const;

export type DesignTokens = typeof designTokens;
