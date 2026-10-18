# 545 — Applying the same platform style twice appends its label twice

**Status (2026-10-18).** Done. One helper, `appliedStyleName`, appends a label
only when the name does not already end with it; `applyPlatformStyle` and the
deprecated `platformTheme` bridge both use it. A probe confirmed the second
application of a shipped style differed from the first in `name` alone, so no
other field moved. `applied-style-name.test.ts` (five cases) fails on the pre-fix
append in every case, the executed `acmeWindowsReapplied` example runs in
`applied-level.test.ts`, and the catalogue, README and design system state the
rule with a `docs.test.ts` guard. The package suite is 131 files / 5639 tests
green, and `check`, `lint` and `test` pass.

**Workstream:** `tokens-theme`. **Phase:** F (extension truth).
**Depends on:** 371 / 373 / 374 (applied palettes and composition), 541 (the
palette decides the name), 524 / 543 (the plan index and the contract's
owners).
**Files:** `packages/tokens/src/theme.ts`,
`packages/tokens/src/applied-level.example.ts`,
`packages/tokens/src/applied-level.test.ts`,
`packages/tokens/src/applied-style-name.test.ts` (new), `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`,
`packages/tokens/src/docs.test.ts`, `COMPONENTS.md`, `TODO.md`,
`.agents/slop/plans/README.md`.

## 1. The defect

`platformOverrides` names its result `${palette.name} · ${label}`. When the
base already declares the requested level, plan 373 / 541 keep the base as the
palette — deliberately, so a consumer's edits survive — and the palette's name
is therefore the **already applied** name. A second application appends the
label again:

```ts
const once = getPlatformTheme("win32", "light"); // "Light · Windows"
const twice = applyPlatformStyle(once, platformStyles.win32);
// twice.name === "Light · Windows · Windows"
```

Probed on the merged tree: `once` and `twice` are **deep-equal in every field
except `name`**. So `applyPlatformStyle` is already idempotent in colour,
geometry, density, motion, elevation, declaration and level; only the display
name drifts. That makes it a bounded defect with a single cause, not a
composition problem. `platformTheme`, the deprecated font bridge, shares the
same append and repeats it identically.

The documented promise it breaks is on three pages:

- `packages/tokens/README.md`: “The result's name always names the palette it
  carries, because a preview prints it.”
- `docs/design-system.md`: “the theme's name always names the palette it
  carries.”
- `docs/tokens.md`: “The name always follows the palette”.

`"Light · Windows · Windows"` names no palette the package ships. It reaches a
consumer through the documented path: restore a persisted platform choice over
a theme that already carries it, or apply a style in a settings panel that
keeps the current theme as its base. Nothing about the theme is wrong except
what a preview prints — but the preview is exactly why the name exists
(`Theme.name` is documented as “used by previews and diagnostics”).

## 2. The rule to state

**A name never appends the label it already ends with.** A theme whose name
already ends with ` · <label>` belongs to that style, so applying it again is a
no-op on every field, the name included.

- The check is the label being applied, not a registry of known labels. A
  copied style is owned by the consumer and its label is arbitrary; re-applying
  it must be idempotent too.
- A **different** style still appends its own label, once: Windows → macOS
  reads `Light · Windows · macOS`. That is honest provenance — the applied
  style names only part of its palette (plan 374), so the previous platform's
  unnamed roles survive and the chain records the composition. The rule only
  forbids repeating the label that is already the suffix.
- Both entry points that name an applied style use one helper:
  `applyPlatformStyle` and the deprecated `platformTheme` bridge, which
  promises “only the families and the name change” and currently lets its name
  grow on every call.

Rejected alternatives:

- **Strip every known style label from the base name.** It would make
  Windows → macOS → Windows read `Light · Windows`, which hides that macOS's
  unnamed roles are still in the palette; it also cannot recognise a copied
  style's label, so the documented copy-and-own path would stay broken.
- **Rebuild the name from the identity.** It erases a brand base's name
  (`Acme · Windows` is a tested, documented contract) and the consumer's edits
  plan 373 keeps.
- **Add platform provenance to `Theme`.** Plan 374 rejected a
  `platformStyle?: PlatformStyle` field as a public type/axis change for a
  corner the data fixes; a name suffix needs no new axis.
- **Do nothing because it is cosmetic.** `Theme.name` is the label a preview
  prints and a diagnostic reports; printing a palette that does not exist is
  the same class of falsehood plans 301 / 541 removed from the level
  declaration.

## 3. Exact changes

### 3.1 `packages/tokens/src/theme.ts` — one helper, two call sites

Add above `platformOverrides` (after `platformElevation`):

```ts
/**
 * A palette's name with a style's label, once. A name that already ends with the
 * label belongs to that style already, so re-applying a stored choice keeps the
 * name a preview prints instead of appending the label again.
 */
const appliedStyleName = (paletteName: string, label: string): string =>
  paletteName.endsWith(` · ${label}`)
    ? paletteName
    : `${paletteName} · ${label}`;
```

In `platformOverrides`, replace `name: `${palette.name} · ${label}`,` with
`name: appliedStyleName(palette.name, label),`.

In `platformTheme` (the deprecated bridge), replace
`name: `${base.name} · ${label}`,` with
`name: appliedStyleName(base.name, label),`.

Extend the `applyPlatformStyle` JSDoc after the level bullets with one
sentence:

> Applying a style the result already ends with is a no-op on every field,
> the name included: a stored choice re-applied on startup keeps
> `Light · Windows` instead of printing `Light · Windows · Windows` (plan
> `545`).

Do not touch `platformOverrides`' level, palette, colour, elevation or
declaration decisions. The probe in §4.1 says the name is the only field that
differs, so no shipped value may move.

### 3.2 `packages/tokens/src/applied-level.example.ts` — the executed path

The example already exports `acmeWindows` (a brand base with the Windows
style). Add, after it:

```ts
/** The same style applied again is the same theme, name included. */
export const acmeWindowsReapplied = applyPlatformStyle(
  acmeWindows,
  platformStyles.win32,
);
```

Keep the header comment; add one clause to it: “Re-applying the style the
result already carries changes nothing, so a settings panel or a restored
choice can apply the platform over the current theme.”

### 3.3 `packages/tokens/src/applied-style-name.test.ts` — new regression suite

Header comment, stating the bug:

> Guards the defect plan 545 fixes: `applyPlatformStyle` named its result
> `${palette.name} · ${label}`, and a same-level base keeps its own name, so
> applying the style a theme already carried appended the label again —
> `"Light · Windows · Windows"` — for a palette the package does not ship.
> Every other field of the second application was already equal to the first.
> This file fails without the fix.

Cases (each must be able to fail):

1. **Every shipped style is idempotent.** Iterate
   `Object.entries(platformStyles)` and `Object.entries(platformRecipes)`;
   for each `themeModes` × `themeContrasts`, build
   `once = applyPlatformStyle(getTheme(mode, contrast), style)` and assert
   `applyPlatformStyle(once, style)` `toEqual(once)` with a
   `label mode contrast` message. The deep equality is the regression: before
   the fix it fails on `name`; after it, it proves nothing else drifts.
2. **A copied style is idempotent.** Use
   `contosoDensityPlatformStyle` from
   `platform-extension.example.ts` (the documented copy-and-own shape), apply
   it to `getTheme("light")` twice, and assert deep equality and
   `name === "Light · Contoso desktop"`.
3. **A brand keeps its name and gains the label once.** `createTheme({ mode:   "light", name: "Acme" })` applied with Windows is `"Acme · Windows"`, the
   second application is the same theme, and the base object is untouched.
4. **A different style appends its own label once.** Windows then macOS is
   `"Light · Windows · macOS"`, re-applying macOS changes nothing, and applying
   Windows again yields `"Light · Windows · macOS · Windows"` (provenance is
   kept; only the repeated suffix is refused) — then a second Windows changes
   nothing. This case states the rule's other direction so a future
   “strip every label” change cannot pass silently.
5. **The deprecated bridge is idempotent.** `platformTheme(platformTheme(
   getTheme("dark"), "win32"), "win32")` deep-equals the once-applied theme and
   is named `"Dark · Windows"`.

Import the axes from their owners (`themeModes`, `themeContrasts`,
`platformStyles`, `platformRecipes`) — never retype the unions.

### 3.4 `packages/tokens/src/applied-level.test.ts` — run the example

In `describe("the copyable example")`, import `acmeWindowsReapplied` from
`./applied-level.example.js` and assert:

```ts
expect(acmeWindowsReapplied.name).toBe("Acme · Windows");
expect(acmeWindowsReapplied).toEqual(acmeWindows);
```

### 3.5 `docs/tokens.md` — the applied-theme paragraph

After “The name always follows the palette — a rebased palette brings the
identity's name, because the result is that identity at the requested level —
and so does the elevation's opacity …”, add:

> Applying the style a theme's name already ends with changes nothing — no
> field, and not the name — so a settings panel or a restored choice can
> re-apply the platform over the current theme without printing
> `Light · Windows · Windows`. A different style appends its own label once,
> because it names only the roles it owns (plan `545`).

Keep every other sentence and figure.

### 3.6 `packages/tokens/README.md` — the front door

After “The result's name always names the palette it carries, because a preview
prints it.”, add:

> Re-applying the style a theme already ends with is a no-op on every field, the
> name included (plan 545), while a different style appends its own label
> because the palette keeps the roles the first style did not name.

### 3.7 `docs/design-system.md` — the extension paragraph

Replace “and the theme's name always names the palette it carries.” with
“and the theme's name always names the palette it carries and never appends the
label it already ends with — re-applying that style changes nothing, while a
different style appends its own label because the unnamed roles survive.”

### 3.8 `packages/tokens/src/docs.test.ts` — hold the claim in three documents

Add a case beside `it("states the name and elevation consequences")` in
`describe("the applied level's documents")`:

```ts
expect(markdownProse).toContain(
  "Applying the style a theme's name already ends with changes nothing",
);
expect(designSystem).toContain("never appends the label it already ends with");
expect(readmeProse).toContain(
  "Re-applying the style a theme already ends with is a no-op",
);
```

The existing assertions stay. A reverted document fails the case.

### 3.9 `COMPONENTS.md` — the Theme extension row

Append one clause to the *Theme extension* row after the level sentence:

> Re-applying a style a theme already carries is a no-op — the name never
> repeats the label it ends with, so a restored choice or a platform toggle over
> the current theme cannot print `Light · Windows · Windows` (plan 545).

No other row changes: no colour, pair, floor, metric, platform style or recipe
moves.

### 3.10 `TODO.md` and the plan index

- Add a ticked row under *Design tokens and theming (`tokens-theme`)* describing
  the unit and citing plan 545; update the section fraction from `208/274` to
  `209/275`.
- Add `| [545](./545-applied-style-name-idempotence.md) | Applying a platform
  style twice appends its label twice | F | 371, 373, 374, 541 | done |` to the
  `tokens-theme` table and a summary paragraph in the index tail, in the same
  voice as 544.

## 4. Test plan — prove both directions

### 4.1 Baseline probe (run for this plan)

A throwaway `src/zz-probe.test.ts` on the merged tree built
`once = getPlatformTheme("win32", "light")` and
`twice = applyPlatformStyle(once, platformStyles.win32)`, compared every own
key and printed:

```
once: Light · Windows   twice: Light · Windows · Windows
diffs: [["name", "\"Light · Windows\"", "\"Light · Windows · Windows\""]]
```

The probe file is deleted before the commit.

### 4.2 The regression case fails without the fix

1. `cd packages/tokens && nub run --filter @gpuixui/tokens test` before any
   edit → green (baseline).
2. Add only `applied-style-name.test.ts` → `nub exec vitest run
   src/applied-style-name.test.ts` fails on case 1 with
   `expected 'Light · Windows · Windows' to be 'Light · Windows'` (or the deep
   equality naming `name`), before any source edit. Record the output.
3. Apply §3.1 → the same command passes; all 24 shipped style × mode ×
   contrast compositions are deep-equal on the second application.
4. Revert `appliedStyleName` to the old interval append locally → the case
   fails again; restore.

### 4.3 The document guards can fail

- Change “changes nothing” in `docs/tokens.md`'s new sentence → the new
  `docs.test.ts` case fails.
- Change “never appends the label it already ends with” in the design system →
  the same case fails.
- Restore both.

## 5. Commands and expected results

```sh
cd packages/tokens
nub exec vitest run src/applied-style-name.test.ts   # 5 cases pass
nub exec vitest run src/applied-level.test.ts        # the example case passes
nub exec vitest run src/docs.test.ts                 # the document case passes
nub run --filter @gpuixui/tokens test                # full package suite green
cd ../..
nub run check                                         # check:tests, lint, fmt, types
nub run lint
nub run test                                          # workspace gate
```

Expected: the package suite gains one file and five cases; every other suite
passes with unchanged assertions and values; the three gates exit `0`.

## 6. STOP conditions

Stop and report rather than improvising if:

- the deep-equality case fails on a field **other than `name`** after §3.1.
  That would mean a second application already moved a value (a composition
  defect, not a name defect): record the field and both values in this plan
  before changing anything.
- a shipped theme's name changes on its **first** application (the
  `shippedThemes` names asserted across `applied-level.test.ts`,
  `platform-table.test.ts` and the docs). The fix must only suppress a repeated
  suffix.
- a document would need to state a figure or a pair; this unit moves no colour,
  pair, floor or metric, and a new figure belongs in `figures.ts`.
- a change outside the files in this plan's header seems necessary. Cross-team
  work goes to `TODO.md` as a row; never edit another workstream's tree.
- a gate fails for a pre-existing reason; record it and stop instead of
  “fixing” another workstream.

## 7. Acceptance criteria

- `applyPlatformStyle(applyPlatformStyle(base, style), style)` deep-equals
  `applyPlatformStyle(base, style)` for every shipped style and recipe at every
  mode and contrast.
- A copied style and the deprecated `platformTheme` bridge are idempotent too.
- A brand base keeps its name, and a different style appends its label once;
  both directions are asserted.
- The three documents state the rule and `docs.test.ts` fails without them.
- No colour role, pair, floor, metric, platform style, recipe or shipped theme
  name changes; `themeFailures` still returns `[]` for all 24 shipped sets.
- `nub run check`, `nub run lint` and `nub run test` pass.
- The plan is indexed, the `TODO.md` row is ticked and counted, the example
  runs in a suite, and the commit is pushed on `agent/tokens-theme`.

## 8. Rollback

Revert the commit. Nothing in the palette, a metric or the contract moved, so a
revert restores only the repeated label and the three sentences that describe
it.
