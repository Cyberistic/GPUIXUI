# 756 — Declared opacity, in the frame: the disabled state and its subtree

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | F (native evidence) |
| Owner | playground workstream |
| Depends on | `335`, `557`, `674`, `690`, `701`, `713`, `715`, `736`, `745`, `754`, `755` |
| Feeds | the `states` capability row; cross-team guidance for every component that declares `opacity: disabled ? 0.5 : 1` |

## 1. Goal and the bug being guarded

Eleven shipped surfaces express **disabled** as nothing but
`opacity: disabled ? 0.5 : 1` — `list.tsx`, `tabs.tsx`, `accordion.tsx`,
`menu/item.tsx`, `context-menu.tsx`, `combobox.tsx` (row and trigger),
`search-input.tsx`, `time-picker.tsx`, `inline-edit.tsx`,
`hotkey-recorder.tsx`. The suite proves those surfaces are *inert* (no
activation, out of the tab order, `cursor: not-allowed`) and that the authored
style report carries `0.5`, but **no check ever reads the frame**. So a runtime
that accepted `opacity` and dropped it would leave every disabled control
looking enabled, and nothing would fail.

Plan `754` closed the same gap for `hover`/`active` colours. This plan closes it
for opacity, and answers the question a component author actually depends on:
**does an element's opacity dim its whole subtree, or only its own fill?** A
row that dims its background but paints its label and icon at full strength
looks broken in a different way, and the current records say nothing.

The contract this probe asserts:

- an opaque box paints its token exactly;
- `opacity: 0.5` paints the straight sRGB blend of its fill over what is behind
  it (`Pixels.blendOver`), the same rule plan `701` measured for washes;
- a child of a half-opacity box is dimmed **with** it (the subtree claim);
- nested opacities **multiply** (`0.5 × 0.5 = 0.25`), so a disabled row inside a
  dimmed panel is not double-dimmed by surprise.

If the frame disproves the subtree or the multiplicative claim, the executor
records the measured rule as a named limit with cross-team guidance (the
plan-`156` `align="center"` precedent) instead of weakening a check silently.

## 2. Files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/opacity-pixels.ts` | **create** — the pure model: `DISABLED_OPACITY`, the fixture roles from the theme, `opacityBlend`, the distinctness guard |
| `apps/playground/src/scenarios/opacity-pixels.test.ts` | **create** — unit tests for the model (see §5) |
| `apps/playground/src/scenarios/opacity.tsx` | **create** — the view, `opacityScenario` and `opacityLiveScenario` |
| `apps/playground/src/scenarios/index.ts` | register `opacityScenario` in the headless registry |
| `apps/playground/src/live/scenarios.tsx` | import `opacityLiveScenario` and append it to the live array |
| `apps/playground/README.md` | add the `opacity-pixels` / `live-opacity-pixels` row to the live-scenario table and the evidence paragraph |
| `COMPONENTS.md` | `states` row gains the two ids; the suite totals move to 111/111 and 100/100 |
| `TODO.md` | tick this task under the playground workstream |
| `.agents/slop/plans/README.md` | this plan's row, status **landed** |
| cross-team `TODO.md` row | components must not repaint a disabled child at full strength; evidence = this plan |

Do not touch `packages/*` source: the probe measures the runtime and the
declarations, it does not fix them.

## 3. The fixtures (one stage, one frame)

Everything is static, so both hosts capture **one** frame — the cheapest pixel
scenario in the suite.

Stage: `background`, `640 × 360`, `position: "relative"`.

| testId | fill | opacity | what it proves |
| ------ | ---- | ------- | -------------- |
| `op-rest` | `primary` | 1 | the token reaches the frame unchanged |
| `op-half` | `primary` | `DISABLED_OPACITY` (0.5) | disabled dims its own fill |
| `op-away` | `card` | 1 | a neighbour is untouched (the sample is not a stage accident) |
| `op-parent` | `card` | 0.5 | the dimmed surface |
| `op-child` | `success` | 1 | **inside** `op-parent`: is it dimmed with the parent? |
| `op-nested` | `card` | 0.5 | the outer half |
| `op-nested-child` | `primary` | 0.5 | **inside** `op-nested`: do the two opacities multiply? |

Boxes are `140 × 64`, laid out absolutely at fixed offsets so a sample is the
box centre and never an edge (the plan-`745` border lesson). `op-child` is
`80 × 64` inside `op-parent`, `op-nested-child` is `80 × 64` inside
`op-nested`, and the child's centre is the sample.

## 4. Pure model (`opacity-pixels.ts`)

```ts
export const DISABLED_OPACITY = 0.5;

export const opacityBlend = (fill: Rgba, opacity: number, under: Rgba): Rgba =>
  Pixels.blendOver(fill, opacity, under);

export interface OpacityFixtures { readonly rest, half, away, parent, child, nested, nestedChild: string }
export const opacityFixtures = (colors: ThemeColors): OpacityFixtures => ({...});
export const nestedOpacity = (outer: number, inner: number): number => outer * inner;
export const subtreeExpectation = (child: string, parentOpacity: number, under: string): Rgba;
export const distinguishable = (left: Rgba, right: Rgba, tolerance: number): boolean;
```

The fixtures use roles far apart on the ramp (`background #11141A`,
`card #191D25`, `primary #A7A9FF`, `success #3BC97F`), and the module exposes the
**guards** the scenario runs before sampling:

1. every fill role is distinct;
2. the half-opacity expectation is farther from the full fill than the frame
   tolerance (otherwise "dims its fill" cannot fail);
3. the subtree expectation is farther from the undimmed child than the
   tolerance (otherwise the subtree claim cannot fail);
4. the nested expectation is farther from a single 0.5 than the tolerance
   (otherwise "multiplies" cannot fail).

Guard 3 is the one that keeps the load-bearing claim honest; a fixture edit that
puts the child on a role close to its parent's blend must fail by name.

## 5. Checks (identical in both hosts)

Preconditions (5):

1. `the fill roles are distinguishable`
2. `a half-opacity fill is distinguishable from the full fill`
3. `a dimmed child is distinguishable from an undimmed child`
4. `a doubled opacity is distinguishable from a single one`
5. `the frame's device scale is an integer` (`Pixels.frameScale`)

Frame (6):

6. `an opaque box paints its token` — `op-rest` = `primary`
7. `a disabled fill is half its colour` — `op-half` = `blend(primary, 0.5, background)`
8. `the dimmed fill leaves its neighbour alone` — `op-away` = `card`
9. `the stage is the background token` — a stage point away from every box
10. `a child is dimmed with its parent` — `op-child` = `blend(success, 0.5, background)`
11. `nested opacities multiply` — `op-nested-child` = `blend(primary, 0.25, background)`

11 checks per host. If the measurement disproves 10 or 11, replace the check
with the measured rule, keep the guard (it must still fail on a wrong value),
and add the finding to §8 and to `COMPONENTS.md`.

## 6. Unit tests (`opacity-pixels.test.ts`, meaningful and able to fail)

1. `opacityBlend` at `1` returns the fill; at `0` returns the under colour;
   at `0.5` returns the exact channel mix (assert the numbers for
   `#A7A9FF` over `#11141A`).
2. `nestedOpacity(0.5, 0.5)` is `0.25`; `(1, 0.5)` and `(0.5, 1)` are `0.5`.
3. `subtreeExpectation` differs from the child's own fill (guard 3's arithmetic).
4. `distinguishable` is false inside the tolerance and true outside it.

Each test must fail if the implementation is inverted (blend arguments
reversed) or if the nesting is made additive — state that in the header comment.

## 7. Commands and expected results

```sh
nub run --filter playground build                      # exit 0
nub apps/playground/dist/smoke/run.js --list | wc -l   # 111
nub apps/playground/dist/smoke/run.js --only opacity-pixels
# expected: 1/1, exit 0, 11 checks
nub run --filter playground test                       # playground 508 -> 512 tests
nub apps/playground/dist/live/run.js --only live-opacity-pixels
# expected: 1/1, exit 0, 11 checks, one window
nub apps/playground/dist/smoke/run.js                  # end-of-task: 111/111, exit 0
nub run check && nub run lint && nub run test
```

## 8. Mutation proofs (observed, then reverted)

- **M1** — drop `opacity` from `op-half`: check 7 must fail with
  `expected #575eafff, got #a7a9ffff` (the exact blend is read from the run).
- **M2** — drop `opacity` from `op-parent`: check 10 must fail with the
  undimmed `success` (`#3bc97fff`).
- **M3** — set `op-nested-child`'s opacity to `1`: check 11 must fail with the
  single-0.5 blend.
- **M4** — swap the `blendOver` arguments in `opacityBlend`: unit test 1 fails.
- **M5** — make `nestedOpacity` additive: unit test 2 fails.

Record the actual failure strings in §8; if any mutation **passes**, that check
is not load-bearing and must be replaced, not kept.

## 9. STOP conditions

- A fixture's painted box is missing or its centre is on another box: stop and
  fix the layout; never move the sample to make a check pass.
- The frame reports a non-integer device scale: stop; the capture contract is
  broken (plan `674`).
- Opacity paints nothing at all (`op-half` = `primary`): this is a real runtime
  finding. Stop, record it, and do **not** register a scenario that asserts the
  intended rule; write the limitation with evidence instead.
- The subtree or nesting claim is disproved: keep the probe, assert the measured
  rule, and add the cross-team row. Do not delete the fixture.
- `--only` exits `2`: no binding on this host; this is not evidence.

## 10. Acceptance

- 11 checks green in both hosts, focused, twice each.
- Unit tests green; playground total is **512**.
- The full headless registry is **111/111**, live registry **100**.
- Five mutation proofs observed and reverted (§8).
- Ledgers, plan index, `COMPONENTS.md` `states` row and the cross-team row
  updated; nothing in `packages/*` changed.

## 11. Results

_To be filled by the executor._
