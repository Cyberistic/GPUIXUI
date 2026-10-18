# 331 — Caller handler composition on interactive parts

**Phase:** F · **Owner:** components workstream (`packages/components`) ·
**Depends on:** 110, 117, 200, 201, 300–330.

**Status when written:** the handler gaps below exist on `agent/components`.
This plan is the Phase F "consistency, keyboard, composability" slice: a part
that accepts host props must never silently replace or drop a caller's handler.

## 1. The defect

Four interactive parts spread `...rest` and then install their own host handler
in a way that loses the other one:

| Part | Today | Effect |
| ---- | ----- | ------ |
| `PaginationPrevious`, `PaginationNext`, `PaginationItem` | internal `onClick` first, `{...rest}` spread after | a caller `onClick` **replaces** the page change; pagination stops |
| `CommandMenuItem` | internal `onClick` first, `{...rest}` after | a caller `onClick` replaces `run(action)`; the command never runs |
| `AlertDismiss` | `{...rest}` first, internal `onClick={onDismiss}` after | the caller's `onClick` is dropped |
| `CarouselControl` | `{...rest}` first, internal `onClick` after | the caller's `onClick` is dropped |
| `InlineEdit` (display) | `{...rest}` first, internal `onClick`/`onKeyDown` | the caller's display handlers are dropped |
| `InlineEdit` (input) | `onChange`, `onSubmit`, `onFocus`, `onBlur` are destructured or overridden | the caller's field handlers are dropped |
| `MentionInput` (input) | `onKeyDown`, `onFocus`, `onBlur` are overridden | the caller's field handlers are dropped |
| `MentionInputItem` | `{...rest}` first, internal `onMouseDown`/`onKeyDown` | the caller's row handlers are dropped |

Parts that **deliberately omit** a handler from their prop type are out of
scope, not bugs: `MentionInput`/`TagInputField` omit `onChange`/`onSubmit`,
`ChatComposer` omits `onChange`/`onSubmit`, and `MenuSubTrigger` omits
`onSelect`. The type is the contract; those callers use the component callback.

## 2. The rule

> A part that accepts a host handler and needs the same event calls the caller's
> handler exactly once and then runs its own action. It never spreads `...rest`
> after an internal handler (that replaces the part's action) and never
> installs an internal handler after `...rest` without forwarding (that drops
> the caller's).

This belongs in `docs/component-api.md` §1 (compound parts), because it is a
composability rule for parts, not a component-specific note.

## 3. Exact changes

### 3.1 `packages/components/src/pagination.tsx`

- `PaginationPrevious`: destructure `onClick`; render
  `onClick={(event) => { onClick?.(event); onPageChange(current - 1); }}` and
  remove the internal `onClick` that is currently before `{...rest}`.
- `PaginationNext`: the same with `current + 1`.
- `PaginationItem`: destructure `onClick`; keep the no-op for the current page
  but still call the caller:
  `onClick={(event) => { onClick?.(event); if (!isCurrent) onPageChange(page); }}`.

### 3.2 `packages/components/src/command-menu.tsx`

- `CommandMenuItem`: destructure `onClick`; place
  `onClick={(event) => { onClick?.(event); run(action); }}` after `{...rest}`.

### 3.3 `packages/components/src/alert.tsx`

- `AlertDismiss`: destructure `onClick`; render
  `onClick={(event) => { onClick?.(event); onDismiss(); }}`.

### 3.4 `packages/components/src/carousel.tsx`

- `CarouselControl`: destructure `onClick`; render
  `onClick={(event) => { onClick?.(event); step(direction === "next" ? 1 : -1); }}`.

### 3.5 `packages/components/src/inline-edit.tsx`

- Display branch: destructure `onClick`; the handler calls `onClick?.(event)`
  first and then `start()` (inside the existing `isActivation` guard only for
  the key path). The key path calls `onKeyDown?.(event)` first.
- Input branch: keep `onKeyDown` on `handleInputKeyDown` (already forwards);
  add `onChange`, `onSubmit`, `onFocus`, `onBlur` forwarding:
  - `onChange={(event) => { onChange?.(event); setDraft(event.value ?? ""); }}`
  - `onSubmit={(event) => { onSubmit?.(event); commit(); }}`
  - `onFocus={(event) => { setFocused(true); onFocus?.(event); }}`
  - `onBlur={(event) => { onBlur?.(event); finish(true, false); }}`
- Do not forward `onInput` (not a host prop in 0.10.0).

### 3.6 `packages/components/src/mention-input.tsx`

- Root input: destructure `onKeyDown`, `onFocus`, `onBlur`; every branch calls
  the caller first. `onChange`/`onSubmit` stay omitted by type.
- `MentionInputItem`: destructure `onMouseDown`, `onKeyDown`; call the caller
  first, then `select(value)`.

## 4. Tests (each must fail before the fix)

Files: `src/behaviour/pagination.test.tsx`, `inline-edit.test.tsx`,
`mention-input.test.tsx`, `command-menu.test.tsx`, `carousel.test.tsx`,
`alert.test.tsx`.

1. **Pagination — previous/next/item compose.** Render a controlled pager at
   page 5 with one `onClick` spy on `PaginationPrevious`, one direct
   `PaginationItem page={4}` (also with the spy) and one on `PaginationNext`.
   Click all three. Assert the spy ran three times and `onPageChange` received
   `4`, `4`, `6` in order. Today the spy replaces the internal handler and
   `onPageChange` never runs.
2. **Pagination — current item still reports the caller.** Click a direct
   `PaginationItem page={5}` with the spy. Assert the spy ran and `onPageChange`
   did not. Today the spy is the only handler (so this half already passes);
   the assertion that fails before the fix is the previous one, and this test
   pins the no-op rule.
3. **Command menu — a row composes.** Render `CommandMenu` with one action and
   a direct `CommandMenuItem` carrying `onClick`. Click the row. Assert both
   the caller's spy and `action.perform` ran.
4. **Carousel — controls compose.** Extend the gallery harness with an
   `onControlClick`, click Next, assert the spy ran and `onValueChange` got
   `1`.
5. **Alert — dismiss composes.** Render `AlertDismiss` with `onDismiss` and
   `onClick`, click it, assert both ran.
6. **Inline edit — display handlers compose.** Click the display: the caller's
   `onClick` runs and the input appears. Then a second render: focus the
   display, press Enter; the caller's `onKeyDown` runs and the input appears.
7. **Inline edit — field handlers compose.** Enter edit mode; assert
   `onFocus`; type a character and assert `onChange`; focus a sibling and
   assert `onBlur` (and the commit contract still holds); re-enter, type, press
   Enter and assert `onSubmit` plus `onCommit`.
8. **Mention input — field handlers compose.** Focus the field (`onFocus`),
   type `@` (`onKeyDown`), focus a sibling (`onBlur`); the list still opens and
   closes as before.
9. **Mention input — row handlers compose.** Type `@an`; click `row-ana` and
   assert the caller's `onMouseDown` plus `onMention`. In a second render,
   focus the row and press Enter; assert the caller's `onKeyDown` plus
   `onMention`.

## 5. Docs, inventory and examples

- `docs/component-api.md` §1: add the rule from §2 of this plan.
- `docs/pagination.mdx`, `docs/inline-edit.mdx`, `docs/mention-input.mdx`,
  `docs/command-menu.mdx`, `docs/carousel.mdx`, `docs/alert.mdx`: one sentence
  in the relevant section ("Caller handlers compose with the component's own
  action"), and update the `## Verification` count.
- `COMPONENTS.md` rows: update the native-test counts — Alerts 12, Command
  menus 20, Pagination 12, Mention input 11, Carousel 9, Inline edit 10 — and
  add the composition guarantee to each row's notes.
- Examples already exist and mount; no new example is needed. The example
  registry test (`src/behaviour/examples.test.tsx`) must stay green.
- `TODO.md`: tick the new Phase F consistency task after the gates pass.

## 6. Commands and expected results

Run from the worktree root
`/Users/cyberistic/GPUIXUI/workspaces/components`.

1. **Before the fix**, to prove the tests can fail:
   `nub run --filter @gpuixui/components test:behaviour -- src/behaviour/pagination.test.tsx src/behaviour/inline-edit.test.tsx src/behaviour/mention-input.test.tsx src/behaviour/command-menu.test.tsx src/behaviour/carousel.test.tsx src/behaviour/alert.test.tsx`
   Expected: the new cases fail, each naming the missing callback or the
   missing page change. If they pass before the fix, the test is not testing the
   defect — STOP and rewrite it.
2. `nub run --filter @gpuixui/components check-types`
   Expected: `Done`.
3. `nub run --filter @gpuixui/components test`
   Expected: `332 passed` (the nine new cases are behaviour-only).
4. `nub run --filter @gpuixui/components test:behaviour`
   Expected: `502 passed` (493 + 9).
5. `nub run check`, `nub run lint`, `nub run test`
   Expected: all green; `check:tests` accepts the new cases.

## 7. STOP conditions

- A test cannot observe the caller's handler because GPUix does not dispatch the
  event (for example an input blur that only fires on unmount) — STOP, record
  the measured event with the failing expectation, and do not weaken the rule.
- Composing changes existing behaviour (for example a click runs the action
  twice) — STOP and report the call path; do not add a guard that hides it.
- `onSubmit` on `<input>` does not exist on the pinned runtime — STOP and keep
  `onKeyDown` as the only Enter path; record the difference in the docs.
- Any type error requires an `any`, cast or omitted prop — STOP.

## 8. Acceptance

- All nine cases pass in the real renderer and the before-run showed them
  failing.
- No part replaces or drops a host handler it advertises in its prop type.
- Docs and `COMPONENTS.md` agree with the implementation and the suite counts.
- The three repo gates pass.

## 9. Outcome (2026-10-18)

Landed on `agent/components`. With the six source files stashed and the new
tests kept, `test:behaviour -t composes` reported **8 failed / 1 passed**; the
passing one is the current-page test, which pins behaviour that was already
correct. After the fix the full suites are **unit 332 / behaviour 502**, both
green, and `nub run check`, `nub run lint` and `nub run test` pass.

`CommandMenuItem` is exercised through a caller-composed wrapper list, because
`CommandMenu`'s part check accepts the input/list/empty state directly and a
custom list is a plain component under the root (the documented composition
path). No public type changed; only handler composition did.
