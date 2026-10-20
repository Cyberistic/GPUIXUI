# 783 — A listbox option carries a name, in both listboxes

**Status:** done 2026-10-20 — 5 native cases + 2 pure cases; the three suites are
Combobox 67 → 69, Command menu 26 → 29, List 65 → 67 (`accessibility` stays 1);
unit 506 in 48 files; the full native suite is 996 passed / 20 failed of 1016 —
the same recorded plan-540 binding classes as the pre-change run; `check`,
`lint` and `test` exit 0. Seven mutation proofs in §4.5.
**Workstream:** components. **Number claim:** `783` is the first free number
across every worktree — components and primitives both took `782` in the same
tick (different slugs; recorded in `PLAN.md` D30).

---

## 1. Why

Measured on 2026-10-20 in this worktree, against the installed
`@gpuix/react`/`@gpuix/native` 0.10.0 binding, with a scratch behaviour test
(`src/behaviour/scratch-783.test.tsx`, deleted before the commit) that mounted
the real components open.

### 1.1 The command palette

```tsx
<CommandMenu actions={actions} open onOpenChange={() => {}}>
  <CommandMenuInput />
  <CommandMenuList />
  <CommandMenuEmpty />
</CommandMenu>
```

`a11yNodes` reported:

| role | name | selected |
| ---- | ---- | -------- |
| `textinput` | `Search commands` | — |
| `label` | `Navigation` | — |
| `listboxoption` | **`""`** | `true` |
| `label` | `File` | — |
| `listboxoption` | **`""`** | `false` |
| `listboxoption` | **`""`** | `false` |
| `label` | `↑↓ to navigate · ↵ to run · esc to close` | — |
| `dialog` | `Command menu` | — |

Three findings:

1. **Every row is unnamed.** `CommandMenuItem` draws `role="option"` with
   `aria-selected` but no `aria-label`, and 0.10.0 never lifts a `div`'s text
   child into its accessible name (measured for menu rows in plan 387 and for
   every example in plan 391). A reader hears "option, selected" three times.
2. **The match column is not a list.** The rows are orphan `option`s: there is
   no `role="listbox"` anywhere, so the collection has no name, no count and no
   structure.
3. **The group labels are loose `label` nodes.** `Navigation` and `File` are
   painted as `MenuLabel` siblings, not as `role="group"` names, so a row is not
   associated with the group it belongs to.

### 1.2 The combobox

```tsx
<Combobox options={options} defaultOpen>
  <ComboboxTrigger label="Pick" />
  <ComboboxContent>
    <ComboboxInput />
    <ComboboxList>…</ComboboxList>
  </ComboboxContent>
</Combobox>
```

`a11yNodes` reported `listbox:Options` (good) and `group:B` (good), but every
row was `listboxoption:""` — `ComboboxItem` sets `role="option"` and
`aria-selected` and no name. The collection and its groups are already named
(plan 395); its rows are not.

### 1.3 The selectable List

Adding `listboxoption` to the contract (§1.4) immediately reported **eight**
unnamed rows from the `list` example: `ListItem` draws `role="option"` when the
list is selectable, with `aria-selected`, and never a name. It is the third
listbox in the package and the same defect, so it belongs in this plan.

### 1.4 Why the contract missed it

`src/behaviour/accessibility.test.tsx` holds every example to "an interactive
node has a name", but its `INTERACTIVE_ROLES` list contains `"option"` — and the
dump spells it **`listboxoption`** (AccessKit's own name, which the helper
lowercases but does not map). The contract therefore never looked at a single
option row. Measured: with the role added to the list and the component fixes
absent, the contract reports the eight List rows; with the role removed it
passes while those rows are still unnamed. That is the hole, proven both ways.

The combobox and command-palette examples mount **closed**, so the contract sees
no rows there; their own behaviour suites are the evidence for those two (§4.2,
§4.3). A future example left open would now be covered too.

The docs do not currently claim option names (`docs/combobox.mdx`,
`docs/command-menu.mdx` and `docs/list.mdx` describe the rows as `role="option"`
with `aria-selected`), so this is an omission in all three components, not a
false page — but it is the one thing a screen reader needs first.

`role="listbox"`, `role="group"` and `aria-label` on an option **are** supported
by 0.10.0 (measured: a probe tree with all three reported
`listbox:Commands`, `group:Navigation`, `listboxoption:Go to Components`).

## 2. Files

| File | Change |
| ---- | ------ |
| `packages/components/src/internal/runs.ts` | **new** — the generic contiguous-run splitter, hoisted from `combobox/logic.ts` |
| `packages/components/src/internal/runs.test.ts` | **new** — 2 pure cases (§4.1) |
| `packages/components/src/combobox/logic.ts` | import `runsBy` from the shared module; delete the local `Run`/`sameGroup`/`runsBy` |
| `packages/components/src/combobox.tsx` | `ComboboxItem` names its row from `labelFor(value)` |
| `packages/components/src/list.tsx` | a selectable `ListItem` names its row: caller `aria-label`, then `textValue`, then its `ListItemTitle` |
| `packages/components/src/command-menu.tsx` | `CommandMenuItem` names its row; `CommandMenuList` becomes a named `listbox` of named groups; `label?` prop |
| `packages/components/src/behaviour/combobox.test.tsx` | 2 native cases |
| `packages/components/src/behaviour/command-menu.test.tsx` | 3 native cases |
| `packages/components/src/behaviour/list.test.tsx` | 2 native cases |
| `packages/components/src/behaviour/accessibility.test.tsx` | add `listboxoption` to `INTERACTIVE_ROLES` (the contract hole) |
| `packages/components/docs/combobox.mdx` | row naming + verification count |
| `packages/components/docs/command-menu.mdx` | listbox/groups/rows, `label` API, verification count |
| `packages/components/docs/list.mdx` | row naming + verification count |
| `COMPONENTS.md` | Combobox and Command menu rows: naming, counts |
| `TODO.md`, `PLAN.md` D30, `.agents/slop/plans/README.md` | bookkeeping |

## 3. Implementation

### 3.1 Hoist the run splitter

Create `src/internal/runs.ts`:

```ts
/**
 * Split a sequence into maximal contiguous runs of equal group names.
 *
 * Shared by every component that paints one heading per run (Combobox options,
 * command-palette actions): an interleaved group produces two runs, and an
 * absent or blank group is its own ungrouped run.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Match } from "effect";

/** One contiguous slice of a sequence sharing a group name. */
export interface Run<A> {
  readonly group: Option.Option<string>;
  readonly items: ReadonlyArray<A>;
  /** Index of the run's first item; ranking tie-breaks use it. */
  readonly from: number;
}

const sameGroup = (
  left: Option.Option<string>,
  right: Option.Option<string>,
): boolean =>
  Option.match(left, {
    onNone: () => Option.isNone(right),
    onSome: (name) => Option.exists(right, (candidate) => candidate === name),
  });

export const runsBy = <A>(
  items: ReadonlyArray<A>,
  groupOf: (item: A) => Option.Option<string>,
): ReadonlyArray<Run<A>> =>
  Arr.reduce(items, Arr.empty<Run<A>>(), (runs, item, index) => {
    const group = groupOf(item);
    return Option.match(Arr.last(runs), {
      onNone: () => [{ group, items: [item], from: index }],
      onSome: (run) =>
        sameGroup(run.group, group)
          ? Arr.append(Arr.dropRight(runs, 1), {
              ...run,
              items: Arr.append(run.items, item),
            })
          : Arr.append(runs, { group, items: [item], from: index }),
    });
  });
```

Move it **verbatim** from `combobox/logic.ts` (lines with `sameGroup`, `Run`,
`runsBy`) and import it there:

```ts
import { runsBy } from "../internal/runs.js";
```

`optionRuns`/`rowRuns` and every exported type stay in `combobox/logic.ts`, so
no consumer changes. `Match` is not needed in `runs.ts` — remove it from the
snippet above if the lint run says so.

### 3.2 `ComboboxItem` names its row

`ComboboxItem` already reads `labelFor` from the context. Pass the name to the
headless row beside the role:

```tsx
    <HeadlessItem
      value={value}
      role="option"
      aria-label={labelFor(value)}
      aria-selected={selected}
```

- `labelFor` resolves a normal option's `label` (falling back to its `value`), a
  **create** row's create label, and a missing option's value — one rule, so the
  create row is named `Create "…"` without a second branch.
- No caller override: the row's name is the option's data label, which is
  already the caller's value. `ComboboxItemProps` gains nothing.

### 3.2b `ListItem` names a selectable row

A selectable row gets the same treatment, in the row's own terms:

```tsx
  const name = selectable
    ? controlName(
        rest["aria-label"] ?? textValue ?? titleTextOf(children),
        children,
      )
    : undefined;
```

spread **after** `{...rest}`:

```tsx
        {...(name === undefined ? {} : { "aria-label": name })}
```

with one small helper beside the row:

```tsx
/** The first {@link ListItemTitle} child's plain text, if the row has one. */
const titleTextOf = (children: ReactNode): string | undefined =>
  Option.getOrUndefined(
    Option.map(
      Option.flatMap(
        Arr.findFirst(
          Children.toArray(children),
          (child): child is ReactElement<{ readonly children?: ReactNode }> =>
            isValidElement<{ readonly children?: ReactNode }>(child) &&
            child.type === ListItemTitle,
        ),
        (title) => Option.fromNullishOr(title.props.children),
      ),
      plainText,
    ),
  );
```

Rules:

- **selectable only.** A plain `ListItem` renders `role="listitem"`, whose
  content is read naturally; an `aria-label` there would *replace* the title and
  description with one string, so it is left alone (a caller's own `aria-label`
  still passes through `rest`);
- **priority:** the caller's `aria-label`, then `textValue` (the type-ahead
  label, already the row's one-line name in the example), then the title part's
  plain text, so a row without `textValue` is still named;
- **no state, no effect:** the title is a declared child, so the row names
  itself on render and a rename re-renders it.

### 3.3 `CommandMenuItem` names its row

```tsx
  const name = controlName(rest["aria-label"], action.label);
```

and in the JSX, **after** `{...rest}`:

```tsx
      {...rest}
      {...(name === undefined ? {} : { "aria-label": name })}
```

`controlName` is already imported by the module? — check; if not, import it from
`./internal/name.js`. A caller's `aria-label` wins and is trimmed; an empty
action label leaves the row unnamed rather than inventing text (it would fail
the contract, which is correct: a nameless command is a data bug).

### 3.4 `CommandMenuList`: a named listbox of named groups

Props:

```tsx
export interface CommandMenuListProps extends Omit<Props, "children"> {
  /** The match column's accessible name. Default `"Commands"`. */
  readonly label?: string;
}
```

Group helper in the module:

```tsx
/** An action's heading; an absent or blank group is ungrouped. */
const groupOfAction = (action: CommandAction): Option.Option<string> =>
  Option.filter(Option.fromNullishOr(action.group), (group) =>
    Str.isNonEmpty(Str.trim(group)),
  );
```

Body: the scrolling column becomes

```tsx
      <div
        testId="command-list"
        role="listbox"
        aria-label={label}
        style={{ …unchanged… }}
      >
        {Arr.map(runsBy(matches, groupOfAction), (run, index) => {
          const group = Option.getOrUndefined(run.group);
          return (
            <div
              key={`${group ?? "ungrouped"}-${index}`}
              {...(group === undefined
                ? {}
                : { role: "group", "aria-label": group })}
              style={{ display: "flex", flexDirection: "column" }}
            >
              {group === undefined ? null : (
                <MenuLabel>{group}</MenuLabel>
              )}
              {Arr.map(run.items, (action) => (
                <CommandMenuItem key={action.id} action={action} />
              ))}
            </div>
          );
        })}
      </div>
```

Rules:

- **the flat run wrapper** keeps every row in the same visual order, so the
  index-based highlight (`matches` order) and plan 530's row scroll are
  untouched;
- **`label`** names the listbox (`"Commands"` by default); the caller's `rest`
  still lands on the outer list wrapper, so its own `aria-label` names that
  region and does not fight this one;
- **one heading per contiguous run** is the same rule plan 395 applied to the
  combobox, now from one shared helper;
- **no `role="group"` on an ungrouped run** — a bare `div` is not announced, so
  the row is a direct option of the listbox in the accessibility tree.

Delete the now-unused `Fragment` import if nothing else uses it.

### 3.5 The contract sees option rows

In `src/behaviour/accessibility.test.tsx`, add to `INTERACTIVE_ROLES`:

```ts
  "listboxoption",
```

Keep `"option"` (a future binding may report ARIA's own name). Update the
header comment to record that AccessKit reports an option as `listboxoption`
(measured 2026-10-20), and that this is why plans 391/783 both extend the list
rather than trusting the ARIA spelling.

## 4. Tests

### 4.1 Pure — `src/internal/runs.test.ts` (2 cases)

1. **`splits on a change and repeats a group as two runs`** —
   `["a","b","a"]` with groups `A,B,A` yields three runs, each one item, with
   `from` `0/1/2`.
2. **`an absent group is its own run and joins its neighbours`** —
   `[none,"A","A",none]` yields `[none], [A,A], [none]`, with the middle run's
   `from` equal to 1.

### 4.2 Combobox — `src/behaviour/combobox.test.tsx` (2 cases)

Use `nodesWithRole(renderer, "listboxoption")` (the measured spelling).

1. **`names every option by its label`** — open the existing `Picker` over the
   four-option `options`; expect the names, in order, to be
   `["Calendar", "Camera", "Vacation", "Desk booking"]` and every `selected` to
   be `false`. At `HEAD`: four empty names.
2. **`names the create row by its create label`** — open a picker with
   `onCreate` and a `createLabel` (`(query) => `Create "${query}"``), type
   `"proj"` into the field through the suite's typing helper, and expect a row
   named `Create "proj"`. At `HEAD`: an empty name.

Run the count and use it in the page and the inventory row.

### 4.2b List — `src/behaviour/list.test.tsx` (2 cases)

Use `nodesWithRole(renderer, "listboxoption")`.

1. **`names a selectable row from its title`** — the suite's `catalog` (no
   `textValue`): expect `["Alpha", "Beta", "Gamma"]`. At `HEAD`: three empty
   names.
2. **`takes a row's name from textValue, and a caller's label over either`** —
   two rows, one `textValue="alpha-row"` over the title `Alpha`, one
   `aria-label="Beta row"`: expect `["alpha-row", "Beta row"]`. At `HEAD`: both
   empty.

### 4.3 Command palette — `src/behaviour/command-menu.test.tsx` (3 cases)

1. **`names every command row by its label`** — open the palette over the
   suite's actions; expect `listboxoption` names to contain `"Go to
   Components"`, `"New file"` and `"Save"` (in row order) and the highlighted
   row's `selected` to be `true`. At `HEAD`: every name is `""`.
2. **`names the match column, and the caller can rename it`** — expect one
   `listbox` named `"Commands"`; render a second palette with
   `<CommandMenuList label="Files" />` and expect the `listbox` named `"Files"`.
   At `HEAD`: no `listbox` at all.
3. **`names each contiguous group and keeps its rows inside it`** — the
   `Navigation`/`File` fixture: expect `nodesWithRole(renderer, "group")` names
   `["Navigation", "File"]`, and that each group's rows follow it in tree order
   (assert the row names and their selection state, not a child relationship the
   dump cannot express). At `HEAD`: zero groups.

### 4.4 The contract — `src/behaviour/accessibility.test.tsx`

No new case: the existing all-example case now sees `listboxoption`. Measured at
`HEAD` with only the role added: it reports the **eight** unnamed rows of the
`list` example (the combobox and command examples mount closed, so their rows
are covered by §4.2/§4.3). With the role removed again it passes while those
rows are still unnamed — the hole, both ways. After the fix it passes.

### 4.5 Both-direction proof (measured)

| Mutation | Cases that failed |
| -------- | ----------------- |
| remove `aria-label` from `ComboboxItem` | combobox 1–2 |
| remove the `aria-label` line from `CommandMenuItem` | command 1 |
| remove `role="listbox"` from the match column | command 2 |
| remove the group wrapper's `role`/`aria-label` | command 3 |
| remove the row's `aria-label` from `ListItem` | list 1–2, the all-example contract (8 rows) |
| remove `"listboxoption"` from `INTERACTIVE_ROLES` (List naming still absent) | the contract passed — the recorded hole |
| make the shared `runsBy` treat every item as its own run | 5 combobox group cases + the command group case |

## 5. Docs, inventory and `COMPONENTS.md`

`docs/combobox.mdx`:

- accessibility paragraph: "each option row is named by its `label` (a create
  row by its create label), so the listbox is announced as a named collection of
  named options"; keep the measured `aria-activedescendant` limitation.
- verification line: the count the suite prints, plus "rows named by their
  labels (including the create row)".

`docs/command-menu.mdx`:

- Accessibility: "the match column is a `role="listbox"` named `Commands` (or
  `label`), each contiguous group is a `role="group"` named by its heading, and
  each row is named by its action label".
- API: `CommandMenuList` → `label?: string` (default `"Commands"`), host props.
- Verification: the count and the three cases.

`docs/list.mdx`:

- Accessibility: "every selectable row is named by the caller's `aria-label`,
  else its `textValue`, else its `ListItemTitle`; a plain `listitem` keeps its
  content reading".
- Verification: the count (67) and the two cases.

`COMPONENTS.md`:

- **Comboboxes** row: "each option and the create row is named by its label";
  update the native count.
- **Command menus** row: "a named listbox of named options in named groups";
  update the native count.
- **Lists / list items** row: "a selectable row is named by `aria-label`,
  `textValue` or its title"; update the native count.

`src/inventory.ts` needs no edit (records are read from the modules); if a row's
limitations should mention that option rows are named, add it to the module's
`limitations` array, not here.

## 6. Verification

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/components
nub x vitest run --config packages/components/vitest.behaviour.config.ts src/behaviour/accessibility.test.tsx
nub x vitest run --config packages/components/vitest.behaviour.config.ts src/behaviour/combobox.test.tsx
nub x vitest run --config packages/components/vitest.behaviour.config.ts src/behaviour/command-menu.test.tsx
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components test:behaviour
nub run check
nub run lint
nub run test
```

Measured on 2026-10-20: Combobox 69/69, Command menu 28 passed / 1 failed of 29
(the recorded plan-530 scroll case), List 67/67, accessibility 1/1; unit 506 in
48 files (the two new `internal/runs.test.ts` cases); full native suite **996
passed / 20 failed of 1016** — the same 20 recorded plan-540 classes as the
pre-change run and no other file changed; `check`, `lint` and `test` exit 0.

Scoped smoke: no playground scenario mounts a combobox, command palette or
selectable list (the registry is GPUix primitives plus the Tier 2 samples —
confirm with `--list`), so the `TestRenderer` suites are the native evidence. Do
not run `--all`.

## 7. STOP conditions

- `nodesWithRole(renderer, "listboxoption")` returns nothing: stop and re-read
  the dump — AccessKit's spelling may have changed; adjust the role list only
  after re-measuring, and never widen the contract to a role that does not
  exist.
- `role="listbox"` on the match column is not reported: stop. Do not fake the
  structure with a `group`; the named listbox is the point.
- The grouped run wrapper breaks the highlight, plan 530's scroll or a
  selection: stop and revert the wrapper (name the rows first, then re-plan the
  grouping).
- The all-example contract reports unnamed nodes outside `combobox` and
  `command-menu`: stop and report them; do not add them to an allow-list.
- Any count in `inventory.test.ts` disagrees after the suites change: fix the
  page and the row, never the assertion.

## 8. Acceptance

- All three listboxes expose named options (`listboxoption` names are the
  visible labels, or the create label, or the row's title), the command palette
  is a named `listbox` whose grouped runs are named `group`s, and nothing else
  about them changed.
- The all-example contract covers `listboxoption` and fails at `HEAD` for the
  eight `list` rows, passes after.
- Five new native cases + 2 pure cases, the seven mutation proofs recorded in
  the commit message.
- Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the plan index agree with
  the run; `check`, `lint` and `test` exit 0.
