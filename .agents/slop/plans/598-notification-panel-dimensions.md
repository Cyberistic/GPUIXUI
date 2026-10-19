# 598 — The notification inbox's fixed surface metrics

**Phase:** B/F (the fixed-surface half of the extension mechanism) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the numeric contract), 365 (a
scroll viewport holds a row), 384 (content-box fit), 530 (the drawer, chat and
carousel metrics), 556 (the dialog, calendar, time and presence metrics), 568
(the bounds read the theme's own extremes) ·
**Number block:** 500–599 (`tokens-theme` overflow).

## 1. The gap

`theme.dimensions` owns every fixed surface metric the library paints — overlay
widths, field chrome, chip, toast, preview card, keycap, drawer, chat, carousel,
dialog, calendar, time segment and the avatar presence mark. The notification
centre is the last fixed panel outside that group. Its metrics are literals in
`packages/components/src/notification-centre.tsx`, read on 2026-10-19 from the
`components` worktree at `6c201433`:

| Surface | Literal | Location | Why it matters |
| ------- | ------- | -------- | -------------- |
| Inbox panel width | `320` | `notification-centre.tsx:350` (`panelStyle`) | A brand cannot widen or narrow the inbox; a copied `PlatformStyle` cannot own it. |
| Inbox panel maximum height | `380` | `notification-centre.tsx:351` (`panelStyle`) | The inbox is a fixed surface; a compact theme cannot shorten it. |
| Notification list viewport | `280` | `notification-centre.tsx:737` (`maxHeight`) | The scrolling list has its own maximum, independent of the panel around it. |
| Unread marker | `6` | `notification-centre.tsx:833-834` (`width`/`height`) | The unread dot is a brandable mark, like the carousel's idle dot and the avatar's presence mark. |

No palette is wrong and no shipped pixel moves. The defect is that four shipped
surfaces are outside the extension mechanism `docs/tokens.md` teaches, and
`themeMetricFailures` cannot report a broken inbox: a theme whose panel is
shorter than the list it contains — or whose list viewport cannot show one
notification row — returns `[]` from all nine checks.

The two relationships the component already relies on:

- the panel clips its contents (`overflow: "hidden"`), so a panel maximum
  shorter than the list maximum cuts notifications off;
- the list scrolls (`overflowY: "scroll"`), so a viewport shorter than one
  `density.rowHeight` clips every notification in it — the same rule plan 365
  applies to `overlayMaxHeight` and plan 530 to `chatViewportMinHeight`.

Every shipped set inherits the identity's dimensions (no platform style names
this group), so the four values are 320 / 380 / 280 / 6 everywhere.

## 2. Decisions

1. **Four flat fields**, matching the group's existing shape. `Dimensions`
   merges field by field and `metricMembers.dimensions` derives from
   `Object.keys(dimensions)`, so no index edit is needed.
2. **The values do not move.** They are the literals the shipped component
   already paints. A consumer that reads them gets today's pixels.
3. **Two floors, no new rule kind.** `notificationListMaxHeight` is at least one
   `density.rowHeight`; `notificationPanelMaxHeight` is at least
   `notificationListMaxHeight`. The `atLeast` helper already skips a non-finite
   side, so one broken value keeps one diagnostic (plan 532). Width and dot sign
   are covered by the group's existing `positive` walk (plan 554).
4. **Consumers migrate cross-team.** `packages/components` is another
   workstream's tree. This plan records one `TODO.md` handoff row; it does not
   edit that tree.

## 3. Exact edits

All paths are relative to the worktree root
`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

### 3.1 `packages/tokens/src/scale.ts`

In `Dimensions`, after `avatarPresenceDotSize`, add:

```ts
  /** 320px — the anchored notification inbox's width. */
  readonly notificationPanelWidth: number;
  /** 380px — the notification inbox's maximum height. */
  readonly notificationPanelMaxHeight: number;
  /** 280px — the height at which the notification list scrolls. */
  readonly notificationListMaxHeight: number;
  /** 6px — the unread marker on a notification row. */
  readonly notificationUnreadDotSize: number;
```

In the `dimensions` object, after `avatarPresenceDotSize: 10`, add in the same
order:

```ts
  notificationPanelWidth: 320,
  notificationPanelMaxHeight: 380,
  notificationListMaxHeight: 280,
  notificationUnreadDotSize: 6,
```

### 3.2 `packages/tokens/src/metrics.ts`

In the `dimensions` group of `themeMetricFailures`, after the
`avatarPresenceDotSize` bound and before `finiteGroup("elevation", elevation)`,
add:

```ts
    // The notification list scrolls: a viewport shorter than one row clips
    // every notification it holds.
    ...atLeast(
      "dimensions",
      "notificationListMaxHeight",
      dimensions.notificationListMaxHeight,
      density.rowHeight,
    ),
    // The inbox clips its contents, so its maximum height must contain the
    // list it wraps rather than cutting rows off.
    ...atLeast(
      "dimensions",
      "notificationPanelMaxHeight",
      dimensions.notificationPanelMaxHeight,
      dimensions.notificationListMaxHeight,
    ),
```

No `finiteMembers` or `positive` call is added: `finiteGroup("dimensions",
dimensions)` and `scaleSteps(dimensions).flatMap(positive)` already walk every
member (plans 531 and 554).

### 3.3 `packages/tokens/src/notification-panel-metrics.test.ts` (new)

Header comment states the bug: the notification centre paints a 320×380 panel
around a 280px scrolling list and a 6px unread dot as literals, so no theme can
own them and no check reports a panel shorter than its list.

Cases:

1. **The shipped values and every shipped set.** Assert
   `dimensions.notificationPanelWidth === 320`,
   `notificationPanelMaxHeight === 380`, `notificationListMaxHeight === 280`,
   `notificationUnreadDotSize === 6`, and that every `shippedThemes` entry has
   `themeMetricFailures(theme) === []`. This is the "no value moves" case.
2. **A panel shorter than its list is reported.** Build
   `extendTheme(lightTheme, { dimensions: { notificationPanelMaxHeight: 240 } })`
   and assert `themeMetricFailures(plant)` equals exactly one failure:
   `{ group: "dimensions", member: "notificationPanelMaxHeight", rule:
   "at-least", actual: 240, bound: lightTheme.dimensions.notificationListMaxHeight }`.
   Before the fix this returns `[]` (the field does not exist and the check does
   not run).
3. **A viewport shorter than a row is reported.** Build
   `extendTheme(lightTheme, { dimensions: { notificationListMaxHeight: 20 } })`
   and assert one failure:
   `{ group: "dimensions", member: "notificationListMaxHeight", rule:
   "at-least", actual: 20, bound: lightTheme.density.rowHeight }`.
4. **One non-finite value keeps one diagnostic.** Set both
   `notificationListMaxHeight: Infinity` and `notificationPanelMaxHeight: 100`
   and assert the result is the single `finite` failure for
   `notificationListMaxHeight` (no panel failure blaming the list).
5. **A zero width or dot is reported by the existing sign walk.**
   `notificationPanelWidth: 0` and `notificationUnreadDotSize: 0` each return
   their own `positive` failure.

### 3.4 `packages/tokens/src/dimensions.example.ts`

Add the inbox to the executed copy-and-own example so the new merge surface is
type-checked and asserted, not sketched:

```ts
export const narrowDrawerTheme = extendTheme(lightTheme, {
  dimensions: {
    drawerWidthMd: 360,
    dialogWidthMd: 520,
    chatViewportMinHeight: 200,
    notificationPanelWidth: 360,
    notificationListMaxHeight: 320,
  },
});
```

Update the file's header comment and the theme's doc sentence to name the inbox.
`dimensions.test.ts` must assert `narrowDrawerTheme.dimensions` carries the two
new values (the existing assertion style) so `examples.test.ts` proves the
override is live. Do not set `notificationPanelMaxHeight` below 320 — the
shipped panel maximum (380) contains it.

### 3.5 `docs/tokens.md` — the dimension table

The catalogue guard iterates `Object.entries(dimensions)`, so each field needs a
row. Add after the `avatarPresenceDotSize` row:

```md
| `dimensions.notificationPanelWidth` | 320 | anchored notification inbox width |
| `dimensions.notificationPanelMaxHeight` | 380 | inbox maximum height; at least the list maximum |
| `dimensions.notificationListMaxHeight` | 280 | notification list scroll height; held to one `density.rowHeight` |
| `dimensions.notificationUnreadDotSize` | 6 | unread marker on a notification row |
```

Add one sentence to the paragraph below the table:

> A notification inbox clips its contents, so its panel maximum contains its
> list maximum, and the list is held to one `density.rowHeight` like every other
> scroll viewport; the unread marker is a mark a brand can size.

### 3.6 `docs/design-system.md` — §6's dimensions paragraph

Append to the dimensions paragraph, after the avatar presence sentence:

> A notification inbox is 320px wide and 380px tall at most, its scrolling list
> holds 280px, and its unread marker is 6px — the panel contains the list, and
> the list holds one row.

`docs.test.ts` holds the §6 sentences verbatim (cases around line 2509–2524).
Add a fourth case for the inbox sentence, built from
`dimensions.notificationPanelWidth`, `notificationPanelMaxHeight`,
`notificationListMaxHeight` and `notificationUnreadDotSize`, so a value edit
must take the page with it.

### 3.7 `packages/tokens/README.md`

Extend the "Component dimensions include …" sentence with "the notification
inbox's panel, list and unread mark". `readme.test.ts` holds the paragraph, so
update its expectation too if it quotes the sentence.

### 3.8 `COMPONENTS.md`

In the Design tokens row, extend the dimension list with "the notification
inbox's panel/list/unread mark". No status change.

### 3.9 `TODO.md`

Add a ticked row at the end of the tokens bullets:

```md
`[x]` Ship the notification inbox's fixed surface metrics — the panel is
320×380, its list scrolls at 280 and its unread marker is 6px, all literals in
`notification-centre.tsx`, so a brand could not own the inbox and
`themeMetricFailures` returned `[]` for a panel shorter than its list (plan 598)
```

Add one cross-team row:

```md
`[ ]` Cross-team: `components` reads `theme.dimensions.notificationPanelWidth`,
`notificationPanelMaxHeight`, `notificationListMaxHeight` and
`notificationUnreadDotSize` for `notification-centre.tsx`'s `panelStyle`, list
`maxHeight` and unread dot (owner: `components`; plan 598)
```

Advance the section progress bar from 246/320 to 247/321 (one done, one new
pending).

### 3.10 `.agents/slop/plans/README.md`

Add the row:

```md
| [598](./598-notification-panel-dimensions.md) | The notification inbox's fixed surface metrics | F | 353, 358, 365, 384, 530, 556, 568 | done |
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

Expected: the tokens suite grows by one file; every other test count is
unchanged except `dimensions.test.ts` if it asserts the example's fields. All
gates exit 0.

Two-direction proof (the repo's `scripts/verify-two-directions.sh` is a
cross-team item; do it by hand until it is fixed):

1. Remove the two `atLeast` blocks from `metrics.ts` and run
   `notification-panel-metrics.test.ts`: cases 2 and 3 must fail.
2. Restore the blocks; the file passes.

## 5. STOP conditions

Stop and report, do not improvise, if any of these is true:

- `notification-centre.tsx` no longer paints 320/380/280/6 (the component tree
  moved); re-read the literals and re-plan the metric names.
- a shipped theme already fails `themeMetricFailures` after the change;
- the tokens suite fails for a reason unrelated to the new cases;
- a document guard fails on a sentence not listed above.

## 6. Acceptance

- `theme.dimensions` carries the four inbox metrics with the shipped literals.
- `themeMetricFailures` reports a panel below its list and a list below one row.
- The executed dimensions example moves the inbox metrics and every shipped set
  still passes all nine checks.
- `docs/tokens.md`, `docs/design-system.md`, the README and `COMPONENTS.md` name
  the new metrics, and their guards derive the values from the implementation.
- `TODO.md` ticks the token row and records the `components` handoff.
- `nub run check`, `nub run lint` and `nub run test` pass.
