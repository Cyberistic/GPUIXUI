# 086 — A total contrast contract, and the ring on every surface a control sits on

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `059`, `071`–`085` (the contrast contract) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

The contract has grown one blind spot per audit: the skeleton (`078`), secondary
text (`079`), the control edge (`080`), the selection wash (`081`), brand text
(`082`), status text (`083`) and the control boundary (`084`) were each painted
by a shipped component and each missing from `contrastPairs` while the suite
stayed green. Nothing in the package makes that class of defect impossible — a
55th role, or an existing role painted on a new surface, can still ship
unmeasured.

Two facts from an audit of the 54 roles:

1. **Five roles are still in no pair**: `overlay`, `disabled`,
   `disabledForeground`, `scrollbar` and `shadow`. Four are defensible (a scrim,
   an intentionally dim inactive state WCAG exempts, a reserved runtime feature,
   an elevation tint); they must be *declared*, not merely absent. Nothing states
   the exemption today, so a sixth unmeasured role is indistinguishable from
   these five.
2. **The focus ring is measured on six of the eight surfaces a focused control
   can sit on.** `074` added the `hover`/`active`/`selected` washes, but a
   sidebar control sits on `muted` and a selectable row paints `accent` while the
   pointer is over it. Both pairs pass in all sixteen shipped themes, so no
   colour moves — this is the guard that keeps it true.

## 2. Design decisions (do not re-litigate)

1. **`ringSurfaces` is one list, in one place.** `background`, `card`,
   `popover`, `muted`, `accent`, `hover`, `active`, `selected`. The six literal
   ring pairs become `...ringPairs`; the pair count moves 101 → 103.
2. **A role is either measured or exempt, and the exemption is data in the
   test.** The test names each exempt role with its reason and fails on a role
   that is neither. It also fails on a stale exemption (a role that is exempt
   *and* measured, or a name that no longer exists), so the list cannot rot.
3. **The exemption list lives in `contrast.test.ts`, not in the public API.**
   It documents an audit decision, not a guarantee a consumer runs. The public
   contract stays `contrastPairs`, `contrastFloors`, `selectionPairs` and the
   failure checker.
4. **No colour moves.** Every ring pair already clears its floor in all sixteen
   shipped themes; the lowest is macOS light on `active` (3.44:1, already
   measured) and the new pairs measure 3.72 or better.
5. **`input` and `secondary` are not ring surfaces.** The ring is painted
   outside a control's border box, on the surface behind it; a field's own
   `input` fill and a control's `secondary` fill are what the ring surrounds,
   not what it sits on. Say so in the docs so the omission is deliberate.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/086-total-contrast-contract.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the plan row and its paragraph |
| `packages/tokens/src/contrast.ts` | `ringSurfaces` + `ringPairs`, replacing the six literals |
| `packages/tokens/src/contrast.test.ts` | pair count `101` → `103`; a completeness suite |
| `packages/tokens/src/ring-surfaces.test.ts` | **new** — the ring regression and the totality guard |
| `docs/tokens.md` | the contract paragraph, the verification sentence, the exemption list |
| `COMPONENTS.md` | *Theme contrast check* row: count and the two closures |
| `TODO.md` | one ticked row and the section bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

Replace the six literal `["ring", …]` entries with one generated block, placed
after the `foreground`/`hover`/`active` pairs:

```ts
/**
 * The surfaces a focused control can sit on: the plain surfaces, the quiet
 * panel a sidebar control sits on, the accent a selectable row paints, and the
 * three state washes a focused row paints. The ring is painted outside the
 * control, on the surface behind it, so each must keep it visible.
 */
const ringSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "accent",
  "hover",
  "active",
  "selected",
] as const;

const ringPairs: readonly ContrastPair[] = ringSurfaces.map(
  (background): ContrastPair => ["ring", background, "boundary"],
);
```

Spread `...ringPairs` once. Update the `contrastPairs` JSDoc: the ring is
measured on the quiet panel and the accent wash as well as the state washes.

### 4.2 `packages/tokens/src/contrast.test.ts`

- Pair count `101` → `103`.
- Header: add the plan-086 paragraph (the totality guard and the two ring
  surfaces).
- New `describe("contract completeness")`:
  - `const exempt: Readonly<Record<keyof ThemeColors, string>>` is not the shape
    wanted — use a `ReadonlyArray<readonly [keyof ThemeColors, string]>` so the
    reasons are readable. Entries:
    - `disabled` — "an inactive surface; WCAG exempts inactive controls, and the
      design system requires a visible dim rather than a floor";
    - `disabledForeground` — same state, same reason;
    - `overlay` — "a modal scrim; its job is to obscure, and the content beneath
      is the measured surface";
    - `scrollbar` — "reserved; the pinned runtime paints the platform scrollbar
      and exposes no tint";
    - `shadow` — "an elevation tint applied at a level's alpha, never painted as
      text or a bounded surface".
  - `every role is measured or exempt`: build `measured` from `contrastPairs`,
    `selectionPairs` and `"selection"`; assert
    `colorRoles.filter((role) => !measured.has(role) && !exemptNames.has(role))`
    is `[]`.
  - `no stale exemption`: every exempt name is in `colorRoles`, and none is in
    `measured`.
  - `measures the ring on every surface a control sits on`: assert the eight
    `[foreground === "ring", background]` pairs exist, exactly once each.

### 4.3 `packages/tokens/src/ring-surfaces.test.ts` (new)

Header: the bug guarded — `ringSurfaces` was six surfaces, so a focused control
on the `muted` sidebar panel or on a row's `accent` wash had no measured focus
ring; `074` had added only the three state washes, and nothing stated which
roles are exempt.

1. `keeps the ring visible on every shipped surface` — all sixteen themes
   (`getTheme` × 2 modes × 2 contrasts, plus `getPlatformTheme` for
   `platformNames` × modes × contrasts); collect misses from the eight ring
   pairs; assert `[]`.
2. `names the quiet panel and the accent wash as ring surfaces` — the two new
   pairs exist and each shipped theme measures `>=` its floor (3 default, 4.5
   high).
3. `publishes the eight ring surfaces` — exactly eight unique ring backgrounds,
   in the documented order.
4. `the checker reports a ring that vanishes` — extend the identity light theme
   with `ring: "#F6F8FA"` (the canvas) and assert `themeContrastFailures` names
   `background`, `card`, `popover`, `muted`, `accent`, `hover`, `active` and
   `selected` at the `boundary` class.

### 4.4 `docs/tokens.md`

- The contract paragraph (line 848): add "the focus ring on the plain surfaces,
   the `muted` panel, the `accent` wash and the `hover`/`active`/`selected`
   washes".
- The verification sentence (line 1063): the ring list becomes the eight
  surfaces, and says the list is generated from `ringSurfaces`.
- Add one paragraph after it: no colour role ships unmeasured — a role is either
  in `contrastPairs`/`selectionPairs` or on the exempt list the suites keep
  (`disabled`/`disabledForeground`, `overlay`, `scrollbar`, `shadow`), with the
  reason; a new role fails the suite until it is measured or argued.
- Name why `input` and `secondary` are not ring surfaces (decision 5).

### 4.5 `COMPONENTS.md`

*Theme contrast check* row: `101` → `103` pairs; add the plan-086 sentence —
  the ring on the `muted` panel and the `accent` wash, and the totality guard
  that fails a role neither measured nor exempt.

### 4.6 `TODO.md`

- Add a ticked row:
  `[x] Make the contrast contract total — five roles were silently unmeasured with no stated exemption, and the focus ring missed the muted panel and the accent wash a focused row paints; both are closed (plan 086)`
- Section bar `53/71` → `54/72`.

## 5. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter @gpuixui/tokens test` | all suites green, including `ring-surfaces.test.ts` |
| `nub run --filter @gpuixui/tokens check-types` | clean |
| `nub run check` | clean |
| `nub run test` | every workspace green |

**Two-direction proof** (required before committing):

1. Remove `"muted"` and `"accent"` from `ringSurfaces`: the count must fail
   (`expected 101 to be 103`), `publishes the eight ring surfaces` must fail,
   and `names the quiet panel…` must fail. Record the text.
2. Move `disabled` out of the exempt list: `every role is measured or exempt`
   must fail naming `disabled` and `disabledForeground`. Restore.
3. Add `"input"` to `ringSurfaces`: the count and the eight-surface test must
   fail (it is deliberately not a ring surface). Restore.

## 6. STOP conditions

Stop and report with evidence if:

- **A new ring pair fails in a shipped theme.** The audit says every shipped
  pair clears its floor; a failure means a different value moved. Report the set,
  surface and ratio; do not move a colour without a plan.
- **The exemption list needs a sixth reason.** Add it with a real argument; if
  the role is paintable as text or a bounded surface, it is a pair, not an
  exemption.
- **`contrastPairs` order changes a documented table.** The docs derive counts
  and rows, not positions; if a table guard breaks, fix the guard rather than
  restoring literal pairs.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `ring-surfaces` #1 | unit | a shipped theme losing focus visibility on any surface |
| `ring-surfaces` #2 | unit | `muted`/`accent` dropping out of the ring list again |
| `ring-surfaces` #3 | unit | the ring list growing or shrinking without a deliberate edit |
| `ring-surfaces` #4 | unit | the public checker silently dropping a ring surface |
| `contract completeness` | unit | a role shipping with no measured pair and no stated exemption |
| `contrast.test.ts` pair count | unit | a pair added or removed without updating the stated total |
| generic colour loops | unit | any shipped set failing a documented pair |
| docs guards | unit | a document that stops naming a surface or the exemptions |

## 8. Outcome (executed on this host, 2026-10-17)

- `contrastPairs` holds **103** pairs: 101 + `ring` on `muted` and `accent`.
  No colour moves; the lowest shipped ring pair is macOS light on `active` at
  3.44:1 (already measured). The two new pairs measure 3.72 on the identity
  light, 3.99 / 4.12 on macOS light and 7.33 / 6.49 at high contrast, and all
  sixteen shipped themes pass on all eight surfaces.
- `ring-surfaces.test.ts` proves the eight surfaces, the two new ones, and the
  public checker naming every wash; `contrast.test.ts` gains the totality guard.
- The exempt list is `disabled`, `disabledForeground`, `overlay`, `scrollbar`
  and `shadow`, each with a stated reason.
- Two-direction proof (`nub run --filter @gpuixui/tokens test`):
  - removing `muted`/`accent` produced **4 failed / 1307 passed** (the suite is
    parametrized over pairs, so the total drops to 1311): the pair count
    (`expected 101 to be 103`), the checker's eight-surface test and both
    `ring-surfaces` list tests;
  - removing `disabled` from the exemptions produced **1 failed / 1330 passed**:
    `every role is measured or exempt`, naming `['disabled',
    'disabledForeground']`;
  - adding `input` to `ringSurfaces` produced **4 failed / 1337 passed** (the
    total rises to 1341): the count (`expected 104 to be 103`), the checker and
    both `ring-surfaces` list tests.
- Suites green: 24 files, 1331 tests.
