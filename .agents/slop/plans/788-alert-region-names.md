# 788 — An alert region announces its message

**Status:** planned 2026-10-20. **Workstream:** components. **Number claim:**
`788` is the first free number across every worktree (components `783`,
primitives `784`, playground `786`, tokens-theme `787`).

---

## 1. Why

Measured on 2026-10-20 in this worktree against the installed
`@gpuix/react`/`@gpuix/native` 0.10.0 binding, with a scratch behaviour test
(`src/behaviour/scratch-names.test.tsx`, deleted before the commit) that mounted
the real components.

### 1.1 The alert block

```tsx
<Alert>
  <AlertTitle>Payment failed</AlertTitle>
  <AlertDescription>Try another card.</AlertDescription>
</Alert>
```

`a11yNodes` reported:

| role | name |
| ---- | ---- |
| `label` | `Payment failed` |
| `alert` | **`""`** |

0.10.0 does not lift a `div`'s contents into its accessible name (the limitation
plans 387, 391, 772, 779, 782 and 783 each met), so the `role="alert"` region —
the only thing a screen reader announces — carries **no name**, and the title is
a loose text node beside it. A caller `aria-label` *does* land (measured: the
same tree with `aria-label="Payment failed"` reports `alert:"Payment failed"`),
so the channel works; the component simply never uses it.

### 1.2 The form's validation summary (and the multi-step form's)

A failed `Form` submit reported:

| role | name |
| ---- | ---- |
| `label` | `Expected a value with a length of at least 1` |
| `alert` | **`""`** |

`internal/error-summary.tsx` paints one `role="alert"` around one text node per
message. The summary is the sole announcement of a failed submit — the docs say
so in `docs/form.mdx` and `docs/multi-step-form.mdx` ("announced once") — yet it
is announced as an unnamed alert with the messages as unrelated text.

### 1.3 The chat's failure banner

```tsx
<Chat label="Support" status={{ _tag: "error", message: "The model is unavailable" }} …>
```

| role | name |
| ---- | ---- |
| `group` | `Support` |
| `label` | `The model is unavailable` |
| `alert` | **`""`** |

Same shape, same cause: `chat.tsx` paints `role="alert"` around a `<text>`.

### 1.4 What is already correct

- `FieldError` is itself a `<text role="alert">`, so its own content is its
  name — no change.
- A toast card is a `role="status"` named by its message (plan 370) — the
  precedent for naming an announced region from the text it paints.
- `Stepper`/`Timeline` rows and `KeyboardShortcut` rows already supply names
  (plans 626, 772).

### 1.5 Why the contract missed it

`src/behaviour/accessibility.test.tsx` requires a name only for
`INTERACTIVE_ROLES` (button, link, tab, option, …). An `alert` is a *container*
that announces, not a control the user focuses, so nothing checked it. The alert
example ships **four** unnamed alerts, and the dialog/confirm-dialog examples
compose alerts too. Measured at `HEAD` with the new rule (§4.5), the contract
reports the `alert` example's four regions; with the fix it passes.

## 2. Files

| File | Change |
| ---- | ------ |
| `packages/components/src/internal/text-registry.ts` | **new** — the registry formerly in `internal/description.ts`, generalised to named kinds |
| `packages/components/src/internal/description.ts` | **deleted** (moved) |
| `packages/components/src/dialog.tsx` | uses `useTextRegistry` with `kind: "description"` |
| `packages/components/src/drawer.tsx` | same |
| `packages/components/src/alert.tsx` | root names itself from a registered `AlertTitle` (fallback `AlertDescription`); `AlertTitle`/`AlertDescription` register their plain text |
| `packages/components/src/internal/error-summary.tsx` | names the alert by its messages |
| `packages/components/src/chat.tsx` | names the error banner by `status.message` |
| `packages/components/src/behaviour/alert.test.tsx` | 4 native cases |
| `packages/components/src/behaviour/form.test.tsx` | 1 native case |
| `packages/components/src/behaviour/multi-step-form.test.tsx` | 1 native case |
| `packages/components/src/behaviour/chat.test.tsx` | 1 native case |
| `packages/components/src/behaviour/accessibility.test.tsx` | the announced-region rule (§3.5) |
| `packages/components/docs/alert.mdx` | naming + verification count |
| `packages/components/docs/form.mdx` | summary naming + count |
| `packages/components/docs/multi-step-form.mdx` | summary naming + count |
| `packages/components/docs/chat.mdx` | banner naming + count |
| `COMPONENTS.md` | the four rows' naming sentence + counts |
| `TODO.md`, `PLAN.md` D30, `.agents/slop/plans/README.md` | bookkeeping |

## 3. Implementation

### 3.1 Generalise the registry

Move `src/internal/description.ts` to `src/internal/text-registry.ts` and add a
kind:

```ts
/**
 * The text parts a container registers so that it can name itself.
 *
 * `@gpuix/react@0.10.0` has no `aria-labelledby`/`aria-describedby` and does not
 * lift a `div`'s contents into its accessible name, so a part that owns the text
 * hands it to its root, which delivers it through `aria-label` or
 * `aria-description` (plans 392, 516, 627, 788). Ids let two parts coexist, and
 * an unmount clears only its own entry.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useCallback, useRef, useState } from "react";

interface Entry {
  readonly id: number;
  readonly kind: string;
  readonly text: string;
}

/** The text a container holds for each kind of part mounted under it. */
export interface TextRegistry {
  /** The first text registered for `kind`. */
  readonly textOf: (kind: string) => string | undefined;
  /** Register one text part; returns its unsubscribe. */
  readonly register: (kind: string, text: string) => () => void;
}

/** Track the text parts mounted under one root. */
export const useTextRegistry = (): TextRegistry => {
  const nextId = useRef(0);
  const [entries, setEntries] = useState<ReadonlyArray<Entry>>([]);

  const register = useCallback((kind: string, text: string) => {
    const id = nextId.current++;
    setEntries((current) => [...current, { id, kind, text }]);
    return () => {
      setEntries((current) => Arr.filter(current, (entry) => entry.id !== id));
    };
  }, []);

  const textOf = useCallback(
    (kind: string) =>
      Option.getOrUndefined(
        Option.map(
          Arr.findFirst(entries, (entry) => entry.kind === kind),
          (entry) => entry.text,
        ),
      ),
    [entries],
  );

  return { register, textOf };
};
```

Keep the doc comment's existing plan references; add `788`.

`dialog.tsx` and `drawer.tsx` keep the same context shape:

```ts
const { register, textOf } = useTextRegistry();
const description = textOf("description");
const registerDescription = useCallback(
  (text: string) => register("description", text),
  [register],
);
```

`register` is stable, so `DialogDescription`/`DrawerDescription`'s effect
(`[registerDescription, text]`) does not re-run on unrelated renders. Put
`description` and `registerDescription` into the existing memo.

### 3.2 `Alert` names itself

In `alert.tsx`, extend the context:

```ts
type AlertNameKind = "title" | "description";

interface AlertContextValue {
  readonly tone: AlertTone;
  readonly foreground: string;
  readonly registerText: (kind: AlertNameKind, text: string) => () => void;
}
```

Root:

```tsx
const { register, textOf } = useTextRegistry();
const title = textOf("title");
const description = textOf("description");
const name = title ?? description;
```

and the surface:

```tsx
<div
  role="alert"
  {...(name === undefined ? {} : { "aria-label": name })}
  {...rest}
  style={…}
>
```

`rest` still spreads after, so a caller's `aria-label` wins (the same rule every
part follows).

`AlertTitle` (and `AlertDescription`) read `children` explicitly and register:

```tsx
export const AlertTitle = ({ children, style, ...rest }: Props) => {
  const theme = useTheme();
  const { foreground, registerText } = useAlert();
  const text = controlName(undefined, children);

  useEffect(
    () => (text === undefined ? undefined : registerText("title", text)),
    [registerText, text],
  );

  return (
    <text {...rest} style={…}>
      {children}
    </text>
  );
};
```

Rules:

- **title first, description as fallback** — the title states what happened; a
  description adds detail and is not the name when a title exists. This mirrors
  `KeyboardShortcut`'s label-first naming (plan 772).
- **an empty/removed title falls back** to the description: the effect's
  unsubscribe clears only its own entry, so a rename or unmount updates the name
  in place.
- **a composed title** (an icon plus text) is named from its plain text; if it
  has none, the description names the alert, and if both are nameless the alert
  stays unnamed rather than inventing text (a nameless alert is a data bug, and
  the contract in §3.5 reports it).
- **no new prop**: the caller already has `aria-label` through `Props`.

`AlertDescription` is the same with `"description"`. Its content may hold a
real control (the alert example does), which `plainText`/`controlName` skips.

### 3.3 The validation summary names itself

`internal/error-summary.tsx`:

```tsx
onNonEmpty: (values) => (
  <div role="alert" aria-label={Arr.join(values, "; ")} style={…}>
```

Messages are already distinct, so the join is the summary a reader hears once.
No new prop: the summary exists only inside `Form`/`MultiStepForm`, and its
content is the message list the caller's schema produced.

### 3.4 The chat banner names itself

`chat.tsx`, in the failed branch:

```tsx
const messageName = Option.getOrUndefined(
  composedName(undefined, [status.message]),
);
…
<div
  role="alert"
  {...(messageName === undefined ? {} : { "aria-label": messageName })}
  style={…}
>
```

A blank message leaves the banner unnamed (nothing truthful to say); the visible
row is unchanged.

### 3.5 The contract sees announced regions

In `src/behaviour/accessibility.test.tsx` add, beside `INTERACTIVE_ROLES`:

```ts
/** Roles a screen reader announces without the user focusing them. */
const ANNOUNCED_ROLES: ReadonlyArray<string> = ["alert", "status"];
```

and a second case:

```ts
it("names every announced region in every example", () => {
  // Same walk as the interactive case; collect `${id}: ${node.role}` for an
  // announced node with an empty name.
});
```

Keep it a separate case so a failure names the rule that broke. Measured at
`HEAD` with the rule added: the `alert` example reports four unnamed regions
(and any composed example that mounts an alert); after the fix it passes. Toast
cards are already named (plan 370), so `status` adds no failure — it closes the
same hole for a future example that leaves one open.

## 4. Tests

### 4.1 Alert — `src/behaviour/alert.test.tsx` (4 cases, 14 → 18)

Use `nodesWithRole(renderer, "alert")` and read `[0]?.name`.

1. **`names the region from its title`** — title + description; expect the
   alert's name to be `"Payment failed"`. At `HEAD`: `""`.
2. **`names an untitled region from its description`** — only an
   `AlertDescription`; expect its text. At `HEAD`: `""`.
3. **`a rename or a removed title updates the name`** — render with a title,
   `rerender` with a new title (name follows), then `rerender` without the title
   (name falls back to the description). At `HEAD`: `""` throughout.
4. **`a caller aria-label wins over the title`** — `aria-label="Card declined"`
   with a different title; expect `"Card declined"`. This case passes at `HEAD`
   (the channel works); it is the pin that keeps the computed name from
   overwriting the caller.

### 4.2 Form — `src/behaviour/form.test.tsx` (1 case, 13 → 14)

5. **`names the validation summary by its messages`** — the existing `Harness`
   with `invalid`, submit; expect one `alert` whose name is
   `expectedMessages.join("; ")`, in schema order. At `HEAD`: `""`.

### 4.3 Multi-step form — `src/behaviour/multi-step-form.test.tsx` (1 case, 17 → 18)

6. **`names the step summary by its messages`** — the existing invalid-`next`
   path; expect the alert's name to be the step's message(s) joined. At `HEAD`:
   `""`.

### 4.4 Chat — `src/behaviour/chat.test.tsx` (1 case, 13 → 14)

7. **`names the failure banner by its message`** — an error status; expect one
   `alert` named `"The connection dropped."` (the suite's fixture message). At
   `HEAD`: `""`.

### 4.5 Both-direction proof

| Mutation | Cases that fail |
| -------- | --------------- |
| remove the alert's `aria-label` line | alert 1–3; form 5; multi-step 6; chat 7; the announced-region contract (the alert example) |
| name from the description before the title | alert 1 (reads the description) |
| drop the description subscription | alert 2–3 |
| paint the computed name after `{...rest}` | alert 4 (caller's label lost) |
| remove the summary's `aria-label` | form 5, multi-step 6 |
| remove the banner's `aria-label` | chat 7 |
| remove `"alert"` from `ANNOUNCED_ROLES` | the contract passed at `HEAD` while four regions were unnamed — the recorded hole |

Run each mutation once, record the failures in the commit message, then restore.

## 5. Docs, inventory and `COMPONENTS.md`

- `docs/alert.mdx` §Accessibility: "the region is named by its `AlertTitle`
  (falling back to an `AlertDescription`), because 0.10.0 cannot name a `div`
  from its contents; a caller `aria-label` wins." Remove/qualify the claim that
  the title is only visual. Verification: 18 tests, with the naming cases named.
- `docs/form.mdx` §Accessibility + Verification: "the summary is a single
  `role="alert"` named by its messages, so a failed submit is one announcement."
  14 tests.
- `docs/multi-step-form.mdx`: same sentence for the step summary; 18 tests.
- `docs/chat.mdx` §Accessibility: "the failure banner is a `role="alert"` named
  by `status.message`." 14 tests.
- `COMPONENTS.md`:
  - **Alerts**: "the root is named by its title (description fallback, caller
    `aria-label` wins)"; 18 native tests.
  - **Form**: "the summary alert is named by its messages"; 14 native tests.
  - **Multi-step forms**: same; 18 native tests.
  - **Chat**: "the error banner is named by its message"; 14 native tests.
- `src/inventory.ts`: no new prop or limitation; only counts change, and the
  docs pages carry them.

## 6. Verification

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/components/packages/components
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/alert.test.tsx
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/form.test.tsx
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/multi-step-form.test.tsx
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/chat.test.tsx
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/accessibility.test.tsx
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/dialog.test.tsx
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/drawer.test.tsx
```

then, at the repo root:

```sh
nub run --filter @gpuixui/components test
nub run check
nub run lint
nub run test
```

The dialog and drawer runs are the regression check for the registry move.

Scoped smoke: no playground scenario mounts an alert, a form or a chat
(`--list`), so the `TestRenderer` suites are the native evidence. Do not run
`--all`.

## 7. STOP conditions

- `AlertTitle`'s registration re-renders in a loop (the context value changing on
  every render): stop and stabilise `register` (it must be the hook's stable
  callback) before continuing.
- The computed name overwrites a caller's `aria-label`: stop; the `{...rest}`
  order is wrong.
- The dialog or drawer loses its `aria-description` after the registry move:
  stop and re-check the `kind` string and the memo dependencies.
- The announced-region contract reports a region the plan did not name (another
  example): stop and report it; do not add an allow-list.
- Any stated test count disagrees with a suite: fix the page and the row, never
  the assertion.

## 8. Acceptance

- Every `role="alert"` region the package paints is named by the text it
  announces — the alert's title (description fallback), the validation summary's
  messages, and the chat banner's message — and a caller's `aria-label` still
  wins.
- Seven new native cases, the four existing suites grow by the stated counts, and
  the all-example contract covers announced regions (red at `HEAD`, green after).
- Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the plan index agree with
  the run; `check`, `lint` and `test` exit 0.
