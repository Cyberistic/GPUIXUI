# Plan 168 — the shipped Tier 1 components in the native smoke suite

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B exit (working foundation) → feeds C/D evidence.
**Depends on:** plans `100` (harness), `110` (native smoke), `120` (playground),
`140` (the `darwin-x64` binding), `150` (theme gallery), `159` (the published
popups), `160` (a11y tree). Consumes `@gpuixui/primitives` (merged to `master` by
the primitives workstream, `0e311a9`→`d611d60`).

## 1. Why this plan exists

Every scenario in the suite so far probes a **runtime mechanism**: a `<div>`
lay-out, a raw `<input>`, GPUix's own `Select`, a focus call. The library's first
real components — `@gpuixui/primitives`' `Button`, `Input`, `Checkbox`, `Switch`,
`Toggle`, `Slider`, `Select`, `Tooltip`, `Progress`, `Meter`, `Skeleton` — are
merged to `master` but have never been mounted by the playground, so:

- `TODO.md` still has **"Land one fully working component running in GPUix"**
  unticked, although the components exist;
- the smoke report's capability verdicts say nothing about the package a consumer
  would actually import;
- the primitives' own `runtime/*.test.tsx` suites are opt-in
  (`test:runtime`) and are not part of `nub run test`, so a component regression
  can reach `master` without a red gate.

This plan adds the missing integration layer: the **published components**, the
**published token theme** and the **shared smoke harness** in one executable
report. It does not re-test the runtime mechanisms (those scenarios stay) and it
does not re-implement the primitive's own unit/runtime suites; it proves the
composition a consumer gets.

The composed examples in `packages/primitives/examples/index.ts` are **not
consumable** from here: the package does not export `./examples` (its `exports`
map has only `.` and `./core`). Mounting them needs a one-line change outside
this workstream. That change is recorded in `TODO.md` as a cross-team task; this
plan builds the scenarios from the **public root export** instead.

## 2. What is built

One new harness capability, `components`, and three scenarios in one new file
`apps/playground/src/scenarios/primitives.tsx`. Each view bridges the two theme
contexts: the smoke runner already wraps the view in `@gpuixui/tokens/react`'s
`ThemeProvider` (palette `dark`), and the view reads that theme with
`useTheme()` and passes it to `@gpuixui/primitives`' own `ThemeProvider`. A
primitive rendered without that second provider throws
`MissingThemeProviderError`, so the bridge is itself under test.

### 2.1 `primitives-actions` (capability `components`)

View (width 420, column stack):

| testId | Element |
| ------ | ------- |
| `action-save` | `Button variant="primary" label="Save changes"` — increments `activations` |
| `action-disabled` | `Button disabled` — same increment, must never run |
| `action-loading` | `Button loading` — same increment, must never run |
| `action-toggle` | `Toggle label="Grid" pressed={grid} onPressedChange` |
| `action-readout` | `Readout` — `activations=<n> pressed=<bool>` |

Steps:

1. Click `action-save` → readout `activations=1`.
2. `enter` → `activations=2`; `space` → `activations=3`. This is the component's
   own keyboard contract (`core/keyboard.ts`), not the runtime's.
3. Click `action-disabled` and `action-loading` → still `activations=3`.
4. `a11y()` → the `Save changes` node has role `Button`; the loading button's
   node has `description = "Loading"` and an `aria-label`.
5. Focus ring: `paintedStyle("action-save")` has a `boxShadow` (the component
   tracked `onFocus` and merged `controlFocusStyle`); `clickWindow(8, 8)` blurs
   it and the same snapshot has no `boxShadow`. This is the first proof that a
   **component's** focus state reaches the renderer, not merely that GPUix can
   focus a div.
6. Click `action-toggle` → readout `pressed=true`; `a11y()` node for
   `action-toggle` has `value = "pressed"`; `enter` → `pressed=false` and
   `"not pressed"`.

### 2.2 `primitives-fields` (capability `components`)

View (width 440, column stack):

| testId | Element |
| ------ | ------- |
| `field-name` | `Input label="Project name"` — controlled `name`, records `submits` |
| `field-locked` | `Input disabled value="locked"` |
| `field-check` | `Checkbox label="Email notifications"` — controlled |
| `field-switch` | `Switch label="Pause all"` — controlled |
| `field-region` | `Select label="Region"` over four options, `eu-west` default |
| `field-readout` | `name=<text> submits=<n> checked=<bool> paused=<bool> region=<value>` |

Steps:

1. Click `field-name`; type `a t l a s` → `name=atlas` (the controlled `Input`
   forwarded the native edit through `onChange`).
2. `enter` → `submits=1` (the component's `onSubmit` path).
3. Click `field-locked`, type `x` → `name=atlas`: a disabled field is read-only
   and out of the tab order, and its chrome is the disabled role (assert its
   `paintedStyle` background is present and **differs** from the focused
   `field-name`'s background).
4. Click `field-check` → `checked=true`; `a11y()` node role `CheckBox` with
   `value = "checked"`; `space` → `checked=false`, `value = "unchecked"`.
5. Click `field-switch` → `paused=true`; `a11y()` `Switch` node `value =
   "checked"`.
6. Click `field-region` → `paintedText()` contains every option label; `down`
   then `enter` commits the next option → readout `region=us-east` and the
   trigger paints `United States — East`.
7. Click `field-region`, `escape` → the list unmounts (no `Asia — South` in
   `paintedText()`) and `region` is unchanged.

### 2.3 `primitives-display` (capability `components`)

View (width 460, column stack):

| testId | Element |
| ------ | ------- |
| `display-quality` | `Slider label="Quality"` with `formatValue={(v) => `${v}%`}`, controlled |
| `display-progress` | `Progress label="Upload" value={42}` |
| `display-meter` | `Meter label="Disk usage" value={68} formatValue` |
| `display-skeleton` | `Skeleton height={14} width="70%"` |
| `display-tooltip` | `Tooltip content="Booked revenue" delay={0}` around a focusable `<div testId="display-trigger">` |
| `display-readout` | `quality=<n>` |

Steps:

1. Click `display-quality` (sets focus and the value at the click point); press
   `right` and assert the value moved **up by the step** from whatever the click
   produced (read the readout before and after, do not assume a click value);
   press `left` and assert it returns. `a11y()` node role `Slider` has
   `label = "Quality"` and a `value` ending in `%`.
2. `a11y()`: `progressbar` node label `Upload`, value `42%`; `meter`node label
   `Disk usage`, value `68 GB` (the tokens/format path, not a literal).
3. `bounds("display-skeleton")` is non-null and its `paintedStyle`
   `backgroundColor` is present — the skeleton paints, it is not an empty div.
4. `hover("display-trigger")` → `paintedText()` contains `Booked revenue`; the
   tooltip content paints through the primitive's themed surface.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | add `"components"` to `CAPABILITIES` |
| `apps/playground/package.json` | add `"@gpuixui/primitives": "workspace:*"` |
| `apps/playground/src/scenarios/primitives.tsx` | new: the three scenarios above |
| `apps/playground/src/scenarios/index.ts` | import and append the three scenarios; add `"components"` to `CORE_CAPABILITIES` |
| `apps/playground/src/smoke/run.test.ts` | assert the registry covers `components` (the regression guard) |
| `apps/playground/README.md` | suite count `33 → 36`; a "Tier 1 components in the runtime" section with the measured facts and the theme-bridge note; structure line |
| `COMPONENTS.md` | Tier 1 evidence rows cite the three scenarios as the end-to-end native proof; suite count |
| `TODO.md` | tick "one fully working component running in GPUix"; add the `./examples` export ask (owner: primitives); update the playground progress bar |
| `.agents/slop/plans/README.md` | index this plan as landed |
| `.agents/slop/plans/140-gpuix-native-darwin-x64-build.md` | §4: `components` row of measured facts |

No change outside `apps/playground`, `packages/testing` and the ledgers. If a
primitive bug needs a fix in `packages/primitives`, record it in `TODO.md` and do
not edit that package.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `git merge master` | fast merge; the only conflicts are `TODO.md`, `COMPONENTS.md`, `.agents/slop/plans/README.md` (resolve by keeping both sides) |
| `nub install` | `@gpuixui/primitives` and `@gpuixui/icons` linked into `apps/playground/node_modules/@gpuixui`; the local `darwin-x64` binding in `apps/playground/node_modules/@gpuix/native` still present (if it is gone, re-run `sh apps/playground/scripts/build-native-binding.sh`) |
| `nub run --filter @gpuixui/testing test` | existing tests pass |
| `nub run --filter playground check-types` | no type error |
| `nub run --filter playground build` | `tsc` emits `dist/` |
| `nub apps/playground/dist/smoke/run.js --only primitives-actions` | green, exit `0` |
| `nub apps/playground/dist/smoke/run.js --only primitives-fields` | green, exit `0` |
| `nub apps/playground/dist/smoke/run.js --only primitives-display` | green, exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `36/36 scenarios passed`, `components=verified`, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proofs (both run, both recorded):**

1. Break one expectation the component owns — e.g. flip the disabled-button
   check to expect an activation — and the run must exit `1`, name the label,
   and report `components=failed`. Restore.
2. Remove the primitives `ThemeProvider` bridge from one view and the run must
   exit with the `MissingThemeProviderError` in the report (an `errored` check),
   proving the bridge is what makes the primitives paint. Restore.

## 5. STOP conditions

Stop and report with evidence if:

- **A published component does not import or mount under the playground's
  toolchain** (for example a `rootDir`, JSX-runtime or duplicate-React error).
  Record the exact error. Do not deep-import across the package boundary or copy
  the component's source into the playground; record the blocker in `TODO.md`
  and stop that scenario.
- **The primitives `ThemeProvider` cannot take the tokens `Theme`** without a
  cast. Record the type error; do not add `as` or `any`. The tokens/primitives
  boundary is owned by those packages.
- **A step's premise is wrong on 0.10.0** (a click on `Slider` focuses it, the
  loading button's description is absent, a disabled `Input` still accepts keys,
  `Select` items paint with a delay). Record what was measured, adjust the check
  to the **true** contract, and state the deviation in §8 and the README.
- **The full suite leaves focus or an overlay behind** so a later scenario
  fails. Record the ordering interaction; do not weaken later scenarios.
- **A change outside the two owned paths is required**: record it in `TODO.md`
  and do not edit it.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `primitives-actions` | native smoke | a `Button` that ignores click/keyboard, activates while disabled/loading, loses its focus ring, or a `Toggle` that does not announce its state |
| `primitives-fields` | native smoke | a controlled `Input` that drops the native edit or `onSubmit`, a disabled field that still edits, a `Checkbox`/`Switch` that does not move state or announce it, a `Select` that does not open/commit/dismiss |
| `primitives-display` | native smoke | a `Slider` keyboard value that is not clamped/stepped, a `Progress`/`Meter` value text that drifted from its formatted value, an unpainted skeleton, a tooltip that never opens |
| `scenarioProblems` | unit | the new `components` capability losing a scenario, or a duplicate id |
| two-direction runs (§4) | native smoke | the scenarios passing when a component contract is broken, or without the theme bridge |
| full suite | native smoke | the new views disturbing later scenarios (focus, timers, windows) |

## 7. Acceptance criteria

- Three scenarios registered under the new required `components` capability and
  **green on this host**; the suite is **36/36**, exit `0`.
- Both two-direction proofs were run and recorded in §8.
- The measured facts and any deviation are in plan `140` §4, the app README and
  `COMPONENTS.md`; `TODO.md` ticks "one fully working component running in
  GPUix" and records the `./examples` export ask.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome (executed on this host, 2026-10-17)

_To be filled when the plan runs._
