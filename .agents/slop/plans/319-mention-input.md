# 319 — Mention input

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §2 (A13), `116` (search/combobox patterns), `112` (anchored layer) |
| Status | done — 12 rule + 9 native tests; both-direction proof |
| Source | `docs/component-api.md` §8 (planned parts: `MentionInput`, `MentionInputList`, `MentionInputItem`); `COMPONENTS.md` → Tier 2 → Mention input; plan `205` A13 |

This plan is self-contained. It adds `MentionInput` at the Tier 2 bar.

---

## 1. Why

A comment box that autocompletes `@name` is a text field plus a ranked popup.
The hard part is the token rule: when does `@` start a mention, what is the
query, and what replaces it. That is pure logic and lives on its own.

The runtime gives an `<input>` and `FloatingLayer` + `<anchored>`; there is no
caret API, so the query is derived from the **text** (the last `@` token), which
is correct while the user types at the end. Mid-string editing is a documented
limitation, not a fake feature.

## 2. The target API

```tsx
<MentionInput
  label="Comment"
  value={text}
  onValueChange={setText}
  onMention={(person) => notify(person)}
>
  <MentionInputList>
    {people.map((person) => (
      <MentionInputItem key={person} value={person} />
    ))}
  </MentionInputList>
</MentionInput>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `MentionInput` | the value, the active query, the keyboard rules, the field surface | `value?`, `defaultValue?`, `onValueChange?`, `onMention?`, `label` (required), `placeholder?`, `disabled?`, `maxVisible?` (default 6), children |
| `MentionInputList` | ranks the declared items for the active query and renders them in an anchored surface; one row is highlighted | children (`MentionInputItem`s) |
| `MentionInputItem` | one `role="option"` row; pressing it selects | `value` (required), `label?`, `style?: StateStyle<MentionInputItemState>` |

`MentionInputItemState` is `{ readonly highlighted: boolean }`.

### Behaviour contract

- **Trigger:** typing `@` at the start of the text or after whitespace opens the
  list with an empty query; continuing to type narrows it. Typing whitespace
  closes it. The `@` may appear anywhere in the text; the list anchors to the
  field.
- **Ranking:** prefix matches first, then substring matches, each in declaration
  order, case-insensitive, capped at `maxVisible`.
- **Keyboard:** `ArrowDown`/`ArrowUp` move the highlight (wrapping), `Enter` or
  `Tab` inserts the highlighted name, `Escape` closes the list without changing
  the text. When the list is closed these keys are the input's own.
- **Insertion:** replaces the `@query` token with `@value` plus one space, sets
  the value and calls `onValueChange` then `onMention(value)`. Focus stays in
  the field; the caret is assumed at the end (documented).
- **No pointer-only path:** hovering a row only changes nothing (no hover-open);
  a press selects, so the list works with a mouse.
- **Disabled:** `readOnly` field, no list, no handlers.

### Logic (`src/mention/logic.ts`)

- `mentionQuery(text): Option<{ start: number; query: string }>` — the last `@`
  token that starts the text or follows whitespace and contains no whitespace.
- `applyMention(text, start, value): string` — replace from `start` to the end
  with `@value `.
- `rankMentions(values, query, maxVisible): ReadonlyArray<string>`.
- Unit-tested; the component only wires them to the field.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/mention/logic.ts` | **create** |
| `packages/components/src/mention/logic.test.ts` | **create** — 12 unit tests |
| `packages/components/src/mention-input.tsx` | **create** — the three parts, the contexts, `mentionInputMeta` |
| `packages/components/src/index.ts` | add `export * from "./mention-input.js";` |
| `packages/components/src/inventory.ts` | import and list `mentionInputMeta` |
| `packages/components/src/behaviour/mention-input.test.tsx` | **create** — 9 native tests |
| `packages/components/examples/mention-input.example.tsx` | **create** — a comment composer with a real mention |
| `packages/components/docs/mention-input.mdx` | **create** — including the caret limitation |
| `docs/component-api.md` | move Mention input into the built table |
| `COMPONENTS.md` | row → `done` / `partial`, 9 native + 12 unit tests, limitations |
| `TODO.md` | tick the row |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test             # expected: mention logic 12
nub run --filter @gpuixui/components test:behaviour   # expected: MentionInput 9
nub run check && nub run lint && nub run test         # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- `Tab` cannot be observed on the input (it moves focus at the platform level) —
  then Enter is the only insertion key and the docs say so;
- `role="option"` is dropped from the accessibility dump — use `role="button"`
  rows and record that the list is not announced as a listbox;
- typing `@` in the middle of text produces a query that cannot be replaced
  correctly — the limitation is already documented; do not add caret emulation
  with a hidden element.

## 6. Test plan

`src/mention/logic.test.ts`:

1. `"@"` at the end → query `""`;
2. `"hi @"` → empty query after whitespace;
3. `"hi @an"` → `"an"`;
4. `"email@example"` (no whitespace before `@`) → `None`;
5. `"@a b"` → `None` (whitespace ends the token);
6. `"@a @b"` → the last token (`"b"`);
7. `applyMention` replaces only the token and appends a space;
8. `applyMention` at the start replaces the whole text;
9. ranking puts prefix matches before substring matches;
10. ranking is case-insensitive;
11. ranking keeps declaration order within a tier;
12. `maxVisible` caps the result.

`src/behaviour/mention-input.test.tsx` (real renderer):

1. typing `@` opens the list with every candidate (capped);
2. typing `@an` narrows it and drops non-matches;
3. `ArrowDown`/`ArrowUp` move the highlight;
4. `Enter` inserts `@value ` and closes the list;
5. clicking a row does the same;
6. `Escape` closes without changing the text;
7. typing a space closes the list;
8. `onValueChange` and `onMention` both fire once with the inserted value;
9. disabled: the field is readOnly and no list opens.

**Both directions.** Rank by declaration order only: unit test 9 and native
test 2 fail. Do not append the trailing space: unit test 7 fails. Restore.

## 7. Acceptance criteria

- Three parts with JSDoc and an exported `MentionInputItemState`.
- Nine native + twelve unit tests, both themes, no literal colours.
- The caret limitation and its consequence are stated in the docs and the row.
- Example, docs page, inventory row, `COMPONENTS.md` row and the contract agree.
- All gates green.

## 8. Result

Landed 2026-10-18. Three measured facts changed the design:

- **`role="listbox"` and `role="option"` do not reach the accessibility dump**
  (probed: `nodesWithRole(renderer, "option")` was `[]`). The surface is a named
  `group` and the rows are selected buttons with `tabIndex=0`, so Tab + Enter can
  pick a row. The limitation is recorded in the docs and the inventory.
- **A space typed while the floating list is mounted is consumed by the
  runtime** before the field sees it. The planned "whitespace closes the list"
  native test was replaced with "a query that matches nothing closes it" (a real
  path), and the docs say so; the token rule still lives in `mentionQuery` and is
  unit-tested (`"@a b"` → none).
- **A press must select on `mouseDown`**, not `click`: blur/click ordering can
  unmount the row between press and release. Items listen to `onMouseDown`.

`Enter` arrives as the input's `submit` event (0.10.0), so insertion is handled
there; `isEnter` on keyDown is not used.

**Both directions:** ranking by declaration order fails the ranking unit test;
removing the trailing space from `applyMention` fails two unit tests. Restored:
12 rule + 9 native green.
