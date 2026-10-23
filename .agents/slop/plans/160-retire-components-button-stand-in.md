# 160 — Retire the components package's local Button stand-in

**Owner:** components · **Size:** multi-phase (≈2 sessions) · **Status:**
**Phase 3 landed 2026-10-23** — `PopoverTriggerProps`, `DatePickerTriggerProps`
and `NavigationMenuLinkProps` extend `@gpuixui/primitives`' `ButtonProps`
(the popover trigger directly, the picker's minus `children`, the link's minus
`variant`); each keeps `onClick` as a documented `@deprecated` alias for
`onActivate`, the new name wins when both arrive, and the three parts render the
primitive action (`PopoverTrigger` no longer draws through the adapter).
`src/trigger-action.test.ts` holds the types, the alias expression, the
no-double-press rule and the three pages, measured 6 of 11 failing on the
previous tree; behaviour cases drive Enter through each part (date picker 18 →
20, popover 12 → 14, navigation menu 21 → 23). **Phase 4 remains**: delete the
adapter and rewrite the 15 call sites that still use it. The role route is no
longer a blocker — `@gpuixui/primitives/button` publishes `actionOnColor` and
`ButtonVariant` beside the two actions, and the adapter's own `actionOnColor`
now **delegates** to it (`src/button-roles.test.ts`) rather than keeping a
second table. What remains is the public prop surface: six exported part types
(`DialogTrigger`/`DialogClose`, `DrawerTrigger`/`DrawerClose`,
`DropdownMenuTrigger`, `PreviewCardTrigger`) and the three motion effects
(`RippleButton`/`ShineButton`/`LiquidButton`) extend the adapter's
`ButtonProps`, so deleting it changes their vocabulary (`danger` →
`destructive`, `onClick` → `onActivate`, `aria-label` → `label`) and the pages
and curated guards that print it. See §What Phase 4 still waits on. See
§Adapter landed for the measured deltas.

**Phase 2 landed 2026-10-23** — `internal/button.tsx` is a thin adapter over
`@gpuixui/primitives/button`; every STOP below is closed (the disabled stop
paints `-1`, the event payload reaches activation, the subpath exports the two
actions). Phase 3 (base the two public prop types on the primitives') and Phase 4
(delete the adapter, rewrite the 17 call sites) remain. See §Adapter landed for
the measured deltas a Phase 4 executor must carry over — in particular the key
order, which is not visible in the primitive's API.

**The adapter's activation install is gone (2026-10-23)** — the primitives'
`Button` now runs its activation before a caller's key handler, so the adapter
hands the caller's press to `onActivate` and forwards the caller's key handlers
untouched; the local `activation` helper and its `activationHandlers` import are
deleted (175 → 148 lines). `src/button-activation.test.ts` holds both halves —
the adapter names no second contract, and the primitive still composes
`onKey("down")` before `onKeyDown` — and fails on the previous adapter
(`expected … not to contain 'onClick={onClick}'`). Behaviour: the button,
activation-release, dropdown-menu, context-menu, navigation-menu, popover,
preview-card, dialog, drawer, confirm-dialog, date-picker, pagination,
command-menu, message-scroller, carousel and toast suites are green (258 cases).
What remains of Phase 4 is the call-site rewrite and the adapter's deletion.

## Why

`packages/components/src/internal/button.tsx` is a **222-LOC second button
implementation**: its own `role`/`tabIndex`, its own Enter-on-down / Space-on-up
contract, its own variant paint, its own disabled geometry, and its own
`IconButton`. It exists because `@gpuixui/primitives` had no `Button` when Tier 2
started (plan 110 §7). That package now ships `Button` with the same activation
rule (`primitives/src/core/keyboard.ts`), the parts contract
(`StateStyle<ButtonState>`), `loading`, `square` and the `@gpuixui/tw` recipe — and
the components package still does not depend on it at all
(`packages/components/package.json` has no `@gpuixui/primitives`).

Two implementations mean two activation contracts and two paint paths for the
same control. The file's own header says it "stays until the Tier 2 parts are
migrated onto it (plan 110 §7 and `TODO.md` → Interlocks)". `TODO.md` row
"`@gpuixui/primitives` exports in plan 110 §7" is that task.

## Hard prerequisites — do not start Phase 2 until both pass

**R1 — primitives' filled hover/press must be opaque.** The stand-in paints
`filledHover`/`filledPressed` (commit `90f98987`), guarded by
`src/behaviour/button.test.tsx`'s `paints an opaque derived hover and press on a
filled action`. Both are now opaque on the primitive's side: `filled()` in
`packages/primitives/src/core/variants.ts` derives `filledHover`/`filledPressed`,
and `buttonClass` in `packages/primitives/src/recipe/index.ts` asks for
`hover:fill-<action>` / `active:fill-<action>-pressed`.

Check the **Button's** half only. `core/variants.ts` also holds the Toggle's
`accent` on-state, which still lifts its alpha (`hover:bg-accent/90`,
`active: bg-accent/80`) — a different control with its own tracked row
(`COMPONENTS.md` → Action fills, `TODO.md` → Interlocks), not a Button
regression. `packages/tw/src/recipes.ts`'s own `button` recipe still carries
`hover:bg-primary/90`, but `Button` no longer compiles it.

```sh
# expected: matches inside `filled()`, no `backgroundColor: alpha(` in it
grep -n "hover: (theme) => ({ backgroundColor: filledHover" packages/primitives/src/core/variants.ts
# expected: no alpha lift in the Button recipe
grep -n "hover:bg-primary/" packages/primitives/src/recipe/index.ts   # expected: no match
# expected: every action asks for the derived fill
grep -n "hover:fill-" packages/primitives/src/recipe/index.ts
```

**R2 — primitives' `outline` edge must paint `borderStrong`.** `outline` in
`packages/primitives/src/core/variants.ts` painted `theme.colors.border` (the
primitives half of `TODO.md` row 1243); it now paints the measured boundary role.
The stand-in's `secondary` look carries a measured 3:1 edge (commit `d54b24e2`),
so the migration must not land on a decorative border.

```sh
grep -n "border: (theme) => theme.colors.borderStrong" packages/primitives/src/core/variants.ts  # expected: a match in outline
```

Both prerequisites were re-measured against this tree (2026-10-22) and pass. If
either command gives the wrong answer: **STOP**, report which prerequisite
failed and leave this plan active. Do not adjust primitives from this workstream.

## The API delta (measured, 0.11.0 workspace)

| Concern | Stand-in (`internal/button.tsx`) | `@gpuixui/primitives` `Button` |
| ------- | -------------------------------- | ------------------------------ |
| variants | `primary` `secondary` `ghost` `danger` | `primary` `secondary` `outline` `ghost` `destructive` `link` |
| sizes | `sm` `md` `lg` | `ControlSize` from `@gpuixui/tokens` (`controlSizes`) |
| icon-only | separate `IconButton`, required `label`, always square | `square` + `label` on `Button` |
| activation | host `onClick` (the stand-in synthesises it from Enter/Space) | `onActivate` (click **or** activating key) beside host `onClick` |
| style | `Props["style"]` (`StyleDesc`) | `StateStyle<ButtonState>` (a plain `StyleDesc` still fits) |
| arbitrary host props | `Props` spread (`testId`, `aria-*`, handlers) | an explicit field set (`testId`, `className`, handlers); **no `Props` spread** |
| disabled | `tabIndex -1`, handlers dropped, `opacity: 0.5` | recipe `disabled:opacity-50`, out of the tab order, activation refused |

The stand-in's `secondary` look is `secondary` fill **plus** a `borderStrong`
edge. primitives' `secondary` has no border and its `outline` has no fill, so the
mapping that preserves the current look is `variant="secondary"` **plus**
`className="border border-strong"` (`@gpuixui/tw` has both utilities). Verify the
painted border colour in `src/behaviour/button.test.tsx`'s existing case.

## Measured STOP — Phase 1 (2026-10-22)

The baseline passed (`check-types` exit 0, unit 449/449, behaviour 585/585) and
**R1/R2 pass**, so the prerequisite gate was open. Phase 1's inventory then hit
the plan's own STOP clause: call sites pass host props primitives' `Button`
cannot express, so a thin adapter could not preserve the trigger APIs.

`packages/primitives/src/components/internal.ts` `InteractionProps` is
`onClick`/`onKeyDown`/`onKeyUp`/`onFocus`/`onBlur` only, and `ButtonProps` adds
`testId`, `className`, `style`, `label` and its own fields — there is no `ref`
and no `Props` spread. The call sites need:

| Need | Call sites |
| ---- | ---------- |
| `ref` on the action | `popover.tsx:138` (`setTrigger`), `preview-card.tsx:206`, `dropdown-menu.tsx:209` (`setTrigger`), `navigation-menu.tsx:505` (`setTrigger`), `date-picker.tsx:274` (`setTrigger`), `confirm-dialog.tsx:105` (the cancel focus target) |
| `aria-expanded` | `popover.tsx:139`, `preview-card.tsx:208`, `navigation-menu.tsx:507`, `dialog.tsx:151`, `drawer.tsx:142` |
| `aria-selected` | `pagination.tsx:253` (the current page) |
| `onMouseEnter` / `onMouseLeave` | `preview-card.tsx:209/215`, `navigation-menu.tsx:508/512` (hover-open) |
| an arbitrary host-prop spread | every trigger composes `{...rest}` from its own `Props`, so a caller's `aria-*`, `onSubmit` or `tabIndex` reaches the element |

The current stand-in expresses all five because it is a `div` with `{...rest}`.
Do **not** invent a wrapper prop or a second adapter around primitives' `Button`
(the plan forbids it, and it would recreate the two implementations this plan
deletes). The unblocking change belongs to `@gpuixui/primitives`: `Button` must
forward `ref`, its `aria-*` set and the pointer handlers, i.e. accept the host
props a trigger needs. That request is recorded in `TODO.md` → Interlocks; this
plan stays active and Phase 2 does not start until primitives ships it.

## Measured STOP — Phase 2 (2026-10-22)

Phase 1's blocker is closed: `ActionHostProps` now carries `ref`,
`aria-expanded`/`aria-selected`, the pointer pair and `onLayout`, and the
primitives hand them to the element (`Button.test.tsx`, `IconButton.test.tsx`,
`runtime/controls.runtime.test.tsx`). The dependency was added
(`"@gpuixui/primitives": "workspace:*"`) and Phase 0 stayed green — unit **546**,
behaviour **669**. Two API gaps then stopped the adapter, both measured, both in
primitives.

**1. The provider.** `primitives/src/components/ThemeProvider.tsx`'s `useTheme`
throws when its own presence marker is absent, and this package publishes the
token package's provider (`internal/theme.ts`; `theme-provider.test.ts` holds
`components.ThemeProvider === tokensReact.ThemeProvider`). Rendering primitives'
`Button` inside `renderComponent` — this package's own test root, which mounts
the token provider — failed:

```text
MissingThemeProviderError: useTheme() found no <ThemeProvider>. GPUIxUI
primitives never fall back to a default palette; wrap the tree in
<ThemeProvider theme={theme}>.
```

Measured with a throwaway probe that rendered a primitives `Button` under
`renderComponent` and found no `probe` node. The consequence is not local:
`apps/playground` mounts `ThemeProvider` from `@gpuixui/tokens/react`
(`src/app.tsx`, `src/smoke/run.ts`), so requiring the primitives' marker would
break the playground's headless example gallery too. The unblocking change is
primitives': its own module header already promises that "a tree that mixes the
two packages wraps once", so `useTheme` should read the shared token context, or
the package should publish a render seam that takes a theme instead of demanding
the marker.

**2. The event.** `ButtonProps.onActivate?: () => void` carries no payload, while
eight call sites read one: `popover.tsx`, `preview-card.tsx`,
`navigation-menu.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx` and
`message-scroller.tsx` forward it to the caller's own `onClick`, and
`ripple-button.tsx` measures the press point from it (`ripplePoint(event, …)`).
Mapping the stand-in's `onClick` to `onActivate` — Phase 2's instruction — drops
the event, and passing both runs the action twice. `onActivate` needs the
`EventPayload`, or the activation decision must be exported so an adapter can
keep a single event-carrying contract.

**3. Sequencing.** `src/ripple-button.tsx` (plan 600, the motion workstream)
imports `Button`, `actionOnColor` and `ButtonProps` from `internal/button.tsx`.
Phase 4 deletes that file, so the deletion follows the ripple component's
migration; it is another workstream's file and this one does not edit it.

**4. The route (measured 2026-10-22).** Both gaps above are closed — the
primitives' `Button` hands its activation the `EventPayload`, and its `useTheme`
reads `useThemePresence`, so a token-only tree renders it — but the adapter
cannot be **imported** yet: `@gpuixui/primitives` publishes `./core` and `./hint`
and no Button subpath, so the only route is the root barrel. The hint row already
measured that route at **52 modules / 416 KiB** against the subpath's 5 / 51 —
the whole Tier 1 package loaded to paint one control, which this package declined
once. The unblocking change is `@gpuixui/primitives/button` (a declared export
carrying `Button`, `IconButton` and their prop types), recorded in `TODO.md` →
Interlocks. Do not import the barrel and do not copy `renderButton`.

Two workarounds were rejected rather than shipped: wrapping each adapter instance
in its own `ThemeProvider`, and reaching for primitives' unexported
`renderButton`. Both hide a seam the next consumer would hit.

## Measured STOP — Phase 2, the disabled tab stop (2026-10-22) — **closed 2026-10-23**

The primitives now paint `tabIndex={-1}` for a disabled action, so the three
cases below pass unchanged and the adapter keeps the stop. History follows.

Item 4 is closed: `@gpuixui/primitives/button` is a declared export
(`src/button.ts`, guarded by `src/button-entry.test.ts`) and this plan's adapter
was written against it. The suites then caught one more primitive-owned delta,
measured in this package's own renderer:

| Painter | Disabled `Button` `tabIndex` |
| ------- | ---------------------------- |
| the stand-in (`src/internal/button.tsx`) | **`-1`** |
| `@gpuixui/primitives`' `Button` | **`undefined`** |

`renderButton` writes `tabIndex={disabled === true ? undefined : 0}` and
`ActionHostProps` omits `tabIndex`, so a caller cannot express the stand-in's
value. Three behaviour cases read it as `-1` — `pagination.test.tsx`'s Prev and
Next edges, `navigation-menu.test.tsx`'s disabled trigger and
`dropdown-menu.test.tsx`'s disabled trigger — and the Tier 2 rows call the
trigger's stop out of the tab order by that property, so this is the plan's STOP
condition "a call site needs a host prop primitives' `Button` cannot express".

The unblocking change belongs to `@gpuixui/primitives`: let a disabled action
paint the `-1` it always has (a one-line writer, plus its own case) or publish a
prop that names the stop. Filed in `TODO.md` → Interlocks; Phase 2 does not start
until it lands. Do not relax the three cases and do not wrap the action.

## Adapter landed — measured deltas (2026-10-23)

`src/internal/button.tsx` (322 lines → 175) now renders the primitives' `Button`
and `IconButton`; it keeps this package's `ButtonVariant`/`ButtonSize` names, maps
`danger → destructive`, `secondary` to the recipe plus `border border-strong`, and
an `IconButton` to a square ghost action with the glyph tint. The remaining
behaviours a Phase 4 executor must preserve are not all visible in the
primitives' props:

| Delta | What the adapter does | Evidence |
| ----- | --------------------- | -------- |
| **Key order** | Installs `activationHandlers` itself and does **not** pass `onActivate`, because the primitive runs a caller's key handler *before* its own activation (`composeEvent(caller, internal)`) while this package's triggers open on `Enter`'s `onKeyDown`, record the row to focus, then receive the activation. With the primitive's order the record was cleared and a menu focused its surface instead of its first row. | 44 behaviour cases red across `activation-release.test.tsx` and `dropdown-menu.test.tsx` (first: `expected Some("menu") … Some("rename")`); green with the adapter's order |
| **Pointer press** | Passes the caller's `onClick` to the primitive, which refuses it while disabled. Activation on keys goes through the adapter. | `button.test.tsx` `runs its handler once per click`, the Enter/Space pair and the held-key case; `greps` show no second call |
| **Paint metrics** | The primitive's recipe is the fixed shadcn scale (ADR 0006): a **6px** corner (`rounded-md`) and `borderStrong` on `secondary`, so a theme radius no longer reshapes an action. | `page-radius-truth.test.ts` reads `BUTTON_BASE` from the primitives' source and compiles its radius token; `button.test.tsx` reads the `borderStrong` edge |
| **Disabled stop** | The primitives now paint `-1` (the STOP section below is closed), so the three trigger suites read the same stop. | `pagination.test.tsx`, `navigation-menu.test.tsx`, `dropdown-menu.test.tsx` |

Two consequences landed with the migration. The outside-press gesture window in
`internal/dismiss-layer.ts` widened from 16 ms to **64 ms**: one press's queued
handlers are drained across the top surface's close re-render, which outlasted a
single frame once the action paint moved, and two overlay cases closed the dialog
and the popover on one press. And the pagination page now prints the fixed 6px
corner instead of `radius.md`.

Measured after the change (2026-10-23): `check-types` clean, unit **869/869**
(the one inventory case in the tree at the time belongs to another workstream's
in-flight Tabs case), behaviour green on every file touched here (the Tabs file
was mid-edit by its owner), and the headless probes `examples-mount`,
`overlay-dialog`, `modal-focus-trap` and `focus-traversal` all pass.

Two docs-site guards still read the retired painter and are recorded in `TODO.md`
→ Interlocks: the curated pagination page's `radius.md` claim and
`component-page-truth.test.ts`'s `tabIndex={disabled ? -1 : 0}` source assertion.

## Phase 0 — baseline (10 min)

```sh
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test              # 449 at the time of writing
nub run --filter @gpuixui/components test:behaviour    # 585 at the time of writing
```

Record the counts **you** measure in the commit message; the two above are what
this tree printed on 2026-10-22, and other workstreams add cases, so a higher
count is not a failure — a **red** suite is. **STOP** if any is red before you
change anything.

## Phase 1 — inventory the 25 import sites (30 min)

```sh
grep -rl "internal/button" packages/components/src
grep -rn "<Button\|<IconButton" packages/components/src --include=*.tsx | grep -v behaviour/
```

Expected: 17 source call sites in `alert`, `carousel`, `confirm-dialog`,
`date-picker`, `dialog`, `drawer`, `dropdown-menu`, `message-scroller`,
`navigation-menu`, `pagination`, `popover`, `preview-card`, `toast/viewport`, plus
12 behaviour suites. For each site record: variant, size, extra host props,
`style`/`className`, `label`, children shape. Two **public** prop types extend
the stand-in's `ButtonProps` and must move in Phase 3:

- `DatePickerTriggerProps` (`src/date-picker.tsx:239`),
- `NavigationMenuLinkProps` (`src/navigation-menu.tsx:612`).

A site that passes a host prop the primitive cannot express is a **STOP**:
record it in this plan and do not invent a wrapper prop.

## Phase 2 — the adapter (one commit)

Add `"@gpuixui/primitives": "workspace:*"` to `packages/components/package.json`
(components may depend on primitives; the boundary rule allows it). Rewrite
`internal/button.tsx` as a thin adapter that **keeps both exports and their current
props**, so no trigger API changes:

- `mapVariant`: `primary → primary`, `secondary → secondary` + `className="border border-strong"`,
  `ghost → ghost`, `danger → destructive`.
- `Button` renders primitives' `Button`, forwarding `size`, `disabled`, `testId`,
  the composed handlers, `style` and `className`; `onClick` maps to `onActivate`
  unless a test proves passing both runs the handler twice (assert **once**).
- `IconButton` renders `<Button square label={label} …>` and keeps the stand-in's
  glyph tint (`mutedForeground`, `foreground` on hover) through `style`.
- Delete the stand-in's `variantStyle`, `controlStyle`, `disabledStyle` and
  `activation`; the primitive owns them.

Test plan for this phase:

1. No suite above changes; `test:behaviour` must stay at the Phase 0 count.
2. Prove the adapter is load-bearing: drop the `danger → destructive` mapping and
   run `--config vitest.behaviour.config.ts src/behaviour/confirm-dialog.test.tsx`
   — it must fail on the confirm action's paint. Restore it.
3. Add one case to `src/behaviour/button.test.tsx`: a click and an `Enter` each run
   the handler **once** through the adapter (the double-fire guard).

## Phase 3 — migrate the two public prop types (one commit)

`DatePickerTriggerProps` and `NavigationMenuLinkProps` currently extend the
stand-in's `ButtonProps`. Base them on primitives' `ButtonProps`, keep their own
narrowing (`Omit<…, "children">`, `Omit<…, "variant">`), and map a caller's
`onClick` to `onActivate` with `onClick` deprecated in JSDoc (the repo's existing
alias rule, `docs/component-api.md` §2). Update both docs pages' API tables and the
`docs/component-api.md` sentence that names the stand-in.

## Phase 4 — delete the adapter

- Rewrite the 17 call sites to import `Button` from `@gpuixui/primitives`.
- Delete `internal/button.tsx` and `src/behaviour/button.test.tsx`; its contract
  now lives in primitives' `Button.test.tsx` + `runtime/controls.runtime.test.tsx`,
  and each trigger keeps its own interaction case in its suite.
- `grep -rn "internal/button" packages/components` → no match.
- Update `COMPONENTS.md`'s trigger notes that say "the local button stand-in"
  (`Rows`, `Dialogs`, `Dropdown menus`, `Context menus`, `Command menus`) and
  `docs/component-api.md` §7.

### What Phase 4 still waits on (measured 2026-10-23)

The adapter has **five** importers outside the triggers' reach, all in the
motion workstream's files, and each imports the same three things:

```text
packages/components/src/ripple-button.tsx   Button, actionOnColor, ButtonProps
packages/components/src/shine-button.tsx    Button, actionOnColor, ButtonProps
packages/components/src/liquid-button.tsx   Button, actionOnColor, ButtonProps
```

`Button` and `ButtonProps` already exist on `@gpuixui/primitives/button`, and
so does `actionOnColor` — the primitive's `./button` seam publishes it (and
`ButtonVariant`) from the same variant table its labels paint, so the three
effects can import all three symbols from the subpath on the day their props
move. The deletion is now blocked only by the public surface those parts carry:
six exported trigger types and the three effects extend this package's
`ButtonProps`, and the primitive's vocabulary differs (`danger` →
`destructive`, `onClick` → `onActivate`, `aria-label` → `label`), so the
rewrite is an API change with the pages and curated guards to match rather than
a mechanical import swap. The adapter's own role helper is already the
primitive's (`src/button-roles.test.ts`), so no second role table survives.

## Commands and expected results

```sh
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # your Phase 0 count (plus the new case)
nub run --filter @gpuixui/components test:behaviour   # same count as Phase 0 (plus the new case)
nub run check && nub run lint && nub run test         # gates, at the end
```

## STOP conditions

- R1 or R2 fails.
- A call site needs a host prop primitives' `Button` cannot express.
- A `style` callback at a call site depends on a field the stand-in's state type
  had and `ButtonState` does not.
- The behaviour suite count drops without a recorded deletion of a case.

## Acceptance

One button implementation in the workspace; `packages/components` imports
`Button` from `@gpuixui/primitives`; no `internal/button.tsx`; the two public
prop types migrated with their docs; every trigger's existing interaction case
still green in both themes; gates pass; `TODO.md` interlock row closed.
