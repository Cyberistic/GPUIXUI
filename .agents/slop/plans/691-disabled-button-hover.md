# 691 — A disabled button never paints a caller's hover

**Owner:** components workstream · **Phase:** F (interaction consistency) ·
**Depends on:** 110, 112, 114, 200, 305, 393, 394, 516

**Numbering:** `690` is claimed twice across the worktrees (the docs
`live-image-source-pixels` plan and the tokens `platform-variant-owner` plan), so
this is the first free number. Recorded in `PLAN.md` D30.

## 1. What is measured today

`internal/button.tsx` clears the *variant's* hover and press diffs when a control
is disabled (`disabledStyle`, plan 394), but a caller's `style` merges **last**.
`NavigationMenuLink` always hands `Button` its own `hover` refinement:

```tsx
<Button
  {...rest}
  variant="ghost"
  style={mergeStyles(
    { ..., hover: { backgroundColor: theme.colors.accent, ... } },
    style,
  )}
/>
```

`NavigationMenuLink` accepts the full button props, including `disabled`, and the
docs call it "a full-width button row" with "button props". Measured on this
host in the real `TestRenderer` (scratch suite, deleted before commit), with one
enabled and one disabled link in an open panel:

| Link | `style.cursor` | `style.hover` |
| ---- | -------------- | ------------- |
| enabled | `pointer` | accent/wash refinement |
| **disabled** | `not-allowed` | **the same accent/wash refinement** |

So a disabled navigation link is inert to the pointer (no handler, no tab stop)
but still lights up with the enabled hover fill. That contradicts the package's
own disabled rule, stated in `COMPONENTS.md`, `internal/button.tsx`, plan 394 and
the disabled-description suite: **disabled means inert — no hover, no press, no
ring, no tab stop.** The fill suggests a control that cannot be pressed is live.

The defect is not only in `NavigationMenuLink`. Any wrapper that passes a
`style` carrying `hover`/`active` to a disabled `Button`/`IconButton` reintroduces
the feedback, because the shared control has no final guard after the merge.

## 2. The decision

Enforce the rule once, in the shared control: after the base style and the
caller's style are merged, a disabled `Button` or `IconButton` drops the
`hover` and `active` refinements. The public `style` prop still wins for every
static value — colour, size, radius, opacity, cursor — because only the two
interaction diffs describe a gesture the control refuses.

This is deliberately central rather than a `NavigationMenuLink` patch:

- the invariant is the shared control's, and every button-shaped part inherits
  it;
- a future wrapper cannot silently reintroduce the defect;
- the existing plan-394 promise becomes unconditional instead of "unless a
  wrapper passes a hover".

A caller who passes `hover` on a disabled control keeps every other part of that
style; there is no supported use for an interaction fill on an inert control.

## 3. Exact changes

### 3.1 `packages/components/src/internal/button.tsx`

Add, immediately after `disabledStyle`:

```ts
/**
 * Strip interaction diffs a caller's `style` may reintroduce. `disabledStyle`
 * clears the variant's own hover/press, but the caller's style merges last, and
 * a wrapper that always supplies a hover would otherwise light an inert control
 * (plan 691).
 */
const inertInteraction = (disabled: boolean, resolved: StyleDesc): StyleDesc =>
  disabled ? { ...resolved, hover: undefined, active: undefined } : resolved;
```

Then wrap the merged style in both controls:

- `Button`: `style={inertInteraction(disabled, mergeStyles({ ... }, style))}`
- `IconButton`: the same around its existing merge.

No other change: activation, tab order and the disabled description already
handle the rest.

### 3.2 `packages/components/src/behaviour/button.test.tsx`

Add one case after "carries no hover or press fill while disabled":

```tsx
it("strips a caller's interaction style while disabled", () => {
  // A wrapper's own hover must not survive the merge on an inert control
  // (plan 691).
  const pair = renderComponent(
    <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
      <Button
        testId="disabled"
        disabled
        style={{
          hover: { backgroundColor: darkTheme.colors.accent },
          active: { backgroundColor: darkTheme.colors.active },
        }}
      >
        Save
      </Button>
      <Button
        testId="enabled"
        style={{
          hover: { backgroundColor: darkTheme.colors.accent },
          active: { backgroundColor: darkTheme.colors.active },
        }}
      >
        Save
      </Button>
    </div>,
  );

  const disabled = pair.renderer.findByTestId("disabled")?.style;
  const enabled = pair.renderer.findByTestId("enabled")?.style;

  expect(disabled?.hover).toBeUndefined();
  expect(disabled?.active).toBeUndefined();
  expect(enabled?.hover).toBeDefined();
  expect(enabled?.active).toBeDefined();

  pair.unmount();
});
```

*Fails at `HEAD`: the disabled style carries the caller's hover and active.*

### 3.3 `packages/components/src/behaviour/navigation-menu.test.tsx`

Add one case after "ignores arrow keys on a disabled trigger and still forwards
the caller's":

```tsx
it("keeps a disabled link inert, including its hover", () => {
  const onSelect = vi.fn();
  const nav = renderComponent(
    <NavigationMenu label="Product" defaultValue="platform">
      <NavigationMenuList>
        <NavigationMenuItem value="platform">
          <NavigationMenuTrigger testId="trigger-platform">
            Platform
          </NavigationMenuTrigger>
          <NavigationMenuContent testId="panel-platform">
            <NavigationMenuLink
              testId="link-runtime"
              disabled
              onSelect={() => onSelect("runtime")}
            >
              Runtime
            </NavigationMenuLink>
            <NavigationMenuLink
              testId="link-overview"
              onSelect={() => onSelect("overview")}
            >
              Overview
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>,
  );

  const disabled = nav.renderer.findByTestId("link-runtime");
  const enabled = nav.renderer.findByTestId("link-overview");

  expect(disabled?.style.hover).toBeUndefined();
  expect(disabled?.style.cursor).toBe("not-allowed");
  expect(disabled?.customProps?.["aria-description"]).toContain("Disabled");
  expect(enabled?.style.hover).toBeDefined();

  clickCentreOf(nav, "link-runtime");
  expect(onSelect).not.toHaveBeenCalled();

  clickCentreOf(nav, "link-overview");
  expect(onSelect).toHaveBeenCalledTimes(1);

  nav.unmount();
});
```

*Fails at `HEAD` on the first assertion (the disabled link carries a hover); the
enabled link and the press pin are the contrast controls.*

### 3.4 `packages/components/docs/navigation-menu.mdx`

- API row: `NavigationMenuLink` — "a full-width button row; `disabled` makes it
  inert (out of the tab order, no hover/press, announces `Disabled`)".
- Accessibility section: state that a disabled link keeps every static style but
  drops the interaction fill, and that the guard lives in the shared button so a
  wrapper's own `hover` cannot reintroduce it.
- Verification: `22 tests` → `23 tests`; add the disabled-link case to the prose
  list.

### 3.5 Inventory and records

- `COMPONENTS.md`, Navigation Menu row: `22 native behaviour tests` → `23`; append
  that a disabled link is inert including its hover (plan 691).
- `TODO.md`, Tier 2 hardening list: add a ticked entry for plan 691 with the
  measured defect, the two test counts and the files synced.
- `.agents/slop/plans/README.md`: index this plan.
- `PLAN.md` D30: append `691` to the claimed-number sentence (after 690).
- No inventory record changes: the `navigationMenuMeta` limitations remain true,
  and the test file/name are unchanged.

## 4. Test plan

- **Can the new tests fail?** Yes. At `HEAD`, `Button`'s disabled style carries the
  caller's hover/active and `NavigationMenuLink`'s disabled link carries the accent
  hover, so the two new cases fail on their first interaction assertions. The
  enabled-link assertions and the enabled-button pin pass before and after, so the
  tests cannot pass by stripping interaction styles everywhere.
- **Both-direction proof:** record the two failing cases at `HEAD`; apply §3.1;
  re-run both files and the plan-394 disabled suite. Then remove
  `inertInteraction` from `Button` and confirm the new Button case fails; restore.
- **No regression:** the full behaviour suite must stay at its recorded count
  plus these cases (the plan-540 binding failures are unchanged).

## 5. Commands and expected results

Run from `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/button.test.tsx
# before §3.1: 1 new case fails; after: all pass
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/navigation-menu.test.tsx
# before §3.1: the new case fails; after: all pass (23 tests)
nub run check-types
# exit 0
```

From the worktree root:

```sh
nub run --filter @gpuixui/components test
# exit 0, unit count unchanged + the inventory's docs-count check
nub run check
# exit 0
```

Run the full behaviour suite once before committing if time allows; report the
recorded plan-540 failures separately, never as green.

## 6. STOP conditions

- A native test cannot render two links in an open panel (the root/window rule):
  stop and report the fixture error rather than moving the assertion to an
  internal helper.
- `mergeStyles` does not accept `hover: undefined` (a type error): stop and report
  the exact error rather than casting.
- The fix changes a painted style outside disabled controls: stop, because
  `inertInteraction` must be a no-op when `disabled` is false.

## 7. Acceptance

- A disabled `Button`/`IconButton` never exposes a `hover` or `active` diff, even
  when the caller's style supplies one.
- A disabled `NavigationMenuLink` paints no hover, keeps `not-allowed`, announces
  `Disabled`, stays out of the tab order and runs nothing on press; an enabled
  link is unchanged.
- Docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 agree with
  the code and the new counts.
