# `@gpuixui/components`

Composable Tier 2 components — composition, overlays, navigation, menus,
feedback and choice inputs — rendered by GPUix through React.

Plans for this package and every component it holds are in
`.agents/slop/plans/` (110–139, 157–158, 300–320). Read those before adding a
component.

## Boundary

Allowed imports, in full: `effect`, `@gpuixui/tokens`, `@gpuixui/tw`,
`@gpuixui/icons`, `@gpuixui/primitives` (only where a behavioural primitive is
genuinely needed — see plan 110 §7), `@gpuix/react` and its subpaths, and
`react`.

Never: `apps/*`, `packages/data-grid`, `packages/docking`, `packages/editor`,
`node:*` in component source (the inventory test is the sole repository-check
exception, plan 117 §3), DOM APIs or CSS.

## Styling

A component's resting appearance is a Tailwind recipe exported from
`@gpuixui/tw` (`CARD_BASE`, `BADGE_VARIANTS`, `MENU_CONTENT`, …), compiled through
`classesToStyle` against the **default** registry — shadcn's fixed metrics
(`h-9` = 36, `px-4` = 16, `text-sm` = 14/20) — not the primitives' density
scale (ADR 0006). The caller's `className` is joined after the recipe via `cn`
so it wins conflicts, and its `style` is merged last so it wins outright. The
`internal/recipe.ts` seam wraps the compile; `internal/overlay.ts` is the
overlay-only slice of that seam (it joins the caller `className` for the
floating/modal surfaces). No other file imports `@gpuixui/tw`'s compiler
directly.

### What a repaint costs

A compile is the expensive half of a render: expanding, alias-resolving, merging
and parsing a card recipe measures ~0.25 ms, and the package has 154 recipe
sites, so re-parsing every part on every render was the largest avoidable cost
in a repaint. `recipeStyle(recipe, theme)` therefore compiles once per recipe per
theme: the cache is a `WeakMap` keyed by the theme object (entries die with it)
and holds up to 512 recipes per theme, and the compiled `StyleDesc` is frozen
because every later render shares it. A recipe past the limit is compiled but
not stored, so a caller's dynamic `className` pays what it paid before without
growing the cache. `src/internal/recipe.test.ts` holds the contract — a second
render compiles nothing and gets the same object, two themes get their own
entries, and the overflow recipe is not stored.

The rest of the model is the runtime's: one style resolution per painted
element, and paint order rather than a `z` scale (`docs/tokens.md` §Layering).
A component that re-renders its whole family on a state change is the remaining
cost, which is why `List` subscribes each row to its own slice
(`src/list/store.ts`).

### What the entry costs to load

`@gpuixui/components` resolves to `src/index.ts`, and that barrel re-exports all
every family, so importing any one component from the package root reads all of
them. Measured 2026-10-22 with
`nub run --filter @gpuixui/components measure:surface`:

| Surface | Modules | Source |
| ------- | ------: | -----: |
| the package's own graph | 89 | 589 KiB |
| `@gpuixui/tokens` it reaches | 24 | 174 KiB |
| `@gpuixui/tw` | 9 | 104 KiB |
| `@gpuixui/keyboard` | 8 | 12 KiB |
| `@gpuixui/icons` | 5 | 11 KiB |
| **total** | **135** | **≈890 KiB** |

The table counts the workspace source a consumer compiles. `react`, `effect` and
`@gpuix/react` are dependencies the app already holds, so their bytes are not in
it; their cost is in the cold-import numbers below.

The package's own modules import exactly three packages: `@gpuix/react` (65
sites), `effect` (160) and `react` (47). Cold import through the repo's loader,
three fresh processes each (`nub scripts/surface.ts --import`): the runtime
alone 168 ms, one family through its subpath (`@gpuixui/components/badge`)
528 ms, the barrel 876 ms. The digit belongs to a shared machine — one run
measured 1.96 s while other agents were building — but the shape is the point:
the barrel costs about 350 ms more than the one family a consumer asked for,
because it loads the rest of the package too. A consumer that needs one or two
components should import the subpath; one that wants the package's shared
vocabulary can keep the root.

`src/surface.test.ts` holds the graph: the module count is exact, the byte
ceiling is the recorded budget and the package list is exact, so a family that
reaches a new dependency fails by name instead of quietly adding load time to
every consumer.
`src/surface.budget.ts` is the record; regenerate it with the command above and
state what moved.

## Theming

Every component reads its roles from the token package's theme, and the package
root publishes the provider and both shipped themes, so one import themes the
whole library:

```tsx
import { render } from "@gpuix/react";
import { Card, ThemeProvider, darkTheme } from "@gpuixui/components";

render(
  <ThemeProvider theme={darkTheme}>
    <Card>Resting on the dark card role</Card>
  </ThemeProvider>,
);
```

They are `@gpuixui/tokens`' own exports, not a second provider: a consumer that
already wraps the app in `@gpuixui/tokens/react`'s `ThemeProvider` needs no
change, and one that imports another copy would split the tree in two.
Without a provider every component paints the light theme. `useTheme` reads the
resolved theme where a part needs a role in its own style, and
`createTheme`/`extendTheme` from `@gpuixui/tokens` own the extension mechanism —
this package adds no theme of its own.

GPUix exposes no OS appearance query, so the application owns the mode: read the
theme from your own state and pass it down. `src/theme-provider.test.ts` holds
the published surface and the snippet above, and
`src/behaviour/theme-provider.test.tsx` proves a mounted card repaints when the
provider's theme changes.

## Chrome marks

Every mark a control paints — close, caret, chevron, check, tone — is an
`Icon` from `@gpuixui/icons` inside the part's recipe-styled wrapper, tinted
with the token role that wrapper used to give its text. A mark that names a
control is decorative (`role="presentation"`) because the control already
carries the name; a mark that *is* the state (a toast's tone, a menu row's
checked box, an accordion's Expand/Collapse) carries a `label` and is announced
as an image. Placeholder ellipses and keycap chords stay typography: they are
punctuation, not chrome. The confirmation dialog's busy mark was the last
painted stand-in and is now the `loader` icon, in the action's own label role.
`src/behaviour/icons.test.tsx` measures the painted `<svg>` and sweeps the
source for a returning text stand-in — an ellipsis standing alone as an
element's content, which the trailing one of a placeholder is not.

A filled action paints `keyboardFocusDim: false`. The runtime dims every other
focusable element to 40% while a keyboard user is on one, which composites a
filled label into its own fill — 5.0–10.5:1 at rest becomes 1.3–3.2:1 on every
strip — so `internal/button.tsx`'s `primary`, `danger` and `secondary` variants
keep their label while a `ghost` action keeps the where-can-Tab-go cue.
`src/behaviour/button.test.tsx` holds the declaration in both themes and measures
the collapse with `keyboardDimFailures`; `docs/component-api.md` §3 states the
rule.

## Keyboard activation

Enter activates on the press; **Space activates on the release**, and the press
`preventDefault()`s. That split is the platform's button rule, and it matters
here for two measured reasons: the runtime would otherwise treat one keystroke as
both the action and a scroll of the region behind the control, and a press a
reader cancels before releasing would already have acted. `internal/key.ts` owns
the decisions — `isActivation(event, phase)`, `swallowsDefault(event, phase)`,
and `activationHandlers(activate, observe)` for a plain control — and every
composite that keeps its key handler on a container (the tabs rail, the list
root, an accordion header, the menu surface, the calendar grid) installs the same
two halves. `src/behaviour/activation-release.test.tsx` holds each of them to it;
a suite that presses Space with `simulateKeystrokes` gets only the press, so use
`pressKey` from `src/internal/interaction.ts` for the whole gesture.

Two kinds of metric keep density, because they must stay aligned with the
density-driven controls beside them: a list row's height
(`theme.density.rowHeight`), and a control's height/side — the accordion
trigger's `controlHeight(theme, "lg")`, the field/search/mention/tag and
inline-edit input heights (`controlHeight(theme, "md")`/`"sm"`), the menu row's
`controlHeight(theme, "sm")`, the hotkey-recorder's min-height, and the stepper
marker's side (`controlHeight`). Everything else — structure, type roles,
spacing, radius, border and semantic colours — compiles from the fixed shadcn
recipe.

The overlay wave (Dialog, Popover, DropdownMenu, ContextMenu, CommandMenu) made
one deliberate deviation and one deliberate mapping: the dialog scrim maps
shadcn's literal `bg-black/30` to the theme's `overlay` role so the veil stays
light/dark/high-contrast aware, and the dialog keeps its flex column layout
(plus the density close-control clearance) instead of shadcn's `grid`, because
its parts are flex blocks. The overlay recipes keep shadcn's positioning and
motion classes for provenance even though the renderer has no transform or
z-index; the components own their positioning through `<anchored>` /
`<FloatingLayer>` and the dismiss stack in `internal/dismiss-layer.ts`.

The final wave (confirm-dialog, drawer, navigation-menu, preview-card, tabs,
toast, combobox, date-picker, time-picker, color-picker, message-scroller)
completed the conversion — **39/39**, none skipped. It added three utilities to
the default registry (`border-strong` for the picker triggers' strong edge,
`items-end`, `justify-start`) and routes the floating/modal surfaces through
`overlaySurfaceStyle`, while the picker triggers keep their density height and
the picker surfaces keep their scroll/positioning in `style`.

## Motion

The overlays and the tab rail move: a surface fades and travels a few pixels,
and the tab pill slides between measured trigger boxes. The split is deliberate —
the recipe owns the resting appearance, `@gpuixui/motion` owns the timing
(`motionTiming`: 120/160/200/320/500 ms, ease-out in, ease-in out), and
`src/internal/presence.tsx` owns the frames and the mount window. The runtime
executes the tween and has **no `transform`**, so nothing scales, rotates or
translates — shadcn's `zoom-in-95` stays unsupported rather than faked.

A closed surface stays mounted for its exit tween and unmounts when it ends, so
a dismissal is immediate in state (`onOpenChange`, focus return) while the box
fades out. Dialog and the command palette rise 8px on a `slow` enter; the drawer
travels 12px from its own edge; popovers and menus travel 4–8px out from their
trigger's side; a toast slides 16px in from the right edge; an accordion panel
animates to the body's measured height; the tab pill retargets
`left`/`top`/`width`/`height` from the box on screen.

The preference is the application's, because the runtime exposes none:

```tsx
<MotionProvider preference={reduceMotion ? "reduced" : "animated"}>
  <App />
</MotionProvider>
```

A reduced run is a zero-duration assignment — the resting frame still paints.
`src/behaviour/presence.test.tsx` measures the movement, the exit window, the
reduced negative control, the accordion's measured height and the pill in the
real renderer. Levels, the per-surface table and the reason presence is a
duration: `docs/component-api.md` §11.

## What is here

| Area | State |
| ---- | ----- |
| `src/internal/*` | collection index arithmetic, key predicates, theme seam, the merged host ref, the a11y-dump reader, the monotonic clock read, the overlay recipe seam (`overlay.ts`) and the behaviour-suite render helper |
| `src/runtime.test.tsx` | the native-renderer guard (plan 117 §5b) |
| `src/card.tsx` | Card and its five parts — verified natively |
| `src/badge.tsx` | Badge — the status pill, seven variants, two sizes |
| `src/avatar.tsx`, `src/avatar/logic.ts` | Avatar with unicode-safe initials and a presence dot |
| `src/alert.tsx` | Alert: four tones, a title, an optional icon and a dismiss control |
| `src/empty-state.tsx` | EmptyState: the centred "nothing here yet" panel |
| `src/list.tsx`, `src/list/selection.ts`, `src/list/store.ts` | List / ListItem: rows with a roving tab stop, single or multiple selection, select-all, type-ahead and single/none row activation; each row subscribes to its own slice of the selection, so only the rows whose state moved repaint |
| `src/drawer.tsx` | Drawer: an edge-anchored modal over the shared `internal/modal.ts` rules |
| `src/dialog.tsx` | Dialog: an anchored window veil, focus-in/return, Tab trap, Escape |
| `src/confirm-dialog.tsx` | ConfirmDialog: Cancel-first, caller-owned close, a locked loading state |
| `src/popover.tsx` | Popover: a `FloatingLayer` panel with the shared dismissal rules |
| `src/dropdown-menu.tsx`, `src/menu/*` | DropdownMenu over the shared row registry, rows, type-ahead buffer, menu surface and the shared `Sub`/`SubTrigger`/`SubContent` parts |
| `src/context-menu.tsx` | ContextMenu: the same rows, type-ahead and submenus at the pointer (`onAuxClick` + `isRightClick`) or at the trigger from `Shift+F10` |
| `src/command-menu.tsx` | CommandMenu: a dialog-hosted palette over `menu/logic.ts`, with ranked subsequence matching inside each declared group |
| `src/tabs.tsx` | Tabs: roving tab stop, automatic/manual activation, arrow wrap |
| `src/collapsible.tsx` | Collapsible: a trigger with `aria-expanded`, a measured-height body that unmounts after its collapse |
| `src/accordion.tsx` | Accordion: single (collapsible) and multiple modes over a tagged union, with arrow/Home/End header movement |
| `src/breadcrumb.tsx` | Breadcrumb: a declarative trail with `maxItems` collapsing |
| `src/pagination.tsx` | Pagination: a stable-width page window with disabled edges |
| `src/field.tsx` | Field: label, control, one message slot; the inline-validation surface |
| `src/fieldset.tsx` | Fieldset: a named group over `role="group"`, with `disabled` reaching `FieldInput` |
| `src/form.tsx` | Form: owned-value schema validation, one alert summary, decoded `onSubmit` |
| `src/stepper.tsx` | Stepper: a read-only step list whose statuses derive from one value |
| `src/navigation-menu.tsx` | NavigationMenu: one open anchored panel, roving triggers |
| `src/mention-input.tsx`, `src/mention/logic.ts` | MentionInput: ranked `@` suggestions over the anchored layer |
| `src/message-scroller.tsx`, `src/message-scroller/logic.ts` | MessageScroller: pinned follow, no yank, unread count and jump-to-latest over a bounded scroll viewport |
| `src/preview-card.tsx` | PreviewCard: hover/focus preview with pointer travel into the card |
| `src/color-picker.tsx`, `src/color/hex.ts` | ColorPicker: theme swatches and a normalising HEX field (no radial gradient for a saturation/value square in 0.11.0) |
| `src/hotkey-recorder.tsx` | HotkeyRecorder: capture a chord, reusing `@gpuixui/keyboard` |
| `src/carousel.tsx` | Carousel: discrete slide stepping with mounted, hidden slides |
| `src/tag-input.tsx`, `src/tag-input/logic.ts` | TagInput: tokens with a pure add/remove rule set and removable chips |
| `src/inline-edit.tsx` | InlineEdit: display/input swap with one commit contract |
| `src/countdown.tsx`, `src/countdown/logic.ts` | Countdown: clock text for a remaining duration; the app owns the tick |
| `src/timeline.tsx` | Timeline: an event rail whose last item ends the connector |
| `src/keyboard-shortcuts.tsx` | KeyboardShortcuts over the `@gpuixui/keyboard` accelerator model: platform-correct keycaps, named groups |
| `src/search-input.tsx` | SearchInput: a clear control, Enter submit, Escape clear |
| `src/combobox.tsx` | Combobox: GPUix's headless combobox over our ranked option core |
| `src/date-picker.tsx`, `src/date-picker/calendar.ts` | DatePicker: a pure `DateTime` month grid in a Popover, with bounded selection and a clear action (the day half) |
| `src/time-picker.tsx`, `src/time-picker/time.ts` | TimePicker: a 24-hour `HH:mm` field in two labelled segments, with clamped typing, arrow carry/wrap, `minuteStep` and an optional clear |
| `src/toast.tsx`, `src/toast/*` | the toast provider, viewport and Effect store, with pointer/focus pause/resume |
| `src/inventory.ts` | the component inventory records, checked against `COMPONENTS.md` |
| `src/auto-height.tsx` | AutoHeight: a reveal that tweens to its content's measured height (plan 600) |
| `src/typing-text.tsx`, `src/typing-text/logic.ts` | TypingText: a code-point reveal on a real-time timer |
| `src/counting-number.tsx`, `src/counting-number/logic.ts` | CountingNumber: a number interpolated by `@gpuixui/motion` and painted each frame |
| `src/rotating-text.tsx`, `src/rotating-text/logic.ts` | RotatingText: a phrase rotation on an interval, one fade per step |
| `src/rolling-text.tsx`, `src/rolling-text/logic.ts` | RollingText: a value that rolls vertically inside one clipped line, two halves and a swap (plan 600) |
| `src/sliding-text.tsx`, `src/sliding-text/logic.ts` | SlidingText: the same swap on the horizontal axis, inside a box that reports the width it travels |
| `src/reveal.tsx`, `src/reveal/frames.ts` | Reveal: the house fade-and-offset entrance on mount or on an `open` change (plan 600) |
| `src/ripple-button.tsx`, `src/ripple-button/logic.ts` | RippleButton: a press spreads a disc from the pointer by growing its box, never a transform (plan 600) |
| `src/shine-button.tsx`, `src/shine-button/logic.ts` | ShineButton: a sheen of two two-stop halves crossing the action on hover (plan 600) |
| `src/magnetic.tsx`, `src/magnetic/logic.ts` | Magnetic: a surface whose content leans toward the pointer by inset offset, inside a still hit box (plan 600) |
| `src/liquid-button.tsx`, `src/liquid-button/logic.ts` | LiquidButton: a wash that floods in from the pointer's edge and drains to the edge it leaves by (plan 600) |
| `src/splitting-text.tsx`, `src/splitting-text/logic.ts` | SplittingText: a phrase revealed unit by unit, each unit fading and rising (plan 600) |
| `src/highlight-text.tsx`, `src/highlight-text/logic.ts` | HighlightText: a marker wash swept across a query's matches by the runtime's `highlight` layer (plan 600) |
| `src/internal/dismiss-layer.ts`, `src/internal/dismiss-scope.tsx` | the overlay stack: the deepest open surface wins, one event closes one overlay — a keystroke by its `keystrokeId` and a press by the type, point, button and click count every handler of it shares, because the runtime rebuilds the payload per handler; the scope gives each surface its containment depth |
| `src/internal/controllable.ts` | `useControllableState` — `value`/`defaultValue`/`onValueChange` in one hook |
| `src/core/runtime.ts` | the shared state model: `createRuntime({ initial, reduce, query })` with a pure command fold (`run`); no React, no GPUix (plan 201) |
| `src/internal/placement.ts`, `src/internal/use-placement.ts` | the measured anchored-placement rule: true `center` and a one-shot flip off the trigger when GPUix's snap would cover it (plan 323) |
| `src/internal/theme.ts` | the one seam over `@gpuixui/tokens`: re-exports `alpha`, `focusRing`, `elevationShadow` and `statusTone`, and maps the component tone `danger` to the token role `destructive` (plan 157) |
| `src/internal/measure.ts` | the one reader of an `onLayout` box (four sides, or nothing) and of a pointer's point, for the components that measure themselves |
| `src/internal/recipe.ts` | the one seam over `@gpuixui/tw`: compiles a class-string recipe to the resting `StyleDesc` (ADR 0006) |
| `src/internal/text-swap.ts` | the two-phase swap `RollingText` and `SlidingText` share: which phase, what a mid-run value does, and the frames a travel on `top` or `left` paints |
| `src/internal/button.tsx` | `Button`/`IconButton` — the local stand-in for `@gpuixui/primitives` (plan 110 §7) |
| `src/internal/interaction.ts`, `src/internal/a11y.ts` | behaviour-suite helpers: hit-testing, focus, bounds, the accessibility dump |
| `src/behaviour/theme-matrix.test.tsx` | the both-theme assertions for the components without one in their own suite |
| `src/surface.ts`, `src/surface.budget.ts`, `scripts/surface*.ts` | the entry's import graph: the walker, the recorded budget and the report command |

## Commands

```sh
nub install
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test            # logic suites + the guard
nub run --filter @gpuixui/components test:behaviour  # needs a supported host
nub run --filter @gpuixui/components measure:surface # the entry's import cost
nub run check            # the repo gate, from the worktree root
```

`measure:surface` prints the entry's module graph; add `--import` to it (from
this directory: `nub scripts/surface.ts --import`) for the cold import numbers,
which need the native binding.

Two suites, deliberately split. `test` runs everywhere: pure logic and the guard
in `src/runtime.test.tsx`. `test:behaviour` renders a real GPUix tree, so it needs
a host with a GPUix native binding — macOS arm64, Linux x64, Windows x64, or this
Intel Mac, where plan 140's locally built `darwin-x64` binding is installed.
`@gpuix/native` resolves its binding eagerly, so on a host without one a behaviour
file *fails to load* instead of skipping; that is why the default `test` run does
not collect it (plan 117 §5a–§5c).

The critical Tier 2 interactions are also measured in a real window by the
playground's live probes, which mount the shipped components — not a copy:
`dialog-lifecycle`, `menu-lifecycle`, `context-menu-lifecycle`,
`popover-lifecycle`, `toast-lifecycle`, `tabs-lifecycle`, `command-palette`,
`modal-focus-restore` and `keyboard-focus-dim`. All nine were green on
`@gpuix/native` 0.11.0 on 2026-10-22
(`nub apps/playground/dist/live/run.js --only <id>`); each probe records its own
negative control in `apps/playground/README.md`.

## Adding a component

1. Read the matching plan in `.agents/slop/plans/`.
2. One file per component family, one named export per part, JSDoc on every
   export, `style` merged last so a consumer can override it.
3. A part that needs the host instance internally (focus, trap, registration)
   takes `ref` out of its props and composes it with `internal/ref.ts`'s
   `useMergedRef`. The last `ref` spread onto a host element wins, so spreading
   props and then passing the internal ref silently drops the caller's.
4. Put anything worth testing without a renderer in `<component>/logic.ts`.
5. Test it twice: logic tests beside the code (`src/<name>.test.ts`), and a
   behaviour suite in `src/behaviour/<name>.test.tsx` that renders through
   `internal/test-root.tsx` — real clicks, keys, focus, text and bounds.
6. Ship an example (`examples/<name>.example.tsx`) registered in
   `examples/index.ts`, a docs page (`docs/<name>.mdx`) and an inventory record,
   in the same commit. The registry is what `apps/playground` mounts, and
   `src/examples.test.ts` fails when an example file has no entry — the docs
   site reads the filesystem, so an unregistered example looks shipped.
