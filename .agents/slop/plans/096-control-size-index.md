# 096 — The control size index and its narrowing guard

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:** 011,
016, 067, 068, 089 · **Touches:** `packages/tokens`, `docs/tokens.md`,
`packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`

## 1. The defect

`ControlSize = "sm" | "md" | "lg"` in `src/scale.ts` is the **last shipped union
with no ordered index and no narrowing guard**.

Plans 067 and 068 closed exactly this class of gap for every other union a consumer
narrows:

| Union | Index | Guard | Plan |
| ----- | ----- | ----- | ---- |
| `PlatformName` | `platformNames` | `isPlatformName` | 067 |
| `ThemeMode` | `themes` keys | `isThemeMode` | 067 |
| `ThemeContrast` | `themes`/`highContrastThemes` keys | `isThemeContrast` | 067 |
| `DensityName` | `densityNames` | `isDensityName` | 068 |
| `StatusTone` | `statusTones` | `isStatusTone` | 068 |
| **`ControlSize`** | **none** | **none** | **this plan** |

Consequences today:

1. A consumer that persists a component size (a table's row density setting, a
   toolbar's control size, a URL parameter) receives `unknown` and must retype
   `"sm" | "md" | "lg"` or cast — the exact failure plans 067/068 removed for the
   other five unions.
2. The package's own tests retype the union twice:
   `src/scale.test.ts:11` (`const sizes: readonly ControlSize[] = ["sm","md","lg"]`)
   and `src/styles.test.ts:21` (the same literal). Plan 068 removed an identical
   retyped preset list from `scale.test.ts`.
3. `docs/tokens.md` lists the three sizes only as table columns and a helper
   signature; nothing states that a stored size is a choice the package narrows,
   and no test requires a new size to appear in an index.

There is no runtime capability involved: this is pure data plus one predicate.
No GPUix API is touched, so there is no native-proof requirement.

## 2. Exact changes

### 2.1 `packages/tokens/src/scale.ts`

Replace the bare union with an index and a guard, in the package's established
style (`densityNames` / `isDensityName` at lines 108–122):

```ts
/**
 * Control sizes every interactive component supports, in documentation order.
 * `ControlSize` derives from this list, so a new size must also gain a value in
 * every density preset.
 */
export const controlSizes = ["sm", "md", "lg"] as const;

/** A control size accepted by every interactive component. */
export type ControlSize = (typeof controlSizes)[number];

/**
 * Narrow an unknown value — a stored preference or a URL parameter — to a
 * control size. A consumer never retypes the three names.
 */
export const isControlSize = (value: unknown): value is ControlSize =>
  controlSizes.some((size) => size === value);
```

Place it immediately **before** the `Density` interface (which uses
`ControlSize`), keeping the file's declaration order readable. Do not move
`densityNames`, `densityPresets`, or any existing export.

### 2.2 `packages/tokens/src/scale.test.ts`

- Import `controlSizes` and drop the local literal:

  ```ts
  import {
    avatarSize,
    controlSizes,
    densityNames,
    densityPresets,
    spacing,
    type DensityName,
  } from "./scale.js";
  ```

  Delete `const sizes: readonly ControlSize[] = ["sm", "md", "lg"];` and the now
  unused `type ControlSize` import.
- Use `controlSizes` in place of `sizes` in the two density ordering tests.
- Add one test to `describe("density presets")`:

  ```ts
  it("gives every size in the index a metric in every preset", () => {
    densityNames.forEach((preset) => {
      expect(Object.keys(densityPresets[preset].controlHeight).toSorted()).toEqual(
        [...controlSizes].toSorted(),
      );
      expect(
        Object.keys(densityPresets[preset].controlPaddingX).toSorted(),
      ).toEqual([...controlSizes].toSorted());
    });
  });
  ```

  This can fail: a fourth size added to `controlSizes` (or a preset record
  retyped with a stale key set) leaves a preset missing a metric, which is what
  `styles.ts` would then resolve to `undefined`.

### 2.3 `packages/tokens/src/styles.test.ts`

- Import `controlSizes` from `./scale.js` and delete the local
  `const sizes: readonly ControlSize[] = ["sm", "md", "lg"];` (line 21). Keep the
  `type ControlSize` import only if still referenced; otherwise drop it.
- Replace every use of `sizes` with `controlSizes`.

### 2.4 `packages/tokens/src/persisted-choices.example.ts`

Add a third executed choice beside the density and tone ones:

```ts
import {
  controlSizes,
  extendTheme,
  isControlSize,
  isDensityName,
  isStatusTone,
  type ControlSize,
  type DensityName,
  type StatusTone,
  type Theme,
} from "./index.js";

const fallbackControlSize: ControlSize = "md";

/**
 * Resolve a stored control size. A value the library does not ship — an older
 * size name, a hand-edited settings row — keeps the default.
 */
export const resolveControlSize = (value: unknown): ControlSize =>
  isControlSize(value) ? value : fallbackControlSize;
```

Keep the existing exports and their documentation intact. `controlSizes` is not
needed in this file unless the fallback is expressed as `controlSizes[1]`;
prefer the explicit `"md"` typed as `ControlSize` so the fallback reads as a
decision.

### 2.5 `packages/tokens/src/guards.test.ts`

- Extend the header comment by one clause: plan 096 closed the same gap for the
  last union, `ControlSize`, so a stored component size narrows through the
  package too.
- Import `controlSizes`, `isControlSize` and `resolveControlSize`.
- Add:

  ```ts
  describe("isControlSize", () => {
    it("accepts every size the package ships", () => {
      expect(controlSizes).toEqual(["sm", "md", "lg"]);
      controlSizes.forEach((size) =>
        expect(isControlSize(size), size).toBe(true),
      );
    });

    it("rejects casing, whitespace, aliases and non-strings", () => {
      ["", "SM", "Md", "medium", "large", "md ", "xsmall", ...nonStrings].forEach(
        (value) => expect(isControlSize(value), String(value)).toBe(false),
      );
    });
  });
  ```

- Extend `describe("persisted choices")` with:

  ```ts
  it("resolves a stored size to a shipped one", () => {
    expect(resolveControlSize("lg")).toBe("lg");
    expect(resolveControlSize("large")).toBe("md");
  });
  ```

### 2.6 `docs/tokens.md`

Only two edits. Do not restructure the Density section.

1. In `## Density`, after the `densityNames` paragraph paragraph and its
   `isDensityName` example, add:

   > `controlSizes` lists the three control sizes a component accepts — `sm`,
   > `md`, `lg` — in documentation order, and `ControlSize` derives from it.
   > A stored size is `unknown` like any other choice:
   >
   > ```ts
   > import { isControlSize, type ControlSize } from "@gpuixui/tokens";
   >
   > const resolveSize = (stored: unknown): ControlSize =>
   >   isControlSize(stored) ? stored : "md";
   > ```

2. In `## Theme API`, extend the narrowing sentence (currently "…and
   `isDensityName(value)` to a preset. A tone from a payload is the same kind of
   choice and narrows with `isStatusTone(value)`.") so it also names
   `isControlSize(value)` for a stored component size, e.g. append: "A stored
   component size narrows with `isControlSize(value)`."

Both names are auto-required by `docs.test.ts`'s "names every value the package
exports" guard, but the sentence is what a reader needs.

### 2.7 `packages/tokens/README.md`

In `## Persisted choices`, extend the guard list and the example import:

- list `isControlSize` beside `isPlatformName`, `isThemeMode`,
  `isThemeContrast` and `isDensityName`;
- add one line to the example:

  ```ts
  const size = isControlSize(storedSize) ? storedSize : "md";
  ```

Keep the section's existing length in check: this is a one-sentence, one-line
addition, not a new section.

### 2.8 `COMPONENTS.md`

In the *Design tokens* row's notes, in the clause that names the narrowing
guards, add `isControlSize`. Do not change the status (`wip` stays: native visual
proof of the newest roles is still owned by `playground`).

### 2.9 `TODO.md`

Under **Design tokens and theming (`tokens-theme`)** add the finished task and
tick it, and update the progress fraction `63/82` → `64/83`:

```
`[x]` Close the last numbered union — `controlSizes` / `isControlSize` — so a
stored control size narrows through the package, and the two test files stop
retyping `"sm" | "md" | "lg"` (plan 096)
```

## 3. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`),
in this order.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test` | 33 files, all green; the count rises by the new assertions (~1618) |
| 2 | `nub run --filter @gpuixui/tokens check-types` | exit 0, no output |
| 3 | `nub run lint` | exit 0 |
| 4 | `nub run fmt` | exit 0 (run `nub run fmt:fix` first if formatting drifted) |
| 5 | `nub run check` | exit 0 |
| 6 | `nub run test` | exit 0 |

If the workspace has unrelated failures in another package at step 6, record the
package and the failure in the commit message; do **not** edit outside this
workstream's paths.

## 4. Test plan — proof in both directions

1. **Guards.** `isControlSize` accepts every member of `controlSizes` and rejects
   `""`, `"SM"`, `"Md"`, `"medium"`, `"large"`, `"md "`, `"xsmall"` and every
   non-string in `nonStrings`. Prove it fails without the fix: the import does not
   exist, so the suite fails to compile/run — capture that once by reverting the
   `scale.ts` addition locally with `git stash` of the source only, or by writing
   the test first and running it before the implementation.
2. **Preset coverage.** `scale.test.ts`'s new test fails if a size is added to
   `controlSizes` without a metric in a preset, or a preset record keeps a stale
   key. Prove it: temporarily add `"xl"` to `controlSizes` and observe the test
   fail, then revert.
3. **Persisted path.** `resolveControlSize("large")` returns `"md"` so the
   fallback path runs in the suite rather than being sketched.
4. **Documentation.** `docs.test.ts` fails if `controlSizes` or `isControlSize`
   is absent from `docs/tokens.md` (the public-value coverage test), and the
   Theme API sentence keeps the guard list complete.

## 5. STOP conditions

Stop and report, do not improvise, if:

- `nub run --filter @gpuixui/tokens test` fails for a reason that is **not**
  explained by the edits above (e.g. a shipped theme's contrast figures differ
  from the documented ones) — that is another plan's defect, not this one's;
- `scale.ts` already exports `controlSizes`/`isControlSize` in any form (the
  work is done or half-done by another writer — reconcile instead of duplicating);
- the `ControlSize` union is referenced in a package **outside** this workstream
  in a way that would need editing to compile (record it as a cross-team row in
  `TODO.md`; do not edit that package);
- any step needs `any`, a cast, or a retyped union to pass.

## 6. Acceptance

- `controlSizes` and `isControlSize` are exported from `@gpuixui/tokens` and
  documented in `docs/tokens.md` and `packages/tokens/README.md`.
- No file in `packages/tokens` retypes the three size literals except
  `scale.ts` itself (the index).
- All gates in §3 pass, and the exact commands were run — not assumed.
- `TODO.md` and the plan index are updated, and the work is committed on
  `agent/tokens-theme` and pushed.

## 7. Outcome (executed on this host, 2026-10-17)

- `src/scale.ts` now exports `controlSizes = ["sm", "md", "lg"] as const`,
  derives `ControlSize` from it, and exports `isControlSize`. The declaration
  sits immediately above `Density`, which consumes `ControlSize`.
- `src/scale.test.ts` and `src/styles.test.ts` no longer retype the union: both
  consume `controlSizes`. `scale.test.ts` gained the preset-coverage test.
- `src/persisted-choices.example.ts` exports `resolveControlSize`, and
  `guards.test.ts` covers the guard, the fallback and the preset index.
- `docs/tokens.md` names `controlSizes` / `isControlSize` in the Density section
  with a runnable narrowing example and adds the guard to the Theme API
  sentence; `packages/tokens/README.md` adds it to the persisted-choice list and
  example; `COMPONENTS.md`'s Theme extension row lists it.
- Two-direction proof:
  - **without the guard**: the suite cannot compile, because `guards.test.ts`
    imports `isControlSize` and `resolveControlSize`;
  - **index without metrics**: adding `"xl"` to `controlSizes` failed **5**
    tests in `src/scale.test.ts`, including
    `expected [ 'lg', 'md', 'sm' ] to deeply equal [ 'lg', 'md', 'sm', 'xl' ]`
    and the three density-ordering assertions resolving `undefined`; the index
    was restored immediately;
  - restored, the package suite is green: **33 files, 1616 tests** (1612 + 4
    new assertions).
- `nub run check`, `nub run lint`, `nub run fmt` and `nub run test` all pass.

## 8. Acceptance

- [x] `controlSizes` and `isControlSize` are exported and documented in both
      places.
- [x] The two test files stop retyping the three size literals.
- [x] The preset-coverage test fails when a size joins the index without a
      metric.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
- [x] The plan index row is marked done and the `TODO.md` row is ticked.

