# 585 — The two native-text metrics a brand is told it can set

**Workstream:** `tokens-theme`
**Phase:** F (the native-document half of the total theme contract)
**Depends on:** plan 569 (`nativeTextTheme`), plan 572 (the metrics that hold
type), plan 583 (the fades the same bridge feeds)
**Files owned:** `packages/tokens/src/native-text.ts`,
`packages/tokens/src/native-text.example.ts`,
`packages/tokens/src/native-text.test.ts`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`,
`TODO.md`, this plan, `.agents/slop/plans/README.md` (index row only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

`nativeTextTheme(theme)` returns the `theme` prop a native `<code>`, `<diff>`
and `<markdown>` read. GPUix 0.10.0's `GpuixTheme.metrics` is **every optional
field** of `GpuixMetrics`; the package's `NativeTextMetrics` is a narrower
required shape. Two runtime metrics have no token source and are deliberately
left out, so the runtime's own values apply:

- `codeGutterMinWidth` — the 28px floor under a computed code gutter
  (`references/gpuix/packages/native/src/theme.rs:400`; `code.rs:273` takes the
  max of the computed width and this floor);
- `diffAccentBarWidth` — the 3px diff accent bar (`theme.rs:410`; painted at
  `diff.rs:727,855`).

The documents state the intended escape hatch: "A brand that needs them sets
them on the returned object." That sentence **does not type-check**. The
documented call

```ts
const custom: NativeTextTheme = {
  ...nativeTextTheme(theme),
  metrics: {
    ...nativeTextTheme(theme).metrics,
    codeGutterMinWidth: 36,
    diffAccentBarWidth: 2,
  },
};
```

fails with `TS2561: Object literal may only specify known properties, but
'codeGutterMinWidth' does not exist in type 'NativeTextMetrics'`. A consumer
must cast — exactly the escape the package does not ship. So the docs promise a
capability the public type forbids, and the two runtime-only members are absent
from the type that names the bridge's output.

The same paragraphs are also stale in the other direction. `NativeTextMetrics`'s
JSDoc and both documents list "the table's max-content share" and "the
runtime's per-digit estimate" among the fields with **no token source**, but
plan 572 derives `mdTableMinColumnContent`, `mdTableMinColumnWidth`,
`codeGutterDigitWidth` and `diffGutterWidth` from `body`/`codeBlock`. The design
system even contradicts itself in adjacent sentences: "the gutters and table
floors are the runtime's shipped proportions resolved against those roles"
followed by "the runtime's own per-digit and max-content estimates … remain at
its defaults".

Measured on the shipped tree: `nativeTextTheme(theme).metrics` has neither
runtime-only key (they are `undefined`), and a type probe over the public entry
reports the error above. The defect is in the public shape and three prose
surfaces, not in a palette value.

## 2. Current state

- `packages/tokens/src/native-text.ts`
  - `NativeTextMetrics` (lines 68–137) lists every field the bridge resolves,
    all required; it ends at `mdCodeHeaderTextSize`.
  - The interface JSDoc (lines 61–67) says "The runtime's remaining fields — the
    code gutter's floor, the diff accent bar and its hardcoded per-digit estimate,
    and the table's max-content share — have no token source and keep the
    runtime's defaults".
  - `metricsOf` (lines 303–334) resolves the four scaled floors and every layout
    number; it returns no runtime-only key.
- `packages/tokens/src/native-text.example.ts` — five exported documents
  (`markdownDocument`, `canvasDocument`, `diffViewer`, `largeCodeTheme`); no
  brand that sets a runtime-only metric.
- `packages/tokens/src/native-text.test.ts` — imports the four example values
  (lines 51–56); its cases hold the mapping, the scaled metrics, the syntax
  palette and the reference names. Nothing reads the "remaining fields"
  sentence, and no case proves a brand can set them.
- `docs/tokens.md` — the Types row for `NativeTextMetrics` (line 117) calls it
  "the native text layout numbers derived from the theme's type, spacing and
  radius scales"; the metrics paragraph (lines 1642–1658) says the runtime's
  remaining fields "have no token source and stay at its defaults: … and the
  table's max-content share".
- `docs/design-system.md` — §10 (lines 836–839) says "the runtime's chrome
  metrics without a token — the code gutter's floor, the diff accent bar and the
  runtime's own per-digit and max-content estimates — remain at its defaults".
- `packages/tokens/README.md` — no claim about the two members (checked; do not
  add one beyond the sentence in §3.6).

## 3. Exact changes

### 3.1 `packages/tokens/src/native-text.ts`

1. Replace the `NativeTextMetrics` JSDoc with:

```ts
/**
 * The native text layout metrics this package derives from the theme's type,
 * spacing and radius scales. The runtime has two chrome metrics with no token
 * source — the code gutter's floor and the diff accent bar — so they are
 * optional members here: the bridge leaves both unset, the runtime's own 28px
 * and 3px values apply, and a brand that wants a different floor or bar sets it
 * on the returned object.
 */
```

2. Add the two optional members in the runtime's own order:
   - after `codeGutterPaddingRight` (line 80):

```ts
  /**
   * Floor under the computed code-gutter width. GPUix 0.10.0 defaults to 28px
   * and takes the larger of the computed width and this floor. The bridge leaves
   * it unset; a brand with a wider gutter sets it on the returned metrics.
   */
  readonly codeGutterMinWidth?: number;
```

   - after `diffMarkerWidth` (line 100):

```ts
  /**
   * Width of the diff's add/delete accent bar. GPUix 0.10.0 defaults to 3px. The
   * bridge leaves it unset; a brand that wants a thicker or thinner bar sets it
   * on the returned metrics.
   */
  readonly diffAccentBarWidth?: number;
```

3. Do **not** set either in `metricsOf`. The runtime default is the documented
   value; adding a constant here would duplicate it and make the "no token
   source" sentence false in a second way.

### 3.2 `packages/tokens/src/native-text.example.ts`

Add a fifth copyable document that proves the documented override compiles:

```ts
import {
  extendTheme,
  getTheme,
  nativeTextTheme,
  type NativeTextTheme,
} from "./index.js";

/**
 * A brand that owns the runtime's two token-less chrome metrics. Both are
 * optional members of `NativeTextMetrics`; the bridge leaves them unset so the
 * runtime's defaults apply, and a brand sets the ones it needs on the returned
 * object without a cast.
 */
export const customChromeTheme: { readonly theme: NativeTextTheme } = {
  theme: {
    ...nativeTextTheme(theme),
    metrics: {
      ...nativeTextTheme(theme).metrics,
      codeGutterMinWidth: 36,
      diffAccentBarWidth: 2,
    },
  },
};
```

Keep the existing imports and exports. `markdownDocument` is the natural base,
but do not spread `markdownDocument.theme` (it is typed as the literal's shape);
call `nativeTextTheme(theme)` twice or bind it once at the top. Prefer binding:

```ts
const shippedDocument = nativeTextTheme(theme);
```

and use it in both the new export and the existing ones only if it keeps the
file readable; the existing exports can stay as they are.

### 3.3 `packages/tokens/src/native-text.test.ts`

1. Import `customChromeTheme` beside the other example values.
2. Add one case:

```ts
it("leaves the two runtime-only metrics unset and lets a brand own them", () => {
  const shipped = nativeTextTheme(getTheme("dark")).metrics;
  expect(Object.hasOwn(shipped, "codeGutterMinWidth")).toBe(false);
  expect(Object.hasOwn(shipped, "diffAccentBarWidth")).toBe(false);

  const custom = customChromeTheme.theme.metrics;
  expect(custom.codeGutterMinWidth).toBe(36);
  expect(custom.diffAccentBarWidth).toBe(2);
  // The derived metrics still come from the theme.
  expect(custom.codeGutterDigitWidth).toBe(shipped.codeGutterDigitWidth);
  expect(custom.diffGutterWidth).toBe(shipped.diffGutterWidth);
});
```

3. Add a documentation case that reads both pages and holds the corrected
   sentence:

```ts
it("names the two metrics the runtime owns and not the ones the bridge derives", () => {
  const reference = readFileSync(
    new URL("../../../docs/tokens.md", import.meta.url),
    "utf8",
  );
  const design = readFileSync(
    new URL("../../../docs/design-system.md", import.meta.url),
    "utf8",
  );
  for (const [name, doc] of [
    ["docs/tokens.md", reference],
    ["docs/design-system.md", design],
  ] as const) {
    expect(doc, name).toContain("`codeGutterMinWidth`");
    expect(doc, name).toContain("`diffAccentBarWidth`");
    expect(doc, name).toContain("optional members of `NativeTextMetrics`");
    // The per-digit width and the table floors are derived since plan 572.
    expect(doc, name).not.toContain("the table's max-content share");
    expect(doc, name).not.toContain("max-content estimates");
  }
});
```

Update the header comment with plan 585's bug statement: the docs promised an
override the type rejected, and they called two derived metrics runtime
defaults.

### 3.4 `docs/tokens.md`

1. Types row for `NativeTextMetrics` (line 117) becomes:

```
| `NativeTextMetrics` | The native text layout numbers derived from the theme's type, spacing and radius scales, plus the two runtime-only members a brand may set: the gutter floor and the diff accent bar. |
```

2. Replace the paragraph at lines 1654–1658 with:

```
The two runtime metrics with no token source are optional members of
`NativeTextMetrics`: `codeGutterMinWidth` (the 28px floor under the computed
code gutter, which already exceeds it as the type grows) and
`diffAccentBarWidth` (the 3px diff bar). `nativeTextTheme` leaves both unset, so
the runtime's own value applies; a brand that wants a different floor or bar
sets it on the returned object, and the type accepts it without a cast. The
per-digit advance and the table's max-content share are **not** runtime defaults
any more: `codeGutterDigitWidth`, `diffGutterWidth`, `mdTableMinColumnWidth`
and `mdTableMinColumnContent` are the floors above, resolved from the roles.
```

3. Keep the preceding metrics paragraph (lines 1642–1652) as it is; it is the
   derivation the new paragraph refers to.

### 3.5 `docs/design-system.md`

Replace the §10 sentences (lines 836–839) so the two statements no longer
contradict:

```
and the code/diff gutters and table floors are the runtime's shipped proportions
resolved against those roles. The runtime's two chrome metrics without a token —
the code gutter's 28px floor and the 3px diff accent bar — stay at their defaults
and are optional members of `NativeTextMetrics`, so a brand can set either on
the returned object. The runtime fades
```

Leave the rest of the paragraph (the fade and ink-wash sentence) intact.

### 3.6 `packages/tokens/README.md`

The README does not make the claim; add one clause to the native-text paragraph
so the front door matches the reference: "`NativeTextMetrics` carries the
runtime's two token-less chrome metrics (`codeGutterMinWidth`,
`diffAccentBarWidth`) as optional members, unset by the bridge." Locate the
sentence that names the four scaled metrics and append the clause there.

### 3.7 `COMPONENTS.md`

In the **Design tokens** row, after the native-text clause that ends "(plan 572;
plan 569)", append: "the runtime's two token-less chrome metrics
(`codeGutterMinWidth`, `diffAccentBarWidth`) are optional members of
`NativeTextMetrics` that a brand sets on the returned object (plan 585)". Do not
change any count.

### 3.8 `TODO.md`

Add one ticked row after the plan-584 row in **Design tokens and theming**:

```
`[x]` Let a brand own the runtime's two token-less native-text metrics — the
docs said to "set them on the returned object", but `NativeTextMetrics` did not
declare `codeGutterMinWidth` or `diffAccentBarWidth`, so the documented override
failed `check-types` with TS2561; both are optional members now, the bridge
leaves them unset so the runtime's 28px/3px defaults apply, and the same
paragraphs no longer call the derived per-digit width and table floors runtime
defaults (plan 585)
```

Bump the progress line from `238/315` to `239/316` (the convention plan 584
follows: one ticked row and one denominator step).

### 3.9 `.agents/slop/plans/README.md`

Add the index row after 584:

```
| [585](./585-native-text-runtime-metrics.md) | The two native-text metrics a brand is told it can set | F | 569, 572, 583 | done |
```

Append a paragraph after the plan-584 summary:

```
Plan `585` closes the last promise the native-text bridge made without a type.
The documents tell a brand that needs the runtime's token-less chrome metrics to
"set them on the returned object", but `NativeTextMetrics` declared neither
`codeGutterMinWidth` (the 28px gutter floor) nor `diffAccentBarWidth` (the 3px
diff bar), so the documented override failed `check-types` with TS2561. Both are
optional members now, the bridge leaves them unset so the runtime's own values
apply, and a copyable example proves the override compiles. The same paragraphs
no longer list the per-digit width or the table's max-content floor among the
runtime defaults — plan `572` derives them from `codeBlock`/`body`. No colour,
pair, floor or metric value moves.
```

## 4. Commands

| Purpose | Command | Expected |
| ------- | ------- | -------- |
| Type probe (before the fix) | `nub x tsc --ignoreConfig --noEmit --strict --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck /tmp/probe-native-metrics.ts` in `packages/tokens` | TS2561 on `codeGutterMinWidth` (record it; the probe file is thrown away) |
| Format + lint + types | `nub run check` | exit 0 |
| Lint | `nub run lint` | exit 0 |
| Package tests | `nub run --filter @gpuixui/tokens test` | all files pass |

The probe from §1 is evidence, not a test. The suite case and
`check-types` are the guards.

## 5. Test plan

- The new metrics case fails before the fix only at `check-types`, because the
  example file does not compile. After the interface change it runs and proves
  the bridge omits both keys and the example carries them.
- The documentation case fails on the pre-fix tree: both pages still say
  "max-content share"/"max-content estimates" and neither names the two members.
  It passes after §3.4–3.5.
- The existing "keeps the runtime's shipped metrics at the shipped type sizes"
  case must keep passing: the two new members are optional and unset, so the
  four derived values do not move.
- `snippets.test.ts` must keep passing: no fenced snippet in the three documents
  changes except prose, and the new `@example` block (if any is added) imports
  every name it uses.
- `examples.test.ts` (the every-example-imported guard) must see the new export
  imported by `native-text.test.ts`.

## 6. Acceptance

- `NativeTextMetrics` declares `codeGutterMinWidth?` and `diffAccentBarWidth?`,
  and `nativeTextTheme` still omits both.
- A typed `NativeTextTheme` literal can set either without a cast; the example
  file proves it and runs in the suite.
- `docs/tokens.md`, `docs/design-system.md`, the interface JSDoc and the README
  name exactly the two runtime-only metrics and do not call the derived
  per-digit width or table floors runtime defaults.
- No colour, role, pair, floor, shipped metric, platform style or recipe value
  moves; `contrastPairs` stays 405.
- `nub run check`, `nub run lint` and
  `nub run --filter @gpuixui/tokens test` exit 0.
- TODO, COMPONENTS and the plan index state the change with plan number 585.

## 7. Outcome (executed 2026-10-19)

- `NativeTextMetrics` declares `codeGutterMinWidth?` and `diffAccentBarWidth?`
  in the runtime's own order, and `metricsOf` leaves both unset, so the
  runtime's 28px and 3px values apply. The interface JSDoc no longer lists the
  per-digit width or the table floors among the runtime defaults.
- `customChromeTheme` in `native-text.example.ts` is a typed `NativeTextTheme`
  that sets both members; the suite asserts the bridge omits them and the
  derived metrics do not move.
- Both directions were proven. The documented literal failed with TS2561 before
  the change; with the two fields temporarily removed from the interface,
  `check-types` failed on `native-text.example.ts(50,7)` and the new test
  (`codeGutterMinWidth` / `diffAccentBarWidth` do not exist on
  `NativeTextMetrics`), then passed after restoring the backup. The docs case
  failed on the pre-fix pages (both still said "max-content share" /
  "max-content estimates") and passes on the corrected ones.
- No colour, role, pair, floor, shipped metric, platform style or recipe moves;
  `contrastPairs` stays 405. The full suite is 149 files / 5,795 tests green and
  `nub run check`, `nub run lint` and `nub run test` pass.

## 8. STOP conditions

- The two runtime members would need a **derived** value (changing a shipped
  pixel) → stop and record the design decision; this plan only makes the
  documented override expressible.
- Any runtime field other than those two turns out to be unsupplied → stop and
  report its name; do not widen the type without its own measured reason.
- A documentation case cannot distinguish the corrected sentence from the old
  one without hardcoding a ratio → stop and report; do not leave the stale claims
  unguarded.
- The change would require editing a consumer package → record a cross-team
  `TODO.md` row; do not edit outside this workstream's paths.
