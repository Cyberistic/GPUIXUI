# 799 — A streaming message's status line carries its name

**Owner:** components workstream · **Phase:** F (Tier 2/5 hardening) ·
**Depends on:** 110, 117, 200, 201, 207, 391, 516, 788, 792

**Numbering:** `795` is claimed by tokens-theme (`795-platform-disabled-step-figures`),
`796` by primitives (`796-rating-readonly-pointer`), `797` by the playground
(`797-field-ink-pixels`) and `798` by tokens-theme (`798-linux-wash-premise`), so
`799` is the first number free across `main` and every worktree on 2026-10-20.
Recorded in `PLAN.md` D30.

## 1. Why

`MessageStreaming` paints a `role="status"` line while a row streams. Its visible
text is a `<text>` child of the role-bearing `div`, and GPUix 0.10.0 does **not**
lift a role-bearing div's text child into its accessible name (the rule behind
plans 783, 790, 788 and 792). The part never writes `aria-label`, so the very
element that exists to announce progress is announced as a bare `status`:

Measured on 2026-10-20 in this worktree against the installed
`@gpuix/react`/`@gpuix/native` 0.10.0 binding, with a scratch behaviour test
(`src/behaviour/zz-probe.test.tsx`, deleted before the commit):

```tsx
<Message variant="assistant" streaming>
  <MessageStreaming />
</Message>
```

```
PROBE status [ { role: 'status', name: '' } ]
```

and with the visible label changed, still unnamed:

```tsx
<MessageStreaming label="Writing" />
```

```
PROBE status [ { role: 'status', name: '' } ]
```

Two further facts from the same probe:

```tsx
<MessageStreaming label="Writing" aria-label="Assistant is writing" />
```

```
PROBE status [ { role: 'status', name: 'Assistant is writing' } ]
```

so an authored name does win (the `{...rest}` spread), but

```tsx
<MessageStreaming label="Writing" aria-label="   " />
```

```
PROBE status [ { role: 'status', name: '   ' } ]
```

so a blank authored value is delivered verbatim and leaves the announcement with
no word at all — the blank rule every other naming part applies
(`internal/name.ts`'s `controlName`) is missing here.

Consequences:

1. **The common case is unnamed.** A screen-reader user hears the status role and
   no text, even though the same text is painted on screen.
2. **The visible label is not the name.** `<MessageStreaming label="Writing" />`
   paints "Writing" and announces nothing; a caller has to know to pass
   `aria-label` as well.
3. **The accessibility contract cannot see it.** `accessibility.test.tsx` mounts
   each example in its default state; the message example's assistant row starts
   with `streaming` false, so `MessageStreaming` returns `null` and the contract's
   role walk never meets the status node. The per-component suite is the guard.

The fix is the package's one naming rule: the caller's authored `aria-label`
wins whole and trimmed; otherwise the visible `label` names the line.

Scope of this plan:

- compute the status name once with `controlName(rest["aria-label"], label)`;
- three native cases: the default label names it, a custom label names it, a
  blank authored value falls back (and the existing streaming case is
  strengthened to assert the name);
- docs, `COMPONENTS.md`, the inventory counts, the plan index, `TODO.md` and
  `PLAN.md` D30 synced.

**Out of scope** (do not add): the `aria-live` limitation (0.10.0 has no live
region), the row's `group` name, a new prop, a translation layer, or any change
to `Chat`'s banner or the `Message` row structure.

## 2. What exists today (read these first)

- `packages/components/src/message.tsx` lines 231–254 — `MessageStreamingProps`
  (`label?: string`, default `"Streaming"`) and `MessageStreaming`: it returns
  `null` unless the row is `streaming`, then renders
  `<div {...rest} role="status" style={…}><text …>{label}</text></div>`.
- `packages/components/src/internal/name.ts` — `controlName(authored, children)`
  trims a non-empty authored name and otherwise reads plain text from children;
  it returns `undefined` when neither is present. `controlNameFrom` is the same
  rule for a list of visible sources. This is the one naming rule.
- `packages/components/src/behaviour/message.test.tsx` — 10 native cases. The
  header comment lists the bugs guarded; `Row` (lines 38–54) wraps a `Message`
  with `streaming` and a `testId`. The streaming case is
  `"shows the streaming status only while streaming"` (lines 214–235); it
  asserts presence and `getAllText()` but not the accessible name.
  `nodesWithRole` is already imported (line 18).
- `packages/components/docs/message.mdx` — the part table (line 65), the
  Behaviour table (line 80), Accessibility (lines 112–117) and Verification
  (line 132, `(10 tests)`).
- `COMPONENTS.md` — the `Message (AI message row)` row in the Tier 5 table states
  `10 native behaviour tests`.
- `packages/components/src/inventory.test.ts` holds both stated counts to the
  suite (the page's `(N tests)` and the row's `N native behaviour tests`), so the
  row and the docs page must change together.

## 3. Exact changes

### 3.1 `packages/components/src/message.tsx`

1. Import the naming rule beside the other internal imports:

   ```ts
   import { controlName } from "./internal/name.js";
   ```

2. In `MessageStreaming`, after the `if (!streaming) return null;` line, compute
   one name:

   ```tsx
   const name = controlName(rest["aria-label"], label);
   ```

3. Render it after the `{...rest}` spread, so a blank authored value cannot leak
   through:

   ```tsx
   <div
     {...rest}
     role="status"
     {...(name === undefined ? {} : { "aria-label": name })}
     style={…}
   >
   ```

   Keep the visible `<text>` child exactly as it is.

4. Update the part's JSDoc to state the precedence:

   > A status line that exists only while the row is streaming. Its visible
   > `label` is also its accessible name; a caller's authored `aria-label` wins
   > whole.

5. No `messageMeta` change: the limitation list is unchanged (there is still no
   live region in 0.10.0).

### 3.2 `packages/components/src/behaviour/message.test.tsx`

- Extend the file header comment with the guarded bug: the streaming status was
  painted with no accessible name (and a blank authored name was announced as
  whitespace) because 0.10.0 does not name a role-bearing div from its text
  child, although the package's naming rule says the visible label is the name.
- Strengthen the existing case
  `"shows the streaming status only while streaming"`: after the rerender that
  starts streaming, assert

  ```ts
  expect(nodesWithRole(row.renderer, "status")).toMatchObject([
    { role: "status", name: "Streaming" },
  ]);
  ```

  This assertion is the case that fails at `HEAD` for the default label.
- Add three cases:

  1. **The visible label is the name.**
     `<Row variant="assistant" streaming><MessageStreaming label="Writing" /></Row>`
     → the status node's `name` is `"Writing"` (and the painted text still
     contains `"Writing"`). Fails at `HEAD` with `name: ""`.
  2. **The caller's authored name wins whole.**
     `label="Writing" aria-label="Assistant is writing"` → `name` is
     `"Assistant is writing"`, and the painted text is still `"Writing"`.
     This is a pin: it passes at `HEAD` and must keep passing.
  3. **A blank authored name falls back to the label.**
     `label="Writing" aria-label="   "` → `name` is `"Writing"`. Fails at `HEAD`
     with `name: "   "`.

  Each new case unmounts its root. Do not touch the other nine cases.

### 3.3 `packages/components/docs/message.mdx`

- Part table: change the `MessageStreaming` row's Renders cell to

  > a `status` line named by `label` (a caller `aria-label` wins), only while
  > `streaming`

- Accessibility: after the `MessageStreaming is role="status"` bullet, add:

  > The status line is named by its `label`; a caller's authored `aria-label`
  > wins whole and is trimmed, and a blank one falls back to the visible label.
  > 0.10.0 does not name a role-bearing `div` from its text child (plan 799).

- Verification: `(10 tests)` → `(13 tests)` and add the three cases to the
  sentence ("… and names the streaming status from its label, a caller's name
  and a blank fallback").

### 3.4 `COMPONENTS.md`

In the `Message (AI message row)` row, change `10 native behaviour tests` to
`13 native behaviour tests` and add, after the status sentence:

> its `status` line is named by its `label` (a caller `aria-label` wins trimmed; a
> blank one falls back), because 0.10.0 cannot name a role-bearing `div` from its
> text child (plan 799)

### 3.5 Index and tracking

- Add the row to `.agents/slop/plans/README.md` under the components table.
- Add the measured line under "Tier 2 hardening after the inventory closed" in
  `TODO.md` and tick it.
- Append `799` to the overflow sentence in `PLAN.md` D30.
- Tick nothing else.

## 4. Test plan

Run from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/message.test.tsx
```

Expected **before** the source change: the strengthened case, the custom-label
case and the blank-fallback case fail, the authored pin and the other nine pass
— **3 failed | 10 passed (13)**.

Expected after: **13 passed (13)**.

**Both directions** (one at a time, reverting each):

1. Remove the computed name and the `aria-label` line → the same three fail
   (`3 failed | 10 passed (13)`); restore.
2. Use `rest["aria-label"] ?? label` without `controlName` → only the blank case
   fails (`name: "   "`, `1 failed | 12 passed (13)`); restore.
3. Use `aria-label={label}` unconditionally → only the authored pin fails
   (`name: "Writing"`, `1 failed | 12 passed (13)`); restore.

Then the gates:

```sh
nub run test
nub run check-types
nub run check
nub run lint
```

All four exit 0. The full native suite is the merge gate, not an iteration check;
run it once at the end and confirm the only failures are the recorded plan-540
binding defects.

No playground smoke scenario mounts a `Message` row (the smoke registry is GPUix
primitives only; `--list` has no such row), so the native `TestRenderer` suite is
the interaction evidence and no live window is opened for this change.

## 5. STOP conditions

- The strengthened case passes at `HEAD`: stop and re-measure
  `nodesWithRole(renderer, "status")`; do not weaken the assertion.
- The visible text changes (it must still read `Streaming` / `Writing`): stop.
- The authored pin fails after the change: stop; the authored name must win
  before the label.
- A blank authored value still yields whitespace after the change: stop and
  re-read §3.1 (`controlName` owns the blank rule).
- Any of the other nine message cases changes state: stop and report which one.
- A recorded plan-540 case changes state: stop and report which one.

## 6. Acceptance

- A streaming row's `status` node is named by its visible `label`
  (`"Streaming"` by default); a caller's authored `aria-label` is the whole name,
  trimmed; a blank authored value falls back to the label.
- The visible status text and the row's `group` name are unchanged.
- `message.test.tsx` is **13/13 measured on this host**; three cases fail without
  the source change.
- Docs, `COMPONENTS.md`, the inventory counts, the plan index, `TODO.md` and
  `PLAN.md` D30 agree on the counts.
