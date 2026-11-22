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
