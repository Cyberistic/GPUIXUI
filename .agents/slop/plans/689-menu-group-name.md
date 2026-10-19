# 689 — A menu group is named by its label

**Owner:** components workstream · **Phase:** F (accessibility consistency) ·
**Depends on:** 110, 114, 387, 391, 516, 625, 675

**Numbering:** `686`–`688` are claimed by the tokens workstream; this is the
first free number across every worktree, recorded in `PLAN.md` D30.

## 1. What is measured today

The Dropdown menu page promises:

> The group is a `role="group"`; `label` names it, or a `DropdownMenuLabel`
> above it does.

`ContextMenuLabel`/`ContextMenuGroup` share the same parts. Measured on this
host, in the real `TestRenderer`, with a dropdown containing four groups
(scratch suite, deleted before commit):

| Fixture | Accessible group name |
| ------- | --------------------- |
| `<MenuLabel>Appearance</MenuLabel>` followed by `<MenuGroup>` (label **above**) | `""` |
| `<MenuGroup><MenuLabel>Inside</MenuLabel> …</MenuGroup>` (label **inside**) | `""` |
| `<MenuGroup aria-label="Named group">` | `"Named group"` |
| `<MenuRadioGroup label="Sort by">` | `"Sort by"` |

So the prose is false in both readings of "above it": a sibling label does not
name the group, and neither does a label child, although `MenuGroup` accepts a
`MenuLabel` as a direct child. A screen-reader user hears anonymous groups
around named rows. The radio group is already correct because it takes `label`.

The same measurement also shows the API tables are wrong about one row: a
checkbox row's dumped role is `menuitemcheckbox`, while both pages document
`menuitem`.

## 2. The decision

Make the promise true in the form the parts already support: a `MenuLabel`
**inside** a `MenuGroup` names the group. Also accept a typed `label` prop for a
group that has no visible heading, matching `MenuRadioGroup`. Precedence is
explicit and documented:

1. a caller `aria-label` (the host prop always wins),
2. the group's `label` prop,
3. the first direct `MenuLabel` child's accessible text (its own `aria-label`,
   else its plain-text children),
4. otherwise the group stays unnamed rather than inventing a name.

A label *beside* a group is visual only; that is what the docs will say. Ordering
siblings would need a render-time association that React does not guarantee, so
it is not attempted.

## 3. Exact changes

### 3.1 `packages/components/src/menu/item.tsx`

1. Extend the React import with `Children`, `isValidElement` and
   `type ReactElement`; add `import * as Arr from "effect/Array";` and
   `import { controlName } from "../internal/name.js";`.
2. Replace `MenuGroupProps` and `MenuGroup` (currently the last part before the
   parts contract) with:

```tsx
/** A labelled group of rows. */
export interface MenuGroupProps extends Omit<Props, "children"> {
  /**
   * The group's accessible name. The first `MenuLabel` child names the group
   * when this is omitted; a caller `aria-label` wins over both.
   */
  readonly label?: string;
  readonly children?: PartChildren;
}

/** The text of the group's first direct `MenuLabel`, if it has one. */
const labelChildOf = (children: ReactNode): string | undefined =>
  Option.getOrUndefined(
    Option.flatMap(
      Arr.findFirst(
        Children.toArray(children),
        (child): child is ReactElement<Props> =>
          isValidElement(child) && child.type === MenuLabel,
      ),
      (label) =>
        Option.fromNullishOr(
          controlName(label.props["aria-label"], label.props.children),
        ),
    ),
  );

/** A labelled group of rows. */
export const MenuGroup = ({
  label,
  children,
  style,
  ...rest
}: MenuGroupProps) => {
  const theme = useTheme();
  assertParts(menuGroup, children);
  const name =
    rest["aria-label"] ?? controlName(label, []) ?? labelChildOf(children);
  return (
    <div
      role="group"
      {...rest}
      {...(name === undefined ? {} : { "aria-label": name })}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
        },
        style,
      )}
    >
      {children}
    </div>
  );
};
```

`controlName(label, [])` is the existing trim-or-undefined helper, so
`label=""` reads as absent. `MenuLabel` is declared above `MenuGroup` in this
file, so the reference is safe.

### 3.2 `packages/components/docs/dropdown-menu.mdx`

- Add a `## Groups and labels` section between `## Checkbox rows and tones` and
  `## Radio rows` showing a `DropdownMenuGroup` containing a
  `DropdownMenuLabel`, and stating the precedence above; note that a label
  beside the group is visual only.
- In `## Radio rows`, replace the false sentence with:
  `The group is a role="group"; its label prop names it. A DropdownMenuLabel placed beside it is visual only.`
- API table: `DropdownMenuCheckboxItem` renders `menuitemcheckbox`, not
  `menuitem`; `DropdownMenuGroup` takes `label?: string` (the first
  `DropdownMenuLabel` child is the fallback).
- Verification: `53 tests` → `56 tests`; add the group-naming case to the prose
  list.

### 3.3 `packages/components/docs/context-menu.mdx`

- API table: `ContextMenuCheckboxItem` renders `menuitemcheckbox`;
  `ContextMenuGroup` takes `label?: string` (first `ContextMenuLabel` child is
  the fallback).
- Accessibility section: one sentence stating the shared naming rule and that a
  label beside the group does not name it.

### 3.4 Inventory and records

- `COMPONENTS.md`, Dropdown menus row: `53 native behaviour tests` → `56 native
  behaviour tests`; append that a group is named by its `label` or its first
  label child (plan 689). Context menus row: note the shared rule.
- `TODO.md`, Tier 2 hardening list: add a ticked item for plan 689 with the
  measured defect, the case count and the files synced.
- `.agents/slop/plans/README.md`: index this plan.
- `PLAN.md` D30: append `689` to the claimed-number sentence (after `688`).

## 4. Test plan

`packages/components/src/behaviour/dropdown-menu.test.tsx` gains a
`describe("Menu groups")` block with three cases. Add a fixture at the bottom of
the file:

```tsx
const GroupedMenu = ({
  label,
  ariaLabel,
}: {
  readonly label?: string;
  readonly ariaLabel?: string;
}) => (
  <DropdownMenu defaultOpen>
    <DropdownMenuContent>
      <DropdownMenuGroup testId="group" label={label} aria-label={ariaLabel}>
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuItem testId="compact">Compact</DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);
```

1. **"names a group from its label child"** — render `GroupedMenu` with no
   props; assert `findByTestId("group")?.customProps?.["aria-label"]` is
   `"Appearance"` and `a11yNodes` contains a `group` named `Appearance`.
   *This fails at `HEAD` (the group is unnamed).*
2. **"names a group from its label prop"** — render with `label="View"`;
   assert the group's name is `"View"`. *Fails at `HEAD` because the prop does
   not exist (a type error); it also fails with the label derivation removed.*
3. **"keeps the caller's name over the child label"** — render with
   `label="View"` and `ariaLabel="Caller"`; assert `"Caller"`. This is the
   precedence pin: it fails if the order in §3.1 is inverted.

Both-direction proof: after the suite is green, delete the `name` computation in
`MenuGroup` (restore the old `<div role="group" {...rest}>`) and re-run; cases 1
and 2 fail and case 3 still passes. Revert.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`:

```sh
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/dropdown-menu.test.tsx
# expected: 56 passed (the file's 2 pre-existing plan-540 placement failures stay red;
# the new group cases pass)
```

On this host the suite reports `53 tests` with 2 plan-540 failures at `HEAD`.
Measured after the change (2026-10-19): **54 passed / 2 failed of 56**; the two
failures are the recorded plan-540 placement cases (a centred surface and a
right-edge submenu), and all three new group cases pass.

```sh
nub run --filter @gpuixui/components check-types
# expected: exit 0

nub run check && nub run lint && nub run test
# expected: exit 0 for all three
```

Do **not** run the full native behaviour suite for this change; the component
change is one part and the affected file is the gate. The release gate re-runs
everything.

Delete both scratch suites
(`src/behaviour/context-menu-edge.scratch.test.tsx`,
`src/behaviour/menu-label.scratch.test.tsx`) before committing.

## 6. STOP conditions

Stop and report instead of improvising if:

- the group is already named by its label child at `HEAD` (someone fixed it
  first — record the overlap and only correct the docs and the two role cells);
- the a11y dump does not expose a `group` node after the change (then the
  `aria-label` is on the wrong element; report the dumped tree);
- `MenuLabel` no longer accepts only plain-text children as names (a composed
  label is skipped, which is the documented rule — do not concatenate row text);
- `nub run check-types` fails outside the files above;
- any command cannot run (report the exact error; do not claim a pass).

## 7. Acceptance

- A `MenuGroup` (and therefore `DropdownMenuGroup`/`ContextMenuGroup`) is named
  by its `label`, else its first `MenuLabel` child; a caller `aria-label` wins.
- The measured a11y tree reports the group name; the two false docs claims are
  corrected and the checkbox role cells now match the dumped role.
- Three new native cases pass; cases 1 and 2 are proven to fail on the old
  source, case 3 pins precedence.
- `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 are synced; the
  scratch suites are deleted.
- Committed on `agent/components` and pushed; no file outside the components
  workstream is edited.
