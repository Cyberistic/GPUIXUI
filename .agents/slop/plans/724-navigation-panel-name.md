# 724 — The navigation panel is named by its trigger, not its value

**Owner:** components workstream · **Phase:** F (Tier 2 hardening) ·
**Depends on:** 110, 113, 117, 200, 201, 320, 391, 516, 564, 689

**Numbering:** `723` is claimed by tokens-theme
(`723-pressed-row-selection-wash`) and `720`/`721`/`722` are on this branch or
the playground's; `724` is the first number free across `main` and every worktree
on 2026-10-20. Recorded in `PLAN.md` D30.

## 1. Why

`NavigationMenuContent` hard-codes the panel's accessible name from the item's
internal value:

```tsx
<FloatingLayer role="group" aria-label={value} ...>
```

Measured on this host from `packages/components` (scratch probe, since deleted),
with the trigger text `Platform` and the item value `nav-platform-panel`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/zz-probe.test.tsx
# a11y nodes with the panel open:
#   button:"Platform"
#   group:"nav-platform-panel"      <-- the panel
```

The trigger is named `Platform` (the plain-text rule in `internal/name.ts`, plan
391) while the region it reveals is named `nav-platform-panel`. That name may be
an opaque id (`"nav-3"`, `"account.settings"`) that a screen-reader user cannot
map to the trigger they pressed, and 0.10.0 has no `aria-labelledby`, so
borrowing the trigger's name is the strongest supported alternative to the
missing relationship. This is exactly the defect plan 564 fixed for `TabsContent`
(`tabpanel` announced its value) and plan 689 fixed for menu groups.

The caller's `aria-label` already wins today (`{...rest}` follows the hard-coded
prop — measured: `group:"Platform menu"`), so the fix must keep that precedence.

Scope of this plan:

- the trigger registry carries each trigger's `controlName` beside its instance;
- `NavigationMenuContent` names itself from the matching trigger, falling back
  to the item's `value`;
- a caller `aria-label` on the panel still wins;
- a trigger whose plain text changes updates the panel name **without moving its
  position in the registry** (the plan-620 rule: registration cleanup must not
  remove and re-append a live row);
- three native tests, docs, `COMPONENTS.md` and the inventory counts synced.

**Out of scope** (do not add): `aria-labelledby`/`aria-controls` (absent from
0.10.0), naming an icon/composed trigger from anything but an authored
`aria-label`, a second `label` prop on `NavigationMenuContent` (`aria-label`
already expresses it), or changing the panel's open/dismiss behaviour.

## 2. What exists today (read these first)

- `packages/components/src/navigation-menu.tsx`:
  - `NavigationMenuContextValue` exposes `registerTrigger(value, instance)`,
    `triggerFor(value)`, `moveFocus`, `focusTrigger`;
  - the root keeps `triggerRef` instances in `triggers` (a ref `Map`) and the
    declared order in `order` state, updated by `registerTrigger`;
  - `NavigationMenuTrigger` renders the shared `Button`, which already names
    itself from `controlName(rest["aria-label"], children)` (plan 391);
  - `NavigationMenuContent` renders `aria-label={value}` then `{...rest}` (the
    caller wins), and uses the root's `triggerFor(value)` for placement and
    dismissal;
  - `navigationMenuMeta.limitations` records the measured runtime gaps.
- `packages/components/src/tabs.tsx` lines 600–690 and `TabsContent` — the
  proven pattern this plan follows: `register` appends a row, `updateRow`
  replaces it in place, and the panel prefers the caller's `aria-label`, then
  the trigger's `name`, then `value`.
- `packages/components/src/internal/name.ts` — `controlName`; the only name rule
  in the package.
- `packages/components/src/behaviour/navigation-menu.test.tsx` — 24 native
  cases; the host's pre-existing failures are the recorded plan-540 placement
  cases only. `internal/a11y.ts` exports `nodesWithRole`.
- `packages/components/docs/navigation-menu.mdx` — `## API` row for
  `NavigationMenuContent`, the Accessibility bullets, and the canonical
  `## Verification` line stating `(24 tests)`.

## 3. Exact changes

### 3.1 `packages/components/src/navigation-menu.tsx`

1. Imports: add `import * as Option from "effect/Option";`,
   `import * as Arr from "effect/Array";` and
   `import { controlName } from "./internal/name.js";`.

2. Replace the order state with rows that also carry the name. Above the root:

   ```ts
   /** One trigger in declaration order: its value and its visible name. */
   interface NavigationRow {
     readonly value: string;
     readonly name: Option.Option<string>;
   }
   ```

   In `NavigationMenu`, replace
   `const [order, setOrder] = useState<ReadonlyArray<string>>([]);` with
   `const [rows, setRows] = useState<ReadonlyArray<NavigationRow>>([]);`.

3. `NavigationMenuContextValue`: add

   ```ts
   /** Record a trigger's plain-text name without moving it in the registry. */
   readonly registerTriggerName: (
     value: string,
     name: string | undefined,
   ) => void;
   /** The registered trigger's name, when it has plain text. */
   readonly triggerName: (value: string) => Option.Option<string>;
   ```

4. `registerTrigger` keeps the instance ref but maintains the row list:

   ```ts
   const registerTrigger = useCallback(
     (value: string, instance: PublicInstance | null) => {
       if (instance === null) {
         triggers.current.delete(value);
         setRows((current) => Arr.filter(current, (row) => row.value !== value));
         return;
       }
       triggers.current.set(value, instance);
       setRows((current) =>
         Arr.some(current, (row) => row.value === value)
           ? current
           : [...current, { value, name: Option.none() }],
       );
     },
     [],
   );
   ```

5. Add the in-place name update, modelled on Tabs' `updateRow`:

   ```ts
   // A renamed trigger must not re-register: another register would append it
   // at the end and the next arrow key would skip its authored neighbour.
   const registerTriggerName = useCallback(
     (value: string, name: string | undefined) => {
       const next = Option.fromNullishOr(name);
       setRows((current) =>
         Arr.map(current, (row) =>
           row.value === value &&
           Option.getOrUndefined(row.name) !== Option.getOrUndefined(next)
             ? { value: row.value, name: next }
             : row,
         ),
       );
     },
     [],
   );

   const triggerName = useCallback(
     (value: string) =>
       Option.flatMap(
         Arr.findFirst(rows, (row) => row.value === value),
         (row) => row.name,
       ),
     [rows],
   );
   ```

   Note: `Arr.map` returning the same row objects keeps React from re-rendering
   when nothing changed; do **not** build an always-new array elsewhere.

6. `moveFocus` reads `rows` instead of `order` (same arithmetic, `rows[next]` is
   an object now):

   ```ts
   if (rows.length === 0) return;
   const index = Arr.findIndex(rows, (row) => row.value === value);
   ...
   const target = rows[next];
   if (target !== undefined) focusTrigger(target.value);
   ```

   Dependencies become `[focusTrigger, rows]`.

7. Add both new callbacks to the context value and its dependency array.

8. `NavigationMenuTrigger`: compute the name once and register it, with the
   instance mount and the name update in **separate** layout effects (Tabs'
   shape, which is what keeps the row in place):

   ```ts
   const name = controlName(rest["aria-label"], rest.children);

   useLayoutEffect(() => {
     if (instance === undefined) return;
     registerTrigger(value, instance);
     return () => registerTrigger(value, null);
   }, [instance, registerTrigger, value]);

   useLayoutEffect(() => {
     if (instance === undefined) return;
     registerTriggerName(value, name);
   }, [instance, name, registerTriggerName, value]);
   ```

   The mount effect must return its cleanup: `registerTrigger(value, null)`
   removes the row and the instance on unmount. The trigger already has an
   `instance` state for its ref; reuse it. Add the two context members to its
   destructuring and destructure `children` so the same value reaches `<Button>`
   and `controlName`.

9. `NavigationMenuContent`: destructure the caller's label and derive the name:

   ```ts
   export const NavigationMenuContent = ({
     children,
     style,
     onMouseDownOutside,
     "aria-label": label,
     ref,
     ...rest
   }: NavigationMenuContentProps) => {
     ...
     const panelName = Option.getOrElse(
       Option.firstSomeOf([
         Option.fromNullishOr(label),
         triggerName(value),
       ]),
       () => value,
     );
   ```

   and render `aria-label={panelName}` where `aria-label={value}` is today. The
   prop order does not change: `aria-label` is no longer in `rest`.

10. `navigationMenuMeta.limitations`: add
    `"0.10.0 has no `aria-labelledby`, so a panel borrows its trigger's visible label (the item's value when the trigger has no plain text); a caller `aria-label` wins"`.

### 3.2 `packages/components/src/behaviour/navigation-menu.test.tsx`

Extend the header comment with the bug (a panel announced its internal value).
Add one small fixture and three cases:

```tsx
/** One item whose panel name can be varied. */
const NamedPanel = ({
  value,
  trigger,
  panelLabel,
}: {
  readonly value: string;
  readonly trigger?: ReactNode;
  readonly panelLabel?: string;
}) => (
  <div style={{ padding: 20 }}>
    <NavigationMenu label="Product">
      <NavigationMenuList>
        <NavigationMenuItem value={value}>
          <NavigationMenuTrigger testId="trigger-named">
            {trigger ?? "Platform"}
          </NavigationMenuTrigger>
          <NavigationMenuContent
            testId="panel-named"
            {...(panelLabel === undefined ? {} : { "aria-label": panelLabel })}
          >
            <NavigationMenuLink testId="link-named">Overview</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </div>
);
```

1. **Names the panel by its trigger's plain text.** Open
   `<NamedPanel value="nav-platform-panel" />` by pressing the trigger; expect
   `nodesWithRole(nav.renderer, "group")` names to equal `["Platform"]`. This
   fails at `HEAD` with `["nav-platform-panel"]`.
2. **The caller's `aria-label` wins.**
   `<NamedPanel value="nav-platform-panel" panelLabel="Platform menu" />`;
   expect `["Platform menu"]`. Pins the precedence the docs promise.
3. **A trigger with no plain text falls back to the value.** Pass
   `trigger={<div testId="glyph" style={{ width: 8, height: 8 }} />}`; expect
   `["nav-platform-panel"]`. This pins the documented fallback; it passes at
   `HEAD` by accident, so it is a guard, not the failing case.
4. **A renamed trigger keeps its place and updates the panel.** A three-item
   fixture whose first trigger text comes from a prop: open the first panel,
   change the text while open, then assert (a) the group name follows the new
   text and (b) `End` from the renamed trigger still reaches `trigger-third`
   (the last authored trigger). A row that re-registered would move to the end,
   so `End` would land on the renamed trigger. Keep the assertion on
   `focusedTestId` — it is a native focus read this host delivers for a roving
   move.

Import `nodesWithRole`, `Arr` and `type ReactNode`.

### 3.3 `packages/components/docs/navigation-menu.mdx`

- `## API`: the `NavigationMenuContent` row becomes
  "anchored `role=\"group\"` panel named by its trigger (the item's `value` when
  the trigger has no plain text; a caller `aria-label` wins), rendered while
  open".
- `## Accessibility`: add a bullet: "The panel borrows its trigger's accessible
  name — 0.10.0 has no `aria-labelledby` — and falls back to the item's `value`
  when the trigger has no plain text (an icon-only trigger passes `aria-label`).
  A caller `aria-label` on the panel wins."
- `## Verification`: change `(24 tests)` to `(27 tests)` and add the four cases
  to the sentence list (the name cases plus the renamed-trigger case).

### 3.4 `COMPONENTS.md`

In the Navigation Menu row, insert the naming sentence after the panel/placement
text and change `24 native behaviour tests` to `27 native behaviour tests`.
Keep the row's existing limitation list otherwise untouched.

## 4. Test plan

Run from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/navigation-menu.test.tsx
```

Expected before the source change: **2 new cases fail** (case 1, `["Platform"]`
vs `["nav-platform-panel"]`, and case 4(a)/(b) on the re-append wiring), the
other two pass (case 3 is a guard, case 2 pins the existing precedence), and the
recorded plan-540 placement failures stay the only red cases in the file. Record
the exact totals in the plan/commit.

Measured on 2026-10-20 after the change on this host: **28 passed (28)** in
`navigation-menu.test.tsx` — 24 existing cases plus the four new ones, and the
two placement cases that had been red on earlier runs passed on this run
(recorded here rather than as a claim about other hosts).

**Both directions** (do all three, one at a time, reverting each):

1. Delete the `triggerName(value)` term from `panelName` → cases 1 and 4(a)
   fail (measured: 2 failed / 26 passed); restore.
2. Add `name` to the mount effect's dependency list, so the cleanup removes and
   re-appends the row → case 4(b) fails (measured: 1 failed / 27 passed);
   restore.
3. Remove the caller-label term → case 2 fails (measured: 1 failed / 27
   passed); restore.

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

The playground smoke registry has no Tier 2 navigation scenario (its rows are
GPUix primitives), so the native `TestRenderer` suite is the interaction
evidence. The two layer scenarios this change touches were re-run on 2026-10-20:

```sh
nub apps/playground/dist/smoke/run.js --only overlay-dialog
# ok overlay-dialog — 1/1 scenarios passed · overlay=verified
nub apps/playground/dist/smoke/run.js --only modal-focus-trap
# ok modal-focus-trap — 1/1 scenarios passed · modal=verified
```

## 5. STOP conditions

- Case 1 does not fail at `HEAD`: stop and re-measure — do not weaken it.
- `nodesWithRole(..., "group")` returns more than one node for the fixture:
  stop; the test must target the panel, not a menu group.
- The name update re-appends the row (case 4b red): stop and re-read §3.1(8) —
  separate mount and name effects are the contract.
- The fix needs a new prop, a second context, or a render-time registry write:
  stop; this is a registry value plus the existing name rule.
- A recorded plan-540 case changes state: stop and report which one.

## 6. Acceptance

- An open navigation panel is named by its trigger's visible text, not its
  internal value.
- A caller `aria-label` on the panel still wins; an icon/composed trigger falls
  back to the item's `value`.
- Renaming a trigger updates the panel without moving the trigger in the
  registry (`End` still reaches the last authored trigger).
- Navigation menu suite: all new cases pass — **28/28 measured on this host**;
  docs, `COMPONENTS.md`, the plan index, `TODO.md` and `PLAN.md` D30 agree on the
  counts.
