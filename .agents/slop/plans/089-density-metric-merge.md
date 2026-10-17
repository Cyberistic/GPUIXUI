# 089 — Density metrics merge by size

| Field | Value |
| ----- | ----- |
| Phase | B/F (extension mechanism) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `011` (package), `068` (density guard), `070` (extension claims) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`docs/tokens.md` tells a consumer that `density` accepts "a preset name or
partial metrics", and `ThemeOverrides.density` is typed
`DensityName | Partial<Omit<Density, "name">>`. That is **not** partial metrics:

```ts
type Density = {
  readonly controlHeight: Readonly<Record<ControlSize, number>>;
  readonly controlPaddingX: Readonly<Record<ControlSize, number>>;
  readonly rowHeight: number;
};
```

`Partial<Density>` makes each *field* optional, not the record inside it. A
consumer who wants one taller control must write all three sizes:

```ts
extendTheme(theme, {
  density: { controlHeight: { sm: 28, md: 34, lg: 36 } }, // retyped
});
```

and if they write only `{ md: 34 }` TypeScript rejects it. The runtime merge is
equally shallow:

```ts
return { ...base, ...override, name: base.name };
```

so even a forced full-record override replaces `controlPaddingX` wholesale if it
is present. The documented merge model in §"Merge rules" says groups merge and
typography merges field by field; density is the one nested group that does
neither, and the claim "partial metrics" is false. This plan makes the claim
true: a density metric is a size-keyed record and merges size by size, like
typography merges field by field.

## 2. Design decisions (do not re-litigate)

1. **A named override shape, not a wider `Partial`.** `DensityOverrides` lives
   beside `Density` in `src/scale.ts`:

   ```ts
   /** Partial control metrics; omitted sizes keep the base preset's values. */
   export interface DensityOverrides {
     readonly controlHeight?: Partial<Readonly<Record<ControlSize, number>>>;
     readonly controlPaddingX?: Partial<Readonly<Record<ControlSize, number>>>;
     readonly rowHeight?: number;
   }
   ```

   `ThemeOverrides.density` becomes `DensityName | DensityOverrides`. The name is
   excluded exactly as `Omit<Density, "name">` excluded it before.
2. **Preset names still replace the whole preset.** A `DensityName` selects a
   shipped preset; only an object merges. A consumer who wants "compact, but a
   taller medium control" writes
   `{ ...densityPresets.compact, controlHeight: { md: 34 } }`? **No** — that is a
   full `Density` and does not type-check against `DensityOverrides` (extra
   `name`). They write `extendTheme(getTheme("dark"), { density: "compact" })`
   then a second `extendTheme(..., { density: { controlHeight: { md: 34 } } })`,
   or `{ density: { controlHeight: { sm: 24, md: 34, lg: 32 }, rowHeight: 28 } }`.
   The first form is the documented one; add it to the density docs.
3. **The base preset's name is kept.** A metric override is still the base
   preset with edits, so `theme.density.name` is unchanged — the claim the docs
   already make and plan `068` guards.
4. **No other merge changes.** Spacing, radius, icon, avatar and border width
   are flat and already merge key by key; elevation arrays replace by design;
   typography and motion keep their field-level merges.
5. **No component change.** `controlHeight` / `controlPaddingX` read the merged
   metrics, so a consumer's partial override takes effect through the helpers
   unchanged.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/089-density-metric-merge.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/scale.ts` | **new** `DensityOverrides` |
| `packages/tokens/src/theme.ts` | `ThemeOverrides.density`, `mergeDensity` deep merge |
| `packages/tokens/src/density-merge.test.ts` | **new** — the merge, presets, helpers, both directions |
| `packages/tokens/src/docs.test.ts` | the merge-rule sentence and the density example |
| `packages/tokens/src/readme.test.ts` | the README merge sentence |
| `packages/tokens/README.md` | the merge sentence in *Extending a theme* |
| `docs/tokens.md` | *Density* example and the *Merge rules* bullet |
| `docs/design-system.md` | §11 merge paragraph |
| `COMPONENTS.md` | *Theme extension* row |
| `TODO.md` | one ticked row and the section bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/scale.ts`

After `Density` and before `densityPresets`, add `DensityOverrides` exactly as
in §2.1. Its JSDoc must state that an omitted size keeps the base preset's value.

### 4.2 `packages/tokens/src/theme.ts`

Import `type DensityOverrides` from `./scale.js` (extend the existing import
list) and replace the density field of `ThemeOverrides`:

```ts
  /**
   * Use a density preset, or override individual metrics. A size-keyed record
   * merges size by size, so changing the medium control height keeps the small
   * and large ones. A partial override keeps the base preset's name.
   */
  readonly density?: DensityName | DensityOverrides;
```

Replace `mergeDensity` with:

```ts
const mergeDensity = (
  base: Density,
  override: DensityName | DensityOverrides | undefined,
): Density => {
  if (override === undefined) {
    return base;
  }
  if (isDensityName(override)) {
    return densityPresets[override];
  }
  return {
    ...base,
    ...override,
    controlHeight: { ...base.controlHeight, ...override.controlHeight },
    controlPaddingX: {
      ...base.controlPaddingX,
      ...override.controlPaddingX,
    },
    name: base.name,
  };
};
```

The two record spreads come **after** `...override` so a partial record cannot
drop the other sizes. `name: base.name` stays last so an override cannot rename
the preset.

### 4.3 `packages/tokens/src/density-merge.test.ts` (new)

Header comment must state the bug: *the documented "partial metrics" density
override was not expressible — `controlHeight` required all three sizes, and the
merge replaced the whole record — so a theme that changed one control height
either failed to compile or lost the other sizes and the padding.*

```ts
/**
 * Guards the defect plan 089 fixed: ...
 */
import { describe, expect, it } from "vitest";
import {
  controlHeight,
  controlPaddingX,
  densityPresets,
  extendTheme,
  getPlatformTheme,
  getTheme,
} from "./index.js";

describe("density metric merge", () => {
  it("merges control heights size by size", () => {
    const base = getTheme("light");
    const themed = extendTheme(base, {
      density: { controlHeight: { md: 34 } },
    });

    expect(themed.density.controlHeight).toEqual({
      sm: base.density.controlHeight.sm,
      md: 34,
      lg: base.density.controlHeight.lg,
    });
    expect(themed.density.controlPaddingX).toEqual(base.density.controlPaddingX);
    expect(themed.density.rowHeight).toBe(base.density.rowHeight);
    expect(themed.density.name).toBe(base.density.name);
    expect(controlHeight(themed, "md")).toBe(34);
    expect(controlHeight(themed, "sm")).toBe(base.density.controlHeight.sm);
  });

  it("merges padding and row height without touching heights", () => {
    const base = getTheme("dark");
    const themed = extendTheme(base, {
      density: { controlPaddingX: { lg: 14 }, rowHeight: 36 },
    });

    expect(themed.density.controlPaddingX).toEqual({
      sm: base.density.controlPaddingX.sm,
      md: base.density.controlPaddingX.md,
      lg: 14,
    });
    expect(themed.density.controlHeight).toEqual(base.density.controlHeight);
    expect(themed.density.rowHeight).toBe(36);
    expect(controlPaddingX(themed, "lg")).toBe(14);
  });

  it("still selects a whole preset by name", () => {
    const themed = extendTheme(getTheme("light"), { density: "compact" });
    expect(themed.density).toBe(densityPresets.compact);
  });

  it("edits a platform style's preset without losing its other metrics", () => {
    const macos = getPlatformTheme("darwin", "light");
    const themed = extendTheme(macos, {
      density: { controlHeight: { sm: 22 } },
    });

    expect(macos.density.name).toBe("compact");
    expect(themed.density.name).toBe("compact");
    expect(themed.density.controlHeight.sm).toBe(22);
    expect(themed.density.controlHeight.md).toBe(
      macos.density.controlHeight.md,
    );
    expect(themed.density.controlPaddingX).toEqual(macos.density.controlPaddingX);
  });

  it("does not mutate the base theme", () => {
    const base = getTheme("light");
    const before = base.density;
    extendTheme(base, { density: { controlHeight: { md: 34 } } });

    expect(base.density).toBe(before);
    expect(base.density.controlHeight).toEqual(
      densityPresets.comfortable.controlHeight,
    );
  });
});
```

**Both directions.** With the old shallow merge the first test's `sm`/`lg`
become `undefined` and `controlHeight(themed, "sm")` returns `undefined`, so it
fails; removing the deep record spreads and restoring `{ ...base, ...override,
name: base.name }` reproduces that. The preset-by-name test also fails if
`mergeDensity` deep-merges a `DensityName` (it is not a record) — keep the
`isDensityName` branch first.

### 4.4 Tests and documents

- `packages/tokens/src/docs.test.ts`: add one test in the `docs/tokens.md`
  block asserting the merge bullet and the density example:

  ```ts
  it("states the density merge rule and shows a size-by-size override", () => {
    expect(markdown).toContain(
      "`density` accepts a preset name or partial metrics; metrics merge by size, so changing the medium control height keeps the small and large ones, and a partial override keeps the base preset name;",
    );
    expect(markdown).toContain("controlHeight: { md: 34 }");
  });
  ```

- `packages/tokens/src/readme.test.ts`: assert the README sentence
  `Typography merges field by field, density metrics size by size, elevation levels replace whole arrays, and the mode is not overridable.`
- `packages/tokens/README.md`: replace the *Extending a theme* sentence with that
  exact sentence.
- `docs/tokens.md`:
  - *Density*: after the `controlHeight` example, add a short example and one
    sentence:
    `A metric override merges size by size: \`{ density: { controlHeight: { md: 34 } } }\` raises the default control by 2px and keeps the small and large heights, the padding and the row height, and the theme still names \`comfortable\`.`
  - *Merge rules*: replace the density bullet with the guarded sentence above.
- `docs/design-system.md` §11: replace
  "typography merges field by field, motion timing by timing and easing by
  easing" with
  "typography merges field by field, density metrics size by size, motion timing
  by timing and easing by easing".
- `COMPONENTS.md`: in the *Theme extension* row, after the guards sentence, add
  *`density` accepts a preset name or metrics that merge size by size, so one
  control height can move without retyping the other two (plan 089).*
- `TODO.md`: tick the new row; bar `56/74` → `57/75` (`████████░░` stays).
- `.agents/slop/plans/README.md`: add the `089` row and a paragraph after `088`.

## 5. Commands, in order

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the package suite passes, type-check and `check` are clean, root
`lint` and `test` pass.

**Two-direction proof, run before committing:**

1. Revert `mergeDensity` to `{ ...base, ...override, name: base.name }` and run
   the package suite: `density-merge.test.ts` must fail on the first test's
   `sm`/`lg` and on `controlHeight(themed, "sm")`. Restore the deep merge.
2. Confirm the final suite is green.

## 6. STOP conditions

- If `DensityOverrides` cannot be assigned from `{ controlHeight: { md: 34 } }`
  under the repo's tsconfig, **stop** and report the compiler error. Do not
  loosen the type with `any` or a cast.
- If the preset-by-name test starts returning a merged object instead of
  `densityPresets[name]`, stop: the `isDensityName` branch must run first.
- If a platform style's `density` is not a preset name but a full record, stop and
  report; `PlatformStyle.structure.density` is typed `DensityName` and this plan
  does not change that.
- If any existing test asserts the old `Partial<Omit<Density, "name">>` shape,
  update it to `DensityOverrides`; do not widen the test with a cast.

## 7. Acceptance

- [ ] `DensityOverrides` is the public override shape; `{ controlHeight: { md:
      34 } }` type-checks.
- [ ] Both size-keyed records merge by size and omit nothing.
- [ ] A preset name still replaces the whole preset and keeps its identity.
- [ ] The base theme is not mutated and `theme.density.name` is preserved.
- [ ] `docs/tokens.md`, `docs/design-system.md`, the package README and
      `COMPONENTS.md` state the size-by-size merge.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
- [ ] The plan index row is marked done and the `TODO.md` row is ticked.
