# 370 — Each toast card is the status region, named by its own message

**Phase.** F — integration and polish (accessibility).
**Workstream.** components (`packages/components`).
**Depends on.** 110, 115, 117, 123, 124, 322, 183 (playground evidence).
**Status.** done 2026-10-18 — the toast case now asserts the card's status name;
it fails on the old viewport-status shape (Toast 14, behaviour 530).

## 1. Why this plan exists

The playground's `toast-lifecycle` probe (plan `183` §7) measured that AccessKit
has **no live-region concept**: a static `role="status"` region does not
announce a toast's message. It recorded the action: label each card, or expose
its text as the card's accessible name, instead of relying on the viewport label.

Reproduced in this worktree on 2026-10-18 with a throwaway probe (deleted), one
pushed toast (`title: "Saved changes"`, `description: "3 files"`):

| Node | Role | Name |
| ---- | ---- | ---- |
| viewport | `status` | `Notifications` |
| card text | `label` | `Saved changes` / `3 files` (two separate nodes) |

So the only thing carrying the status role is the generic viewport name; the
message exists as unattached static text and cannot be the announced content.

## 2. What will change

1. Each toast card becomes its own `role="status"` node with an `aria-label`
   composed from its title and description — the message *is* the region's name.
2. The viewport becomes a `role="group"` container named `Notifications`: it is
   the stack, not the announcement.
3. The existing toast behaviour case asserts the card's status name; the
   documented viewport role changes from `status` to `group`.

This cannot prove that a screen reader announces the card (0.10.0 has no live
region); it proves that the message is the accessible name of the status node,
which is the strongest signal the runtime exposes. The docs say exactly that.

No public API changes.

## 3. Exact implementation

### 3.1 `packages/components/src/toast/viewport.tsx`

In the card component, just above `return`:

```ts
const accessibleName = Option.match(toast.description, {
  onNone: () => toast.title,
  onSome: (description) => `${toast.title}: ${description}`,
});
```

On the card `<div>`:

```tsx
role="status"
aria-label={accessibleName}
testId={`toast-${toast.id}`}
```

On the viewport `<div>` replace:

```tsx
role="status"
aria-label="Notifications"
```

with:

```tsx
role="group"
aria-label="Notifications"
```

### 3.2 `packages/components/src/behaviour/toast.test.tsx`

Strengthen the first case (no new case, so the suite count stays 14):

```tsx
it("shows a pushed toast and exposes its message as the status region", async () => {
  const page = renderComponent(<Harness />);
  expect(page.renderer.findByTestId("toast-viewport")?.customProps?.role).toBe(
    "group",
  );

  clickCentreOf(page, "push");
  await settle();

  const statuses = nodesWithRole(page.renderer, "status");
  expect(statuses.map((node) => node.name)).toEqual([
    "Saved changes: 3 files",
  ]);
  expect(page.renderer.getAllText()).toContain("Saved changes");
  expect(page.renderer.findByType("svg")).toHaveLength(2);

  page.unmount();
});
```

On the old code the status node is named `Notifications` and there is exactly
one of them, so the name assertion fails.

### 3.3 Docs and inventory

- `packages/components/docs/toast.mdx`: the accessibility section states the
  per-card status and the viewport group; the limitation says the runtime has no
  live region and the accessible name is the strongest signal; the verification
  sentence names the new assertion (count stays 14).
- `COMPONENTS.md`: Toast row — per-card status region named by the message;
  14 native tests.
- Plan index row; `TODO.md` task.

## 4. Exact commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/toast.test.tsx
```

Expected: Toast 14/14. With §3.1 reverted, the first case fails: the status name
is `Notifications` instead of `Saved changes: 3 files`.

```sh
nub run --filter @gpuixui/components test:behaviour
nub run --filter @gpuixui/components test
nub run check
```

Expected: behaviour 530 (unchanged), unit unchanged, `check` exit `0`.

## 5. STOP conditions

1. `role="group"` is not mapped by the accessibility dump (the node disappears).
   Then keep the viewport as a labelled `status` and record that only the card
   name changed; do not invent a role.
2. A card's `role="status"` produces no node. Investigate whether the nested
   `<text>` children swallow the role; the combobox trigger shows a `role` on a
   host `div` is mapped, so a failure means the card is not a host `div`.
3. A timer/dismiss case depends on the viewport role. Only the first case asserts
   it; update that assertion, not the component's behaviour.

## 6. Acceptance

- A pushed toast's status node is named by its title and description; the
  viewport is a named group.
- The strengthened case fails on the old shape.
- Gates pass; docs and inventory reflect the mechanism; plan indexed and
  `TODO.md` ticked.

## 7. Result

Executed on this host, 2026-10-18.

- Probe (deleted): before the change the only status node was the viewport,
  named `Notifications`; the message text sat in two unattached `label` nodes.
- `src/behaviour/toast.test.tsx`: **14/14 green**; the card's `role="status"` is
  named `Saved changes: 3 files` and the viewport reports `group`. With the
  viewport/card roles restored to the old shape the strengthened case fails
  (`expected 'status' to be 'group'`) and 13 pass.
- The suite count is unchanged (14): the first case was strengthened, not added,
  so the docs' stated count stays true.
- Docs and inventory state the per-card status and the named group. The runtime
  still cannot announce a live region; the accessible name is the strongest
  signal 0.10.0 exposes.
