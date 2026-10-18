# 527 — The field's typed text and hint on the row washes

**Phase:** F (integration and polish) · **Workstream:** `tokens-theme` ·
**Depends on:** plans 071, 081, 087, 306, 315, 317, 319, 337, 392, 500, 506 ·
**Number block:** 500–599 (`tokens-theme` overflow).

## 1. The bug

Plan 317 measured the `placeholder` role on the `input` fill and on the four
`Surface` tones a transparent field can sit on (`background`, `card`, `popover`,
`muted`), and plan 319 did the same for `inputForeground`. Both documents say the
row washes are **deliberately out of scope**:

> a field on a row wash and a disabled field are deliberately out of scope — the
> latter reads `disabledForeground`, which plan `306` measures

The second half is still true. The first half is not: the library's own inventory
defines `InlineEdit` as a component that *“swaps `<text>` for `<input>` in
place”* (`COMPONENTS.md`, Tier 2), and a table cell or list row is the canonical
place that happens. A row paints `hover` under the pointer, `active` while
pressed, `accent` when a selectable row is hovered and `selected` once chosen
(`list.tsx`, `selectItemStyle`), so a field in a row paints its typed text and its
hint on those four fills — the same fields whose edge (`border`), boundary
(`borderStrong`), focus ring (`ring`), pressed edge and secondary chrome text
(`mutedForeground`) the contract already measures there.

The two roles that carry the content are unmeasured there, and the *shipped*
palettes fail the floor today:

| shipped set | `placeholder` | worst row wash | ratio | floor |
| --- | --- | --- | --- | --- |
| identity light | `#66707F` | `selected` | **3.963:1** | 4.5:1 |
| identity dark | `#858F9F` | `selected` | **3.132:1** | 4.5:1 |
| macOS light | `#6E6E73` | `active` | **3.714:1** | 4.5:1 |
| macOS dark | `#9A9AA0` | `selected` | **3.582:1** | 4.5:1 |
| Linux light | `#6A6865` | `active` | **4.092:1** | 4.5:1 |
| Linux dark | `#A8A7A3` | `active` | **3.920:1** | 4.5:1 |
| Windows light | `#6B6B6B` | `selected` | **3.963:1** | 4.5:1 |
| Windows dark | `#A6A6A6` | `active` | **3.939:1** | 4.5:1 |
| Windows XP light | `#6B6555` | `selected` | **3.877:1** | 4.5:1 |
| Windows XP dark | `#A6A6A6` | `active` | **3.939:1** | 4.5:1 |
| Windows 7 light | `#5B6B80` | `selected` | **4.157:1** | 4.5:1 |
| Windows 7 dark | `#A6A6A6` | `active` | **3.939:1** | 4.5:1 |
| high-contrast light | `#4A4F58` | `active` | **5.665:1** | 7:1 |
| high-contrast dark | `#B0B0B0` | `active` | **5.009:1** | 7:1 |

All twenty-four shipped sets miss their floor on at least one wash: twelve
default sets miss 4.5:1, and the two AAA palettes every high-contrast variant
reads miss 7:1. `inputForeground` passes on all four washes in every set (the
tightest is 9.03:1 against the 7:1 body floor), but it is not measured at all, so
a consumer theme can erase a query while `themeContrastFailures` returns `[]`.

The failure is the same class as plans 315, 317 and 319: a role the library
publishes, on a surface its own API invites, with no pair behind it.

## 2. Decisions

1. **The four row washes join the field's text and hint surfaces.** `hover`,
   `active`, `accent` and `selected` are the fills a row paints behind its own
   content, and an in-place field is row content. Both roles join the contract:
   `inputForeground` at the body floor (7:1 / 7:1) and `placeholder` at the
   secondary floor (4.5:1 / 7:1), through the existing `stateWashes` list so the
   two lists cannot diverge.
2. **A disabled field stays out of scope.** It paints `disabledForeground`, which
   plan 306 already holds on the `disabled` fill and the washes; a placeholder is
   not the role a disabled field's text uses. Record that half of the old
   sentence as still true.
3. **Fix the palette rather than the field.** The field is already transparent;
   a hint that matches a selected row is not a hint. Every shipped set moves
   `placeholder` along its own family toward `mutedForeground`, targeting at
   least 4.65:1 on the worst default wash and 7.1:1 at AAA so a future one-step
   wash change does not immediately break the gate.
4. **Keep the hint a step below secondary text.** `textTiers` holds
   `placeholder` one 1.05:1 step below `mutedForeground`; the tightest shipped
   tier after the move is 1.157:1 (both AAA sets, on every shared surface), so
   the tint stays a hint and not a caption.
5. **Do not re-open the native-field question.** GPUix 0.10.0's `<input>` paints
   its own fixed `#8F8F8F` hint and reads only `theme.caret` (plan 337). These
   pairs describe the role a consumer paints (or the `<text>` overlay plan 337
   recommends); the shipped-runtime limitation is unchanged and stays documented.

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

`stateWashes` already exists (it is the private list the secondary-text pairs
use). Add two derived lists beside `inputTextSurfacePairs` and
`placeholderSurfacePairs`:

```ts
/**
 * The row washes a transparent field can sit on. `InlineEdit` swaps a row's
 * text for a field in place, so typed text and the hint paint on the `hover`
 * and `active` pointer washes, the `accent` fill a selectable row hovers with
 * and the `selected` fill it keeps. The field's edge, boundary, ring and
 * secondary chrome text are already measured there; these are the two roles
 * that carry the content.
 */
const inputTextWashPairs: readonly ContrastPair[] = stateWashes.map(
  (background): ContrastPair => ["inputForeground", background, "body"],
);

/** The hint on the same four fills, at the secondary floor. */
const placeholderWashPairs: readonly ContrastPair[] = stateWashes.map(
  (background): ContrastPair => ["placeholder", background, "secondary"],
);
```

In `contrastPairs`, directly after `...inputTextSurfacePairs` add
`...inputTextWashPairs`, and directly after `...placeholderSurfacePairs` add
`...placeholderWashPairs`. The list grows by eight pairs (four roles × two
roles), from **396 to 404**.

Extend the huge JSDoc on `contrastPairs`: replace “typed text on the `input` fill
and on the `background`, `card`, `popover` and `muted` surfaces a transparent
field paints” with the same list plus “and the four row washes a field inside a
row paints (`hover`, `active`, `accent`, `selected`)”, and replace “the
placeholder on those same surfaces” with “the placeholder on those same
surfaces and on the four row washes”.

### 3.2 `packages/tokens/src/color.ts`

Move the two identity placeholders:

```ts
// lightColors
placeholder: "#5C6574",
// darkColors
placeholder: "#A8B0BD",
```

and the two AAA placeholders:

```ts
// highContrastLightColors
placeholder: "#3D4047",
// highContrastDarkColors
placeholder: "#D1D1D1",
```

Extend `ThemeColors.placeholder`'s JSDoc:

> Placeholder text inside an input, held to the secondary floor on the `input`
> fill, the four `Surface` tones a transparent field sits on and the four row
> washes an in-place field paints.

Extend the `lightColors` JSDoc's closing note (after the groove sentence) and the
`darkColors` JSDoc (after the groove sentence):

> The hint is a step darker/lighter than plan 317 left it so it clears the
> secondary floor on the row washes a field inside a row paints (plan 527).

### 3.3 Platform styles

Each file names its own `placeholder`; move only that value (and add a one-line
comment referencing plan 527):

| file | mode | old | new |
| --- | --- | --- | --- |
| `src/platform-styles/macos.ts` | light | `#6E6E73` | `#5F5F63` |
| `src/platform-styles/macos.ts` | dark | `#9A9AA0` | `#B1B1B6` |
| `src/platform-styles/linux.ts` | light | `#6A6865` | `#615F5C` |
| `src/platform-styles/linux.ts` | dark | `#A8A7A3` | `#B7B6B2` |
| `src/platform-styles/windows.ts` | light | `#6B6B6B` | `#606060` |
| `src/platform-styles/windows.ts` | dark | `#A6A6A6` | `#B5B5B5` |
| `src/platform-styles/recipes/xp.ts` | light | `#6B6555` | `#5F5949` |
| `src/platform-styles/recipes/aero.ts` | light | `#5B6B80` | `#546378` |

The XP and Aero dark halves are `windowsPlatformStyle.colors.dark`, so the one
Windows dark move covers all three. Add a sentence to each touched file header:
“The hint clears the secondary floor on the row washes a field inside a row
paints (plan 527).”

### 3.4 `packages/tokens/src/placeholder-wash.test.ts` (new)

Header comment states the bug being guarded (plan 317's deliberate exclusion; the
identity dark hint at 3.132:1 on `selected`; an in-place `InlineEdit` paints
there). Cases:

1. `keeps every shipped hint above the secondary floor on the row washes` —
   for `shippedThemes` × `["hover","active","accent","selected"]`, assert
   `contrastRatio(placeholder, surface) >= contrastFloors[theme.contrast].secondary`.
   Assert the tightest is Linux dark on `active` at 4.651:1 (derive, do not
   hard-code a different value).
2. `keeps typed text above the body floor on the row washes` — same loop with
   `inputForeground` and the body floor; assert the tightest figure the run
   prints.
3. `records the pre-527 hint regression` — `extendTheme(getTheme("dark"), {
   colors: { placeholder: "#858F9F" } })` and assert
   `themeContrastFailures()` reports `placeholder` on exactly the four washes
   (and not on `input`/the four surfaces), with `selected` at 3.1317:1 and
   `active` at 4.056:1 under 4.5.
4. `records the erased-text regression` — a theme whose `inputForeground` equals
   `selected` is reported by the body pairs on all four washes.
5. `keeps the hint a step below secondary text` — `themeTextTierFailures` is `[]`
   for every shipped set, and the tightest `placeholder`/`mutedForeground` tier
   on the washes is above 1.05:1 (derive it).

### 3.5 `packages/tokens/src/contrast.test.ts`

- `expect(contrastPairs.length).toBe(396)` → `404`.
- The unparseable-placeholder case expects five failures on
  `["input","background","card","popover","muted"]`; it now also reports the four
  washes, so it is nine failures and the set gains `hover`, `active`, `accent`,
  `selected`.

### 3.6 `packages/tokens/src/docs.test.ts`

- The exact prose case for the typed-text/placeholder paragraph (currently the
  string starting “Default body text is measured on …”) must carry the new
  wording: typed text is measured on the `input` fill, the four `Surface` tones
  **and the four row washes a field inside a row paints**; the placeholder is
  held on the same list; the exclusion sentence becomes “a disabled field is
  deliberately out of scope — it reads `disabledForeground`, which plan `306`
  measures — while a field inside a row is measured on the four row washes (plan
  `527`)”; and the identity dark history names `#858F9F` moving to `#A8B0BD`.
- The pair-history guard changes `taking it from 395 to **${contrastPairs.length}**`
  to `taking it from 396 to **${contrastPairs.length}**` and a new assertion
  checks the appended plan-527 sentence exists.
- The design-system secondary-row guard (currently an exact string built for
  `docs/design-system.md`) appends “and the four row washes a field inside a row
  paints” to the placeholder clause.

### 3.7 `docs/tokens.md`

- Role table: `placeholder` identity row becomes
  `| \`placeholder\` | \`#5C6574\` | \`#A8B0BD\` | a hint the consumer renders on the \`input\` fill, the \`background\`/\`card\`/\`popover\`/\`muted\` surfaces a transparent field paints and the \`hover\`/\`active\`/\`accent\`/\`selected\` washes a field inside a row paints (a native field paints its own grey; see [Native text fields](#native-text-fields)) |`
- The audit paragraph (around the current “The placeholder is held to the same
  secondary floor … a field on a row wash and a disabled field are deliberately
  out of scope”): replace the exclusion with the new rule and the evidence —
  twelve default sets under 4.5:1, worst identity dark 3.132:1 on `selected`,
  and both AAA palettes under 7:1; the four washes join both role lists; the
  fourteen values move to the new column (the two AAA palettes carry the twelve
  high-contrast variants); the tightest new pair is 4.651:1 (Linux dark on
  `active`); the hint stays 1.157:1 below `mutedForeground` at the tightest.
- Pair history: append a plan `527` paragraph — the field's text and hint on the
  four row washes, taking the contract from 396 to **404** — after the plan 525
  paragraph.
- The `themeContrastFailures` surface list (around the status-panel paragraph)
  gains the same clause.

### 3.8 `docs/design-system.md`

- §9 floor table, the “secondary text” row: append “, and on the four row washes
  a field inside a row paints” after the placeholder clause.
- §9/inactive paragraph and §10 are unchanged; §8's text-selection row does not
  mention placeholders.

### 3.9 `packages/tokens/README.md`

- Line ~435: the placeholder is checked on the `input` fill, the four `Surface`
  tones **and the four row washes a field inside a row paints**; name the
  identity dark move and the tightest new pair.
- The contract paragraph that lists the measured text surfaces gains the wash
  clause. Update the count if the README quotes `396` (it does not quote the
  number; the inventory row in `COMPONENTS.md` does).

### 3.10 `COMPONENTS.md`

- “Design tokens” row: replace “the placeholder is measured on the `input` fill
  and on the four `Surface` tones a transparent field sits on” with the same list
  plus the four row washes; append one sentence with the pre-527 evidence.
- “Theme contrast check” row: `396 contrast pairs` → `404 contrast pairs`, and
  append the plan-527 sentence.

### 3.11 `TODO.md`

Add a ticked row before the cross-team block:

```
`[x]` Hold a field's typed text and hint on the row washes an in-place editor
paints — plan 317 excluded “a field on a row wash”, but `InlineEdit` swaps a
row's text for a field in place and the shipped `placeholder` missed its floor on
at least one wash in all twenty-four sets (identity dark **3.132:1** on
`selected`, macOS light 3.714:1 on `active`, Windows dark 3.939:1, XP light
3.877:1, and both AAA palettes under 7:1 at 5.665:1 and 5.009:1) while
`themeContrastFailures` returned `[]`; `inputForeground` and `placeholder` join
the four washes (396 → 404 pairs), fourteen shipped hints move one designed step
(identity dark `#858F9F` → `#A8B0BD`, AAA light `#4A4F58` → `#3D4047`, AAA dark
`#B0B0B0` → `#D1D1D1`), every shipped set passes (4.651:1 at the tightest, Linux
dark on `active`; 7.113:1 at AAA) and the hint stays 1.157:1 below
`mutedForeground` at the tightest (plan 527)
```

Bump the section bar from `191/253` to `192/254`.

### 3.12 Plan index

Add to `.agents/slop/plans/README.md`:

```
| [527](./527-field-text-row-washes.md) | The field's typed text and hint on the row washes | F | 071, 081, 087, 306, 315, 317, 319, 392, 500, 506 | done |
```

and append a paragraph after the plan 526 description.

## 4. Commands and expected results

Run in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

1. Before the fix, `nub run --filter @gpuixui/tokens test -- placeholder-wash`
   fails its documentation case and its two regression cases (the pre-527 hint
   returns `[]`), and its shipped-hint case fails until the palette moves.
2. `nub run --filter @gpuixui/tokens test -- placeholder-wash` after the edits
   → the six cases pass.
3. `nub run --filter @gpuixui/tokens test -- contrast` → the count (404) and the
   nine-pair `NaN` case pass.
4. `nub run --filter @gpuixui/tokens test -- docs` → the updated quotes pass;
   before the document edits it fails on the old prose and the old hex values.
5. `nub run --filter @gpuixui/tokens test` → discover the file and test counts
   from the run; do not quote a number the run did not print.
6. `nub run check` → `check:tests`, lint, format and `check-types` pass.
7. `nub run test` and `nub run lint` → both pass.
8. `nub run --filter @gpuixui/tokens test -- platform-composition` → every base ×
   style composition still returns `[]` from `themeFailures`.

## 5. STOP conditions

Stop and report instead of improvising if:

- A shipped set fails a new **typed-text** body pair. Every set clears 9.03:1
  today; a failure means a different palette moved unexpectedly.
- A shipped set still fails a new hint pair after the table above. Report the
  theme, surface and ratio; a second palette move needs its own plan.
- `themeTextTierFailures` becomes non-empty for a shipped set, or the tightest
  placeholder tier falls below 1.05:1. Do not weaken the tier; report the set.
- A non-placeholder pair changes its ratio in `docs.test.ts`. Only
  `placeholder` and the pair count should move.
- `nub run check` fails on a documentation claim this plan did not edit. Find the
  drift; do not rewrite an unrelated claim to make it pass.
- The measured tightest new pair is not Linux dark on `active` (4.651:1). Paste
  the number the run produced, not the one in this plan.

## 6. Test plan

| What can break | The case that catches it |
| --- | --- |
| The hint disappears on a row wash | `placeholder-wash.test.ts` case 2 (24 sets × 4 washes) |
| Typed text disappears on a row wash | case 3 (24 sets × 4 washes) |
| The contract loses the pair | case 1; `contrast.test.ts` count 404; `inventory.test.ts` derives the lists |
| A copied theme collapses the hint on a selected row | case 4 (the pre-527 identity dark value reports exactly the four washes) |
| A copied theme collapses typed text | case 5 |
| The hint becomes a caption | case 6 (`themeTextTierFailures` empty; ≥1.05:1) |
| A platform style keeps the old value | the shipped-pair loop in case 2 |
| The documents re-state the exclusion | `docs.test.ts`'s exact prose case |
| A doc table keeps the old hex | `docs.test.ts`'s identity palette guard |

To prove the cases fail without the fix: revert the two new lists in
`contrast.ts` and run `nub run --filter @gpuixui/tokens test -- placeholder-wash`;
the documentation case fails on the missing pairs and both regression cases
return `[]`. Revert one platform value (`windows.ts` dark) and the shipped-hint
case fails on that set. Follow `scripts/verify-two-directions.sh` as the repo
convention does for plans 500–526.

## 7. Acceptance criteria

- [ ] `inputForeground` is measured on `hover`/`active`/`accent`/`selected` at
      the body floor; `placeholder` on the same four at the secondary floor.
- [ ] `contrastPairs` is 404; `themeFailures` is `[]` for every shipped set and
      every base × style composition.
- [ ] The fourteen shipped `placeholder` values are the new values (the twelve
      default sets and the two AAA palettes); `themeFailures` is `[]` for every
      shipped set, so every high-contrast variant reads a passing palette.
- [ ] Every shipped hint clears 4.65:1 on the worst row wash; the tightest tier
      below `mutedForeground` is above 1.05:1.
- [ ] `docs/tokens.md`, `docs/design-system.md`, the README, `COMPONENTS.md`,
      `TODO.md` and the plan index state the new rule, evidence and count.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.
