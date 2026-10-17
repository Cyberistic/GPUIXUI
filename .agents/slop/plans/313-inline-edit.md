# 313 — Inline edit: rename in place

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` (C-row), `115` (Field) |
| Status | planned |
| Source | `docs/component-api.md` §8 (planned part: `InlineEdit`); `COMPONENTS.md` → Tier 2 → Inline edit |

This plan is self-contained. It adds `InlineEdit` at the Tier 2 bar.

---

## 1. Why

Renaming a file, a workspace or a property is a text field that appears where the
label already is. Today a consumer would hand-roll the swap, the focus move and
the commit/cancel keys per call site. The contract (commit on Enter, cancel on
Escape, commit on blur) is small but must be one rule.

There is no `contenteditable` in GPUix; the honest implementation is a `<text>`
in a focusable `div` that swaps for an `<input>`.

## 2. The target API

```tsx
<InlineEdit
  label="Workspace name"
  value={name}
  onCommit={(next) => rename(next)}
/>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `InlineEdit` | display/edit swap, draft, commit/cancel, focus | `value` (required, the committed text), `onCommit` (required), `label` (required), `placeholder?`, `disabled?`, `editing?`, `defaultEditing?`, `onEditingChange?`, `style?: StateStyle<InlineEditState>` |

`InlineEditState` is `{ readonly editing: boolean; readonly disabled: boolean }`.

### Behaviour contract

- **Display:** a `div` with `role="button"`, `tabIndex={0}` (or `-1` when
  disabled) showing `value`; an empty value shows `placeholder` in
  `mutedForeground`.
- **Enter edit:** click, `Enter` or `Space` on the display. Edit mode renders an
  `<input>` with the current `value`, focused through the renderer's
  `focusElement` once mounted (`autoFocus` is not enough after a swap — measured
  in the Dialog suite).
- **Commit:** `Enter` or blur. Calls `onCommit(draft)` only when the draft
  differs from `value`; empty text is a valid value (clearing) and is not
  special-cased. Leaves edit mode and returns focus to the display.
- **Cancel:** `Escape`. Discards the draft, leaves edit mode and returns focus to
  the display; `onCommit` is not called.
- **Controlled mode:** `editing`/`onEditingChange` mirror the Dialog convention;
  `onCommit` remains the caller's data write. Blur cancel? No — blur commits.
- **Disabled:** readOnly display, no tab stop, no edit.
- `value` is required and controlled: the component never stores the committed
  value, only the draft, exactly as `FieldInput` does not own its value.

### Visual rules (tokens only)

- Display: `label` type, `foreground`, `radius.sm`, padding `spacing.xs`,
  transparent background, `hover` background `accent`/`accentForeground`,
  `focusRing(theme)` while focused.
- Input: `controlHeight(theme, "md")`, `body` type, `background`,
  `inputForeground`, `border`, `radius.sm`, `focusRing(theme)`.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/inline-edit.tsx` | **create** — `InlineEdit`, `inlineEditMeta` |
| `packages/components/src/index.ts` | add `export * from "./inline-edit.js";` |
| `packages/components/src/inventory.ts` | import and list `inlineEditMeta` |
| `packages/components/src/behaviour/inline-edit.test.tsx` | **create** — 8 tests (§6) |
| `packages/components/examples/inline-edit.example.tsx` | **create** — rename a workspace, with a controlled value |
| `packages/components/docs/inline-edit.mdx` | **create** |
| `docs/component-api.md` | move Inline edit into the built table |
| `COMPONENTS.md` | row → `done` / `partial`, 8 native tests, limitations |
| `TODO.md` | tick the row |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # expected: InlineEdit 8
nub run --filter @gpuixui/components test             # expected: inventory pass
nub run check && nub run lint && nub run test         # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- `focusElement` on the input after the swap does not move focus (the Dialog
  measured that it does) — if it fails, keep focus on the display and record the
  limitation rather than claiming the field is focused;
- blur cannot commit because the input unmounts before the blur handler — if so,
  commit on `Enter` only, keep Escape, document blur as a known gap;
- `aria-label` on the display `div` does not reach the dump — name it with
  `role="button"` + `aria-label`, which the Dialog/IconButton precedent supports.

## 6. Test plan

`src/behaviour/inline-edit.test.tsx`, real renderer:

1. renders the value in display mode and no input;
2. a click enters edit mode and focuses the input with the value;
3. `Enter` on the display enters edit mode too;
4. `Enter` in the input commits the draft and returns to display mode;
5. `Escape` discards the draft and returns focus to the display;
6. blur commits the draft;
7. an unchanged draft does not call `onCommit`; a disabled control ignores click
   and `Enter`;
8. controlled `editing` + `onEditingChange` drive the swap without internal state.

**Both directions.** Call `onCommit` on Escape: test 5 fails. Remove the
"changed?" guard: test 7 fails. Restore after each.

## 7. Acceptance criteria

- One part with JSDoc and `InlineEditState`.
- Eight native tests, both themes, no literal colours or sizes.
- Example, docs page, inventory row, `COMPONENTS.md` row and the contract agree.
- All gates green.
