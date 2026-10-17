# 068 — The last two unions a consumer narrows

| Field | Value |
| ----- | ----- |
| Phase | F (consumer boundary) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `COMPONENTS.md`) |
| Depends on | plans `064` (ordered indexes), `066` (coverage guard), `067` (persisted-choice guards) |
| Status | done |

This plan is self-contained. A weaker executor can follow it in order.

---

## 1. Why

Plan `067` shipped the narrowing guards for the three choices it knew a consumer
persists — platform, mode, contrast — and its STOP section parked two unions:

> `DensityName` or `StatusTone` guards are requested: they are not persisted
> choices and are out of scope; record them as a new task if a consumer needs
> one.

That reading is wrong for density. Density **is** a theme choice: it is a field
on `Theme`, `createTheme`/`extendTheme` accept a `DensityName`, and a settings
row that stores "Compact / Comfortable / Spacious" is the obvious desktop
feature — the very feature MISSION.md calls "density options". The package also
already contains the guard, but **private**:

```ts
// packages/tokens/src/theme.ts
const isDensityName = (
  value: DensityName | Partial<Omit<Density, "name">>,
): value is DensityName => typeof value === "string";
```

That guard is (a) not exported, (b) weaker than a boundary guard — it accepts
any string — and (c) lives away from the union it narrows. A consumer storing a
density would retype `"compact" | "comfortable" | "spacious"`, exactly the defect
plan `067` fixed for platforms. The retyping has already started inside this
package: `scale.test.ts` carries `const presetNames = ["compact", …] as const`.

Status tone is the other unknown input. A toast/alert tone can arrive from a
server payload (`{ tone: "warning" }`) or a persisted notification, and
`statusTone(theme, tone)` needs a member of `StatusTone`. `statusTones` exists
(plan `064`) but there is no guard, so the caller casts.

Both unions are owned here. The union owner ships the guard.

## 2. Design decision

Extend the plan `067` contract to the two remaining unions, unchanged in shape:

| Guard | Union | Canonical index | Lives in |
| ----- | ----- | --------------- | -------- |
| `isDensityName` | `DensityName` | `densityNames` (**new**) | `scale.ts` |
| `isStatusTone` | `StatusTone` | `statusTones` (exists) | `styles.ts` |

- **`densityNames` is the ordered index** — `["compact", "comfortable",
  "spacious"]`, documentation and toggle order — and `DensityName` derives from
  it, the same pattern as `platformNames` (plan `064`) and `textRoles` (plan
  `059`). A fourth preset then fails to compile until `densityPresets` and the
  docs table carry it.
- **Signature `(value: unknown): value is T`**, membership tested against the
  canonical index (`.some((name) => name === value)`), no cast and no native
  `Array.includes` type fight.
- `theme.ts` **imports** `isDensityName` from `scale.ts` and deletes its private
  lookalike. One guard, one meaning: `DensityName`, not "any string".
- The guards narrow a **choice**. Decoding a whole theme, density object or
  notification from a file/URL is still the application's boundary, and the
  package still ships no schema runtime and no dependency — same decision as
  plan `067` §1.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/068-density-and-tone-guards.md` | **create** (this file) |
| `packages/tokens/src/scale.ts` | **add** `densityNames`, derive `DensityName`, **add** `isDensityName` |
| `packages/tokens/src/styles.ts` | **add** `isStatusTone` beside `statusTones` |
| `packages/tokens/src/theme.ts` | **delete** the private `isDensityName`; **import** the public one |
| `packages/tokens/src/scale.test.ts` | **use** `densityNames` instead of the retyped `presetNames` |
| `packages/tokens/src/guards.test.ts` | **add** the two guards and the example assertions |
| `packages/tokens/src/persisted-choices.example.ts` | **create** — resolvers for a stored density and a payload tone |
| `docs/tokens.md` | **add** `densityNames`/`isDensityName` to Density, `isStatusTone` to Status tones, and both to the import list and the boundary paragraph |
| `packages/tokens/README.md` | **add** density to Persisted choices; name `isStatusTone` in Status tones |
| `docs/design-system.md` | **add** density and tone to the extension boundary paragraph (§11) and the status row of §8 |
| `COMPONENTS.md` | **edit** the Design tokens and Theme extension rows |
| `TODO.md` | **add** one ticked task; fix the stale section count |
| `.agents/slop/plans/README.md` | **add** the `068` index row and explanation |

## 4. The implementation

`scale.ts`, replacing the `DensityName` type and adding the guard:

```ts
/** Named control density presets, in documentation order. */
export const densityNames = ["compact", "comfortable", "spacious"] as const;

/** A named control density preset. */
export type DensityName = (typeof densityNames)[number];

/**
 * Narrow an unknown value — a stored preference or a settings row — to a shipped
 * density preset. A consumer never retypes the three names.
 */
export const isDensityName = (value: unknown): value is DensityName =>
  densityNames.some((name) => name === value);
```

Keep `densityPresets: Readonly<Record<DensityName, Density>>` — the record now
fails to compile if `densityNames` grows without a preset.

`styles.ts`, after `StatusTone`:

```ts
/** Narrow an unknown value to a shipped status family. */
export const isStatusTone = (value: unknown): value is StatusTone =>
  statusTones.some((tone) => tone === value);
```

`theme.ts`:

```ts
import {
  avatarSize,
  borderWidth,
  defaultDensity,
  densityPresets,
  iconSize,
  isDensityName,
  radius,
  spacing,
  …
} from "./scale.js";
```

Delete the private arrow function. `mergeDensity`'s existing narrowing branch
keeps working and now rejects a non-member string instead of treating it as a
preset name — which is the bug: `extendTheme(base, { density: "spacious " })`
currently reaches `densityPresets["spacious "]` and produces `undefined`
metrics. After the change it falls through to the partial-metrics branch and
spreads the string, so **the public type must keep a persisted value out of that
union**; the guard is the boundary. Do not widen `ThemeOverrides.density`.

`persisted-choices.example.ts` (new, type-checked, asserted in tests):

```ts
import {
  extendTheme,
  isDensityName,
  isStatusTone,
  type DensityName,
  type StatusTone,
  type Theme,
} from "./index.js";

const fallbackDensity: DensityName = "comfortable";
const fallbackTone: StatusTone = "info";

/** Apply a persisted density to any theme; a stale value keeps the default. */
export const themeWithDensity = (theme: Theme, stored: unknown): Theme =>
  extendTheme(theme, {
    density: isDensityName(stored) ? stored : fallbackDensity,
  });

/** Resolve a tone from a payload; an unknown family falls back to info. */
export const resolveStatusTone = (value: unknown): StatusTone =>
  isStatusTone(value) ? value : fallbackTone;
```

## 5. Tests

Header of `guards.test.ts` gains one sentence: **the union owner left density
and status tone to consumers, so a persisted density and a payload tone were
retyped or cast.**

1. **`isDensityName`**
   - accepts every `densityNames` member and every `densityPresets` key;
   - `densityNames` and `Object.keys(densityPresets)` are the same list, in the
     same order (the registry and the index cannot disagree);
   - rejects `""`, `"Compact"`, `"dense"`, `"compact "`, `"spacious-ish"` and the
     shared non-strings.
2. **`isStatusTone`**
   - accepts every `statusTones` member;
   - rejects `""`, `"Info"`, `"error"`, `"danger"`, `"warning "` and non-strings.
3. **Example** — a stored `"compact"` reaches `themeWithDensity(...).density`
   and equals `densityPresets.compact`; a stale `"dense"` keeps the base
   density; `statusTone(theme, resolveStatusTone("warning")).background` is
   `theme.colors.warningSoft`, and `resolveStatusTone("error")` is `"info"`.
   This is the meaningful failure case: a guard that returns `true` for
   everything makes the fallback assertions fail.
4. `scale.test.ts` imports `densityNames` and deletes `presetNames`; the preset
   loop iterates the index.

`docs.test.ts` (plan `066`) already fails if any public **value** export is
missing from `docs/tokens.md`, so `densityNames`, `isDensityName` and
`isStatusTone` are guarded the moment they are exported.

## 6. Documentation edits

- `docs/tokens.md` import list: add `densityNames`, `isDensityName`,
  `isStatusTone` in sort order.
- **Density**: after the preset table and the `controlHeight` snippet, add:
  "`densityNames` lists the three presets in documentation order.
  `isDensityName(stored)` narrows a persisted choice before it reaches
  `extendTheme`, so a stale setting cannot become a theme with no metrics."
- **Status tones**: after `statusTone`, add: "A tone from a payload is unknown;
  `isStatusTone(value)` narrows it to the four shipped families."
- **Theme API** boundary paragraph: add `isDensityName` to the list, and note
  that a **tone** is the same kind of choice and narrows with `isStatusTone`.
- **For documentation sites**: name `densityNames` beside `densityPresets`.
- `README.md` **Persisted choices**: resolve a density through
  `isDensityName`; **Status tones**: name `isStatusTone`.
- `docs/design-system.md` §11: "the mode, the contrast variant, the density, the
  platform style"; §8 status row ends "…a tone from untrusted data narrows with
  `isStatusTone`."
- `COMPONENTS.md`: **Design tokens** notes gain `densityNames`; **Theme
  extension** names the five guards (`isPlatformName`, `isThemeMode`,
  `isThemeContrast`, `isDensityName`, `isStatusTone`).

## 7. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0; record the observed count
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run test                                   # exit 0
```

Record the observed counts; do not predict them. If `docs.test.ts` fails on the
new exports, the documentation edit is incomplete — fix the docs, do not weaken
the guard.

## 8. STOP conditions

Stop and report if:

- either guard needs a cast or `any` — the shape is wrong; fix the shape;
- `densityNames` and `densityPresets` cannot be kept in one order without a
  second retyped list — stop, that is the drift this plan exists to remove;
- the docs coverage guard cannot be satisfied by naming a real export — do not
  invent a token to please a test;
- a consumer needs a schema decoder here — different, dependency-bearing
  decision; record it, do not add `effect`;
- `mergeDensity` needs widening to accept unknown — the guard belongs at the
  boundary, not in the merge.

## 9. Test plan and both directions

Run both directions and record the output:

1. Delete `"spacious"` from `densityNames` → `check-types` fails on
   `densityPresets` (`Property 'spacious' is missing`), proving the index is the
   single source. Restore.
2. Make `isDensityName` return `true` unconditionally → the rejection test and
   the density fallback example fail. Restore.
3. Make `isStatusTone` return `true` unconditionally → the rejection test and the
   `"error" → "info"` fallback fail. Restore.
4. Remove `isStatusTone` from `docs/tokens.md` → `docs.test.ts` "names every
   value the package exports" fails. Restore.

Do not claim a direction that was not run.

## 10. Acceptance criteria

- `densityNames`, `isDensityName` and `isStatusTone` are exported from the
  package entry, typed over `unknown`, documented in `docs/tokens.md`, and
  covered by `guards.test.ts` plus `persisted-choices.example.ts`.
- `DensityName` is derived from `densityNames`; `theme.ts` carries no private
  lookalike guard.
- `scale.test.ts` does not retype the preset names.
- No new dependency, no cast, no runtime execution.
- `TODO.md`, `COMPONENTS.md`, `README.md` and `docs/design-system.md` updated.
- The five gate commands exit 0 and every listed failing direction was observed.
