# 725 — The Mac controls the library lacks

| Field | Value |
| ----- | ----- |
| Owner | `components` (`packages/components`) |
| Depends on | `724` (darwin tokens and hover policy) |
| Feeds | `728`, `729` |
| Status | landed 2026-10-31 |

## Why

The blocks in `728`/`729` need five controls that every Mac app uses and the
library does not ship. Each is a **composition** of existing primitives — no
new render primitive.

| Control | Composes | Where Mac uses it |
| ------- | -------- | ----------------- |
| `SegmentedControl` | `ToggleGroup` (single) | toolbar view switchers, settings panes |
| `PopUpButton` | `Select` | "Sort by", form choices — a button that shows its value and a ⌃⌄ glyph |
| `Disclosure` | `Collapsible` | inspector sections, settings groups (▸ rotates → ▾ swap, no transform) |
| `PathControl` | `Breadcrumb` | file locations in a toolbar or footer |
| `InsetGroup` | `Card` + `Item` | System-Settings-style grouped forms: rows with a label left, control right, hairline separators |

`TokenField` is **not** new: `TagInput` already exists; give it a darwin recipe
(pill radius `radius.full`, `primary` at 15% fill) in `724`'s components commit.

## Each control

For every control: `packages/components/src/<name>.tsx`, a behaviour test
`<name>.test.tsx`, `packages/components/docs/<name>.mdx`, a demo in
`apps/docs/src/components/docs/<name>-demo.tsx` registered in `demos.tsx`, a
row in `COMPONENTS.md`, an entry in `inventory.ts`. Copy the shape of
`toggle-group.tsx` + its test — it is the closest existing pattern.

### `SegmentedControl`

```tsx
<SegmentedControl value={view} onValueChange={setView} size="sm">
  <SegmentedControl.Item value="list" icon="list" label="List" />
  <SegmentedControl.Item value="board" icon="columns" label="Board" />
</SegmentedControl>
```

One `muted` track, `radius.md`; the selected segment is `background` with
`elevation.sm` (light) / `muted`-raised (dark). Equal-width segments. ←/→ move
and select (Mac segments select on arrow, unlike a tab list).

### `PopUpButton`

`Select` whose trigger is a `Button` (`variant="outline"`) showing the value and
a ⌃⌄ chevron pair; the list opens **with the selected item over the trigger**
(AppKit placement). If `@gpuixui/primitives` `Select` cannot align the open item
to the trigger (check `floating` placement options first), open below and
record the limitation.

### `Disclosure`

`Collapsible` + a 10pt triangle glyph swapped `chevron-right` ↔ `chevron-down`
from `@gpuixui/icons`; label 13pt semibold. Space/Enter toggle; ←/→ fold.

### `PathControl`

`Breadcrumb` with a 16pt icon per segment, `›` separators, last segment
`foreground`, others `mutedForeground`; pressing a segment calls
`onNavigate(path)`. Truncates leading segments to `…` past `maxSegments` (default 4).

### `InsetGroup`

```tsx
<InsetGroup title="Notifications">
  <InsetGroup.Row label="Show previews" control={<PopUpButton … />} />
  <InsetGroup.Row label="Badge app icon" control={<Switch … />} />
</InsetGroup>
```

`card` fill, `radius.lg` (10), 1pt `border` at 50%, rows 36pt with a hairline
between (not after the last), label 13pt left, control right, optional
`description` 11pt `mutedForeground`.

## Test plan (per control, minimum)

| Control | Case | Inversion |
| ------- | ---- | --------- |
| Segmented | → selects the next segment | arrow only moves focus |
| Segmented | segments share the track's width equally | drop `flexGrow: 1` |
| PopUpButton | the trigger shows the selected label | show the placeholder always |
| Disclosure | Enter toggles and swaps the glyph | toggle without swapping |
| PathControl | 6 segments with `maxSegments=4` render `…` first | no truncation |
| InsetGroup | 3 rows paint 2 separators | separator after every row |

`nub run --filter @gpuixui/components test:behaviour -t "<Control>"` per
control; verify both directions with `scripts/verify-two-directions.sh`.

## STOP

- Stop if a control needs a primitive change: that change is `primitives`'
  plan, not this one. Report what is missing.
