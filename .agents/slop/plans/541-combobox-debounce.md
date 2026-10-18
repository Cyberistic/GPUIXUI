# 541 — Combobox `debounce`: one query per burst, never one the user abandoned

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 gap named in `COMPONENTS.md`) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `116`, `138`, `302`, `323`, `328`, `340`, `524` |
| Status | done |

This plan is self-contained. Run every command; do not claim a test passed
unless it ran.

---

## 1. Why

`COMPONENTS.md` and `docs/combobox.mdx` listed one user-facing gap for remote
options: "no built-in debounce — `onQueryChange` fires per edit, so the caller
debounces". A server-backed picker therefore received one request per keystroke
(`"c"`, `"ca"`, `"cal"`), and a caller that wanted fewer had to re-implement a
timer around a component callback — exactly the kind of ad-hoc state this
library is supposed to own.

## 2. Design

One optional prop on `Combobox`:

```ts
readonly debounce?: number; // milliseconds, default 0
```

- `0` keeps the old behaviour exactly (every edit reported immediately).
- `> 0` reports the **last** edit once the window passes with no newer edit.
- **Opening is not an edit**: `""` is reported immediately, so a remote source
  can start loading while the user has typed nothing.
- **A close drops a pending report.** Choosing an option closes the popup and
  the label write is not a query; a timer that fired afterwards would report
  text the user abandoned, and a remote caller would replace its rows for a
  popup that is gone.
- The callback is read through a ref, so a pending timer never calls a stale
  closure after the caller swaps `onQueryChange`.

Implementation: `src/combobox.tsx` — `queryTimer` ref, `reportQuery(next,
immediate)`, cleared by `close.current` and by an unmount effect. No new
dependency; the package already schedules hover delays with `setTimeout`
(`src/internal/hover.ts`).

## 3. Files

- `src/combobox.tsx` — the prop, the timer, the doc comment, the meta
  limitation.
- `src/behaviour/combobox.test.tsx` — the `Picker` harness takes `debounce`;
  two cases (below).
- `examples/combobox.example.tsx` — the remote directory picker uses
  `debounce={150}`.
- `docs/combobox.mdx` — the remote-options table, the prose, the API row, the
  limitation, the verification sentence and the count (39 → 41).
- `COMPONENTS.md` — the Comboboxes row.

## 4. Test plan

Both cases are native, in the real renderer:

1. **"reports one query for a burst of edits when the caller debounces"** —
   with `debounce={120}`, opening reports `[""]` at once; typing `"ca"` reports
   nothing inside the window; after 200 ms exactly `[""], ["ca"]` arrives.
   Fails on the old code, which reports `[""], ["c"], ["ca"]` immediately.
2. **"drops a pending query when an option is chosen inside the window"** —
   type `"ca"`, press Enter within the window, wait 200 ms: only `[""]` is
   reported and the selection is `"calendar"`. Fails if `close` does not cancel
   the pending timer.

Both directions were measured (plan 540's method): reverting the debounce branch
fails case 1; removing `cancelPendingQuery` from `close` fails case 2; with both
the suite is 41/41.

## 5. Gates

- `nub run --filter @gpuixui/components test` — 413 unit tests (both new
  behaviour cases are native).
- `nub run --filter @gpuixui/components test:behaviour` — `combobox` 41/41; the
  suite's pre-existing 59 binding failures are unchanged (plan 540).
- `nub run check`, `nub run lint`, `nub run test`.

## 6. STOP conditions

- A debounced report arrives after unmount → fix the cleanup, not the test.
- The docs/inventory counts disagree → update all three (page, `COMPONENTS.md`,
  meta) in the same commit.
