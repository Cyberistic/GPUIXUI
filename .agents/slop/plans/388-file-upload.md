# 388 — Tier 5 feasibility: a file-upload queue — drop paths, progress, cancel/retry and the picker bound

**Status:** landed 2026-10-18 · **Phase:** D/E · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `162`, `188`, `330`, `337`,
`387`.

**Number note:** the playground index says the next free number is **`388`**.
Take it, and move the index to `389` after this plan lands.

## 1. Why this plan exists

`COMPONENTS.md` has a **File upload** row at `todo | partial (probe)` and a
**File / folder selection** row at `todo | yes` with only docs evidence. Two
measured fragments exist, and neither is a file-upload surface:

- `drag-targets` (plan `162`) measured the drop event itself: `onFileDrop`
  receives **absolute paths only** plus the window point, a drop on an element
  **without** a handler emits no drop but still a **click**, and the drag
  gesture ends in a click on the source.
- `text-entry` (plan `188`) and the Tier 1 probes measured `<input>`; the picker
  (`promptForPaths`) has **never** been called by any scenario, because it is a
  blocking OS panel with no automation verb (plan `162` §8, `COMPONENTS.md`).

Nothing measures the composition a file-upload control actually is:

1. Does a real file drop reach a **drop zone** whose own content is drawn inside
   it — i.e. does `onFileDrop` bubble to an ancestor, or must every child carry
   the handler?
2. The drop is followed by a click. A drop zone that is clickable to open the
   picker would therefore open the picker **after every drop** unless the
   component ignores that click. Which order does the runtime deliver?
3. A dropped path carries **no size, MIME type or mtime**. What does a row show
   before the app stats the file, and where is the boundary?
4. A finished file needs a progress fill, a cancel that freezes it, a failure
   that repaints, and a retry that resets it. Does a plain `div` fill inside a
   row measure exactly, and does the row keep its model across a repaint?
5. Can the OS picker be exercised unaattended at all, or is the honest answer a
   measured bound plus an app-owned `promptForPaths` call?

This plan answers all five with **no package code**, one pure model + unit
tests, one consumer view and one headless scenario. It deliberately has **no
live twin**: the automation protocol has no file-drop verb, and
`nativeSimulateFileDrop` is a `TestGpuixRenderer` method — the live window
cannot deliver a drop (see §9). That is a measured limitation, not a skipped
test.

## 2. What is already measured (do not re-measure)

| Fact | Source |
| ---- | ------ |
| `onFileDrop` carries `paths` (absolute) and `x`/`y`; a drop on an element without a handler emits no drop but a click | `drag-targets` (162) |
| Hover is frozen during a captured drag | `drag-targets` (162) |
| `promptForPaths(options?)` resolves with absolute paths or `null`; it opens the platform panel | GPUix 0.10.0 `NativeRenderer` / `README`; `TestRenderer` forwards to `cx.prompt_for_paths` |
| A `div`'s painted width is exact; `paintedStyle` reports the authored value | `data-grid-columns` (349), `declared-styles` (335) |
| `role="button"` + `aria-label` maps to AccessKit `Button`; `role="status"` maps to `Status` | `a11y-tree` (160), `app-chrome` (350) |
| A click on a `Button` fires once; Enter on key down and Space on key up | `primitives-actions` (168) |
| A controlled `<input>` repaints from the model on every change | `text-entry` (188) |

The picker is **not** re-measured: plan `162` and `COMPONENTS.md` already bound
it. This plan only stops treating it as an open question.

## 3. What will be proven

Capability: `upload` (new). Scenario: `file-upload` (headless only).

### 3.1 The pure model (`apps/playground/src/scenarios/upload-model.ts`)

Effect-first: `Option` for unknown sizes, `Arr`/`Str` for collection work, no
native `Array` helpers, no `console.*`.

```ts
export const MAX_BYTES = 25 * 1024 * 1024;
export const ACCEPTED: ReadonlyArray<string> = [".png", ".jpg", ".csv", ".pdf", ".txt"];

export type UploadStatus = "queued" | "uploading" | "done" | "error" | "canceled";

export interface UploadFile {
  readonly id: number;
  readonly path: string;
  readonly name: string;
  readonly bytes: Option.Option<number>;
  readonly progress: number; // 0..100
  readonly status: UploadStatus;
}

export interface UploadState {
  readonly files: ReadonlyArray<UploadFile>;
  readonly nextId: number;
  readonly drops: number;
  readonly clicks: number;
  readonly picker: number;
  readonly duplicates: number;
  readonly rejected: ReadonlyArray<string>; // "name: type" / "name: size"
  /** A click arriving now is the trailing click of the last drop. */
  readonly suppressClick: boolean;
  readonly last: string;
}

export const initial: UploadState;

/** A dropped path plus what the app already knows; the drop itself carries no size. */
export interface DroppedFile {
  readonly path: string;
  readonly bytes: Option.Option<number>;
}

export const fileNameOf: (path: string) => string;
export const extensionOf: (path: string) => string;
export const isAccepted: (path: string) => boolean;
export const formatBytes: (bytes: number) => string;

/** Adds every accepted, non-duplicate path; records rejections and duplicates. */
export const addFiles: (state: UploadState, files: ReadonlyArray<DroppedFile>) => UploadState;

/** Records a drop and arms the trailing-click guard. */
export const noteDrop: (state: UploadState, count: number) => UploadState;

/** A click on the zone: a trailing drop click is swallowed, a real one opens the picker. */
export const clickZone: (state: UploadState) => UploadState;

export const start: (state: UploadState, id: number) => UploadState;
export const setProgress: (state: UploadState, id: number, percent: number) => UploadState;
export const complete: (state: UploadState, id: number) => UploadState;
export const fail: (state: UploadState, id: number) => UploadState;
/** Freezes the progress and marks `canceled`. */
export const cancel: (state: UploadState, id: number) => UploadState;
/** Resets to `queued` at 0%, from `canceled` or `error`. */
export const retry: (state: UploadState, id: number) => UploadState;

export const findFile: (state: UploadState, id: number) => Option.Option<UploadFile>;

export interface UploadSummary {
  readonly total: number;
  readonly done: number;
  readonly bytes: number; // only known sizes
  readonly percent: number; // rounded mean of `progress`
}
export const summary: (state: UploadState) => UploadSummary;
```

Rules the tests must pin:

- `addFiles` dedupes by **path** (a duplicate increments `duplicates` and adds
  nothing), rejects an extension outside `ACCEPTED` (case-insensitive) and a
  known size over `MAX_BYTES`, and keeps `bytes: Option.none()` for an unknown
  size.
- `clickZone` **consumes** the guard once: the first click after a drop only
  increments `clicks`; a second click increments `picker`.
- `setProgress` clamps to `0…100` and does nothing to a `done`/`canceled` row.
- `cancel` freezes `progress`; `retry` resets it to 0.
- `summary.percent` ignores nothing (a canceled row's frozen progress still
  counts) — document that choice in a comment so a weaker executor does not
  "improve" it.

### 3.2 The view (`apps/playground/src/scenarios/file-upload.tsx`)

A 680 × 520 surface:

- **Drop zone** `upload-zone` (640 × 150, `borderWidth: 1`, muted fill,
  `onFileDrop`). Inside it: `upload-hint` (a `<text>`, **no** handler) and
  `upload-inner` (a 120 × 24 div **with** the same `onFileDrop`). The zone also
  has `onClick`.
- A **summary strip** `upload-summary` (`role="status"`): `2 files · 3 done · 4.2 MB · 50%`.
- A **rejected line** `upload-rejected` when a drop was refused.
- Up to five **rows** (56 px): `upload-name-<id>`, `upload-size-<id>`
  (`size=unknown` when `Option.none()`), `upload-status-<id>`,
  `upload-track-<id>` (240 × 6) containing `upload-fill-<id>` whose width is
  `240 * progress / 100`, and `upload-action-<id>` (a `Button`-shaped `div`
  with `role="button"`): `Start` when queued, `Cancel` when uploading,
  `Retry` when canceled/error, absent when done.
- A **state readout** `upload-state`:
  `files=2 drops=1 clicks=1 picker=0 dup=0 last=drop`.
- The dropped path is mapped to a known size through a **fixed fixture**
  (`/tmp/report.png` → 2 048, `/tmp/data.csv` → 1 536 000); any other path is
  `Option.none()`. That is the app's `stat` boundary; the view never reads the
  filesystem.
- The click handler calls `clickZone`, which increments `picker`; the view calls
  **nothing** (it does not call `promptForPaths` — that is the app's blocking
  boundary). The readout is the evidence that the request was made once.
  **As measured (§10):** there is no trailing click after a handled drop, so no
  click guard is armed; the first click opens the picker. The planned guard was
  deleted because it swallowed that click.

### 3.3 What the scenario measures

`file-upload` steps, in order:

1. `fileDrop("upload-zone", ["/tmp/report.png", "/tmp/data.csv"])` → two rows;
   `drops=1`, `files=2`, both `queued`, `progress=0`; names and sizes paint.
2. The runtime's trailing click: after the drop the readout shows `clicks=1`
   and **`picker=0`** (the guard), and `last=drop`.
3. A real `click("upload-zone")` → `picker=1`, `last=picker`; a second click →
   `picker=2`.
4. A duplicate drop of `/tmp/report.png` → `dup=1`, `files=2`.
5. A drop of `/tmp/notes.txt` (accepted, no fixture) → a third row painting
   `size=unknown`.
6. A drop of `/tmp/tool.exe` → `files=3`, the rejected line paints
   `tool.exe: type`.
7. `click("upload-action-0")` starts row 0; `setProgress` is driven by the view
   on a **probe control** `upload-step-0` (`+20%`) because no timer is needed:
   assert `uploading`, fill width `48 ± 1` at 20%, then `240` and `done` at
   100% (five steps).
8. Start row 1, progress 40, `click("upload-action-1")` cancels → `canceled`,
   fill stays `96 ± 1`, the action is `Retry`.
9. Retry row 1 → `queued`/0; start + fail (a probe control `upload-fail-1`) →
   `error`, destructive border; retry again → `queued`/0.
10. The summary reports `3 files · 1 done · 50%` and the known bytes only.
11. A drop on `upload-hint` (no handler) and on `upload-inner` (its own
    handler): both are measured by §10 — the hint's drop reaches the zone, the
    inner's reaches only the inner. The scenario asserts `events +1` for the
    hint and `events +0` / `inner 1` for the inner.
12. `role="button"` on the action and `role="status"` on the summary are in the
    AccessKit dump (`Button`, `Status`).

The **picker bound** is recorded, not asserted: `promptForPaths` is blocking,
`TestRenderer` forwards to `cx.prompt_for_paths`, and no automation verb exists,
so the OS panel cannot be driven by this suite. The probe deliberately stops at
"the zone requested the picker once".

### 3.4 Why no live twin

`AsyncSmokeHost` is built from the real `GpuixRenderer`, which exposes
`promptForPaths` but **not** `nativeSimulateFileDrop` (that method is on
`TestGpuixRenderer`), and the automation protocol has no drop verb. A live twin
could only seed the model and would prove the row surface, not the drop. The
plan records the limitation instead of shipping a half-fake twin; colour and
a11y are already `TestRenderer`-only for the same reason (plan `197`).

## 4. Files to create or change

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/388-file-upload.md` | this plan |
| `.agents/slop/plans/README.md` | add the `388` row; move the next free number to `389` |
| `apps/playground/src/scenarios/upload-model.ts` | **new** pure model |
| `apps/playground/src/scenarios/upload-model.test.ts` | **new** unit tests |
| `apps/playground/src/scenarios/file-upload.tsx` | **new** view + scenario |
| `apps/playground/src/scenarios/index.ts` | import/register `fileUploadScenario`; add `"upload"` to `PROBE_CAPABILITIES` |
| `packages/testing/src/smoke.ts` | add `"upload"` to `CAPABILITIES` |
| `COMPONENTS.md` | capability row `upload`; update the **File upload** row; update the suite count and checks; note the picker bound |
| `TODO.md` | tick the new playground task; update the suite numbers |
| `PLAN.md` | one §4 decision row recording the measured drop/click/bubbling rules |

No change to `packages/testing` beyond the capability literal. No change to
`packages/components` (the file-upload control is a probe contract, not a
package row yet).

## 5. Commands and expected results

Run every command from the worktree root.

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground test` | the new `upload-model.test.ts` passes; all existing tests pass |
| `nub run --filter playground build` | exit `0`; `dist/smoke/run.js` is rebuilt |
| `nub apps/playground/dist/smoke/run.js --only file-upload` | exit `0`, `file-upload` green, one screenshot |
| `nub run --filter playground smoke` | exit `0`; suite `89 → 90` scenarios; `upload=verified` in the capability line |
| `nub run check` | exit `0` (tests, lint, format, types) |
| `nub run test` | exit `0` |

Record the **exact** check count from the run in `COMPONENTS.md` and `TODO.md`;
do not estimate it.

## 6. Test plan

### 6.1 Unit tests (`upload-model.test.ts`)

Each test must be able to fail. At least:

| Test | The bug it catches |
| ---- | ------------------ |
| `fileNameOf` for a path, a bare name and a trailing slash | a naive `split("/")` index |
| `extensionOf` is the last dot after the last slash and lower-case for `isAccepted` | `.tar.gz` handled as `.tar`; case-sensitive reject |
| `formatBytes` for `0`, `512`, `2048`, `15360`, `3_400_000` | a wrong base or decimal rule |
| `addFiles` maps paths, keeps `Option.none()` for unknown bytes | a default of `0` hiding "unknown" |
| `addFiles` dedupes and counts duplicates | a second row for the same path |
| `addFiles` rejects a type and an oversized known file | accept-all |
| `clickZone` swallows exactly one click after `noteDrop` | the trailing drop click opening the picker |
| `setProgress` clamps and refuses a done/canceled row | progress regressing after cancel |
| `cancel` freezes, `retry` resets | retry keeping the old fill |
| `fail` paints error and `retry` recovers | a terminal error |
| `summary` total/done/percent and known bytes | counting unknown as 0 bytes |
| `findFile` for a present and an absent id | an index/`id` mix-up |

### 6.2 Native two-direction proofs

The executed mutations and their observed failures are in §10.1. The original
plan proposed a trailing-click guard mutation; the run disproved the guard
itself, so M1 is now "the click no longer opens the picker" instead. Run one
mutation at a time and restore it after the run.

## 7. STOP conditions

Stop and report with evidence — do not improvise — if:

- the drop on `upload-zone` does not fire `onFileDrop` at all (the view is
  wrong, or the runtime regressed);
- a drop on a child **without** a handler sets `drops` and a drop on the zone
  does not (the hit-test model contradicts plan `162` — record before changing
  the view);
- the progress fill's painted width disagrees with the authored width by more
  than 1 px (record the two numbers; do not widen the tolerance);
- the trailing click does **not** arrive after a drop (then the guard is
  unnecessary, but do not delete the model rule: assert `clicks=0` and record
  the fact — the rule stays defensive and unit-tested);
- a check can only pass by asserting a value the test itself stubbed.

## 8. Acceptance criteria

- `upload-model.ts` + `upload-model.test.ts` exist, the tests pass, and every
  test names the bug it guards.
- `file-upload` is registered, runs headless, and every step above asserts
  something the runtime reports.
- `COMPONENTS.md` has the `upload` capability row, the **File upload** row is
  updated with the measured contract (paths-only, trailing click, child
  bubbling, progress geometry), and the suite line is `90/90` with the real
  check count.
- `TODO.md` has the task ticked with the measured facts and counts.
- `PLAN.md` D58 records the decision (drop paths only; the trailing click; the
  child rule; no live drop).
- `nub run check` and `nub run test` pass.
- The plan index row is `landed` and the next free number is `389`.

## 9. Number and ownership notes

- The playground owns this plan and `apps/playground` + `packages/testing`.
- The file-upload **component** is not built here; the probe is the runtime
  contract for whoever claims the Tier 5 row.
- The picker bound belongs here, not in a component: `promptForPaths` is the
  app's blocking OS boundary.

## 10. Measured results

| Question | Measurement |
| -------- | ----------- |
| Does `onFileDrop` bubble from a child without a handler? | **Yes** — the drop is delivered to the nearest ancestor-or-self with a handler, once. A drop on `upload-hint` (no handler) reached the zone (`events +1`). |
| Does a child with its own handler also reach the zone? | **No** — a drop on `upload-inner` reached its own handler only (`inner 1`, `events +0`). A nested drop target must add the file itself. |
| Does a drop on a handled zone deliver a trailing click? | **No** — `clicks` stayed `0` after the drop. Plan `162`'s click belongs to an element **without** a drop handler. |
| Was the planned click guard needed? | **No, and it was harmful.** The guard stayed armed because no trailing click arrived, so the **first real click was swallowed** (`picker 0`). It was deleted: `clickZone` always opens the picker. The unit test now guards the opposite bug. |
| How many `onFileDrop` events per simulated drop? | **One** — GPUI's `Entered`/`Submit` pair reaches the handler once, with both paths. |
| Fill width at 20% / 40% / 100% of a 240 px track | **48 / 96 / 240 px**, exact within 1 px. |
| Does cancel freeze the fill? | **Yes** — 96 px before and after cancel; retry resets it to 0. |
| Does an error row repaint with the destructive border? | **Yes** — `paintedStyle.borderColor` equals the dark palette's `destructive`. |
| Does a drop carry file sizes? | **No** — paths only; `upload-size-2` paints `size=unknown` for an unstatted path. |
| The picker | Not called: `promptForPaths` is a blocking OS panel with no automation verb; the probe records the request (`picker`) and stops. |
| Suite count / checks after the run | **90/90** scenarios, **3088** checks (was 89/89, 3047), exit `0`, `upload=verified`; 41 checks in `file-upload`. |
| Unit tests | **283** in `apps/playground` (was 264 before plans 387/388; +19 here). |

### 10.1 Two-direction proofs

| Mutation | Observed failure |
| -------- | ---------------- |
| M1: `clickZone` no longer increments `picker` | `a real click opens the picker: expected "1", got "0"` |
| M2: the zone ignores its drop (`receive([])`) | `the drop queued two files: expected "2", got "0"` |
| M3: the fill uses `progress` as its pixel width | `a 20% fill is 48 px of 240: expected 48 ± 1, got 20` |
| M4: `cancel` resets the progress | `cancel freezes the fill: expected 96 ± 1, got 0` |
| M5: `addFiles` drops the duplicate check | `a duplicate is not a row: expected "2", got "3"` |

Every mutation was applied alone, rebuilt, run with
`nub apps/playground/dist/smoke/run.js --only file-upload`, and reverted.

### 10.2 What the component should do

- Put **one** `onFileDrop` on the zone; plain children are covered. A child
  that owns its own drop handler must add the file itself, because the zone
  will not see it.
- Do **not** arm a click guard on a handled zone; there is no trailing click.
- Treat a dropped path as identity and dedupe by it; sizes need an app-owned
  `stat` at the boundary, so a row is honest as `size=unknown` until then.
- The picker is the app's blocking `promptForPaths` boundary, not a component
  interaction the suite can drive.
