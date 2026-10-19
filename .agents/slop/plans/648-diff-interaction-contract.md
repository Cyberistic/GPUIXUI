# Plan 648 — The `<diff>` interaction contract: file toggles, a preview cap, line clicks and a live anchor

**Phase:** D/E (Tier 5 feasibility) · **Workstream:** `playground` · **Block:** free (`648` is the first free number above many-workstream claims: `644` notification-centre reveal, `645` fixed-surface insets, `646` f32 metric range / Tabs disabled focus, `647` List disabled focus)
**Depends on:** `100`, `120`, `130`, `140`, `161`, `189`, `197`, `529`
**Owner:** `playground` (`apps/playground`, `packages/testing`)

## 0. The question, and why it matters now

`COMPONENTS.md`'s **Diff viewer** row is `todo` and says only that `<diff>` renders
a unified diff: plan `161` measured that the file header, hunk header and
changed lines reach the paint log, and plan `163` measured that a crossing drag
copies line text without chrome. **No scenario has ever exercised the element's
interactive props**: `onToggleFile`, `onShowMore`, `onLineClick`, `maxLines`,
`collapsedPaths`, `wordDiff` or `scroll`. A real diff viewer is therefore
unbuildable from evidence: nobody knows whether a header click emits, whether the
element expands itself, what the preview cap counts, whether line numbers arrive,
whether a `scroll` diff keeps the reader's place when the patch changes, or
whether any row is addressable in the automation tree.

The published runtime source answers most of that on paper
(`@gpuix/native@0.10.0`, commit `9fcd6288`,
`packages/native/src/custom_elements/diff.rs` and `packages/native/src/diff/mod.rs`):

| Prop | Source behaviour | Consequence for a component |
| ---- | ---------------- | --------------------------- |
| `onToggleFile` | A click on a **file header** emits `toggleFile` with `value = file.path`. The element **never collapses itself**; `collapsedPaths` is the only control. | The consumer owns the collapsed set. |
| `collapsedPaths` | A collapsed file contributes **only its header**; its hunk, lines and `BodyPad` rows are removed, not hidden. | Collapsing is cheap (one row per file). |
| `maxLines` | A **global** cap on `Line` rows, not per file. When the cap is reached a `ShowMore { remaining }` row is appended and **later files are not emitted**. | It is a preview, not a per-file fold. |
| `onShowMore` | A click on the `ShowMore` row emits `showMore` with `value = remaining` (a **string**). The element never expands itself. | The consumer raises `maxLines` by the payload. |
| `onLineClick` | A click on a line row emits `lineClick` with `value = line.text`, `oldLine`, `newLine`. Meta rows are not clickable; hunk headers are not lines. | Line comments need the consumer to map numbers back to the file. |
| `wordDiff` | Paints word-level washes in `paint_quad`; the row text and geometry do not change. | The wash is screenshot evidence only (no pixel readback). |
| `scroll` | Uses `gpui::list` with 1024 px overdraw. On a row rebuild it captures `logical_scroll_top`, resets the list and **restores the anchor, clamped**. | A live patch update or a collapse does not jump to the top. |
| _(none)_ | Rows are internal GPUI elements (`__gpuix_diff_hdr_<ix>` …) with **no `testId`**. | A row is reachable only by coordinate geometry, never by a locator. |
| empty `patch` | Paints a centred **“No changes”** custom surface, still with bounds and hit area. | An empty state is honest and assertable. |

The row heights come from the runtime's default metrics
(`packages/native/src/theme.rs:404`): file header **36 px**, hunk header **28 px**,
line **21 px**, body pad **8 px**, notice **24 px**.

This plan turns that table into measured evidence in both harnesses, adds a
reusable consumer-side state rule with tests, and records the limitations
(no row locators, no word-diff assertion, the anchor has no exposed verb).

## 1. Files

**Create**

1. `apps/playground/src/scenarios/diff-state.ts` — the consumer-side rule the
   probe uses: `togglePath` and `revealMore`. Pure, Effect-native (`Option`,
   `Arr`, `Str`), no React.
2. `apps/playground/src/scenarios/diff-state.test.ts` — vitest tests for those
   two rules (the only pure part; the rest is a runtime measurement).
3. `apps/playground/src/scenarios/diff.tsx` — the `diff-surface` probe view and
   its `steps`.
4. `.agents/slop/plans/648-diff-interaction-contract.md` — this file.

**Change**

5. `apps/playground/src/scenarios/index.ts` — import and register
   `diffSurfaceScenario`; add `"diff"` to `PROBE_CAPABILITIES`.
6. `packages/testing/src/smoke.ts` — add `"diff"` to `CAPABILITIES`.
7. `apps/playground/src/live/scenarios.tsx` — add `live-diff` (same view,
   coordinate clicks, a live wheel; add it to `liveScenarios`).
8. `COMPONENTS.md` — add the `diff` capability row and rewrite the **Diff
   viewer** row from “API-shape work” to the measured contract, with the
   limitations.
9. `apps/playground/README.md` — register `diff-surface` and `live-diff` in the
   scenario tables and move the totals (scenario count, check count, live count).
10. `TODO.md` — add one ticked task under the playground workstream, and a
    cross-team task for `apps/docs/src/lib/capabilities.ts` (it must gain the
    `diff` capability and the two ids, or its matrix gate stays red).
11. `.agents/slop/plans/README.md` — index this plan in the playground table.

Do **not** edit `apps/docs`, `packages/components` or `packages/primitives` in
this task. The docs matrix row is the cross-team task in step 10.

## 2. The probe view (`apps/playground/src/scenarios/diff.tsx`)

### 2.1 Fixture

A two-file patch whose rows are known exactly:

```ts
export const APP_PATCH = [
  "diff --git a/src/app.ts b/src/app.ts",
  "index 1111111..2222222 100644",
  "--- a/src/app.ts",
  "+++ b/src/app.ts",
  "@@ -1,5 +1,5 @@",
  " const a = 1;",
  "-const b = 2;",
  "+const b = 3;",
  " const c = 4;",
  " const d = 5;",
  " const e = 6;",
  "diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml",
  "index 3333333..4444444 100644",
  "--- a/pnpm-lock.yaml",
  "+++ b/pnpm-lock.yaml",
  "@@ -1,3 +1,3 @@",
  " lockfileVersion: 9",
  "-old: 1",
  "+old: 2",
  " frozen: true",
].join("\n");
```

Rows: file 1 = header, hunk, **6** lines, pad; file 2 = header, hunk, **4**
lines, pad. **10 line rows**, **354 px** tall
(`72 + 56 + 210 + 16`). The **swap** fixture is byte-for-byte the same row
count, only `const e = 6;` becomes `const e = 60;`.

### 2.2 State and controls

- `collapsed: Option.Option<ReadonlyArray<string>>` — start `None`.
- `maxLines: Option.Option<number>` — start `None`.
- `scroll: boolean` — start `false`.
- `wordDiff: boolean` — start `false`.
- `empty: boolean` — start `false`.
- `swapped: boolean` — start `false`.
- `log: ReadonlyArray<string>` — the last events, joined by `>`.
  `onToggleFile` appends `toggle=<path>`, `onShowMore` appends `more=<value>`,
  `onLineClick` appends `line=<old|none>/<new|none>`.
- Counters: `toggles`, `mores`, `lines` (numbers, so a check can name the
  absence rather than parse the log).

The whole state is derived from **props**: the element's events only record and
update the app state. This is deliberate — it proves the element does not
collapse or expand itself.

Controls above the diff, each a `Pressable` with a `testId`:

| testId | Action |
| ------ | ------ |
| `diff-reset` | restore every field to its initial value |
| `diff-cap` | `maxLines = Some(3)` (or `None` when already capped) |
| `diff-swap` | toggle the swap fixture |
| `diff-word` | toggle `wordDiff` |
| `diff-scroll` | toggle `scroll` (with a fixed `height: 240` in scroll mode) |
| `diff-empty` | toggle the empty patch |
| `diff-collapse-second` | toggle `pnpm-lock.yaml` in `collapsed` (drives the anchor test without a visible header) |

Readout `diff-readout` (one line):
`collapsed=<join(",",paths)|none> max=<n|none> scroll=<0|1> word=<0|1> empty=<0|1> swapped=<0|1> toggles=<n> mores=<n> lines=<n>`.

The diff itself:

```tsx
<diff
  testId="diff-surface"
  patch={empty ? "" : swapped ? SWAP_PATCH : APP_PATCH}
  collapsedPaths={Option.getOrElse(collapsed, () => [])}
  maxLines={Option.getOrElse(maxLines, () => undefined)}
  wordDiff={wordDiff}
  scroll={scroll}
  onToggleFile={(event) => { /* record + togglePath */ }}
  onShowMore={(event) => { /* record + revealMore */ }}
  onLineClick={(event) => { /* record value/oldLine/newLine */ }}
  style={{ width: 640, height: scroll ? 240 : undefined }}
/>
```

`maxLines={undefined}` must be omitted, not `null`: the runtime's `set_prop`
treats a non-number as `None`, but the typed prop is optional and the honest
shape is omission. Use a spread helper:

```ts
...(Option.isSome(maxLines) ? { maxLines: maxLines.value } : {}),
```

### 2.3 The consumer rule (`diff-state.ts`)

```ts
/** Add `path` when absent, remove it when present. Insertion order is stable. */
export const togglePath = (
  collapsed: Option.Option<ReadonlyArray<string>>,
  path: string,
): ReadonlyArray<string>;

/**
 * Raise the preview cap by the `ShowMore` payload.
 *
 * - `None` cap: unchanged (the row cannot be painted without a cap).
 * - A non-numeric or non-positive payload: unchanged (never throw, never guess).
 * - Otherwise: `Some(current + remaining)`.
 */
export const revealMore = (
  maxLines: Option.Option<number>,
  remaining: string,
): Option.Option<number>;
```

Use `Arr.contains`/`Arr.append`/`Arr.filter`, `Str.trim`, `Number.parseInt`.
Tests (each must be able to fail):

1. `togglePath(None, "a")` → `["a"]`; toggling `"a"` again → `[]`.
2. An existing list `["a","b"]` toggled at `"a"` keeps the order of the rest.
3. `revealMore(Some(3), "7")` → `Some(10)`.
4. `revealMore(None, "7")` → `None`; `revealMore(Some(3), "x")` → `Some(3)`;
   `revealMore(Some(3), "0")` → `Some(3)`.

## 3. The headless scenario (`diff-surface`)

Register in `scenarios/index.ts` **after** `nativeSurfacesScenario` (same
content family), add `"diff"` to `PROBE_CAPABILITIES`, and add `"diff"` to
`packages/testing/src/smoke.ts`'s `CAPABILITIES` (the schema would otherwise
reject the scenario's capability). `scenarioProblems` must stay empty.

Steps, in this order. Every coordinate is derived from
`ctx.host.bounds("diff-surface")`, never from the probe chrome above it.

1. **Mount and geometry.** `diff-surface` is a `diff` node with width 640 and
   height **354 ± 1**. `paintedText` contains `src/app.ts`,
   `pnpm-lock.yaml`, `@@ -1,5 +1,5 @@`, `const a = 1;`, `const b = 2;`,
   `const b = 3;`, `const e = 6;`, `frozen: true`.
2. **Header click → `toggleFile`.** `clickWindow(box.x + 6, box.y + 18)`
   → wait one `advance(0)`; readout `toggles=1` and `collapsed=src/app.ts`;
   the box height is now **192 ± 1** (file 1's body is 162 px:
   hunk 28 + 6 lines 126 + pad 8); painted text lacks `const a = 1;` and keeps
   `frozen: true`. A second click on the same header restores 354 and
   `toggles=2`, `collapsed=none`.
3. **Rows other than a header do not toggle.** After a reset, click the hunk
   header at `(x + 6, y + 36 + 14)` → `toggles=0`; click the first line's gutter
   at `(x + 8, y + 36 + 28 + 10)` → `toggles=0` and `lines=1`.
4. **Line click payload.** The gutter click in step 3 reads `line=1/1` and the
   log's last entry carries the text `const a = 1;`; a click on the deleted
   line (row 2: `y + 36 + 28 + 31`) reads `line=2/none`; a click on the added
   line (row 3: `y + 36 + 28 + 52`) reads `line=none/2` — the **new** file's
   line 2, because the deleted line occupies no new-side number.
5. **Preview cap.** Click `diff-cap` → `max=3`; the box height is
   **163 ± 1** (`36 + 28 + 63 + 36`), painted text contains `Show 7 more lines`
   and lacks `const e = 6;`; `mores=0` (the element did not expand). Click the
   ShowMore row at `(x + 20, height - 18)` → `mores=1`, the log carries
   `more=7`, `max=10`, the box height is **354**, and painted text now contains
   `const e = 6;` **and** `frozen: true`, and lacks `Show 7 more lines`.
6. **Initial collapse.** Click `diff-reset`; click `diff-collapse-second` →
   `collapsed=pnpm-lock.yaml`, height **234 ± 1** (198 + 36), painted text keeps
   `const a = 1;` and lacks `frozen: true`; a header click on file 2 (its header
   is at `y + 198 + 18`) expands it and reads `toggles=1`.
7. **`wordDiff` is a wash.** Click `diff-reset`, note the box height; click
   `diff-word` → `word=1`; the height is unchanged and every diff row still
   paints. Record the limitation: the wash itself is not assertable, and the
   probe's own readout necessarily changes (`word=0` → `word=1`), so compare the
   diff rows, not the whole window's painted text.
8. **Scroll mode and the anchor.** Click `diff-scroll` → box height 240
   (`scroll=1`); wheel `-200` at the box centre → painted text no longer
   contains `const a = 1;`; click `diff-swap` → the box still does not paint
   `const a = 1;` (the reader stayed below the top), painted text now contains
   `const e = 60;`, and `swapped=1`. Click `diff-reset` (which also resets
   scroll) to restore the full document.
9. **Empty patch.** Click `diff-empty` → painted text contains `No changes`,
   the box has bounds (height > 0), and the row text is gone; click
   `diff-reset` restores the document.
10. **Cost/limits.** `elementTypeOf(ctx, "diff-surface")` is `diff`; the
    automation/a11y tree exposes the diff as one node — no file header or line
    is independently addressable (record it in the plan's result section; the
    scenario asserts that no `testId` of the form `diff-row-*` exists by
    construction, not by a runtime lookup).

Expected: **70 checks** (measured), one passing scenario, exit `0`.

**STOP conditions**

- The header click does not emit `toggleFile` in `TestRenderer`. Do not
  fabricate a consumer contract: assert the measured behaviour (click emits
  nothing, `toggles=0`), record a limitation in `COMPONENTS.md`, and skip
  steps 2 and 6's event halves. If the click also misses the header (height
  checks fail), stop and report with the measured box.
- The measured height is not 354/192/163/234 ± 1. Assert the **measured**
  literals, add a comment naming the metrics source and the measured values,
  and update this plan; do not widen the tolerance to fit.
- The line-click payload fields are absent (`oldLine`/`newLine` undefined) when
  the source says they are set. Record the measured payload and assert it; do
  not pretend numbers arrived.
- The binding is missing: the runner must exit `2` "unverified". Never claim a
  pass.

## 4. The live twin (`live-diff`)

```ts
const diff: LiveScenario = {
  id: "live-diff",
  title: "Live diff: file toggles, the preview cap, a line click and the scroll anchor",
  capability: "diff",
  view: diffSurfaceScenario.view,
  ready: "diff-readout",
  steps: (ctx) => Effect.gen(function* () {
    // 1. Geometry: height 354 ± 1 (the live box adds no correction).
    // 2. A real click on the file header → waitForText("diff-readout", "toggles=1");
    //    wait for the box to shrink to 192 ± 1; a second click restores 354.
    // 3. `diff-cap` via the locator click → wait "max=3";
    //    a real coordinate click on the ShowMore row → wait "max=10".
    // 4. A real click on the deleted line's gutter → wait "line=2/none".
    // 5. `diff-scroll` → wait "scroll=1"; hover + settle then a real `-200`
    //    wheel; wait for `const a = 1;` to leave the painted text.
    // 6. `diff-swap` while scrolled; assert `const e = 60;` paints and the first
    //    line does not (the anchor survived).
    // 7. Screenshot to LIVE_ARTIFACTS.
  }),
};
```

Use the existing live helpers: `boxOf`, `waitForText`, `settle`, `paintedCount`,
`ctx.host.clickWindow`, `ctx.host.wheel` (precede a wheel with `hover` +
`settle`, plan `606`). Register it in `liveScenarios` **after** `liveMarkdown`
(same content family). Expected **24 checks** (measured), exit `0`; live
registry `92 → 93`.

## 5. Commands and expected results

Run from the repo root (`/Users/cyberistic/GPUIXUI/workspaces/playground`):

```sh
nub run --filter playground test
# expected: all playground tests pass; +4 diff-state tests (428 → 432)

nub run --filter playground build
# expected: tsc succeeds; install-binding keeps the pinned release binding

nub apps/playground/dist/smoke/run.js --only diff-surface
# expected: 1/1 scenarios, exit 0, ~34+ checks; smoke-report.json names diff=verified

nub apps/playground/dist/live/run.js --only live-diff
# expected: 1/1 scenarios, exit 0, ~10+ checks, one screenshot; run it twice

nub run check && nub run lint && nub run test
# expected: all green (the schema change is cross-cutting)

nub apps/playground/dist/smoke/run.js
# end-of-task headless gate: 105/105, exit 0 (was 104)
```

The **full live suite** (`--all`) is the merge/release gate. Because this plan
adds a registered live scenario and the branch is at its promotion point, run it
once at the end and record `93/93` and the check total in `TODO.md`,
`COMPONENTS.md` and `apps/playground/README.md`. If it has already been run on
a later head, cite that run instead of spending another ~16 minutes.

## 6. Mutation proofs (must be observed, then reverted)

Run `--only diff-surface` for each; each must exit `1` with the named label.

| # | Mutation | Expected failure |
| - | -------- | ---------------- |
| M1 | Delete `onToggleFile` from the `<diff>` | `the file header click emits toggleFile` — `toggles=0` |
| M2 | Record the toggle but do not apply `togglePath` | `the file body collapses` — height still 354 |
| M3 | Drop `onShowMore` / do not apply `revealMore` | `the preview cap expands` — `max=3`, `Show 7 more lines` still paints |
| M4 | Change `maxLines` from 3 to 4 | `the preview cap hides later rows` — height 184, remaining 6 |
| M5 | Delete `onLineClick` | `a line click reports its numbers` — `lines=0` |
| M6 | Swap `oldLine` for `newLine` in the log | `a deleted line reports old=2 new=none` — `old=none new=2` |
| M7 | Force `scroll={false}` in scroll mode | `the scroll diff has a fixed viewport` — height is 354, not 240 |
| M8 | Add `key={swapped ? "b" : "a"}` to the diff | `the reader keeps their place across a patch update` — `const a = 1;` repaints |
| M9 | Render `patch` in a `div` instead of `<diff>` | the type/height/paint checks fail |

M9 is the "the probe measures the runtime, not a mock" guard.

## 7. Ledger updates

- **`COMPONENTS.md` capability table:** add
  `| diff | diff-surface, live-diff | verified |`.
- **`COMPONENTS.md` Diff viewer row:** status stays `todo` (no component) but the
  evidence column becomes the measured contract: header click → `toggleFile`
  (path) with no self-collapse; `collapsedPaths` removes body rows; `maxLines`
  is global and appends `Show N more lines` with `showMore` = the count as a
  **string**; the element never expands itself; `lineClick` carries text plus
  old/new numbers; `wordDiff` is a wash (screenshot-only); `scroll` keeps the
  anchor across a rebuild; rows have no `testId`; an empty patch paints
  `No changes`. Cite `diff-surface`/`live-diff` and plan `648`.
- **`apps/playground/README.md`:** add both scenarios to the tables and update
  the headless/live totals; state that a diff row is coordinate-addressed.
- **`TODO.md`:** one ticked playground task summarising the measured result with
  the exact focused ids run; one cross-team task for
  `apps/docs/src/lib/capabilities.ts` (`diff` capability + both ids).
- **Plan index:** add the row to the playground table; record that `648` was
  taken after `644`–`647`.

### 7.1 Measured result (2026-10-19)

Measured on the release-tag binding (`gpuix 9fcd6288`, `zed 81c99f81`, runtime
shaders) with the pinned theme defaults.

| Fact | Measured |
| ---- | -------- |
| Full fixture height | **354 px** exactly (72 + 56 + 210 + 16); width 640 |
| Collapse of `src/app.ts` | **192 px**; its six line rows and hunk leave the paint, `pnpm-lock.yaml` stays |
| Collapse of `pnpm-lock.yaml` | **234 px**; its header is at `y + 198`, and clicking it expands |
| `maxLines={3}` | **163 px**, paints `Show 7 more lines`; `mores=0` before the click |
| `showMore` payload | `"7"` (a **string**); the consumer's `3 + 7 = 10` restores 354 px and both files |
| Line click | context `line=1/1`, deleted `line=2/none`, added `line=none/2` — the **correction** to this plan's first draft: the added line is the new file's line **2**, because the deleted line consumes no new-side number |
| Hunk header click | emits neither `toggleFile` nor `lineClick` |
| `wordDiff` | no box change and every row still paints; the wash itself is screenshot-only |
| Empty patch | bounded 640 px surface painting `No changes` |
| `scroll` | 240 px viewport; `-200` leaves the first line behind; a patch swap repaints `const e = 60;` **without** returning to the top |
| The anchor's reverse proof | adding `key={swapped ? "b" : "a"}` to the diff loses the place (`const a = 1;` repaints) |
| Row addressability | the element is one `diff` host node; a header/line is only reachable by coordinates (36/28/21 px rows) |

Mutation proofs were run one at a time with `--only diff-surface`; each failed
at the named check and was reverted. Observed labels:

| # | Observed failure |
| - | ---------------- |
| M1 | `the file header click emits toggleFile: expected "1", got "0"` |
| M2 | `the payload names the clicked file: expected "src/app.ts", got "none"` (the height check is downstream of the set) |
| M3 | `the show-more row emits once: expected "1", got "0"` |
| M4 | `the cap is set: expected "3", got "4"` |
| M5 | `a line click reports its numbers: expected "1", got "0"` |
| M6 | `a removed line has no post-change number: … got "line=1/1>line=none/2"` |
| M7 | `the wheel leaves the first line behind: expected false, got true` (the fixed height alone did not prove scrolling) |
| M8 | `the reader keeps their place across a patch update: expected false, got true` |
| M9 | `the diff is a diff host node: expected "diff", got "text"` |

Focused runs: `nub apps/playground/dist/smoke/run.js --only diff-surface` (70
checks) and `nub apps/playground/dist/live/run.js --only live-diff` (24 checks,
two consecutive runs), both exit `0`; `nub run check`, `nub run lint` and
`nub run test` green (playground **432** tests). The end-of-task headless suite
is **105/105** (**3765** checks, 65 capabilities), exit `0`.

## 8. Acceptance

- [x] Plan indexed before code (this file) and `scenarioProblems` empty.
- [x] `diff-state.ts` + 4 tests; the tests fail if `togglePath` is a no-op or
      `revealMore` accepts a junk payload.
- [x] `diff-surface` green (70 checks) and **fails** in the M1–M9 directions.
- [x] `live-diff` green in a real 1100×720 window (24 checks, two consecutive
      focused runs).
- [x] `diff` verdict `verified` in the smoke report; the registry totals are
      updated honestly.
- [x] `nub run check`, `nub run lint`, `nub run test` green.
- [x] Limitations recorded, not hidden: no row locators, no word-diff colour
      assertion, the scroll anchor has no renderer verb (paint is the evidence).
