# Hallmark review: landing page

Date: 22 Nov 2026. Target: `web/public/landing/` (`index.html`, `landing.css`, `landing.js`, `img/`).
Depth: **polish**. The KiranaQ system in `DESIGN.md` stays (light cream, tokens only, no emoji icons, sentence-case labels). Hallmark fixes only what a gate names. It does not move sections or change the system.
Genre: modern-minimal (inferred: a product pitch for buildathon judges).

## Read

- **For:** buildathon judges and kirana-tech people. The one action: see the demo.
- **What works and stays:** real app screenshots in phone frames, the honest comparison table with its source line, the plain architecture diagram, and the guided tour that ends in the live app.
- **What read as generated:** two eyebrows (hero line and the "Planned, not built" pill), a coloured side stripe on the callout, pill shapes on number badges, two filled button recipes.
- **What was broken:** on a 768px-high desktop the tour phone was taller than the screen, so the step 1 hotspot sat below the fold. On a phone the Next key sat below the fold. The hero showed the same Home screenshot as step 1 and tour step 1.

## Lint

- Before: 6 FAIL, 15 REFLEX, 8 WARN (`sloplint --before`, kept in `.hallmark/before.txt`).
- After: 0 FAIL, 0 WARN, 4 NOTE (the three 58 notes below and one 24b note on the hotspot centring margin).
- The render tier did not run: no puppeteer on this machine. Visual checks were done in the browser pane at 1024x768 and 390x844.

## Findings

| # | Finding | Gate | Why | Fix | Status |
|---|---|---|---|---|---|
| 1 | Hero eyebrow "For kirana owners with no POS and no bills" over the h1 | 54 (Floor) | A small coloured line over a heading is the most common generated opener. | Folded into the start of the hero paragraph. Words kept. | Done |
| 2 | "Planned, not built" pill over the on-device heading | 54 (Floor) | Same eyebrow pattern. | The label became the heading: "Planned, not built: on-device". The dashed border and the proposal line stay. The panel is still labelled "Planned, not built". | Done |
| 3 | Image grids on bare `1fr` tracks (`.steps`, `.arch`, `.flow`, `.uses`, `.proof`, `.tour`, `.hero-in`) | 50 (Floor) | A wide image can push a bare `1fr` track past its share and cause side scroll. | `minmax(0, 1fr)` on every track. | Done |
| 4 | Tour phone taller than a 768px desktop screen; hotspot and Next key off screen | defect | The tour is the main action. A user must scroll inside each step. | Phone width capped by the viewport height: `min(320px, calc((100svh - 120px) * 390 / 844))`. Hotspot bottom now 711px of 768px. | Done |
| 5 | On a 390px phone the Next key was below the fold | defect | Same as 4. | Tour phone 220px wide on small screens. Next key bottom now 820px of 844px. | Done |
| 6 | Hero showed `home.jpg`, which steps 1 and tour step 1 also show | judged (show the signature) | The page's strongest real thing is the per-distributor order screen. It did not appear until section 2. | Hero now shows `result.jpg` (one card per distributor, what to order). Alt text updated. | Done |
| 7 | Copy said "sample photo" in step 1, tour step 2 and the live-demo line | DESIGN.md voice | The app calls the grid "Choose a photo" and never says "sample". The landing copy did not match the app. | Changed to "choose a photo" in all three places. | Done |
| 8 | Callout "Where they are stronger" had a 6px left stripe in `--t-2` | 3 (WARN), DESIGN.md | A side stripe is a stock card tell. `--t-n` tints mark a distributor only. | 1.5px rule border all round. | Done |
| 9 | Pill radius on the step and flow number badges | F7 | Pills are for controls. | Badges use `--radius-control` (a square stock label). | Done |
| 10 | Two filled button recipes (`.btn-primary` and a white-filled `.btn-secondary`) | F4 | One filled primary per page. DESIGN.md: secondary is clear with a rule rim. | `.btn-secondary` background is transparent. | Done |
| 11 | 15 spacing values off the 4px scale (22, 18, 14, 10, 6px) | 24b | Values off the scale read as unplanned. | Moved to the nearest 4px step. The hotspot keeps `-26px` margins to centre a 52px key. | Done |
| 12 | Straight quotes in prose (15 places, HTML and tour text) | F1 | Typographic quotes. | “ ” and ’ everywhere in prose. | Done |
| 13 | No `::selection`, `caret-color` or `scrollbar-color` | F16 | Browser parts stayed default blue. | Themed from the tokens. | Done |
| 14 | Nav link "Different" | copy | A vague label. | "Compare". The `#different` anchor is the same. | Done |
| 15 | Hallmark stamp missing at the top of the CSS | 20 (Floor) | The stamp records what was checked. | Check stamp added, `redesign: polish`. | Done |
| 16 | Page has 921 visible words (Hallmark limit 450) | 58 (structural) | Judges scan. Many sections are text-heavy. | Not changed: the words carry checked facts (comparison, proof). A full redesign would turn sections into objects. | Skipped (printed) |
| 17 | Hero h1 runs 18 words; hero paragraph 48 words | 58 / 44b (structural) | Hallmark wants a 7-word headline and a 12-word sentence. Headline, sentence and action still show at 1280x800. | Not changed at polish depth. A possible headline, for the owner to decide: "Count the shelf from one photo." | Skipped (printed) |
| 18 | Proof grid: 5 cards on 3 columns leaves 2 on the last row | F20 | An uneven last row. | Not changed: the five checks are the facts from `checks.md`. A table or a 5-column row would fix it. | Skipped |
| 19 | Tour screenshots in `img/` are newer than the hero text in places (the app now has the Bolo mic) | content | Screenshots were recaptured by another session (commit 0f7cb76). | No change needed. Hotspot positions still fit (checked steps 1 to 5). | No change |

## Facts kept

- Comparison table: unchanged, still matches `research/competitive.md`.
- Proof numbers: unchanged, from `specs/2026-11-22-kiranaq-stock-log/checks.md`.
- On-device panel: still labelled "Planned, not built", with "This panel is a proposal".
- Links, ids and script hooks: all kept (`#how`, `#different`, `#architecture`, `#business`, `#demo`, every `tour-*` id).

## Checks after the fixes

- `pnpm --dir web build` passes. `server/public/landing/` matches the source.
- Desktop (1024x768) and 390x844: no side scroll (`scrollWidth` = viewport width).
- Tour: steps 1 to 5 move with Next. Step 5 Next shows "Try the live demo", which loads the live app in the iframe.
- Screenshots: `hallmark-after-desktop.jpg`, `hallmark-after-390.jpg`.

## Not run

- The fresh-context finish review (Hallmark step 7.3). The task gave a fixed scope and a demo deadline.
