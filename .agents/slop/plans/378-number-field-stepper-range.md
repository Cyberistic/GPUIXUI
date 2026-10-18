# 378 — A number field's pointer steppers ignore the swapped range

| | |
| --- | --- |
| Phase | F (integration and polish) |
| Workstream | primitives |
| Depends on | 030, 041, 047, 054, 077, 338, 339, 362, 371 |
| Status | done |

## 0. The bug, measured

`NumberField` bounds are **made total before they reach the paint**
(`core/number.ts` `normalizeNumberRange`): a non-finite bound is absent on that
side, and an inverted pair is swapped, which is the rule every slider and meter
already follows (plans `371`, `362`). `docs/number-field.mdx` says so explicitly
("an inverted pair is swapped, the rule every slider and meter follows") and
`runtime/nonsense-numbers.runtime.test.tsx` proves the **keyboard** steps the
swapped range (`min={100} max={0}` reports `99` then `100`).

The two pointer steppers do not follow that range. They are blocked by two
comparisons against the **raw** props:

```ts
const atMin = props.min !== undefined && current <= props.min;
const atMax = props.max !== undefined && current >= props.max;
```

`current` was already clamped into the normalised range, so with
`min={100} max={0}` every painted value satisfies both comparisons
(`current <= 100` and `current >= 0`). Both steppers therefore paint blocked
(`cursor: "not-allowed"`, no `hover`/`active` rule) and both refuse the press.

Measured on this host, GPUix 0.10.0, with a throwaway probe (deleted after the
measurement): a `<NumberField min={100} max={0} defaultValue={50}>` clicked on
its up stepper reported **no value at all** (`[]`), because the stepper returned
before `onValue` — while the field's own keyboard contract steps the same range
(`core/number.test.ts` and the runtime suite both assert it).

The same defect shows at the swapped range's real ends: at `0` the **up** stepper
is blocked (0 is the minimum; up must be live) and at `100` the **down** stepper
is blocked (100 is the maximum; down must be live).

## 1. The rule

The stepper's blocked state is a property of the **range the field acts on**, not
of the strings the caller passed. One line each:

```ts
const atMin = range.min !== undefined && current <= range.min;
const atMax = range.max !== undefined && current >= range.max;
```

`range` is already computed at the top of `renderNumberField`
(`const range = numberRange(props);`), so no new helper is introduced and no other
part of the field moves.

## 2. Exact changes

All paths are under `packages/primitives/`.

### 2.1 `src/components/NumberField.tsx`

Replace lines 165–166 (the raw-bound comparisons) with the normalised-range
comparisons from §1. Update the docstring at the top of the file only if it
claims the stepper contract (it says the steppers exist and are not tab stops;
add "the two spin buttons read the same normalised range as the keys" to the
existing "The bound is the field's, not the edit's" paragraph).

### 2.2 `docs/number-field.mdx`

1. §Bounds, after "an inverted pair is swapped, the rule every slider and meter
   follows": add one sentence — the two spin buttons read that same normalised
   range, so in `min={100} max={0}` the up button is live and the down button is
   blocked at `0` (and the reverse at `100`).
2. §Verification: add the element-tree and runtime cases from §3 below.

### 2.3 `COMPONENTS.md`

In the **Number Field** row, append: the pointer steppers now resolve their
blocked state from the normalised range, so an inverted pair leaves the same
steppers live as the arrow keys (plan `378`).

### 2.4 `TODO.md`

Add a ticked row under the primitives workstream with the measured counts;
raise the workstream counter by one (currently `122/122`).

### 2.5 `.agents/slop/plans/README.md`

Add the `378` row to the `primitives, icons and Tier 1 (block 020–049)` table,
status `done — …` with the measured counts and both directions.

## 3. Test plan

### 3.1 Element tree — `src/components/NumberField.test.tsx`

New case beside "steps from the spin buttons and refuses past a bound":

- `render({ min: 100, max: 0 }, 50, "50")`: the up handler reports `51` and the
  down handler reports `49` (before the fix: neither reports anything).
- `render({ min: 100, max: 0 }, 0, "0")`: the up handler reports `1`; the down
  handler reports nothing, and its style has `cursor: "not-allowed"` with no
  `hover`; the up style has `cursor: "pointer"` and a `hover` rule. Before the
  fix both are `not-allowed`, so the enabled half fails too.
- `render({ min: 100, max: 0 }, 100, "100")`: the down handler reports `99`; up
  reports nothing.

Helper note: `partsOf` returns `{ input, up, down }`; use `hostStyleRecord` for
the paint assertions (already imported in the file).

### 3.2 Runtime — `runtime/number-field.runtime.test.tsx`

New case beside "steps from a hit-tested click on the spin column":

- `<NumberField testId="nf" min={100} max={0} defaultValue={50} />`: a hit-tested
  click at `box.x + box.width - 8, box.y + box.height * 0.25` (the up stepper)
  reports `51`; a click at `0.75` (the down stepper) reports `50` (the field now
  holds `51`, and the point is that the button is live at all).
- The same field with `defaultValue={0}`: the up click reports `1`; the down
  click reports nothing.

### 3.3 Both directions

Revert `atMin`/`atMax` to the raw props and run the two suites: the new element
case fails on `onValue` (0 calls) **and** on the up stepper's `cursor`; the new
runtime case fails on `lastValue` (`the field reported no change at all`).
Restore the fix and both pass. Record both mutation outcomes in §6.

## 4. Commands and expected results

```sh
cd packages/primitives
nub run test                 # 46 files, 667 → 668 tests, green
nub run check-types          # no output
nub run test:runtime         # 33 files, 618 → 619 tests, green
```

From the repo root:

```sh
nub run check                # green
nub run lint                 # green
nub run test                 # green
```

Expected: every command exits `0`; the offline and runtime totals each rise by
one; no existing case changes.

## 5. STOP conditions

- **The probe reports a value before the fix.** The bug is not present on this
  tree; stop and re-measure rather than changing correct code.
- **A normal-bounds stepper case changes.** The fix must be inert for
  `min <= max`; if it is not, stop and re-plan — the normalised range is wrong
  somewhere else.
- **`range.min`/`range.max` cannot express the bound** (e.g. a helper type mismatch).
  Stop; do not widen `NumberRange` in this plan.
- **The runtime click hits the wrong stepper** because the field's box or padding
  moved. Stop and record the geometry; do not add a magic offset.

## 6. Measured results

Implemented and run on this host, 2026-10-18:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **46 files, 668 tests**, green (667 before) |
| `nub run --filter @gpuixui/primitives test:runtime` | **33 files, 619 tests**, green (618 before) |
| `nub run check` | green |
| `nub run lint` | green |

Mutation directions:

| Mutation | Failing case | Failure |
| -------- | ------------ | ------- |
| `atMin`/`atMax` reverted to the raw props | element "steps its spin buttons inside a swapped range" | `expected "vi.fn()" to be called with arguments: [ 51 ]` (the up stepper refused) |
| the same reverted | runtime "steps the swapped range from a hit-tested spin click" | `AssertionError: the field reported no change at all` |

## 7. Acceptance

1. The steppers' blocked state is derived from the normalised range.
2. The element-tree and runtime cases fail without the fix and pass with it.
3. `docs/number-field.mdx` states the stepper rule; `COMPONENTS.md`, `TODO.md`
   and the plan index record the fix.
4. Every package and repo gate is green.
