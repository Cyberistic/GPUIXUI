# 301 — CommandMenu becomes a compound part

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200-adopt-compound-part-api.md`, `114-tier2-menus.md`, `133-command-menu-fuzzy.md` |
| Status | planned |
| Source | `docs/component-api.md` §9 row "Command menus"; `TODO.md` → "Split the remaining landed deviations … into parts" |

Self-contained. It migrates only `CommandMenu`. Pagination, Combobox and the
date/time pickers are `300`, `302`, `303`.

---

## 1. Why

`CommandMenu` hides five regions behind props: the search field (`placeholder`),
the empty state (`emptyLabel`), the row list, the group headings and the key hint.
A caller cannot add a footer, a loading row, or its own empty state, and the docs
cannot name the row anatomy. The contract says every region is a part.

The **ranking** must stay in the root: matches are computed from the whole action
set, and `menu/logic.ts` navigates over filtered positions. Pushing that into a
consumer would duplicate the fuzzy/group rules. So the root owns query, matches
and the highlight; `CommandMenuList` renders the rows from that state.

## 2. The target API

```tsx
<CommandMenu open={open} onOpenChange={setOpen} actions={actions}>
  <CommandMenuInput placeholder="Type a command…" />
  <CommandMenuList />
  <CommandMenuEmpty>No matching commands</CommandMenuEmpty>
</CommandMenu>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `CommandMenu` | the dialog, the query/highlight state, the ranked matches, the context | `open`, `onOpenChange`, `actions`, `filter?` |
| `CommandMenuInput` | the search field: typing, arrows/Home/End, Enter, Escape | `placeholder?` (default `"Type a command…"`), `aria-label?` |
| `CommandMenuList` | the scrolling match column: group headings + rows + the key hint | host props |
| `CommandMenuItem` | one runnable row: label, shortcut, highlight, disabled | `action: CommandAction` |
| `CommandMenuEmpty` | shown only when there are no matches | children (default `"No matching commands"`) |

Rules:

- `placeholder` and `emptyLabel` leave the root; the root keeps only
  `open`/`onOpenChange`/`actions`/`filter` (the data and visibility the palette
  cannot derive from children).
- The root computes `matches`; it exposes `query`, `setQuery`, `matches`,
  `activeAction: Option<CommandAction>`, `isActive(action)`, `run(action)` and
  `handleInputKeyDown(event)` through a context that throws
  `"CommandMenu parts must be used inside CommandMenu"` outside the root.
- `CommandMenuList` renders `<MenuLabel>` before a group change (reusing
  `menu/item.tsx`), `CommandMenuItem` for each match, and the caption hint
  `↑↓ to navigate · ↵ to run · esc to close` as its last row. The hint lives with
  the list because it describes the list's keys; a custom list drops it.
- `CommandMenuItem` keeps `role="option"`, `aria-selected`, `testId="command-<id>"`
  and the shared `menuRowStyle`; clicking it runs the action and closes. The
  active row is **highlighted, not focused** — the input must keep focus.
- `CommandMenuEmpty` keeps `testId="command-empty"`.
- The dialog stays `DialogContent size="md" label="Command menu"`,
  `showClose={false}`, `initialFocus` pointing at the input part, `testId="command-menu"`.
  The input registers itself in the context ref so `initialFocus` can find it.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/command-menu.tsx` | rewrite as five parts; keep `CommandAction`, the default matcher and `commandMenuMeta` |
| `packages/components/src/behaviour/command-menu.test.tsx` | `Palette`/`LocalPalette` compose the parts; 12 existing tests stay; add 2 |
| `packages/components/examples/command-menu.example.tsx` | compose the parts |
| `packages/components/docs/command-menu.mdx` | anatomy by part, composed snippet, custom-empty note, test count |
| `COMPONENTS.md` | Command menus row: parts + new test count |
| `docs/component-api.md` | §8 Command menus row lists the five parts; delete its §9 row |
| `TODO.md` | tick the CommandMenu slice |

`rg -n "<CommandMenu" packages apps examples` must show only the example, the
behaviour suite and `command-menu.tsx` itself.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # exit 0, CommandMenu 14, total +2
nub run --filter @gpuixui/components test             # exit 0
nub run check                                         # exit 0
nub run lint                                          # exit 0
```

## 5. STOP conditions

Stop and report if:

- `DialogContent`'s `initialFocus` cannot reach the input through the new part
  (measured: it takes a `() => number | null`; the context ref is the answer);
- the rows cannot read the highlight without an index prop (compare action ids,
  not positions);
- `CommandMenuList` has to own the query or matches (that is the root's job);
- a second `Dialog`/overlay would be needed to allow a caller to move the input
  outside the content (do not allow that; the input must stay in the content).

## 6. Test plan

Keep all twelve existing behaviour tests (focus on open, filtering, ArrowDown +
Enter, clicked row, empty label, custom filter, disabled action, Escape,
non-contiguous query, ranking decides Enter, group order, empty-query order). Add:

1. **the empty state is a part** — compose `<CommandMenuEmpty>Nothing here</CommandMenuEmpty>`
   and type `zzz`; `command-empty` contains `"Nothing here"`, not the default.
2. **a composed placeholder reaches the input** — `<CommandMenuInput placeholder="Find a command" />`
   gives the input that placeholder (read from the element's props).

**Both directions.** Make `CommandMenuItem` paint `aria-selected={true}`
unconditionally: the ranking test fails. Restore. Test 1 fails if
`CommandMenuEmpty` ignores its children and always prints the old default.

## 7. Acceptance criteria

- Five exported parts with JSDoc; the root has no `placeholder`/`emptyLabel`.
- `CommandAction`, the default ranked matcher and `commandMenuMeta` survive.
- 14 native behaviour tests; docs, example, inventory and contract agree.
- Gates in §4 green.

## 8. Result

To be filled by the executor: commit, measured counts, both-direction evidence.
