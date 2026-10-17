# 324 — Tier 2 icon adoption

**Phase:** C/F · **Owner:** components workstream · **Depends on:** 110, 111,
112, 113, 114, 116, 119, 120, 132, 157, 158, 300–303, 310, 321–323; the landed
`@gpuixui/icons` package (plan 031).

## 1. Why

Several Tier 2 components still paint their interactive marks as text glyphs
(`✕`, `✓`, `⌄`, `▾`, `‹`, `›`, `▕`), and their inventory rows and docs pages say
so (“until an icon set lands”). `@gpuixui/icons` has now landed with the exact
names needed (`x`, `check`, `chevron-*`, `search`, `info`, `success`, `warning`,
`error`). Leaving the text glyphs is now a false limitation, and text glyphs:

- do not share the icon size scale, so they do not line up with text or each
  other;
- are read as text by the accessibility dump, where a decorative icon should be
  absent;
- cannot be tinted independently of the text style;
- make the library look inconsistent beside `packages/primitives`, which already
  uses `Icon`.

This plan replaces **component-owned** marks only. It deliberately leaves:

- keyboard symbols in `KeyboardShortcuts`, `CommandMenu`’s footer hint, and
  `HotkeyRecorder`’s captured chord — those are text, not icons;
- ellipses (`…`) used as a value or a loading placeholder;
- `BreadcrumbSeparator`’s default `/`, which is a caller-replaceable typographic
  separator, not a fixed direction mark;
- glyphs a caller passes as children (for example `AlertIcon`, `EmptyState`’s
  `icon`, and the local `IconButton`’s children).

## 2. What changes

### 2.1 Dependency and boundary

- `packages/components/package.json`: add
  `"@gpuixui/icons": "workspace:*"` to `dependencies`.
- `packages/components/README.md`: add `@gpuixui/icons` to the allowed-import
  list. The dependency direction stays legal: `components` → `icons`.
- `.agents/slop/plans/110-package-components.md` §7: record that `Icon` is now
  an allowed import for a component-owned mark (same rule as the existing
  `Button`/`IconButton` stand-in line).
- `nub.lock`: accept the dependency record `nub install` writes. Commit it with
  the implementation; do not hand-edit the lockfile.

### 2.2 Component files

Use `Icon` from `@gpuixui/icons`, with a token colour from the existing theme
seam and a size from the icon scale. Never write a colour literal. Every icon
inside a labelled control is decorative (no `label`); an icon that is the only
carrier of meaning gets a `label`.

| File | Replace | With |
| ---- | ------- | ---- |
| `src/alert.tsx` (`AlertDismiss`) | `<text>✕</text>` | `Icon name="x"`, colour `theme.colors.mutedForeground`, size `sm` |
| `src/dialog.tsx` (`DialogContent` close) | `<text>✕</text>` | `Icon name="x"`, colour `theme.colors.mutedForeground`, size `sm` |
| `src/drawer.tsx` (`DrawerContent` close) | `<text>✕</text>` | `Icon name="x"`, colour `theme.colors.mutedForeground`, size `sm` |
| `src/toast/viewport.tsx` | tone text glyph | `Icon` by tone: `info`, `success`, `warning`, `danger` → `info`, `success`, `warning`, `error`; colour `palette.fg`, size `md`, `label={toast.tone}` |
| `src/toast/viewport.tsx` | dismiss `<text>✕</text>` | `Icon name="x"`, colour `theme.colors.mutedForeground`, size `sm` |
| `src/search-input.tsx` | leading `<text>⌕</text>` | `Icon name="search"`, colour `theme.colors.mutedForeground`, size `md` |
| `src/search-input.tsx` | clear `<text>✕</text>` | `Icon name="x"`, colour `theme.colors.mutedForeground`, size `sm` |
| `src/accordion.tsx` | `open ? "⌃" : "⌄"` | `Icon name={open ? "chevron-up" : "chevron-down"}`, colour `theme.colors.mutedForeground`, size `sm`; keep the existing `aria-label` on the wrapping `<text>` removed and put the label on the icon only if the trigger does not already name the state (`aria-expanded` does, so leave the icon decorative) |
| `src/menu/item.tsx` (`MenuCheckboxItem`) | `checked ? "✓" : ""` | `Icon name="check"`, colour `theme.colors.accent`, size `sm`, only when `checked`; keep an equal-width empty spacer when unchecked so labels do not shift |
| `src/menu/sub.tsx` (`MenuSubTrigger`) | `<text>▸</text>` | `Icon name="chevron-right"`, colour `theme.colors.mutedForeground`, size `sm` |
| `src/combobox.tsx` (`ComboboxTrigger`) | `<text>▾</text>` | `Icon name="chevron-down"`, colour `theme.colors.mutedForeground`, size `sm` |
| `src/combobox.tsx` (`ComboboxItem`) | `<text>✓</text>` | `Icon name="check"`, colour `theme.colors.primary`, size `sm`, `label="Selected"` |
| `src/date-picker.tsx` (`DatePickerTrigger`) | `<text>▾</text>` | `Icon name="chevron-down"`, colour `theme.colors.mutedForeground`, size `sm` |
| `src/date-picker.tsx` (`DatePickerCalendar` nav) | `<text>‹</text>` / `<text>›</text>` | `Icon name="chevron-left"` / `"chevron-right"`, colour `theme.colors.mutedForeground`, size `sm` |
| `src/time-picker.tsx` (`TimePickerClear`) | `<text>✕</text>` | `Icon name="x"`, colour `theme.colors.mutedForeground`, size `sm` |
| `src/tag-input.tsx` (`TagInputChip` remove) | `<text>✕</text>` | `Icon name="x"`, colour `theme.colors.mutedForeground`, size `xs` |
| `src/hotkey-recorder.tsx` (clear) | `<text>✕</text>` | `Icon name="x"`, colour `theme.colors.mutedForeground`, size `xs` |
| `src/pagination.tsx` (`PaginationPrevious`) | `‹ Prev` | `Icon name="chevron-left"` + `<text>Prev</text>`; keep the accessible label `"Previous page"` |
| `src/pagination.tsx` (`PaginationNext`) | `Next ›` | `<text>Next</text>` + `Icon name="chevron-right"`; keep the accessible label `"Next page"` |
| `src/carousel.tsx` (`CarouselControl`) | `<text>›</text>` / `<text>‹</text>` | `Icon name="chevron-right"` / `"chevron-left"`, colour `theme.colors.mutedForeground`, size `md` |

`Icon` already sets `pointerEvents: "none"`, so presses still hit the control.
For each fixed-width control, keep the old box dimensions. If an icon’s intrinsic
size is smaller than the old text box, centre it with the existing flex styles
rather than adding a magic number.

## 3. Tests

The existing behaviour suites are the first proof: removing a glyph makes every
assertion that still looks for that text fail. Update those assertions to the
new visible text and add one icon assertion per changed family, so the test
would fail if the glyph were merely deleted instead of replaced.

Exact suite changes:

- `src/behaviour/accordion.test.tsx`: add
  `expect(accordion.renderer.findByType("svg")).toHaveLength(1)` with one item,
  and assert no `⌄`/`⌃` text remains.
- `src/behaviour/alert.test.tsx`: assert the dismiss control contains an `svg`.
- `src/behaviour/dialog.test.tsx`: assert the close control contains an `svg`.
- `src/behaviour/drawer.test.tsx`: assert the close control contains an `svg`.
- `src/behaviour/toast.test.tsx`: assert a tone icon and the dismiss icon are
  painted; the tone icon is a labelled `img` node in the a11y dump.
- `src/behaviour/search-input.test.tsx`: one `svg` before typing, two after
  (leading search + clear).
- `src/behaviour/tag-input.test.tsx`: replace the `["design", "✕", …]`
  expectations with `["design", "docs"]` and assert each chip has one `svg`.
- `src/behaviour/hotkey-recorder.test.tsx`: replace the `"✕"` entry with no
  text entry and assert the clear control contains one `svg`.
- `src/behaviour/dropdown-menu.test.tsx`: replace the `"✓"` text checks with an
  `svg` count that increases after the checkbox row is toggled; keep the
  `aria-selected` assertions as the semantic proof.
- `src/behaviour/combobox.test.tsx`: assert the trigger has a chevron `svg` and
  a selected row has a check `svg` with the `"Selected"` name.
- `src/behaviour/date-picker.test.tsx`: assert the trigger and both month-nav
  controls contain `svg` nodes.
- `src/behaviour/time-picker.test.tsx`: assert the clear control contains an
  `svg`.
- `src/behaviour/pagination.test.tsx`: update the label lookups from
  `"‹ Prev"`/`"Next ›"` to `"Prev"`/`"Next"`, then assert each edge control
  contains an `svg`.
- `src/behaviour/carousel.test.tsx`: remove `"‹"`/`"›"` from the text
  expectation; assert the two control test ids each contain an `svg`.

The icon package itself already proves that `<svg source>` paints and tints in
the real renderer (`packages/primitives/runtime/icons.runtime.test.tsx`). These
suite assertions prove the component wires that icon, not just that the package
exists.

### Both-direction proof

Before the implementation, run the changed suites and record the failures caused
by the old text expectations. After it, run the same suites green. For the
regression record, revert one replacement (for example put the old `<text>✕</text>`
back in `search-input.tsx`) and show its suite fails the new `svg` assertion;
then restore the fix. Update `TODO.md` with the exact command and count.

## 4. Docs and inventory

- Update the “text glyph / until an icon set lands” claims:
  - `packages/components/docs/accordion.mdx`
  - `packages/components/docs/dialog.mdx`
  - `packages/components/docs/drawer.mdx`
  - `packages/components/docs/search-input.mdx`
  - `packages/components/docs/toast.mdx`
  - `packages/components/docs/time-picker.mdx`
  - any other page found with
    `grep -RIn "text glyph\\|until an icon set lands\\|until an icon package lands" packages/components/docs`.
- Update `COMPONENTS.md` rows whose wording changes:
  - Toasts: remove the text-glyph limitation, keep the other two.
  - Accordions: say “chevron indicator” and keep the no-transform limitation.
  - Search inputs: say “leading search icon”, remove the text-glyph limitation.
  - Dropdown menus: “text ✓” becomes “check icon”.
  - Any row that still says a fixed mark is text.
- The component metadata in each touched source file must match its
  `COMPONENTS.md` row (`inventory.test.ts` enforces status/support, and review the
  limitations text by hand).
- Existing examples already exercise the components; no new example file is
  needed. The visible change is covered by `examples/search-input.example.tsx`,
  `examples/toast.example.tsx`, the menu examples and the date-picker example.

## 5. Commands

Run from the worktree root:

```sh
nub install
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components test:behaviour
nub run check
nub run lint
nub run test
```

Expected: `nub install` completes and records the workspace dependency;
`check-types` and both component suites pass; the three repository gates pass.
`test:behaviour` needs the locally built `darwin-x64` binding (plan 140) or a
supported published host.

## 6. STOP conditions

Stop and report with evidence if:

- `@gpuixui/icons` cannot be resolved from `packages/components` after
  `nub install`, or adding it breaks the package boundary check;
- a needed icon name is absent from `ICON_NAMES`;
- `<svg>` inside an `IconButton` or a menu row does not paint or hit-test in the
  real renderer (capture the failing test and the element tree);
- a component test cannot distinguish “glyph deleted” from “icon painted” without
  adding a public test id — in that case add a stable internal `testId` on the
  `Icon` and record it, do not weaken the assertion;
- any gate fails for a reason outside this plan. Fix only the icon work; record
  the unrelated failure in `TODO.md` under the owning workstream.

## 7. Acceptance

- No component-owned fixed mark remains as a text glyph in the files listed in
  §2.2.
- Every replacement is an `Icon` with a token colour and an icon-scale size.
- Each changed behaviour suite asserts the `svg` is painted and that the old text
  is gone; the suite failed before the implementation.
- At least one native behaviour run is green on this host.
- Docs and `COMPONENTS.md` no longer claim the marks are text.
- `nub install`, `check-types`, `test`, `test:behaviour`, `check`, `lint` and
  `test` pass, or an unrelated gate failure is recorded with exact evidence.
