# QA log

Walk 1 (about 3:35 PM): Home, Photo, Check pass. Save failed (#1).
Walk 2 (about 4:05 PM, after Lane D fix `COUNT_SOURCE` map): full flow passes through Save, Result and Confirm.

| # | Problem | Screen | Owner | Status |
|---|---|---|---|---|
| 1 | Save returned 400 `bad_count_source`: UI sent count source `photo`/`edited`/`manual`, API accepts `vision`/`voice`/`tap` | Check → Save | Lane D | fixed, verified 4:05 |
| 2 | Units in Latin ("packet", "pcs") in Hindi UI. Dates were English in Hindi UI; Lane D then made English day and month names on purpose (Hinglish copy) | Check, Orders, Past log | Lane D | accepted as intended |
| 3 | Tab label "Distributor visits" wrapped to 2 lines; now the tab reads "Distributors" | Tab bar | Lane D | fixed |
| 4 | Vision found only 2 items on the rice shelf sample (Daawat 6, India Gate 6); many more are visible. The Result then orders India Gate 260 packets because count fell 22 → 6 in one day (rate 8.9/day). Demo risk: a low recall makes a silly order. Not sent (recall is an eval number, rule works as specified) | Check, Result | Lane C / lead | open, note |
| 5 | A partial log (2 items) clears run-outs of the other distributors: Home and Distributors show Gupta and Sharma "nothing runs out" after it. By design if the latest log is the truth; confirm it is wanted | Home, Distributors | lead | open, note |
| 6 | Visit sheet ("Did Gupta deliver?") not walked in the UI: needs a log with raised counts. API check passed: POST /api/logs with +60 on Gupta items returns `delivery_candidates` for Gupta. Opening `/log/6/result` directly shows no sheet (expected: sheet only after Save) | Visit sheet | – | not covered in UI |
| 7 | Hold-to-speak (mic) not tested (no mic in the pane); text fallback passes | Check | – | not covered |

Network: no 4xx/5xx apart from the one 400 (#1). Console: one 500 from `Photo.jsx` while Lane D renamed `samples.json` (transient, fixed). Server logs: `/api/vision` ok 951 ms, `/api/parse` ok 3.1 s.

Passing: Home, Photo with sample and count box, vision count, stepper change, text voice edit with read-back, Save → Result, confirm order ("Ordered 2 Dec" stamp), Home shows the new log, back button, Orders tab (real data), Distributors tab, Settings, past log, Hindi/English switch, light and dark theme.

Screenshots: `qa-home.png`, `qa-check.png`, `qa-result.png`, `qa-result-dark.png`.
