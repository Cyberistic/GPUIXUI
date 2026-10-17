# 092 — The control boundary on the soft status fills

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `084` (the control boundary on the state washes), `090` (the soft status edge), `091` (selection inside a soft status surface) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

`borderStrong` is the **essential control boundary**: the edge of a field, and of
an unchecked checkbox or radio. It is held to the non-text floor (3:1 default,
4.5:1 at high contrast) on `background`, `card`, `input`, `popover` (plan `084`),
the `muted` panel and the four state washes (also plan `084`).

It is **not** measured on the four soft status fills (`infoSoft`, `successSoft`,
`warningSoft`, `destructiveSoft`). Those are not abstract surfaces: an Alert or
Toast carries an action — a "Retry" button, a field, a "don't show again"
checkbox — and API validation errors render inline inside a soft `destructive`
block. A control inside one paints its `borderStrong` edge on that fill.

Measuring the shipped sets produces three failures, all in the identity dark
theme, all under the 3:1 boundary floor:

| Set | Surface | Measured | Floor |
| --- | ------- | -------- | ----- |
| identity dark | `successSoft` (`#0C452D`) | **2.77:1** | 3:1 |
| identity dark | `destructiveSoft` (`#6B1A1D`) | **2.94:1** | 3:1 |
| identity dark | `infoSoft` (`#16356F`) | **2.97:1** | 3:1 |
| identity dark | `warningSoft` (`#463000`) | 3.03:1 | 3:1 (passes, 1% margin) |

Every light set already clears it (identity 3.36–3.45, macOS 4.05–4.15, Linux
3.60–3.69, Windows 3.63–3.72), every dark platform style clears it (macOS
3.38–3.70, Linux 4.17–6.43, Windows 3.92–4.29), and both high-contrast sets
clear the 4.5:1 AAA floor (5.20–6.30) because `borderStrong` is `#AAAAAA` there.
The identity dark `#77808F` is simply the darkest boundary role in the library.

This is the same failure mode as plans `074`–`091`: the contract named the
surfaces a component *usually* paints, not the ones a *composition* produces.
The suite stayed green because the pairs were absent.

## 2. Design decisions (do not re-litigate)

1. **One new pair list, not a widened one.** `controlBoundarySoftPairs` holds
   `borderStrong` over each soft fill as a `boundary` pair, built from the
   existing `softSurfaceRoles`. `controlBoundarySurfaces` and
   `control-boundary.test.ts` keep their five surfaces and their "one pair per
   boundary surface" assertion, so plan `084`'s guard stays a guard for exactly
   what it measured. The two lists are different compositions: a row is a wash,
   a soft fill is a status surface.
2. **One value moves: identity dark `borderStrong` `#77808F` → `#868FA0`.**
   A lighter edge raises the ratio on every dark surface at once, and it is the
   only role painted here. `#868FA0` is a half-step above plan `084`'s value and
   in line with the dark platform styles (`#8E8E93`, `#A09F9C`, `#9A9A9A`).
   Measured after the move: 3.39 on `successSoft` (the tightest), 3.60 on
   `destructiveSoft`, 3.64 on `infoSoft`, 3.71 on `warningSoft`, and its
   tightest existing boundary pair rises 3.31 → 4.06 on `accent`/`selected`.
3. **No other value moves.** Every platform style already clears the floor on
   the four soft fills; the light identity already clears it. Moving a soft fill
   instead would drag the surface floor (plan `076`), the soft text pairs (plan
   `091`) and the selection wash pairs, for no benefit — the edge is what the
   reader cannot perceive.
4. **No floor changes.** The `boundary` class keeps 3:1 / 4.5:1.
5. **The focus ring stays a separate question.** `ring` already clears the
   boundary floor on all four soft fills (measured in the audit), but a ring on a
   soft fill is a distinct composition (`ringSurfaces` is the eight surfaces a
   focused control sits on). It is recorded in `TODO.md` as the next row, plan
   `093`, rather than folded in silently here.
6. **Pair count.** `contrastPairs` moves **109 → 113**.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/092-control-boundary-soft-fills.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the `092` row and paragraph |
| `packages/tokens/src/contrast.ts` | `controlBoundarySoftPairs`; spread it; JSDoc |
| `packages/tokens/src/color.ts` | identity dark `borderStrong`; role and theme JSDoc |
| `packages/tokens/src/control-boundary-soft.test.ts` | **new** — floors, exact regression, public checker, pair wiring |
| `packages/tokens/src/contrast.test.ts` | header paragraph; pair count `109` → `113` |
| `packages/tokens/src/docs.test.ts` | the contrast-surfaces sentence, the design-system §9 row, the regression figures |
| `packages/tokens/src/readme.test.ts` | the README boundary clause |
| `packages/tokens/README.md` | the boundary paragraph |
| `docs/tokens.md` | the role prose, the dark `borderStrong` cell, checking and verification prose |
| `docs/design-system.md` | §7 `borderStrong` bullet, §9 row |
| `COMPONENTS.md` | *Theme contrast check* row |
| `TODO.md` | tick this row, add the ring row, bump the bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

After `controlBoundaryPairs`:

```ts
/**
 * The soft status fills a bounded control can sit on. An Alert or Toast carries
 * an action — a field, a "don't show again" checkbox — and inline validation
 * renders inside a soft `destructive` block, so the edge a reader uses to see an
 * unchecked control is painted on these fills too. Held to the boundary floor.
 */
const controlBoundarySoftPairs: readonly ContrastPair[] = softSurfaceRoles.map(
  (background): ContrastPair => ["borderStrong", background, "boundary"],
);
```

Spread it in `contrastPairs` after `...controlBoundaryPairs`, and extend that
list's JSDoc sentence to name the soft status fills.

### 4.2 `packages/tokens/src/color.ts`

- `darkColors.borderStrong: "#77808F"` → `"#868FA0"`.
- `ThemeColors.borderStrong` comment: "Control boundaries on plain surfaces, the
  quiet panel, row washes and the soft status fills an alert or toast paints."
- `darkColors`'s file comment gains one sentence: the boundary is lighter than
  plan `084` left it so a checkbox inside an Alert or Toast keeps its edge on the
  soft fills (plan `092`).

### 4.3 `packages/tokens/src/control-boundary-soft.test.ts` (new)

Header comment states the defect (the three identity dark figures above).

Tests:

1. **Every shipped set clears the floor on all four soft fills.** Build the
   sixteen variants as `control-boundary.test.ts` does; collect misses; assert
   empty.
2. **The exact regression.** Identity dark: the old `#77808F` on `successSoft`
   measures `< 3` while the shipped value measures `>= 3`; assert the shipped
   value is `#868FA0`, and that `warningSoft` was the one surface that already
   passed (3.03) — that is why the audit named three surfaces, not four.
3. **High contrast clears 4.5:1 on all four.** Both high-contrast sets and their
   three platform variants, since `borderStrong` is `#AAAAAA` there.
4. **The public checker reports the pairs.** Extend the identity dark theme with
   `borderStrong: "#77808F"`; `themeContrastFailures` contains exactly the three
   failing soft fills at the `boundary` class and floor 3.
5. **Publishes one pair per soft fill.** Filter `contrastPairs` for
   `foreground === "borderStrong"` with a soft background; assert four, one per
   role, no duplicates.

Keep the file under ~110 lines. Use `palette` and the exported theme builders;
no literal copy of a colour the package already names, except the documented
"before" value in the regression test.

### 4.4 `packages/tokens/src/contrast.test.ts`

- Header: a plan 092 paragraph — the boundary was measured on the state washes
  but not the four soft status fills, and identity dark measured 2.77:1 on
  `successSoft`, 2.94 on `destructiveSoft` and 2.97 on `infoSoft`.
- `covers every documented pair`: `109` → `113`.

### 4.5 `packages/tokens/src/docs.test.ts`

- The contrast-surfaces sentence (the one that ends "…still shows its edge")
  gains: the `borderStrong` boundary is also measured on the four soft status
  fills, so a control inside an Alert or Toast keeps its edge. Mirror the exact
  wording in `docs/tokens.md` §Verification.
- Add a figures test in "docs/tokens.md quoted figures": the three identity dark
  ratios are derived from the palette and the pre-092 value `#77808F` and the
  sentence names them; the fix sentence names `#868FA0`. Build the numbers with
  `contrastRatio`, not literals.
- The §9 floor row becomes: `… and essential boundaries on \`popover\`, \`muted\`,
  the four state washes and the four soft status fills | 3:1 | 4.5:1 |`.
  `docs/design-system.md` must contain the same row.

### 4.6 `docs/tokens.md`

- §Colour roles prose (the `borderStrong` sentence): add "and the soft status
  fills an Alert or Toast paints" to the surfaces.
- Default colour table: dark `borderStrong` `#77808F` → `#868FA0`. Both tables'
  Use cell: "essential control boundaries, including on row washes and soft
  status fills".
- §Checking a theme: the boundary clause adds the four soft fills.
- §Verification: the plan 092 paragraph with the three figures and the fix.
- The contrast-surfaces paragraph gains the sentence from §4.5.

### 4.7 `docs/design-system.md`

- §7 `borderStrong` bullet: add the four soft status fills to the surfaces it
  meets 3:1 against.
- §9 row: the wording from §4.5.

### 4.8 `packages/tokens/README.md` and `readme.test.ts`

- The boundary paragraph names the soft status fills and adds one sentence with
  the three figures and the fix.
- `readme.test.ts` asserts that sentence, built from the implementation where a
  number is involved (the old value written as the documented "before" literal).

### 4.9 `COMPONENTS.md`

- *Theme contrast check* row: `109` → `113` pairs, and append a plan 092
  sentence naming the four soft fills, the three identity dark figures and the
  moved value.
- *Design tokens* row: extend the boundary clause with the soft fills (one
  clause, no role count change — 58 stays).

### 4.10 `TODO.md` and the plan index

- Tick the row at the bottom of the tokens section and bump the section bar
  `59/78` → `60/79`.
- Add a pending row for the focus ring on the soft fills (plan `093`).
- `.agents/slop/plans/README.md`: add the `092` row after `091` and a paragraph.

## 5. Commands, in order

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the package suite passes with 30 files, `check`/`lint`/root `test`
clean.

**Two-direction proof:**

1. Restore identity dark `borderStrong` to `#77808F` and run the package suite:
   `control-boundary-soft.test.ts` must fail on `successSoft` (2.77),
   `destructiveSoft` (2.94) and `infoSoft` (2.97), and the public checker test
   must report the three pairs. Restore.
2. Delete `...controlBoundarySoftPairs` from `contrastPairs`: the pair-count test
   must fail (`expected 109 to be 113`) and the four-pair test must fail.
   Restore.
3. Confirm the final suite is green.

Record the exact failure text in §8.

## 6. STOP conditions

- **Any shipped set still fails a soft pair after the move.** The margins are in
  §2.2; a different failure means another value moved. Do not lower the floor.
- **The new `borderStrong` collides with `border` in the identity dark set**
  (`#343B47`). It must stay a distinct, darker decorative role (plan `080`).
- **The value change breaks an existing boundary pair.** Lighter is monotonic on
  every dark surface, so a failure means a surface is lighter than
  `borderStrong` there; measure before editing anything else.
- **A consumer package hard-codes the old `#77808F`.** Record it in `TODO.md`;
  do not edit the other workstream.
- **The docs sentence cannot be derived.** Build the figures from
  `contrastRatio` and the documented "before" literal; never retype a measured
  ratio.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `control-boundary-soft` #1 | unit | a shipped theme losing the edge on a soft status fill |
| `control-boundary-soft` #2 | unit | the exact identity dark regression (2.77 / 2.94 / 2.97) |
| `control-boundary-soft` #3 | unit | the AAA boundary dropping under 4.5 on a soft fill |
| `control-boundary-soft` #4 | unit | the public checker silently dropping the soft fills |
| `control-boundary-soft` #5 | unit | the soft list shrinking or growing without a deliberate edit |
| `contrast.test.ts` pair count | unit | a pair added or removed without updating the stated total |
| `color.test.ts` / `platforms.test.ts` loops | unit | any shipped set failing a documented pair |
| `docs.test.ts` figure, §9 row, sentence | unit | a document that stops naming a surface or figure the contract checks |
| `readme.test.ts` | unit | the consumer-facing front door drifting from the contract |

## 8. Outcome (executed on this host, 2026-10-17)

- `contrastPairs` now holds **113** pairs: 109 + `borderStrong` on `infoSoft`,
  `successSoft`, `warningSoft` and `destructiveSoft`.
- Identity dark `borderStrong` `#77808F` → `#868FA0`. Measured after the move:
  3.39:1 on `successSoft` (the tightest), 3.60:1 on `destructiveSoft`, 3.64:1 on
  `infoSoft` and 3.71:1 on `warningSoft`; its tightest existing boundary pair
  moved 3.31:1 → 4.06:1 on `accent`/`selected`.
- The failing run before the move named exactly three pairs:
  `identity dark default: borderStrong on infoSoft at 2.9718000814276277`,
  `… on successSoft at 2.7660454515169555`,
  `… on destructiveSoft at 2.9423184916516485`; `warningSoft` already passed.
- Two-direction proof (`nub run --filter @gpuixui/tokens test`):
  - restoring `#77808F` failed **4** tests: the shipped-theme loop with the three
    pairs above, the exact-value assertion (`expected '#77808F' to be
    '#868FA0'`), the colour-table guard and the quoted-figures guard;
  - removing `...controlBoundarySoftPairs` from `contrastPairs` failed **3**
    tests: `expected 109 to be 113`, the checker pair test
    (`expected [] to deeply equal [ …(3) ]`) and the four-pair test
    (`expected [] to have a length of 4 but got +0`);
  - restored, the package suite is green: **30 files, 1475 tests**.
- `nub run check`, `nub run lint` and `nub run test` all pass.

## 9. Acceptance

- [x] `controlBoundarySoftPairs` is public (via `contrastPairs`) and reported by
      `themeContrastFailures`.
- [x] Every shipped theme clears the boundary floor on all four soft fills, and
      both high-contrast sets clear 4.5:1.
- [x] The identity dark regression is guarded in both directions.
- [x] `docs/tokens.md`, `docs/design-system.md`, the package README and
      `COMPONENTS.md` name the surfaces, the counts and the figures, all built
      from the implementation.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
- [x] The plan index row is marked done and the `TODO.md` row is ticked.
