# 792 — Every painted role carries a name, and a selectable list and a tab rail get one

**Status:** done 2026-10-20 — 1 contract case (red at `HEAD` with `list: listbox`
×2 + `tabs: tablist`) + 3 `List` native cases (67 → 70); unit 509 in 48 files;
the full native suite is 1012 passed / 20 failed of 1032, the same recorded
plan-540 binding classes as the 1010/20 of 1030 baseline (+3 new, −1 merged
contract case). Both-direction and three mutation proofs in §4.
**Workstream:** components (`packages/components`).
**Number claim:** `792` is the first free number across every worktree —
`components` holds `790`, `playground` `791`, `tokens-theme` `789`,
`primitives` `785`, and nothing claims `792`. Record it in `PLAN.md` D30.
**Depends on:** 110, 111, 113, 117, 391, 564, 666, 783, 788, 790.

---

## 1. Why

Measured on 2026-10-20 in this worktree against the installed
`@gpuix/react`/`@gpuix/native` 0.10.0 binding, with a scratch behaviour test
(`src/behaviour/__probe.test.tsx`, deleted before the commit) that mounted the
real example registry and then six targeted trees.

### 1.1 The contract is a hand-written role list, so it keeps missing roles

`src/behaviour/accessibility.test.tsx` names the roles it checks. Plans 783 and
790 each found the same class of defect in it — AccessKit spells `option` as
`listboxoption` and `<input>` as `textinput`, so the rule silently never covered
those nodes. The list is still hand-maintained, and it is still incomplete.
Measured: the registry walk reports these roles across the 43 examples —

```
alert, button, form, group, heading, image, label, link, list, listbox,
listboxoption, listitem, multilinetextinput, navigation, region, tab, tablist,
tabpanel, textinput, window
```

and the contract covers none of `image`, `multilinetextinput`, `listbox`,
`tablist`, `form`, `group`, `heading`, `navigation`, `region` or `tabpanel`, and
lists ten roles nothing in the registry paints (`checkbox`, `combobox`, `radio`,
`searchbox`, `slider`, `switch`, `menuitem`, `menuitemcheckbox`,
`menuitemradio`, `option`, `textbox`, `img`). A spellings table is the wrong
instrument: **every** painted role except the two structural ones (`list`,
`listitem`) must carry a name, and the rule should be stated once.

`image` is the live proof: every `Avatar` and `Message` picture is an unnamed
candidate the contract cannot see, and no test would fail if one lost its name.

### 1.2 Two shipped examples paint an unnamed role root

With every role walked (the probe above), exactly three roots are unnamed — the
`list` example ships two selectable lists:

| example | role | name |
| ------- | ---- | ---- |
| `list` (recent files) | `listbox` | **`""`** |
| `list` (reviewers) | `listbox` | **`""`** |
| `tabs` | `tablist` | **`""`** |

All three roots carry named children — the list's options are named (plan 783) and
the tab triggers and panels are named (plans 391/564) — so a screen reader
announces "list box" and "tab list" with no subject.

### 1.3 The channel works; the parts are not wired

| tree | accessible name |
| ---- | --------------- |
| `<List selectionMode="single">` | `""` |
| `<List selectionMode="single" aria-label="Recent files">` | `Recent files` |
| `<List aria-label="Quick actions" onActivate={…}>` | `Quick actions` |
| `<TabsList>` | `""` |
| `<TabsList label="Account settings">` | `Account settings` |

So `TabsList` already has the `label` prop this work needs (its example simply
does not pass it), and `List` accepts only the raw `aria-label` host prop. The
component gap is the naming convenience: every other compound root that names a
region (`TabsList`, `TagInput`, `Fieldset`, `Field`, `MentionInput`,
`ColorPicker`, `TimePicker`) exposes `label`, and `List` is the exception.

## 2. Files

| File | Change |
| ---- | ------ |
| `packages/components/src/list.tsx` | `label?: string` on the shared root props; rendered before `{...rest}` so a caller `aria-label` wins, exactly like `TabsList` |
| `packages/components/examples/list.example.tsx` | name all three lists (`Recent files`, `Reviewers`, `Quick actions`) |
| `packages/components/examples/tabs.example.tsx` | `label="Settings sections"` on the unnamed rail |
| `packages/components/src/behaviour/accessibility.test.tsx` | replace the two role lists with one role-agnostic rule + `UNNAMED_BY_DESIGN` |
| `packages/components/src/behaviour/list.test.tsx` | 3 native cases (67 → 70) |
| `packages/components/docs/list.mdx` | `label` in the API table, the naming rule, verification count 67 → 70 |
| `packages/components/docs/tabs.mdx` | one sentence: the rail's `label` is its accessible name |
| `docs/component-api.md` | §5 naming rule: the contract is role-agnostic |
| `COMPONENTS.md` | Lists / list items + Tabs rows: the naming sentence and the list count |
| `TODO.md`, `PLAN.md` D30, `.agents/slop/plans/README.md` | bookkeeping |

No exported part or existing prop changes. `label` is additive and optional.

## 3. Implementation

### 3.1 `List.label`

In `ListBaseProps` (`src/list.tsx`), beside `dense`:

```ts
  /**
   * The list's accessible name. A caller `aria-label` wins, as everywhere else
   * (0.10.0 cannot name a role-bearing `div` from its text children, so an
   * unnamed listbox or list is announced as a bare "list box").
   */
  readonly label?: string;
```

Destructure it from `props` with the other non-host props and render it the way
`TabsList` does (`src/tabs.tsx` line 553), so precedence needs no rule of its
own:

```tsx
<div
  role={selectable ? "listbox" : "list"}
  {...(label === undefined ? {} : { "aria-label": label })}
  {...rest}
  …
```

`{...rest}` stays after the computed attribute, so a caller's `aria-label`
always wins. Do not import `internal/name.ts`: a list's name is not derived from
its rows (each row names itself), it is authored.

### 3.2 The examples name their roots

`examples/list.example.tsx`: add `label` to the three `<List>` roots —
`"Recent files"` (single, line 113), `"Reviewers"` (multiple, line 157),
`"Quick actions"` (plain activatable, line 185).

`examples/tabs.example.tsx`: `<TabsList label="Settings sections" testId="settings-tabs">`
(line 75). The card's heading is already "Account settings", so the rail's name
must say what the tabs switch, not repeat the heading.

### 3.3 One rule in the contract

Rewrite `src/behaviour/accessibility.test.tsx`:

```ts
/**
 * Roles that take their content from children, which AccessKit reports as
 * separate `label` nodes; ARIA requires no name for either, and naming a row
 * would repeat the text it already reads.
 */
const UNNAMED_BY_DESIGN: ReadonlyArray<string> = ["list", "listitem"];
```

`walkRoles` becomes `walkNodes`: it mounts every registered example and returns
`{ found, unnamed }` for every node whose role is not in `UNNAMED_BY_DESIGN`,
where `found` records `"<example>: <role>"` and `unnamed` records the same for an
empty name. One case replaces the two:

```ts
it("names every node that is not a structural list", () => {
  const { found, unnamed } = walkNodes();
  expect(found.length).toBeGreaterThan(0);
  expect(unnamed).toEqual([]);
});
```

Update the module header: the rule is role-agnostic, so a new role spelling
(`listboxoption`, `textinput`, `image`, `multilinetextinput`) cannot escape it —
the defect plans 783/790 patched twice. Keep the `found.length` guard so an empty
tree cannot pass.

Expected result at `HEAD` before the component change: the case fails with
exactly `["list: listbox", "list: listbox", "tabs: tablist"]` (measured, §1.2).

## 4. Tests

### 4.1 Contract — `src/behaviour/accessibility.test.tsx` (2 → 1 case)

The single case above. Fails at `HEAD` on the two examples in §1.2; passes after
§3.2.

### 4.2 `List` — `src/behaviour/list.test.tsx` (67 → 70)

`nodesWithRole` is already imported in this file.

1. **`names a selectable list from its label`** — render
   `<List label="Recent files" selectionMode="single">` with two rows; expect the
   one `listbox` node's name to be `"Recent files"`.
2. **`a caller aria-label wins over the label`** — `aria-label="Assigned reviewers"`
   with `label="Reviewers"`; expect `"Assigned reviewers"`. At `HEAD` this passes
   on the raw prop alone; it is the pin that the new attribute never overrides a
   caller.
3. **`names a plain list too`** — `<List label="Quick actions" onActivate={() => {}}>`;
   expect the one `list` node's name to be `"Quick actions"` (the plain root is
   `role="list"`, not `listbox`).

Cases 1 and 3 cannot run at `HEAD` — `label` is not a `ListProps` key, so they are
type errors before the change. Both-direction proof for them is the mutation in
§4.4, which is the honest form when the prop does not exist yet.

### 4.3 Both-direction proof (the contract)

```sh
cd packages/components
git stash push -- src/list.tsx examples/list.example.tsx examples/tabs.example.tsx
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/accessibility.test.tsx
# expected: 1 failed — ['list: listbox', 'list: listbox', 'tabs: tablist']
git stash pop
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/accessibility.test.tsx
# expected: 1 passed
```

### 4.4 Mutation proofs to record

| Mutation | Must fail |
| -------- | --------- |
| drop the `label` attribute from `List`'s root | list cases 1 and 3 |
| move the computed `aria-label` **after** `{...rest}` and pass a blank `aria-label` | list case 2 |
| drop `label` from the list example | contract: `list: listbox` ×2 |
| drop `label` from the tabs example | contract: `tabs: tablist` |
| add `"listbox"` to `UNNAMED_BY_DESIGN` | contract at `HEAD` (it silences the rule it should enforce) |

## 5. Docs, inventory and `COMPONENTS.md`

- `docs/list.mdx`
  - API table (`List` prop): `label` — "the list's accessible name (a caller
    `aria-label` wins)".
  - Accessibility: the root is a `listbox` in either selection mode and a `list`
    otherwise; it is named by `label`/`aria-label`, or announced as a bare "list
    box" — 0.10.0 cannot name a role-bearing `div` from its children.
  - Verification: **70 tests**, naming the three new cases.
- `docs/tabs.mdx`
  - The Accessibility list already says to pass `label` so the tab set has a
    name (line 214); add that the shipped example does, and that a caller
    `aria-label` wins.
- `docs/component-api.md` §5 "A part that draws an interactive role names
  itself": state that the contract walks **every** role except `list`/`listitem`,
  so a new role spelling is covered without editing it.
- `COMPONENTS.md`
  - **Lists / list items**: add "a listbox/list root is named by `label` (a
    caller `aria-label` wins)"; `67` → `70` native tests.
  - **Tabs**: note the rail is named by `TabsList.label`.
- `src/inventory.ts`: no `limitations` change needed; only the docs count moves.

## 6. Commands and expected results

Run from `packages/components` unless stated:

| Command | Expected |
| ------- | -------- |
| `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/__probe.test.tsx` | prints the unnamed list in §1.2; **delete the file before committing** |
| `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/accessibility.test.tsx` | 1 failed at `HEAD` (`list: listbox` ×2, `tabs: tablist`); 1 passed after §3.2 |
| `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/list.test.tsx` | 70 passed |
| `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/tabs.test.tsx` | 44 passed, unchanged |
| `nub run --filter @gpuixui/components test` | exit 0; unit count unchanged |
| `nub run check` | exit 0 (inventory, docs counts, exports, test-count guards) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |
| `nub run test:behaviour` (end-of-task check — the contract is cross-cutting) | record passed/failed/total; every failure must be one of the recorded plan-540 classes; expected total 1030 + 3 − 1 = 1032 with the same 20 recorded failures |

Scoped native smoke: the headless playground registry is GPUix primitives and
mounts no list or tabs example, so the `TestRenderer` suites above are the native
evidence. Record the ids if any playground scenario is run.

## 7. STOP conditions

Stop and report with evidence if any of these happen:

- the registry walk reports a role this plan does not name as `UNNAMED_BY_DESIGN`
  and it is unnamed — report it; **do not** widen the allowlist to make the case
  pass.
- AccessKit reports a role spelling differently from §1.1 on this binding —
  record it; the rule is role-agnostic, so only the allowlist would change.
- `list` or `tabs` reports a third unnamed node — name it in the audit, do not
  add it to the allowlist.
- a caller `aria-label` stops winning over `label` on `List` (attribute order).
- a previously green case outside the three touched files turns red.
- a new `List` case cannot be made to fail for the stated reason — report it.

## 8. Acceptance

- The contract walks every painted role except `list`/`listitem`, and it fails at
  `HEAD` with exactly the two measured examples.
- `List` takes `label`, a caller `aria-label` wins, and all three shipped lists
  and the settings tab rail are named.
- Three new native cases; docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` D30 and the
  plan index agree with the run.
- `nub run check`, `nub run lint` and `nub run test` exit 0.

## 9. Result (2026-10-20)

Implemented as planned; the only correction is the measured failure count.

- **Contract**: `UNNAMED_BY_DESIGN = ["list", "listitem"]` and one role-agnostic
  case replace the two hand-written role lists. Measured at `HEAD` (component and
  example sources stashed) it fails with exactly
  `['list: listbox', 'list: listbox', 'tabs: tablist']` — the `list` example
  ships two selectable lists, which the deduped probe had hidden — and passes
  after the four `label`s land.
- **`List`**: `label?: string` on the shared root props, rendered before
  `{...rest}` exactly like `TabsList`, so a caller `aria-label` wins.
- **Examples**: `Recent files`, `Reviewers`, `Quick actions` and
  `Settings sections`.
- **Tests**: `list.test.tsx` 67 → 70 (a selectable list named from `label`, a
  caller `aria-label` winning, a plain list named); accessibility 2 → 1.
- **Mutation proofs**: removing the root attribute fails the two `label` cases;
  moving the computed attribute after `{...rest}` fails the caller-wins case;
  dropping either example's label fails the contract with that example named.
- **Gates**: `nub run check` (with `oxfmt` applied), `nub run lint` and
  `nub run test` exit 0, unit 509 in 48 files.
- **Native suite**: 1012 passed / 20 failed of 1032 — the baseline's same 20
  plan-540 classes, no new failure. Headless smoke was not run: the playground
  registry mounts no list or tabs example, so it cannot exercise this change.
