# Hallmark review: KiranaQ web UI

Date: 22 Nov 2026. Read-only review (Hallmark `audit`, app-screen scope). Lane D applies the fixes.

**How:** `sloplint web/src --scope app` (1 FAIL, 8 WARN), code read of `web/src/`, and a walk of the mock app (port 5174) at 390 x 844, Hindi and English, light theme, plus one dark check. Screenshots: `hallmark-*.png` in this folder.

**Read in four lines**
- For: a kirana owner who logs stock by photo and confirms orders per distributor. One action: take a stock log.
- Works, keep it: the cream/white/one-green system, tokens-only colour, big 52px steppers, status = icon + word, phone frame, rule-line sections on Orders/Result.
- Reads as generated: almost nothing. The weak spots are craft: a CSS cascade bug, a floating button that covers content, and mono type used for words.
- Broken: the `.mould` cascade (sizes and icons wrong in 6+ places) and the Bolo FAB covering the red "runs out" signal.

## Top 5 fixes

| # | Fix | Why | Where |
|---|---|---|---|
| 1 | Put `.mould*` rules inside `@layer components { … }` | They sit after `@tailwind utilities`, so they beat every utility on the same element. `min-h-[140px]`, `border-dashed`, `px-0` are ignored. Result: the photo tiles are 57px not 140px, and the icon in every 44px icon button is squashed (X is 9px wide). | `web/src/index.css:13-24` |
| 2 | Stop the Bolo FAB covering content | On Orders/Result it covers the red "1.1 days left" and the Confirm button; on Check it covers "Hold to speak". | `assistant/AssistantPanel.jsx:17-18`, `screens/Orders.jsx:17`, `screens/Result.jsx:19`, `screens/DistributorCard.jsx:31-35` |
| 3 | Hide the Bolo FAB on Check | Two mic controls on one screen ("Hold to speak" and "Talk"). A non-tech user cannot tell them apart. | `assistant/AssistantPanel.jsx:17` |
| 4 | Keep DM Mono for digits only | `.num` wraps weekdays ("Monday") and the stamp text. In Hindi the stamp "पक्का  नहीं" falls back to a system face with mono gaps. | `ui/kit.jsx:104`, `screens/Home.jsx:33`, `DistributorCard.jsx:120`, `Distributors.jsx:46`, `Orders.jsx:26` |
| 5 | Fix the Home strip's left edge | Snap pulls the first card to x = 0 (no gutter). | `screens/Home.jsx:28` |

## Findings

Severity: high = broken or hides a signal; medium = clear flaw a user feels; low = finish detail.

### Global, system and tokens

| # | Screen | What is wrong | Rule | Sev | Smallest fix |
|---|---|---|---|---|---|
| 1 | All | `.mould` rules are unlayered after `@tailwind utilities`, so they override utilities (`min-h-*`, `px-0`, `border-dashed`). Measured: photo tiles 57px (want 140px), icon-button padding 16px in a 44px box, X icon 9px wide. | DESIGN Controls; Hallmark F15 (one control system, states correct) | high | `index.css`: wrap `.mould`, `.mould-*`, `.stripe-*`, `.skeleton`, `.num` in `@layer components {}`. Then remove the `!min-h-[44px]` / `!w-[44px]` hacks (they become plain utilities). |
| 2 | All | No Hallmark stamp on line 1 of the CSS (sloplint FAIL 20). | Hallmark Floor 15 | low | `index.css:1`: add `/* Hallmark · scope: app · theme: Dose (adapted, design.md) · redesign: none */` and a one-line critique line above `@import`. Paperwork only. |
| 3 | Photo | Literal colour `oklch(0% 0 0 / 0.45)` in the box overlay shadow. | Hallmark Floor 1, DESIGN Tokens | medium | Add `--color-scrim: oklch(0% 0 0 / 0.45)` to `tokens.css` (both themes) and use `var(--color-scrim)` in `ui/BoxEditor.jsx:11`. |
| 4 | All | `h1–h3` have no `text-wrap: balance`; long Hindi heads ("डिस्ट्रीब्यूटर कब आएंगे") break unevenly. | Hallmark F3 | low | `index.css:8`: add `text-wrap: balance;` to the `h1, h2, h3` rule. |
| 5 | All | `::selection` not themed. | Hallmark F16 | low | `index.css`: `::selection { background: var(--color-accent-soft); color: var(--color-ink); }` |
| 6 | All | Skeletons use `--color-paper-3`, a mint that reads as the selected-key colour (`accent-soft`). The loading Home looks "selected". | DESIGN Color use (green = positive signal only) | low | `index.css` `.skeleton`: use `--color-rule` at 40% opacity, or a new neutral `--color-skeleton` token (warm grey). |
| 7 | All | `aria-label`s "Main", "Steps", "Language" stay English in Hindi mode. | DESIGN Voice (Hindi from `i18n.js`) | low | `ui/TabBar.jsx:9`, `ui/TopBar.jsx:8,37`: use `t('nav_main')`, `t('steps')`, `t('language')`. |
| 8 | Dark | Distributor stripes at 40% lightness almost vanish on the dark surface. | DESIGN Surfaces (stripe = identity) | low | `tokens.css` dark block: raise `--t-1..5` to about 55% lightness. |
| 9 | All | Body 15px and `text-sm` 13px for reasons, meta, tab labels. Devanagari at 13px with matras is hard to read in a bright shop. | DESIGN Type (body 17px); owner chose 13/15/18/21/25 | medium | DESIGN.md needs update for the new scale. Then keep Hindi reasons at `text-base`: in `DistributorCard.jsx:36` use `text-base` when `t.lang === 'hi'`, or raise only `sm` to 14px in `tailwind.config.js:21`. |

### Home

| # | What is wrong | Rule | Sev | Smallest fix |
|---|---|---|---|---|
| 10 | Strip snaps the first card to x = 0 (`scrollLeft` 16, card left 0). No left gutter on the first screen. | DESIGN Layout (16px gutters) | medium | `Home.jsx:28`: add `scroll-px-4` to the `<ul>`. |
| 11 | Weekday set in DM Mono ("Monday"). Words in mono look like a code label and widen the card. | DESIGN Type (DM Mono for digits and units only) | medium | `Home.jsx:33`: drop `num` from the weekday line (keep it on the date line). |
| 12 | Two solid green objects at the bottom (Bolo FAB and "Take stock log"). The FAB is the same green and weight as the one primary. | DESIGN Controls (one primary per screen) | low | DESIGN.md needs update (owner decision for a green Bolo). Optional: FAB `bg-surface text-accent-deep border-accent` so the primary stays the only solid green. |
| 13 | "1 runs out" (English) is wrong grammar. | DESIGN Voice | medium | `i18n.js:17`: `runs_out_1: '1 item runs out'`, `runs_out_n: '{n} items run out'`. |
| 14 | Distributor name on the strip card is 15px medium; the weekday under it is larger. Who comes reads weaker than when. | Hallmark judged: hierarchy | low | `Home.jsx:32`: `font-display text-lg` on the name. |

### Distributors tab

| # | What is wrong | Rule | Sev | Smallest fix |
|---|---|---|---|---|
| 15 | `border-left: 6px` on a 14px-radius card bends the stripe into a crescent at the corners (sloplint WARN 3). | Hallmark 3 (side stripe); DESIGN keeps the stripe | low | Keep (owner decision). Cleaner: `index.css` `.stripe-n` → `box-shadow: inset 6px 0 0 var(--t-n)` so the stripe is straight and clipped by the radius. |
| 16 | Whole card header links to the Settings edit form. Tapping a visit opens a form, not the visit. | Hallmark judged: a label that lies | low | `Distributors.jsx:43`: keep the link only on the chevron (an `IconButton` "Edit"), or link to `/orders`. |
| 17 | Date line uses `.num` on the weekday ("Monday, 23 Nov"). | DESIGN Type | low | Same as #11: `Distributors.jsx:46`. |
| 18 | Inner `bg-surface rounded-control` box sits on a `bg-surface` card: an invisible box with no job. | Hallmark 4 (card in card, by intent) | low | `Distributors.jsx:52`: replace with `mt-3 border-t border-rule pt-2`. |

### Orders and Result (shared `DistributorCard`)

| # | What is wrong | Rule | Sev | Smallest fix |
|---|---|---|---|---|
| 19 | The fixed Bolo FAB (right, 64px) covers the right column, where the red "1.1 days left" sits, and overlaps the last Confirm button. | DESIGN Color use (runs out must be seen); Hallmark judged: overlap | high | `DistributorCard.jsx:31-35`: put days-left on its own line under the item (left), not right-aligned. And `Orders.jsx:17`: `pb-28` → `pb-44`; `Result.jsx:19`: `pb-12` → `pb-44`. |
| 20 | Reason line repeats what the row already says: "6 a day, 3.3 days left. Order 24 from Gupta Agency on Monday, 23 Nov." under a row showing "3.3 days left", a header with the visit date and a stepper showing 24. | Hallmark 58 (words per screen); DESIGN Voice | medium | `i18n.js` reason strings: keep only the new fact ("6 a day"). For runs-out keep "Call early". |
| 21 | Days left shown as decimals ("3.3 days left", "1.1 days left"). | DESIGN Voice (shopkeeper plainness) | low | `DistributorCard.jsx:24`: `Math.floor`; show "1 day" / "{n} days"; under 1 → "today". |
| 22 | Result opens with "4 items not counted" in grey. No line says what to do now. The distributor with a red item can sit below the fold. | Hallmark judged: one idea per screen; DESIGN Voice ("Surf runs out tomorrow. Sharma comes Tuesday.") | medium | `CardList.jsx:37`: show one summary line first, reusing `runsOutSummary()`. Sort cards with `runs_out.length > 0` first. |
| 23 | Three large controls per distributor (Read out, Copy list, Confirm). Two 52px secondaries stack above the primary. | Hallmark judged: weight; DESIGN one primary | low | `DistributorCard.jsx:174-177`: make Read out and Copy list `variant="text"` icon buttons in one row. |
| 24 | Two stamps on one card ("Not confirmed" and "Delivered 22 Nov"), both double-ringed. | DESIGN Surfaces (one stamp per state) | low | `DistributorCard.jsx:126`: show "Delivered" as a plain `text-sm text-ink-2` line with a `Truck` icon, keep the stamp for the order only. |
| 25 | Stamp text uses `.num` (DM Mono). In Hindi "पक्का नहीं" falls back with wide mono gaps (see `hallmark-orders-hi-stamp.png`). | DESIGN Type (mono for digits only) | medium | `ui/kit.jsx:104`: replace `num` with `font-medium`; wrap only the date in `<span className="num">`. |
| 26 | `rotate(-2deg)` stamp is set by inline style and the `stamp-in` keyframe repeats it. | DESIGN Motion (tokens, transform only) | low | `kit.jsx:105`: move the border/outline/rotate to a `.stamp` class in `index.css`. |
| 27 | Pack text "1 box" (Hindi) / "1 case" (English) is muted mono at 13px at the far right. Easy to miss, not a problem, but it sits under the FAB too. | Same as #19 | low | Covered by #19. |
| 28 | Units mix: "pcs" vs "packet". | DESIGN Voice | low | Data: one unit word per item type in the seed (`server` data), not UI. Flag to lane owning data. |
| 29 | "1 item not counted" on Orders has no action and no list. | DESIGN States (say what to do) | low | `CardList.jsx:37`: make it a link to the Check screen of that log, or drop it on Orders. |

### Log flow: Photo, count box

| # | What is wrong | Rule | Sev | Smallest fix |
|---|---|---|---|---|
| 30 | "Take a photo" and "Use a sample photo" render as 57px buttons, not the 140px dashed tiles the code asks for. The screen is a small row and a large empty area. | Root cause #1 | high | Fixed by #1. |
| 31 | Remove-photo X is a 44px white square with a 9px squashed icon, half over the thumbnail. | Root cause #1 | medium | Fixed by #1; then `Photo.jsx:149` → `w-8 h-8` visual inside a 44px hit area, `rounded-pill`. |
| 32 | Sample sheet has no close control; only a scrim tap or Esc. | DESIGN Controls (8 states, clear exit) | low | `ui/kit.jsx:55`: render an `IconButton icon={X}` next to the sheet title when `onClose` is given. |
| 33 | With the default full-frame box, the four corner handles sit half outside the photo edge. | Hallmark judged | low | `BoxEditor.jsx:43`: add `p-3` around the editor so the handles sit inside the frame. |

### Log flow: Check

| # | What is wrong | Rule | Sev | Smallest fix |
|---|---|---|---|---|
| 34 | Two mic controls: dock "Hold to speak" and the Bolo FAB, which also overlaps the dock. | DESIGN Controls (one way to act); Hallmark judged | high | `AssistantPanel.jsx:17`: return `null` when `pathname === '/log/new/check'` (the dock owns voice here). |
| 35 | Delete (trash) icons are squashed to a few px. | Root cause #1 | medium | Fixed by #1 (`Check.jsx:184`). |
| 36 | Bottom dock (rule, Hold to speak, Or type, Save log) takes about 190px of 844. The list shows 3.5 rows. | Hallmark judged: density | low | `Check.jsx:201-221`: put "Hold to speak" and "Save log" side by side (`grid grid-cols-2`) and keep "Or type" as a text link. |
| 37 | Visit sheet: a scrim tap or Esc records "No, not delivered". A stray tap saves a wrong answer. | DESIGN States (ask first) | medium | `VisitSheet.jsx:47`: `onClose` should only close/skip, not call `answer(false)`. |
| 38 | Visit sheet rows show "+12" with no unit. | DESIGN Voice (`12 pcs`) | low | `VisitSheet.jsx:52`: `+{it.rise} {it.unit}`. |

### Settings

| # | What is wrong | Rule | Sev | Smallest fix |
|---|---|---|---|---|
| 39 | "Items" card has no section head; it reads as part of Distributors. | Hallmark F15 (consistent section rhythm) | low | `Settings.jsx:61`: give it an `h2` "Items" like the other sections, or merge into one card. |
| 40 | Edit distributor: the Items list heading uses the `Truck` icon. | DESIGN Icons (right meaning) | low | `Settings.jsx:135`: use `Package` (as on Settings home). |
| 41 | Delete/reset confirm uses a secondary button with `text-danger`. Red is reserved for "runs out". | DESIGN Variants (red for one state only) | low | `ui/kit.jsx:72`: plain `mould-secondary`, no `text-danger`; the dialog title carries the meaning. |

### Bolo assistant panel

| # | What is wrong | Rule | Sev | Smallest fix |
|---|---|---|---|---|
| 42 | Close (X) and Send icons are squashed (same cascade bug). | Root cause #1 | medium | Fixed by #1 (`AssistantPanel.jsx:77,107`). |
| 43 | With a pending question, "Yes" (primary) and the mic (primary) both show: two primaries in a 300px panel. | DESIGN Controls (one primary) | low | `AssistantPanel.jsx:100-101`: when `a.pending`, render the mic as `mould-secondary`. |
| 44 | Panel title row: a green filled mic circle beside "Assistant" looks like a second mic button. | Hallmark judged: a label that lies | low | `AssistantPanel.jsx:75`: drop the circle, or make it `text-accent-deep` icon only, no fill. |
| 45 | Quick chips on Result/Orders are generic nav ("Take stock log", "Orders", "Distributors"), not the job of the screen (confirm an order). | Hallmark judged: job of the screen | low | Assistant content, not style: `CardList.jsx:31` options already exist for `announce`; reuse them for the panel's default chips on Result/Orders. |
| 46 | Toast sits at `bottom-36` (144px), the same height as the Home FAB (`bottom-[140px]`). They overlap on Home (from the code; not seen in the walk). | Hallmark judged: overlap | low | `ui/Toast.jsx:19`: `bottom-[216px]` on Home, or hide FAB while a toast shows. |

## DESIGN.md needs update (owner decisions, not UI bugs)

- Type scale is now 13/15/18/21/25 px (DESIGN says 14/17/20/24/29, body 17px).
- Home strip and Orders/Result use no stripe and no card; only the Distributors tab and Settings list keep the distributor colour.
- Top bar scrolls away; active tab = filled icon plus a 3px top bar.
- Floating green "बोलो" button and the bottom assistant panel are not in DESIGN.md (Shell, Controls, one-primary rule).
- Phone frame on wide screens (≥ 640px) is not in Layout.
- Hinglish strings and English day/month names in Hindi mode are not in Voice.
- Tab bar has four tabs (Home, Distributors, Orders, Settings); DESIGN says three.
- Hindi pack label "box".

## Passed (Floor)

Tokens only (one exception, #3) · no `transition: all`, only transform/opacity · `overflow-x: clip` on html and body · global `:focus-visible` 2px ring · reduced-motion fallback · no eyebrows or tracked caps · no middle-dot meta, no glued arrows, no decorative dots · no emoji icons, no gradients, no card in card · no invented numbers.

## Applied (Lane D)
Fixed: 1 (components layer; tiles 140px, icons no longer squashed), 2, 3, 4, 5, 6, 8, 10, 11, 13, 14, 17, 18, 19 (days left on its own line, pb-44), 21, 24, 25, 26, 31, 32, 34 (no Bolo button on Check), 37, 38, 40, 41, 43, 44, and mono off the weekday on Orders/Result headers. Screenshot: `hallmark-after-orders.png`.
Not done (owner decision or bigger change): 7, 9, 12, 15, 16, 20, 22, 23, 27–30, 33, 35–36 (35 fixed by 1), 39, 42 (fixed by 1), 45, 46. DESIGN.md updates are for the lead.
