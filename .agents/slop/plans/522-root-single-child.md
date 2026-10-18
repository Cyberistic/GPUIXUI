# 522 — The app root keeps exactly one child: the last one, silently

| Field | Value |
| ----- | ----- |
| Status | landed — `root-single-child` 10 checks + `root-wrapper` 10 + `live-root` 5; suite `97/97` (3389 checks), live `46/46` (929), `root=verified`, exit `0`; five mutation proofs (§8) |
| Phase | B→F (layout contract / app boundary) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100` (harness), `110`/`120` (suite + shell), `140` (0.10.0 runs here), `182` (keyed remount) |
| Closes | the cross-team hand-off in `workspaces/components` plan `510`: "the native tree keeps one child at the root … the fact belongs in the playground's capability notes" |

## 1. Question

Every consumer of GPUix + React writes `<App />` into the native root. If that
tree ends in more than one host element, what does the runtime do? Measured on
this host (0.10.0, this plan's reconnaissance):

```
two roots at the render root:  retained 6, painted ["last"], first null,
                               last {x:0,y:0,width:200,height:40}, reachable 3
two roots inside one wrapper:  retained 7, painted ["A","B"], both addressable
```

So the rule is: **the root keeps exactly one child — the last one. Earlier
siblings are dropped from the tree, unpainted and unaddressable, but their host
nodes stay retained.** A wrapper element makes every sibling render. Nothing
warns.

Why this matters:

1. A component author who returns a fragment with two roots loses the first one
   with no error. `COMPONENTS.md` already records the consequence from another
   direction: "a provider with sibling children paints nothing" (plan `330`).
2. A test fixture that renders two siblings measures only the last, so a
   regression test can silently assert against the wrong subtree (this is how
   plan `510` found it).
3. It is a **layout/app-boundary** fact, so it belongs in the capability map and
   the playground README beside "a flex child needs `minHeight: 0`".

The rule must be measured in the shipped runner, not only in a scratch harness:
the runner mounts each view under `Fragment` → `ThemeProvider` (a context
provider, no host element) → the view. The reconnaissance reproduced that exact
chain; this probe re-proves it as a suite scenario.

## 2. Source evidence (confirm in the run, do not assume)

- `packages/tokens/src/react.tsx` → `ThemeProvider` returns
  `ThemeContext.Provider`, not a host element, so the view is still the root
  child.
- `apps/playground/src/smoke/run.ts` (`mount`) → `Fragment{key}` →
  `ThemeProvider` → `withWindowKeyProvider(register, view())`.
- `apps/playground/src/live/run.ts` (`mount`) → the same chain for a live view.
- `packages/testing/src/native.ts` (`allElements`, `find`) → a dropped root
  subtree is not reachable from `getRoot()`, so `findByTestId` returns nothing
  for it; `getRetainedElementCount` still counts it.

If the run contradicts these, **STOP** and amend this plan with the measured
behaviour before writing assertions (§7).

## 3. Design

One new capability `root`, two headless scenarios, one live twin. The two views
are exported so the live twin reuses the exact same tree.

### 3.1 `apps/playground/src/scenarios/root.tsx` (new)

Export:

- `RootTwoProbe` — a fragment with two roots:
  - `root-first`: a `div`, 120 × 40, `role="group"`, `aria-label="First root"`,
    containing `<text>first root (dropped)</text>`;
  - `root-last`: a `div`, 200 × 40, `role="group"`,
    `aria-label="Last root"`, containing `<text>last root survives</text>`.
- `RootWrapperProbe` — one root `div` `root-wrap`, `display: "flex"`,
  `gap: 12`, `width: 320`, containing:
  - `wrap-left`: 100 × 40 with `<text>left</text>`;
  - `wrap-right`: 120 × 40 with `<text>right</text>`.
- `rootSingleChildScenario`: id `root-single-child`, capability `root`,
  `view: () => <RootTwoProbe />`.
- `rootWrapperScenario`: id `root-wrapper`, capability `root`,
  `view: () => <RootWrapperProbe />`.

Use `useTheme()` for both roots' `backgroundColor` (`background` for the
surviving root, `muted` for the dropped one) exactly as the other probes do.

### 3.2 Assertions — `root-single-child`

| # | Label | Assertion |
| - | ----- | --------- |
| 1 | the last root paints | `bounds("root-last")` is `Some` |
| 2 | the surviving root is the declared width | width = 200 ± 1 |
| 3 | the surviving root sits at the origin | `x` = 0 ± 1, `y` = 0 ± 1 |
| 4 | the earlier root is not addressable | `elementType("root-first")` = `null` |
| 5 | the earlier root paints nothing | `bounds("root-first")` = `null` |
| 6 | only the last root's text is painted | `paintedText()` contains `"last root survives"` |
| 7 | the dropped root's text is not painted | `paintedText()` has no run containing `"first root"` |
| 8 | the dropped subtree is still retained | `retainedElements()` = 6 |

Check 8 is the point of the probe: two text-bearing `div`s are three host nodes
each (`div` → `text` → text run, measured), so a silent drop keeps `6`, while a
single root would keep `3`. If the runtime starts keeping both roots, check 4
fails first (`expected null, got "div"`).

### 3.3 Assertions — `root-wrapper`

| # | Label | Assertion |
| - | ----- | --------- |
| 1 | the wrapper paints | `bounds("root-wrap")` is `Some` |
| 2 | the wrapper is the declared width | width = 320 ± 1 |
| 3 | the wrapper is content-high | height = 40 ± 1 |
| 4 | the left child paints | `bounds("wrap-left")` is `Some` |
| 5 | the right child paints | `bounds("wrap-right")` is `Some` |
| 6 | the children are laid out in order | `wrap-right.x − (wrap-left.x + wrap-left.width)` = 12 ± 1 |
| 7 | both children's text is painted | `paintedText()` contains `"left"` and `"right"` |
| 8 | the wrapper keeps one reachable root | `retainedElements()` = 7 (wrapper + 3 + 3) |

### 3.4 Live twin — `apps/playground/src/live/scenarios.tsx`

`live-root`, capability `root`, `view: rootSingleChildScenario.view`,
`ready: "root-last"`:

1. `bounds("root-last")` is not null; width 200 ± 1.
2. `bounds("root-first")` is null.
3. `paintedText()` contains `"last root survives"` and no `"first root"`.

The live host has no retained-count verb and no style report (plan `197`), so
those stay headless. `text` errors on an absent element (plan `389`), so the
absence check uses `bounds`.

### 3.5 Registry and capability

- `packages/testing/src/smoke.ts`: add `"root"` to `CAPABILITIES` (alphabetical
  position beside `"layout"` is fine; the array is not sorted today).
- `apps/playground/src/scenarios/index.ts`: import both scenarios; add `"root"`
  to `PROBE_CAPABILITIES`; add the two scenarios after `layoutGridScenario`
  (they are the base every other view sits on).
- The existing `scenarioProblems` integrity check covers the new capability:
  a capability in `PROBE_CAPABILITIES` with no scenario fails the unit test.

## 4. Documentation

- `COMPONENTS.md` §"How the two evidence columns are decided" table: add
  `| root | \`root-single-child\`, \`root-wrapper\` | verified |`.
- `COMPONENTS.md` prose (after the `shell-navigation` paragraph): the rule, the
  measured numbers, the consequence (a provider that adds no host element does
  not change the root count; a fragment of two roots must be wrapped) and the
  honest limitation (a dropped subtree is retained, so a long-lived app that
  re-renders two roots churns nodes).
- `apps/playground/README.md`: a short subsection under the layout probes with
  the same rule, the two scenario ids, and a note that the **sidebar preview**
  nests a view inside the shell's stage, so both roots paint there — the smoke
  mount is the app boundary and is the honest one.
- `.agents/slop/plans/README.md`: index this plan under the playground table.
- `TODO.md`: tick the new playground task; add a cross-team row for `docs-site`
  (its `capabilities.test.ts` compares the COMPONENTS table with its own list,
  so it must add the `root` row and the two ids) — do not edit `apps/docs`.

## 5. Commands and expected results

From the repository root:

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only root-single-child
# expect: 1/1 scenario, 10/10 checks, exit 0, root = verified
nub apps/playground/dist/smoke/run.js --only root-wrapper
# expect: 1/1 scenario, 10/10 checks, exit 0, root = verified
nub apps/playground/dist/live/run.js --list
# expect: the new live id listed, no window, exit 0
nub apps/playground/dist/live/run.js --only live-root
# expect: 1/1 live scenario, 5/5 checks, exit 0, one screenshot
```

The headless CLI takes **one** `--only` id (the live CLI's `--only` is the
repeatable one), so the two headless scenarios are separate runs. `--list` is a
live-CLI verb; the headless CLI treats it as an unknown flag and would run the
whole suite.

Then the gates:

```sh
nub run check
nub run lint
nub run test
```

Expected: all exit `0`. `packages/testing` reports its existing tests; the new
capability is covered by `apps/playground`'s `scenarioProblems` test.

Finally, once, because the change is cross-cutting (capability model + registry +
live suite):

```sh
nub apps/playground/dist/smoke/run.js
# expect: all scenarios green, exit 0; record the new totals in COMPONENTS.md
# and the playground README
nub run --filter playground smoke:live
# expect: all live scenarios green, exit 0; record the new live totals
```

**Never** run the full live suite while iterating; it is the last step.

## 6. Mutation proofs (the two-direction requirement)

Each mutation is applied, the focused suites run, the observed failure recorded
here, and the mutation reverted. A probe that cannot fail is not evidence.

| # | Mutation | Expected failure |
| - | -------- | ---------------- |
| M1 | wrap `RootTwoProbe`'s two roots in a `div` | `root-single-child`: "the earlier root is not addressable" — `expected true, got false` (measured) |
| M2 | swap the sibling order in `RootTwoProbe` | `root-single-child`: "the earlier root is not addressable" — `expected true, got false` (the swapped `root-first` now survives, measured) |
| M3 | delete `root-last` from `RootTwoProbe` | `root-single-child`: "the earlier root is not addressable" — `expected true, got false` (measured) |
| M4 | unwrap `RootWrapperProbe`'s root `div` | `root-wrapper`: "the wrapper paints" — `expected a value, got none` (measured) |
| M5 | change the wrapper gap 12 → 8 | `root-wrapper`: "the gap between the children" — `expected 12 ± 1, got 8` (measured) |

Record each observed message in §8 before moving on. M1 and M4 are the important
pair: they prove the probe distinguishes "one root" from "a wrapper". The runner
stops a scenario at its first failed check, so a mutation that changes the tree
shape trips the absence assertion before the geometry assertions; that is the
expected first failure, not a hidden one.

## 7. STOP conditions

Stop and report, do not improvise, if any of these holds:

- `--only root-single-child` paints **both** roots (`root-first` addressable).
  The runner's mount chain then differs from the reconnaissance; record the
  measured tree and amend §1/§3 before asserting anything.
- `retainedElements()` is not `6`/`7`. Record the measured counts and the tree
  shape, amend §3.2/§3.3, and re-run; do not widen the assertion to "greater
  than".
- The live run has no window (exit `2`). That is missing evidence, not a pass:
  report exit `2` and leave the live twin unclaimed.
- A check passes with its mutation applied (M1–M5). The check is not measuring
  what it claims; fix the check before continuing.
- Adding the capability breaks a test outside this workstream (`apps/docs`).
  Do not edit `apps/docs`; record the exact failing assertion in `TODO.md` as a
  docs-site hand-off.

## 8. Results

Filled in when the plan is executed: the measured counts, the mutation messages,
the full-suite totals, and the exact scenario ids that were run.

| Item | Result |
| ---- | ------ |
| `root-single-child` | **10/10 checks**, exit `0`; two roots → only `root-last` addressable/painted at `(0, 0, 200, 40)`, `root-first` absent, retained `6` |
| `root-wrapper` | **10/10 checks**, exit `0`; wrapper `320 × 40`, both children painted, gap `12`, retained `7` |
| `live-root` | **5/5 checks**, exit `0`, `root=verified`, real window |
| M1 | wrap in a `div` → "the earlier root is not addressable: expected true, got false", exit `1` |
| M2 | swap order → same absence check fails (the swapped root now survives), exit `1` |
| M3 | delete `root-last` → same absence check fails (`root-first` is now the sole root), exit `1` |
| M4 | unwrap the wrapper → "the wrapper paints: expected a value, got none", exit `1` |
| M5 | gap 8 → "the gap between the children: expected 12 ± 1, got 8", exit `1` |
| full headless | `97/97` scenarios, **3389 checks**, exit `0` |
| full live | `46/46` scenarios, **929 checks**, exit `0` (9 scenarios' worth of time; one run, at the end) |
| gates | `nub run check` = `0`, `nub run lint` = `0`, `nub run test` = `0` (playground 382 tests, 29 files) |

The sidebar preview nests both roots inside the shell's stage, so the two-root
view paints both there; the smoke mount is the app boundary and is the honest
observation. This is recorded in the playground README.

