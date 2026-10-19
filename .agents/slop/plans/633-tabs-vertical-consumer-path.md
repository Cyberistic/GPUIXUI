# 633 — Tabs' vertical axis through the consumer path

- **Phase:** F (coverage hardening)
- **Workstream:** playground · **Owns:** `apps/playground/**`,
  `packages/testing/**`, the playground's inventory rows
- **Depends on:** `344` (`tier2-navigation`), `345` (`live-tier2-navigation`),
  components `321` (the vertical orientation implementation and its in-package
  test), `591` (the live layout twins)
- **Status:** landed, 2026-10-19

## 1. Why this plan exists

`@gpuixui/components` ships `Tabs orientation="vertical"` (components plan
`321`): the root becomes a row, the list a column, and Down/Up drive movement
while Right/Left are inert. That behaviour is proven **in the package** by four
native behaviour tests, but the **consumer path is not covered anywhere**:

- `apps/playground/src/scenarios/tier2-navigation.tsx` mounts `Tabs` with the
  default horizontal axis and never sets `orientation`;
- `apps/playground/src/live/scenarios.tsx`'s `live-tier2-navigation` reuses that
  view, so a real window has never seen a vertical tab set either;
- `COMPONENTS.md`'s Tabs row cites plans `344`/`345`/`390` for the live
  evidence, none of which exercises the axis.

The consumer path is where the published root import, the shipped token theme
and the runtime's layout engine meet. A regression that only breaks that path —
a wrong flex direction after a theme change, a vertical list clipped by its
parent, an `orientation` prop dropped by the re-export — would keep every gate
green today. This plan adds the missing evidence and makes it fail by name.

Scope is **orientation only**. No component code, no new prop, no new scenario
id: the existing `tier2-navigation` and `live-tier2-navigation` ids gain the
fixture. Manual activation stays covered by the package's own test; adding it
here would duplicate the consumer path's pattern, not the consumer path.

## 2. Files

```
apps/playground/src/scenarios/tier2-navigation.tsx  # + a vertical fixture and 8 checks
apps/playground/src/live/scenarios.tsx              # live-tier2-navigation + 4 checks
COMPONENTS.md                                       # Tabs row: cite the consumer path
TODO.md                                             # add and tick the task
apps/playground/README.md                           # the two scenario rows gain the axis
.agents/slop/plans/README.md                        # index this plan
```

No `packages/components/**` change. If a check fails, the failure is a measured
fact about the shipped component — record it in `TODO.md` (owner `components`)
and pin the measured behaviour, or stop (§5).

## 3. What to add

### 3.1 The fixture — `tier2-navigation.tsx`

A second `Tabs` inside the existing left column, after the horizontal set and
before `Collapsible`:

- `orientation="vertical"`, controlled with its own state (`vert`, default
  `"va"`);
- four triggers `vtab-a`, `vtab-b` (**disabled**), `vtab-c`, `vtab-d`, each with
  a stable `testId` and `aria-id`;
- one `TabsContent` per enabled value (`vpanel-a`, `vpanel-c`, `vpanel-d`) with
  a `<text>` child, so a selected panel is painted and an unselected one is not;
- the IDs are distinct from the horizontal set: the readout gains
  `vtab=<value>` and the second tab stop exists in the same frame.

Keep the fixture minimal: no caller `style`, no extra wrapper. The theme is the
one the scenario already provides.

### 3.2 Headless checks — `tier2-navigation`

1. **The vertical list stacks.** `vtab-a` and `vtab-d` have the same `x`
   (within 1 px) and `vtab-d.y >= vtab-a.y + vtab-a.height`; the horizontal
   list's `tab-a`/`tab-d` share a `y` and increase in `x`. This is the axis in
   the runtime's own layout, not the source.
2. **The panel is beside the rail.** The painted `vpanel-a` starts at or after
   `vtab-a.x + vtab-a.width` — the root's row direction.
3. **End reaches the last enabled trigger.** `ctx.host.keyDown("vtab-a", "end")`
   → readout `vtab=vd`, native focus `vtab-d`, `vpanel-d` painted and
   `vpanel-a` gone. `jumpTo` seeds the roving index, which is the documented
   route on this runtime (plan `529` §6.5: `onFocus` never arrives).
4. **Up moves to the previous enabled trigger and skips the disabled one.**
   From `vd`, `keyDown("vtab-d", "up")` → `vtab=vc`, focus `vtab-c`.
   `up` again → `vtab=va`, skipping `vtab-b`.
5. **Down wraps and still skips the disabled row.** From `va`,
   `keyDown("vtab-a", "down")` → `vtab=vc` (not `vb`), then `vtab=vd`.
6. **Lateral keys are inert in a vertical set.** From `vd`,
   `keyDown("vtab-d", "right")` and `"left"` leave `vtab=vd` and focus on
   `vtab-d`; this is the axis-leak guard.
7. **The disabled trigger is not a tab stop.** `focusNext`/`focusPrevious`
   never land on `vtab-b` while traversing the frame (assert after the vertical
   list gains focus; `focusNext` from `vtab-a` reaches `vtab-c`).
8. **Home returns to the first enabled trigger.** `keyDown("vtab-c", "home")`
   → `vtab=va`.

Each check reads the painted readout and/or `focused`/`bounds`, never the
component's internal state.

### 3.3 Live checks — `live-tier2-navigation`

The window has no ancestor key bubbling guarantee (plan `344` measured that the
window delivers a key to the focused element only), so the live twin asserts
what transfers and says so:

1. **The vertical rail stacks in a window.** `bounds("vtab-a")` and
   `bounds("vtab-d")` share an `x` (within 1 px) and `vtab-d.y` is below
   `vtab-a`; the horizontal rail's `tab-overview`/`tab-settings` share a `y`.
2. **A real click selects a vertical tab.** Click `vtab-c`, wait for
   `vtab=vc`, paint `vpanel-c`, unpaint `vpanel-a`, and assert native focus is
   `vtab-c`.
3. **The vertical panel sits beside the rail live.**
   `vpanel-c.x >= vtab-a.x + vtab-a.width`.
4. **The disabled vertical trigger is inert.** A click on `vtab-b` leaves
   `vtab=vc` and paints no `vpanel-b`.

The live steps stay paced with `settle`/`waitFor`, as every twin does.

## 4. Commands and expected results

```sh
# Build (the smoke runners execute dist/)
nub run --filter playground build
# expect: exit 0

# Focused headless scenario (the changed scenario)
nub apps/playground/dist/smoke/run.js --only tier2-navigation
# expect: 1/1 scenarios passed, exit 0, tier2=verified; the new checks are
# listed as ok and no check is skipped

# Focused live twin (a real window; ~10 s)
nub apps/playground/dist/live/run.js --only live-tier2-navigation
# expect: 1/1 scenarios passed, exit 0

# Gates
nub run check
nub run lint
nub run test
# expect: exit 0 each
```

The **full** headless registry is the end-of-task check because the change
touches a shared scenario:

```sh
nub apps/playground/dist/smoke/run.js
# expect: 104/104 scenarios passed, exit 0
```

The full live suite is **not** run: it is the merge/release gate, and this plan
adds no live scenario id (it extends an existing one). Record the exact ids run.

## 5. STOP conditions

Stop and report instead of improvising if:

- `packages/components/src/tabs.tsx` has no `orientation` prop or the vertical
  branch is absent — the dependency (components `321`) is not in this tree;
- the vertical rail paints **horizontally** in the consumer path — record the
  measured defect for `components` in `TODO.md` and do not weaken the check;
- `keyDown(<testId>, …)` cannot reach `TabsList`'s React handler headlessly —
  the plan's keyboard half assumes the same verb `collapse-trigger` already
  uses; record the limitation and keep only the checks that ran;
- the live click leaves focus off the clicked trigger — record the harness
  difference (plans `555`/`605`) and assert what was measured, never a guess;
- any new check passes before the implementation (§6.1) or the mutation does
  not fail it.

## 6. Test plan — the checks must be able to fail

### 6.1 Pre-implementation observation

Before writing the checks, add the fixture only and run
`--only tier2-navigation` with a temporary `expectEqual("axis", false, true)`:
the runner must report the injected failure. Remove it. This proves the
scenario is not silently skipping the new view.

### 6.2 Mutation proofs (observe each failing, then revert)

| # | Mutation | Expected failure |
| - | -------- | ---------------- |
| M1 | `tabs.tsx` root `flexDirection` comparison inverted (vertical → column) | check 1/2 (the panel is not beside the rail) |
| M2 | `TabsList` `flexDirection` comparison inverted | check 1 (vertical triggers share `y`, not `x`) |
| M3 | `direction()` inverted (vertical reads Left/Right) | checks 4/5 (`up`/`down` do not move) |
| M4 | `direction()` always reads Left/Right regardless of axis | check 6 (`right` moves to `va`) |
| M5 | `nextEnabled` delta ignored | check 4 (`up` does not reach `va`) |
| M6 (live) | live fixture's `orientation` removed | live check 1/3 (rail is horizontal) |

M1–M2 are component-side mutations used **only** as proof; they are reverted
immediately and must not be committed. If a mutation passes, the check is
vacuous: strengthen it before continuing.

### 6.3 Regression guard

The existing 55-check `tier2-navigation` and 17-check `live-tier2-navigation`
must still pass unchanged; the new fixture must not change the horizontal
readout, the Accordion, the Collapsible, the Breadcrumb or the Pagination
sections. Any change to an existing assertion is a signal that the fixture
altered layout unexpectedly — investigate before accepting it.

## 7. Acceptance

- `tier2-navigation` and `live-tier2-navigation` pass with the new checks, and
  the exact ids are recorded in `TODO.md`.
- Six mutation proofs observed and reverted (M1–M6); the null results, if any,
  are recorded.
- The full headless suite is green (104/104) and `nub run check`, `nub run
  lint`, `nub run test` pass.
- `COMPONENTS.md`'s Tabs row cites `tier2-navigation`/`live-tier2-navigation`
  for the vertical axis, and `TODO.md` has the task ticked.
- The plan is indexed in `.agents/slop/plans/README.md`.

## 8. Results (2026-10-19)

**Landed.** `tier2-navigation` went **55 → 78 checks** and
`live-tier2-navigation` **20 → 26** (the README's old "15" was stale). Both
focused runs are green, twice, after every mutation revert:

```
nub apps/playground/dist/smoke/run.js --only tier2-navigation   # 1/1
nub apps/playground/dist/live/run.js --only live-tier2-navigation # 1/1
```

**Measured harness fact:** a `keyDown(testId, key)` delivered to a **tab
trigger** reaches `TabsList`'s React `onKeyDown` in the `TestRenderer` — `End`
from `vtab-a` moved the selection and native focus to `vtab-d`. So the keyboard
checks use a real trigger as the target, not the list. This is the headless
counterpart to plan `344`'s live finding (a window sends a key to the focused
element only), which is why the live twin asserts geometry and the click path
and leaves the arrows headless.

**Mutation proofs** (each observed failing, then reverted; component-side
mutations were temporary and are not committed):

| # | Mutation | Observed failure |
| - | -------- | ---------------- |
| M1 | `Tabs` root vertical arm → `"column"` (horizontal untouched) | `a vertical panel sits to the right of the list: expected true, got false` |
| M2 | `TabsList` vertical arm → `"row"` (horizontal untouched) | `a vertical tab set stacks its triggers: expected true, got false` |
| M3 | Down/Up deltas inverted in `direction()` | `Up moves to the previous enabled vertical tab: … got "… vtab=va …"` |
| M4 | vertical `direction()` falls back to Left/Right | `Right is inert in a vertical tab set: … got "… vtab=va …"` |
| M5 | `nextEnabled` step ignores `delta` | `Up moves to the previous enabled vertical tab: … got "… vtab=va …"` |
| M6 | the live fixture's `orientation="vertical"` removed | `the vertical rail stacks live: expected true, got false` |

The unmodified horizontal checks catch a mutation that flips **both** axes
(M1/M2 were therefore scoped to the vertical arm so the new check is the one
that fails); that is the regression guard working, not a null result.

**Gates:** full headless **104/104** (**3695** checks, exit `0`), `nub run
check`, `nub run lint`, `nub run test` green (playground 424 tests observed directly; the other
workspace suites are printed by `nub run test`). The full
live suite was **not** run (merge/release gate); the focused twin is green.
