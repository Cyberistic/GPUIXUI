# 352 — The Tier 1 both-theme matrix

**Phase:** F (integration and polish) · **Owner:** primitives · **Block:** free
(`300–399`) · **Depends on:** 030, 041, 042, 055, 090, 203, 351

## 0. Why

`MISSION.md` requires: *"Verify every component in both themes."* The package
has three partial answers and no guard:

- `runtime/theme.runtime.test.tsx` paints a **seven-component scene** in dark
  (Checkbox, Switch, RadioGroup, Progress, Skeleton, Spinner, Separator) plus a
  three-component light/dark switch scene (Text, Button, Input).
- every component suite asserts roles against the deterministic
  `testFixture` theme, not against the two **shipped** palettes;
- `COMPONENTS.md` says "Both themes (021/042)" but names one scene, and the
  inventory lists 31 public components.

So **19 of the 31 components have no both-themes evidence**, and nothing stops
a future component (or a new branch in an existing one) from painting a
hard-coded colour. This package currently contains no colour literals
(`rg '#[0-9A-Fa-f]{6}' packages/primitives/src | grep -v test` → empty) — this
plan is the guard that keeps it that way, and the evidence the inventory cites.

**This is not a new capability.** No component API changes. The deliverable is
one runtime suite plus the records that cite it.

## 1. The invariant

For each of the 31 public components, rendered in its smallest honest shape:

1. it **mounts** under both shipped palettes (`lightTheme`, `darkTheme`);
2. every colour the runtime applied **inside the case** is a value of the
   active palette (`theme.colors`), so no role outside the theme and no literal
   can reach the paint;
3. if the case paints any colour, the case's colour set in dark **differs**
   from its set in light — the theme genuinely reached it, which a hard-coded
   literal (equal in both) fails;
4. a case that declares it paints **no** colour (only `Spacer`) is exempt from
   (3) and asserts nothing foreign appears anywhere in its tree.

Colours are compared with the existing `rgbOf` helper, so a lifted-alpha value
still matches its role.

## 2. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/runtime/theme.ts` | add `subtreeColours(runtime, testId)` — the colours of `testId` and its descendants. `paintedColours` (whole frame) stays for the existing suites. |
| `packages/primitives/runtime/theme-matrix.runtime.test.tsx` | **new** — the 31-case table, run in both palettes. |
| `packages/primitives/README.md` | §"Runtime" counts and a line naming the matrix. |
| `COMPONENTS.md` | the "Both themes (021/042)" paragraph cites the matrix and its case count. |
| `TODO.md` | one ticked row under the primitives section. |
| `.agents/slop/plans/README.md` | the plan row, `done`. |

Do **not** edit `packages/primitives/src/**` unless a case finds a real defect
(§5). Do not touch another workstream's paths.

## 3. The case table

One entry per public component; the root wrapper is a bare `Box` with
`testId="case"` (no tone, so it paints nothing of its own).

| Case | Smallest honest shape |
| ---- | --------------------- |
| `Box` | `<Box tone="background" padding="md" />` |
| `Grid` | two boxes in `<Grid columns={2} />` |
| `Stack` | `<Stack gap="sm"><Text role="body">…</Text></Stack>` |
| `Separator` | `<Separator orientation="horizontal" label="Advanced" />` |
| `Spacer` | a row `Stack` with a `Text`, the `Spacer`, a `Text` — **paints: false** |
| `ScrollArea` | `<ScrollArea label="Log" style={{ height: 120 }}>` with a `Text` |
| `Text` | `<Text role="body">Settings</Text>` |
| `Label` | `<Label>Email</Label>` |
| `Button` | `<Button variant="primary">Save</Button>` |
| `IconButton` | `<IconButton label="Close" variant="primary">` + `check` icon |
| `ButtonGroup` | attached, two `Button`s |
| `Toggle` | `<Toggle pressed>Bold</Toggle>` |
| `ToggleGroup` | `type="single" value="a"` with two options |
| `Input` | `<Input label="Name" placeholder="Name" />` |
| `NumberField` | `<NumberField label="Count" defaultValue={2} />` |
| `OTPField` | `<OTPField label="Code" length={4} />` |
| `TextArea` | `<TextArea label="Notes" />` |
| `Checkbox` | `<Checkbox checked label="Enable" />` |
| `CheckboxGroup` | one row, `value={["a"]}`, two options |
| `Switch` | `<Switch checked label="Notify" />` |
| `RadioGroup` | `value="a"`, two options |
| `Progress` | `<Progress value={40} label="Uploading" />` |
| `Rating` | `<Rating value={3} label="Quality" />` |
| `RangeSlider` | `value={{ start: 20, end: 60 }}`, `style={{ width: 200 }}` |
| `Slider` | `value={40}`, `style={{ width: 200 }}` |
| `Meter` | `value={40}` in a labelled range |
| `Skeleton` | `<Skeleton width={80} height={12} />` |
| `Spinner` | `<Spinner label="Working" />` |
| `Select` | `value="a"`, two options (closed — its list is not painted) |
| `Tooltip` | a closed `Tooltip` around a `Button` (the trigger paints) |
| `InfoTip` | `<InfoTip content="…" label="What this is" />` (tip closed) |

`ThemeProvider` is not a row: it supplies the palette and is the harness, not a
painted component. The existing `src/contract.test.ts` already fixes the public
component set; if a component is added there and missing here, the matrix must
grow — see §6.

## 4. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/primitives
nub run --filter @gpuixui/primitives test:runtime
```

Expected: the new file reports **32 passing tests** (one per component, each
mounting both palettes in its own two windows, plus the parity test) and the
suite total rises from 422 to **454**; exit `0`; no other file changes status.
Measured wall time 77–129 s on this host, versus 62 s before — the matrix is the
largest addition to the opt-in native suite.

```sh
nub run --filter @gpuixui/primitives check-types
nub run --filter @gpuixui/primitives test
```

Expected: type-check clean; the offline suite is unchanged at **574** (this
plan adds no `src/**` test).

## 5. Test plan — proving the guard can fail

Run each mutation, observe the named failure, revert.

1. **A literal colour.** In `Spinner.tsx`, change the lit dot's colour to
   `"#FF0000"`; expect the `Spinner` case to fail in *both* palettes with
   `#FF0000` reported as foreign. Revert.
2. **A component that ignores the theme.** In `Skeleton.tsx`, replace the muted
   role with the literal `lightTheme.colors.muted` value; expect the
   `Skeleton` **dark** case to fail (light set equals dark set / foreign in
   dark), while the light case passes. Revert.
3. **A case that paints nothing.** In `Text.tsx`, delete the `color` from its
   style; expect the `Text` case to fail the liveness assertion by name.
   Revert.
4. **Coverage drift.** Add a temporary export to `src/components/index.ts` with
   no matrix case; expect the file's parity check (§6) to fail naming it.
   Revert.

Record the four observed failure messages in §7.

## 6. Parity, not a hand-written list

The matrix table carries every public component name. A separate test in the
same file reads the package's **real exports** (`import * as Primitives from
"../src/index.js"`, then the PascalCase keys minus `ThemeProvider` and
`MissingThemeProviderError` — the same reading `src/exports.test.ts` uses) and
asserts the table names exactly that set in both directions: a new export with
no case fails, and a stale or misspelled case name fails because it is not an
export. A new component therefore fails the matrix until it is added — the class
of drift plan `092` fixed for the examples registry.

Implementation note: the first draft of this section proposed a raw source
scan. The namespace import is the honest form here — the assertion is set
equality against the real module, so a typo cannot pass, and a component the
package does not export cannot be listed.

## 7. Outcome

- `nub run --filter @gpuixui/primitives test:runtime` — **25 files, 454 tests,
  all passing** (was 24 / 422): 31 cases × 2 palettes + 1 parity test.
- One window per case, as `runtime/fixture.tsx` requires. A combined
  one-tree-per-palette draft was measured to **hang** the renderer; it was
  abandoned rather than debugged, and the per-case form costs ~15 s on the
  suite.
- Mutations observed, each reverted after the run:
  1. `Spinner` dot forced to `#FF0000` → `Spinner paints only palette colours in
     both palettes` failed, the other 31 cases passed.
  2. `Skeleton` painted the literal light `muted` (`#F3F4F6`) → the same case
     failed (dark case: foreign + identical sets).
  3. `Text`'s `color` removed → `Text`, and the three cases that contain a
     `Text` (`Stack`, `ScrollArea`, `Label`), failed on
     `expected 0 to be greater than 0`.
  4. A temporary `BoxExtra` export → `covers every public component` failed,
     naming `"BoxExtra"`.
- Component defects found: **none** — the package had no colour literals, which
  is the invariant this guard now holds. No `src/**` change shipped.

## 8. STOP conditions

- Stop and report if a case paints a colour that is **not** in the palette and
  is not a component literal — e.g. a platform default the runtime supplies.
  Record the exact element and value; do not add it to the palette.
- Stop if two palettes legitimately produce the **same** colour set for a case
  that does not inherit its paint from a child. Record why and mark the case
  `paints: false` only if the component genuinely paints nothing; never weaken
  (3) for a case that paints.
- Stop if the parity scan cannot distinguish components from non-component
  exports; report the source shape rather than hand-maintaining the list
  silently.

## 9. Acceptance

- 31 cases × 2 palettes green, plus the parity test.
- Every failure direction in §5 observed and recorded.
- `README.md`, `COMPONENTS.md`, `TODO.md` and the plan index cite the matrix
  and agree on the counts.
- `nub run check`, `nub run lint`, `nub run test` and
  `nub run --filter @gpuixui/primitives test:runtime` all green.
