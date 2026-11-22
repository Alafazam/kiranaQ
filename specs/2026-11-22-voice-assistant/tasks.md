# Tasks: voice assistant

Lane C (server + evals) and Lane D (web) run in parallel; they meet at the `/api/assist` contract in spec.md.

## Lane D (web)
- [x] D1. `src/assistant/actions.js` closed list + write set; `AssistantProvider` with history and action runner. Check: unit walk on mocks.
- [x] D2. `BoloButton` on every screen + `AssistantPanel` (bubbles, mic, text box, chips, Yes/No). Check: screenshot at 390 px.
- [x] D3. Screen handlers and context: Photo, Check, Visit sheet, Result/Orders cards, language. Check: U1→U5→U8 by text.
- [x] D4. `local.js` fallback matcher (R8). Check: works with `/api/assist` missing.
- [x] D5. Screenshots, `checks.md`.

## Lane C (server + evals)
- [ ] C1. `ai/assist.js` prompt + `validate.js` rules (closed list, write => expect confirm, ids exist) + `ai/fake.js` answer.
- [ ] C2. `POST /api/assist` in `routes/speech.js` + `api-assist.test.js`.
- [ ] C3. `evals/assist/cases.json` (2+ per use case U1–U14) + `evals/run-assist.js` + `eval:assist` script.
