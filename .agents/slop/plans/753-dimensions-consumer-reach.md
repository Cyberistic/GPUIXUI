# 753 — The dimensions promise the shipped components do not keep

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (docs truth).
**Depends on:** 353 (component dimensions), 389 (a platform style owns the
metrics), 530/556/598/601/604 (the later dimension families), and the open
`components`/`primitives` interlock rows in `TODO.md`.

## 1. The defect

`docs/design-system.md` §6 ends its fixed-dimension paragraph with:

> They live in `theme.dimensions` so a brand can widen a dialog or a toast
> without touching component source.

The token half is true: the tokens ship and `themeMetricFailures` holds every
bound they promise. The consumer half is false. **No consumer reads a
dimension.** On the heads this workstream can inspect:

```sh
# components, primitives, docs-site, playground: zero matches
grep -rn "theme.dimensions\|\.dimensions\." --include=*.ts --include=*.tsx \
  workspaces/components workspaces/primitives workspaces/docs-site workspaces/playground \
  | grep -v node_modules | grep -v /dist/
```

The values the paragraph names are still local literals in the consumer source:

| Surface | Shipped literal | Source |
| ------- | --------------- | ------ |
| dialog width ladder | `sm: 360, md: 480, lg: 640` | `components/src/dialog.tsx` `MAX_WIDTH` |
| toast card | `CARD_WIDTH = 380` | `components/src/toast/viewport.tsx` |
| menu minimum / scroll height | `minWidth: 180`, `maxHeight: 320` | `components/src/menu/surface.tsx`, `menu/sub.tsx` |
| popover minimum | `minWidth: 200` (not a token; an overlay outlier) | `components/src/popover.tsx` |
| notification panel, list and unread dot | `320 / 280 / 6` | `components/src/notification-centre.tsx` |
| date trigger / calendar cell | `220 / 34` | `components/src/date-picker.tsx` |
| preview card range | `240 / 360` | `components/src/preview-card.tsx` |
| keycap | `20` | `components/src/keyboard-shortcuts.tsx` |

The migrations are already recorded — `TODO.md` carries the `components` rows
for the dialog ladder, the calendar cell, the time segment, the avatar presence
dot, the notification inbox, the date field, the timeline marker, the drawer
ladders, the chat viewport and the carousel marks, and the `primitives` row for
the field adornment. Plan 556's own history records the contradiction:

> the design system promised a brand could widen a dialog through
> `theme.dimensions` while `dialog.tsx` kept 360/480/640 as a local `MAX_WIDTH`

The promise survived that plan because the only guard over the paragraph,
`docs.test.ts` “states the fixed component dimensions”, asserts its **numbers**,
not its consumer claim. So a reader is told to edit one token and get a wider
dialog, and editing it changes nothing.

Precedent: plan 720 corrected the density promise after the `primitives` recipe
slice stopped honouring it, and guarded the exception. This is the same
correction for the dimensions paragraph.

## 2. Exact changes

### 2.1 `docs/design-system.md` §6

Replace only the sentence

```
They live in `theme.dimensions` so a brand can widen a dialog or a toast
without touching component source.
```

with

```
They live in `theme.dimensions` and the metric contract holds their bounds,
but the shipped consumer families still paint their own fixed literals — the
dialog a 360/480/640 ladder, the Toast a 380px card, a menu a 180px minimum —
and each migration to the token is a cross-team row in `TODO.md`, so a brand
that needs a different width today passes the component's `style` prop as well
as the token.
```

Nothing else in the paragraph changes: the numbers, the keycap and adornment
bounds and the caption-leading sentence stay exactly as they are.

### 2.2 `packages/tokens/src/docs.test.ts`

The pinned sentence in “states the fixed component dimensions” must gain the
same replacement text, or the suite fails on the edit. Keep every interpolation
(`dimensions.overlayMinWidth`, `toastWidth`, `previewCardMinWidth/MaxWidth`,
`fieldAdornmentSize`, `keycapSize`) and derive the three new literals from the
package too: `dimensions.dialogWidthSm/Md/Lg`, `dimensions.toastWidth` and
`dimensions.overlayMinWidth`. Do not hard-code them in the test.

### 2.3 `packages/tokens/src/dimension-consumer-reach.test.ts` (new)

A docs-truth guard over §6, in the shape of `density-exception.test.ts`:

- slice §6 from `## 6. Spacing and density` to `## 7. Radii`;
- **case 1** — the exception is stated: the section contains `still paint`,
  `` `TODO.md` `` and `` `style` ``;
- **case 2** — the numbers in the sentence are the package's: build
  `` `${dimensions.dialogWidthSm}/${...}` `` and require the ladder, the toast
  width and the overlay minimum from `dimensions`, so the prose and the token
  cannot drift;
- **case 3** — the unconditional promise is gone: the section does not contain
  `without touching component source` and does not match
  `/so a brand can widen/i` (this is the regression direction);
- **case 4** — the token half survives the edit: the section still states the
  overlay minimum/default/scroll height, the toast width and the field
  adornment size, so the fix did not delete the dimension story.

### 2.4 `COMPONENTS.md` — the Design tokens row

Append one clause after the density-exception sentence:

> The `dimensions` tokens likewise ship ahead of their consumers: the dialog,
> Toast, menu, notification, date field, preview card and keycap still paint
> their own literals, and every migration is a cross-team row (plan `753`).

No status change: the row stays `wip` for the reasons it already records.

### 2.5 `TODO.md`

Add one completed row under *Design tokens and theming* naming plan `753` and
the corrected promise. Move the progress bar from `339/416` to `340/417`.

### 2.6 `.agents/slop/plans/README.md`

Index this plan after `750` and add one paragraph to the block summary: the
dimensions sentence promised a capability no consumer reads, and the guard now
holds the corrected statement.

## 3. Commands

```sh
# 1. The new guard must fail before the docs edit (STOP if it passes):
nub run --filter @gpuixui/tokens test -- dimension-consumer-reach

# 2. Apply 2.1 and 2.2, then re-run; both cases must pass:
nub run --filter @gpuixui/tokens test -- dimension-consumer-reach docs.test

# 3. The surrounding docs guards:
nub run --filter @gpuixui/tokens test -- docs.test docs-links snippets readme

# 4. The package gate:
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types

# 5. Repo gates (end of task):
nub run check
nub run lint
nub run test
```

Expected: step 1 fails on case 3 (the promise is present); step 2–3 pass; step
4–5 green.

## 4. STOP conditions

- A consumer **does** read a dimension (`grep` in §1 returns a hit). Then the
  sentence is not false for that surface: stop and rewrite the plan around the
  remaining literals instead of shipping a blanket exception.
- The `docs.test.ts` sentence has changed shape since this plan was written (it
  no longer pins the paragraph): stop and re-read the guard before editing.
- `inventory.test.ts` or `docs.test.ts` fails for a reason other than the new
  text: stop and report; do not weaken the guard.

## 5. Test plan

`dimension-consumer-reach.test.ts` (new) — the four cases above.

Two-direction proof:

1. write case 3 first against the current page → **fails** on
   `without touching component source`;
2. apply §2.1 → case 3 passes;
3. delete the new clause from §2.1 → case 1 fails; restore → passes;
4. change one number in the sentence without the token → case 2 fails.

Record the pre-fix run and the restored run in the commit body.

## 6. Acceptance

- [ ] §6 states the consumer exception with three shipped literals and the
      `style` fallback.
- [ ] The new guard fails without the prose and passes with it; both directions
      run and are recorded.
- [ ] `docs.test.ts`'s pinned sentence derives the three new literals from
      `dimensions`.
- [ ] `nub run --filter @gpuixui/tokens test` and `check-types` green.
- [ ] `nub run check`, `nub run lint`, `nub run test` green.
- [ ] `TODO.md`, `COMPONENTS.md` and the plan index carry the row.
- [ ] No token value, pair, floor, metric, role or shipped theme moves; no API
      ships, so no new example is needed.
