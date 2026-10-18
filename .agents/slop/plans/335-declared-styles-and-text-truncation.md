# Plan 335 — declared interaction states and text truncation

| | |
| --- | --- |
| Phase | B → F (native capability probe) |
| Depends on | `100`, `110`, `120`, `140`, `150`, `160`, `196`, `188` |
| Owner | playground (`apps/playground`, `packages/testing`) |
| Status | planned — implementation not started |

## 0. Why this plan exists

Every interactive surface in the library declares its pointer states in
`style.hover` and `style.active` instead of scripting them with
`onMouseEnter` + `useState` (plan `020` §2.3). Every truncating label, table
cell, tab and breadcrumb declares `whiteSpace: "nowrap"` + `textOverflow:
"ellipsis"`, and `Text`'s `clamp` prop declares `lineClamp` (`docs/text.mdx`
promises "clip after N lines"). **No scenario has ever measured any of those
five properties in the runtime.** The only related evidence is colour at rest
(`theme-color-roles`) and the *events* that hover generates (`preview-card`,
`tooltip-open`), which says nothing about whether the declared style is applied.

That gap is the exact class of defect this workstream exists to find: a
component can look right in its element-tree test, use the documented prop, and
still not paint on the device. The reconnaissance below already found one real
defect (a line-clamp layout cache that ignores `lineClamp`) and one real trap
(a child's hover cancels its parent's).

## 1. What reconnaissance already measured (2026-10-18, this host)

A throwaway `createTestRoot` script (deleted; reproduce it from §4 if in doubt)
rendered plain host elements and read `getElementBounds` / `getPaintedText` /
`TestElement.style`. Measured, in the offscreen `TestRenderer` on the locally
built 0.10.0 binding (ADR 0003):

1. **`hover` is applied and reverted.** A `div` with `width: 100` and
   `hover: { width: 140 }` measured **100 → 140** when the pointer entered and
   **140 → 100** when it left. Its layout really changes, so the state is
   observable through bounds even though the common use is a colour.
2. **`active` is applied while pressed.** The same element with
   `active: { width: 180 }` measured **180** between `nativeSimulateMouseDown`
   and `nativeSimulateMouseUp`, and **100** after the release.
3. **Hover is per element and does *not* bubble.** A 400 px parent with
   `hover: { width: 420 }` around a 100 px child with `hover: { width: 120 }`:
   pointer over the parent only → **420 / 100**; pointer over the child →
   **400 / 120**. The child's hover **cancels** the parent's, so a row that
   hovers cannot rely on its own style while the pointer is over a button
   inside it.
4. **The style report is the authored style, not the resolved one.** While
   hovered, `TestElement.style.width` stayed **100** (the authored value) and
   carried nested `hover`/`active` objects. A hover that only changes colour is
   therefore invisible to `paintedStyle`.
5. **`textOverflow` truncates to one line.** A long string at `width: 80` with
   `textOverflow: "ellipsis"` measured **26 px** (one line) against **416 px**
   (16 lines) unclipped. `"ellipsis-start"` behaves the same. Setting it on the
   **container** inherits to its `<text>` child.
6. **`whiteSpace: "nowrap"` is also one line**, so geometry cannot distinguish
   "clipped" from "ellipsised". The difference is the glyph, and item 8 says the
   glyph cannot be read back.
7. **`lineClamp` works and is inherited.** With a *distinct* string per case at
   `width: 80`: `lineClamp: 2` → **52 px**, `lineClamp: 3` → **78 px**,
   unclamped → **416 px**. Setting it on the wrapping `div` clamps its text
   child. The container needs a width constraint, not a fixed height.
8. **The text layout is shared per `(string, width)` and the key ignores
   `lineClamp`.** The same string at the same width cannot clamp differently in
   one process: whichever variant lays out first wins, and the other reports the
   same line count. `textOverflow`/`whiteSpace` **are** part of the key — the
   same string rendered side by side measured 26 px (ellipsis) and 598 px
   (plain) in one run. This is why every probe case must use a **distinct
   string**.
9. **`getPaintedText()` returns the source run, never the ellipsis.** A
   truncated 80 px box still reported the whole string. Text truncation can only
   be asserted from geometry here; the ellipsis glyph needs pixel evidence,
   which this suite does not have (D24).
10. **`cursor` has no observation channel.** It is in the published
    `StyleDesc` (`host.d.ts`: `CursorValue`) and appears in the authored style
    report, but no renderer verb reports the pointer shape. Nothing in this
    suite may claim a cursor was painted.

## 2. Scope

In scope — two scenarios, two capabilities:

| Scenario id | Capability | Measures |
| --- | --- | --- |
| `declared-styles` | `states` | `hover`, `active`, per-element ownership, the authored style report |
| `text-truncation` | `truncation` | `textOverflow` (both variants), `whiteSpace: "nowrap"`, `lineClamp` N and inheritance, the `(string,width)` layout cache, the painted-text limit |

Out of scope, recorded as limitations rather than probes:

- the cursor shape (item 10);
- the ellipsis glyph itself (item 9);
- `focusVisible`/`outline*`/`keyboardFocusDim`/`scrollbar*`/`borderStyle`/
  `aspectRatio`, which the native style serialiser reports but the published
  `StyleDesc` type does not expose. A separate plan may probe them if the
  library ever needs them; this plan does not.
- the live window. The live host has `hover`, `press`, `movePointer`,
  `releasePointer` and `bounds`, so these facts *could* be re-proved live, but
  the live tree has no style report and the headless `TestRenderer` is the real
  native pipeline. A live half is a follow-up, not a condition of this plan.

## 3. Files to create or change

| Action | Path | What |
| --- | --- | --- |
| create | `apps/playground/src/scenarios/styles.tsx` | both views and both scenario objects |
| change | `apps/playground/src/scenarios/index.ts` | import, `PROBE_CAPABILITIES`, registry entries |
| change | `packages/testing/src/smoke.ts` | `CAPABILITIES`: add `"states"`, `"truncation"` |
| change | `COMPONENTS.md` | two capability rows, a prose section, the `Text / typography` row |
| change | `TODO.md` | tick the task, add the two cross-team rows (§10) |
| change | `PLAN.md` | decision row D47 |
| change | `.agents/slop/plans/README.md` | index row for this plan |

No change to `packages/testing`'s schemas: every assertion uses verbs that
already exist (`bounds`, `hover`, `press`, `movePointer`, `releasePointer`,
`paintedStyle`, `paintedText`).

## 4. The `declared-styles` scenario

### 4.1 Fixture

File `apps/playground/src/scenarios/styles.tsx`. One view component per
scenario, exported scenario objects at the bottom (mirror `preview.tsx` and
`popups.tsx`). Everything sits in the top 320 px of the 1280×800 window — a
pointer below the viewport does not hit-test, which invalidated the first
attempt at the press-and-drag case.

```
<div testId="styles-root" 720×320, flex column, gap 8, background>
  <div testId="styles-row" 720×80, flex row, gap 8>
    <div testId="styles-parent" 400×60  hover: { width: 420 }   bg muted>
      <div testId="styles-child" 100×40 hover: { width: 120 }   bg card>
         <text>child</text>
    <div testId="styles-away" 100×60    bg background>            // inert target
  <div testId="styles-row2" 720×60, flex row, gap 8>
    <div testId="styles-button" 100×30
         bg <theme.colors.accent>, hover: { width: 140, backgroundColor: theme.colors.primary },
         active: { width: 180 }>
  <text testId="styles-note">…</text>                             // static caption
</div>
```

Rules:

- widths are the measured property; every `hover`/`active` must set `width` so
  the state is observable through bounds;
- the button's `hover` also sets `backgroundColor` to a **different** token, so
  step 4 can prove that `paintedStyle` still reports the authored colour;
- `styles-parent`'s centre is at `(200, 30)`, clear of the 100×40 child;
- all colours come from `useTheme()` — no literals (repo rule).

### 4.2 Steps (exact order and labels)

| # | Action | Check (label → assertion) |
| - | ------ | ------------------------- |
| 1 | read bounds | `the button starts at its authored width` → `styles-button` width **100** |
| 2 | read bounds | `the parent starts at its authored width` → `styles-parent` **400** |
| 3 | `host.hover("styles-button")` | `hovering the button applies its hover width` → **140** |
| 3b | `host.paintedStyle("styles-button")` before and after | `the style report keeps the authored colour while hovered` → the two `backgroundColor` values are **equal** |
| 4 | `host.hover("styles-parent")` | `hovering the parent applies its own hover width` → parent **420**, child **100** |
| 5 | `host.hover("styles-child")` | `a child owns the hover: the parent drops back` → parent **400** |
| 5b | | `the child applies its own hover width` → child **120** |
| 6 | `host.hover("styles-away")` | `leaving reverts both widths` → parent **400**, child **100** |
| 7 | `host.press("styles-button")` | `a press applies the active width` → **180** |
| 8 | `host.releasePointer(buttonCentre.x, buttonCentre.y)` | `releasing reverts to the hover width while still over it` → **140** |
| 9 | `host.hover("styles-away")` | `leaving after a release reverts to the authored width` → **100** |
| 10 | `host.press("styles-button")`, `host.movePointer(20, 300)`, read, `host.releasePointer(20, 300)` | `a held pointer outside the element records its state` → **hypothesis: 100** (see STOP 9.4) |
| 11 | `host.screenshot(...)` | `declared-styles.png` |

Assertions use `expectNear(label, width, expected, 1)`; a bounds width is a
float and the layout may add a fraction. Read helpers:

```ts
const width = (testId: string): number =>
  Option.getOrElse(
    Option.map(Option.fromNullishOr(ctx.host.bounds(testId)), (b) => b.width),
    () => -1,   // a missing id fails the width check with -1, naming the id in the label
  );
```

The `backgroundColor` comparison in 3b is:

```ts
const background = (testId: string): string =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(ctx.host.paintedStyle(testId)),
      (snapshot) => snapshot.backgroundColor,
    ),
    () => "none",
  );
```

Read it **before** the first hover and again after step 3, then `expectEqual`.
`StyleSnapshot` already decodes `backgroundColor` as an optional string; no
schema change is needed.

## 5. The `text-truncation` scenario

### 5.1 Fixture

Same file, second view. A 1000×420 surface, flex row, gap 8, each sample a
fixed-width column with the string in a `<text>` child.

| testId | box style | text style | string |
| --- | --- | --- | --- |
| `trunc-line` | `width: 80, overflow: "hidden"` | `textOverflow: "ellipsis"` | `alpha one two … twenty` |
| `trunc-start` | same | `textOverflow: "ellipsis-start"` | `bravo one two … twenty` |
| `nowrap` | same | `whiteSpace: "nowrap"` | `charlie one … twenty` |
| `clamp-2` | same | `lineClamp: 2` | `delta one … twenty` |
| `clamp-3` | same | `lineClamp: 3` | `echo one … twenty` |
| `clamp-box` | `width: 80, lineClamp: 2` (on the **box**) | none | `foxtrot one … twenty` |
| `wrap` | `width: 80` | none | `golf one … twenty` |
| `repeat-clamp` | `width: 80` | `lineClamp: 2` | `hotel one … twenty` |
| `repeat-plain` | `width: 80` | none | **the same string as `repeat-clamp`** |

**Every other string must be distinct**, and the word list must be written out
in full per case (16–20 words) so each wraps to many lines at 80 px. A shared
`LONG` constant reused across cases would make item 8 silently invalidate the
clamp checks — that is the whole point of the cache measurement.

Use `theme.colors.foreground` for the text and `theme.colors.background` for the
surface. The default text style (no role) measured a 26 px line; do not hardcode
26 — derive it (below).

### 5.2 Steps

Let `line = width("trunc-line")` — no: `line = height("trunc-line")`, the
one-line sample. Read heights, not widths:

```ts
const height = (testId: string): number => /* same shape as width above */;
```

| # | Check (label → assertion) |
| - | ------------------------- |
| 1 | `the ellipsis sample is one line tall` → `height("trunc-line")` equals `height("nowrap")` |
| 2 | `ellipsis-start is one line tall` → `height("trunc-start")` equals `height("nowrap")` |
| 3 | `nowrap overflows instead of wrapping` → `height("nowrap")` < `height("wrap")` |
| 4 | `the unclamped sample wraps to many lines` → `height("wrap")` near `16 × line` ± 2 (record the measured value if the font/metrics differ; **do not** narrow it to the measured number without re-running) |
| 5 | `lineClamp 2 clamps to two lines` → `height("clamp-2")` near `2 × line` ± 1 |
| 6 | `lineClamp 3 clamps to three lines` → `height("clamp-3")` near `3 × line` ± 1 |
| 7 | `lineClamp is inherited from the box` → `height("clamp-box")` near `2 × line` ± 1 |
| 8 | `the clamp is a real clamp, not a clip` → `height("clamp-2")` < `height("wrap")` |
| 9 | `identical strings share one layout regardless of lineClamp` → `height("repeat-clamp")` equals `height("repeat-plain")` **and** both are > `4 × line` (the unclamped height won) |
| 10 | `the painted text is the source run, never the ellipsis` → `ctx.host.paintedText()` contains the full `trunc-line` string **and** no entry ends with `…` |
| 11 | screenshot `text-truncation.png` |

Step 9 is the regression guard for the cache. Steps 5–7 fail without `lineClamp`
and step 1 fails without `textOverflow`; both directions are in §8.

If a word-list height is not exactly 16 lines, adjust only the constant in step
4 to the measured line count and record it in §12 — the point of step 4 is
"many", not 16.

## 6. Wire the capabilities

1. `packages/testing/src/smoke.ts` — append to `CAPABILITIES`, after
   `"replace"`:

   ```ts
   "states",
   "truncation",
   ```

2. `apps/playground/src/scenarios/index.ts` —
   - `import { declaredStylesScenario, textTruncationScenario } from "./styles.js";`
   - append `"states"`, `"truncation"` to `PROBE_CAPABILITIES`;
   - append the two scenarios to the end of `scenarios` (after
     `tier2ToastScenario`; order is the run order).

`scenarioProblems` will now require a scenario per capability, so a missing
registration fails the registry test, not just the run.

## 7. Commands and expected results

Run from the worktree root.

```sh
nub run --filter playground build
```

Expected: `@gpuixui/testing` and `apps/playground` compile, vite vendor step
runs, TS exits `0`. A type error naming `hover`/`active`/`lineClamp` means the
installed `StyleDesc` is not the 0.10.0 pinned by D22 — STOP.

```sh
nub apps/playground/dist/smoke/run.js --only declared-styles
```

Expected: `1 scenario, 15 checks` (count per §4.2; one check per row plus 3b and
5b), all passed, exit `0`, `smoke-report.json` written.

```sh
nub apps/playground/dist/smoke/run.js --only text-truncation
```

Expected: 11 checks passed, exit `0`.

```sh
nub apps/playground/dist/smoke/run.js
```

Expected: **68/68** green (66 + 2), exit `0`, two new screenshots under
`apps/playground/.artifacts/screenshots/`. The full run matters: it proves the
new scenarios do not disturb the shared text layout cache (item 8) — if an older
scenario's string coincides with a new one, the run order is the evidence.

```sh
nub run check && nub run lint && nub run test
```

Expected: all green. `check` includes `check:tests`; this plan adds no vitest
file (the scenarios are the test), so the count is unchanged.

## 8. Two-direction proofs (each must fail)

Run each mutation, record the exact failure detail, then revert it. A mutation
that still passes means the check does not test the thing it claims.

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | delete `hover: { width: 140, … }` from `styles-button` | `hovering the button applies its hover width: expected 140, got 100` |
| M2 | change step 5 to expect the parent at **420** while hovering the child | `a child owns the hover: the parent drops back: expected 420, got 400` |
| M3 | delete `textOverflow: "ellipsis"` from `trunc-line` | `the ellipsis sample is one line tall: expected 26, got 416` (or that run's many-line height) |
| M4 | replace `clamp-2`'s distinct string with `repeat-clamp`'s string | `lineClamp 2 clamps to two lines: expected 52, got <unclamped>` — this is the cache |
| M5 | change step 10 to assert a painted `…` | the check fails, proving the report is the source run |
| M6 | delete `active: { width: 180 }` from `styles-button` | `a press applies the active width: expected 180, got 100` |

Record each in §12 with the observed detail. `scripts/verify-two-directions.sh`
is jj-based and not usable here (TODO); do it by hand as plans `151`–`334` did.

## 9. STOP conditions

1. **No hover effect at all.** STOP and re-run the §1 reproduction. A runtime
   where a declared `hover` does nothing is a regression against this plan's
   reconnaissance; report it, do not weaken the assertion to "the style is
   authored".
2. **`active` fires on press but never reverts.** STOP; that would be a new
   runtime bug. Record the pointer coordinates and the event log.
3. **Any fixture is laid out below y = 800 or right of x = 1280.** STOP and
   re-lay the fixture. Input below the viewport does not hit-test (this
   invalidated a reconnaissance attempt at the press-and-drag case).
4. **Step 10 (held pointer outside).** The hypothesis is that a held button
   outside the element reverts to the authored width. If the measured value is
   `180` (active sticks), **do not delete the check**: change its expected value
   to the measured one, rename it `active follows the pointer while held`, and
   record the fact in §1/§12 — a sticky active is a real component contract.
5. **Two text cases share a string.** STOP and make them distinct. The cache
   makes steps 5–8 meaningless.
6. **A clamp case reports one line.** STOP: that means the string is too short
   to wrap at the chosen width, or it shares a string with a one-line case.
   Lengthen it; do not lower the expectation.
7. **`paintedText()` shows a `…`.** STOP — that contradicts item 9 and means the
   runtime changed. Record it and correct §1, the check, and COMPONENTS.md.
8. **The suite is 66/66 but `states`/`truncation` are absent from the report.**
   The registration is wrong; STOP and re-read §6.
9. **A check needs a channel that does not exist** (the cursor shape, a resolved
   hover colour, the glyph run). STOP and document it as a limitation instead of
   inventing a proxy.

## 10. Documentation, inventory and TODO

1. `COMPONENTS.md`:
   - add `| states | \`declared-styles\` | verified |` and
     `| truncation | \`text-truncation\` | verified |` to the capability table;
   - update the suite count line (`66/66` → `68/68`);
   - add a prose block after the `collapsible-height` section recording items
     1–10, with the cache rule set out as a component-authoring rule;
   - update the `Text / typography` row with:
     `truncate` is measured (one line, both overflow variants); `clamp` is
     measured (N lines, inherited from an ancestor) **but the text layout is
     shared per (string, width) and the key ignores `lineClamp`**, so two
     identical strings at one width clamp together. `paintedText` is the source
     run: the ellipsis glyph is not assertable.
2. `TODO.md`:
   - tick the plan-335 task with its measured headline (suite `66 → 68`,
     exit `0`, the number of two-direction proofs);
   - add, under cross-workstream dependencies, two rows owned by `primitives`
     and `components`:
     - **primitives** — `Text`'s `clamp` documentation must record the
       `(string, width)` layout sharing and the "distinct strings only" rule;
       the prop itself is correct (plan 335 §1.7/1.8);
     - **components** — a component cannot rely on its own `hover` while the
       pointer is over a hoverable child (plan 335 §1.3); a row/menu that wants
       a whole-row hover needs the hover style on the child too, or a JS
       pointer-tracking layer (which plan `020` §2.3 forbids for the usual
       case). Record the decision rather than silently shipping a row that
       un-highlights under its own action button.
3. `PLAN.md` §4 — D47
   (`Declared hover/active are real and per-element; text clamp shares layout
   per (string,width); the ellipsis is geometry-only evidence`).
4. `.agents/slop/plans/README.md` — add the row to the playground table:

   ```
   | [335](./335-declared-styles-and-text-truncation.md) | Declared interaction states and text truncation | B→F | 100, 110, 120, 140, 150, 196, 188 | **planned** |
   ```

## 11. Acceptance

- `nub run --filter playground build` exits `0`.
- `--only declared-styles` and `--only text-truncation` pass, exit `0`.
- The full smoke suite is **68/68**, exit `0`, and writes both screenshots.
- `nub run check`, `nub run lint`, `nub run test` are green.
- Every mutation in §8 fails with the recorded detail, and the plan's §12 table
  is filled in with what actually happened.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index are updated.
- Nothing outside `apps/playground` and `packages/testing` is edited.

## 12. Record table (fill after the run)

| Item | Measured |
| --- | --- |
| suite before → after | 66 → 68 |
| `declared-styles` checks | |
| `text-truncation` checks | |
| one-line height / many-line height | |
| clamp 2 / clamp 3 heights | |
| step 9 (identical strings) heights | |
| step 10 (held pointer outside) | |
| M1–M6 failure details | |
| any STOP condition hit, and how it was resolved | |
