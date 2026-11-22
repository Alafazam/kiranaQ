# Checks: voice assistant (web side)

| Check | Command or steps | Result |
|---|---|---|
| Web build | `pnpm --dir web build` | pass (built in 2.7 s) |
| U1 start | mock, Hindi, panel text "स्टॉक गिनना है" | pass: opened `/log/new`, asked "फ़ोटो लेंगे, या नमूना फ़ोटो?" |
| U2 sample + count | "sample photo" | pass: sample added with its box, counted, `/log/new/check`, said "6 आइटम मिले…" |
| U4 counts | "maggi 8, surf 5" (local rules call `/api/parse`) | pass: Maggi row 8, source `voice` |
| U5 save (R6) | "सेव करो" → Yes/No shown → "हाँ" | pass: nothing saved before Yes; then saved |
| U6 visit | delivery question asked by the assistant → "हाँ" | pass: visit recorded, result opened, said "सेव हो गया। Surf Excel 1kg पहले खत्म होंगे।" |
| U8 confirm (R6) | "शर्मा का ऑर्डर पक्का करो" → "haan" | pass: asked first, then stamp "ऑर्डर 24 Nov" on Sharma Traders |
| U11 when | "Gupta kab aayega" | pass: opened `/distributors`, said "Gupta Agency कल आएँगे, Monday, 23 Nov।" |
| R8 fallback | `/api/assist` returns 404 (mock mode, and the old server process on :3000) | pass: local rules answered all of the above |
| Server route | Lane C commits 13704da, d18e982, ac8d458 | committed; the server on :3000 needs a restart to serve it |
| Evals | `pnpm eval:assist` (Lane C) | not run here: paid model calls, ask Alaf |

Screenshots: `bolo-home-greet.png`, `bolo-check-voice-edit.png`, `bolo-result-confirm.png` (390 px phone frame, mock data).

## Real model (Sarvam via /api/assist on :3001, Hindi, typed)
| Step | Said | Result |
|---|---|---|
| U1 | "स्टॉक गिनना है" | pass: `start_log`, opened `/log/new`, asked photo or by hand |
| U2 | "फ़ोटो चुनो" | model asked again; local rules backed it up (ec595f6): photo chosen and counted, Check opened |
| U14 | "पारले-जी 10 है" | pass: no action, asked "80g wala ya 100g Gold wala?" |
| U4 | "80 ग्राम वाला 10 है" | pass: `set_counts [{item_id 2, count 10}]`, row changed to 10 |
| U5 | "सेव कर दो" → Yes | pass: Yes/No first, then saved, result said what runs out first |
| U8 | "गुप्ता का ऑर्डर पक्का करो" → Yes | pass: `confirm_order:2` with confirm, stamp "ऑर्डर 23 Nov" |
| Gap | model asked "अब लॉग सेव कर दूँ?" without a `save_log` action | sent to Lane C as a prompt rule |
| Wording | no "sample" / "नमूना" in UI (Alaf) | web done in ec595f6; prompt change asked from Lane C |

## Lane C (assistant)

### E6 voice assistant (2026-11-22)

Provider `sarvam`, 40 cases (U1–U14, Hindi / Hinglish / English), real model.

| Metric | Result | Bar |
|---|---|---|
| Action + expect match | 38/40 | ≥ 80% |
| Full pass (also says the right thing) | 38/40 | – |

| Use case | Pass |
|---|---|
| U1 | 4/4 |
| U2 | 3/3 |
| U3 | 2/2 |
| U4 | 4/4 |
| U5 | 3/3 |
| U6 | 3/3 |
| U7 | 3/3 |
| U8 | 3/3 |
| U9 | 0/2 |
| U10 | 2/2 |
| U11 | 3/3 |
| U12 | 2/2 |
| U13 | 2/2 |
| U14 | 4/4 |

Verdict: **PASS**. Failed: U9-1, U9-2.
