# Tasks

Times are a guide (now ≈ 2:20 PM, submit by 5:00 PM). `[P]` = touches no file another open task touches.

- [x] T0. Repo skeleton: server, web, shell (shell deferred), git. *Check: server test passes, web builds, `/api/health` ok.* (R12)
- [ ] T1. `core/config.js` + `core/schedule.js` (next visit) + `core/rule.js` + `core/plan.js` (group by distributor) + tests (R6 example, stock-out, first log, call-early, 4-day vs 15-day distributor, next-visit cases). *Check: `pnpm test`.* (R5–R7, R9, R10) ~30 min
- [ ] T2. [P] Schema migration (incl. `distributor`) + `data/catalog.json` (~25 items, en/hi, pack, distributor) + `scripts/seed.js` with 3 distributors (4, 7, 15 days) and 3 past logs. *Check: `pnpm seed`, rows exist.* (R11) ~20 min
- [ ] T3. API: store, distributors, items, logs, save log runs rule and returns cards per distributor, order. *Check: API test saves a log and returns order lines.* (R1, R5–R9) ~25 min
- [ ] T4. [P] `ai/vision.js` + `POST /api/vision/count` + validator test. *Check: real shelf photo returns known items.* (R2) ~20 min
- [ ] T5. [P] `ai/sarvam.js` (STT, TTS) + `ai/parse.js` + routes. *Check: 5 Hindi + 3 English phrases.* (R3) ~25 min
- [ ] T6. Web screens: Home, Photo, Count review (plus/minus, mic, read-back), Result (one card per distributor), Settings (distributors, item → distributor). *Check: phone-size walk through.* (R1–R4, R7–R9) ~45 min
- [ ] T7. HTTPS URL (cloudflared tunnel now; host deploy if time) and test on a phone browser. *Check: photo and mic work on the phone; screenshot.* (R12) ~10 min
- [ ] T8. Demo run end to end, README limits, submit. (Alaf submits.)

Cut order: Settings editing (use seed distributors; keep a read-only list), TTS read-back (show text only), host deploy (use the tunnel). Never cut: photo count, voice edit, rule, reason line, call-early alert.
