# 627 — A dialog or drawer announces its description

**Phase:** F (accessible state channels) ·
**Workstream:** `components` (Tier 2 composition and feedback) ·
**Depends on:** 110, 112, 119, 309, 337, 383, 391, 392, 516, 608, 617 ·
**Number block:** 500–699 overflow; `627` is free in every worktree (checked
2026-10-19) ·
**Status:** planned

## 1. The gap

`DialogDescription` and `DrawerDescription` paint muted supporting copy, but
the runtimes' accessibility tree never receives it. GPUix 0.10.0 has no
`aria-labelledby`/`aria-describedby` (measured, `HostProps`; plans 112 §1c and
564), so the modal surface is named through the required `label` prop:

```tsx
<DialogContent label="Delete workspace">
  <DialogHeader>
    <DialogTitle>Delete this workspace?</DialogTitle>
    <DialogDescription>The workspace and its 42 files are removed for everyone.</DialogDescription>
  </DialogHeader>
```

A screen reader hears **“Delete workspace, dialog”** and nothing about the
consequence. The description is the reason a destructive confirmation is
understandable, and it is currently visual only.

The supported channel already exists: `aria-description` is in `HostProps`,
the harness reports it (`AriaNode.description`, `src/internal/a11y.ts`), and
the package already uses it for the avatar's presence state (plan 392), a
disabled control (plan 516) and the status lists (plan 626). It is simply not
wired for the modal shells.

Measured baseline (2026-10-19, this tree):

```text
nodesWithRole(renderer, "dialog")[0].description -> Option.none()
```

for an open `Dialog` whose header carries `DialogDescription`. The same holds
for `Drawer` and for `ConfirmDialog`, which renders its `description` prop
through `DialogDescription`.

## 2. Decision

A description part registers its plain text with its modal root; the surface
announces it through `aria-description`. This follows the same registration
rule Tabs used to name its panel from its trigger (plan 564): the part owns the
text, the root owns the channel.

- `internal/description.ts` — one small registry hook shared by Dialog and
  Drawer:
  - `register(text)` appends `{ id, text }` and returns an unsubscribe, so a
    conditionally removed description clears the channel and two descriptions
    cannot delete each other on unmount. The **first** registered description
    is announced.
  - the hook returns `description: string | undefined` and a stable
    `register` callback (created with `useCallback`).
- `Dialog`/`Drawer` roots hold the registry in their existing context. The
  context value gains `description` and `registerDescription`.
- `DialogDescription`/`DrawerDescription` read
  `controlName(rest["aria-description"], children)` (the shared plain-text
  helper from `internal/name.ts`, plan 391) and register it in an effect keyed
  on that text. A composed description therefore contributes its plain-text
  parts only; a caller can still author `aria-description` on the part.
- `DialogSurface`/`DrawerSurface` compute one value:
  `rest["aria-description"] ?? description` and pass it **after** `{...rest}`,
  so a caller's `aria-description` on the content wins. Passing `undefined`
  paints nothing, exactly as today.
- The existing `DialogDescription` visual style is unchanged.

No new public prop, no duplicate `description` prop on the content: the
compound part remains the source of truth. This is the smallest honest fix.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/components/src/internal/description.ts` | **new** — `useDescriptionRegistry` and its `DescriptionRegistry` interface |
| `packages/components/src/dialog.tsx` | context gains `description`/`registerDescription`; `DialogDescription` registers; `DialogSurface` paints `aria-description`; update the header comment's “known gaps” line to say the description is announced while the title is a heading |
| `packages/components/src/drawer.tsx` | same wiring in `DrawerContext`, `DrawerDescription`, the surface; update the header comment |
| `packages/components/src/behaviour/dialog.test.tsx` | two new cases (§5) |
| `packages/components/src/behaviour/drawer.test.tsx` | one new case |
| `packages/components/src/behaviour/confirm-dialog.test.tsx` | one new case proving the composed path |
| `packages/components/docs/dialog.mdx` | description/accessibility note; verification count 17 → 19 |
| `packages/components/docs/drawer.mdx` | description/accessibility note; verification count 15 → 16 (leave the separate close-guard suite's 18 alone) |
| `packages/components/docs/confirm-dialog.mdx` | one sentence that the description is announced; verification count 5 → 6 |
| `COMPONENTS.md` | Tier 2 rows for Dialogs (17 → 19), Drawers (15 → 16), Confirmation dialogs (5 → 6) plus one clause each |
| `TODO.md` | tick the new Tier 2 hardening task (§6) |
| `.agents/slop/plans/README.md` | index this plan as done once the gates pass |
| `PLAN.md` | extend D30's overflow-number trail with `627` |

## 4. Exact implementation

### 4.1 `src/internal/description.ts`

```ts
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useCallback, useRef, useState } from "react";

interface Entry {
  readonly id: number;
  readonly text: string;
}

/** The description a modal surface announces (no aria-describedby in 0.10.0). */
export interface DescriptionRegistry {
  /** The first description registered by a mounted part. */
  readonly description: string | undefined;
  /** Register one description part; returns its unsubscribe. */
  readonly register: (text: string) => () => void;
}

export const useDescriptionRegistry = (): DescriptionRegistry => {
  const nextId = useRef(0);
  const [entries, setEntries] = useState<ReadonlyArray<Entry>>([]);

  const register = useCallback((text: string) => {
    const id = nextId.current++;
    setEntries((current) => [...current, { id, text }]);
    return () => {
      setEntries((current) => Arr.filter(current, (entry) => entry.id !== id));
    };
  }, []);

  return {
    description: Option.getOrUndefined(
      Option.map(Arr.head(entries), (entry) => entry.text),
    ),
    register,
  };
};
```

### 4.2 Dialog root and surface

`DialogContextValue`:

```ts
interface DialogContextValue {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly description: string | undefined;
  readonly registerDescription: (text: string) => () => void;
}
```

In `Dialog`, after `useModalState`:

```ts
const { description, register: registerDescription } = useDescriptionRegistry();
const context = useMemo<DialogContextValue>(
  () => ({ open, setOpen, description, registerDescription }),
  [description, open, registerDescription, setOpen],
);
```

In `DialogSurface` destructuring add:

```ts
"aria-description": authoredDescription,
```

and on the `role="dialog"` div, after `{...rest}`:

```tsx
aria-description={authoredDescription ?? description}
```

`DialogDescription`:

```tsx
export const DialogDescription = ({
  "aria-description": authoredDescription,
  children,
  style,
  ...rest
}: Props) => {
  const theme = useTheme();
  const { registerDescription } = useDialogContext();
  const text = controlName(authoredDescription, children);
  useEffect(
    () => (text === undefined ? undefined : registerDescription(text)),
    [registerDescription, text],
  );

  return (
    <text
      {...rest}
      style={mergeStyles(
        { ...textStyle(theme, "body"), color: theme.colors.mutedForeground },
        style,
      )}
    >
      {children}
    </text>
  );
};
```

Import `useEffect` from React and `controlName` + `useDescriptionRegistry`.

### 4.3 Drawer

Mirror §4.2 exactly in `DrawerContext`, `Drawer`, `DrawerDescription`, and
`DrawerSurface`. The drawer's surface is the inner `role="dialog"` div; put the
attribute there, after `{...rest}`.

## 5. Test plan

Add to `src/behaviour/dialog.test.tsx`:

1. **“announces the description through aria-description”** — render
   `<Workspace defaultOpen />` (add an optional `defaultOpen`/`description`
   prop to the fixture only if needed; otherwise use the existing `Workspace`
   and `clickCentreOf(dialog, "open")`), then:

   ```ts
   expect(
     nodesWithRole(dialog.renderer, "dialog")[0].description,
   ).toEqual(Option.some("This cannot be undone."));
   ```

   This fails today with `Option.none()`.
2. **“a caller-authored aria-description wins on the content”** — render a
   `defaultOpen` dialog whose `DialogContent` carries
   `aria-description="Custom description"` and whose header also has a
   `DialogDescription`; expect the dialog node's description to be
   `Option.some("Custom description")`.

Add to `src/behaviour/drawer.test.tsx`:

3. **“announces the description through aria-description”** — the same
   assertion for the open drawer (`"Narrow the result set."`).

Add to `src/behaviour/confirm-dialog.test.tsx`:

4. **“announces the confirmation's description”** — open a `ConfirmDialog`
   whose `description` is unique, assert the dialog node carries it. This
   proves the composed path (`ConfirmDialog` renders `DialogDescription`) and
   not just the direct usage.

All four assertions use `nodesWithRole(renderer, "dialog")`, which already
exists; no harness change.

### Mutation proofs (run, record, revert)

- **M1** Remove `aria-description={authoredDescription ?? description}` from
  the Dialog surface → cases 1, 2 and 4 fail.
- **M2** Remove the registration effect from `DialogDescription` (keep the
  surface wiring) → case 1 and 4 fail; case 2 still passes (the authored value
  is independent), which is the point of the pin.
- **M3** Remove the Drawer wiring → case 3 fails.

Each mutation is applied to the working file, the three suites are run
scoped, the failure output is recorded in the commit message, and the file is
reverted.

### Commands and expected results

```sh
# while iterating — the three affected suites only
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/dialog.test.tsx src/behaviour/drawer.test.tsx src/behaviour/confirm-dialog.test.tsx
# expect: 3 files pass; Dialog 19, Drawer 16, Confirmation dialog 6

# unit suite stays unchanged in count, but must stay green (inventory/docs checks)
nub run --filter @gpuixui/components test
# expect: 45 files, 454 tests passed

# completion gate
nub run check
nub run lint
nub run test
```

The full native suite is the merge gate. At `HEAD` it carries the recorded
plan-540 binding failures; this change adds four passing cases and must not
increase that number.

## 6. STOP conditions

Stop and report rather than improvise if any of these happen:

- The a11y dump reports no `description` for an element carrying
  `aria-description` with `role="dialog"` even though the avatar/disabled cases
  report it. Record the a11y node and the exact element; do not add a second
  channel.
- The effect never flushes: the description stays absent after `a11yNodes`
  (which flushes). Do not add timers or `flushSync`; report the render order.
- Registration causes an update loop (React “Maximum update depth” or a
  render-count assertion) — the registry must be stable; report before
  redesigning.
- A test needs a `sleep` to see the description — that would mean the channel
  is not synchronous; STOP.
- TypeScript rejects `"aria-description"` in the destructured `Props` — report
  the installed type rather than casting.

## 7. Acceptance

- The three modal families announce their description in the real renderer,
  and an authored `aria-description` on the content wins.
- The three mutation proofs are recorded in the commit message, and the
  reverted tree passes.
- Docs pages state the new counts; `inventory.test.ts` passes (it checks the
  stated count against the suite and holds `COMPONENTS.md` to the records).
- `nub run check`, `nub run lint` and `nub run test` pass.
- `TODO.md` carries a ticked Tier 2 hardening row and the plan index is
  updated.
