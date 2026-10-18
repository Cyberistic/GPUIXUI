# 568 — Notification centre: bell, derived unread badge, grouped rows

| Field | Value |
| ----- | ----- |
| Phase | E (specialised component) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `111`, `112`, `114`, `117`, `200`, `201`, `391`, `516`, `522`, playground `381` (measured contract) |
| Status | done — 12 native + 5 pure tests, four mutation proofs; docs, example, `COMPONENTS.md` and the inventory synced |
| Blocker | none |

This plan is self-contained. A weaker executor must be able to run it without
reading any other file first.

---

## 1. Why

The swarm's TODO carries an unowned row:

> **packages/components** (no owner yet): implement a notification centre from
> the contract plan `381` measured — a bell with a derived unread badge and an
> accessible label, a non-modal `align="end"` panel, grouped newest-first rows
> in a virtual list, roving keyboard selection, idempotent reads, an outside
> press and Escape (focus return on Escape only), and an empty state.

The playground workstream measured every runtime fact this component needs
(plan `381` §9): a 36 × 36 trigger with a derived badge, a non-modal anchored
panel at `side="bottom" align="end" gap={8}`, mixed-height grouped rows, outside
dismissal, Escape focus return, and a prepend that the reader should not feel.
The component itself was deliberately left out of that probe: "the probe is a
feasibility contract, not a shipped component."

This plan ships the component in `packages/components`, with its own pure model,
native behaviour suite, example, docs page and inventory row.

**Scope of v1.** The panel renders every row in a plain scroll viewport. The
measured `<virtual-list>` contract is recorded as a limitation, not faked: the
published host takes `itemCount` and the app must window its own children
(`@gpuix/react@0.10.0`'s `components/index.js`: "There is no `VirtualList` React
wrapper. Windowing on the React side is the app's job"). The centre is a
bounded panel, so all rows are real DOM nodes; a future plan can add windowing
without changing this API.

## 2. What exists today

- `src/preview-card.tsx` — the exact overlay shape: `floatingRootStyle()` on the
  root, `usePlacement`, `FloatingLayer`, `pushDismissLayer`/`dismissTopLayer`,
  Escape restores the trigger, an outside press does not.
- `src/internal/button.tsx` — `Button` (variant `ghost`, size `sm`), `IconButton`.
- `src/internal/theme.ts` — `useTheme`, `textStyle`, `focusRing`,
  `elevationShadow`, `controlHeight`.
- `src/internal/parts.ts` — `assertParts`, `PartChildren`, `PartComponent`,
  `PartsContract`.
- `src/internal/controllable.ts` — `useControllableState`.
- `src/internal/state-description.ts` — `Disabled` description for a disabled
  control (plan 516).
- `src/internal/key.ts` — `isUp`, `isDown`, `isEnter`, `isDismiss`.
- `src/empty-state.tsx` — `EmptyState` (title + description, no surface).
- `src/badge.tsx` — `Badge`; the unread badge can reuse `Badge size="sm"
  variant="primary"`.
- `src/internal/test-root.tsx`, `src/internal/interaction.ts` — native harness.
- `examples/index.ts` and `src/inventory.test.ts` — every example is registered,
  every record has a docs page, a test and a `COMPONENTS.md` row.

No `packages/icons` bell exists (`ICON_NAMES` has no `bell`). Do **not** edit
`packages/icons` (outside this workstream): the trigger's default content is a
text label plus the count badge; a caller may pass `children` for a custom glyph
when the icon set gains one. Record the icon request in `TODO.md`.

## 3. Public API

Add `./notification-centre` to `package.json` `exports`.

```tsx
<NotificationCentre
  notifications={items}                 // controlled data, newest first
  onRead={(id) => ...}                  // idempotent in the consumer
  onMarkAllRead={() => ...}             // omit to hide the control
  onClear={() => ...}                   // omit to hide the control
  open? defaultOpen? onOpenChange?
  label="Notifications"                 // trigger + panel default name
>
  <NotificationCentreTrigger />
  <NotificationCentreContent>
    <NotificationCentreHeader>
      <NotificationCentreTitle>Notifications</NotificationCentreTitle>
      <NotificationCentreMarkAll>Mark all read</NotificationCentreMarkAll>
      <NotificationCentreClear>Clear</NotificationCentreClear>
    </NotificationCentreHeader>
    <NotificationCentreList emptyTitle="You're all caught up" />
  </NotificationCentreContent>
</NotificationCentre>
```

Parts and props:

| Part | Props / behaviour |
| ---- | ----------------- |
| `NotificationCentre` | `notifications`, `onRead?`, `onMarkAllRead?`, `onClear?`, `open?`, `defaultOpen?`, `onOpenChange?`, `label?`; owns open state and the flattened rows |
| `NotificationCentreTrigger` | a `Button` (`aria-expanded`, `aria-label="{label}, {n} unread"`), the visible label and an unread `Badge`; `children?` replaces the visible label only |
| `NotificationCentreContent` | floating panel (`side="bottom"`, `align="end"`, `sideOffset=8`), `role="region"`, `aria-label`, `tabIndex=0`, `autoFocus`; one dismiss layer |
| `NotificationCentreHeader` | row layout for the title and the two actions |
| `NotificationCentreTitle` | the panel title text (defaults to the root label) |
| `NotificationCentreMarkAll` | `Button variant="ghost" size="sm"`; renders only when `onMarkAllRead` exists |
| `NotificationCentreClear` | same, bound to `onClear`; renders only when it exists |
| `NotificationCentreList` | flattened group headers + rows, plain scroll viewport, `EmptyState` when there are no rows |

Data:

```ts
export interface NotificationItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly timestamp?: string;
  /** A contiguous run is one group; order is the caller's. */
  readonly group?: string;
  /** Absent means unread. */
  readonly read?: boolean;
}
```

`NotificationRow` (internal): `{ kind: "header"; key; label }` or
`{ kind: "item"; key; item }`. `flattenRows` emits one header per **contiguous**
run of the same `group` (Combobox's rule), and no header for `group: undefined`.

Rules:

- `unreadCount = notifications.filter(n => n.read !== true).length` — derived,
  never stored.
- Clicking a row, or `Enter` on the active row, calls `onRead(id)` exactly once
  and **does not close** the panel.
- Opening never calls `onRead`; read flags survive close/reopen because the
  caller owns them.
- `Mark all read` calls `onMarkAllRead()` once; `Clear` calls `onClear()` once.
- `Escape` closes and returns native focus to the trigger. An outside press
  closes and does **not** take focus back (the press already focused its target).
- `ArrowUp`/`ArrowDown` move the active item over item rows only (headers are
  skipped, ends clamp), painting the accent fill and calling
  `renderer.focusElement` for native focus. `Enter` reads the active item.
- Non-modal: no focus trap; `Tab` leaves the panel.
- Empty data: `NotificationCentreList` paints `EmptyState` with `emptyTitle`;
  the trigger paints no badge and its label reads `{label}, 0 unread`.
- Rows are 60-ish via padding (theme metrics), headers 24-ish; the list viewport
  is `maxHeight: 280` with `overflowY: "scroll"`.
- Row accessible name: `"{title}, unread"` / `"{title}, read"` (0.10.0 reports
  no name from a text child). The unread dot is decorative.

## 4. Files to create or change

Create:

| File | Content |
| ---- | ------- |
| `packages/components/src/notification-centre/model.ts` | `NotificationItem`, `NotificationRow`, `unreadCount`, `flattenRows`, `readItem`, `readAll` (pure, `Arr`/`Option`/`Match`) |
| `packages/components/src/notification-centre/model.test.ts` | the five model cases in §6.1 |
| `packages/components/src/notification-centre.tsx` | the eight parts, `notificationCentreMeta` |
| `packages/components/src/behaviour/notification-centre.test.tsx` | the native cases in §6.2 |
| `packages/components/examples/notification-centre.example.tsx` | a working inbox demo with local read state and an arrival control |
| `packages/components/docs/notification-centre.mdx` | description, anatomy, groups, read model, keyboard, limitations, API, verification line |

Change:

| File | Change |
| ---- | ------ |
| `packages/components/package.json` | add `"./notification-centre": "./src/notification-centre.tsx"` |
| `packages/components/src/index.ts` | re-export the module (follow the existing `export * from` pattern) |
| `packages/components/examples/index.ts` | import + register `notification-centre` |
| `packages/components/src/inventory.ts` | add `notificationCentreMeta` |
| `packages/components/src/behaviour/theme-coverage.ts` | add the suite **or** prove both themes in-suite (prefer in-suite: render one case with `lightTheme`) |
| `docs/component-api.md` (repo root) | add the Tier 5 / specialised row to §8 |
| `COMPONENTS.md` | replace the Tier 5 `Notification centre` `todo` row with `done` + support + notes + `N native behaviour tests` |
| `TODO.md` | tick the new Tier 5 task, record the plan and the bell-icon interlock |
| `.agents/slop/plans/README.md` | index this plan |
| `PLAN.md` | decision row `D31`: the notification centre owns its data contract and is not virtualized in v1 |

## 5. Steps for the executor

1. Read §3 and the files in §2. Run the current unit suite once:

   ```sh
   nub run --filter @gpuixui/components test
   ```

   Expected: `Test Files … passed`, exit `0` (currently 421 tests).

2. Write `model.ts` + `model.test.ts`. Run:

   ```sh
   nub run --filter @gpuixui/components test
   ```

   Expected: exit `0`; the new model cases pass.

3. Write `notification-centre.tsx`. Run:

   ```sh
   nub run --filter @gpuixui/components check-types
   ```

   Expected: exit `0`. No `any`, no casts, no `console.*`.

4. Write the behaviour suite. Run only it:

   ```sh
   nub run --filter @gpuixui/components test:behaviour -- src/behaviour/notification-centre.test.tsx
   ```

   Expected: all cases pass. If a focus assertion fails, first prove whether the
   same assertion works in `popover.test.tsx` on this binding; if that suite is
   red for the plan-540 binding defects, do not add a focus-id assertion — test
   the open/closed state and document the focus restore (see §7).

5. Register the example, add the inventory record, the docs page, the §8 row,
   the `COMPONENTS.md` row, `TODO.md`, `PLAN.md` and the plan index.

6. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`. The behaviour suite is not part of `test`; run it
   separately and record the pass count, noting the known plan-540 red suite
   total if any unrelated cases fail.

7. Commit in two commits: the plan, then the implementation.

## 6. Test plan

### 6.1 Pure model (`model.test.ts`)

| # | Test | Must catch |
| - | ---- | ---------- |
| 1 | `unreadCount` follows the read flags (3 of 6) | a stored count or counting total |
| 2 | `flattenRows` emits one header per contiguous group, then its items in caller order | repeated headers or re-sorting |
| 3 | a group with no items contributes no header | an empty header row |
| 4 | `readItem` sets read and is idempotent | a toggle |
| 5 | `readAll` marks every item and leaves the order | a filter that drops rows |

### 6.2 Native behaviour (`notification-centre.test.tsx`)

| # | Test | Must catch |
| - | ---- | ---------- |
| 1 | closed: badge text is `3`, trigger name is `Notifications, 3 unread`, no panel | badge = total / panel mounted closed |
| 2 | click opens; `aria-expanded` true; panel named `Notifications` | a panel that never mounts |
| 3 | opening calls `onRead` zero times | mark-all-on-open |
| 4 | group headers paint once, in order, with their items | reversed flatten |
| 5 | unread rows paint the dot, read rows do not | a dot driven by row count |
| 6 | a row click calls `onRead(id)` once and keeps the panel open; a rerender with `read: true` removes the dot | a closing/navigating row or a toggle |
| 7 | `Mark all read` calls `onMarkAllRead` once, keeps the panel open | a control that closes the panel |
| 8 | `Clear` calls `onClear` once; empty data paints the empty title and no badge | a dead control / stale badge |
| 9 | `Escape` closes (`onOpenChange(false)`, `aria-expanded` false) | a panel that ignores Escape |
| 10 | a press on the body closes the panel | a missing outside dismissal |
| 11 | `ArrowDown` moves the active row's accent fill from item 1 to item 2; `Enter` calls `onRead` for item 2 | arrows over headers / Enter on the old row |
| 12 | light theme: the badge, panel and a row paint the light theme's roles | a dark-only surface |

Run each of the following mutations, record the exact failure, and revert:

- M1 badge counts `notifications.length` → test 1 fails.
- M2 `open` calls `onMarkAllRead` → test 3 fails.
- M3 row click calls `readItem` locally instead of `onRead` → test 6's spy fails.
- M4 `flattenRows` sorts by id → test 4 fails.
- M5 the dot ignores `read` → test 5 fails.
- M6 Escape calls `setOpen(false)` but not `onOpenChange` → test 9 fails.
- M7 the list renders headers in the arrow order → test 11 fails.

Write the guarded-bug header comment in the suite: each test names the bug it
guards (per `AGENTS.md` §3).

## 7. Binding caveats (measured, plan 540)

The current locally rebuilt binding reports three box conventions and delivers
no `focus`/`blur` for a programmatic focus change. Therefore:

- assert **state, text, callbacks and painted style props**, not
  `getFocusedElementId`;
- do not assert absolute bounds;
- for Escape, assert the panel unmounted and `onOpenChange(false)`; the focus
  return is the same `dismissTopLayer` path as Popover (already covered there),
  and its limitation is recorded in docs.

If a new assertion fails on an unrelated component for the same reason, note the
red suite total and move on; do not weaken the assertion to pass.

## 8. STOP conditions

- A change is needed outside §4 (`packages/icons`, `packages/tokens`, the
  playground, the docs site). Stop and record it in `TODO.md` with an owner.
- The trigger cannot open the panel because the panel is not a sibling/anchored
  surface; stop and use the `PreviewCard` structure (measured working).
- A native case needs an absolute-bounds or focus-id assertion. Stop; it is a
  plan-540 binding defect, not a component defect.
- The behaviour suite fails for a reason other than the known binding defects.
  Stop and report the failing case, the renderer output and the exact command.
- `check-types`, `check` or `lint` fails. Fix it; do not proceed to docs.

## 9. Acceptance

- `notification-centre.tsx` exports the eight parts; the module is in
  `package.json` and `src/index.ts`.
- The pure model has five cases; the native suite has twelve cases and passes on
  this host.
- The example is registered and renders in the all-example native suite.
- The docs page has the canonical verification line, an `## API` section naming
  every part and a `## Limitations` section.
- `COMPONENTS.md`'s `Notification centre` row is `done`, names the real native
  test count and records: no virtualization (app-side windowing required), no
  bell icon yet (text trigger/default slot), no `aria-live` (0.10.0), and
  app-owned read/notification state.
- `nub run check`, `nub run lint` and `nub run test` exit `0`.
- `TODO.md`, `PLAN.md` and the plan index are current.

## 10. Results (2026-10-19, this host)

- `src/notification-centre/model.ts` + `model.test.ts`: 5 cases pass.
- `src/notification-centre.tsx`: 8 parts; explicit export in `package.json` and
  `src/index.ts`; the export/manifest checks pass.
- `src/behaviour/notification-centre.test.tsx`: 12 cases pass in the real
  renderer; the all-example suite mounts `examples/notification-centre.example.tsx`.
- Unit suite: 42 files, 426 tests, exit `0` (the inventory checks the docs
  verification line, the `COMPONENTS.md` row and the §8 parts page).
- Mutation proofs (each applied, run, reverted):
  - badge counts every notification → "keeps the panel closed and names the
    unread count" fails (label reads 5, not 3);
  - a row press stops calling `read` → "reads a row once on press and does not
    close" fails (`onRead` called 0 times);
  - the dot ignores `read` → three cases fail ("does not mark anything read on
    open", "marks unread rows, not read ones", "reads a row once...");
  - removing the dismiss layer → "closes on Escape" and "closes on an outside
    press" both fail (the panel stays open).
- Behaviour suite total after this change: 55 pre-existing plan-540 binding
  failures in 19 files; the new suite is green. `nub run check`, `nub run lint`
  and `nub run test` exit `0`.

### 10.1 Limits confirmed

- Every row renders; no windowing (see `PLAN.md` D31).
- The trigger is a text button plus the badge; the bell icon is a recorded
  cross-team request, not a copied mark.
- No focus-id assertion: the binding's focus signal is a known defect (plan
  540). Escape/dismissal are proven through the tree and `onOpenChange`.
