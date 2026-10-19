# 327 — `examples/basic-app`: the composed workflow runs in the native runtime

**Workstream:** primitives (owns `packages/primitives`, `packages/icons`,
`examples/basic-app`).
**Depends on:** `030`, `040`, `041`, `047`, `065`, `085`, `087`, `324`–`326`.
**Block:** `327` (free — `300–326` are taken).
**Phase:** C/F.
**Status:** implemented — 5 native tests; both-direction proof in §7.

---

## 0. Why this exists (the defect)

There are two truths in the repo today, and they contradict the owner's bar.

1. Every Tier 1 component is proven in the real GPUix `TestRenderer`
   (`packages/primitives/runtime/`, 311 tests), **one component at a time**.
   The twelve in-package examples are also mounted
   (`runtime/examples.runtime.test.tsx`), so paint-level composition is covered.

2. `examples/basic-app` is the only *application* that composes the whole Tier 1
   set into a workflow, and its own `README.md` says:

   > **not verified** — *this composition* — the window opening, its layout,
   > hit-testing and the app's own focus order.

   Nothing has ever mounted `App`. The README's honesty is correct, but the
   result is that the library's headline example — "the settings form an
   application would actually ship" — is a composition no test has executed.

While reading that composition for this plan, a real defect surfaced in it:

```tsx
<Checkbox checked={terms} onValueChange={setTerms} label="I accept the terms" />
<Text role="caption" tone="muted">
  Required before the workspace can be saved.
</Text>
```

`Checkbox`'s `label` is the **accessible name only** (`src/components/Checkbox.tsx`
passes it to `aria-label`); the box paints no visible label. So a sighted user
sees one empty square and a caption that never says what they are accepting.
Plan `087` already recorded why a `Label`/`Text` beside a standalone checkbox is
not the fix (painted text is not a hit area and there is no `aria-labelledby`),
and plan `065` already shipped the honest shape: a **`CheckboxGroup` row**, whose
visible label and description are inside the one clickable, focusable element.

So this plan does two things, in this order:

1. replace the consent control with a one-row `CheckboxGroup` (visible label,
   clickable row, description);
2. mount the real `App` in the real `TestRenderer` and prove the workflow the
   README currently disclaims, including the consent row's visible label.

The integration suite is the point: it is the only test that can see the app's
own wiring (validation disabling Save, the consent row gating it, the save
progress, the skeleton→form transition), and it fails today for the reason in §0.

---

## 1. Decision: the runtime adapter gets a package subpath

The app's suite needs the `TestRenderer` adapter that already exists at
`packages/primitives/runtime/harness.ts`. A test inside `examples/basic-app`
cannot import it by relative path without inverting the package boundary
(`basic-app` depends on `primitives`, not the reverse), and copying 250 lines
would be the duplication `AGENTS.md` §1 forbids.

**Move the adapter to `packages/primitives/src/testing/` and expose it as
`@gpuixui/primitives/testing`.**

Why this is the right home, not a new framework:

- it is the same adapter plan `041` §2.2 describes — thin, `Option`-returning,
  component-API-shaped — and the runtime suites keep using it;
- it has a second consumer now (`basic-app`), which is the repo's own rule for
  hoisting a shared module;
- it is deliberately **not** `@gpuixui/testing` (playground, plan `100`): that
  package owns the smoke-report/host model and is not on this branch. When it
  lands, this subpath stays the component-level adapter or re-exports from it;
  the relationship is recorded in the subpath's doc comment and in `TODO.md`.
- it is **test-only**: the package root does not re-export it, so no consumer
  imports the native testing surface by accident.

If a reviewer rejects the subpath (see STOP 2), the fallback is to keep the
suite in `runtime/` and import the app through a relative path — recorded as a
worse boundary, not implemented by default.

---

## 2. Files

```
packages/primitives/src/testing/runtime.ts          MOVE from runtime/harness.ts
packages/primitives/src/testing/index.ts            NEW  re-export
packages/primitives/package.json                    EDIT exports "./testing"
packages/primitives/runtime/*.runtime.test.tsx      EDIT import path (23 files)
packages/primitives/runtime/fixture.tsx             EDIT import path
packages/primitives/runtime/harness.ts              DELETE
packages/primitives/README.md                       EDIT the runtime-testing section
examples/basic-app/src/App.tsx                      EDIT the consent row
examples/basic-app/package.json                     EDIT test:runtime + devDeps
examples/basic-app/tsconfig.json                    EDIT include
examples/basic-app/vitest.runtime.config.ts         NEW
examples/basic-app/runtime/app.runtime.test.tsx     NEW  the workflow suite
examples/basic-app/README.md                        EDIT verified/unverified table
examples/basic-app/src/App.tsx                      (focus decision, STOP 4)
TODO.md                                             EDIT tick + evidence
COMPONENTS.md                                       EDIT the consent-row note
.agents/slop/plans/README.md                        EDIT index row
```

No new dependency beyond `effect` + `vitest` in `examples/basic-app`
(`@gpuix/react`, `react`, `@gpuixui/primitives` are already there).

---

## 3. Steps

### 3.1 Move the adapter (mechanical, no behaviour change)

1. `git mv packages/primitives/runtime/harness.ts packages/primitives/src/testing/runtime.ts`
2. Create `packages/primitives/src/testing/index.ts`:

   ```ts
   /**
    * The native runtime adapter, for writing GPUix `TestRenderer` tests.
    *
    * Test-only: the package root does not export this. One window per test via
    * `createRuntime`; see `packages/primitives/runtime/fixture.tsx`.
    */
   export * from "./runtime.js";
   ```

3. In `src/testing/runtime.ts`, update the doc comment's "plan 041 §2.2" sentence
   to name the new path and the reason (§1 above). No code change.
4. Replace `from "./harness.js"` with `from "../src/testing/index.js"` in every
   file under `packages/primitives/runtime/` (23 test files + `fixture.tsx`).
   `fixture.tsx` imports `createRuntime`/`Runtime`; keep its re-export of
   `testTheme` unchanged.
5. Delete `packages/primitives/runtime/harness.ts`.
6. `packages/primitives/package.json` `exports` gains:

   ```json
   "./testing": {
     "types": "./src/testing/index.ts",
     "default": "./src/testing/index.ts"
   }
   ```

7. `packages/primitives/README.md`: in the runtime section, say the adapter is
   importable as `@gpuixui/primitives/testing` for a consumer's own native tests,
   and that it loads the binding through a dynamic import (so importing the
   subpath never fails on a host without one).

**Verify:**
```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
```
Expected: `518 passed` and `311 passed`, unchanged (a move, not a change).

### 3.2 The consent row becomes one visible, clickable row

In `examples/basic-app/src/App.tsx`, replace:

```tsx
<Checkbox ... label="I accept the terms" />
<Text role="caption" tone="muted">Required before the workspace can be saved.</Text>
```

with one `CheckboxGroup`:

```tsx
<CheckboxGroup
  label="Terms"
  value={terms ? ["terms"] : []}
  onValueChange={(values) => setTerms(Arr.contains(values, "terms"))}
  options={[
    {
      value: "terms",
      label: "I accept the terms",
      description: "Required before the workspace can be saved.",
    },
  ]}
/>
```

- import `CheckboxGroup` and `Arr` (`effect/Array`); drop `Checkbox` if no other
  use remains (it does not).
- `canSave` still reads `terms`; the derived boolean is unchanged.
- `CheckboxGroup`'s single row is the hit area, the tab stop and the accessible
  name; its label and description are painted inside it (`src/components/CheckboxGroup.tsx`).

**Do not** add a `Label` beside a standalone `Checkbox` — plan `087` records why
that is inert. **Do not** wrap the box in an `onClick` `Box` — a container is not
a control.

### 3.3 The app's runtime suite

`examples/basic-app/vitest.runtime.config.ts` — copy the shape of
`packages/primitives/vitest.runtime.config.ts` (node env, `include:
["runtime/**/*.runtime.test.tsx"]`, `fileParallelism: false`, 30 s timeout) and
explain in the header why it is opt-in (needs the native binding; must fail
loudly, never skip).

`examples/basic-app/runtime/app.runtime.test.tsx` — one fresh window per test
(`createRuntime` from `@gpuixui/primitives/testing`, executed with
`Effect.runPromise` at the test boundary, EF-21). Helpers local to the file:

```ts
const byLabel = (runtime: Runtime, label: string) =>
  Arr.findFirst(runtime.all(), (el) => el.customProps?.["aria-label"] === label);

const announced = (runtime: Runtime, label: string) =>
  Option.getOrUndefined(a11yValueOf(runtime.a11y(), { label }));
```

The app's loading state is a **JS `setTimeout`**, which `runtime.advance` cannot
pump; wait with the fixture's real-timer helper (`setTimeout` in the suite,
`~950 ms`) and then `runtime.flush()`.

Tests (each names the bug it guards):

1. **"mounts the composed workflow after the skeleton"** — render `<App />`,
   flush: `paintedText()` contains `"Settings"` and the skeleton is up
   (`"Workspace name"` absent). After the timer + flush: `allText()` contains
   `"Workspace name"`, `"Contact email"`, `"About this workspace"`, `"Plan"`.
   *Guards:* the whole composition mounts in the real runtime, and the
   skeleton→form transition actually completes.
2. **"paints the consent copy a user has to agree to"** — after load,
   `allText()` contains `"I accept the terms"` **and** the caption
   `"Required before the workspace can be saved."`.
   *This is the failing direction today:* the visible label exists only as an
   `aria-label` on the box, so this assertion fails before §3.2.
3. **"Save is refused until the consent row is activated"** — find the Save
   button by `aria-label === "Save changes"`; click it; `paintedText()` does not
   contain `"Saving your changes…"`. Click the consent row (found by
   `aria-label === "I accept the terms"`); its announced value is `"checked"`;
   click Save; `"Saving your changes…"` is painted and a `Spinner`/`Progress` is
   present. After ~1.5 s + flush it is gone.
   *Guards:* the validation gate, the row's hit area and the save lifecycle.
4. **"an invalid email blocks the save and paints the error"** — click the
   `Contact email` input, `runtime.type("nope")`, flush: `allText()` contains
   `"Enter an address like you@example.com."`; activate the consent row; click
   Save; `"Saving your changes…"` is absent.
   *Guards:* live validation and the disabled-Save derivation.
5. **"the Select paints the option's label, not its value"** — after load,
   `allText()` contains `"Team — up to 20 members"` (the initial `plan` is
   `"team"`). *Guards:* the label mapping in the app's `options`.

`App` must keep an optional `initialMode` prop (it already has one). If the
suite needs a shorter skeleton delay, prefer a real wait over adding a test-only
prop; a product prop that exists only for a test is the hack this repo rejects.

### 3.4 package.json / tsconfig / README

- `examples/basic-app/package.json`:
  - `"test:runtime": "vitest run --config vitest.runtime.config.ts"`
  - devDependencies: `"effect": "catalog:"`, `"vitest": "catalog:"`
  - **not** `test`: the native suite stays opt-in, exactly like
    `packages/primitives` (a host without a binding must report a real failure,
    not a skipped green, and the default `nub run test` must stay runnable here).
- `examples/basic-app/tsconfig.json`: `"include": ["src/**/*", "runtime/**/*",
  "vitest.runtime.config.ts"]`.
- `README.md` verified/unverified table:
  - verified: `check-types`; **the composition in the real GPUix 0.10.0
    `TestRenderer`** (`nub run --filter @gpuixui/basic-app test:runtime`) —
    mount, skeleton→form, consent gate, save lifecycle, validation, label paint;
  - not verified: *opening the native window itself* (`bun src/main.tsx`) on a
    machine with a desktop session — the one thing the `TestRenderer` cannot
    show. Say exactly that; do not delete the honesty, narrow it.

### 3.5 Ledger

- `TODO.md`: add under the primitives workstream, ticked:
  `[x] examples/basic-app: the composed workflow is mounted in the real TestRenderer; the consent row is a visible, clickable CheckboxGroup row (plan 327)`.
  Keep the remaining `docs-site`/CI rows untouched.
- `COMPONENTS.md`: in the Checkboxes row (and the plan's evidence note), record
  that the app's consent row is a `CheckboxGroup` row and why a standalone
  `Checkbox` + caption was wrong.
- `.agents/slop/plans/README.md`: index this plan in the primitives block as
  `done` with its measured counts.

---

## 4. Test plan — what must fail without the change

| Change | Failing direction (must be measured) |
| ------ | ------------------------------------ |
| Visible consent label | revert `CheckboxGroup` → `Checkbox` + caption; test 2 fails because `allText()` has no `"I accept the terms"` (the name is only in `aria-label`) |
| Clickable consent row | with the standalone box, clicking the *caption* does nothing and Save stays refused; test 3's row click must toggle. If the caption is clicked instead of the row, the test must fail to progress |
| Save gate | set `canSave = true` unconditionally → test 3's first refusal fails (Save starts saving without consent) |
| Validation | remove `!badEmail` from `canSave` → test 4's second half fails (Save starts with an invalid email) |
| Mount | the app suite's first test fails on a host without the binding with `MissingNativeBindingError`, never skips |

Commands:
```sh
nub run --filter @gpuixui/basic-app test:runtime
nub run --filter @gpuixui/basic-app check-types
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
nub run test
```

Expected: the app suite green (5 tests, exit 0); primitives 518 / 311 unchanged;
`check`, `lint`, `test` green. A command that was not run did not pass.

---

## 5. STOP conditions

1. **The adapter move changes behaviour** — any runtime test fails after §3.1.
   Stop: the move is meant to be mechanical; diff the import list, do not "fix"
   the suite.
2. **`@gpuixui/primitives/testing` is rejected** (contract/reviewer says the root
   package must not publish a testing surface). Stop and report; implement the
   §1 fallback only with an explicit decision recorded in `PLAN.md` §4.
3. **The consent row cannot be clicked in the runtime** (the row's bounds report
   null or the click lands nowhere). Stop: measure and record; do not add
   `pointerEvents` hacks. `CheckboxGroup`'s runtime suite already clicks a row
   (`runtime/checkbox-group.runtime.test.tsx`), so this would contradict plan
   `065` and needs a real investigation.
4. **`autoFocus` on the email field does not take focus when the input mounts
   after the skeleton.** Measure it in the suite (`runtime.focused()`). If it is
   false, remove `autoFocus` from the app and record the measured reason in the
   README (a field added after the first render cannot take platform focus
   automatically; plan `064` only proved the initial mount). Do **not** fake it
   by asserting focus the runtime never granted.
5. **The app's `setTimeout` timings make the suite flaky.** Stop and reduce the
   app's demo timings (product change, documented) rather than adding retries or
   sleeping longer.

---

## 6. Acceptance

- `App` mounts in the real `TestRenderer` and the five workflow tests pass.
- The consent control paints its own label and description, is one clickable,
  focusable row, and its announced state flips with a click.
- `README.md` states exactly what is now verified and what still is not (the
  native window).
- The primitives adapter has one home, both suites import it, and no test file
  is left importing `runtime/harness.js`.
- `nub run check`, `nub run lint`, `nub run test` and both `test:runtime` suites
  are green; the app's `test:runtime` fails loudly (never skips) without a
  binding.

---

## 7. What was measured (2026-10-18)

### 7.1 The app suite

`nub run --filter @gpuixui/basic-app test:runtime` → **6/6 green, exit 0**
(one file; ~13 s wall clock, dominated by the app's two demo timers).

What the run established, beyond the assertions:

- `App` mounts in the real `TestRenderer` with no window; the skeleton→form
  hand-over completes on its own timer and the runtime repaints on `flush()`.
- The consent row is **below the scroll region's fold** at 960×720 (row
  `y 716..752` under a region at `y 91..647`, offset `0`). A wheel of
  `deltaY -400` moves the region to offset `y -105`, which places the row at
  `y 611..647` — inside. The suite asserts the offset and the reachability, not
  just the click, because "a row that cannot be revealed" is the bug class.
- `scrollIntoView` is **not** a page-scroll substitute here: called on the row it
  reset the region's offset to `0` instead of revealing it. The app suite uses
  the wheel (a real user gesture); `scrollIntoView` stays used where it was
  measured for `Select`'s highlighted option (plan `069`).
- A `minHeight: 0` on `scrollStyle` was tried as a possible fix and **reverted**:
  measured with and without it, the region scrolled identically (`offset
  [0, -105]` after the same wheel), so it was an unmeasured change.
- **Reset only reset the theme.** The footer button labelled "Reset" called
  `setMode(initialMode)` alone, so every field — including the consent the Save
  gate depends on — survived. The form's opening values are now one `INITIAL`
  record used by both `useState` and `reset()`, and the suite proves it.
- **`autoFocus` does not survive a later mount.** After load,
  `runtime.focused()` was empty: the email field is added when the skeleton is
  replaced, and the runtime grants `autoFocus` only on the initial mount (plan
  `064`). The app no longer sets it, and the README records the measurement.
  **Corrected by plan `584`:** the empty `runtime.focused()` was a locator
  artifact — the app's field had no `testId`, and `focused()` returns the focused
  element's `testId`. A later mount **does** receive `autoFocus` (measured for
  `Input`, controlled `Input`, `TextArea`, `OTPField` and `NumberField`); plan
  `584` gives the app's first field a `testId`, restores the prop and proves the
  focus in this suite.

### 7.2 Two-direction proof

Each mutation was applied to `examples/basic-app/src/App.tsx`, the named test run,
and the file restored:

| Mutation | Result |
| -------- | ------ |
| consent back to `Checkbox` + `Text` caption (the shipped bug) | `paints the consent copy…` fails: `expected [...] to include 'I accept the terms'` — the label existed only as `aria-label` |
| `canSave = true` | `reaches the consent row…` fails on its first refusal: `Saving your changes…` appears before consent |
| `canSave = workspace !== "" && terms` (validation dropped) | `keeps Save refused while the email is invalid` fails on the same assertion |
| Reset reverted to `setMode(initialMode)` only | `Reset restores the form, not only the palette` fails: consent still announces `checked` after Reset |

### 7.3 Counts

- `packages/primitives` offline: **518 passed** (unchanged — the adapter move).
- `packages/primitives` runtime: **311 passed** after the move (21 files).
- `examples/basic-app` runtime: **6 passed** (1 file).
- `check-types` green for both packages; `nub run check`, `nub run lint`,
  `nub run test` run at the end of the change (§8 of `AGENTS.md`).
