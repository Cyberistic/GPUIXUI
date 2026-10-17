# 082 — The primary role as text

| Field | Value |
| ----- | ----- |
| Phase | F (design-system truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `014` (status tones), `057` (status text roles), `063` (platform styles), `071`–`081` (the contrast contract) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`primary` is both a **fill** and a **foreground**, and the contract only ever
measured it as a fill (`primaryForeground` on `primary`).

The places that paint `primary` as text today:

- `packages/primitives/src/core/variants.ts` — the `link` variant is
  `foreground: theme.colors.primary` and paints the `hover` / `active` washes
  behind it (`washed`), so a hovered link is `primary` on `hover` and a pressed
  link is `primary` on `active`;
- `packages/primitives/src/core/style.ts` — `TEXT_TONES` includes `primary`,
  resolved to `theme.colors.primary` for a heading, label or icon on a plain
  surface;
- `packages/components` re-exports the same variant table through
  `internal/theme.ts`.

Nothing in `contrastPairs` measures `primary` as text. The suite stays green
while a hovered link is unreadable in four shipped sets and a pressed one in
six:

| Set | `primary` | Worst pair | Ratio | Floor |
| --- | --------- | ---------- | ----- | ----- |
| macOS light | `#0071E3` | on `active` (`#DCDCE2`) | **3.44:1** | 4.5:1 |
| macOS light | | on `background` (`#F2F2F7`) | **4.21:1** | 4.5:1 |
| Linux light | `#1C71D8` | on `active` (`#DEDDDB`) | **3.51:1** | 4.5:1 |
| Linux light | | on `background` | **4.38:1** | 4.5:1 |
| macOS dark | `#0A84FF` | on `active` (`#404042`) | **2.84:1** | 4.5:1 |
| macOS dark | | on `card` / `popover` / `muted` | **3.82:1** | 4.5:1 |
| Linux dark | `#78AEED` | on `active` (`#464646`) | **4.08:1** | 4.5:1 |
| Windows light | `#0067C0` | on `active` (`#E0E0E0`) | **4.30:1** | 4.5:1 |
| high-contrast dark | `#C7CBFF` | on `active` (`#3D3D3D`) | **6.94:1** | 7:1 |

The identity light and dark sets and Windows dark pass, which is why the defect
never surfaced: the pair was absent, not safe. This is the same class plan `057`
fixed for status text (`warning` was 1.78:1 on the canvas because the solid role
is tuned as a fill), and `079`–`081` fixed for secondary text, control edges and
the selection wash.

The design system already states the reason a fill role cannot double as text:
the status section argues that a solid status colour is a surface and needs a
separate `xText` tonality (`docs/tokens.md`). `primary` is the one filled family
that never got that split.

## 2. Design decisions (do not re-litigate)

1. **Add one role, `primaryText`.** A dedicated foreground tonality for brand
   text, links and icons on plain surfaces, symmetric with `infoText`,
   `successText`, `warningText` and `destructiveText`. It is not a rename of
   `primary`: the fill keeps `primary` / `primaryForeground` / `primaryHover`,
   and components choose the role their paint path needs.
2. **Measure it on the six surfaces a link actually sits on**: `background`,
   `card`, `popover`, `muted`, `hover` and `active`. `muted` joins because it is
   the quiet grouping surface a sidebar label or link can sit on, and the Link
   variant paints the two washes itself.
3. **The `secondary` floor**, not `body`: this is secondary/interactive text, the
   same class as `mutedForeground` and the `xText` roles. It is 4.5:1 in the
   default themes and 7:1 in the high-contrast variants.
4. **Values with margin, not bare floors.** Each is the nearest readable step in
   its own brand family, so the platform's accent still reads through:

   | Set | `primaryText` | Worst surface | Ratio |
   | --- | ------------- | ------------- | ----- |
   | identity light | `iris[700]` `#4C39B5` | `active` | 6.49:1 |
   | identity dark | `iris[200]` `#C7CBFF` | `active` | 8.47:1 |
   | high-contrast light | `iris[800]` `#3B2C8F` | `active` | 7.44:1 |
   | high-contrast dark | `iris[100]` `#E0E3FF` | `active` | 8.59:1 |
   | macOS light | `#0055B3` | `active` | 5.21:1 |
   | macOS dark | `#64B5FF` | `active` | 4.73:1 |
   | Linux light | `#12488F` | `active` | 6.59:1 |
   | Linux dark | `#99C1F1` | `active` | 5.06:1 |
   | Windows light | `#005BA1` | `active` | 5.28:1 |
   | Windows dark | `#76D0FF` | `active` | 5.59:1 |

   The high-contrast values are deliberately different from the default ones:
   the AAA dark `primary` (`#C7CBFF`) fails 7:1 on `active`, so the declared
   level needs its own lighter step.
5. **Role order.** `primaryText` sits after `primaryHover`, inside the primary
   family, not in the `xText` block: the docs tables are generated from
   `colorRoles` order and the family reads together.
6. **Nothing else moves.** No fill, surface or existing text role changes, so no
   other pair is affected. Consumers adopt the role; the token contract does not
   restyle their components.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/082-primary-text-role.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/color.ts` | `primaryText` in `ThemeColors`, the four identity colour sets and `colorRoles` |
| `packages/tokens/src/platform-styles/macos.ts` | `primaryText` in the light and dark blocks |
| `packages/tokens/src/platform-styles/linux.ts` | the same |
| `packages/tokens/src/platform-styles/windows.ts` | the same |
| `packages/tokens/src/contrast.ts` | `primaryText` on the six surfaces in `contrastPairs`; JSDoc |
| `packages/tokens/src/primary-text.test.ts` | **new** — the regression and contract test |
| `packages/tokens/src/primary-text.example.ts` | **new** — a link and icon example |
| `packages/tokens/src/docs.test.ts` | the quoted macOS ratios; header role count |
| `packages/tokens/src/contrast.test.ts` | pair count 74 → 80 |
| `docs/tokens.md` | the role row in both colour tables, the count, the fill-vs-text rationale, the verification prose |
| `docs/design-system.md` | role count, the state table's link row, the floor table |
| `packages/tokens/README.md` | role count and the foreground note |
| `COMPONENTS.md` | role count, pair count and the plan record |
| `TODO.md` | tick this task; add the consumer adoption rows |

### 3.1 `packages/tokens/src/color.ts`

Add to `ThemeColors` after `primaryHover`:

```ts
  /** Brand-toned text, links and icons on plain surfaces. */
  readonly primaryText: string;
```

Add to each identity set after `primaryHover`:

```ts
// light
primaryText: palette.iris[700],
// dark
primaryText: palette.iris[200],
// high contrast light
primaryText: palette.iris[800],
// high contrast dark
primaryText: palette.iris[100],
```

Add `"primaryText"` to `colorRoles` directly after `"primaryHover"`.

### 3.2 The platform style files

Add one line after each mode's `primaryHover` (inside `colors.light` /
`colors.dark`), copying the file is the task:

| File | `colors.light.primaryText` | `colors.dark.primaryText` |
| ---- | -------------------------- | ------------------------- |
| `platform-styles/macos.ts` | `"#0055B3"` | `"#64B5FF"` |
| `platform-styles/linux.ts` | `"#12488F"` | `"#99C1F1"` |
| `platform-styles/windows.ts` | `"#005BA1"` | `"#76D0FF"` |

Update each file's header comment with one line saying which role the accent is
read as text, and why it differs from the fill (the ratios are in §2.4).
`platform-styles/default.ts` carries no colours and is untouched.

### 3.3 `packages/tokens/src/contrast.ts`

After `controlFillPairs`, add:

```ts
/**
 * The surfaces brand-toned text is painted on: the plain surfaces, the quiet
 * grouping panel, and the two washes the Link variant paints behind its own
 * label.
 */
const primaryTextSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
] as const;

const primaryTextPairs: readonly ContrastPair[] = primaryTextSurfaces.map(
  (background): ContrastPair => ["primaryText", background, "secondary"],
);
```

Spread `...primaryTextPairs` into `contrastPairs` after the `borderStrong`
block, and extend the list's JSDoc to name brand-toned text.

### 3.4 `packages/tokens/src/primary-text.test.ts`

Header comment states the bug being guarded (macOS light 4.21:1 on the canvas,
macOS dark 3.82:1 on card, hovered link 2.84:1). Tests:

1. every shipped theme — identity light/dark, both high-contrast variants, and
   each platform variant in both modes — clears the `secondary` floor with its
   `primaryText` on all six surfaces;
2. the exact regression: `primary` as text still fails the floor in the sets
   named in §1, so the test proves the role is not redundant;
3. `themeContrastFailures` reports a theme whose `primaryText` was left at the
   old `primary` value, with the failing surface names;
4. `primaryText` is an opaque `#RRGGBB` in every shipped set, so the checker can
   measure it (a translucent text role would report `NaN`).

### 3.5 `packages/tokens/src/primary-text.example.ts`

A compiled example, in the style of `status-text.example.ts`: a link label on
the canvas and on the two washes, and a `primaryText` icon tint. Import it from
nothing (examples are type-checked, not exported).

### 3.6 Documents

- `docs/tokens.md`: the role row in the default and high-contrast tables;
  `53` → `54` in both sentences; a paragraph after the fill/hover paragraph:
  `primary` is a fill, `primaryText` is the readable tonality for a link, label
  or icon, with the macOS figures named in §1 and derived in `docs.test.ts`.
- `docs/design-system.md`: `53` → `54`; a `link` row in §8's state table; a
  `brand-toned text (primaryText)` row in the §9 floor table.
- `packages/tokens/README.md`: `53` → `54` and one sentence on the fill/text
  split.
- `COMPONENTS.md`: `53` → `54` in the Design tokens and High-contrast rows;
  `74` → `80` and the plan note in the Theme contrast check row; the Design
  tokens row records the role.
- `docs.test.ts`: header `53` → `54`; a test deriving the two quoted macOS
  ratios from `platformStyles` and `contrastRatio` (round to two decimals), so
  the sentence cannot drift.

## 4. Commands

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`).

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/tokens test` | 20 files, 1078 tests, all pass (was 19 files / 1011 tests; the new file adds 6) |
| `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

The two-direction proof:

1. revert the platform `primaryText` values to their `primary` values in one set
   (macOS dark `#0A84FF`) → the new test fails naming `card`, `popover`, `muted`,
   `hover`, `active`; restore → green;
2. revert the contract spread (`...primaryTextPairs`) → the count test and the
   regression test fail; restore → green.

## 5. STOP conditions

Stop and report with evidence if:

- **A shipped set still misses the floor after the §2.4 value.** The measured
  values are in §2.4; a different failure means a surface or floor is wrong. Do
  not lower the floor and do not widen the role to `body`.
- **A role that is not `primaryText` moves.** The fill, the surfaces and the
  existing text roles must stay identical; a change elsewhere means the merge
  or the substitution touched the wrong line.
- **The pair count is not 80.** 74 + 6; a different count means a pair was
  added or dropped twice.
- **The consumer paths need editing.** `packages/primitives` and
  `packages/components` are other workstreams: record the adoption in
  `TODO.md`, do not edit them.
- **The docs tables cannot be built from `colorRoles`.** They already are; a
  hand-written row means the guard is no longer doing its job — report it
  instead of adding a second table.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `primary-text.test.ts` #1 | unit | a shipped set whose brand-toned text is unreadable on a surface it paints |
| `primary-text.test.ts` #2 | unit | the old `primary` value silently returning as a text role |
| `primary-text.test.ts` #3 | unit | the public checker not reporting a failing `primaryText` |
| `primary-text.test.ts` #4 | unit | a translucent or malformed text role reaching the contract |
| `contrast.test.ts` pair count | unit | the contract growing by anything other than the six surfaces |
| `color.test.ts` / `platforms.test.ts` generic loops | unit | any shipped colour set failing the new pairs |
| `docs.test.ts` colour tables | unit | a role added without both documented tables |
| `docs.test.ts` quoted ratios | unit | a palette edit leaving the rationale quoting old figures |
| `readme.test.ts` role count | unit | the README drifting from `colorRoles` |

## 7. Outcome (executed on this host, 2026-10-17)

- `primaryText` ships as the 54th role, after `primaryHover`, in every shipped
  set: identity light `#4C39B5`, dark `#C7CBFF`; high-contrast light `#3B2C8F`,
  dark `#E0E3FF`; macOS light `#0055B3`, dark `#64B5FF`; Linux light `#12488F`,
  dark `#99C1F1`; Windows light `#005BA1`, dark `#76D0FF`.
- `contrastPairs` grows 74 → 80: `primaryText` on `background`, `card`,
  `popover`, `muted`, `hover` and `active`, at the `secondary` floor.
- Two-direction proof (all restored to green):
  - macOS dark `primaryText` back to `#0A84FF` failed
    `darwin dark: primaryText on card: expected 3.820905254608075 to be greater
    than or equal to 4.5` (and `popover`, `muted`, `hover`, `active`), plus the
    regression test at `2.8361276100547044` on `active`;
  - removing `...primaryTextPairs` failed the pair-count test (`expected 74 to be
    80`) and two `primary-text` tests (the empty surface list and the missing
    public-checker failures);
  - restoring both made every suite green: **20 files, 1078 tests**.
- `docs/tokens.md` and `docs/design-system.md` are generated from the role list
  and the pair list; the quoted macOS figures are derived in `docs.test.ts`.
- Consumer adoption is recorded in `TODO.md` (primitives' `link` variant and
  `TEXT_TONES.primary`, and any `components` call site that paints `primary` as
  text).
