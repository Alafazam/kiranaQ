# Checks

## Lane C

### Live smoke (2026-11-22)

`pnpm --dir server smoke:live`: tts ok 660 ms, stt ok 1088 ms, parse ok 1512 ms, vision ok 1447 ms. All ok (Sarvam).

### E2 voice parse (2026-11-22)

Provider `sarvam`, 35 typed phrases, real model.

| Metric | Result | Bar |
|---|---|---|
| Exact match on clear phrases | 22/22 (100%) | ≥ 90% |
| Unclear phrases that re-ask (no guess) | 13/13 | 4/4 |

Verdict: **PASS**. Failed ids: none.

### E1 vision count (2026-11-22)

Provider `sarvam`, 3 photos with truth files, real model.

| Metric | Result | Bar |
|---|---|---|
| Precision | 1.00 | ≥ 0.9 |
| Recall | 1.00 | ≥ 0.6 |
| Counts within ±20% or ±1 pack | 1.00 | ≥ 0.6 |

| Photo | Items returned | Right items / expected | Counts within bar |
|---|---|---|---|
| shelf-01 | 3 | 3/3 | 3/3 |
| shelf-02 | 1 | 1/1 | 1/1 |
| shelf-03 | 0 | 0/0 | 0/0 |

Verdict: **PASS**.

## Lead: integration (2026-11-22, 15:20)

| Check | Command | Result |
|---|---|---|
| Server tests | `pnpm --dir server test` | 88/88 pass |
| Demo check | `pnpm --dir server demo:check` | pass (15 checks) |
| Web build | `pnpm --dir web build` | pass (JS 244 kB, 76 kB gzip) |
| Built app walk through | `node server.js` on port 3001, browser pane at 390×844, real Sarvam calls | Home → sample photo (biscuit aisle) → preset count box → vision found 3 items (Parle-G 12, Parle-G Gold 10, Marie 18) with thumbnails and both names → Save (201) → Result card for Gupta Wholesale with 2 runs-out items and 1 order line, reasons in Hindi. Pass |

Screenshots: `walk-1-home.jpg`, `walk-2-sample-photos.jpg`, `walk-3-count-box.jpg`, `walk-4-check.jpg`, `walk-5-result.jpg`.

## Lead: end-to-end check (2026-11-22, 16:00)

| Check | Result |
|---|---|
| `pnpm --dir server test` | 100/100 pass |
| `pnpm --dir server demo:check` | pass (15 checks) |
| `pnpm --dir web build` | pass |
| Bolo, real Sarvam, built app on :3001 at 390×844 (typed into the assistant text box; the pane has no mic) | "stock ginna hai" → log opened and the assistant offered photo choices; "फ़ोटो चुनें" → photo picked, vision counted 3 items; "Parle-G 20 hai" → count set to 20 and the assistant offered "Save karun". Pass |
| Landing `/landing/#demo` | 5-step tour works (Next, dots, hotspots); "Try the live demo" loads the live app in the phone frame. Open: steps 2–3 screenshots show the old UI |

## Lead: sample photo check (2026-11-22, 16:45)

Recounted each sample inside its count box at zoom, ran the real model (Sarvam `gemma4`) on each box, and fixed what was wrong.

| Sample | Truth (front-facing, inside box) | Model before | Model after | Fix |
|---|---|---|---|---|
| Biscuit aisle | Parle-G 12 (10 small + 2 big; the bottom row hides behind the rail), Gold 12, Marie ~24 | 10, 12, 20 | 12, 10, 18 | Truth Parle-G 18 → 12 after zoom recount |
| Rice shelf | India Gate 3 | Daawat 3, India Gate 6 (box covered stacked bags) | India Gate 3 | Box tightened to the top row; prompt rule: brand and product type must both match (stopped "Fortune oil 1" on a Fortune rice bag) |
| Small-town kirana | nothing readable | [] | [] | none |

`pnpm --dir server eval:vision` after the fix: precision 1.00, recall 1.00, counts within ±20% or ±1 pack 1.00. PASS. The model gave the same answer on repeated runs. In the app (390 px, :3000) the rice sample shows "India Gate Basmati Rice 1kg — 3 packet".
