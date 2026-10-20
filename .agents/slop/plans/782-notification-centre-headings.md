# 782 — The notification centre's title and group labels are headings

**Status:** done 2026-10-20 — 4 native cases, all four red at `HEAD` (zero
headings; `testId` `undefined`), five mutation proofs; Notification centre
25 → 29 (`src/behaviour/notification-centre.test.tsx` 29/29), unit 504 in 47
files, full native suite 989 passed / 20 failed of 1009 — the same recorded
plan-540 binding classes as the pre-change run, `check`/`lint`/`test` exit 0.
**Workstream:** components. **Number claim:** `782` is the first free number
across every worktree — components last took `779`, tokens-theme and primitives
hold `780`/`781`; recorded in `PLAN.md` D30.

---

## 1. Why

Measured on 2026-10-20 in this worktree, against the installed
`@gpuix/react`/`@gpuix/native` 0.10.0 binding, with a scratch behaviour test
(`src/behaviour/scratch-782.test.tsx`, deleted before the commit) that mounted:

```tsx
<NotificationCentre notifications={seed} defaultOpen label="Notifications">
  <NotificationCentreTrigger />
  <NotificationCentreContent testId="panel">
    <NotificationCentreHeader>
      <NotificationCentreTitle />
    </NotificationCentreHeader>
    <NotificationCentreList testId="feed" />
  </NotificationCentreContent>
</NotificationCentre>
```

where `seed` is three notifications in two contiguous groups (`Today`, `Earlier`).
`a11yNodes` reported, in tree order:

| role | name | level |
| ---- | ---- | ----- |
| `label` | `Notifications` | — |
| `button` | `Notifications, 3 unread` | — |
| `label` | `Notifications` | — |
| `label` | `Today` | — |
| `label` | `Deploy finished` | — |
| `button` | `Deploy finished, unread` | — |
| `label` | `Review requested` | — |
| `button` | `Review requested, unread` | — |
| `label` | `Earlier` | — |
| `label` | `Invite accepted` | — |
| `button` | `Invite accepted, unread` | — |
| `region` | `Notifications` | — |

Three findings:

1. **The panel title is not a heading.** It is a loose `label`, although
   `docs/notification-centre.mdx` calls it "the panel heading" and every other
   section title in the library is a caller-levelled heading (`CardTitle` 3,
   `DialogTitle` 2, `DrawerTitle` 2, `EmptyState` 3, `KeyboardShortcutsGroup` 3
   — plans 617/726/630). A screen-reader user cannot jump to the inbox title or
   see where the panel sits in the outline.
2. **Group labels are not headings either.** `docs/notification-centre.mdx`
   says "`Today` is painted once before `a`" and "headings are skipped" by the
   arrow keys, but `flattenRows`' `NotificationHeaderRow` paints a plain
   `<text>`; a reader cannot jump between `Today` and `Earlier`.
3. **Neither part takes host props.** `NotificationCentreHeaderProps` and
   `NotificationCentreTitleProps` declare only `children`, so a caller's
   `testId`, `style`, `aria-label` or raw `aria-level` is dropped (measured:
   `findByTestId("header")` and `findByTestId("title")` were both `undefined`).
   Every sibling part extends `Props`, and the missing `testId` means the docs
   and a native suite cannot address the header or the title at all.

`role` and `aria-level` **are** supported by 0.10.0 (measured by the Card suite:
`role="heading"` + `aria-level` reports `{"role":"heading","level":3}`). This is
the same fix plan 726 applied to `EmptyState`, for the panel title, plus the
group labels the page already calls headings.

## 2. Files

| File | Change |
| ---- | ------ |
| `packages/components/src/notification-centre.tsx` | `Title` is a caller-levelled heading and takes `Props`; `Header` takes `Props`; `List` takes `groupLevel` and paints each group label as a heading; add the group-association limit to `notificationCentreMeta.limitations` |
| `packages/components/src/behaviour/notification-centre.test.tsx` | 4 new native cases (§4) |
| `packages/components/docs/notification-centre.mdx` | API table, accessibility section, verification count |
| `COMPONENTS.md` | Notification centre row: the two heading levels, the host props, the new native count |
| `TODO.md` | tick the task with the measured totals |
| `PLAN.md` | D30 number-claim sentence |
| `.agents/slop/plans/README.md` | this plan's index row |

`src/inventory.ts` needs no edit: `notificationCentreMeta` is read from the
module.

## 3. Implementation

### 3.1 `NotificationCentreTitle`

Replace the props interface and the component body with (Card's rule, plan 726):

```tsx
/** {@link NotificationCentreTitle} props. */
export interface NotificationCentreTitleProps extends Props {
  /** The heading level in the document outline. Default `3`. */
  readonly level?: HeadingLevel;
}

/** The panel's heading; its level belongs to the surrounding outline. */
export const NotificationCentreTitle = ({
  level,
  children,
  style,
  ...rest
}: NotificationCentreTitleProps) => {
  const theme = useTheme();
  const { label } = useNotificationCentre();

  return (
    <text
      role="heading"
      {...rest}
      aria-level={headingLevel(level, rest["aria-level"], 3)}
      style={mergeStyles(
        {
          ...textStyle(theme, "label"),
          color: theme.colors.foreground,
          flexGrow: 1,
        },
        style,
      )}
    >
      {children ?? label}
    </text>
  );
};
```

Rules, in order:

- `role="heading"` first, `{...rest}` second, so a caller's `role` opts out
  (the Card/EmptyState rule);
- the typed `level` wins, then a raw `aria-level`, then `3` — through the
  shared `headingLevel` helper, and the raw prop is **replaced** by the computed
  value so it can never land anywhere else;
- `style` merges last, so a caller keeps the last word;
- `children ?? label` is unchanged: an empty title still falls back to the
  root's label, and the `label` itself is required by the root's props.

`textStyle(theme, "label")` and `flexGrow: 1` stay: this is a role and API fix,
not a visual change.

### 3.2 `NotificationCentreHeader`

```tsx
/** {@link NotificationCentreHeader} props. */
export interface NotificationCentreHeaderProps extends Omit<Props, "children"> {
  readonly children?: PartChildren;
}

export const NotificationCentreHeader = ({
  children,
  style,
  ...rest
}: NotificationCentreHeaderProps) => {
  const theme = useTheme();
  assertParts(notificationCentreHeader, children);

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderBottomWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        },
        style,
      )}
    >
      {children}
    </div>
  );
};
```

No role is added: the header is a layout row, and `testId`/`style`/handlers are
the caller's.

### 3.3 `NotificationCentreList` group headings

Add to the props interface:

```tsx
  /** Each group label's heading level. Default `4`, one below the title. */
  readonly groupLevel?: HeadingLevel;
```

Destructure `groupLevel`, and in the header-row branch of the `rows` map render:

```tsx
<text
  key={row.key}
  role="heading"
  aria-level={groupLevel ?? 4}
  style={{
    ...textStyle(theme, "caption"),
    color: theme.colors.mutedForeground,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing["2xs"],
  }}
>
  {row.label}
</text>
```

Rules:

- **typed only.** A raw `aria-level` on the list would describe the container,
  not a heading, so it is not consulted; the prop is the caller's level.
- **default 4.** The title defaults to 3, so a group never outranks its panel;
  a caller who moves the title (`level={2}`) passes `groupLevel={3}` — the docs
  state that, because each part owns its own level (plan 617).
- no wrapper element and no `role="group"`: the rows stay direct children of
  the scroll viewport, so the measured reveal (`plan 644`) and the arrow walk
  are untouched.

### 3.4 Imports

```tsx
import { headingLevel, type HeadingLevel } from "./internal/heading.js";
```

`mergeStyles` and `textStyle` are already imported.

### 3.5 `notificationCentreMeta.limitations`

Append one entry:

```ts
    "a group label is a heading, not a labelled region: 0.10.0 has no `aria-labelledby`, so its rows are not associated with it",
```

## 4. Tests (native, `src/behaviour/notification-centre.test.tsx`)

Import `nodesWithRole` from `../internal/a11y.js` (Card's pattern). Define one
ungrouped fixture beside `seed`:

```tsx
/** Two ungrouped notifications, so the title is the only heading. */
const ungrouped: ReadonlyArray<NotificationItem> = [
  { id: "build", title: "Build passed" },
  { id: "sync", title: "Sync complete", read: true },
];
```

1. **`announces the panel title as a level-3 heading`** — open a centre over
   `ungrouped`; expect `nodesWithRole(renderer, "heading")` to be exactly one
   node named `"Notifications"` with `level` `Option.some(3)`. At `HEAD`: zero
   headings.
2. **`takes the title level from the caller`** — `level={1}` gives level 1;
   `level={2} aria-level={5}` gives level 2 (the typed prop wins); and
   `aria-level={5}` alone gives level 5 (the raw fallback the plan promises).
   At `HEAD`: zero headings in every case.
3. **`announces each group label as a heading below the title`** — open over
   `seed`; expect the headings, in tree order, to be
   `["Notifications", "Today", "Earlier"]` with levels `[3, 4, 4]`; then render
   the same fixture with `groupLevel={2}` and expect `[3, 2, 2]`. At `HEAD`:
   zero headings.
4. **`addresses the header and the title`** — render the header with
   `testId="inbox-header"` and the title with `testId="inbox-title"` plus
   `style={{ backgroundColor: "#FF0000" }}`; expect both `findByTestId` calls
   to be defined and the title's painted `style.backgroundColor` to be
   `"#FF0000"`. At `HEAD`: both `undefined` (props are dropped).

Run:

```sh
cd packages/components
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/notification-centre.test.tsx
```

Expected: `Test Files 1 passed`, `Tests 29 passed` (25 today + 4). Confirm the
printed number and use it in the docs and the inventory row walk in §5.

### 4.1 Both-direction proof (required)

Before the fix, run the four cases alone and record them red. After the fix,
prove each half is necessary:

| Mutation | Case that must fail |
| -------- | ------------------- |
| remove `role="heading"` from `NotificationCentreTitle` | 1 and 2 |
| drop the `aria-level` line from `NotificationCentreTitle` | 2 |
| remove `role="heading"` from the group `<text>` | 3 |
| hard-code group level 4 (ignore `groupLevel`) | 3 (`groupLevel={2}` half) |
| revert `Header`/`Title` to `{ children }` only | 4 |

## 5. Docs, inventory and `COMPONENTS.md`

`docs/notification-centre.mdx`:

- **API table** — `NotificationCentreHeader`: "children, host props";
  `NotificationCentreTitle`: "`children` (defaults to the root `label`),
  `level?` (default `3`), host props — a raw `aria-level` is honoured";
  `NotificationCentreList`: add "`groupLevel?` (default `4`)" to its props.
- **Groups** — after "A group label repeated after another run gets its own
  heading", add: "Each label is a real heading (`groupLevel`, default 4, one
  below the title), so a reader can jump between groups; the rows are not
  wrapped in a labelled region because 0.10.0 has no `aria-labelledby`."
- **Accessibility** — add: the panel title is `role="heading"` (default level 3,
  caller-levelled); if the caller moves the title, they should move
  `groupLevel` with it.
- **Verification** — the canonical line stays
  `src/behaviour/notification-centre.test.tsx runs in the real GPUix renderer (N tests):`
  with the count the run prints, and the case list gains "the panel title and
  each group label are headings with caller-owned levels, and the header and
  title are addressable".

`COMPONENTS.md`, Notification centre row: state the two heading levels and the
host props, and change `25 native behaviour tests` to the printed count (both
numbers are held by `src/inventory.test.ts`).

`src/notification-centre.tsx`'s meta `limitations` gains the entry in §3.5.

## 6. Verification

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/components
nub run --filter @gpuixui/components test:behaviour
nub run check
nub run lint
nub run test
```

Expected: the touched suite is 29/29 (or the printed count); the full native
suite is the previous baseline plus the four new passes — on 2026-10-20 that is
**989 passed / 20 failed of 1009** (the same recorded plan-540 binding classes;
re-diff, do not assume); `check`, `lint` and `test` exit 0 with the unit suite
one file unchanged (the pure model tests are untouched).

Scoped smoke: no playground scenario mounts a notification centre (the registry
is GPUix primitives plus the Tier 2 samples; `--list` confirms), so the
`TestRenderer` suite above is the native evidence. Do not run `--all`.

## 7. STOP conditions

- The a11y dump reports no `heading` role after adding `role="heading"` to a
  `<text>` node: stop — the Card suite's heading case is the control; if it also
  fails, the binding changed and this plan needs re-measurement.
- Any of the four cases still passes at `HEAD`: stop and re-read §1; the defect
  is not what this plan measured.
- `src/inventory.test.ts` complains about the docs count or the `COMPONENTS.md`
  row: fix the number in both, never the assertion.
- A fifth, unrelated failure appears in the suite: stop and report it; do not
  paper over it with a retry.

## 8. Acceptance

- Four new native cases, all failing at `HEAD` and passing after, with the five
  mutation proofs recorded in the commit message.
- Title and group labels are headings with caller-owned levels; `Header` and
  `Title` accept host props; the four documented rules in §3 hold.
- Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the plan index agree with
  the run.
- `check`, `lint` and `test` exit 0.
