Status: built, checked 22 Nov 2026

# KiranaQ landing page with a guided demo tour

## 1. Why

Judges and partners see KiranaQ first on a laptop, not on a phone. They need one page that says what problem KiranaQ solves, how it is different from billing apps, how it is built, how it makes money, and then lets them try the real app. Alaf asked for a tour on top of a phone preview: a few screenshots with "tap here", then the live demo.

## 2. Sections

1. **Hero.** One line on the problem (no POS, no bills, so no idea what is on the shelf). One action: "See the demo".
2. **How it works.** Four steps with real screenshots in phone frames: shelf photo, count box, voice check, order per distributor.
3. **How KiranaQ is different.** A compact table against Vyapar and Khatabook, taken only from `research/competitive.md`. "Not confirmed" and "not found" marks stay. One block says where they are stronger. GoKirana is not listed as a product.
4. **Technical architecture.** Inline SVG: phone web app → Node server (rule engine, SQLite) → Sarvam (STT `saaras:v4`, TTS `bulbul:v3`, vision `gemma4`, parse `sarvam-105b`). A dashed "Next: on-device" panel, marked **planned, not built**: an Alpine Linux environment inside the app runs a small language model (SLM). The SLM drives UI actions offline and calls the server AI for translation and heavy vision.
5. **Business model.** Demand-side data. Each stock log shows what sells, in which neighbourhood store, how fast, and from which distributor. Aggregated, anonymised demand insights go to FMCG brands and distributor companies (launch tracking, stock-outs, reorder timing). The app stays free for the owner. No prices, no market sizes, no logos. One line on consent and privacy.
6. **Proof.** Only results from `specs/2026-11-22-kiranaq-stock-log/checks.md`, dated 22 Nov 2026.
7. **Demo.** Guided tour, 5 steps, then the live app in the same phone frame.

## 3. Tour steps

| # | Screenshot | Hotspot | Text |
|---|---|---|---|
| 1 | `img/home.jpg` | "Stock ginen" button | Tap "Stock ginen" to start a stock log. |
| 2 | `img/count-box.jpg` | count box | Pick a sample shelf photo. Drag the count box over the part that faces the camera. |
| 3 | `img/check.jpg` | "Hold to speak" | Check the counts. Hold to speak and say "Maggi 8 hai". |
| 4 | `img/result.jpg` | "runs out first" heading | One card per distributor: what runs out first, what to order. |
| 5 | `img/distributors.jpg` | first distributor card | Distributors tab: who comes when. |

Each step: screenshot, a numbered hotspot circle, one line of text, Back and Next, step dots. Arrow keys move the tour. After step 5, "Try the live demo" swaps the screenshot for `<iframe src="/">` at 390×844 in the same frame, plus "Open full screen" (link to `/`).

## 4. Files

- `web/public/landing/index.html`, `landing.css`, `landing.js`, `img/*.jpg` (resized with `sips -Z 900`).
- Vite copies `web/public/` to `server/public/`, so the page is at `/landing/`. No change to `web/src/`, `server/` or the router.

## 5. Rules

Light cream tokens copied from `DESIGN.md`. Mobile first, max 1100 px. Keyboard tour (arrow keys, focus-visible). Works at 390 px. No external scripts, Google Fonts only. `prefers-reduced-motion` respected. No emoji. No invented numbers.

## 6. Checks

- `pnpm --dir web build` passes and `server/public/landing/index.html` exists.
- Server (`kiranaq-server`), `/landing/` in the browser pane at desktop and 390 px: no console errors, tour walks 1 to 5 with keys and buttons, live iframe loads `/`.
- Screenshots saved here.

## 7. Results (22 Nov 2026)

| Check | Result |
|---|---|
| `pnpm --dir web build` | pass. `server/public/landing/` is the same as `web/public/landing/` |
| `/landing/` at desktop (800 px pane) | all sections render, no console errors |
| `/landing/` at 390×844 | no side scroll (`scrollWidth` 390), diagram readable, tour fits |
| Tour | arrow keys and Next/Back move steps 1 to 5; hotspot moves per step |
| Live demo | "Try the live demo" loads `/` in the frame, scaled from 390 px wide |

Screenshots: `desktop-hero.jpg`, `desktop-live-demo.jpg`, `mobile-390-tour.jpg`.

Note: the browser pane used the server already running on port 3000 (the preview slots were full). It serves `server/public` from disk, so it showed this build.
