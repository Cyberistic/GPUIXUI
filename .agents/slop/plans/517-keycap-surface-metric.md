# Plan 517 — the keycap surface a theme cannot own or check

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
011 (the package), 353 (component dimensions), 358 (the numeric contract), 360
(the finite pass), 367 (the type-scale contract), 384/386 (content-box fit).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`Keycap` is a themed surface in `packages/components/src/keyboard-shortcuts.tsx`:
it paints `muted`, a `border` edge, `radius.sm` and the **caption** type role.
Its box, however, is two literals:

```tsx
minWidth: 20,
height: 20,
```

That makes one surface half-tokenised. A brand can change the keycap's fill,
edge and radius, but not its size — and nothing checks that the size fits the
text inside it. The interior is `height - 2 * borderWidth.thin` = 18px and the
shipped caption line box is 16px, so today it fits with 2px to spare. The gap is
what a theme edit does to it:

```ts
extendTheme(getTheme("light"), {
  typography: { caption: { fontSize: 12, lineHeight: 22 } },
});
```

Every metric rule still passes — 22 is a valid caption leading and the smallest
control is held to a label/body line, not to caption — but the keycap's 18px
content box clips a 22px line. `themeMetricFailures` returns `[]`, so the
library's guarantee misses a shipped component:

| check | failures for the probe theme |
| ----- | ---------------------------- |
| `themeColorFailures` | 0 |
| `themeTypefaceFailures` | 0 |
| `themeContrastFailures` | 0 |
| `themeMetricFailures` | **0** |

The same class of defect plans 384 and 386 fixed for the field's icon and its
body line: **a size that must fit must fit its content box**. The keycap is the
one bespoke text surface whose height is still outside both the theme and the
contract.

This is also a component-dimension completeness gap against `MISSION.md`
("typography scales; spacing; component dimensions"). Plan 353 tokenised every
fixed surface metric in the tree it audited; `Keycap` and the `Carousel`,
`Timeline`, `Chat` parts landed afterwards. The keycap is the only one of those
with **text** inside a fixed box, so it is the only one that can silently clip
when a consumer edits the type scale. The others are marks and chrome whose
geometry is component paint, not a themed surface (a carousel dot's diameter, a
timeline dot's diameter, the toast's 3px tone bar); this plan deliberately does
not tokenise them.

## 2. Decision

Add **one** dimension — `keycapSize` — and **one** content-box rule:

1. `dimensions.keycapSize` defaults to **20px**, so no shipped pixel moves.
2. The numeric contract holds it to
   `typography.caption.lineHeight + 2 * borderWidth.thin`. Caption is the role
   `Keycap` paints, and the two borders are painted inside the height, which is
   the same bound plans 384 and 386 use.
3. No new rule name: the failure is `at-least` on
   `dimensions/keycapSize`, so `metricRules` keeps its nine values and every
   diagnostics count stays true.
4. The dimension is `Positive` and `finite` like every other, so a zero keycap
   or an infinity is reported rather than painted as an invisible surface.
5. Every shipped theme, platform variant and recipe inherits 20 and passes,
   because every shipped caption is 12/16.

## 3. Exact edits

### 3.1 `packages/tokens/src/scale.ts`

Append to `Dimensions`, after `previewCardMaxWidth`:

```ts
  /** 20px — the fixed keycap a shortcut label sits in. */
  readonly keycapSize: number;
```

and to `dimensions`, after `previewCardMaxWidth: 360,`:

```ts
  keycapSize: 20,
```

### 3.2 `packages/tokens/src/metrics.ts`

In `themeMetricFailures`, in the `dimensions` group:

- add `["keycapSize", dimensions.keycapSize]` to `finiteMembers`;
- add `...positive("dimensions", "keycapSize", dimensions.keycapSize)`;
- add the content-box rule after the chip/field rule:

```ts
    // A keycap paints the caption role inside a fixed surface: its two borders
    // are inside `keycapSize`, so a caption leading that grows past the content
    // box clips the shortcut label.
    ...atLeast(
      "dimensions",
      "keycapSize",
      dimensions.keycapSize,
      typography.caption.lineHeight + 2 * borderWidth.thin,
    ),
```

Update the `themeMetricFailures` JSDoc `dimensions` bullet to name the keycap
alongside the surface metrics ("a keycap fits one caption line plus its two
borders"), so the public reference states the rule it enforces.

### 3.3 `packages/tokens/src/keycap-fit.test.ts` (new)

Header comment states the bug being guarded: the keycap's fixed height was a
literal, so a copied theme that enlarges the caption leading clips every
shortcut label while `themeMetricFailures` returns `[]`.

Cases (all must be able to fail):

1. **Shipped set passes.** For every `shippedThemes` entry, no failure names
   `keycapSize`.
2. **The probe is reported.** `extendTheme(lightTheme, { typography: { caption:
   { fontSize: 12, lineHeight: 22 } } })` yields exactly one failure:
   `{ group: "dimensions", member: "keycapSize", rule: "at-least", actual: 20,
   bound: 24 }`, and `themeContrastFailures` on the same theme is `[]` (the
   defect is numeric, not colour).
3. **A shrunk keycap is reported.** `dimensions: { keycapSize: 17 }` yields
   `at-least` with `bound: 18`; `keycapSize: 18` is accepted (the content box
   fits the line exactly).
4. **A zero keycap is not a surface.** `keycapSize: 0` yields the `positive`
   failure (and the `at-least` failure); the case pins both so a rule removal
   fails.
5. **The theme owns the value.** `extendTheme(lightTheme, { dimensions: {
   keycapSize: 24 } })` resolves to 24, keeps the other dimensions, and every
   shipped platform style still resolves to 20 (they name no dimension).
6. **The value is finite.** `keycapSize: Infinity` is reported as `finite`.

Also add `clippedKeycap` / `clippedKeycapFailures` to
`packages/tokens/src/metrics.example.ts` — the executed, copyable form of the
probe — and assert it in case 2, so an example cannot drift the way plan 350's
`primary-text.example.ts` did.

### 3.4 `packages/tokens/src/dimensions.test.ts`

No new case is needed. The existing "ships a positive whole-pixel metric for
every dimension" case walks `Object.entries(dimensions)`, so it covers the new
field automatically, and the content-box rule is owned by the new suite rather
than duplicated here.

### 3.5 `docs/tokens.md`

Add the row after `dimensions.previewCardMaxWidth`:

```
| `dimensions.keycapSize` | 20 | fixed keycap a shortcut label sits in; held to one `caption` line plus its two borders |
```

Add one sentence to the prose under the table: a keycap is a fixed surface, not
a spacing decision, and its content box holds one caption line.

### 3.6 `docs/design-system.md` §6

Extend the "Component dimensions are **fixed**" paragraph with the keycap:

> A keycap is 20px and holds one `caption` line plus its two borders; the
> metric contract reports a theme whose caption leading outgrows it.

### 3.7 `packages/tokens/src/docs.test.ts`

- The existing `lists every component dimension` case walks
  `Object.entries(dimensions)`, so it requires the new row automatically.
- Extend the `states the fixed component dimensions` sentence to include
  "and a keycap is `${dimensions.keycapSize}px` tall, fitting one caption line
  plus its borders", so the design-system page names it and the guard derives
  the number.

### 3.8 `COMPONENTS.md`

In the **Theme metric check** row, append to the `dimensions` clause: "a keycap
fits one `caption` line plus its two borders, because `Keycap` paints caption
text inside `dimensions.keycapSize` (plan 517)". In the **Design tokens** row,
add `keycap` to the component-dimension list.

### 3.9 `TODO.md`

- Add and tick the tokens-side task, naming plan 517 and the 20px value.
- Add the cross-team row for `components` to read
  `theme.dimensions.keycapSize` for the keycap's `minWidth`/`height`
  (owner: `components`).
- Recompute the workstream progress bar: 181/242 before, plus one ticked task
  and one open cross-team task → **182/244**.

### 3.10 `.agents/slop/plans/README.md`

Add the plan row after 516 and a short narrative paragraph describing the
defect, the one-field decision and the probe.

## 4. Commands and expected results

```sh
cd packages/tokens
../../node_modules/.bin/vitest run src/keycap-fit.test.ts
# 6 cases pass
../../node_modules/.bin/vitest run src/metrics.test.ts src/dimensions.test.ts src/docs.test.ts
# green, including the new docs row
nub run --filter @gpuixui/tokens test
# 110 files, all green
```

From the worktree root:

```sh
nub run check
nub run lint
nub run test
```

Expected: every gate green; `nub run check` includes `check:tests`, the formatter
and the type check.

## 5. STOP conditions

Stop and report (do not improvise) if:

- `Dimensions` already carries `keycapSize` — another plan landed; rebase and
  re-derive this plan's edits;
- a shipped theme's `caption.lineHeight` is not 16 — that is a palette/type
  defect, not a missing rule; report the set and value instead of moving it;
- `themeMetricFailures` already reports a keycap-like rule (`rg keycapSize` in
  `src/`) — reconcile with the existing rule rather than adding a second;
- the design-system sentence guard's exact prose no longer matches after a
  concurrent docs edit — reconcile the page and the guard, never delete the
  guard;
- `docs/tokens.md` already lists the row from another branch — keep one row and
  make the guard derive it.

## 6. Test plan (both directions)

- **Without the fix:** write `keycap-fit.test.ts` first. Case 2 cannot type-check
  before `keycapSize` exists; once the field exists with the token but before
  the `atLeast` rule, case 2 returns `[]` and fails, and case 3 fails for the
  same reason. Case 4 fails without the `positive` line and case 6 without the
  `finite` line.
- **With the fix:** all six pass; every shipped set passes; the probe reports
  exactly the one dimension failure with `themeContrastFailures` empty; the docs
  guard fails if the new row or the design-system sentence is missing, and the
  catalogue guard fails if the default value drifts from 20.
- **No other value moves:** a probe prints every shipped theme's
  `dimensions` before and after; only the new key is added.

## 7. Acceptance

- `theme.dimensions.keycapSize` is 20 in every shipped theme, platform variant
  and recipe, and a copied theme can change it.
- `themeMetricFailures` reports a theme whose caption leading outgrows the
  keycap content box, and a zero or non-finite keycap.
- `docs/tokens.md`, `docs/design-system.md`, the ledger and the plan index name
  the metric and its rule; `docs.test.ts` derives the row and the sentence.
- The cross-team migration for `components` is recorded in `TODO.md`.
- `nub run check`, `nub run lint` and `nub run test` pass; the commits are on
  `agent/tokens-theme` and pushed.
