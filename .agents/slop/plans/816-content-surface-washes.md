# 816 — The content-surface washes must be washes, not surfaces

**Phase:** F (design-system correctness in the frame) · **Workstream:** playground · **Status:** landed

**Depends on:** `674`, `690`, `697`, `701`, `707`, `708`, `713`, `715`, `722`,
`736`, `745`, `754`, `761`, `773`, `775`, `778`, `784`, `791`, `797`, `801`,
`807`, `812`.

**Owns:** `apps/playground` only (the mapping lives in the playground today;
hoisting it to `primitives` is the existing cross-team row). `COMPONENTS.md` and
the ledgers are updated for the record.

---

## 1. The bug being guarded

`nativeContentTheme` (`apps/playground/src/scenarios/surface-theme-model.ts`) is
the design system's only mapping for `<markdown>`, `<code>` and `<diff>`. Two of
its fields are named after a **wash** but are mapped to an **opaque surface**:

```ts
codeWash: theme.colors.muted,     // #222730 — opaque
diffHunkBg: theme.colors.muted,   // #222730 — opaque
```

The pinned runtime (`release/gpuix`, tag `9fcd6288`) uses both as **fills whose
alpha is the point**:

| Field | Runtime use | Runtime default (dark) |
| ----- | ----------- | ---------------------- |
| `code_wash` | the quad painted **behind inline code** — `markdown/render.rs:362`, with `md_inline_code_radius`, `INLINE_CODE_PAD_X`, `INLINE_CODE_INSET_Y` | `with_alpha(oklch(0.702, 0.183, 293.541), 0.12)` |
| `diff_hunk_bg` | `.bg(theme.diff_hunk_bg)` on the hunk-header row — `custom_elements/diff.rs:546` | `hsla(0.6, 0.35, 0.6, 0.05)` |

So the shipped mapping turns the inline-code chip into a **solid `#222730`
block** and the hunk header into a **solid bar**, where the runtime paints a
12 % / 5 % tint over the plane. The names in the theme API (`code_wash`,
`diff_hunk_bg`) and our own field names say "wash"; the values say "surface". A
themed markdown preview therefore reads as heavy chips and a heavy table-of-
hunks header, and no test notices: plan `784` asserted the inline code's **ink**
(`primary`) and the diff's row **tints**, never the chip or the hunk band.

The `muted` role is a legitimate **surface** in the rest of the system (a
muted panel), which is exactly why the misread is plausible and why it needs a
name-level fix rather than a comment.

**Goal:** map both fields to real washes derived from semantic roles, prove the
hunk wash in decoded frames in both hosts, and pin the mapping so an opaque
value cannot come back.

---

## 2. Reconnaissance (measured)

- `alpha(color, amount)` is exported by `@gpuixui/tokens`
  (`packages/tokens/src/color.ts:417`), clamps `0…1`, replaces an existing
  alpha byte and returns 8-digit `#RRGGBBAA`; a non-hex value stays solid. It is
  already used in `scenarios/crop.tsx`.
- The runtime accepts an 8-digit colour and composites it: plan `701` measured
  the `selection` role's wash (`#353851` over `#11141A`), plan `807` measured an
  alpha gradient stop, and plan `761` measured `opacity` compositing.
- The dark palette (`getTheme("dark")`): background `#11141A`, card `#191D25`,
  muted `#222730`, mutedForeground `#A1A9B7`, primary `#A7A9FF`.
  The light palette: background `#F6F8FA`, card `#FFFFFF`, muted `#EEF1F5`,
  mutedForeground `#545D6C`, primary `#5F4BDB`.
- Expected composites with the chosen alphas (sRGB, computed and re-derived in
  the test, not hardcoded in the view):
  - dark hunk, 6 % mutedForeground over background → **`#1A1D23`**;
  - light hunk, 6 % mutedForeground over background → **`#ECEFF1`**;
  - dark inline code, 12 % primary over card → **`#2A2E3F`**;
  - light inline code, 12 % primary over card → **`#ECE9FB`**.
  The opaque `muted` is `#222730`, delta `17/19/22` from the dark plane — far
  outside the `INK_TOLERANCE` the pixel checks use.

---

## 3. Design

### 3.1 The mapping

```ts
codeWash: alpha(theme.colors.primary, 0.12),
diffHunkBg: alpha(theme.colors.mutedForeground, 0.06),
```

- **Inline code carries the accent family**: the runtime's own default is a
  violet at 12 %, and a token chip in our system is an accent-affine surface.
- **The hunk header is chrome**: a neutral band (mutedForeground at 6 %) over
  the diff plane keeps the three hues meaningful (added `success`, deleted
  `destructive`, hunk neutral) and matches the header's `placeholder` text.
- Both are **derived from semantic roles with `alpha`**, never literals, so a
  palette change moves them and a platform style keeps the relation.

### 3.2 The frame proof

`diffRowPoints` gains a `hunk` point: `x` past the short header text
(`box.x + width − 24`), `y` in the middle of the 28 px hunk row
(`body − DIFF_HUNK_HEADER / 2`). The `surface-theme` scenario — which both
`surface-theme` and `live-surface-theme` already share through one `ThemeDriver`
— gains two checks:

1. `the hunk header paints diffHunkBg over the diff plane` — equals
   `wash(ink.mutedForeground, 0.06, ink.plane)`.
2. `the hunk band is lighter than the opaque muted surface` — the composite
   differs from `muted` by more than the tolerance, so restoring the old value
   fails **by name** rather than merely differing.

The inline-code chip is **not** pixel-sampled: the chip's geometry depends on
the runtime's text layout (`INLINE_CODE_PAD_X`/`INSET_Y`), and a glyph-free
sample point inside it cannot be derived without a new scan. Its translucent
value is pinned by the mapping test, and the hunk band proves the same mechanism
(an alpha theme field reaching the paint) in both hosts. Recorded, not hidden.

### 3.3 The pure guards

`surface-theme-model.test.ts` gains:

- `codeWash` and `diffHunkBg` are 8-digit with a non-`FF` alpha (fails today:
  `muted` is 6-digit);
- each composite over its plane differs from the plane by more than
  `INK_TOLERANCE` (a wash that equals the plane is invisible);
- each differs from the opaque `muted` (the regression's fingerprint);
- the light palette's composites are the values in §2 (the relation, not a
  literal in the view).

---

## 4. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/surface-theme-model.ts` | `alpha` import; the two mappings; `hunk` in `DiffRowPoints`; a `wash` helper; `HUNK_TINT_ALPHA`/`CODE_WASH_ALPHA` constants; doc comments |
| `apps/playground/src/scenarios/surface-theme-model.test.ts` | four new guards (§3.3) and the header comment |
| `apps/playground/src/scenarios/surface-theme.tsx` | two checks (§3.2) |
| `apps/playground/README.md` | the "content-surface theme" section: the wash facts, the chip limit, the measured composites |
| `COMPONENTS.md` | one sentence on the Markdown/Code/Diff row: the wash mapping and its frame evidence |
| `.agents/slop/plans/README.md`, `TODO.md` | row `816`, ticked task |

No other path is edited.

---

## 5. Steps, commands, expected results

1. **Read the runtime use** to confirm the fill semantics:
   ```sh
   sed -n '355,380p' .agents/slop/scratch/gpuix-build/release/gpuix/packages/native/src/markdown/render.rs
   sed -n '538,552p' .agents/slop/scratch/gpuix-build/release/gpuix/packages/native/src/custom_elements/diff.rs
   ```
   Expected: `let wash = ctx.theme.code_wash;` and `.bg(theme.diff_hunk_bg)`.

2. **Write the failing tests first** (§3.3), then
   ```sh
   nub run --filter playground test -- surface-theme-model
   ```
   Expected: **red** — `codeWash` has no alpha byte and the hunk composite
   equals `muted`.

3. **Implement §3.1–§3.3.** Re-run the unit tests: green.

4. **Build and run the two shared scenarios.**
   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only surface-theme
   nub apps/playground/dist/live/run.js --only live-surface-theme
   ```
   Expected: both green, each **50 → 55** checks (`expectPoint` emits three checks — maps into the frame, has a pixel, equals — and the distinctness guard one).

5. **Mutation proof (the two directions).**
   - Restore `diffHunkBg: theme.colors.muted` → `surface-theme` fails
     `the hunk header paints diffHunkBg over the diff plane` with the muted
     value (`#222730`-family) instead of `#1A1D23`, and the unit mapping test
     fails on the alpha assertion. Run `--only surface-theme`; expect exit `1`.
   - Restore `codeWash: theme.colors.muted` → the unit test fails on
     `codeWash carries an alpha channel` (the frame does not sample the chip).
   - Revert both and re-run: green.

6. **Gates.**
   ```sh
   nub run check
   nub run lint
   nub run test
   ```
   Expected: green; playground test count `+4`.

7. **Ledgers and commit** (§6), then push `agent/playground`.

---

## 6. Test plan

| Test | Guards | Red without the fix |
| ---- | ------ | ------------------- |
| `codeWash is a translucent accent` | the mapping is `alpha(primary, 0.12)` | `#222730` (no alpha) |
| `the hunk band is a translucent neutral` | `alpha(mutedForeground, 0.06)` | `#222730` |
| `both washes differ from the plane and from muted` | invisibility and the regression fingerprint | both equal `muted`/plane |
| `the light palette keeps the relation` | derived, not literal, values | a hardcoded dark colour |
| `the hunk header paints diffHunkBg over the diff plane` (runtime, both hosts) | the value reaches the paint | restoring `muted` |

Each runtime check must name the measured values in its failure message, as the
existing surface checks do.

---

## 7. STOP conditions

- **STOP** if the runtime paints no hunk band at all (the composed value equals
  the plane at the sampling point): the point or the geometry assumption
  (`DIFF_HUNK_HEADER = 28`) is wrong; re-measure before changing the check.
- **STOP** if the 8-digit value is rejected or painted as opaque (the composite
  equals the raw hex): alpha theme fields do not composite on this pin, and the
  mapping must be reconsidered, not forced.
- **STOP** if `surface-theme` or `live-surface-theme` needs a tolerance widened
  beyond `INK_TOLERANCE` or a check removed.
- **STOP** if the inline-code chip's appearance is asserted by eye only — it
  stays a recorded limit.
- **Do not** edit `packages/primitives` (the hoist is a cross-team task) and
  **do not** change the runtime's defaults; the mapping is ours.

---

## 8. Acceptance

- `nativeContentTheme` maps both fields through `alpha` from semantic roles.
- The unit tests fail against the old opaque mapping and pass against the new.
- `surface-theme` and `live-surface-theme` each report **55** checks, green, and
  the hunk-band check fails by name when the old value is restored.
- The README section records the measured composites and the chip limit;
  `COMPONENTS.md` and the ledgers are updated.
- `nub run check`, `nub run lint`, `nub run test` green.


---

## 9. Outcome (measured 2026-10-20)

**Status:** landed. The mapping, the frame proof and the record agree.

**Red first.** With the mapping restored to `muted`, two unit tests failed —
`maps the washes to translucent semantic roles` (`expected false to be true`)
and `carries a non-opaque alpha on both washes` (`expected '30' to be '1F'`) —
and `surface-theme` failed by name with
`the hunk header paints diffHunkBg over the diff plane: expected #1a1d23ff, got #222730ff`
(exit `1`). Reverted: 642 playground tests green and the scenario green again.

**Measured facts.**

- The dark hunk band is **`#1A1D23`** = 6 % `mutedForeground #A1A9B7` over
  `background #11141A`; the old opaque `muted` was `#222730` (delta `17/19/22`).
- The light hunk band is **`#ECEFF1`** = 6 % `#545D6C` over `#F6F8FA`.
- The dark inline-code chip is **`#2A2E3F`** = 12 % `primary #A7A9FF` over
  `card #191D25`; the light one is **`#ECE9FB`** = 12 % `#5F4BDB` over `#FFFFFF`.
- `alpha()` returns 8-digit uppercase hex: `…1F` for 12 %, `…0F` for 6 %.

**Runs.**

| Run | Result |
| --- | ------ |
| `nub run --filter playground test` | 642 tests (635 → **642**, +7) |
| `nub apps/playground/dist/smoke/run.js --only surface-theme` | 1/1, **55** checks, exit `0` (~31–34 s) |
| `nub apps/playground/dist/live/run.js --only live-surface-theme` | 1/1, **55** checks, exit `0` (~25 s) |
| `nub run check` / `lint` / `test` | all exit `0` |

The inline-code chip stays unsampled, as §3.2 recorded; the hunk band proves
the fill mechanism in both hosts. Files: `surface-theme-model.ts` (+ test),
`surface-theme.tsx`, `apps/playground/README.md`, `COMPONENTS.md` (three rows),
the plan index and `TODO.md`.
