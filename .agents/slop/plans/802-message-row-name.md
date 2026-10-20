# 802 — A message row's name is the caller's, and its default is a human phrase

**Owner:** components workstream · **Phase:** F (Tier 2/5 hardening) ·
**Depends on:** 110, 117, 200, 201, 207, 391, 564, 794, 799

**Numbering:** `799` is this workstream's last plan; tokens-theme claimed `800`
(`800-recipe-status-ink-ranges`) and the playground claimed `801`
(`801-scroll-affordance`); no worktree has `802`, so `802` is the first number
free across `main` and every worktree on 2026-10-20. Recorded in `PLAN.md` D30.

## 1. Why

`Message` paints `role="group"` and writes the row's accessible name from the
internal variant token:

```tsx
<div {...rest} role="group" aria-label={`${variant} message`} style={…}>
```

That is wrong twice over, measured on 2026-10-20 in this worktree against the
installed `@gpuix/react`/`@gpuix/native` 0.10.0 binding with a scratch behaviour
test (`src/behaviour/probe.test.tsx`, deleted before the commit):

```tsx
<Message variant="user" aria-label="Ada Lovelace">
  <MessageContent text="hello" />
</Message>
```

```
PROBE groups [ { role: 'group', name: 'user message' } ]
```

```tsx
<Message variant="assistant" label="Ada Lovelace">
  <MessageContent text="hello" />
</Message>
```

```
PROBE groups [ { role: 'group', name: 'assistant message' } ]
```

1. **The caller cannot name the row.** The derived `aria-label` is written
   *after* `{...rest}`, so an authored `aria-label` is silently overwritten —
   the defect plan 794 fixed on the notification trigger. A conversation can
   therefore never announce *who* a row is from.
2. **The default leaks an internal token.** `MessageVariant` is a code
   vocabulary (`"user"`, `"assistant"`, `"system"`); the row announces the
   lower-cased internal phrase `"user message"`, never `"User message"`. Every
   other name this package derives is human (`"Disabled"`, `"Complete"`,
   `"Current page"`, `"Go to slide 1"`); plan 564 fixed the same leak for a
   `tabpanel` that announced the internal value `profile`.

The fix is the package's one naming rule (`internal/name.ts`): the caller's
authored `aria-label` wins, then a new `label` prop, then an exhaustive,
human default per variant.

Scope of this plan:

- `Message` gains `label?: string` (the row's accessible name) and resolves one
  name with `controlNameFrom(rest["aria-label"], [label, variantName])`;
- `variantName` is a module-local exhaustive `Match` returning `"User message"`,
  `"Assistant message"`, `"System message"`;
- three new native cases and the existing variant case strengthened;
- docs, `COMPONENTS.md`, the inventory counts, the plan index, `TODO.md` and
  `PLAN.md` D30 synced.

**Out of scope** (do not add): registering `MessageAvatar`'s author name as the
row name (a second opinion the caller can already express with `label`), any
`aria-live` work, a `role="log"` transcript on `Chat`, renaming `MessageContent`
or any other part, and a translation layer.

## 2. What exists today (read these first)

- `packages/components/src/message.tsx` lines 84–154 — `MessageProps`
  (`variant`, `streaming?`, `children`) and `Message`: the `{...rest}`, `role`,
  `aria-label` order is the bug. `MessageVariant` is defined at line 41.
- `packages/components/src/internal/name.ts` — `controlNameFrom(authored,
  sources)` trims a non-empty authored name and otherwise returns the first
  trimmed, non-empty source; `undefined` means nobody named it. This is the one
  naming rule; do not hand-roll a second.
- `packages/components/src/behaviour/message.test.tsx` — 13 native cases. The
  header comment lists the bugs guarded. `Row` (lines 38–54) wraps a `Message`;
  `nodesWithRole` is already imported (line 18). The variant-name case is
  `"is a named group for the variant"` at the end of the file and currently
  asserts `toContain("system message")`.
- `packages/components/docs/message.mdx` — Accessibility (line 109, "The row is
  a named `group`: `<variant> message`"), the API table (line 90), the
  Limitations note (line 118) and Verification (line 136, `(13 tests)`).
- `COMPONENTS.md` line 298 — the `Message (AI message row)` row states
  `13 native behaviour tests`.
- `packages/components/src/inventory.test.ts` holds both stated counts to the
  suite (the page's `(N tests)` and the row's `N native behaviour tests`), so
  the page and the row must change together.

## 3. Exact changes

### 3.1 `packages/components/src/message.tsx`

1. Import the naming rule beside the existing internal imports:

   ```ts
   import { controlNameFrom } from "./internal/name.js";
   ```

2. Add the human default above `Message`:

   ```ts
   /** The row's name when neither the caller nor `label` supplies one. */
   const variantName = (variant: MessageVariant): string =>
     Match.value(variant).pipe(
       Match.when("user", () => "User message"),
       Match.when("assistant", () => "Assistant message"),
       Match.when("system", () => "System message"),
       Match.exhaustive,
     );
   ```

3. In `MessageProps`, after `streaming`:

   ```ts
   /** The row's accessible name. Defaults to a human phrase for `variant`. */
   readonly label?: string;
   ```

4. Destructure `label` in `Message` and compute one name before the return:

   ```tsx
   const name = controlNameFrom(rest["aria-label"], [label, variantName(variant)]);
   ```

5. Render it after `{...rest}`, so an authored blank cannot leak through:

   ```tsx
   <div
     {...rest}
     role="group"
     aria-label={name}
     style={…}
   >
   ```

   `name` is `string | undefined` only because `controlNameFrom` is generic; the
   variant phrase guarantees a value, so the prop is written unconditionally
   (`aria-label={name}`) exactly as `Chat` does with its labelled default.

6. Update the component's JSDoc header: the row is a named group whose name the
   caller owns (`aria-label` > `label` > variant phrase).

### 3.2 `packages/components/src/behaviour/message.test.tsx`

- Extend the file header comment with the bug guarded: the row announced the
  internal variant token in lower case and overwrote a caller's `aria-label`,
  because the derived name was written after `{...rest}`.
- Strengthen `"is a named group for the variant"` to assert the human default
  exactly:

  ```ts
  expect(nodesWithRole(row.renderer, "group").map((node) => node.name)).toEqual([
    "System message",
  ]);
  ```

  (The row has exactly one `group`; `toEqual` also proves no lowercase variant
  token remains. Fails at `HEAD`, where the name is `"system message"`.)
- Add three cases:

  1. **Every variant has a human default.** One root, rerendered through the
     three variants, asserting `"User message"`, `"Assistant message"`,
     `"System message"` in turn. Fails at `HEAD` on all three.
  2. **`label` names the row, and a rename updates it in place.** Render
     `<Row variant="assistant" label="Ada Lovelace">`, assert the group name,
     then rerender with `label="Grace Hopper"` and assert the new name. Fails
     at `HEAD` with `"assistant message"`.
  3. **The caller's authored `aria-label` wins over `label`.** Render
     `label="Grace Hopper" aria-label="Ada Lovelace"` (and a second row with
     `aria-label="   "` falling back to `label="Grace Hopper"`). Fails at `HEAD`
     with `"assistant message"`.

  Each case unmounts its root. Do not touch the other twelve cases.

### 3.3 `packages/components/docs/message.mdx`

- API table: the `Message` row becomes

  | `Message` | `variant` (required), `label?` (a human phrase for the variant), `streaming?` (false), children |

- Accessibility: replace the first bullet with

  > - The row is a named `group`; the caller names it with `label` (or an
  >   authored `aria-label`, which wins whole and is trimmed). The default is
  >   `"User message"`, `"Assistant message"` or `"System message"` — a human
  >   phrase, never the internal variant token (plan 802).

- Accessibility limitations bullet (line 118): add that the caller names the
  author through `label`, because 0.10.0 has no `aria-labelledby` to point at
  the avatar's name.
- Verification: `(13 tests)` → `(16 tests)` and add "and names the row from
  `label`, a caller's `aria-label`, and the variant default" to the sentence.

### 3.4 `COMPONENTS.md`

In the `Message (AI message row)` row (line 298), change
`13 native behaviour tests` to `16 native behaviour tests` and add after the
status sentence:

> the row itself is named by the caller's `label`/`aria-label` and otherwise by
> a human variant phrase, never the internal token (plan 802)

### 3.5 Index and tracking

- Add the row to `.agents/slop/plans/README.md` under the components table.
- Add the measured line under "Tier 2 hardening after the inventory closed" in
  `TODO.md` and tick it.
- Append `802` to the overflow sentence in `PLAN.md` D30.
- Tick nothing else.

## 4. Test plan

Run from `packages/components`:

```sh
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/message.test.tsx
```

Expected **before** the source change: the strengthened case and all three new
cases fail — **4 failed | 12 passed (16)**.

Expected after: **16 passed (16)**.

**Both directions** (one at a time, reverting each):

1. Write `aria-label={`${variant} message`}` after `{...rest}` again → the
   strengthened case and the three new cases fail (`4 failed`); restore.
2. Keep the resolved name but pass `label` only (`controlNameFrom(undefined,
   [label])`) → the default case and the strengthened case fail (`2 failed`);
   restore.
3. Write the authored value directly (`aria-label={rest["aria-label"]}`) → the
   blank-authored fallback and the `label` case fail; restore.

Then the gates:

```sh
nub run test
nub run check-types
nub run check
nub run lint
```

All four exit 0. The full native suite is the merge gate, not an iteration
check; run it once at the end and confirm the only failures are the recorded
plan-540 binding defects (baseline at `HEAD`: 1019 passed / 20 failed of 1039).

No playground smoke scenario mounts a `Message` row (the registry is GPUix
primitives plus named component scenarios; `--list` has no message row), so the
native `TestRenderer` suite is the interaction evidence and no live window is
opened for this change.

## 5. STOP conditions

- The strengthened case passes at `HEAD`: stop and re-measure
  `nodesWithRole(renderer, "group")`; do not weaken the assertion.
- A row paints more than one `group` node after the change (for example a nested
  `MessageSources`): stop; the case must target the row, not the first group.
- The authored pin fails after the change: stop; `aria-label` must win before
  `label`.
- The default phrase changes the painted text or layout: stop; only the
  `aria-label` and the docs may change.
- Any of the other twelve message cases changes state: stop and report which.
- A recorded plan-540 case changes state: stop and report which.

## 6. Acceptance

- A row's `group` name is the caller's authored `aria-label` (trimmed), else its
  `label`, else `"User message"` / `"Assistant message"` / `"System message"`.
- No lower-case internal variant token reaches the accessibility tree.
- `message.test.tsx` is **16/16 measured on this host**; four cases fail without
  the source change.
- Docs, `COMPONENTS.md`, the inventory counts, the plan index, `TODO.md` and
  `PLAN.md` D30 agree on the counts.
