# 696 — A caller ref reaches every part that owns one, including the late components

**Owner:** components workstream · **Phase:** F (API consistency) ·
**Depends on:** 110, 128, 136, 302, 315, 131, 135, 689

**Numbering:** `695` is the docs-site workstream's `695-blockquote-body-role.md`
and every number in `690`–`694` is claimed, so `696` is the first free number
checked across every worktree on 2026-10-19. Recorded in `PLAN.md` D30.

## 1. What is measured today

`src/internal/ref.ts` states the rule: a function component receives `ref` as an
ordinary prop, and a part that spreads its props onto a host **and** passes its
own `ref` silently discards the caller's, because the last `ref` wins. Plan 128
swept every part that existed then; plan 136 added the two it missed. The
components that landed after that sweep adopted `useMergedRef` in most places
(`Popover`, `DropdownMenu`, `NavigationMenu`, `NotificationCentre`, `Drawer`,
`Dialog`, `DatePicker`, `MessageScroller`, `ComboboxContent`/`List`/`Item`), but
four **public** parts still overwrite it:

| Public part | File / line today | What happens today |
| ----------- | ----------------- | ------------------ |
| `Carousel` | `src/carousel.tsx:152` | `{...rest}` carries `ref`, then `ref={root}` overrides it: the caller's ref stays `null` |
| `ContextMenuContent` | `src/context-menu.tsx:309` | `ref={surface}` after `{...rest}`: the caller's ref stays `null` |
| `ComboboxTrigger` | `src/combobox.tsx:580` | `{...rest}` comes **after** `ref={registerTrigger}`, so a caller's `ref` replaces the internal registration: the popup reads no trigger, and a press on its own trigger counts as an outside press (close then re-open) |
| `DropdownMenuSubContent`, `ContextMenuSubContent` | `src/menu/sub.tsx:440` | both alias `MenuSubContent`; `{...rest}` comes **after** `ref={setSurface}`, so a caller's `ref` replaces the internal surface. A press inside the level is then treated as outside and closes it before the row runs |

The four parts therefore fail in two directions: two lose the caller's ref, two
lose their own when the caller supplies one. Both are the same composition bug;
both are fixed by merging.

`ref` is part of the public prop type in every case:
`CarouselProps extends Omit<Props, "children">`, `ContextMenuContentProps` the
same, `ComboboxTriggerProps` extends GPUix's `Props`-derived trigger props, and
`MenuSubContentProps extends Omit<Props, "children">` (`Props` in
`@gpuix/react@0.10.0` declares `ref?: Ref<PublicInstance>`).

The failure is silent: the ref callback never runs and an object ref stays
`null`. A consumer cannot measure, focus, anchor to or address these parts, while
the same code works on every sibling part.

## 2. The decision

Compose, do not choose. Each of the four parts keeps its internal ref semantics
and hands the same instance to the caller through `useMergedRef`:

- `Carousel` — `setRoot = useMergedRef(root, ref)`; the key-ownership check keeps
  reading `root.current`, so the internal behaviour is unchanged.
- `ComboboxTrigger` — destructure `ref` out of `rest` and
  `setTrigger = useMergedRef(registerTrigger, ref)`; the combobox root still
  receives the instance through `registerTrigger`.
- `ContextMenuContent` — `setSurface = useMergedRef(surface, ref)`; the dismiss
  stack and nested-surface check keep reading `surface.current`.
- `MenuSubContent` — keep the local assignment to `surface.current` in an
  `attachSurface` callback, then `setSurface = useMergedRef(attachSurface, ref)`.
  One fix covers both public aliases.

No new API, no behaviour change, no public-type change: the documented `ref` now
does what its type says.

## 3. Exact changes

### 3.1 `packages/components/src/carousel.tsx`

Import `useMergedRef` from `./internal/ref.js`. Destructure `ref` in `Carousel`:

```tsx
export const Carousel = ({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  loop = false,
  label,
  children,
  style,
  ref,
  onKeyDown,
  ...
}: CarouselProps) => {
```

Build the merged callback once and use it on the root:

```tsx
const root = useRef<PublicInstance | null>(null);
const setRoot = useMergedRef<PublicInstance | null>(root, ref);
...
<div {...rest} ref={setRoot} ...>
```

### 3.2 `packages/components/src/combobox.tsx`

`useMergedRef` is already imported. Destructure `ref` in `ComboboxTrigger` and
merge it with the root's registration:

```tsx
const setTrigger = useMergedRef<PublicInstance | null>(registerTrigger, ref);
...
<HeadlessTrigger
  ...
  ref={setTrigger}
```

### 3.3 `packages/components/src/context-menu.tsx`

`useMergedRef` is already imported. Destructure `ref`, then:

```tsx
const setSurface = useMergedRef<PublicInstance | null>(surface, ref);
...
<MenuSurface
  {...rest}
  ref={setSurface}
```

### 3.4 `packages/components/src/menu/sub.tsx`

`useMergedRef` is already imported. Destructure `ref` in `MenuSubContent`, keep
the local assignment that the nested-surface rules read, and expose the merged
callback to `MenuSurface`:

```tsx
const attachSurface = useCallback((next: PublicInstance | null) => {
  surface.current = next;
}, []);
const setSurface = useMergedRef<PublicInstance | null>(attachSurface, ref);
```

(replacing the current `setSurface` callback at §1's line 334; its body only
assigns `surface.current`). The `MenuSurface ref={setSurface}` call is unchanged.

### 3.5 Tests (write first, prove they fail at `HEAD`)

One native case per public part; each asserts the caller's ref **and** that the
internal ref still works, so a fix cannot pass by dropping the internal one.

`packages/components/src/behaviour/carousel.test.tsx`:

```tsx
it("feeds both the internal and the caller's root ref", () => {
  const ref = createRef<PublicInstance>();
  const carousel = renderComponent(
    <div style={{ width: 480 }}>
      <Carousel ref={ref} testId="carousel" label="Screenshots">
        <CarouselTrack testId="track">
          <CarouselSlide testId="slide-0"><text>One</text></CarouselSlide>
          <CarouselSlide testId="slide-1"><text>Two</text></CarouselSlide>
        </CarouselTrack>
      </Carousel>
    </div>,
  );

  expect(ref.current?.id).toBe(
    carousel.renderer.findByTestId("carousel")?.id,
  );

  // The internal ref still owns the keyboard: the root must be the focused
  // element for ArrowRight to step (plan 614).
  carousel.renderer.focusElement(
    carousel.renderer.findByTestId("carousel")?.id ?? -1,
  );
  carousel.renderer.simulateKeystrokes("right");
  expect(carousel.renderer.findByTestId("slide-1")?.style.visibility).not.toBe(
    "hidden",
  );

  carousel.unmount();
});
```

`packages/components/src/behaviour/combobox.test.tsx` — a small fixture with a
`triggerRef` prop, plus:

```tsx
it("feeds both the internal and the caller's trigger ref", async () => {
  const ref = createRef<PublicInstance>();
  const onOpenChange = vi.fn();
  const picker = renderComponent(
    <Picker triggerRef={ref} onOpenChange={onOpenChange} />,
  );

  expect(ref.current?.id).toBe(
    picker.renderer.findByTestId("combobox-trigger")?.id,
  );

  await open(picker);
  onOpenChange.mockClear();
  clickCentreOf(picker, "combobox-trigger");
  await settle();

  // Without the internal registration the press counts as outside: the popup
  // closes then the release's click re-opens it.
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(onOpenChange).not.toHaveBeenCalledWith(true);

  picker.unmount();
});
```

`packages/components/src/behaviour/context-menu.test.tsx` — extend `ProjectRow`
with a `contentRef` prop, then:

```tsx
it("feeds both the internal and the caller's content ref", () => {
  const ref = createRef<PublicInstance>();
  const row = renderComponent(<ProjectRow contentRef={ref} onSelect={vi.fn()} />);
  const origin = rowOrigin(row);
  rightClickAt(row, origin.x + 40, origin.y + 40);

  expect(ref.current?.id).toBe(row.renderer.findByTestId("menu")?.id);

  // The internal surface ref still drives dismissal.
  row.renderer.simulateKeystrokes("escape");
  expect(row.renderer.findByTestId("menu")).toBeUndefined();

  row.unmount();
});
```

`packages/components/src/behaviour/dropdown-menu.test.tsx` — give `WithSubmenus`
an optional `submenuRef`, open the Share submenu, press a row **inside** it, and
assert:

```tsx
it("feeds both the internal and the caller's submenu ref", () => {
  const ref = createRef<PublicInstance>();
  const onSelect = vi.fn();
  const menu = renderComponent(
    <WithSubmenus submenuRef={ref} onSelect={onSelect} />,
  );
  clickCentreOf(menu, "trigger");
  clickCentreOf(menu, "share");

  expect(ref.current?.id).toBe(menu.renderer.findByTestId("submenu")?.id);

  // Without the internal surface ref the press is "outside": the level closes
  // before the row runs (plan 389's rule, measured with a caller ref).
  clickCentreOf(menu, "copy-link");
  expect(onSelect).toHaveBeenCalledTimes(1);

  menu.unmount();
});
```

At `HEAD` the Carousel and ContextMenu cases fail on `ref.current` being
`null`; the Combobox and Submenu cases fail on the internal behaviour, because
the caller's ref replaced it. Both directions fail for the reason the table in
§1 records. `ContextMenuSubContent` shares `MenuSubContent`, so the dropdown
case holds the fix for both aliases; the context-menu page documents the shared
rule.

### 3.6 Docs, inventory and counts

- `packages/components/docs/carousel.mdx` — API row: `ref?: Ref<PublicInstance>`
  (composed with the root's internal ref). Verification `20 tests` → `21`.
- `packages/components/docs/combobox.mdx` — trigger API row: add
  `ref?: Ref<PublicInstance>` (composed with the root's registration).
  Verification `54 tests` → `55`.
- `packages/components/docs/context-menu.mdx` — `ContextMenuContent` row: add
  the composed `ref`; note that `ContextMenuSubContent` shares `MenuSubContent`.
  Verification `21 tests` → `22`.
- `packages/components/docs/dropdown-menu.mdx` — `DropdownMenuSubContent` row:
  add the composed `ref`. Verification `56 tests` → `57`.
- `COMPONENTS.md` — Carousel row `20` → `21` and a clause that the caller's root
  ref composes; Context menus `21` → `22`; Comboboxes `54` → `55`; Dropdown
  menus `56` → `57`; each with a short "caller ref composed" clause.
- `TODO.md` — one ticked hardening entry under the Tier 2 list.
- `.agents/slop/plans/README.md` — index this plan.
- `PLAN.md` D30 — record that `696` is the next number after `695`.

## 4. Test plan

- **Can the tests fail?** Yes, in both directions: Carousel and ContextMenu fail
  because `ref.current` is `null`; Combobox and Submenu fail because the caller's
  ref replaced the internal registration and the popup/level misbehaves. Record
  the four failures before applying §3.1–§3.4.
- **Both-direction proof:** after the fix, revert one part at a time (for the
  inverse cases, put `{...rest}` back after the own `ref`) and confirm exactly
  that suite's new case fails; restore.
- **No regression:** the four affected suites (`carousel`, `combobox`,
  `context-menu`, `dropdown-menu`) keep their other results — including the
  recorded plan-540 binding failures (combobox's ring-after-focus cases, the
  dropdown's centred/right-edge placement cases), which are unchanged by this
  plan.
- `check-types`, `check`, `lint`, `test` pass.

## 5. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/carousel.test.tsx \
  src/behaviour/combobox.test.tsx \
  src/behaviour/context-menu.test.tsx \
  src/behaviour/dropdown-menu.test.tsx
# before: 4 new cases fail (2 on a null caller ref, 2 on the lost internal ref)
# after: 151 passed / 4 failed of 155 — the four are the recorded plan-540
# binding failures (Carousel focus ring; Context menu right-edge submenu;
# Dropdown centred surface and right-edge submenu), unchanged by this plan
```

Then, from the worktree root:

```sh
nub run check-types
nub run check        # includes the inventory/docs count check
nub run lint
nub run test         # unit suite, no native binding needed
```

## 6. STOP conditions

- A part's prop type deliberately omits `ref` (for example `CommandMenuInput`
  takes no host props): stop and record it; do not add a ref the public type does
  not promise.
- `useMergedRef` cannot be used because the internal `ref` is an object ref the
  part mutates *during render*: stop and report the file and line; do not replace
  the internal mechanism.
- A new test passes at `HEAD`: stop and report the measured tree, because either
  the ref is already composed or the test asserts the wrong node.
- The `MenuSurface` call cannot take a callback ref without changing its public
  props: stop and report; do not edit `MenuSurface`'s contract.

## 7. Acceptance

- `Carousel`, `ComboboxTrigger`, `ContextMenuContent`, `DropdownMenuSubContent`
  and `ContextMenuSubContent` each hand the caller their host instance, with the
  internal behaviour (key ownership, opening, dismissal, submenu registration)
  unchanged.
- Four native cases fail at `HEAD` and pass after the change; each also pins the
  internal behaviour.
- Docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 agree with
  the code and the new counts (Carousel 21, Combobox 55, Context menu 22,
  Dropdown menu 57).
