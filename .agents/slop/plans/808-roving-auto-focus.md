# 808 — `autoFocus` on the roving composites

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `041`, `054`, `056`, `065`, `079`, `089`, `093`, `332`, `345`, `583`, `584`, `590`, `603`, `786`, `799`, `800`, `804`, `806`, `807` |
| Status | done |

Self-contained: §0 the measured gap, §1 the decision, §2 the rule, §3 the files,
§4 commands and expected results, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan

### 0.1 The gap

`autoFocus` is the library's contract for "this is where the keyboard starts".
Plan `584` proved it for the four text fields, plan `806` for `Select` (the one
field whose host is a `div`), and plan `807` for the three pressable controls
that own exactly one focusable root (`Checkbox`, `Switch`, `Toggle`). The
**roving composites** still have no such prop:

| Control | `autoFocus` | Which element owns the tab stop |
| ------- | ----------- | ------------------------------- |
| `RadioGroup` | **no** | the option at the value-derived `activeIndex` (`tabIndex 0`) |
| `CheckboxGroup` | **no** | **every** enabled row is its own tab stop (D27) |
| `ToggleGroup` | **no** | the value-derived `activeIndex`; read-only follows the ring (plan `804`) |
| `Rating` | **no** | the value's star (`ratingTabStop`), star 1 when unrated (plan `800`) |
| `Slider` | **no** | the track root (`role="slider"`, `tabIndex 0`) |
| `RangeSlider` | **no** | both thumbs are tab stops; the start thumb is the entry point |

A settings dialog whose first control is a radio group, a review form whose
first control is a rating, or a workspace that opens on a slider cannot put the
keyboard there without a Tab. Plan `807` deliberately scoped these six parts
out because the decision is *which item* receives the focus, and recorded it as
a `TODO.md` follow-up rather than guessing.

### 0.2 What must not change

- the **item rule**: the element that already carries `tabIndex={0}` is the one
  that may carry `autoFocus`, so the tab order and the entry point cannot
  disagree;
- the disabled rule: a disabled control is out of the tab order and paints no
  ring (plans `089`, `332`); a disabled composite never focuses;
- the read-only rule: a read-only control keeps its tab stop, name, announced
  value and ring (plans `786`, `799`, `800`, `802`, `804`), so it still takes
  `autoFocus`;
- `CheckboxGroup`'s platform contract: **each row is its own tab stop** (D27),
  so "the group's one stop" is the first *enabled* row, not a selected one;
- the ring stays the tracker's: plan `806`/`807` measured that a seeded
  `useFocus` changed nothing and dropped it, so no focus seed ships unless a
  case fails without it;
- focus is not activation: mounting a focused composite must report no value
  change.

### 0.3 The one fact to measure

Plan `806` measured that a focusable `div` honours the host `autoFocus` on a
later mount. The composites add one wrinkle — the focused host is one item
inside a group that also renders a root with handlers — so the plan **measures**
that the tab-stop item still takes native focus, and that the tracker's sample
names it (the ring). If it does not, §6 applies: that part documents the limit
instead of shipping a dead prop.

## 1. The decision

**Add `autoFocus?: boolean` to `RadioGroup`, `CheckboxGroup`, `ToggleGroup`,
`Rating`, `Slider` and `RangeSlider`**, forwarded to the element that already
owns the tab stop, with one per-part rule for *which* element that is:

| Part | The element that takes focus |
| ---- | ---------------------------- |
| `RadioGroup` | the enabled option at `activeIndex` (the selected one, else the first enabled) |
| `CheckboxGroup` | the **first enabled row** — the select-all parent when it exists and is enabled, else the first enabled option |
| `ToggleGroup` | the item at the tab stop (`activeIndex`; read-only follows the ring) |
| `Rating` | the star at `ratingTabStop(value, max)` |
| `Slider` | the track root |
| `RangeSlider` | the **start** thumb |

Why not one generic "first focusable descendant" helper: the choice of entry
point *is* the component's keyboard contract (the radio group enters on the
selection, the rating on its value, the range slider on its start), and a helper
would have to be told all six rules anyway. Each renderer already computes its
stop for `tabIndex`, so the prop rides that exact expression — one source of
truth per part.

Why not `Button`/`IconButton`: unchanged from plan `807` — an action is not a
place the surface opened *for*.

## 2. The rule

| State | `autoFocus` |
| ----- | ----------- |
| interactive | the tab-stop host takes native focus on mount (including a later mount); the ring follows the tracker |
| `readOnly` | the same — the review state keeps its stop and ring |
| `disabled` | **nothing**: no host carries the prop, and the control is out of the tab order anyway |
| absent | no change |

A mount-time request only: the prop does not re-assert focus on every render.
A controlled value that changes after mount does not move focus.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/RadioGroup.tsx` | `RadioGroupProps.autoFocus` (JSDoc as in §2); the option at `activeIndex` gets `autoFocus={props.disabled === true ? undefined : props.autoFocus}` |
| `packages/primitives/src/components/CheckboxGroup.tsx` | `CheckboxGroupProps.autoFocus`; `RowSpec.autoFocus`; `renderRow`'s root gates it on `disabled`; the first enabled row (parent first) carries it |
| `packages/primitives/src/components/ToggleGroup.tsx` | `ToggleGroupBase.autoFocus`; the item at `stopIndex` carries it, gated on its own and the group's disablement |
| `packages/primitives/src/components/Rating.tsx` | `RatingProps.autoFocus`; the star at `tabStop` carries it while `focusable` |
| `packages/primitives/src/components/Slider.tsx` | `SliderProps.autoFocus` on the track root; `RangeSliderProps.autoFocus` on the start thumb; gated on `disabled` |
| `src/components/selection.test.tsx` / `ToggleGroup.test.tsx` / `Rating.test.tsx` / `Slider.test.tsx` | one element-tree case per part: the tab-stop host carries the prop, a disabled one does not, a read-only one still does |
| `packages/primitives/runtime/auto-focus.runtime.test.tsx` | six rows in the plan-584 matrix, one per part, each reading the renderer's focused id; disabled and read-only halves where the part supports them |
| `packages/primitives/docs/{radio-group,checkbox-group,toggle-group,rating,slider,range-slider}.mdx` | an `autoFocus` API row and a sentence naming the entry item |
| `COMPONENTS.md` | the six rows record the prop and its cases |
| `TODO.md` | the roving-`autoFocus` row ticked |
| `PLAN.md` | decision row `D58`: `autoFocus` on a roving composite lands on its tab-stop item |
| `.agents/slop/plans/README.md` | this plan indexed |

No other package is touched.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/primitives check-types          # exit 0
nub run --filter @gpuixui/primitives test                 # 75 files / 1072 tests, exit 0
nub run --filter @gpuixui/primitives test:runtime runtime/auto-focus.runtime.test.tsx
# 1 file, 20 existing + 18 new tests, exit 0
nub run --filter @gpuixui/primitives test:runtime runtime/tab-order.runtime.test.tsx \
  runtime/focus-ring.runtime.test.tsx runtime/selection-read-only.runtime.test.tsx \
  runtime/slider-read-only.runtime.test.tsx runtime/toggle-read-only.runtime.test.tsx
# the tab, ring and review-state matrices for the six parts; expect green
nub run lint                                                # exit 0
nub run fmt                                                 # primitives paths clean
```

The full `test:runtime` run is the merge gate, not this plan's gate.

## 5. Test plan

Each case names the bug it guards in its header comment.

### Element tree

1. **`RadioGroup`** — with `autoFocus`, exactly the option at `activeIndex`
   carries the host prop; with `disabled`, none does; `readOnly` keeps it.
2. **`CheckboxGroup`** — with `autoFocus` and a `selectAll`, the parent row
   carries it; without `selectAll`, the first enabled option does (a disabled
   first option is skipped); a disabled group carries none.
3. **`ToggleGroup`** — the item at the tab stop carries it; a read-only group
   keeps it on the same stop; a disabled group carries none.
4. **`Rating`** — the star at `ratingTabStop` carries it (star 1 unrated, the
   value's star when rated); a disabled rating carries none; read-only keeps it.
5. **`Slider`** — the track root carries it; a disabled slider does not; a
   read-only slider does.
6. **`RangeSlider`** — only the **start** thumb carries it; disabled none;
   read-only both thumbs stay tab stops and the start still carries it.

### Runtime (`runtime/auto-focus.runtime.test.tsx`)

7. **`RadioGroup`** mounts after the first render and focuses the option at the
   value (and reports no change); unvalued, it enters on the first enabled one.
8. **`CheckboxGroup`** focuses the first enabled row (the parent when present).
9. **`ToggleGroup`** focuses the selected item in `single`.
10. **`Rating`** focuses the value's star; unrated, star 1.
11. **`Slider`** focuses the track root.
12. **`RangeSlider`** focuses the start thumb.
13. **disabled** — each of the six reports `focused() === "none"`.
14. **read-only** — each keeps its stop and focuses (the review state rule).

### Two-direction proof (each mutation reverted after it fails)

- Remove one part's `autoFocus` forward → that part's runtime case fails with
  `"none"` and its element case fails.
- Drop one part's `disabled` gate → the disabled runtime row and the element
  disabled case fail.
- Gate one part on `readOnly` → its read-only runtime row fails.
- Aim `RangeSlider`'s prop at the end thumb → the start-thumb cases fail by
  focused id.
- If a first-frame ring assertion is added, removing the tracker wiring must
  fail it; if it passes without a seed, no seed ships (the plan-806 finding).

## 6. STOP conditions

Stop and report with the measured evidence instead of improvising if:

- the runtime does **not** focus a composite's tab-stop host through the host
  `autoFocus` (then that part ships no prop, its page records the measured
  limit, and the plan lists which of the six behave differently);
- focusing a composite on mount changes its value or dispatches an activation
  (focus is not activation — if it does, stop);
- a contract/docs guard rejects the change because a page does not name the
  prop — fix the page, never relax the guard;
- `CheckboxGroup`'s "first enabled row" needs a second tab-stop change to make
  the entry point reachable (the row contract is D27; do not change it here);
- the change would require editing another workstream's paths — record it in
  `TODO.md` instead.

## 7. Outcome

Measured 2026-10-21 in this worktree (release-tag binding):

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run --filter @gpuixui/primitives test` | 75 files / **1072 tests** green (was 1066; +6 element cases) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/auto-focus.runtime.test.tsx` | 1 file / **38 tests** green (was 20; +18 composite rows) |
| scoped ring/tab/review matrices | green (see §7.1) |
| `nub run lint` / `nub run fmt` | exit 0 / primitives paths clean |

### 7.1 The measured entry item

Each composite's own `tabIndex` expression decides the entry element, so the
paint and the tab order cannot disagree:

| Part | Focused id after a later mount |
| ---- | ------------------------------ |
| `RadioGroup` (`defaultValue="b"`) | `rg-b` |
| `CheckboxGroup` (with `selectAll`) | `cg-all` |
| `ToggleGroup` (`defaultValue="centre"`) | `tg-centre` |
| `Rating` (`defaultValue={3}`) | `rating-star-3` |
| `Slider` | `slider` |
| `RangeSlider` | `range-thumb-start` |

No `useFocus` seed ships: as in plans `806`/`807`, the tracker paints the ring
and no case failed without a seed. A disabled composite reports `"none"`; a
read-only one focuses its stop and reports no value change.

### 7.2 Two-direction proof (each mutation reverted after it failed)

| Mutation | Failures |
| -------- | -------- |
| `RadioGroup`'s forward removed | runtime `focuses a RadioGroup's rg-b…` and `focuses a read-only RadioGroup` (2); element `carries autoFocus on the option its tab stop is on…` |
| `CheckboxGroup`'s **both** disabled gates removed (the group-level `Option.none()` and the row's `disabled ? undefined`) | runtime `does not focus a disabled CheckboxGroup`; element `carries autoFocus on the first enabled row…`. Either gate alone masks the other, so the disabled rule is deliberately over-determined |
| `ToggleGroup` gated on `readOnly` too | runtime `focuses a read-only ToggleGroup`; element `carries autoFocus on the item at its tab stop…` |
| `RangeSlider` aimed at the end thumb | runtime `focuses a RangeSlider's range-thumb-start…` and `focuses a read-only RangeSlider` (2); element `carries autoFocus on the start thumb only…` |

## 8. Acceptance

- All six roving composites take `autoFocus`; the element that already owns the
  tab stop takes native focus on mount (including a later mount) and rings; a
  disabled composite never focuses; a read-only one still does; mounting
  reports no value change.
- The six pages document the prop and name the entry item; the inventory,
  `TODO.md`, `PLAN.md` (`D58`) and the plan index are current.
- `check-types`, `test`, the `auto-focus` matrix, the scoped tab/ring/review
  matrices, `lint` and `fmt` are green, with exact commands and totals recorded.
