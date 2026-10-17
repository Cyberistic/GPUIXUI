# 310 — Keyboard shortcuts and keycaps

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §4 (C4), `111` (Card), `113` (Tabs) |
| Status | planned |
| Source | `docs/component-api.md` §8 (planned parts: `KeyboardShortcuts`, `Keycap`); `COMPONENTS.md` → Tier 2 → Keyboard shortcuts / keycap display; plan `205` C4 |

This plan is self-contained. It adds the shortcut display and the accelerator
model that `HotkeyRecorder` (plan 316) reuses.

---

## 1. Why

Every desktop app shows a shortcut cheat sheet, and every menu row shows its
accelerator. Today each example would hand-format `⌘K` or `Ctrl+K`, which drifts
per platform and duplicates the key map. The accelerator model goes in one pure
module; the display is a small compound component.

`COMPONENTS.md` gives the row `div` + `<text>`; nothing in the runtime needs to
be invented.

## 2. The target API

```tsx
<KeyboardShortcuts label="Editor shortcuts">
  <KeyboardShortcutsGroup label="File">
    <KeyboardShortcut label="New file" accelerator="mod+n" />
    <KeyboardShortcut label="Save" accelerator="mod+s" />
  </KeyboardShortcutsGroup>
  <KeyboardShortcutsGroup label="Navigation">
    <KeyboardShortcut label="Go to line" accelerator="ctrl+g" />
    <KeyboardShortcut label="Command palette" accelerator="mod+shift+p" />
  </KeyboardShortcutsGroup>
</KeyboardShortcuts>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `KeyboardShortcuts` | `role="list"`, optional accessible name, the section stack | `label?`, children |
| `KeyboardShortcutsGroup` | a named group: heading text + rows | `label` (required), children |
| `KeyboardShortcut` | one `role="listitem"` row: label left, keycaps right | `label` (required), `accelerator` (required), `style?: StateStyle<KeyboardShortcutState>` |
| `Keycap` | one key cap | children (the glyph or word), `style?` |

`KeyboardShortcutState` is `{ readonly keys: ReadonlyArray<string> }` — the
formatted keycaps, so a consumer style can react to a chord's width if needed.

### The accelerator model (`src/shortcut/accelerator.ts`)

- **Grammar:** `+`-separated tokens, case-insensitive, whitespace-trimmed.
  `mod` adapts to the platform (⌘ on `darwin`, `Ctrl` elsewhere); `cmd` is always
  ⌘, `ctrl` always `Ctrl`, `alt`/`option` always `Alt`/⌥, `shift` ⇧/Shift.
- **Named keys:** `enter` ↵/Enter, `escape` Esc, `space` Space, `tab` Tab,
  `backspace` ⌫/Backspace, `delete` Del, arrows ←↑→↓/Arrow keys, `pageup`,
  `pagedown`, `home`, `end`, `f1`–`f12`.
- **Display:** a single printable character is upper-cased; anything else is
  title-cased. Unknown multi-character tokens display verbatim so a consumer is
  never blocked by the model.
- `parseAccelerator(accelerator: string): ReadonlyArray<string>` — total; drops
  empty segments.
- `formatAccelerator(accelerator, platform = currentPlatform)` —
  `ReadonlyArray<string>` of display strings. **Order is the author's order.**

The platform is passed explicitly so the docs can show the Windows form on a Mac
and tests need no `process` mocking. `PlatformName`/`currentPlatform` enter
`internal/theme.ts` (the only file allowed to import `@gpuixui/tokens`).

### Visual rules (tokens only)

- Keycap: `caption` type, `muted` fill, `mutedForeground` text, `radius.sm`,
  `borderWidth.thin` `border` edge, horizontal padding `spacing.sm`, minimum
  height 20, monospace-agnostic (the label is the glyph; no font role change).
- Row: `label` type label in `foreground`, keycaps in a row with `spacing.xs`,
  vertical padding `spacing.sm`, the row separated by a `border`-coloured 1px
  line except the last (the same "1px div" technique `CardFooter` uses).
- Group: heading in `caption`/`mutedForeground`, uppercase is **not** applied
  (the caller's copy stays the caller's); the group gap is `spacing.lg`.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/internal/theme.ts` | add `currentPlatform` and the `PlatformName` type to the seam |
| `packages/components/src/shortcut/accelerator.ts` | **create** — the two pure functions above |
| `packages/components/src/shortcut/accelerator.test.ts` | **create** — 10 unit tests (§6) |
| `packages/components/src/keyboard-shortcuts.tsx` | **create** — the four parts, the context, `keyboardShortcutsMeta` |
| `packages/components/src/behaviour/keyboard-shortcuts.test.tsx` | **create** — 6 native tests |
| `packages/components/src/index.ts` | add `export * from "./keyboard-shortcuts.js";` |
| `packages/components/src/inventory.ts` | import and list `keyboardShortcutsMeta` |
| `packages/components/examples/keyboard-shortcuts.example.tsx` | **create** — an editor cheat sheet, macOS and Windows |
| `packages/components/docs/keyboard-shortcuts.mdx` | **create** |
| `docs/component-api.md` | move the row into the built table; record the two added parts (`KeyboardShortcutsGroup`, `KeyboardShortcut`) |
| `COMPONENTS.md` | row → `done` / `yes`, 6 native + 10 unit tests |
| `TODO.md` | tick the row |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test             # expected: accelerator suite 10 green
nub run --filter @gpuixui/components test:behaviour   # expected: KeyboardShortcuts 6
nub run check && nub run lint && nub run test         # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- a keycap's text leaf does not paint (`getAllText()` misses it) — then the
  capsule is text inside a `<div>`, which the runtime supports; if it still does
  not paint, record and stop;
- the display needs a font role the theme does not ship (it does not: the glyphs
  are Unicode, the words use `caption`);
- the group heading cannot be a heading with `role="heading"` + `aria-level={3}`
  while inside a `role="list"` — then the group is a labelled `role="group"`
  (supported) and the heading is plain text; record it.

## 6. Test plan

`src/shortcut/accelerator.test.ts` (pure):

1. splits, trims and lowercases `" Mod + Shift + K "`;
2. `mod` → `⌘` on `darwin`, `Ctrl` on `win32`/`linux`/`default`;
3. `cmd` stays `⌘` and `ctrl` stays `Ctrl` on every platform;
4. `alt`/`option` → `⌥` on darwin, `Alt` elsewhere; `shift` → `⇧`/`Shift`;
5. named keys map (`enter`, `escape`, arrows, `f5`);
6. a printable character is upper-cased;
7. empty segments (`"mod++k"`, `""`) are dropped without throwing;
8. symbols pass through (`,` `/` `[`);
9. order is the author's order, not canonicalised;
10. an explicit `platform` argument overrides `currentPlatform`.

`src/behaviour/keyboard-shortcuts.test.tsx` (real renderer):

1. renders groups and rows in declaration order with labels and formatted keys;
2. the root is a named list and rows are `listitem`s (`nodesWithRole`);
3. keycaps paint the `muted`/`mutedForeground` roles and the border edge;
4. the group heading is announced as a level-3 heading;
5. a consumer `style` on a row wins over the base — and a style callback
   receives the formatted `keys`;
6. both themes: the row label and keycap colours follow the theme.

**Both directions.** Make `formatAccelerator` ignore its `platform` argument:
unit tests 2 and 10 and native test 1 (Windows example) fail. Drop the group
heading role: native test 4 fails. Restore after each.

## 7. Acceptance criteria

- Four parts with JSDoc, an exported `KeyboardShortcutState`, and the pure module
  documented in the docs page.
- 10 unit tests and 6 native tests; example, docs page, inventory row,
  `COMPONENTS.md` row and the contract agree.
- `HotkeyRecorder` (plan 316) can import the accelerator formatter.
- All gates green.
