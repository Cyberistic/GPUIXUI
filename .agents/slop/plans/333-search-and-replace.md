# Plan 333 — Search and replace: can a find bar rewrite the edited text?

**Workstream:** playground (`apps/playground`, `packages/testing`).
**Phase:** D/E — Tier 4 "Search and replace" feasibility.
**Depends on:** plan `171` (`search-highlights`: the wash contract), plan `188`
(`text-entry`: the native editor's value/caret contract), plan `189`/`197`
(the live observation surface), plan `173` (scroll, not required here).
**Number:** `332` is the last playground plan; this takes `333`.

---

## 1. Why

`search-highlights` proved the find half: `highlight`, `onHighlight`,
`useTextSearch` and `getPaintedHighlights` are real. It did **not** answer the
replace half, and three questions decide whether a find-and-replace bar is
possible at all:

1. Does a `highlight` declared on an `<input>` wash its editor text and report
   matches, or is the editor's text outside the highlight text run tree?
2. Does a controlled `<input>` repaint a value that the component sets (not the
   user typing)? A replace action sets the whole value.
3. Where is the caret after that programmatic value change — does typing next
   land at the old index, at the end, or nowhere?

The runtime exposes **no `setSelection`** on `NativeRenderer`, so a component
cannot select a match programmatically. If (1) is false and (3) moves the caret,
the honest UI is a read-only preview with washes plus a separate edit field, and
a replace bar cannot highlight inside the editor.

This plan measures all three and records the verdict as the `replace`
capability.

## 2. Contract

New capability `replace` in `packages/testing/src/smoke.ts`.

New headless scenario `replace-contract` and live scenario `live-replace`, both
mounting the same `ReplaceProbe` view. Checks:

| Check | Asserts |
| ----- | ------- |
| the document paints one wash per match | `host.highlights()` has 2 washes for the preview's `highlight` |
| the editor reports no highlight matches | `editor=none` — the `<input>`'s own `highlight` never fires `onHighlight` (or the measured opposite, recorded in §8) |
| the pre-replace text is painted twice | the editor and the preview both paint the source sentence (occurrence count, so the readout cannot satisfy it) |
| replace-one rewrites the value | `replaces=1`, the new sentence is painted twice, the old one zero |
| replace-one leaves one wash | the preview drops to 1 wash |
| replace-all clears every match | `replaces=3` total, `doc=0` washes |
| a second replace-all is inert | `replaces=3` again |
| undo restores the document | the source sentence is painted twice and 2 washes return |
| the caret after a programmatic change | click, End, replace-one with a **longer** word, type `z`; the resulting value is pinned exactly (measurement, see §8) |

The pure replacement rule lives in `apps/playground/src/scenarios/replace-core.ts`
with a co-located unit test: `replaceFirst` / `replaceAll` over a query, using
`Str`/`Option`, never native string methods in the domain rule.

## 3. Files

| Path | Action |
| ---- | ------ |
| `apps/playground/src/scenarios/replace-core.ts` | **create** — the pure `replaceFirst`/`replaceAll` rule |
| `apps/playground/src/scenarios/replace-core.test.ts` | **create** — the able-to-fail unit suite |
| `apps/playground/src/scenarios/replace.tsx` | **create** — `ReplaceProbe` + `replaceScenario` |
| `apps/playground/src/scenarios/index.ts` | import + register; add `replace` to `PROBE_CAPABILITIES` |
| `packages/testing/src/smoke.ts` | add `"replace"` to `CAPABILITIES` |
| `apps/playground/src/live/scenarios.tsx` | `live-replace`, appended to `liveScenarios` |
| `.agents/slop/plans/README.md` | index this plan |
| `COMPONENTS.md` | capability table row + measured paragraph |
| `TODO.md` | tick the row this plan adds |

Do **not** touch `packages/components`, `packages/primitives` or the docs site.
If the find bar needs a component, that is a task row for the owning workstream.

## 4. Commands and expected results

```sh
nub run --filter playground test          # replace-core tests green
nub run --filter playground build && nub apps/playground/dist/smoke/run.js
# expected: exit 0, suite 64 → 65, `replace=verified`
nub run --filter playground smoke:live
# expected: exit 0, live 19 → 20, `replace=verified`
nub run check                              # expected: exit 0
nub run lint                               # expected: exit 0
```

The live suite owns the native window: **never run two live runs at once** — a
concurrent run makes a scenario fail its `waitFor` (measured 2026-10-18).

## 5. Test plan

- `replace-core.test.ts`: one match, no match, two matches, a whole-word-less
  substring (`error` inside `errors`), a replacement that contains the query
  (`error` → `error!`: one pass, no infinite growth), and an empty query (no
  change). Each test would fail if the rule replaced a suffix of a longer word
  or re-replaced its own output.
- The scenario is the runtime test: every check above is a real assertion with a
  measured value; a no-op replace fails "replace-one rewrites the value", and a
  stale paint fails the occurrence counts.
- Two-direction proof: make `replaceFirst` return the source unchanged → the
  headless suite must exit `1`; restore → exit `0`. Record both runs in §8.
- `check:tests` must accept both test files.

## 6. STOP conditions

Stop and report (do not fudge an assertion) if:

- the editor's `highlight` reports matches and washes that contradict the plan's
  expected `none` — that is a **better** result; record the measured counts and
  update §2 and `COMPONENTS.md` to the truth;
- a controlled value change does **not** repaint the editor at all (the native
  editor keeps the old text) — then a replace bar needs a remount strategy;
  record it and do not claim replacement works;
- `host.paintedText()` cannot distinguish the editor from the preview after two
  runs — replace the occurrence count with the a11y `value` and record why;
- the live window cannot be acquired because another live run holds it.

## 7. Acceptance

- [ ] `replace-core` and its unit test exist; `nub run --filter playground test`
      is green.
- [ ] `replace-contract` is registered and green headless; the suite is `65/65`
      and reports `replace=verified`.
- [ ] `live-replace` is green in a real window; the live suite is `20/20`.
- [ ] The two-direction proof is recorded in §8.
- [ ] `COMPONENTS.md` records the measured verdict and the limits (no
      programmatic selection; whatever the editor highlight answered).
- [ ] `TODO.md`, the plan index and this plan's result section agree.

## 8. Result — measured on this host (2026-10-18)

Landed. Headless **66/66**, exit `0`, `replace=verified`, two consecutive full
runs; live **20/20**, exit `0`, `replace=verified`; `nub run --filter playground
test` 92 tests. The `replace` capability is now part of the registry.

### What the runtime answered

- **An `<input>`'s own `highlight` finds nothing.** `doc=2 editor=0`: the editor
  reports `onHighlight` with `matchCount=0` while a sibling `<text>` with the
  same query washes twice. The native editor's text is not part of the highlight
  text-run tree, so a find bar **cannot paint washes inside an editor**; it needs
  a rendered document/preview surface beside it. This is the same shape as
  `a11y-tree`'s finding that text is not the source of an accessible name.
- **A value the component sets does repaint the editor.** After
  `replaceFirst`, the new sentence is painted **twice** (editor + preview) and
  the old one zero times; the preview's washes drop `2 → 1`. A controlled
  rewrite needs no remount.
- **The caret keeps its absolute index.** Click → End → replace a 5-character
  word with a 7-character one → type `z`: the `z` landed at the old index,
  between the new word and the sentence's period (`…an|warning.z`), not at the
  start or the end. A replace UI must expect the next keystroke at the old
  offset; the test pins the exact string in both the headless and live runs.
- **No programmatic selection exists.** `NativeRenderer` exposes no
  `setSelection`, so a component cannot select the replaced range or the active
  match; the keyboard path (`ctrl-r` on the editor) is the only way to replace
  without moving focus.
- **`replace-all` is idempotent**: the second pass counts `0` and reports
  `last=noop`.

### Two-direction proof

`replaceFirst` changed to return the source unchanged:

```text
FAIL replace-contract  replace-one rewrites the controlled value
0/1 scenarios passed · replace=failed · exit 1
```

Restored: `1/1`, `replace=verified`, exit `0`.

### Harness stability found on the way

The full run (under five concurrent vitest suites on this box) exposed three
real-timer flakes that passed alone:

- `toast-lifecycle`: the short toast's 250 ms timer could beat the first
  `fastForwardMotion(0)`, so the exit was over before the "still laid out"
  check. The motion clock is now paused **before** the short toast is pushed.
- `tooltip-open` and `preview-card`: fixed sleeps replaced by the bounded
  `awaitReadout` for the close, so a loaded host gets time to deliver the frame
  while the following assertion still fails with the measured value.

Two consecutive full runs after the change: `66/66`, exit `0`.

## 9. Acceptance

- [x] `replace-core` and its unit test exist; `nub run --filter playground test`
      is green.
- [x] `replace-contract` is registered and green headless; the suite is `66/66`
      and reports `replace=verified`.
- [x] `live-replace` is green in a real window; the live suite is `20/20`.
- [x] The two-direction proof is recorded in §8.
- [x] `COMPONENTS.md` records the measured verdict and the limits (no
      programmatic selection; the editor reports zero highlight matches).
- [x] `TODO.md`, the plan index and this plan's result section agree.
