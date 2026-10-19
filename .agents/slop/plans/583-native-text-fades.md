# Plan 583 — The native document's fades and ink wash in the public contract

Status: ready · Phase F · Owner: `tokens-theme` · Paths: `packages/tokens`,
`docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`, `TODO.md`,
`.agents/slop/plans/README.md`

## 1. The defect

The pinned runtime paints `<code>`, `<diff>` and `<markdown>` with fixed
fractions a theme cannot change (`references/gpuix/packages/native/src`):

| Paint | Runtime | Source |
| --- | --- | --- |
| Diff line body | `text` at 92% | `custom_elements/diff.rs:792` |
| Diff gutter number | `text_faint` at 80% | `custom_elements/diff.rs:767` |
| Unchanged-line `·` marker | `text_faint` at 50% | `custom_elements/diff.rs:764` |
| Add/delete marker | `diff_add`/`diff_del` at 90% | `custom_elements/diff.rs:752` |
| Add/delete accent bar | `diff_add`/`diff_del` at 55% | `custom_elements/diff.rs:752` |
| Add/delete row tint | `diff_add`/`diff_del` at 5.5% | `custom_elements/diff.rs:743` |
| Ordered-list number / bullet | `accent` at 85% | `markdown/render.rs:284` |
| Blockquote rail | `accent` at 60% | `markdown/render.rs:252` |
| Blockquote wash | `accent` at 5% | `markdown/render.rs:253` |
| Code block surface | black/white ink at 3.5% over `bg` | `markdown/render.rs:478` |

`native-text.test.ts` holds them on the **shipped** themes only, and only on
`card`. Nothing holds a copied theme, and the public statement is false: the
`nativeTextTheme` JSDoc says "Those compositions are held by
`themeContrastFailures`", while `contrast.ts` and `docs/tokens.md` say the suite
holds them. A consumer who edits a platform style gets `[]` from all eight
checks and can ship a document whose fades disappear.

Measured on the shipped sets, two valid edits prove the gap. Both return `[]`
from `themeFailures` today:

1. `extendTheme(getTheme("dark"), { colors: { successText: "#bebebe" } })` — a
   string token (`successText`) through the 3.5% ink wash on the dark card,
   popover and quiet panel measures **6.405:1**, under the 7:1 body floor it
   clears opaque.
2. `extendTheme(getTheme("dark"), { colors: { mutedForeground: "#bebebe" } })` —
   a blockquote's body (`mutedForeground`) over the 5% accent wash measures
   **6.335:1** on the same three tones, under the 7:1 the suite states for it.

Both are ordinary edits: a role lifted until its opaque pair just passes is
still under the floor once the runtime fades or washes it.

## 2. Decision

Ship the fades as data beside the other contrast lists and as a ninth public
check, `themeNativeTextFailures`, composed into `themeFailures`. A separate check
(not more `themeContrastFailures` entries) because:

- the measured paints are not role-to-role pairs: each carries a fraction, a
  second wash, or the code-block ink, and a failure must name the text-theme
  field a consumer edits;
- `themeHighlightFailures` set the precedent: native-only composites get their
  own check and failure type so their inputs are named;
- `contrastPairs` stays 405 and `ContrastFailure` stays stable for existing
  consumer reports.

Floors:

| Composition | Class | Why |
| --- | --- | --- |
| Diff line at 92% | `body` | a diff line is body code text |
| Diff line at 92% over the add/del row tint | `body` | same line, on the tint the runtime paints |
| Add/delete marker at 90% | `secondary` | a gutter mark, not body |
| Blockquote body over its 5% wash | `body` | it is the quote's body copy; this is stricter than the role's own secondary class and is stated in the reference |
| Ordered-list number/bullet at 85% | `mark` | a glyph |
| Accent bar 55%, row tint 5.5%, quote rail 60%, quote wash 5% | `surface` | a shape, not text |
| Gutter number 80%, unchanged marker 50% | `surface` | the runtime dims chrome; both are below secondary in shipped sets (3.595:1 and 2.082:1), so a text floor would move shipped colours |
| Syntax role through the 3.5% ink wash | `body` | code is body copy; the suite already uses this floor |

Surfaces: every entry is measured on all four
`nativeTextSurfaces` (`background`, `card`, `popover`, `muted`), fixing the
suite's `card`-only hole one plan after plan 574 fixed it for the opaque palette.

Deliberate omission, documented with evidence: the runtime's **28% word-level
diff wash** (`diff.rs:803`) paints a changed token's own syntax colour over a
wash of the add/delete fill. A `successText` string therefore sits on a wash of
its own family and the weakest shipped composition measures **4.389:1**
(`Dark · Linux`, `destructiveText` on its own 28% wash), under the secondary
floor; no perceivable wash can keep a same-family token at text strength. It is
transient emphasis on a line that is itself measured at 92% over the 5.5% row
tint. State this in the reference, do not add a pair.

## 3. Files and exact changes

### 3.1 `packages/tokens/src/native-text-check.ts` (new)

Imports: `alpha`/`ThemeColors` from `./color.js`; `compositeOver`,
`contrastFloors`, `contrastRatio`, `ContrastPairClass` from `./contrast.js`;
`nativeInk`, `nativeInkOpacity` from `./native-ink.js`; `nativeSyntaxRoles`,
`nativeTextRoles`, `nativeTextSurfaces` from `./native-text.js`; `Theme`,
`ThemeContrast` from `./theme.js`.

Export, in this order:

1. `interface NativeTextFade` — `field: keyof typeof nativeTextRoles`,
   `opacity: number`, `pairClass: ContrastPairClass`.
2. `const nativeTextFades: readonly NativeTextFade[]` — the table in §1 (12
   entries; line numbers 0.8 and 0.5 are two entries).
3. `interface NativeTextOverFade` — `field`, `opacity`, `wash` (also
   `keyof typeof nativeTextRoles`), `washOpacity`, `pairClass`.
4. `const nativeTextOverFades: readonly NativeTextOverFade[]` — three entries:
   `{ text, 0.92, diffAdd, 0.055, body }`,
   `{ text, 0.92, diffDel, 0.055, body }`,
   `{ textMuted, 1, accent, 0.05, body }`.
5. `interface NativeTextFailure` — `field?:
   keyof typeof nativeTextRoles`; `role: keyof ThemeColors`; `surface: keyof
   ThemeColors`; `opacity: number`; `wash?: keyof ThemeColors`;
   `washOpacity?: number`; `ink?: number`; `pairClass: ContrastPairClass`;
   `floor: number`; `ratio: number`. JSDoc: one bullet per arm.
6. `function themeNativeTextFailures(theme, contrast = theme.contrast)` —
   compose three passes:
   - fades: for each entry × surface, composite
     `alpha(theme.colors[nativeTextRoles[field]], opacity)` over the surface and
     compare with the surface;
   - over-fades: composite the wash over the surface, then the text over that,
     and compare with the painted wash;
   - ink: `new Set(Object.values(nativeSyntaxRoles))` × surface, compare the
     role with `nativeInk(theme, surface)`, report `ink: nativeInkOpacity`,
     `opacity: 1`.
   Return `[...fadeFailures, ...overFadeFailures, ...inkFailures]`.

Every export gets JSDoc with an `@example` that compiles against the package
(the snippet guards read it).

### 3.2 `packages/tokens/src/theme-check.ts`

- Import `themeNativeTextFailures` and `NativeTextFailure`.
- `themeChecks`: insert `"nativeText"` between `"highlight"` and `"hierarchy"`.
- `FailurePayload`: `readonly nativeText: NativeTextFailure`.
- `ThemeFailure` JSDoc: add "`nativeText` is a native document fade, wash or ink
  composite below its floor".
- `themeFailures` JSDoc: add the check to the list, in the new order.
- `themeFailures`: compose it after the highlight entries.

### 3.3 `packages/tokens/src/native-text.ts`

- `nativeTextTheme` JSDoc: replace "Those compositions are held by
  `themeContrastFailures`; a role chosen for its opaque floor still has to clear
  the faded one." with a sentence naming `themeNativeTextFailures`, the four
  surfaces and the word-level omission.
- Add a `@see`-style sentence in `nativeTextSurfaces` JSDoc that the fades and
  the ink wash are measured on the same four tones.

No other source module changes. `index.ts` gets one line:
`export * from "./native-text-check.js";` (keep the list alphabetical).

### 3.4 `packages/tokens/src/native-text-check.test.ts` (new)

Header comment states the defect (the two measured edits above) and the plan
number. Cases:

1. **Shipped guarantee** — `shippedThemes.forEach` → `expect(themeNativeTextFailures(theme)).toEqual([])`.
   Label with `theme.name`.
2. **Ink regression** — the `successText: "#bebebe"` dark edit:
   `themeFailures(planted)` is `[]`; the new check reports a failure with
   `role: "successText"`, `ink: nativeInkOpacity`, `pairClass: "body"`, on
   `card`, `popover` and `muted`, ratio ≈ 6.405 (toBeCloseTo 3).
3. **Over-fade regression** — the `mutedForeground: "#bebebe"` dark edit:
   `themeFailures(planted)` is `[]`; the new check reports
   `field: "textMuted"`, `wash: "accent"`, `washOpacity: 0.05`, `opacity: 1`,
   ratio ≈ 6.335.
4. **Every fade entry can fail** — for each `nativeTextFades` entry, set its
   role to the light `card` colour on the light theme and assert a failure with
   the entry's `field`, `opacity` and `pairClass` appears for `card`. This is the
   completeness guard: a new entry that the function forgets fails here.
5. **Every over-fade entry can fail** — same construction for the three entries
   (set text and wash roles to the card colour).
6. **Every syntax role is held through the ink** — set every unique
   `nativeSyntaxRoles` value to the card colour and assert the failure set names
   each role on all four `nativeTextSurfaces`.
7. **The kind and the order** — `themeFailures` tags an ink failure
   `kind: "nativeText"` and `themeChecks.indexOf("nativeText")` is
   `themeChecks.indexOf("highlight") + 1` and before `"hierarchy"`.
8. **The reference names every composition** — `docs.test.ts` owns the page
   guard; here assert `docs/tokens.md` contains `themeNativeTextFailures`,
   `nativeTextFades`, `nativeTextOverFades` and `NativeTextFailure` (mirrors the
   existing native-field docs case).

### 3.5 `packages/tokens/src/native-text.test.ts`

Delete the local `runtimeFades`, `faded`, `fadedOverWash`, `inkFailures` helpers
and the two cases they feed (`can fail the painted-composite guard…`, `holds the
runtime's fixed fades…`), whose content moves to 3.4. Update the module header:
the fades are now public. Keep every other case unchanged. This is a net LOC
reduction; the runtime fractions get one owner.

### 3.6 `docs/tokens.md`

- Type index: add `NativeTextFade`, `NativeTextFailure`, `NativeTextOverFade`
  in alphabetical order; extend the `ThemeFailure` row with `nativeText`.
- Guarantee sentence: "The guarantee is nine checks — colour format, role
  opacity, typeface form, contrast, find highlight, native text fades, text
  hierarchy, interaction direction and numeric metrics".
- Order paragraph: insert `nativeText` after `highlight`; add
  `NativeTextFailure` to the payload list.
- *Native text* section: replace the paragraph that begins "Those are not
  tokens, so `native-text.test.ts` holds…" with:
  - the public owner `themeNativeTextFailures` and the two lists;
  - the four surfaces and the table of floors (body / secondary / mark /
    surface);
  - the ink wash on the same four tones, tightest **7.008:1** (keep the existing
    figure);
  - the word-level 28% omission with the **4.389:1** figure and why;
  - the gutter dim (3.595:1 / 2.082:1) and why it is held at perceivability.
- Keep the existing 7.562:1 opaque figure.

### 3.7 `docs/design-system.md`

In the native text paragraph (§10), replace "so the suite holds the chosen roles
through every composite on every shipped set" with a sentence naming
`themeNativeTextFailures` and the four `nativeTextSurfaces`, and state the
word-level omission once.

### 3.8 `COMPONENTS.md`

- *Total theme check* row: it currently lists seven payload helpers and seven
  kinds; it omits the shipped `themeHighlightFailures`/`highlight`. Correct it
  to name all nine helpers and kinds, including `themeNativeTextFailures` and
  `nativeText`.
- *Theme contrast check* row: add `themeNativeTextFailures` beside the other
  composite checks, or leave the contrast row alone if the ledger's total row is
  the right home — pick the total row only, to avoid duplicating the count.

### 3.9 `.agents/slop/plans/README.md`

Add to the `tokens-theme` table:

`| [583](./583-native-text-fades.md) | The native document's fades and ink wash in the public contract | F | 071, 399, 569, 572–574, 581–582 | done |`

and one summary paragraph in the running prose after 582.

### 3.10 `TODO.md`

Add under *Design tokens and theming*:

`[x]` Publish the native document's fades and ink wash — the runtime paints a
diff line at 92%, its markers at 90%, the row tint at 5.5%, the quote wash at
5%, the list marker at 85%, the gutter at 80%/50% and code on a 3.5% ink wash,
but only `card` and only shipped themes were guarded; a valid edit
(`successText: "#bebebe"` on dark) measured **6.405:1** through the ink and a
valid `mutedForeground` **6.335:1** in a quote while `themeFailures` returned
`[]`; `themeNativeTextFailures` is the ninth check and the lists own the
fractions (plan 583)

Update the section's bar by one completed task and one total.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # all files green, 20s budget
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run test                                   # exit 0 (all workspaces)
```

Focused runs while iterating:

```sh
nub run --filter @gpuixui/tokens test src/native-text-check.test.ts
nub run --filter @gpuixui/tokens test src/native-text.test.ts
nub run --filter @gpuixui/tokens test src/theme-check.test.ts
nub run --filter @gpuixui/tokens test src/docs.test.ts
```

## 5. STOP conditions

Stop and report instead of improvising if:

- a shipped theme fails a new fade/ink pair. Do **not** move a colour and do not
  lower a floor silently: record the failing set, surface, role and ratio, and
  return with the measured list. (The probe says none fail; a failure means the
  measured design or the floor is wrong.)
- the over-fade quote floor (`body`) makes a shipped set fail; the tightest is
  7.203:1, so this should not happen.
- a docs guard derives a sentence you cannot satisfy without retyping a count;
  fix the index, never the sentence by hand.
- `themeFailures` ordering breaks a composition suite — update the suite to read
  `themeChecks`, never a hand-typed list.

## 6. Test plan — proving it can fail

Reverse verification (before implementing, or by reverting the check):

1. Remove the `themeNativeTextFailures` composition from `themeFailures`; cases
   2 and 3 must fail with "expected a nativeText failure, got []".
2. Remove the `ink` pass; case 2 and case 6 fail.
3. Remove one entry from `nativeTextFades`; case 4 fails naming the missing
   entry.
4. Change `"nativeText"` to the wrong side of `"highlight"`; case 7 fails.
5. Revert a docs paragraph; case 8 or the `docs.test.ts` guarantee case fails.

Acceptance: all commands in §4 exit 0; the two planted edits report a
`nativeText` failure while every shipped set returns `[]`; no colour, pair,
floor, metric or existing check changes; `contrastPairs` stays 405.
