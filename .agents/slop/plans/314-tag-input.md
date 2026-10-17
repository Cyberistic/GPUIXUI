# 314 — Tag / token input

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §2 (A12), `110` |
| Status | planned |
| Source | `docs/component-api.md` §8 (planned parts: `TagInput`, `TagInputField`, `TagInputChip`); `COMPONENTS.md` → Tier 2 → Tag / token input; plan `205` A12 |

This plan is self-contained. It adds `TagInput` at the Tier 2 bar.

---

## 1. Why

Entering a set of free-form tokens (tags, labels, recipients) is not a text
input: tokens are discrete, removable and de-duplicated. The keyboard contract
(Enter/comma commit, Backspace on an empty draft removes the last token, a
removal control per chip) is ours and must be tested once.

`COMPONENTS.md` gives the row `<input>` + chip `div`s. No host element exists.

## 2. The target API

```tsx
const [tags, setTags] = useState(["design", "docs"]);

<TagInput label="Tags" value={tags} onValueChange={setTags} max={5}>
  {tags.map((tag) => (
    <TagInputChip key={tag} value={tag} />
  ))}
  <TagInputField placeholder="Add a tag…" />
</TagInput>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `TagInput` | the token value, the draft, add/remove rules, the group surface | `value?`, `defaultValue?`, `onValueChange?`, `label` (required), `max?`, `allowDuplicates?` (default `false`), `disabled?`, children |
| `TagInputField` | the `<input>`; it reads/writes the draft through context | input props minus `value`/`onChange`; `placeholder?` |
| `TagInputChip` | one chip with label and remove control | `value` (required), `style?: StateStyle<TagInputChipState>` |

`TagInputChipState` is `{ readonly disabled: boolean }`.

- **Chips are declared by the consumer** from its own value, so ordering,
  grouping and custom chips are the caller's. The root owns the rules, not the
  list rendering — the same split as Breadcrumb's items.
- **Add:** `Enter` or `,` on the field commits the trimmed draft. The draft is
  split on `,` too, so pasting `"a,b"` adds two tokens. Empty tokens are
  dropped. A duplicate is dropped unless `allowDuplicates`. `max` caps the
  total; at the cap the field stays editable but additions are refused (the
  component does not fake a disabled state).
- **Remove:** the chip's remove control, or `Backspace` in an empty field
  (removes the last token).
- **Value is controlled or uncontrolled** through `useControllableState`; the
  draft is always internal and cleared after every commit.
- **Disabled:** the input is `readOnly` (0.10.0 has no `aria-disabled`), chips
  lose their remove control and leave the tab order.

### Logic (`src/tag-input/logic.ts`)

- `splitDraft(draft)`: split on `,`, trim, drop empties.
- `addTokens(current, incoming, { allowDuplicates, max })`: pure append with the
  rules above; returns the new list unchanged when nothing can be added.
- `removeToken(current, value)`: removes the first exact match.
- Unit-tested independently of the renderer.

### Visual rules (tokens only)

- Group: `controlHeight(theme, "md")` minimum, `background`, `border`,
  `radius.md`, `controlPaddingX`, `spacing.xs` gap, `focusRing(theme)` while the
  field is focused, `opacity: 0.5` when disabled.
- Chip: `muted` fill, `mutedForeground` text, `radius.sm`, `caption` type,
  padding `spacing.sm` / `spacing["2xs"]`; remove control is a 16px `role="button"`
  glyph with an `accent` hover.
- Field: transparent, `body` type, grows to fill the row, `minWidth: 80`
  (layout constant), no border of its own.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/tag-input/logic.ts` | **create** |
| `packages/components/src/tag-input/logic.test.ts` | **create** — 9 unit tests |
| `packages/components/src/tag-input.tsx` | **create** — the three parts, the context, `tagInputMeta` |
| `packages/components/src/index.ts` | add `export * from "./tag-input.js";` |
| `packages/components/src/inventory.ts` | import and list `tagInputMeta` |
| `packages/components/src/behaviour/tag-input.test.tsx` | **create** — 9 native tests |
| `packages/components/examples/tag-input.example.tsx` | **create** — a tag editor with a five-tag cap |
| `packages/components/docs/tag-input.mdx` | **create** |
| `docs/component-api.md` | move Tag / token input into the built table |
| `COMPONENTS.md` | row → `done` / `partial`, 9 native + 9 unit tests, limitations |
| `TODO.md` | tick the row |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test             # expected: tag-input logic 9
nub run --filter @gpuixui/components test:behaviour   # expected: TagInput 9
nub run check && nub run lint && nub run test         # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- `Enter` arrives as `submit` rather than `keyDown` on the input (SearchInput
  measured both paths) — handle both once, in the root, and test the real one;
- the input cannot grow inside a flex row (no `flexGrow` on `<input>`) — give the
  field a fixed width and record it;
- a chip's remove control cannot take focus (nested `role="button"` inside a
  `div`) — keep it clickable, record that keyboard removal is the field's
  Backspace only.

## 6. Test plan

`src/tag-input/logic.test.ts`:

1. `splitDraft` trims and drops empties (`" a , ,b "` → `["a","b"]`);
2. it splits a pasted `"a,b"` into two;
3. `addTokens` appends in order;
4. duplicates are dropped by default;
5. `allowDuplicates` keeps them;
6. `max` caps the result and never truncates existing tokens;
7. `addTokens` with nothing addable returns the same list;
8. `removeToken` removes the first exact match only;
9. removing an absent token is a no-op.

`src/behaviour/tag-input.test.tsx` (real renderer, a stateful harness):

1. renders the chips and the field, named by `label`;
2. typing and `Enter` adds a chip and clears the draft;
3. `,` commits as well;
4. a duplicate is ignored and the draft clears;
5. `Backspace` in an empty field removes the last chip;
6. a chip's remove control removes it;
7. `max` refuses an addition;
8. disabled: the field is readOnly and chips have no remove control;
9. controlled `value` + uncontrolled `defaultValue` both drive the same rules.

**Both directions.** Drop the duplicate check: unit test 4 and native test 4
fail. Ignore `max`: unit test 6 and native test 7 fail. Restore after each.

## 7. Acceptance criteria

- Three parts with JSDoc, exported `TagInputChipState`, pure logic module.
- Nine native + nine unit tests, both themes, no literal colours.
- Example, docs page, inventory row, `COMPONENTS.md` row and the contract agree.
- All gates green.
