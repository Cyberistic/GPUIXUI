# 794 — A notification trigger's caller-authored name wins

**Owner:** components workstream · **Phase:** F (Tier 2 hardening) ·
**Depends on:** 110, 117, 200, 201, 391, 568, 666, 741, 782, 792

**Numbering:** `793` is claimed by tokens-theme (`793-native-field-table`);
`794` is the first number free across `main` and every worktree on 2026-10-20.
Recorded in `PLAN.md` D30.

## 1. Why

`NotificationCentreTrigger` is a `Button` with a derived accessible name:
`"{label}, {n} unread"`. The derived string is written **after** `{...rest}`, so
a caller's authored `aria-label` — a valid `Button` prop that every other part in
the package honours — is silently discarded.

Measured on 2026-10-20 in this worktree against the installed
`@gpuix/react`/`@gpuix/native` 0.10.0 binding, with a scratch behaviour test
(`src/behaviour/zz-probe.test.tsx`, deleted before the commit):

```tsx
<NotificationCentre notifications={seed}>
  <NotificationCentreTrigger testId="bell" aria-label="Alerts" />
  …
</NotificationCentre>
```

```
PROBE customProps aria-label: Notifications, 1 unread
PROBE a11y: [ 'label:Notifications',
              'button:Notifications, 1 unread',
              'window:GPUIX Test' ]
```

Two consequences:

1. **The package rule is broken for one part.** `docs/component-api.md` §5:
   "the caller's authored `aria-label` always wins". `Button` implements it
   (`controlName(rest["aria-label"], children)`), and `NotificationCentreTrigger`
   passes the raw prop through to `Button` and then overwrites the result.
2. **The count is appended even to an authored name.** A caller who authors a
   complete name (for example a localized or product-specific one) cannot use it.

The fix is the same precedence every other derived name uses: the caller's
authored name wins **entirely** (`controlName`, the plan-391/666 rule used by
`Button`, `TabsTrigger`, `BreadcrumbLink`, and by `composedName` for a shortcut
row in plan 772); otherwise the component derives `"{label}, {n} unread"`. A
blank or whitespace-only `aria-label` is not authored — it falls back to the
derived name, exactly like `controlName` treats an empty label.

Scope of this plan:

- compute the trigger's name once with `controlName(rest["aria-label"], derived)`;
- three native cases: authored wins, authored is trimmed, blank falls back;
- the panel's name stays the root `label` (a trigger override must not rename
  the region);
- docs, `COMPONENTS.md`, the inventory count, the plan index, `TODO.md` and
  `PLAN.md` D30 synced.

**Out of scope** (do not add): changing the visible label (the root `label` and
`children` already own it), a new prop, appending the count to an authored name,
or any change to the badge, rows, grouping or panel.

## 2. What exists today (read these first)

- `packages/components/src/notification-centre.tsx` lines 364–413 —
  `NotificationCentreTrigger`: `const count = unread > 99 ? "99+" : String(unread)`,
  then `<Button {...rest} … aria-expanded={open} aria-label={`${label}, ${unread} unread`} …>`.
  `label` comes from the root context (`NotificationCentre.label`, default
  `"Notifications"`).
- `packages/components/src/internal/name.ts` — `controlName(authored, children)`
  trims a non-empty authored name and otherwise reads plain text from children;
  `undefined` only when both are empty. This is the one naming rule.
- `packages/components/src/behaviour/notification-centre.test.tsx` — 29 native
  cases; the `Centre` fixture at lines 83–122 renders
  `<NotificationCentreTrigger testId="bell" />`; the first case pins the default
  `"Notifications, 3 unread"` with three unread of five.
- `packages/components/docs/notification-centre.mdx` — "### Trigger naming"
  (lines 114–120) states the derived name and the badge rule; "## Verification"
  states `(29 tests)`.
- `COMPONENTS.md` — the Notification centre row (Tier 5) states
  `29 native behaviour tests + 5 pure model tests`.
- `packages/components/src/inventory.test.ts` holds both stated counts to the
  suite, so the row and the docs page must change together.

## 3. Exact changes

### 3.1 `packages/components/src/notification-centre.tsx`

1. Import the naming rule beside the existing imports:

   ```ts
   import { controlName } from "./internal/name.js";
   ```

2. In `NotificationCentreTrigger`, replace the inline string with one computed
   name:

   ```tsx
   const name = controlName(rest["aria-label"], `${label}, ${unread} unread`);
   ```

   and render `aria-label={name}` after `{...rest}` (where the derived label is
   today). Keep `aria-expanded={open}` after `{...rest}`: the open state is the
   component's, not the caller's.

3. Update the part's JSDoc from "The bell-shaped button: a visible label, the
   unread badge and the label." to state the precedence:

   > The bell-shaped button: the caller's `aria-label` when authored, else the
   > visible label with the unread count.

4. No `notificationCentreMeta` change: the limitation list is unchanged.

### 3.2 `packages/components/src/behaviour/notification-centre.test.tsx`

- Extend the file header comment with the guarded bug: a caller's authored
  `aria-label` was overwritten by the derived count, although the package's
  naming rule says the caller wins.
- Extend the `Centre` fixture with `triggerLabel?: string` and pass
  `aria-label={triggerLabel}` on `NotificationCentreTrigger` (`undefined` keeps
  today's behaviour, so the existing 29 cases are untouched).
- Add three cases:

  1. **The caller's name wins.**
     `<Centre notifications={seed} triggerLabel="Alerts" />` →
     the bell's `aria-label` is `"Alerts"` (not `"Notifications, 3 unread"`).
     This is the case that fails at `HEAD`.
  2. **The authored name is trimmed.**
     `triggerLabel="  Alerts  "` → `"Alerts"`. Fails at `HEAD` for the same
     reason; with the fix the trim is also applied by `Button`'s own
     `controlName`, so this case pins that a spaced authored name still wins
     rather than isolating the trim rule (measured below).
  3. **A blank authored name falls back.**
     `triggerLabel="   "` → `"Notifications, 3 unread"`. This is a pin: it must
     stay green, and it fails if the fix uses a blank string as the name.

  Each case also asserts the panel still reports `role: "region"` named
  `"Notifications"` when opened, so a trigger override never renames the
  surface (fold this into case 1).

### 3.3 `packages/components/docs/notification-centre.mdx`

- "### Trigger naming": keep the derived form and add one sentence:

  > A caller's authored `aria-label` replaces that whole name — the count is
  > derived only when the name is; a blank or whitespace-only value is not a
  > name and falls back to the derived one. The badge and the visible label are
  > unchanged.

- "## Verification": `(29 tests)` → `(32 tests)` and name the three new cases.

### 3.4 `COMPONENTS.md`

In the Notification centre row, after the badge/title sentence, add:

> the trigger's caller-authored `aria-label` wins whole (trimmed; a blank one
> falls back to `"{label}, {n} unread"`, and the panel keeps the root `label`)

and change `29 native behaviour tests` to `32 native behaviour tests`.

### 3.5 Index and tracking

- Add the row to `.agents/slop/plans/README.md` under the components table.
- Add the measured line under "Tier 2 hardening after the inventory closed" in
  `TODO.md` and tick it.
- Add `794` to the overflow sentence in `PLAN.md` D30.
- Tick nothing else.

## 4. Test plan

Run from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/notification-centre.test.tsx
```

Expected **before** the source change: cases 1 and 2 fail (the bell still reads
`"Notifications, 3 unread"`), case 3 and the 29 existing cases pass —
**2 failed | 30 passed (32)**.

Expected after: **32 passed (32)**.

**Both directions** (one at a time, reverting each):

1. Revert the trigger to the derived literal → cases 1 and 2 fail (measured:
   **2 failed | 30 passed (32)**); restore.
2. Use `rest["aria-label"] ?? …` without `controlName` → only case 3 fails
   (measured: **1 failed | 31 passed**), because `Button`'s own `controlName`
   trims the spaced authored name and falls back to the visible text for a blank
   one — the trigger must own the fallback before `Button` sees it; restore.
3. Use `rest["aria-label"]` with no fallback → the first existing case, case 3
   and "clears the inbox and shows the empty state" fail (measured: **3 failed |
   29 passed**); restore.

Then the gates:

```sh
nub run test
nub run check-types
nub run check
nub run lint
```

All four exit 0. The full native suite is the merge gate, not an iteration
check; run it once at the end and confirm the only failures are the recorded
plan-540 binding defects.

No playground smoke scenario mounts a notification centre (`--list` has no
such row), so the native `TestRenderer` suite is the interaction evidence and no
live window is opened for this change.

## 5. STOP conditions

- Case 1 does not fail at `HEAD`: stop and re-measure the trigger's
  `customProps["aria-label"]`; do not weaken the assertion.
- `figure`/`label` nodes change with the fix: stop; the visible label and badge
  must be untouched.
- The panel's region name changes when only the trigger is renamed: stop; the
  panel defaults to the root `label` and is out of scope.
- A blank `aria-label` produces a string containing only whitespace before the
  count: stop and re-read §3.1 (`controlName` owns the blank rule).
- A recorded plan-540 case changes state: stop and report which one.

## 6. Acceptance

- A caller's authored `aria-label` is the trigger's whole accessible name,
  trimmed; without one the derived `"{label}, {n} unread"` is unchanged; a blank
  one falls back to the derived name.
- The visible label, badge and panel name are unchanged.
- `notification-centre.test.tsx` is **32/32 measured on this host**; cases 1 and
  2 fail without the source change.
- Docs, `COMPONENTS.md`, the inventory count, the plan index, `TODO.md` and
  `PLAN.md` D30 agree on the counts.
