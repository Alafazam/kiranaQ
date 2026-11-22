# Voice assistant ("Bolo")

Status: approved (Alaf: "build the voice assistant now")

## 1. Why
Our users are kirana owners who do not use many apps. They do not know where the menu, the cards or the buttons are. The app must work by talking: the assistant asks a question, the owner answers, the assistant does the action on the screen, and the owner sees it happen.

## 2. Story
Ramesh opens KiranaQ. A green "Bolo" button sits above the tabs on every screen, and a panel greets him: "Namaste! Stock ginna hai, ya order dekhna hai?" He taps the mic and says "stock ginna hai". The app opens the photo step and asks "Photo lenge ya sample photo?" He says "sample". The app picks a sample photo and counts it. It says "6 item mile. Koi badlav?" He says "Maggi 8, Surf 5". The rows change on screen. It asks "Log save karun?" He says "haan". The log saves and the order cards open. He says "Sharma ka order pakka karo". The app asks "Sharma Traders ka order pakka karun?" He says "haan" and the green stamp lands.

```mermaid
sequenceDiagram
  participant O as Owner
  participant W as Web app (Bolo panel)
  participant S as Server /api/stt, /api/assist
  O->>W: tap mic, speak
  W->>S: audio -> /api/stt -> text
  W->>S: /api/assist {text, screen, context, history}
  S-->>W: {say, actions, expect}
  W->>W: run safe actions on screen
  W-->>O: show + speak "say"; for a write: Yes / No first
```

## 3. Use cases (these are also the eval cases)
| # | Owner says (examples, Hindi / Hinglish / English) | Assistant does |
|---|---|---|
| U1 | "stock ginna hai", "naya log", "take stock" | `start_log`, asks photo or sample |
| U2 | "sample photo", "pehli photo" | `use_sample {index}`, then `count_photo` |
| U3 | "bina photo ke", "khud ginunga" | `count_manual` |
| U4 | "Maggi 8, Surf 5", "Parle do kam" | `set_counts` (same rules as /api/parse) |
| U5 | "save karo", "ho gaya" | asks to confirm, then `save_log` |
| U6 | "haan Sharma ne maal diya" (visit sheet open) | asks to confirm, then `visit {delivered}` |
| U7 | "kya mangana hai", "order dikhao" | `navigate orders`, says what runs out first |
| U8 | "Sharma ka order pakka karo" | asks to confirm, then `confirm_order` |
| U9 | "Maggi do box kar do" (on Orders) | `set_qty` |
| U10 | "Sharma ka order suna do" | `read_out` |
| U11 | "Gupta kab aayega", "distributor kab aayenge" | `navigate distributors`, says day and date |
| U12 | "Surf kab khatm hoga" | answers from the latest result, no action |
| U13 | "English mein bolo", "हिंदी" | `set_language` |
| U14 | unclear or unknown item ("woh wala do") | asks one short question, no action |

## 4. Requirements
- R1. A "Bolo" button is on every screen (64 px, above the tab bar). Tap opens the assistant panel; the screen above stays visible.
- R2. The panel shows the talk as bubbles, has a big tap-to-talk mic (stops at 25 s), a text box fallback, and answer chips when the assistant offers options.
- R3. The assistant asks first: on open it greets and offers the next step for the current screen.
- R4. Every reply is shown and spoken (`/api/tts`); if TTS fails, text only.
- R5. Actions come from a closed list (Design). Unknown actions are ignored and logged.
- R6. Writes (`save_log`, `confirm_order`, `visit`) run only after the owner says or taps Yes. The web app enforces this even if the server does not ask.
- R7. The owner sees each action happen on the screen (navigation, rows changing, stamp).
- R8. If `/api/assist` is missing or fails, a local keyword matcher covers U1–U3, U5, U7, U8, U10, U11, U13, and U4 through `/api/parse`.
- R9. Evals: `evals/assist/cases.json` holds at least 2 cases per use case (Hindi and Hinglish or English); `pnpm eval:assist` scores action match and reports it in `checks.md`.

## 5. Design
**Contract** `POST /api/assist` (Lane C, in `routes/speech.js`, prompt in `ai/assist.js`, validation in `ai/validate.js`, one `ai_call` row, same rate cap as parse):
```
request  {text, lang: "hi"|"en", screen: "/", "/log/new", "/log/new/check", "/log/:id/result", "/orders", "/distributors", "/settings",
          context: {draft?: [{item_id, count}], log_id?, visit?: {distributor_id, name},
                    cards?: [{distributor_id, name, next_visit_date, days_to_next_visit, runs_out: [item_id], order: [{item_id, qty}], confirmed}],
                    distributors?: [{id, name, next_visit_date, days_to_next_visit}]},
          history: [{role: "user"|"assistant", text}]   (last 6 turns)}
response {say: string (owner's language, at most 200 chars), actions: Action[], expect: "answer"|"confirm"|"done", options?: string[]}
on model failure: 200 {say: "<ask again>", actions: [], expect: "answer"}
```
**Actions** (closed list):
`navigate {to: home|orders|distributors|settings}`, `start_log`, `use_sample {index}`, `count_photo`, `count_manual`, `set_counts {edits:[{item_id, count}]}`, `save_log`*, `visit {distributor_id, delivered}`*, `confirm_order {distributor_id}`*, `set_qty {distributor_id, item_id, qty}`, `read_out {distributor_id}`, `set_language {lang}`. (* = write, needs Yes.)

**Web** (Lane D): `src/assistant/` — `AssistantProvider` (context, history, action runner), `BoloButton`, `AssistantPanel`, `actions.js` (closed list, write set), `local.js` (fallback matcher). Screens register handlers and publish context with `useAssistant({context, handlers})`. The runner navigates first, then waits up to 3 s for the target screen's handler.

## 6. Verification
- Web: walk U1→U5→U8 by text on mock data and on the real API at 390 px; screenshots `bolo-*.png`. `pnpm --dir web build` passes.
- Server: `api-assist.test.js` with the fake AI (shape, closed list, failure path).
- Evals: `pnpm eval:assist` result in `checks.md` (paid model calls: ask Alaf before a full run).

## 7. Security review
- No new secrets in the web app; model keys stay on the server.
- Input limits: `text` at most 500 chars, `history` at most 6 turns, context only ids, names and counts (no personal data).
- The model cannot do anything outside the closed list; writes need the owner's Yes in the web app (R6).
- Tenant: `/api/assist` reads `req.storeId` like other routes; it does not write data itself.
- Findings: 0 open.

## 8. Open questions
- Q1. Auto-speak the greeting on load? Proposed: no (browsers block audio before a tap); the greeting shows as text, speech starts after the first tap.
