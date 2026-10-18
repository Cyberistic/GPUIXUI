# 379 — A left-side select list is capped by the room on its *right*

| | |
| --- | --- |
| Phase | F (integration and polish) |
| Workstream | primitives |
| Depends on | 020, 030, 041, 047, 057, 062, 066, 068, 075, 098, 203, 335, 336, 368 |
| Status | done |

## 0. The bug, measured

`Select` caps its list width so a 200-character option cannot paint a 1482 px
layer in a 1280 px window (plan `368`). The cap is computed once, from the
trigger's **left** edge, whichever side the list opens on:

```ts
maxWidth: Math.max(
  0,
  viewport.width -
    (triggerBox === undefined ? FLOATING_MARGIN : triggerBox.left) -
    FLOATING_MARGIN,
),
```

That subtraction is the room to the **right** of the trigger's left edge. It is
right for a list above/below the trigger (its left edge is the trigger's) and
for a list on the right side. It is wrong for a list on the **left** side: that
list ends at the trigger, so its room runs from the window's left margin to the
trigger's left edge.

Measured on this host, GPUix 0.10.0, with a throwaway probe (deleted after the
measurement): a right-aligned trigger at `x 1044..1112` in a 1280 px window, one
option with a 76-character label, `side="left"`:

| Frame | Result |
| ----- | ------ |
| trigger | `x 1044, width 68` |
| list | `x 816, width **228**` |

The list opened on the left (`816 + 228 = 1044`), where **1036 px** were free,
but painted only `1280 − 1044 − 8 = 228` wide because the cap took the room on
the right. The label truncated inside a third of the space its side offered.

## 1. The rule

The width cap belongs to the **resolved side**, the same way `availableOn`
already computes the height cap per side (plan `098`):

| Resolved side | Usable width |
| ------------- | ------------ |
| `left` | `triggerLeft − margin` |
| `right` | `viewportWidth − triggerRight − margin` |
| `top` / `bottom` | `viewportWidth − triggerLeft − margin` |

One exported helper in `core/floating.ts` owns the subtraction, so the side
decision (`decideHorizontalSide`, which uses `triggerLeft − margin` and
`viewportWidth − triggerRight − margin`) and the cap cannot drift.

## 2. Exact changes

All paths are under `packages/primitives/`.

### 2.1 `src/core/floating.ts`

Beside `availableOn`, add:

```ts
/** The pixels a layer can use on its own horizontal axis, on `side`. */
export const availableWidth = (
  request: Pick<
    HorizontalPlacementRequest,
    "triggerLeft" | "triggerRight" | "viewportWidth" | "margin"
  >,
  side: LayerSide,
): number =>
  side === "left"
    ? request.triggerLeft - request.margin
    : side === "right"
      ? request.viewportWidth - request.margin - request.triggerRight
      : request.viewportWidth - request.margin - request.triggerLeft;
```

### 2.2 `src/components/Select.tsx`

Import `availableWidth`. Replace the `maxWidth` expression with:

```ts
maxWidth:
  triggerBox === undefined
    ? viewport.width - 2 * FLOATING_MARGIN
    : Math.max(
        0,
        availableWidth(
          {
            triggerLeft: triggerBox.left,
            triggerRight: triggerBox.right,
            viewportWidth: viewport.width,
            margin: FLOATING_MARGIN,
          },
          Option.getOrElse(side, () => "bottom"),
        ),
      ),
```

Update `selectContentStyle`'s docstring (the `maxWidth` sentence) to say the cap
is the room on the **resolved side**, and the module docstring's paragraph about
a horizontal list if it claims the width rule.

### 2.3 `docs/select.mdx`

1. Under the placement/size prose, name the rule: a list on the left side is
   capped to the room between the window margin and the trigger, not to the room
   on the right.
2. Verification: add the core and runtime cases from §3.

### 2.4 `COMPONENTS.md`

In the **Selects** row, append: the list's `maxWidth` is the room on the
**resolved side**, so a `side="left"` list on a right-aligned trigger uses the
left half instead of the few pixels on the right (plan `379`).

### 2.5 `TODO.md`

Add a ticked row under the primitives workstream with the measured counts;
raise the counter by one (`123/123` → `124/124`).

### 2.6 `.agents/slop/plans/README.md`

Add the `379` row to the primitives table, status `done` with the measured
counts and both directions.

## 3. Test plan

### 3.1 Core — `src/core/floating.test.ts`

- `availableWidth` on `left` is `triggerLeft − margin`; on `right` it is
  `viewportWidth − triggerRight − margin`; on `top`/`bottom` it is
  `viewportWidth − triggerLeft − margin`.
- The discriminating case: a right-aligned trigger (`left 1044`, `right 1112`,
  window 1280, margin 8) gives `1036` on the left and `160` on the right, and
  `228` above/below.

### 3.2 Runtime — `runtime/fields.runtime.test.tsx`

New case beside "opens a left-side Select list on the right when the left edge
has no room":

- A row `width: 1100, justifyContent: "flex-end"` holding a `Select` with
  `side="left"` and one 76-character option. Open it. The list's right edge is
  ≤ the trigger's left edge (it opened left) **and** its width is `> 300` — the
  measurement above shows the old direction gave 228. No magic: the free space
  is 1036, and the option's natural width is around 500.

### 3.3 Both directions

Revert `maxWidth` to the old subtraction and run the runtime case: it fails with
`expected 213 to be greater than 300` (the window's scale decides the last few
pixels; the run measured 213, the first probe 228). Revert `availableWidth`'s `left` branch to
the top/bottom formula and the core case fails on the expected `1036`. Restore
and both pass. Record both mutation outcomes in §6.

## 4. Commands and expected results

```sh
cd packages/primitives
nub run test                 # 46 files, 668 → 669 tests, green
nub run check-types          # no output
nub run test:runtime runtime/fields.runtime.test.tsx -t "uses the room on a left-side list's own side"  # green (scoped)
```

From the repo root:

```sh
nub run check                # green
nub run lint                 # green
nub run test                 # green
```

## 5. STOP conditions

- **The list still paints 228 after the fix.** The runtime is applying its own
  cap we do not know about; stop and re-measure rather than widening the surface
  elsewhere.
- **The list no longer opens on the left at all.** The side decision is using
  the new width in a way that changes `decideHorizontalSide`; stop — the helper
  is a cap, not an input to the decision.
- **A top/bottom or right-side list changes width.** The helper must be inert
  there; stop and re-plan.
- **The natural width of the test label is below 300 in the pinned font.** Stop
  and measure the label's painted width first; do not lower the threshold until
  the number is understood.

## 6. Measured results

Implemented and run on this host, 2026-10-18:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **46 files, 669 tests**, green (668 before) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| `nub run --filter @gpuixui/primitives test:runtime runtime/fields.runtime.test.tsx -t "uses the room on a left-side list's own side"` | **1 passed**, green (scoped) |
| `nub run check` | green |
| `nub run lint` | green |

Environment note: the **full** live suite could not be re-run green in this
session. With no other worktree running a suite, the first 14 files pass and the
remaining 19 fail together on focus- and window-dependent cases (activation,
rings, hit-tested clicks); the activation file alone then passes **81/81**, and
the same tree was **618/618** green at 21:25 before those runs. The host appears
to accumulate native window resources across suite invocations (the swarm runs
many suites in this session), which is why a full run now degrades partway. The
new case passes in isolation, and no failure is in `floating.ts`, `Select`'s new
cap, or the new case. The **baseline commit `f05c7302`** (before plans 378 and
379) was checked out and run afterwards and reproduces the same failure shape —
19 files, 109 tests, the same focus-dependent files — so the degradation is the
host, not these changes. Re-run the full suite from a fresh desktop session
before merging.

Mutation directions:

| Mutation | Failing case | Failure |
| -------- | ------------ | ------- |
| `maxWidth` reverted to the old left-edge subtraction | runtime "uses the room on a left-side list's own side" | `expected 213 to be greater than 300` |
| `availableWidth`'s `left` branch uses the top/bottom formula | core "measures the room on the side the layer opens" | `expected 228 to be 1036` |

## 7. Acceptance

1. `Select`'s width cap is derived from the resolved side through one exported
   helper.
2. The core and runtime cases fail without the fix and pass with it.
3. `docs/select.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index record it.
4. Every package and repo gate is green.
