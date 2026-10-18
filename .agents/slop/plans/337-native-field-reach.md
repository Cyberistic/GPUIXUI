# 337 — The native field's own hint and selection

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth) |
| Owner | `tokens-theme` — `packages/tokens`, `docs/tokens.md`, `docs/design-system.md` |
| Depends on | 069 (selection and scrollbar reach), 317/319 (the placeholder and typed text on every surface), 331 (the authored selection wash), 335 |
| Status | done |

The reference page currently says native text selection is themeable and lists
`placeholder` as text painted on the `input` fill. Both statements are true for
text the library paints (`<text>`, `<div>`, a consumer-rendered hint) and false
for a GPUix `<input>`/`<textarea>`: the pinned runtime paints that content
itself. This plan corrects the two claims and records the consumer task; it
changes no colour, pair or floor.

## 1. Evidence — pinned `@gpuix/native@0.10.0`

The npm tag `@gpuix/native@0.10.0` points at commit
`9fcd628863e354e9c58019fc3bf38981a1e64158`. In
`packages/native/src/custom_elements/input.rs` at that commit:

- the placeholder run is painted with a fixed colour:
  `if is_placeholder { gpui::rgba(0x8f8f8fff).into() }` (file line ~1394);
- the selection quads are painted with a fixed wash:
  `let color = gpui::rgba(0x7c86ff59);` (file line ~1814);
- the `theme` prop is read for **one** field only:
  `let caret_color = self.theme.caret;` (line ~364), the same comparison in
  `render` (line ~426), and `"theme" => self.theme = Theme::from_prop(...)`
  (line ~524);
- typed text takes the element's `style.color`, which `primitives` sets to
  `inputForeground` through `fieldTextStyle`;
- the editor's own selection/placeholder paths never read `text_faint`,
  `text_muted`, `accent` or the inherited `selectionColor`.

Measured with the shipped roles, the fixed placeholder is below the library's
own secondary floor (4.5:1) in six sets:

| Theme | `#8F8F8F` on `input` |
| ----- | --------------------- |
| identity light / every light platform | 3.23:1 |
| Linux dark | 4.08:1 |
| Windows dark, XP dark, Aero dark | 4.38:1 |

The designed `placeholder` role is 5.01:1 or better on the same fills, which is
why the contract stays green while a real field shows the runtime's grey. No
palette edit can change a constant compiled into the renderer.

## 2. What changes

### 2.1 `docs/tokens.md`

1. Rewrite the opening paragraph of `## Text selection` so it names the path it
   describes: `selectionColor` is the inherited **app text** wash. Add a
   `### Native text fields` subsection before `### Scrollbars` stating, with the
   pinned tag and symbols above:
   - the editor paints its own selection (`rgba(0x7c86ff59)`) and its own
     placeholder (`rgba(0x8f8f8fff)`);
   - typed text is the element's `style.color` (`inputForeground`) and the caret
     is the only `theme` field the editor reads (`theme.caret`);
   - therefore `placeholder` describes a hint the consumer renders — the
     transparent fields do — and the `selection` pairs describe app text, not
     selected text inside a native field;
   - the honest alternative for a themed hint is a `<text>` hint drawn over the
     input with the native placeholder hidden; until a consumer does that, a
     native field keeps the runtime grey.
2. Change the `placeholder` row description to say "a hint the consumer renders
   on …" rather than implying the native field paints it.
3. Add a bullet to `## Limitations and future work` pointing at the subsection.

### 2.2 `packages/tokens/src/styles.ts`

Extend the `selectionStyle` JSDoc: the wash applies to GPUix text/div subtrees;
a native `<input>`/`<textarea>` paints its own fixed wash in 0.10.0, so a field
does not inherit this style. This is a public-API documentation correction, not
a behaviour change.

### 2.3 `packages/tokens/README.md`

- Add the native-field limit to `## Selection and scrollbars`.
- Add a `## Limitations` bullet for the fixed placeholder.
- Leave the placeholder contract paragraph alone: it describes the role and the
  pair list, both still true.

### 2.4 `packages/tokens/src/docs.test.ts`

Extend `describe("docs/tokens.md runtime reach")` with:

- `records the native placeholder and selection the editor paints itself`:
  the collapsed prose must contain `#8F8F8F`, `#7C86FF59`, `textFaint`,
  `selectionColor` and `@gpuix/native@0.10.0`;
- `keeps the native-field limitation in the selectionStyle JSDoc`: read
  `./styles.ts` (same `node:fs` convention as this file) and require the JSDoc
  to name `input` and the fixed wash.

The header comment of `docs.test.ts` gains one sentence naming plan 337, so the
bug being guarded is stated in the test file.

### 2.5 `COMPONENTS.md`

Append one sentence to the `Design tokens` row: the `placeholder` role is a
consumer-rendered hint, because 0.10.0's `<input>` paints its placeholder in a
fixed `#8F8F8F` and reads only `theme.caret` (plan 337).

### 2.6 `TODO.md`

Add a cross-team row (owner `primitives`, plan 337):

> `primitives` stops relying on `nativeTextTheme` for a native field's hint and
> selection — the pinned editor reads only `theme.caret`, hardcodes the
> placeholder (`#8F8F8F`, 3.23:1 on the light `input`) and the selection wash
> (`#7C86FF59`), and takes typed text from `style.color`; pass
> `selectionStyle(theme)` on the field and either draw the hint as a `<text>`
> overlay with the `placeholder` role or document the runtime grey.

Add and tick the workstream row for this plan; update the section progress bar
from `104/137` to `105/138`.

## 3. Exact commands

```sh
nub run --filter @gpuixui/tokens test          # expected: exit 0, all files green
nub run --filter @gpuixui/tokens check-types   # expected: exit 0
nub run check:tests                            # expected: exit 0
nub run lint                                   # expected: exit 0
nub run fmt                                    # expected: exit 0
nub run check                                  # expected: exit 0
```

## 4. Test plan — prove both directions

1. Add the two cases to `docs.test.ts`; run the tokens suite (green).
2. Temporarily delete the `### Native text fields` subsection **and** the
   `selectionStyle` JSDoc sentence, run:
   `nub run --filter @gpuixui/tokens test`
   expected: the two new cases fail with the missing strings.
3. Restore both with `git checkout -- docs/tokens.md packages/tokens/src/styles.ts`
   (only if no other edit is pending in those files) and re-run: green.
4. The test can fail because it asserts exact documentation strings that do not
   exist until this plan lands; it is not a tautology.

## 5. STOP conditions

Stop and report if:

- the pinned tag no longer resolves to `9fcd628…`, or the fetched `input.rs` no
  longer hardcodes `0x8f8f8fff` / `0x7c86ff59` — then the limitation may have
  been fixed upstream and the plan must be re-scoped;
- a change would require editing `packages/primitives`, `packages/components`
  or the playground — those are other workstreams; record them in `TODO.md`;
- any shipped pairing changes; this plan must move **zero** colour values, pairs
  or floors;
- a test fails for a reason other than the two new assertions.

## 6. Acceptance criteria

- `docs/tokens.md` and `packages/tokens/README.md` state what a native field
  paints itself, with the pinned tag and the measured 3.23:1 figure.
- `selectionStyle`'s public JSDoc carries the field limitation.
- The two new `docs.test.ts` cases fail without the documentation and pass with
  it.
- `COMPONENTS.md` and `TODO.md` carry the limitation and the cross-team task.
- Every command in §3 passes.
