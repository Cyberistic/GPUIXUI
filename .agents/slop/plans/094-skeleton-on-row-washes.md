# 094 — The loading skeleton on the row washes

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `078` (the skeleton surface pairs), `079` (secondary text on the washes), `087` (selection on the washes), `093` (the ring on the soft fills) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`skeleton` is the loading placeholder for a mission-named state and is held to
the 1.05:1 perceivability floor (`surface` class) on `background`, `card` and
`popover` (plan `078`). It is **not** measured on the surfaces a loading row
paints.

A virtualized or paginated list shows skeleton rows; the row under the pointer
gets `hover`, the pressed row gets `active`, and a selected row gets `selected`.
The skeleton is a child of that row, so its fill sits on the row's wash. It is
also placed in the `muted` panel of a sidebar list.

Measured with the shipped palette, **seventeen pairs are below 1.05:1**, ten of
them exactly **1.000:1** — an invisible placeholder:

| Set | Surface | Measured |
| --- | ------- | -------- |
| identity light | `active` | **1.000:1** |
| identity light, macOS, Linux, Windows at high contrast | `active` | **1.000:1** (four sets) |
| identity dark | `active` | **1.000:1** |
| identity dark and the three platform variants at high contrast | `active` | **1.000:1** (four sets) |
| Windows light | `active` | 1.045:1 |
| Linux light, Windows light, identity dark | `selected` | 1.003 / 1.004 / 1.004:1 |
| macOS light, Linux light, macOS dark | `hover` | 1.035 / 1.042 / 1.031:1 |

The cause is that the identity skeleton *is* the `active` fill in the light and
dark default themes (`neutral[200]` / `neutral[800]`), and the high-contrast
skeletons are the `active` value there, so a pressed loading row erases the
placeholder. The dark platform styles carry their own skeleton one step off
`card` but within 1.05 of their pressed wash.

`muted` already passes (1.06–1.30) and joins the contract so an edited theme
cannot break it either.

## 2. Design decisions (do not re-litigate)

1. **The skeleton joins four more surfaces** as `surface` pairs: `muted`,
   `hover`, `active` and `selected`, beside `background`, `card` and `popover`.
   Pair count `117 → 121`. No new pair class.
2. **The skeleton moves one ramp step away from `active` in every set**, never
   the washes themselves: the washes are shared by text, ring, boundary and
   selection pairs, so moving one would drag four other contracts. The skeleton
   participates in `surface` pairs only.
3. **Values** (measured after the move; the tightest pair is shown):

   | Set | Before | After | Tightest |
   | --- | ------ | ----- | -------- |
   | identity light | `neutral[200]` | `palette.neutral[300]` (`#CBD1DB`) | 1.21 on `active` |
   | identity dark | `neutral[800]` | `palette.neutral[700]` (`#3D4552`) | 1.37 on `active`/`selected` |
   | high-contrast light | `#D6D6D6` | `#B0B0B0` | 1.49 on `active` |
   | high-contrast dark | `#3D3D3D` | `#565656` | 1.48 on `active` |
   | macOS dark | `#3C3C3E` | `#525254` | 1.33 on `active` |
   | Linux dark | `#3E3E3E` | `#585858` | 1.19 on `selected` |
   | Windows dark | `#3C3C3C` | `#525252` | 1.23 on `active` |

   The three platform light styles and every high-contrast variant inherit the
   identity/AAA values through `applyPlatformStyle` (colours are not applied at
   high contrast), and clear the floor: 1.12–1.16 on their pressed washes.
4. **No floor changes.** `surface` stays 1.05:1 at both levels.
5. **No value reaches the AAA divider floor.** The skeleton is a perceivable
   surface, not a divider; 1.05 is what the library promises and what the
   audits of plans `076` and `078` used.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/094-skeleton-on-row-washes.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the `094` row and paragraph |
| `packages/tokens/src/contrast.ts` | `skeleton` on `muted`/`hover`/`active`/`selected`; JSDoc |
| `packages/tokens/src/color.ts` | four identity/AAA skeleton values; comments |
| `packages/tokens/src/platform-styles/{macos,linux,windows}.ts` | dark skeleton; comments |
| `packages/tokens/src/skeleton-washes.test.ts` | **new** — floors, exact regressions, checker, pair wiring |
| `packages/tokens/src/contrast.test.ts` | header paragraph; pair count `117` → `121` |
| `packages/tokens/src/docs.test.ts` | colour tables are derived; the surface sentence, the skeleton sentence, the §9 row |
| `packages/tokens/src/readme.test.ts` | the README skeleton clause |
| `packages/tokens/README.md` | the skeleton paragraph |
| `docs/tokens.md` | skeleton values in both tables, checking and verification prose |
| `docs/design-system.md` | §8 loading row, §9 row |
| `COMPONENTS.md` | *Theme contrast check* and *Design tokens* rows |
| `TODO.md` | tick this row, bump the bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

Extend the skeleton block beside `surfacePairs`:

```ts
/**
 * The surfaces a loading placeholder sits on beyond the plain ones: the quiet
 * panel of a sidebar list and the washes a loading row paints. A skeleton row is
 * hovered, pressed and selected like any other, and a placeholder that vanishes
 * into the wash is a failed loading state, so each is held to the surface floor.
 */
const skeletonSurfaces = ["background", "card", "popover", "muted", "hover", "active", "selected"] as const;
```

Build the pairs from that list (replacing the three-surface inline map), and
extend the `contrastPairs` JSDoc to name the row washes.

### 4.2 `packages/tokens/src/color.ts`

- `lightColors.skeleton`: `palette.neutral[200]` → `palette.neutral[300]`.
- `darkColors.skeleton`: `palette.neutral[800]` → `palette.neutral[700]`.
- `highContrastLightColors.skeleton`: `"#D6D6D6"` → `"#B0B0B0"`.
- `highContrastDarkColors.skeleton`: `"#3D3D3D"` → `"#565656"`.
- Update the `ThemeColors.skeleton` comment: "held to the perceivability floor
  on every surface and row wash it fills", and add one sentence to each theme's
  file comment naming the wash it must stay perceivable on (plan `094`).

### 4.3 Platform styles

- macOS dark `skeleton` `#3C3C3E` → `#525254`.
- Linux dark `#3E3E3E` → `#585858`.
- Windows dark `#3C3C3C` → `#525252`.
- One JSDoc sentence each: the placeholder is one step off the pressed wash so a
  loading row keeps it visible (plan `094`).

### 4.4 `packages/tokens/src/skeleton-washes.test.ts` (new)

Header states the defect: seventeen pairs under 1.05, ten at 1.000, because the
skeleton equalled `active` in the identity and AAA sets.

Tests:

1. **Every shipped set keeps the skeleton perceivable on all seven surfaces** —
   sixteen variants; collect misses; assert empty.
2. **The exact regressions** — identity light skeleton `#E1E5EC` on `active`
   measures 1.0 while the shipped value clears 1.05; identity dark
   `neutral[800]` on `selected` measured 1.004; the shipped values are
   `palette.neutral[300]` / `palette.neutral[700]`.
3. **The high-contrast skeletons are not the pressed wash** — AAA light
   `#B0B0B0`, AAA dark `#565656`, and both clear 1.05 on `active`.
4. **The checker reports the washes** — extend the identity light theme with
   `skeleton: light.active`; filter `themeContrastFailures` to `skeleton` and
   assert the four new surfaces at `surface` / floor 1.05 (background/card/
   popover fail too, so filter to the four).
5. **Publishes seven pairs** — one per surface, no duplicates, in documented
   order.

Keep the file under ~110 lines.

### 4.5 `packages/tokens/src/contrast.test.ts`

- Header: plan 094 paragraph.
- `covers every documented pair`: `117` → `121`.

### 4.6 `packages/tokens/src/docs.test.ts`

- "states the skeleton floor the contract enforces": the sentence names
  `background`, `card`, `popover`, `muted`, `hover`, `active` and `selected`,
  built from the pair list (reuse the surface-sentence builder).
- The "names every surface the surface pairs are held against" sentence rebuilds
  itself from `contrastPairs`, so the added surfaces flow in; update the doc
  sentence until it matches the derived list.
- §9 row: `loading skeleton (\`skeleton\`) on \`background\`/\`card\`/\`popover\`/
  \`muted\` and the \`hover\`/\`active\`/\`selected\` washes`.
- The colour tables are derived from `themes`, so only the doc rows need the new
  values.

### 4.7 `docs/tokens.md`

- Colour tables: default light `skeleton` `#E1E5EC` → `#CBD1DB`, dark `#2A303B`
  → `#3D4552`; high-contrast `#D6D6D6` → `#B0B0B0`, `#3D3D3D` → `#565656`.
- §Checking a theme: the skeleton clause adds the four surfaces.
- §Verification: the skeleton paragraph names the surfaces, the defect (ten
  pairs at 1.000) and the seven moved values.
- The surface-pair sentence is rebuilt from the implementation.

### 4.8 `docs/design-system.md`

- §8 loading row: the 1.05 floor applies "on every surface and row wash a
  placeholder fills", with the defect named.
- §9 row: the wording from §4.6.

### 4.9 `packages/tokens/README.md`, `readme.test.ts`, `COMPONENTS.md`, `TODO.md`

- README skeleton paragraph: add the four surfaces and the "1.000:1" defect.
- `readme.test.ts` asserts the sentence.
- `COMPONENTS.md` *Theme contrast check*: `117` → `121`, add the plan 094
  sentence and `skeleton-washes.test.ts` to the test list. *Design tokens*:
  extend the skeleton clause (one clause, no role count change).
- `TODO.md`: tick the row and bump `61/80` → `62/81`.

## 5. Commands, in order

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the package suite passes with 32 files.

**Two-direction proof:**

1. Restore identity light `skeleton` to `palette.neutral[200]`: the new suite
   must fail on `active` at 1.0 and the checker test must report it. Restore.
2. Restore identity dark `skeleton` to `palette.neutral[800]`: fail on `active`
   and `selected` at 1.0. Restore.
3. Remove the four new surfaces from the pair list: the pair count must fail
   (`expected 117 to be 121`) and the seven-pair test must fail. Restore.
4. Confirm the final suite is green.

Record the exact failure text in §8.

## 6. STOP conditions

- **Any shipped set still fails after the seven moves.** The post-move margins
  are in §2.3; a different failure means another value moved. Do not lower the
  floor.
- **A moved skeleton value collides with a wash or a disabled fill.** It must
  stay a perceivable step away from `active` in the same set; check `disabled`
  too, which shares the quiet grey in several sets.
- **The selection wash or the boundary/ring pairs change.** They do not read
  `skeleton`; a failure there means a wash moved by accident.
- **A consumer hard-codes a skeleton value.** Record it in `TODO.md`; do not
  edit the other workstream.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `skeleton-washes` #1 | unit | a shipped theme losing the placeholder on a row surface |
| `skeleton-washes` #2 | unit | the exact 1.000 / 1.004 regressions |
| `skeleton-washes` #3 | unit | an AAA skeleton that equals the pressed wash again |
| `skeleton-washes` #4 | unit | the public checker silently dropping the surfaces |
| `skeleton-washes` #5 | unit | the pair list shrinking or growing without a deliberate edit |
| `contrast.test.ts` pair count | unit | a pair added or removed without updating the stated total |
| `docs.test.ts` sentences and §9 row | unit | a document that stops naming a surface the contract checks |
| `readme.test.ts` | unit | the front door drifting from the contract |

## 8. Outcome (executed on this host, 2026-10-17)

- `contrastPairs` now holds **121** pairs: 117 + `skeleton` on `muted`, `hover`,
  `active` and `selected`.
- Seven values moved as designed: light `neutral[300]`, dark `neutral[700]`,
  high-contrast light `#B0B0B0`, high-contrast dark `#565656`, macOS dark
  `#525254`, Linux dark `#585858`, Windows dark `#525252`. The tightest pair
  after the move is Linux dark on `selected` at **1.19:1**.
- Two-direction proof (`nub run --filter @gpuixui/tokens test`):
  - restoring the light skeleton to `neutral[200]` failed **2** tests and named
    six pairs: `identity light default: skeleton on active at 1`,
    `darwin light default: skeleton on hover at 1.0346699410512776`,
    `linux light default: skeleton on hover at 1.0420462959987806`,
    `linux light default: skeleton on selected at 1.0026791477865824`,
    `win32 light default: skeleton on active at 1.0447807824829132`,
    `win32 light default: skeleton on selected at 1.0039…`;
  - restoring the dark skeleton to `neutral[800]` failed **2** tests with
    `identity dark default: skeleton on active at 1` and
    `identity dark default: skeleton on selected at 1.0038936920735946`;
  - removing the four surfaces from the pair list failed **3** tests:
    `expected 117 to be 121`, the checker regression test
    (`expected [] to deeply equal [ { background: 'active', …(2) } ]`) and the
    seven-pair test (`expected [ …(3) ] to have a length of 7 but got 3`);
  - restored, the package suite is green: **32 files, 1566 tests**.
- `nub run check`, `nub run lint` and `nub run test` all pass.

## 9. Acceptance

- [x] The skeleton is measured on `muted`, `hover`, `active` and `selected` and
      reported by `themeContrastFailures`.
- [x] Every shipped theme clears 1.05:1 on all seven surfaces.
- [x] The 1.000/1.004 regressions are guarded in both directions.
- [x] `docs/tokens.md`, `docs/design-system.md`, the package README and
      `COMPONENTS.md` name the surfaces, values and counts, all built from the
      implementation.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
- [x] The plan index row is marked done and the `TODO.md` row is ticked.
