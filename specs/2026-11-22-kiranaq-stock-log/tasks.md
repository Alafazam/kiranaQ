# Tasks

Times are a guide (now ≈ 2:20 PM, submit by 5:00 PM). `[P]` = touches no file another open task touches.

- [ ] T0. Repo skeleton: server, web, shell, git (session `kiranaq-scaffold`). *Check: server test passes, web builds, `/api/health` ok.* (R12)
- [ ] T1. `core/config.js` + `core/rule.js` + tests (R6 example, stock-out, first log, call-early). *Check: `pnpm test`.* (R5–R7, R10) ~20 min
- [ ] T2. [P] Schema migration + `data/catalog.json` (~25 items, en/hi, pack) + `scripts/seed.js` with 3 past logs. *Check: `pnpm seed`, rows exist.* (R11) ~20 min
- [ ] T3. API: store, items, logs, save log runs rule, order. *Check: API test saves a log and returns order lines.* (R1, R5–R9) ~25 min
- [ ] T4. [P] `ai/vision.js` + `POST /api/vision/count` + validator test. *Check: real shelf photo returns known items.* (R2) ~20 min
- [ ] T5. [P] `ai/sarvam.js` (STT, TTS) + `ai/parse.js` + routes. *Check: 5 Hindi + 3 English phrases.* (R3) ~25 min
- [ ] T6. Web screens: Home, Photo, Count review (plus/minus, mic, read-back), Result, Settings. *Check: phone-size walk through.* (R1–R4, R7–R9) ~45 min
- [ ] T7. Shell over HTTPS tunnel on a phone. *Check: screenshot.* (R12) ~10 min
- [ ] T8. Demo run end to end, README limits, submit. (Alaf submits.)

Cut order: Settings screen (use seed values), TTS read-back (show text only), shell (use browser). Never cut: photo count, voice edit, rule, reason line, call-early alert.
