# 381 — Tier 5 feasibility: a notification centre

**Status:** planned 2026-10-18 · **Phase:** D/E · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `152`, `156`, `158`, `166`, `183`,
`187`, `190`, `197`, `198`, `300`, `330`, `344`, `350`, `377`.

> Numbering: `379` is the components workstream's inline-edit plan, `380` is
> claimed by components/tokens, and `381` is the next free number.

## 1. Why this plan exists

The Tier 5 row **Notification centre** is still `GPUix support: ?` with no
runtime evidence: "Composition over toasts + panels." Every ingredient is
measured separately — a non-modal anchored overlay (`155`, `187`), a toast
viewport (`183`), a virtual list with variable rows (`166`, `198`), roving
native focus (`158`), focus return (`155`), derived badges (`344`), dismissal
by an outside press (`164`) — but no probe has composed **bell → panel →
newest-first list → live arrivals**.

The open questions are the centre's own:

1. Does a non-modal panel anchored to a **sibling** trigger stay open while its
   own controls and rows are clicked, and dismiss on a press outside?
2. Can a `<virtual-list>` live inside that panel with **mixed row heights**
   (group headers and notification rows), and can `getListScrollTop` name the
   reader's row from inside `onVisibleRange`?
3. **The central question:** when a new notification is prepended while the
   reader is scrolled down, does the runtime hold the content under the reader?
   If not, can component code re-anchor to the row the reader was on — and is
   that exact?
4. Is the unread count derivable from read flags, does it survive close/reopen,
   and does the badge disappear at zero without leaving a painted dot?
5. Does keyboard entry land in the panel, do arrows move an active row, does
   Enter mark it read, and does Escape return focus to the bell?

This plan changes **no package code**.

## 2. What will be proven

Capability: `notification` (new). Scenario: `notification-centre`; live twin:
`live-notification-centre`.

View: a 760 × 460 app frame. A 52 px top bar holds a title, a spacer and a
36 × 36 bell at the right edge. The body is mock content with a `simulate`
control and a state readout. The panel is 320 × 360, anchored
`side="bottom" align="end" gap={8}` to the bell's wrapper.

Rows are flattened from groups (`Today`, `Earlier`): a 24 px header row and a
60 px notification row. Six notifications to start: ids `6..1`, three per group;
unread ids `6`, `4`, `2` (three).

| Area | Check |
| ---- | ----- |
| bell | 36 × 36; a badge paints `3`; the AccessKit label is `Notifications, 3 unread`; the panel does not paint while closed |
| open | a click mounts a 320 × 360 panel; its right edge equals the bell's within 1 px and its top is the bell's bottom + 8; `autoFocus` puts native focus on the panel |
| geometry | the panel's list viewport is 280 px; a 24 px `Today` header sits at the top; row 6 starts at +24 and is 60 px tall |
| groups | `Today` and `Earlier` headers paint; rows are newest-first within a group |
| unread | unread rows paint a dot (`nc-dot-6`), read rows do not (`nc-dot-5` absent); the row's AccessKit label names read state |
| keyboard | Down moves `active` `n:6 → n:5`; Enter marks `n:5` read and the badge follows; Escape closes and returns focus to `nc-bell` |
| pointer | clicking a row marks it read once and does not close the panel |
| persistence | close and reopen: read flags and the unread count are unchanged; opening does **not** mark anything read |
| mark all | `nc-mark-all` clears every dot, the badge is unpainted, and the label reads `Notifications, 0 unread` |
| arrival (closed) | `nc-arrive` adds one unread row while the panel is closed; the badge reads 4; opening paints the new row at the top of Today |
| arrival (open, at top) | `nc-simulate` inside the panel prepends a row at the top without dismissing the panel; the new row sits under the Today header |
| **arrival (open, scrolled)** | `scrollToItem(nc-list, 2, 0)` puts `n:7` at the viewport top; `nc-simulate` prepends one row; the **list itself** re-anchors to the same row — anchor `3`, `nc-row-7` still at the viewport top (`±1`) and the new row above it unpainted. Component code does nothing on an arrival; forcing the old index moves the row by one notification height |
| clear | `nc-clear` empties the list, unpaints the badge and paints `nc-empty`; a later arrival restores the list and hides the empty state |
| outside | a press on the body closes the panel; the state survives |
| a11y | `Region:Notifications`, `Button:Notifications, N unread` and one `Button` per row |

The probe does **not** re-measure anchored placement at every edge, toast
timers, virtual-list windowing, file drops or the theme matrix. It composes
measured primitives and records the notification centre's own rules.

## 3. Files

Create:

- `apps/playground/src/scenarios/notification-centre.tsx` — the view and the
  `notification-centre` scenario.
- `apps/playground/src/scenarios/notification-model.ts` — the pure rules:
  grouping, flattening, unread count, re-anchor target.
- `apps/playground/src/scenarios/notification-model.test.ts` — the pure tests.

Change:

- `apps/playground/src/scenarios/index.ts` — import/register the scenario and
  add `"notification"` to `PROBE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"notification"` to `CAPABILITIES`.
- `apps/playground/src/live/scenarios.tsx` — import the view, add
  `live-notification-centre` and append it to `liveScenarios`.
- `apps/playground/README.md` — a `## Notification centres (plan 381)` section,
  the new files under `Structure`, and the refreshed suite counts.
- `COMPONENTS.md` — the `notification` capability row and the measured evidence
  on **Notification centre** (status stays `todo`).
- `TODO.md` — tick the new playground task with the measured counts.
- `PLAN.md` — a decision row (`D56`).
- `.agents/slop/plans/README.md` — add the `381` row.

Do **not** change any package, `apps/docs`, the shell, `SplitPane` or the smoke
runner.

## 4. The model (`notification-model.ts`)

Pure, Effect-native (`Arr`, `Option`, `Order`, `Str`), no React:

```ts
export interface Notification {
  readonly id: number;          // newest is highest
  readonly title: string;
  readonly body: string;
  readonly age: string;         // "2m", "1h", "Yesterday"
  readonly group: "today" | "earlier";
  readonly read: boolean;
}

/** A row in the flattened list: a group header or one notification. */
export type Row =
  | { readonly key: string; readonly kind: "header"; readonly label: string }
  | { readonly key: string; readonly kind: "notification"; readonly item: Notification };
```

Exports:

- `initialNotifications: ReadonlyArray<Notification>` — six items, unread `6`,
  `4`, `2`.
- `newNotification(id)` — an unread `today` item titled `New notification <id>`.
- `unreadCount(items)` — `Arr.filter(...).length`.
- `rowsOf(items)` — `Today` header + today's items (descending id), then
  `Earlier` + the earlier ones; a group with no items contributes no header.

There is deliberately **no re-anchor rule**: §9 measured that the
`<virtual-list>` keeps the reader's row across a prepend. A pure helper that
computed a compensating index would be dead code at best and a second source of
truth at worst.

## 5. The view (`notification-centre.tsx`)

Constants: `FRAME_WIDTH = 760`, `FRAME_HEIGHT = 460`, `BAR_HEIGHT = 52`,
`BELL_SIZE = 36`, `PANEL_WIDTH = 320`, `PANEL_HEIGHT = 360`,
`PANEL_HEADER = 44`, `LIST_HEIGHT = 280`, `PANEL_FOOTER = 36`,
`HEADER_ROW = 24`, `NOTIFICATION_ROW = 60`.

State: `open`, `items`, `active: Option<number>` (notification id), `anchor`,
`top`, `inserts`, `arrivals`.

Refs: `bell` (`PublicInstance`), `list` (`PublicInstance`), `rowsRef` (current
flat rows), `nextId` (a number ref, so an arrival needs no extra state).

Rules:

- `toggle()` flips `open`; opening sets `active` to the first notification and
  leaves read flags alone.
- `close(reason)` sets `open = false`, clears `active`, and returns native focus
  to the bell via `renderer.focusElement(bell.current.id)` for `toggle` and
  `escape` — **not** for `outside`, because an outside press has already focused
  what the user pressed.
- `markRead(id)` maps that item to `read: true` (idempotent).
- `markAll()` maps every item to `read: true`.
- `clearAll()` empties `items`, sets `anchor = 0`, `top = "none"`.
- `arrive()` prepends `newNotification(nextId.current)` and increments `nextId`
  and `inserts`. **Nothing else** (§9 measured that the list keeps the reader's
  row by itself; a compensating scroll is the bug, not the fix).
- `syncAnchor()` (the list's `onVisibleRange` handler) reads
  `renderer.getListScrollTop(list.id)`, sets `anchor`, and sets `top` to the
  key of `rowsRef.current[anchor]`; never read the payload.
- `onKeyDown` on the panel: `arrowdown`/`arrowup` move `active` through the
  notification ids in order and clamp; `enter` marks the active id read;
  `escape` closes with focus return.

Layout:

1. **Top bar** (`nc-bar`, 52 px): `Notifications demo`; a `nc-bellwrap`
   (36 × 36, `position: "relative"`) holding:
   - `nc-bell` (36 × 36, `tabIndex=0`, `role="button"`,
     `aria-label={`Notifications, ${unread} unread`}`, ref, `onClick=toggle`,
     `onKeyDown` Enter/Space) containing a bell glyph (`✱` or a text mark) and,
     when `unread > 0`, a `nc-badge` with a small `text` of the count;
   - when `open`, `<anchored side="bottom" align="end" gap={8}>` with
     `nc-panel`.
   The panel is a **sibling** of the bell inside the wrapper, so a click in the
   panel cannot bubble to the bell's toggle.
2. **Panel** (`nc-panel`): 320 × 360, `tabIndex=0`, `autoFocus`,
   `role="region"`, `aria-label="Notifications"`, card background, border and
   radius, `onMouseDownOutside={() => close("outside")}`, `onKeyDown`.
   - header (44 px): `Notifications`; `nc-mark-all` (`mark all read`);
     `nc-clear` (`clear`); `nc-close` (`esc`).
   - list viewport (`nc-listview`, 320 × 280) containing
     `<virtual-list testId="nc-list" ref={list} estimatedItemHeight={48}
     onVisibleRange={syncAnchor}>` with the flattened rows:
     - header row `nc-head-<today|earlier>` 24 px, group label text;
     - notification row `nc-row-<id>` 60 px, `role="button"`,
       `aria-label={`${title}, ${read ? "read" : "unread"}`}`,
       `onClick={() => { setActive(id); markRead(id); }}`; it paints the title,
       the body, the age and — while unread — a 6 × 6 accent dot
       `nc-dot-<id>`; the active row paints `colors.accent` and keeps its dot.
   - footer (36 px): `nc-simulate` (`simulate arrival`) — the arrival control
     **inside** the panel, so a click there proves an inside press neither
     dismisses nor bubbles to the bell.
3. **Body** (`nc-body`, `nc-content`): a mock content block, `nc-arrive`
   (`simulate arrival` while closed), and `nc-state`:
   `open=<bool> unread=<n> items=<n> anchor=<n> top=<key|none>
   active=<n:<id>|none> inserts=<n>`.

Empty state: when `items` is empty the list is replaced by `nc-empty`
(`You're all caught up`); the badge and `nc-badge` do not paint.

Limits to record if measured: no persistence across a remount (state is
app-owned), no toast bridge, no virtualized group headers beyond the flat
24 px row, and the panel is not modal (no focus trap).

## 6. Steps for the executor

1. Read this plan, then `data-toolbar.tsx` (derived state and anchor read),
   `variable-rows.tsx` (mixed heights), `message-scroller.tsx` (the
   post-commit `scrollToItem` effect), `layers.tsx` (the raw `<anchored>` and
   the outside press), `preview.tsx` (a floating panel inside a wrapper) and
   `probes.ts`.
2. Write `notification-model.ts` and its test. Run:

   ```sh
   nub run --filter playground test
   ```

   Expected: exit `0`; the new model tests pass.
3. Write `notification-centre.tsx`; register it and add the capability literal.
   Run:

   ```sh
   nub run --filter playground check-types
   nub run --filter playground test
   ```

   Expected: both exit `0`; `scenarioProblems` reports nothing.
4. Build and run only the new scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only notification-centre
   ```

   Expected: `1/1 scenarios passed`, exit `0`, `notification=verified`. A miss
   reports the readout, the anchor or the bounds — fix the rule, never widen a
   tolerance past 2 px.
5. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `85/85 scenarios passed`, exit `0`; record the check total.
6. Add `live-notification-centre` (`view: notificationCentreScenario.view`,
   `ready: "nc-state"`) with `settle` after every input and `waitForText` after
   state changes; the live twin must not assert colour or the a11y dump (plan
   `197`). Run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected: `36/36 scenarios passed`, exit `0`, one screenshot; record the
   check total.
7. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0` (run `nub run fmt:fix` if the formatter complains).
8. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md`, `PLAN.md`
   and the plan index with the measured counts and any surprise. Commit the
   plan first, then the probe.

## 7. Test plan

### 7.1 The model (`notification-model.test.ts`)

| # | Test | Must catch |
| - | ---- | ---------- |
| 1 | six initial items, three unread | a wrong seed or a stored count |
| 2 | `rowsOf` puts the Today header first, newest first, then Earlier | a reversed or headerless flatten |
| 3 | a group with no items contributes no header | an empty header row |
| 4 | `unreadCount` follows a read mutation | a count that is not derived |
| 5 | an arrival lands under Today, above the older items | an arrival appended at the bottom |

Run the count test with a deliberate mutation (store the count on the seed) and
record the exact failure.

### 7.2 The scenario

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | the badge renders the item count, not the unread count | "the badge counts unread" |
| M2 | opening marks every item read | "opening does not mark read" |
| M3 | `markRead` toggles instead of setting read | "a second click keeps it read" |
| M4 | the component forces the **pre-insert** index after a prepend | "the prepend keeps the reader's row" (anchor 2) and "the reader's row did not move" (+60) |
| M5 | the component forces anchor `0` after a prepend | the same two checks |
| M6 | remove `onMouseDownOutside` | "an outside press dismisses" |
| M7 | Escape does not return focus | "Escape returns focus to the bell" |
| M8 | `markAll` is a no-op | "mark all clears the count" |
| M9 | the readout names the first row instead of the reader's row | "the readout names the reader's row" |
| M10 | `clearAll` leaves the rows | "clear empties the model" |

Reverse proof (consumer wiring): the row `onClick` stops calling `markRead` →
"a row click marks it read" fails.

Run each mutation with `--only notification-centre`, record the exact failure,
revert.

### 7.3 Two-direction checks by hand

- Full headless `85/85`, live `36/36`, both exit `0`.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.

## 8. STOP conditions

- ~~**The runtime already preserves the scrolled content on a prepend.** Record
  it.~~ **It does.** The list re-anchors from index 2 to 3 by itself and the
  reader's row stays at the viewport top (`±1`). Recording this removed the
  component's compensation entirely (§9) — a compensating `scrollToItem` is the
  defect, not the fix.
- ~~**The runtime resets the anchor to 0 on a prepend.**~~ Not observed; the
  anchor moved by exactly the inserted row count.
- **A press inside the panel bubbles to the bell and closes it.** The headless
  `click` verb does not run an ancestor's `onClick` for a press on a descendant
  (measured: moving the bell's toggle to its wrapper made `nc-bell`'s click
  inert). The panel stays a sibling of the bell as the honest structure; no
  close-on-inside-click claim is made.
- **A `FloatingLayer` cannot be placed beside the bell without changing the
  bar's layout.** The raw `<anchored>` inside the 36 × 36 wrapper was used; the
  panel's right edge and top are exact.
- **Focus does not enter the panel with `autoFocus`.** It does, in the headless
  host and the live window.
- **A row inside the virtual list cannot be addressed after a prepend** (the
  key is not painted). Assert the anchor and the readout instead, and record
  the paint.
- **A check needs a tolerance above 2 px** or a screenshot. Stop; that is a
  mechanism question.
- **A file outside §3 must change.** Stop and write the task in `TODO.md`.
- The suites are not `85/85` headless and `36/36` live, exit `0`. Stop and
  report the failing scenario.

## 9. Measured results

Run on this host, 2026-10-18, against the locally built `darwin-x64` 0.10.0
binding (ADR 0003).

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `notification-centre` (headless) | 80 | pass — suite `84 → 85`, `2644 → 2724`, exit `0`, `notification=verified` |
| `live-notification-centre` | 27 | pass — live `35 → 36`, `651 → 678`, exit `0`, one screenshot |

### 9.1 The central fact: a prepend is already stable

**`<virtual-list>` keeps the reader's row across a prepend.** With a mixed-height
list (24 px group headers, 60 px notifications) scrolled to index `2`, adding a
row above it moves the anchor to `3` and leaves the reader's row at the viewport
top. The component does nothing on an arrival.

That was not the planned design: the plan carried an identity re-anchor effect
(`renderer.scrollToItem` to the row's new index). The mutation that removed it
**did not fail the suite**, which is how the runtime behaviour was found. A
further mutation that forced the **pre-insert** index reproduced the bug the
effect was meant to prevent: anchor `2`, and the reader's row moved from `96.5`
to `156.5` — exactly one notification height. So the effect was a second, wrong
source of truth and was deleted, together with the pure `reanchorTarget` /
`rowIndex` helpers and their four tests.

The honest rule for a consumer: **do not compensate a prepend yourself.**
Re-reading the anchor is still required (the `onVisibleRange` payload lags and
the anchor index is what the app shows), but the paint is the runtime's.

### 9.2 The measured contract

| Fact | Value |
| ---- | ----- |
| bell | 36 × 36; badge `3`; `Button:Notifications, 3 unread`; no panel while closed |
| panel | 320 × 360 anchored `side=bottom align=end gap=8` to the bell wrapper; right edge and top within 1 px; `autoFocus` puts focus on it in both hosts |
| list | 280 px viewport; 24 px `Today`/`Earlier` headers; 60 px rows; `Region:Notifications`; each row is a `Button` named `<title>, <read|unread>` |
| unread | derived from the read flags; a row click is idempotent; opening marks nothing read; close/reopen keeps every flag |
| badge | disappears at zero (no painted bounds); the bell label follows (`Notifications, 0 unread`) |
| keyboard | Down/Up move the active row, Enter marks it read, Escape closes and returns focus to `nc-bell` |
| arrival | closed → badge increments and the row is first on reopen; open at anchor 0 → first under `Today`; open at anchor 2 → anchor 3 with the reader's row unmoved |
| outside | a press on the body closes; focus is not stolen back; the state survives |
| empty | clear-all paints `nc-empty`, removes the list and the badge; a later arrival restores the list |

### 9.3 Mutation proofs

Each was applied, built, run with `--only notification-centre`, and reverted:

| # | Mutation | Measured failure |
| - | -------- | ---------------- |
| M1 | badge counts `items` | `the badge counts unread: expected "3", got "6"` |
| M2 | `openPanel` marks everything read | `opening does not mark read: expected "3", got "0"` |
| M3 | `markRead` toggles | `a second click keeps it read: expected "1", got "2"` |
| M4 | force the pre-insert index after a prepend | `the prepend keeps the reader's row: expected 3, got 2`; with that expectation corrected, `the reader's row did not move: expected 96.5 ± 1, got 156.5` |
| M5 | force anchor `0` after a prepend | the same two checks |
| M6 | remove `onMouseDownOutside` | `an outside press dismisses: expected "false", got "true"` |
| M7 | Escape skips the focus return | `Escape returns focus to the bell: expected "nc-bell", got "none"` |
| M8 | `markAll` is a no-op | `mark all clears the count: expected "0", got "1"` |
| M9 | the readout names `rows[0]` | `the readout names the reader's row: expected "n:7", got "h:today"` |
| M10 | `clearAll` keeps the rows | `clear empties the model: expected "0", got "10"` |

Reverse proof (consumer wiring): the row `onClick` stops calling `markRead` →
`a row click marks it read: expected "1", got "2"`.

One harness finding: moving the bell's toggle to its wrapper made `nc-bell`'s
click **inert** (`the click opens the panel: expected "true", got "false"`), so
the headless `click(testId)` verb does not run an ancestor's `onClick` for a
press on a descendant. The panel stays a sibling of the bell (honest structure);
the claim is not made that the headless suite can prove the close-on-inside-click
trap.

### 9.4 Limits recorded

- State is app-owned: a remount resets reads and arrivals (workspace restore is
  `167`/`339`). The panel is non-modal: no focus trap, and Tab can leave it.
- No toast bridge: a toast is transient and the centre is durable; composing the
  two would repeat `tier2-toast` (`330`) without a new question.
- The panel fits its 760 × 460 frame; edge flipping is `floating-placement`
  (`156`/`323`), not re-measured.
- Group headers are flat 24 px rows; nested grouping is the components
  workstream's design.
- There is no per-notification action menu or bulk selection; the probe is a
  feasibility contract, not a shipped component.

## 10. Acceptance

- `notification-centre.tsx`, `notification-model.ts`, its test, the registry
  entry, the capability literal, the live twin, the README section, the
  inventory row and the plan-index row.
- Headless `85/85`, live `36/36`, exit `0`; all three gates exit `0`.
- The ten mutation proofs and one reverse proof recorded in §9.3.
- No package changed; any defect is a `TODO.md` task with its own plan number.
