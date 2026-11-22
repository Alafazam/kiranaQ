# Design: KiranaQ

The locked design system for the web app. Every screen follows it. Change it on purpose; this file is the rule.
Based on the Hallmark design rules (app-screen scope) and its **Dose** theme (warm paper, one green, label-style numbers), adapted for a kirana stock notebook.

## System
- Scope: app screens (a tool the owner works in, not a marketing page). No hero, no stock photos, no reveal on load.
- Theme: Dose, adapted. Vibe: "warm shop notebook, calm, exact, big numbers".
- Signature: the distributor section: who comes next, what runs out before that visit, what to order. Distributor colour shows only as a stripe or dot (Distributors tab, Settings list).
- **Voice first.** The owner talks to the app ("Bolo"); it asks the next question and acts on the screen. Taps stay available for every action.
- **Light cream is the only default.** The users are not tech-savvy and work in bright shops: the app always opens light (cream paper, white cards, dark text), whatever the phone's system setting. Few colours, high contrast, nothing decorative.
- Users: a kirana owner, often one-handed, in a bright shop, Hindi first.

## Tokens
`web/src/tokens.css` is the source of truth. Tailwind maps names to these variables. No hex, rgb or `font-family` outside this block.
```css
:root {
  --color-paper: oklch(97% 0.022 85);   /* cream */  --color-paper-2: oklch(96.5% 0.02 160);  --color-paper-3: oklch(93% 0.036 160);
  --color-surface: oklch(99.5% 0.004 88);
  --color-ink: oklch(21% 0.025 170);  --color-ink-2: oklch(31% 0.02 170);  --color-muted: oklch(49% 0.024 165);
  --color-rule: oklch(86.5% 0.022 140);
  --color-accent: oklch(50% 0.13 160);  --color-accent-deep: oklch(42% 0.11 162);
  --color-accent-soft: oklch(88% 0.08 160);  --color-accent-ink: oklch(99% 0.006 160);
  --color-focus: oklch(45% 0.14 160);
  --color-danger: oklch(52% 0.17 30);  --color-danger-soft: oklch(93% 0.04 30);   /* variant, see below */
  /* distributor tints: identity only, never a state. Assigned in order. */
  /* used only as the card's left stripe and a small dot in lists; text never sits on them */
  --t-1: oklch(70% 0.12 60);  --t-2: oklch(62% 0.10 230);  --t-3: oklch(58% 0.10 290);
  --t-4: oklch(72% 0.12 100); --t-5: oklch(60% 0.12 330);
  --font-display: "Schibsted Grotesk", "Noto Sans Devanagari", ui-sans-serif, sans-serif;
  --font-body: "Instrument Sans", "Noto Sans Devanagari", ui-sans-serif, sans-serif;
  --font-label: "DM Mono", ui-monospace, monospace;
  --radius-control: 10px;  --radius-card: 14px;  --radius-pill: 999px;
  --shadow-lift: 0 1px 1px oklch(30% 0.03 165 / 0.10), 0 12px 24px -14px oklch(36% 0.06 165 / 0.30);
  --dur-micro: 120ms;  --dur-short: 200ms;  --ease-out: cubic-bezier(0.2, 0, 0, 1);
}
```
Dark (optional, only when the owner picks it in Settings): same names, redefined under `:root[data-theme="dark"]` only. No `prefers-color-scheme` switch: the app never turns dark on its own. Settings theme choices: Light (default) and Dark. Paper `oklch(13% 0.01 170)`, ink `oklch(96% 0.01 160)`, stripe colours at 55% lightness, mint with dark ink, danger lightened for contrast.
Fonts: Google Fonts `Schibsted Grotesk:700`, `Instrument Sans:400;500`, `DM Mono:400;500`, `Noto Sans Devanagari:400;500;700`.

## Type
- Fixed scale (owner's choice, smaller than Dose): 14 / 15 / 18 / 21 / 25 px. No fluid heads. Body 15px, Instrument Sans 400/500, line-height 1.5. Small text stays 14px so Hindi matras read well.
- Headings: Schibsted Grotesk 700, tracking -0.02em, one color (ink), sentence case.
- Counts, quantities and dates: DM Mono 500, `tabular-nums`, set like a stock label (`12 pcs`, `2 cases`, `24 Nov`). 18–25px where the number is the point. Words (weekdays, stamp text, "days left") use the body face.
- Hindi text falls back to Noto Sans Devanagari at the same size; DM Mono is for digits and units only.
- Labels: body face, one step smaller, sentence case. Never tracked capitals, never small caps. Three weights per screen: 400, 500, 700.

## Controls
- Simple and flat: 52px tall, `--radius-control`, solid fill or a 1.5px border, no bevel or gradient. Press feedback: a slightly darker fill (`transform` only for motion).
- Primary: green (`--color-accent` to `--color-accent-deep`), accent-ink text. One primary per screen, with one exception: on Result and Orders each distributor card has its own primary "Confirm order" (the card is the unit of work), and no other primary shows there. Secondary: clear with rule rim.
- Stepper (− qty +): two 52px keys around a DM Mono number.
- Choices (language, theme, yes/no): keys, mint (`--color-accent-soft`) when selected.
- Every control has 8 states: default, hover, focus-visible, active, disabled, busy, error, success. `:focus-visible` is a 2px `--color-focus` ring, shown at once.
- Icons: `lucide-react` only, 20–24px, stroke 2. Never an emoji as an icon.

## Surfaces
- Paper ground, white surfaces lifted on `--shadow-lift`. 14px cards, 10px controls, pills for tags.
- Home strip: plain white cards (name, weekday, date, "in N days", runs-out count), no colour.
- Orders and Result: one plain section per distributor on cream (no card, no stripe), a 2px rule line between distributors, rows split by 1px rules. Distributors with a runs-out item come first; a one-line summary on top says what runs out and whom to call first.
- Distributors tab: white card per distributor with a 6px left stripe in its colour (`--t-n`). Settings list: a small colour bar.
- Rows, never cards inside cards. Item rows: a 40–48px product thumbnail (or a neutral letter tile), English name, Hindi name smaller below.
- A confirmed order shows a small green double-ringed stamp ("Ordered 24 Nov"), rotated 2 degrees; not yet confirmed: the same stamp in grey. One stamp per distributor. A recorded delivery is a plain line with a truck icon ("Delivered 22 Nov").

## Color use
- Green does every positive signal: primary action, current tab, selected key, confirmed stamp.
- Status is never color alone. Each has an icon and a word: danger + `AlertTriangle` + "Runs out"; ink + `ShoppingCart` + "Order"; muted + `CheckCircle2` + "Enough"; muted + `Clock` + "First log".
- Tints mark which distributor, nothing else.
- Text contrast at least 4.5:1 (aim for 7:1 on main text) on paper and surface. Text never sits on a distributor colour.
- Use at most: cream, white, ink, muted ink, green (actions and good), red (runs out only). Distributor colours only as stripes and dots.

## Variants (where KiranaQ differs from Dose)
- **Danger red is allowed for one state only: "runs out before the visit".** Dose says late is grey. Here the owner must act (call the distributor), so it gets red, an icon and a word. Nothing else is red.
- 52px controls also serve the 48px one-hand target (above the 44px app default).
- No window light, no fibre grain animation, no 3D plastic: a phone in a shop needs speed. A static grain on the paper is optional.

## Layout
- Content max width 480px, centered. 16px side gutters. `overflow-x: clip` on `html` and `body` (never `hidden`, never `100vw`).
- Shell: top bar (scrolls away with the page) plus a fixed bottom tab bar: Home, Distributors, **Bolo mic (centre, raised, white circle with a green ring)**, Orders, Settings. Active tab: filled icon in green plus a 3px green bar on top; no pill. No sidebar, no hamburger.
- Screens without the tab bar (Photo, Result) show the Bolo mic as a floating round button on the right. Check has no Bolo button: its own "Hold to speak" is the one mic there.
- Demo view: at 640px and wider the app sits in a 390 x 844 phone frame, centred; fixed bars stay inside it.
- Meta in separate elements or lines. Never strings joined with middle dots, never arrows glued to text, never decorative status dots.
- Primary actions in the bottom third of the screen. "Take stock log" is fixed above the tab bar on Home only. Read out and Copy list are small text buttons; Confirm order is the card's one primary.

## States
Every region that loads data draws four states: loading (a skeleton in the shape of the content), empty (what belongs here and the one action that fills it), error (what broke and what to do), full. Discard log and reset demo ask first; removing a photo or an item shows an undo toast.

## Motion
- Calm. Motion shows state only: key press, bottom sheet, toast, stamp landing.
- `transform` and `opacity` only, `--dur-micro` or `--dur-short`. Never `transition: all`. Never animate width, height, top or left.
- `prefers-reduced-motion: reduce`: every transition ends at once.

## Voice
A shopkeeper's plainness: item, count, day, who comes. "Surf runs out tomorrow. Sharma comes Tuesday." Hindi or English from `i18n.js`. Never an invented number: every figure comes from the owner's logs or the rule.
- Day and month names are English in both languages ("Monday, 23 Nov"). Some Hindi-mode strings are Hinglish by the owner's choice: "Saman kab kab aya", "1 khatm hoga" / "N khatm honge". The Hindi pack word is "box".
- Never "sample" or "नमूना": the photo grid is "Choose a photo" / "फ़ोटो चुनें".
- Reason lines carry only the new fact (rate, "call early"), not what the row already shows. Days left are whole days ("3 days left", "Runs out today").

## Assistant (Bolo)
- A bottom panel (max 62% of the screen) over the live screen, so the owner sees each action happen. Bubbles: assistant on paper with a rule, owner on mint.
- It speaks first (a greeting with answer chips), then asks the next question after each step. Replies are shown and spoken.
- One big tap-to-talk mic (primary; secondary while a Yes/No question is open), a small text box, answer chips.
- Writes (save log, confirm order, delivery) always ask Yes/No first. Spec: `specs/2026-11-22-voice-assistant/`.
