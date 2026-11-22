// Tailwind maps names to the CSS variables in src/tokens.css. No raw colors here.
const v = (name) => `var(--${name})`
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      paper: v('color-paper'), 'paper-2': v('color-paper-2'), 'paper-3': v('color-paper-3'),
      surface: v('color-surface'),
      ink: v('color-ink'), 'ink-2': v('color-ink-2'), muted: v('color-muted'),
      rule: v('color-rule'),
      accent: v('color-accent'), 'accent-deep': v('color-accent-deep'),
      'accent-soft': v('color-accent-soft'), 'accent-ink': v('color-accent-ink'),
      focus: v('color-focus'),
      danger: v('color-danger'), 'danger-soft': v('color-danger-soft'),
      't-1': v('t-1'), 't-2': v('t-2'), 't-3': v('t-3'), 't-4': v('t-4'), 't-5': v('t-5'),
    },
    fontFamily: { display: v('font-display'), body: v('font-body'), label: v('font-label') },
    fontSize: {
      // Owner asked for a smaller scale: 13 / 15 / 18 / 21 / 25 px (ratio about 1.17).
      sm: ['13px', '1.45'], base: ['15px', '1.5'], lg: ['18px', '1.35'], xl: ['21px', '1.25'], '2xl': ['25px', '1.2'],
    },
    borderRadius: { none: '0', control: v('radius-control'), card: v('radius-card'), pill: v('radius-pill') },
    extend: {
      boxShadow: { lift: v('shadow-lift') },
      transitionDuration: { micro: v('dur-micro'), short: v('dur-short') },
      transitionTimingFunction: { out: v('ease-out') },
      height: { control: '52px' }, minHeight: { control: '52px' }, width: { control: '52px' },
      maxWidth: { app: '480px' },
    },
  },
  plugins: [],
}
