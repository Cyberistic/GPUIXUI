# 638 — The field's adornment holds the glyph it paints

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the metric contract), 386 (the
smallest field fits a body line), 517 (the keycap holds its caption line), 620
(the fixed surfaces hold their chrome), 624/634 (the field's query row) ·
**Number block:** 500–699 (`tokens-theme` overflow; 638 is the next free number
in every worktree) ·
**Status:** done

## 1. The defect

`dimensions.fieldAdornmentSize` names the square control inside a field: the
token's own table says “trailing clear control (or other adornment) inside a
field”. Four shipped components paint that control, and every one of them paints
a `caption`-role `✕` in the middle of it:

| File | Control | Size | Type |
| ---- | ------- | ---- | ---- |
| `packages/components/src/search-input.tsx:168-186` | “Clear search” | 18×18 | `textStyle(theme, "caption")` |
| `packages/components/src/time-picker.tsx:404-424` | “Clear time” | 18×18 | `textStyle(theme, "caption")` |
| `packages/components/src/hotkey-recorder.tsx:185-210` | “Clear shortcut” | 16×16 | `textStyle(theme, "caption")` |
| `packages/components/src/tag-input.tsx:279-286` | “Remove …” chip | 16×16 | `textStyle(theme, "caption")` |

The 16px controls are already the token's value — plan 353 settled the 16/18
split on `fieldAdornmentSize`, and the `components` migration is a cross-team
row. The metric contract held the token only to:

- `positive` (every surface metric), and
- `controlHeight.sm ≥ fieldAdornmentSize + 2 * borderWidth.thin` (it must fit
  inside the smallest control), and
- its use as the trailing term of `fieldMinWidth`.

Nothing held the **other** direction: the token is a fixed square that paints a
line of type, exactly like `dimensions.keycapSize`, which plan 517 holds to one
`caption` line plus its two borders. A copied theme that grows the caption
leading and forgets the adornment ships a square with an overflowing `✕` while
every check returns `[]`.

### The probe

```ts
const clipped = extendTheme(getTheme("light"), {
  typography: { caption: { lineHeight: 20 } },
  dimensions: { keycapSize: 22 }, // keeps plan 517's rule coherent
});
themeMetricFailures(clipped); // []
themeFailures(clipped);       // []
```

`fieldAdornmentSize` is still 16, so the four shipped clear controls (once
migrated) would paint a 20px line inside a 16px square: 2px clipped at the top
and bottom, and the token's own “a field its adornment at every density”
promise is false for a brand that grows the caption role.

The shipped identity keeps `fieldAdornmentSize === caption.lineHeight === 16`,
so the corrected bound is **16 before and after** and no shipped value, colour,
pair, floor or metric moves. No platform style or recipe overrides either
metric (`platform-styles/*.ts` set neither `typography` nor `dimensions`), so
all 24 shipped sets pass at equality.

## 2. Decision

Add one `at-least` rule in the `dimensions` group:

```ts
fieldAdornmentSize ≥ typography.caption.lineHeight
```

The adornment paints no border of its own (the four controls above set
`borderRadius` but no `borderWidth`), so only the line box is charged — unlike
the keycap, whose own `borderWidth.thin` edges are inside its height.

Not changed:

- **the control fit** — `controlHeight.sm ≥ fieldAdornmentSize + 2 * borders`
  still says the adornment fits inside a control.
- **`fieldMinWidth`** — the query row still charges the adornment as its
  trailing action (plans 624/634).
- **`keycapSize`** — its own caption-line-plus-borders rule is untouched.
- **the adornment as an icon** — the token also documents “an icon”, but the
  shipped controls paint the caption role's text glyph; a subsequent plan can
  teach the rule an icon tier only with a consumer that paints one inside this
  square. Do not guess a tier here.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | add the rule after the `keycapSize` bound; extend the **dimensions** bullet of `themeMetricFailures`' JSDoc |
| `packages/tokens/src/field-adornment-fit.test.ts` | new regression suite (header states the defect) |
| `packages/tokens/src/keycap-fit.test.ts` | raise `fieldAdornmentSize` in the 22px-caption probe so it isolates the keycap |
| `packages/tokens/src/metrics.example.ts` | the executed `clippedKeycap` probe grows the adornment with the caption line |
| `docs/tokens.md` | the `fieldAdornmentSize` table row and the keycap paragraph |
| `docs/design-system.md` | extend the guarded fixed-dimensions sentence |
| `packages/tokens/src/docs.test.ts` | extend the guarded sentence in “states the fixed component dimensions” |
| `COMPONENTS.md` | name the rule in the **Design tokens** row |
| `TODO.md` | add and tick the row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-638.md` | the audit note |

No other file. Do **not** edit `packages/components`: its migration to
`theme.dimensions` is a cross-team row (plans 353 and 636).

## 4. `packages/tokens/src/metrics.ts`

After the `keycapSize` rule (the `atLeast` whose bound is
`typography.caption.lineHeight + 2 * borderWidth.thin`), add:

```ts
    // A field's adornment is the square clear control inside a field:
    // `SearchInput`, the `TimePicker`, the `HotkeyRecorder` and the TagInput
    // chip's remove control all spread `textStyle(theme, "caption")` inside it.
    // The control paints no border, so only the line box is charged; a caption
    // leading taller than the square clips the glyph it centres.
    ...atLeast(
      "dimensions",
      "fieldAdornmentSize",
      dimensions.fieldAdornmentSize,
      typography.caption.lineHeight,
    ),
```

In the **dimensions** bullet of the `themeMetricFailures` JSDoc, after the
keycap sentence (“a keycap's content box holds one caption line plus its two
borders, because `Keycap` paints caption text inside it”), add:

> a field's adornment holds one `caption` line, the glyph its clear control
> paints,

so the bullet names both fixed squares that carry the caption role. Change no
other sentence.

## 5. `packages/tokens/src/field-adornment-fit.test.ts`

Create the file with this header:

```ts
/**
 * Guards the defect plan 638 fixes: `dimensions.fieldAdornmentSize` names the
 * square clear control inside a field — SearchInput, the TimePicker, the
 * HotkeyRecorder and the TagInput chip's remove control all paint the `caption`
 * role's `✕` inside it — but the metric contract held it only to a positive
 * size and to fitting inside the smallest control. A copied theme that grew the
 * caption leading to 20px while keeping the 16px adornment returned `[]` from
 * every check while the glyph overflowed the square it is centred in.
 */
```

Imports: `describe`, `expect`, `it` from `vitest`; `shippedThemes` from
`./shipped-themes.js`; `extendTheme`, `getTheme`, `type Theme` from
`./theme.js`; `themeFailures` from `./theme-check.js`; `themeMetricFailures`
from `./metrics.js`.

A helper:

```ts
const adornmentFailures = (theme: Theme) =>
  themeMetricFailures(theme).filter(
    (failure) =>
      failure.group === "dimensions" &&
      failure.member === "fieldAdornmentSize",
  );
```

Cases:

1. **The shipped sets hold the line.** For each `shippedThemes` entry assert
   `theme.dimensions.fieldAdornmentSize >= theme.typography.caption.lineHeight`
   (identity 16 ≥ 16; every variant inherits both).
2. **A shorter adornment is reported.** `extendTheme(getTheme("light"), {
   typography: { caption: { lineHeight: 20 } }, dimensions: { keycapSize: 22 }
   })` yields exactly
   `{ group: "dimensions", member: "fieldAdornmentSize", rule: "at-least",
   actual: 16, bound: 20 }`.
3. **The coherent theme passes.** The same theme plus
   `fieldAdornmentSize: 20` returns `themeMetricFailures === []` (the fixture
   must not trip the keycap, inline-icon, control-fit or ladder rules).
4. **The bound reads the theme's own leading.** A theme with
   `caption.lineHeight: 18` and `fieldAdornmentSize: 17` reports
   `actual: 17, bound: 18` — not a shipped 16 — so the rule is not a literal.
5. **The total check carries it.** `themeFailures(clipped)` contains
   `{ kind: "metric", group: "dimensions", member: "fieldAdornmentSize",
   rule: "at-least", actual: 16, bound: 20 }`.
6. **A non-finite line keeps one diagnostic.** A theme with
   `caption.lineHeight: Number.NaN` produces no `fieldAdornmentSize` entry
   (the dependent bound stays silent) and the typography `finite` failure is the
   only report for that line.

### Proving both directions

1. On the pre-fix tree (`git stash push -- packages/tokens/src/metrics.ts`), run
   `cd packages/tokens && nub x vitest run src/field-adornment-fit.test.ts`:
   cases 2, 4 and 5 fail (they receive `[]`), case 1, 3 and 6 pass.
2. With the rule: all six cases pass.
3. `nub run --filter @gpuixui/tokens test` → all suites green.

The keycap's existing 22px-caption probe raises `fieldAdornmentSize: 22` in both
places (`keycap-fit.test.ts` and `metrics.example.ts`), because it grows the same
caption role; without the coherent value the keycap case would report two
defects instead of the keycap's one.

## 6. Documentation

### `docs/tokens.md`

- The `dimensions.fieldAdornmentSize` row (line ~1066) becomes:

  `| \`dimensions.fieldAdornmentSize\` | 16 | trailing clear control (or other adornment) inside a field; holds one \`caption\` line, the glyph its clear control paints; the leading query icon is \`iconSize.md\` |`

- The keycap paragraph (line ~1163) gains the sibling sentence after “the
  metric contract reports a theme whose caption leading outgrows it.”:

  > A field's adornment is a fixed surface of the same kind: the clear and remove
  > controls in SearchInput, TimePicker, HotkeyRecorder and the TagInput chip
  > paint the `caption` role, so the square holds one `caption` line — a theme
  > that grows that leading without growing the adornment clips the glyph
  > (plan `638`).

No quoted ratio changes, so `figures.ts`/`figures.test.ts` are untouched.

### `docs/design-system.md`

The guarded sentence in the component-dimensions paragraph currently reads:

> A keycap is 20px and holds one `caption` line plus its two borders; the metric
> contract reports a theme whose caption leading outgrows it.

Extend it to:

> A keycap is 20px and holds one `caption` line plus its two borders; a field's
> adornment holds one `caption` line, the glyph its clear control paints; the
> metric contract reports a theme whose caption leading outgrows either.

### `packages/tokens/src/docs.test.ts`

In “states the fixed component dimensions”, extend the derived `sentence` so it
ends with the same words built from `dimensions.fieldAdornmentSize` and
`typography.caption.lineHeight`:

```ts
… A keycap is ${dimensions.keycapSize}px and holds one \`caption\` line plus its two borders ; a field's adornment is ${dimensions.fieldAdornmentSize}px and holds one \`caption\` line, the glyph its clear control paints ; …
```

Build the exact sentence as one template literal (the test normalises
whitespace), so a metric edit moves the document with it. Do not weaken the
`includes` check to a substring.

### `COMPONENTS.md`

In the **Design tokens** row, extend the dimensions enumeration with:

> and a field's adornment holds one `caption` line, the glyph its clear control
> paints (plan 638)

Keep the row's existing role/type counts and pair counts unchanged.

### `TODO.md`

Add under “Design tokens and theming (`tokens-theme`)” and tick:

```
`[x]` Hold a field's adornment to the caption glyph it paints — `fieldAdornmentSize` was held only to a positive size and to fitting the smallest control, while the four shipped clear/remove controls inside a field (SearchInput, TimePicker, HotkeyRecorder and the TagInput chip) paint the `caption` role's `✕` in that square; a copied theme with a 20px caption leading and the 16px adornment returned `[]` from every check while the glyph overflowed its box. The `dimensions` rule now reads the theme's own `caption.lineHeight`, every shipped set passes at equality (16) and no shipped value moves (plan 638)
```

Bump `275/349` → `276/350`, keeping the ten-cell bar at `[████████░░]`.

### `.agents/slop/plans/README.md`

Add the table row after `637`:

```
| [638](./638-field-adornment-glyph-fit.md) | The field's adornment holds the glyph it paints | F | 353, 358, 386, 517, 620, 624, 634 | done |
```

and a summary paragraph beside the other `tokens-theme` summaries.

## 7. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/field-adornment-fit.test.ts src/docs.test.ts`
   → every case passes.
3. `nub run --filter @gpuixui/tokens test` → all suites green.
4. `nub run check` → exit 0 (test checks, lint, format, types).
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 8. STOP conditions

Stop and report, do not improvise, if:

- a shipped theme fails the rule — an identity or platform
  `fieldAdornmentSize`, `caption.lineHeight` or a style that overrides either
  disagrees with the arithmetic; that is a design decision;
- a shipped control no longer paints `caption` inside the adornment (a
  different role, an `<Icon>` tier, or no glyph) — re-read the evidence from the
  components worktree before changing the bound;
- the fixture trips another rule (the keycap, the inline-icon fit, the control
  fit or a ladder) — keep it coherent (`keycapSize: 22` for a 20px caption
  line) so each case isolates the adornment;
- `docs.test.ts` fails on an unrelated guarded sentence — that is a baseline
  problem, not this unit;
- the dimension table guard rejects the row's new trailing note — fix the row,
  not the guard.

## 9. Acceptance

- `themeMetricFailures` reports `fieldAdornmentSize` when it cannot hold one
  `caption` line at the theme's own leading, with the derived bound.
- Every shipped identity theme, platform variant and recipe passes; no colour,
  pair, floor, metric or shipped theme value moves.
- The suite fails on the pre-fix tree (cases 2, 4 and 5) and passes after it;
  cases 1 and 3 prove the shipped equality and the fixture's coherence.
- The catalogue, design system, README ledger and JSDoc name the rule; the
  plan, audit note and index are current.
- `nub run check`, `nub run lint` and `nub run test` pass.
