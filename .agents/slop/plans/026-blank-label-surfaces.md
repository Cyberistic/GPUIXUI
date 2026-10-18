# 026 — A blank label is not a name, on every remaining surface

| Field | Value |
| ----- | ----- |
| Phase | F (correctness / accessibility) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `057`, `058`, `071`, `072`, `073`, `084`, `089`, `093`, `396`, `399` |
| Status | done |

Self-contained: §0 the measured starting point, §1 the decision and its scope,
§2 the rule, §3 the files, §4 the commands, §5 the test plan and the
two-direction proof, §6 STOP conditions, §7 the outcome, §8 acceptance.

---

## 0. What is true before this plan (measured 2026-10-19)

Plan `396` established the rule for three surfaces: **a blank explicit label is
absent, not a name** — `Button`/`Toggle` fall back to their text children,
`ScrollArea` stays inert, and a real label is trimmed. Plan `399` applied the
same rule to `Icon`. Every other component that publishes a caller's `label`
still passes the raw string into `aria-label`, so the two consequences plan
`396` fixed remain:

1. **A documented default name is erased.** `Spinner`'s API table says
   `label` defaults to `"Loading"` (`docs/spinner.mdx:28`), but the default only
   applies when the prop is `undefined`. `<Spinner label="   " />` publishes
   `aria-label="   "`, so the status loses the name the page promises.
2. **A component that builds a name from the label builds a broken one.**
   `OTPField` names each cell `` `${label ?? "Code"} digit ${index + 1}` ``
   (`src/components/OTPField.tsx:127`), so a blank computed label yields
   `"   digit 1"`; `RangeSlider` builds `` `${props.label} minimum` `` /
   `" maximum"` (`src/components/Slider.tsx:290`), so a blank label yields
   `"   minimum"`. The group/cell/thumbs also carry the blank string itself.
3. **Every other named surface publishes an empty or padded name.** `Checkbox`,
   `Switch`, `Input`, `TextArea`, `NumberField`, `Progress`, `Meter`, `Slider`,
   `Rating`, `Select`, `InfoTip`, `ButtonGroup`, `CheckboxGroup`, `RadioGroup`,
   `ToggleGroup` and OTP's group all pass `props.label` through unmapped:
   `aria-label=""` or `aria-label="  Save  "`.

Evidence by reading the shipped source (paths above) and by the failing tests
this plan adds; §7 records the runtime observation. The existing suites never
pass a blank label to these components — `runtime/name.runtime.test.tsx` always
supplies a real one — which is why the class survived plans `396`/`399`.

## 1. The decision

**One rule, one helper, every surface: a caller label is a name only when it
says something.** A blank label is treated as absent; a real label is trimmed.
Two surfaces have a documented fallback and keep it: `Spinner` falls back to
`"Loading"`, and an OTP cell falls back to `"Code"`.

- The helper lives beside `usableLabel` in `src/components/internal.ts` and is
  not a root export (the contract test forbids render/part seams in the root;
  an internal label helper is not public API).
- Range thumbs keep the `<label> minimum` / `<label> maximum` composition when
  the label is usable, and carry **no** label when it is blank — the same
  outcome as omitting the prop today.
- Option/row labels that come from data (`RadioGroup.options[].label`,
  `ToggleGroup.options[].label`, `Select` options/groups) are names too: a blank
  data label is absent. The painted text is unchanged; this plan is about the
  accessibility name, not content.
- `aria-description` is a description, not a name, and is out of scope.

## 2. The rule

```ts
/** A caller's label as a name: trimmed, or absent when it says nothing. */
export const ariaName = (label: string | undefined): string | undefined =>
	Option.getOrUndefined(usableLabel(label));

/** A name with a documented default for a blank label. */
export const ariaNameOr = (
	label: string | undefined,
	fallback: string,
): string => pipe(usableLabel(label), Option.getOrElse(() => fallback));
```

Both are pure and reuse `usableLabel`, so whitespace-only, empty and padded
names resolve exactly as they already do for `Button`/`Toggle`/`ScrollArea`.

## 3. The files

Every edit below is inside `packages/primitives`.

| File | Change |
| ---- | ------ |
| `src/components/internal.ts` | Add `ariaName` and `ariaNameOr` next to `usableLabel`; import `pipe` only if not already imported. |
| `src/components/ButtonGroup.tsx` | `aria-label={ariaName(label)}`. |
| `src/components/Checkbox.tsx` | `aria-label={ariaName(props.label)}`. |
| `src/components/CheckboxGroup.tsx` | group and select-all parent use `ariaName(props.label)`; the row's data label uses `ariaName(option.label)`. |
| `src/components/InfoTip.tsx` | `aria-label={ariaName(label)}`. |
| `src/components/Input.tsx` | `fieldHostProps`: `"aria-label": ariaName(props.label)` (shared by `TextArea`). |
| `src/components/Meter.tsx` | `aria-label={ariaName(props.label)}`. |
| `src/components/NumberField.tsx` | `aria-label={ariaName(props.label)}`. |
| `src/components/OTPField.tsx` | group `aria-label={ariaName(props.label)}`; `otpCellLabel` uses `ariaNameOr(label, "Code")`. |
| `src/components/Progress.tsx` | `aria-label={ariaName(label)}`. |
| `src/components/RadioGroup.tsx` | group `ariaName(props.label)`; option `ariaName(option.label)`. |
| `src/components/Rating.tsx` | group `aria-label={ariaName(props.label)}`. |
| `src/components/Select.tsx` | resolve one `name = ariaName(label)` and use it for trigger and list; group heading and option use `ariaName(entry.label)` / `ariaName(choice.label)`. |
| `src/components/Slider.tsx` | single slider and range group use `ariaName(props.label)`; range thumb labels are built from `usableLabel` and are absent when it is blank. |
| `src/components/Spinner.tsx` | `aria-label={ariaNameOr(label, "Loading")}`. |
| `src/components/Switch.tsx` | `aria-label={ariaName(props.label)}`. |
| `src/components/ToggleGroup.tsx` | group `ariaName(props.label)`; item `ariaName(option.label)`. |
| `src/components/blank-labels.test.tsx` | New unit suite for `ariaName`/`ariaNameOr`; every component's blank/padded case lives in the element-tree suite that already owns its constructors (§5). |
| `runtime/blank-name.runtime.test.tsx` | New scoped runtime suite (§5). |
| `docs/spinner.mdx` | `label` row: blank falls back to `"Loading"`. |
| `docs/otp-field.mdx` | `label` row: blank falls back to `"Code"`. |
| `docs/slider.mdx`, `docs/range-slider.mdx` | `label` row: trimmed; a blank label names nothing (range thumbs then carry no name). |
| `docs/progress.mdx`, `docs/meter.mdx` | `label` row: trimmed; a blank label leaves the bar/meter unnamed. |
| `COMPONENTS.md` | Spinner, OTP Field, Slider, Range slider rows gain the plan-026 note; the accessible-name-matrix paragraph gains the class record. |
| `TODO.md` | Add the row under “Primitives workstream” and tick it; 137 → 138. |
| `PLAN.md` | Decision D44 in §4. |
| `.agents/slop/plans/README.md` | Index this plan in the `020–049` table. |

Do **not** touch `packages/tokens`, `packages/tw`, `packages/components`,
`apps/*` or `scripts/*`.

## 4. The commands

Run from `/Users/cyberistic/GPUIXUI/workspaces/primitives`.

```sh
# 1. offline: the new element-tree suite must fail before the fix
nub run --filter @gpuixui/primitives test -- src/components/blank-labels.test.tsx

# 2. after the fix: the same suite passes
nub run --filter @gpuixui/primitives test -- src/components/blank-labels.test.tsx

# 3. the whole offline suite (expected: 50 files + 1, all green)
nub run --filter @gpuixui/primitives test

# 4. types
nub run --filter @gpuixui/primitives check-types

# 5. the scoped runtime suite (never the full suite on this host)
cd packages/primitives && nub run test:runtime runtime/blank-name.runtime.test.tsx

# 6. the existing name matrix, to prove nothing regressed
cd packages/primitives && nub run test:runtime runtime/name.runtime.test.tsx

# 7. the icons package is untouched but cheap to confirm
nub run --filter @gpuixui/icons test
```

Expected: step 1 fails on the blank-label assertions (the current direction
publishes `""`, `"   minimum"` or `" digit 1"`); steps 2–7 pass. Record the
exact counts in §7.

## 5. The test plan

### 5.1 Offline suites (the rule, and one case per surface)

`src/components/blank-labels.test.tsx` holds the unit table for `ariaName` and
`ariaNameOr`. Each component's blank/padded case is added to the element-tree
suite that already owns that component's constructors, so the plan adds no
duplicate fixtures:

| Suite | Cases |
| ----- | ----- |
| `presentational.test.tsx` | `ButtonGroup` blank + padded; `Spinner` blank → `"Loading"` |
| `fields.test.tsx` | `Input` blank + padded; `TextArea` blank + padded (the shared `fieldHostProps`) |
| `NumberField.test.tsx` | blank + padded |
| `Meter.test.tsx`, `Progress.test.tsx` | blank + padded |
| `selection.test.tsx` | `Checkbox`, `Switch`, `RadioGroup` group/option, `CheckboxGroup` group/row |
| `Select.test.tsx` | trigger, list and option blank |
| `Slider.test.tsx` | `Slider` blank + padded; `RangeSlider` blank group and thumbs |
| `OTPField.test.tsx` | `otpCellLabel` blank/padded; group blank, cell fallback |
| `ToggleGroup.test.tsx` | group and item blank |
| `Rating.test.tsx` | group blank + padded |
| `InfoTip.test.tsx` | trigger blank + padded |

The two directions: with the helper in place the suites pass; the whole offline
run with the sixteen call sites reverted reports **18 failed / 702 passed** and
names every surface, including the three composed-name shapes (Spinner's lost
default, the OTP `" digit 1"`, the range `"   minimum"`). Restoring the call
sites returns **51 files / 720 tests** green.

### 5.2 Scoped runtime suite (`runtime/blank-name.runtime.test.tsx`)

Mount the surfaces whose accessibility name the runtime reports and read
`a11yNodes(runtime.a11y())` through the existing fixture (`Surface`,
`openWindow`). Keep the file to six cases, one per shape:

1. `<Spinner label="   " />` → a `Status` node named `Loading`.
2. `<OTPField label="   " />` → the first `TextInput` named `Code digit 1`.
3. `<RangeSlider label="   " />` → the thumb `Slider` nodes have no name
   (the old direction reports whitespace).
4. `<Progress label="   " value={42} />` → no name (the old direction reports
   whitespace or an empty name).
5. `<Checkbox label="   " />` → no name.
6. `<Select label="   " … />` → the combobox trigger has no name; after opening,
   the listbox has no name either. Reuse `openSelect`'s shape from
   `runtime/name.runtime.test.tsx`.

If the a11y dump cannot distinguish “absent” from `""` on this artifact, record
the exact dump in §7, keep the offline suite as the guard, and mark the runtime
case as the limitation rather than weakening it to pass. Do **not** re-baseline
the full runtime suite — the host's binding delta (plan `529`) still causes 111
unrelated failures across focus/geometry files.

### 5.3 Guards

No new source-scanning guard: the offline table already enumerates every
component with a caller `label`, and the existing export/contract tests keep the
surface stable. The test must not merely assert that `ariaName` works — it must
mount each component and read its host prop.

## 6. STOP conditions

Stop and report, without improvising, if:

- the scoped runtime file cannot build or open a window (binding missing) — fall
  back to the offline suite and record the limitation in §7; do not edit the
  full-suite expectations;
- a change to `aria-label` breaks an existing assertion for a **real** label —
  that means the helper trimmed something the docs promise verbatim; decide
  whether the docs or the test is wrong and record it, do not “fix” the test by
  removing the assertion;
- `ariaName` cannot be used in a wrapper because the prop is a GPUix part that
  rejects `undefined` — use `ariaName` on the host only and record the
  exception;
- the contract test (`src/contract.test.ts`) or the docs/export guard rejects a
  new file — add the page/record the guard asks for rather than deleting the
  test.

## 7. The outcome

Implemented 2026-10-19.

- **Source:** `ariaName`/`ariaNameOr` in `src/components/internal.ts`; sixteen
  component files now use them (ButtonGroup, Checkbox, CheckboxGroup, InfoTip,
  Input/TextArea's shared `fieldHostProps`, Meter, NumberField, OTPField,
  Progress, RadioGroup, Rating, Select, Slider/RangeSlider, Spinner, Switch,
  ToggleGroup).
- **Offline two-direction proof:** reverting the sixteen call sites produced
  **18 failed / 702 passed** across 12 files, naming every surface — including
  `Spinner`'s erased default, OTP's `" digit 1"` and the range thumbs. Restored:
  **51 files / 720 tests** green; `check-types` green.
- **Runtime two-direction proof (§5.2):** the scoped file is 6/6 green after the
  fix. On the reverted tree it failed 3/6 with the real dumps:
  `Status:""` for the blank spinner, no `TextInput:"Code digit 1"`, and the range
  thumbs named `['minimum','maximum']` (AccessKit trims the leading whitespace).
  The Progress/Checkbox/Select cases passed in the old direction because the
  a11y dump already trims whitespace — that is why the offline prop assertions
  are the durable guard for those three; the runtime cases still prove the
  resulting name is empty/no-name.
- **Existing matrix:** `runtime/name.runtime.test.tsx` 33/33 green.
- **Docs:** Spinner, OTP Field, Slider, Range slider, Progress and Meter pages
  state the resolved blank/trim behaviour; `COMPONENTS.md` records the class and
  the three composed-name outcomes; `PLAN.md` D44 records the decision.

## 8. Acceptance

- Every component that publishes a caller label uses one rule; a blank label is
  absent, a real label is trimmed, and the two documented fallbacks still work.
- `src/components/blank-labels.test.tsx` fails in at least three distinct
  directions on the pre-fix tree and passes after the fix.
- The scoped runtime suite passes (or its dump limitation is recorded with
  evidence).
- `nub run --filter @gpuixui/primitives test` and `check-types` pass;
  `runtime/name.runtime.test.tsx` still passes 33/33.
- Spinner/OTP/Slider/Range slider/Progress/Meter pages state the resolved
  behaviour; `COMPONENTS.md` has the plan-026 notes; `TODO.md` is ticked and
  `PLAN.md` records D44.
