# Checks

## Lane C

### Live smoke (2026-11-22)

`pnpm --dir server smoke:live`: tts ok 660 ms, stt ok 1088 ms, parse ok 1512 ms, vision ok 1447 ms. All ok (Sarvam).

### E2 voice parse (2026-11-22)

Provider `sarvam`, 20 typed phrases, real model.

| Metric | Result | Bar |
|---|---|---|
| Exact match on clear phrases | 16/16 (100%) | ≥ 90% |
| Unclear phrases that re-ask (no guess) | 4/4 | 4/4 |

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
| shelf-02 | 2 | 2/2 | 2/2 |
| shelf-03 | 0 | 0/0 | 0/0 |

Verdict: **PASS**.
