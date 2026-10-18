# 557 — Declared hover/active and text truncation in a real window

| Field | Value |
| ----- | ----- |
| Workstream | playground |
| Phase | F (native evidence) |
| Depends on | `100`, `110`, `140`, `189`, `190`, `199`, `335`, `529` |
| Owns | `apps/playground/src/live/scenarios.tsx`, `apps/playground/src/scenarios/styles.tsx` (read only), the `states` / `truncation` rows of `COMPONENTS.md`, the playground `TODO.md` row |
| Feeds | the `states` and `truncation` capabilities — the two style families every interactive component and truncating label relies on stop being headless-only |

## 1. Why this exists

Plan `335` measured the declared-style and truncation contract in the
`TestRenderer`. Every interactive part in the library declares `style.hover` /
`style.active` rather than scripting pointer state, and every truncating label,
cell and tab declares `textOverflow`/`lineClamp`. Since plan `199` proved a real
`mouse.move` reaches React (the preview card), the mechanism that applies those
declarations is live-testable. Neither `declared-styles` nor `text-truncation`
has a live twin, so the two facts a component build depends on are unproven in
a window:

1. hover/active are applied by the runtime from **real** pointer input and
   reverted on leave/release, per element;
2. `textOverflow` collapses to one line and `lineClamp` is exact in a window.

**Goal:** add `live-states` (capability `states`) and `live-truncation`
(capability `truncation`), mounting the shipped probe views unchanged.

## 2. What is already measured

| Fact | Source |
| ---- | ------ |
| A real `mouse.move` delivers enter/leave and opens a hover card | `live-preview`, plan `199` |
| Hover changes a layout property, so bounds observe it | `declared-styles`, plan `335` |
| Hover is per element; a child's hover cancels the parent's | `declared-styles` |
| A press at a point applies `active` without hover; a held move keeps it | `declared-styles` |
| The style report is the authored style (colour-only hover is invisible) | `declared-styles`, D47 |
| `textOverflow`/`nowrap` are one line; `lineClamp` is exact and inherited | `text-truncation`, plan `335` |
| Painted text is the source run, never the ellipsis glyph | `text-truncation` |
| The live tree has no `style`, but `bounds` and `paintedText` exist | plan `197` |

## 3. The live scenarios

Both views are mounted unchanged from `../scenarios/styles.js`.

### 3.1 `live-states` (`states`)

`ready: "styles-root"`. Ratios are the headless authored values; every read is
after `settle` and a bounded `waitForBounds` for the expected width (plan `382`'s
rule), never a bare read straight after a pointer move.

```
 1. width("styles-button")  ≈ 100
 2. width("styles-parent")  ≈ 400
 3. hover("styles-button")  → width ≈ 140        (hover applied)
 4. hover("styles-parent")  → parent ≈ 420, child ≈ 100
 5. hover("styles-child")   → parent ≈ 400, child ≈ 120
 6. hover("styles-away")    → parent ≈ 400, child ≈ 100
 7. pressWindow(button centre) → width ≈ 180      (active applied)
 8. releasePointer(centre)  → width ≈ 100          (press did not hover)
 9. hover("styles-button")  → 140; hover("styles-away") → 100
10. pressWindow(centre); movePointer(20, 300) → still 180
11. releasePointer(20, 300) → 100
12. screenshot
```

The button's centre comes from its own bounds, never a constant. No colour or
`paintedStyle` check: the live tree has no style (plan `197`).

### 3.2 `live-truncation` (`truncation`)

`ready: "truncation-root"`. The headless probe's arithmetic carries over:
`line = height("trunc-line")`, then

```
1. trunc-line ≈ nowrap, trunc-start ≈ nowrap          (one line)
2. nowrap < wrap, wrap > line * 8                     (nowrap overflows)
3. clamp-2 ≈ line * 2, clamp-3 ≈ line * 3, clamp-box ≈ line * 2
4. clamp-2 < wrap                                     (a clamp, not a clip)
5. repeat-clamp ≈ repeat-plain, repeat-clamp > line * 4
6. paintedText has a run starting "trunc-line " and none ending "…"
7. screenshot
```

The repeated-string pair is the shared-layout rule: identical `(string, width)`
layouts are shared and the key ignores `lineClamp`, so the clamp sample lays out
unclamped. A window uses the same text engine, so the rule should transfer; if
it does not, record the difference rather than dropping the check silently.

## 4. Files to change

1. `apps/playground/src/live/scenarios.tsx` — import `declaredStylesScenario` and
   `textTruncationScenario`; add both entries; add them to `liveScenarios`
   after `grid`.
2. `apps/playground/src/scenarios/styles.tsx` — **comment only**: name the live
   twins and the one thing that stays headless (the authored-style report).
3. `COMPONENTS.md` — the measured-evidence table `states` and `truncation` rows
   gain `live-states` / `live-truncation`; the two narrative paragraphs gain a
   live sentence.
4. `apps/playground/README.md` — two rows in the live scenario table and the
   registry count.
5. `TODO.md` — add and tick the task; bump the workstream counter.
6. `.agents/slop/plans/README.md` — index this plan.
7. `PLAN.md` — `D72`.

## 5. Commands and expected results

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only live-states       # 1/1, exit 0
nub apps/playground/dist/live/run.js --only live-truncation   # 1/1, exit 0
nub apps/playground/dist/smoke/run.js --only declared-styles
nub apps/playground/dist/smoke/run.js --only text-truncation  # controls stay 1/1
nub run --filter playground test
nub run check
nub run lint
```

Run the two live ids three times each (the live suite's commit/timer variance).
Use `waitForBounds` when a hover/leave read races the commit.

## 6. STOP conditions

Stop and report rather than loosening a check if:

- a real `hover(testId)` does **not** apply the declared width — record it; the
  hover contract would be renderer-specific, which invalidates a core design
  decision (`PLAN.md` D13/D47);
- hovering the child leaves the parent at `420` — the per-element rule did not
  transfer; record the measured pair rather than asserting the headless one;
- a press at the centre enters hover (`140` instead of `180`) — a real press may
  move the pointer first; record the difference and split the check, do not
  accept a range that makes both states pass;
- a held move outside the element drops `active` — record it; the drag-start
  contract would differ from headless;
- `lineClamp` or `textOverflow` measures differently in a window — record the
  live numbers and keep the headless claim; do not delete the live check if the
  difference is a tolerance-sized reflow (text layout is shared and first-wins
  in both harnesses).

## 7. Test plan

Mutation proofs (apply, run the affected live id, restore; each must exit `1`):

- **M1 (states)** remove `hover: { width: 140 }` from `styles-button`: step 3
  stays `100`.
- **M2 (states)** change the child's `hover` width to `130`: step 5 reads `130`
  against `120`.
- **M3 (states)** remove `active: { width: 180 }` from `styles-button`: step 7
  stays `100`/`140`.
- **M4 (truncation)** remove `lineClamp: 2` from `clamp-2`: its height is no
  longer two lines.

The headless scenarios `declared-styles` and `text-truncation` are the controls
and must stay green.

## 8. Acceptance

- Both live scenarios are `1/1`, exit `0`, three consecutive runs each, with
  screenshots.
- The live registry grows by two (`57 → 59`); the headless registry stays `101`.
- M1–M4 fail in the documented direction and are restored.
- The headless controls stay `1/1`.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md`, the plan index and the playground
  README are current.
- `nub run --filter playground test`, `nub run check`, `nub run lint` pass.

## 9. Measured result

`nub run --filter playground build`, then three consecutive focused runs of
`--only live-states,live-truncation`:

```
ok  states      live-states      ~1.6 s  Live declared styles: hover and active applied by real pointer input
ok  truncation  live-truncation  ~0.2 s  Live text truncation: ellipsis, nowrap and line clamp
2/2 scenarios passed · capabilities: states=verified truncation=verified
```

**2/2 each run, exit `0`: `live-states` 32 checks, `live-truncation` 23
checks** (55 total), one screenshot each. The live registry is `57 → 59`; the
headless registry stays `101`.

### Measured facts

| Fact | Live result |
| ---- | ----------- |
| A real hover applies the declared width | `styles-button` `100 → 140` |
| Hover is per element | parent `420` / child `100`, then parent `400` / child `120` |
| Leave reverts both widths | `400` / `100` |
| A real press applies `active` | `180` |
| A press at a point does **not** enter hover | `100` after release |
| A held pointer outside the element keeps `active` | `180` until release |
| `textOverflow`/`nowrap` are one line, `lineClamp` is exact | one line; `52` = 2 × `26`, `78` = 3 × `26`, inherited box `52` |
| The shared layout rule transfers | `repeat-clamp == repeat-plain` and both are unclamped (`> 4` lines) |
| Painted text is the source run | a `trunc-line one two three…` run, no `…` glyph |

Everything the headless probe asserts about layout transferred to the window
unchanged. `paintedStyle` is the one headless-only channel (the live tree has no
`style`), so the authored-colour check stays in `declared-styles`.

### Mutation proofs (applied, run, restored; exit `1`)

| Lever | Observed failure |
| ----- | ---------------- |
| **M1** remove `hover: { width: 140 }` from `styles-button` | `a live hover applies the declared width: expected 140 ± 1, got 100` |
| **M2** change the child's hover width to `130` | `a live hover on the child applies its own width: expected 120 ± 1, got 130` |
| **M3** remove `active: { width: 180 }` | `a live press applies the active width: expected 180 ± 1, got 100` |
| **M4** remove `lineClamp: 2` from `clamp-2` | `live lineClamp 2 clamps to two lines: expected 52 ± 1, got 364` |

The headless controls `declared-styles` and `text-truncation` stay green.

**Transferable finding:** declared hover/active is a runtime property, not a
`TestRenderer` artefact — a real pointer applies and reverts it per element, a
real press applies `active` without hover, and a held move keeps it. Text
truncation and the shared `(string, width)` layout are likewise identical in a
window, so a component may rely on both without a live caveat.
