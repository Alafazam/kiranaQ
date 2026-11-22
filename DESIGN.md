# Design: KiranaQ

The locked design system for the web app. Every screen follows it. Change it on purpose; this file is the rule.
Based on the Hallmark design rules (app-screen scope) and its **Dose** theme (warm paper, one green, label-style numbers), adapted for a kirana stock notebook.

## System
- Scope: app screens (a tool the owner works in, not a marketing page). No hero, no stock photos, no reveal on load.
- Theme: Dose, adapted. Vibe: "warm shop notebook, calm, exact, big numbers".
- Signature: the distributor card. A pale tinted band per distributor: who comes next, what runs out before that visit, what to order.
- Users: a kirana owner, often one-handed, in a bright shop, Hindi first.

## Tokens
`web/src/tokens.css` is the source of truth. Tailwind maps names to these variables. No hex, rgb or `font-family` outside this block.
```css
:root {
  --color-paper: oklch(97.6% 0.011 88);  --color-paper-2: oklch(96.5% 0.02 160);  --color-paper-3: oklch(93% 0.036 160);
  --color-surface: oklch(99.5% 0.004 88);
  --color-ink: oklch(21% 0.025 170);  --color-ink-2: oklch(31% 0.02 170);  --color-muted: oklch(49% 0.024 165);
  --color-rule: oklch(86.5% 0.022 140);
  --color-accent: oklch(50% 0.13 160);  --color-accent-deep: oklch(42% 0.11 162);
  --color-accent-soft: oklch(88% 0.08 160);  --color-accent-ink: oklch(99% 0.006 160);
  --color-focus: oklch(45% 0.14 160);
  --color-danger: oklch(52% 0.17 30);  --color-danger-soft: oklch(93% 0.04 30);   /* variant, see below */
  /* distributor tints: identity only, never a state. Assigned in order. */
  --t-1: oklch(87.5% 0.058 64);  --t-2: oklch(87% 0.048 210);  --t-3: oklch(84% 0.045 270);
  --t-4: oklch(91.5% 0.064 98);  --t-5: oklch(84% 0.048 322);
  --font-display: "Schibsted Grotesk", "Noto Sans Devanagari", ui-sans-serif, sans-serif;
  --font-body: "Instrument Sans", "Noto Sans Devanagari", ui-sans-serif, sans-serif;
  --font-label: "DM Mono", ui-monospace, monospace;
  --radius-control: 10px;  --radius-card: 14px;  --radius-pill: 999px;
  --shadow-lift: 0 1px 1px oklch(30% 0.03 165 / 0.10), 0 12px 24px -14px oklch(36% 0.06 165 / 0.30);
  --dur-micro: 120ms;  --dur-short: 200ms;  --ease-out: cubic-bezier(0.2, 0, 0, 1);
}
```
Dark (night ground): same names, redefined under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]`. Paper `oklch(13% 0.01 170)`, ink `oklch(96% 0.01 160)`, tints at 40% lightness, mint with dark ink, danger lightened for contrast.
Fonts: Google Fonts `Schibsted Grotesk:700`, `Instrument Sans:400;500`, `DM Mono:400;500`, `Noto Sans Devanagari:400;500;700`.

## Type
- Fixed scale, ratio 1.2: 14 / 17 / 20 / 24 / 29 px. No fluid heads. Body 17px, Instrument Sans 400/500, line-height 1.5.
- Headings: Schibsted Grotesk 700, tracking -0.02em, one color (ink), sentence case.
- Counts, quantities, dates, days left: DM Mono 500, `tabular-nums`, set like a stock label (`12 pcs`, `2 cases`, `24 Nov`, `5 days`). 20–29px where the number is the point.
- Hindi text falls back to Noto Sans Devanagari at the same size; DM Mono is for digits and units only.
- Labels: body face, one step smaller, sentence case. Never tracked capitals, never small caps. Three weights per screen: 400, 500, 700.

## Controls
- Moulded, from Dose: 52px tall, `--radius-control`, 1px rim and a 3px rim below, sinks 3px on press (`transform` only).
- Primary: green (`--color-accent` to `--color-accent-deep`), accent-ink text. One primary per screen. Secondary: clear with rule rim.
- Stepper (− qty +): two 52px keys around a DM Mono number.
- Choices (language, theme, yes/no): keys, mint (`--color-accent-soft`) when selected.
- Every control has 8 states: default, hover, focus-visible, active, disabled, busy, error, success. `:focus-visible` is a 2px `--color-focus` ring, shown at once.
- Icons: `lucide-react` only, 20–24px, stroke 2. Never an emoji as an icon.

## Surfaces
- Paper ground, white surfaces lifted on `--shadow-lift`. 14px cards, 10px controls, pills for tags.
- Distributor card: a pale band in its tint (`--t-n` at about 60% over paper), the distributor name and next visit on top, white rows inside. Rows, never cards inside cards.
- A confirmed order or a recorded visit shows a small green double-ringed stamp in DM Mono ("Ordered 24 Nov", "Delivered 22 Nov"), rotated 2 degrees. Not yet confirmed: the same stamp in grey.

## Color use
- Green does every positive signal: primary action, current tab, selected key, confirmed stamp.
- Status is never color alone. Each has an icon and a word: danger + `AlertTriangle` + "Runs out"; ink + `ShoppingCart` + "Order"; muted + `CheckCircle2` + "Enough"; muted + `Clock` + "First log".
- Tints mark which distributor, nothing else.
- Text contrast at least 4.5:1 on paper, surface and tints, in both themes.

## Variants (where KiranaQ differs from Dose)
- **Danger red is allowed for one state only: "runs out before the visit".** Dose says late is grey. Here the owner must act (call the distributor), so it gets red, an icon and a word. Nothing else is red.
- 52px controls also serve the 48px one-hand target (above the 44px app default).
- No window light, no fibre grain animation, no 3D plastic: a phone in a shop needs speed. A static grain on the paper is optional.

## Layout
- Content max width 480px, centered. 16px side gutters. `overflow-x: clip` on `html` and `body` (never `hidden`, never `100vw`).
- Shell: top bar plus a bottom tab bar (Home, Orders, Settings). No sidebar, no hamburger.
- Meta in separate elements or lines. Never strings joined with middle dots, never arrows glued to text, never decorative status dots.
- Primary actions in the bottom third of the screen.

## States
Every region that loads data draws four states: loading (a skeleton in the shape of the content), empty (what belongs here and the one action that fills it), error (what broke and what to do), full. Discard log and reset demo ask first; removing a photo or an item shows an undo toast.

## Motion
- Calm. Motion shows state only: key press, bottom sheet, toast, stamp landing.
- `transform` and `opacity` only, `--dur-micro` or `--dur-short`. Never `transition: all`. Never animate width, height, top or left.
- `prefers-reduced-motion: reduce`: every transition ends at once.

## Voice
A shopkeeper's plainness: item, count, day, who comes. "Surf runs out tomorrow. Sharma comes Tuesday." Hindi or English from `i18n.js`. Never an invented number: every figure comes from the owner's logs or the rule.
