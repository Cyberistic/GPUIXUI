# 601 — The date field's fixed width and the overlay's false calendar claim

**Phase:** F (the fixed-surface half of the extension mechanism) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the numeric contract),
384 (content-box fit), 556 (the calendar, time and presence metrics),
598 (the notification inbox's fixed surfaces) ·
**Number block:** 500–699 (`tokens-theme` overflow; 599 and 600 are in use by
the `playground` worktree, so this plan takes the next free number).

## 1. The gap

`theme.dimensions` owns every fixed surface the library paints. Two claims in
that group are wrong or incomplete on the merged 2026-10-19 tree.

1. **`overlayWidth` says it is the calendar width.** `scale.ts` and
   `docs/tokens.md` describe the 220px token as the "default popover, combobox
   and calendar width". The calendar is not that surface. `DatePickerCalendar`
   paints six rows of seven cells at `CELL = 34` (`date-picker.tsx:361`, read
   from the `components` worktree at `6c201433`), and `DatePickerContent` pads
   the grid with `theme.spacing.md`. The grid is therefore **seven
   `calendarCellSize` cells wide — 238px at the shipped 34px cell — before the
   popover's own padding**. It is content-sized, so `overlayWidth` never paints
   it. The same 220px token also does not describe the popover: `popover.tsx:406`
   gives that surface a 200px minimum (the cross-team row in `TODO.md` already
   records the 200-vs-180 split).
2. **The date trigger's width is unowned.** `date-picker.tsx:272` fixes the
   trigger at `width: 220`. That is a *field* width, not an overlay width, so a
   brand that copies a `PlatformStyle` cannot widen or narrow a date field, and
   no metric rule holds it to the content the trigger paints: its two
   `spacing.md` insets, the `spacing.md` gap between the value and the
   disclosure glyph, its two borders, one `label` glyph and the `caption`
   disclosure glyph. A theme with `dateFieldWidth: 40` would clip the field's own
   chrome while every check returned `[]`.

No shipped colour, pair or pixel moves. The fix is one dimension, one numeric
rule, and the documentation truth that names the calendar by the metric that
actually sizes it.

## 2. Decisions

1. **`dateFieldWidth` is a new `Dimensions` member, not a reuse of
   `overlayWidth`.** A date trigger is a field; an overlay width is a floating
   surface. They are 220px today by coincidence, and a brand may widen one
   without the other.
2. **The value is the shipped literal.** 220px is what `date-picker.tsx` paints
   today, so a consumer that reads the token keeps the current pixels.
3. **`overlayWidth` names the surfaces that actually use it today.** The
   components tree read on 2026-10-19 uses 220 as the minimum for the combobox
   list (`combobox.tsx:676`) and the navigation menu (`navigation-menu.tsx:521`);
   menus use `overlayMinWidth` 180 (`menu/surface.tsx:56`) and `overlayMaxHeight`
   320 (`menu/sub.tsx:460`). The description becomes "default combobox and
   navigation-menu width".
4. **The calendar is documented as content-sized.** Its grid width is derived
   in the docs guard as `7 × dimensions.calendarCellSize` (238px today), so a
   cell edit takes the sentence with it. No new token: the grid follows the
   cell, exactly as the component paints it.
5. **One new `atLeast` rule, no new rule kind.** The date trigger must hold its
   own chrome and one glyph. The bound is read from the theme's own
   `spacing.md`, `borderWidth.thin`, `typography.label.fontSize` and
   `typography.caption.fontSize`; a non-finite side keeps one diagnostic through
   the existing helper (plan 532).
6. **The consumer migration is cross-team.** `packages/components` is another
   workstream's tree; this plan records one `TODO.md` handoff and does not edit
   it.

## 3. Exact edits

All paths are relative to the worktree root
`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

### 3.1 `packages/tokens/src/scale.ts`

Change the `overlayWidth` doc comment:

```ts
  /** 220px — default combobox and navigation-menu width. */
  readonly overlayWidth: number;
```

After `fieldAdornmentSize`, add:

```ts
  /** 220px — fixed width of a date trigger field. */
  readonly dateFieldWidth: number;
```

In the `dimensions` object, after `fieldAdornmentSize: 16`, add:

```ts
  dateFieldWidth: 220,
```

### 3.2 `packages/tokens/src/metrics.ts`

In the `dimensions` bullet of the `themeMetricFailures` JSDoc, after the chip
sentence, add:

> a date trigger holds its own insets, its gap, one `label` glyph and its
> `caption` disclosure glyph,

In the `dimensions` group of the returned rules, after the `fieldMinWidth`
content-box rule and before the message-viewport rule, add:

```ts
    // A date trigger paints its value and a disclosure glyph inside its own
    // insets and gap; a field narrower than that chrome clips one of them.
    ...atLeast(
      "dimensions",
      "dateFieldWidth",
      dimensions.dateFieldWidth,
      3 * spacing.md +
        2 * borderWidth.thin +
        typography.label.fontSize +
        typography.caption.fontSize,
    ),
```

`finiteGroup("dimensions", dimensions)` and the `positive` walk already govern
the new member (plans 531 and 554); no index edit is needed.

### 3.3 `packages/tokens/src/date-field-metrics.test.ts` (new)

Header comment states the bug: the date trigger paints a 220px field around its
own insets and gap, but the width was a literal, `overlayWidth` claimed the
calendar, and no metric rule held the field to the content it paints.

Cases:

1. **The shipped values and every shipped set.** Assert
   `dimensions.dateFieldWidth === 220`,
   `dimensions.calendarCellSize * 7 === 238`, and that every `shippedThemes`
   entry returns `[]` from `themeMetricFailures`. This is the "no value moves"
   case.
2. **A field narrower than its chrome is reported.** Build
   `extendTheme(lightTheme, { dimensions: { dateFieldWidth: 40 } })` and assert
   exactly one failure:

   ```ts
   {
     group: "dimensions",
     member: "dateFieldWidth",
     rule: "at-least",
     actual: 40,
     bound:
       3 * lightTheme.spacing.md +
       2 * lightTheme.borderWidth.thin +
       lightTheme.typography.label.fontSize +
       lightTheme.typography.caption.fontSize,
   }
   ```

   Before the rule, this returns `[]`.
3. **A field that holds its chrome passes.** Set `dateFieldWidth` to the bound
   (computed in the test) and assert `[]`; one pixel below it returns the
   failure. This proves the bound is the boundary, not a house number.
4. **A zero width is still the sign rule's diagnostic.**
   `extendTheme(lightTheme, { dimensions: { dateFieldWidth: 0 } })` returns the
   `positive` failure, not the shape failure.

### 3.4 `packages/tokens/src/dimensions.example.ts`

Add the date field to the executed copy-and-own example, so the new merge
surface is type-checked and asserted:

```ts
export const narrowDrawerTheme = extendTheme(lightTheme, {
  dimensions: {
    drawerWidthMd: 360,
    dialogWidthMd: 520,
    chatViewportMinHeight: 200,
    dateFieldWidth: 240,
    notificationPanelWidth: 360,
    notificationListMaxHeight: 320,
  },
});
```

Update the file's header comment and the theme's doc sentence to name the date
field. `dimensions.test.ts` asserts the new value on `narrowDrawerTheme` beside
the existing assertions, so `examples.test.ts` proves the override is live.

### 3.5 `docs/tokens.md` — the dimension table and paragraph

Change the `overlayWidth` row to:

```md
| `dimensions.overlayWidth` | 220 | default combobox and navigation-menu width |
```

After the `fieldAdornmentSize` row, add:

```md
| `dimensions.dateFieldWidth` | 220 | fixed date trigger width; holds its insets, gap, disclosure glyph and one `label` glyph |
```

Append to the paragraph below the table:

> A date trigger is a fixed-width field, so `dateFieldWidth` holds it rather than
> an overlay width. A calendar grid is seven `calendarCellSize` cells wide —
> 238px at the shipped 34px cell — before the popover's padding, so a calendar is
> content-sized and `overlayWidth` names only the combobox and navigation menu.

### 3.6 `docs/design-system.md` — §6's dimensions paragraph

Append after the notification-inbox sentence:

> A date trigger is 220px wide and holds its insets, gap, disclosure glyph and
> one `label` glyph; its calendar grid is seven 34px cells (238px) before the
> popover's padding, so it is content-sized, not an `overlayWidth` surface.

`docs.test.ts` holds the §6 sentences verbatim. Add a derived case (see 3.7) so
a value or cell edit must take the sentence with it.

### 3.7 `packages/tokens/src/docs.test.ts`

Add two cases after "lists every component dimension":

1. **The date field and the calendar's derived grid.** Build the expected
   sentences from `dimensions` and assert both documents contain them; assert
   `markdown` contains the `dateFieldWidth` row from the implementation.
2. **`overlayWidth` no longer claims the calendar.** Assert the new row
   description is present, the old phrase `combobox and calendar width` is
   absent from `markdown`, and the derived grid sentence
   `seven \`calendarCellSize\` cells wide — 238px at the shipped 34px cell` is in
   `markdownProse`.

### 3.8 `packages/tokens/README.md`

Extend the dimensions sentence in "Extending a theme":

> Component dimensions include the drawer and dialog ladders, the date field
> width, the calendar day cell, the time segment, …

### 3.9 `COMPONENTS.md`

In the Design tokens row, add "the date field width" to the dimension list:

> … the dialog width ladder, the date field width, the calendar day cell, …

No status change.

### 3.10 `TODO.md`

Add a ticked row at the end of the tokens bullets:

```md
`[x]` Ship the date trigger's fixed width and correct the overlay claim — the
date picker paints a 220px field around its own insets and gap, but the width
was a literal and `overlayWidth` was documented as the calendar width, which is
content-sized at seven `calendarCellSize` cells; `dateFieldWidth` owns the
field, a content-fit rule holds it, and the calendar is documented by the metric
that sizes it (plan 601)
```

Add one cross-team row:

```md
`[ ]` Cross-team: `components` reads `theme.dimensions.dateFieldWidth` for
`date-picker.tsx`'s trigger width, beside `calendarCellSize` for `CELL`
(owner: `components`; plan 601)
```

Advance the section progress bar from 247/321 to 248/322 (one done, one new
pending).

### 3.11 `.agents/slop/plans/README.md`

Change the block row to `500–699` (numbers are shared across worktrees) and add:

```md
| [601](./601-date-field-width.md) | The date field's fixed width and the overlay's false calendar claim | F | 353, 358, 384, 556, 598 | done |
```

## 4. Commands

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the tokens suite grows by one file and the new cases; no other test
count changes except `dimensions.test.ts` if it asserts the example's fields.
All gates exit 0.

Two-direction proof (the repo's `scripts/verify-two-directions.sh` is a
cross-team item; do it by hand until it is fixed):

1. Remove the `atLeast` block from `metrics.ts`: case 2 of
   `date-field-metrics.test.ts` fails (it returns `[]`).
2. Remove the date/calendar sentences from the documents: the new `docs.test.ts`
   cases fail.
3. Restore both; all pass.

## 5. STOP conditions

Stop and report, do not improvise, if any of these is true:

- `date-picker.tsx` no longer paints a 220px trigger or a 34px cell; re-read the
  literals and re-plan the metric names.
- a shipped theme already fails `themeMetricFailures` after the change;
- the new bound is greater than 220 (a shipped date field would clip);
- the tokens suite fails for a reason unrelated to the new cases;
- a document guard fails on a sentence not listed above.

## 6. Acceptance

- `theme.dimensions.dateFieldWidth` owns the trigger width; `overlayWidth` no
  longer claims the calendar.
- `themeMetricFailures` reports a date field narrower than its own chrome.
- The executed dimensions example moves the date field and every shipped set
  still passes all nine checks.
- `docs/tokens.md`, `docs/design-system.md`, the README and `COMPONENTS.md` name
  the new metric and the calendar's derived grid, and their guards derive the
  values from the implementation.
- `TODO.md` ticks the token row and records the `components` handoff.
- `nub run check`, `nub run lint` and `nub run test` pass.
