# TODO.md — the persistent source of truth

This file is how work resumes after a context compaction, a restart, or a new
agent. Tick items as they finish. Add categories as plans land. If a task is not
here, add it and tick it. Implementation details do not belong here — only tasks
worth tracking.

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled

---

## Harness — the supervisor that keeps the swarm alive

`[x]` `[█████████░]` 6/7

`[x]` Repo on `proserver` with the required shape, mission, rules and plan index
`[x]` opencode 2.0.31 installed with the provider credentials and a trimmed config
`[x]` Verified a real run on `opencode-go-braven/deepseek-v4.1-flash`
`[x]` Supervisor: 30-minute tick, ≥5 agents, one worktree each, idempotent and crash-safe
`[x]` Scheduler installed (launchd agent + daemon driver; see `.agents/slop/README.md`)
`[x]` Model fallback chain with limit detection, one active model for the whole swarm, and an hourly recovery probe (see `scripts/README.md`)
`[ ]` Enforce one live session per worktree: the `opencode run` loop currently
starts a new session before the previous one closes (evidence:
`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`; the guard is
planned in `primitives` plan 022, `022-swarm-single-writer.md`)

---

## Phase A — audit and feasibility

`[ ]` `[░░░░░░░░░░]` 0/6

`[ ]` Inspect the environment, package manager and toolchain; record the findings
`[ ]` Establish the GPUix version, APIs, primitives, events, layout and limits
`[ ]` Read GPUix docs and examples; write the capability map
`[ ]` Inspect GPUI Kit (hierarchy, theming, layout, interaction, licence)
`[ ]` Study shadcn/ui organisation and semantic tokens; review PanelUI; review Fumadocs setup
`[ ]` Write and index every phase and package plan in `.agents/slop/plans/`

## Phase B — working foundation

`[x]` `[█████░░░░░]` 5/9

`[ ]` Land the workspace, boundaries and package scaffolding that has real content
`[x]` Land tokens and the theming architecture (light + dark, semantic roles)
`[x]` Land the `@gpuixui/tw` extension registry, luma `cn-*` aliases and state
variants (plan 524)
`[ ]` Land the primitives package
`[ ]` **Native smoke test**: layout, input, focus, overlay and panel primitives in real GPUix
`[ ]` Land one fully working component running in GPUix
`[x]` Land the docs shell and the component page pattern in Fumadocs — the
sectioned sidebar (Getting Started / Components / Contributing), the reusable
Preview/Code template, the `nub` install block, the "On this page" TOC, the
previous/next pager, and the Button, Dialog, Popover and Tabs pages are deployed
under <https://gpuixui.sudokw.com/docs>
`[x]` Land the Blocks and Theme Editor docs surfaces (plan 436) — the
`/docs/blocks` index with Login/Settings recipes and the `/docs/themes` live
token editor, deployed under <https://gpuixui.sudokw.com/docs>
`[x]` Land the marketing landing page at `/` (plan 434) — Hunter License
identity, stacked-native deck hero, library grid, proof, attribution
`[x]` Deploy the Fumadocs app (landing + getting started) to
<https://gpuixui.sudokw.com> on Cloudflare Workers via the alchemy stack

### Design tokens and theming (`tokens-theme`)

`[x]` `[███████░░░]` 14/20

`[x]` Write and index the tokens/theme plan set (plans 010–019 and 051)
`[x]` Implement `packages/tokens`: semantic colour roles, typography, spacing,
radii, density, elevation, light + dark themes
`[x]` Implement the theme extension mechanism (`createTheme`/`extendTheme`) and
the `@gpuixui/tokens/react` provider
`[x]` Add high-contrast (AAA) light and dark themes (`getTheme(mode, "high")`)
`[x]` Add status tone roles plus `alpha` and `statusTone` helpers
`[x]` Expose `colorRoles` for the docs site's generated token tables
`[x]` Make `@gpuixui/tokens` resolvable from source so a clean checkout needs no
prebuilt `dist` (plan 016)
`[x]` Ship `focusRing(theme)` and correct the focus claims in `docs/tokens.md` and
`docs/design-system.md` — GPUix 0.10.0 has no `outline*` and no `focusVisible`
(plan 017)
`[x]` Drop `BoxShadow.inset`, document the one-shadow rule and hoist
`elevationShadow(theme, level)` (plan 018)
`[x]` Write `docs/tokens.md` (every token + extension API)
`[x]` Write `docs/design-system.md` (identity, roles, state, accessibility)
`[x]` Add platform type styles and `platformTheme(theme, platform)` for the docs
platform toggle (plan 051)
`[x]` Add the design-system rows to `COMPONENTS.md`
`[ ]` Add motion tokens (durations/easings) once a component consumes them
`[ ]` Ship `registerFonts` so a consumer's (or the library's) typeface reaches the
runtime, and record the licence review for any bundled family — plan 052, native
proof blocked by B1 (rescued from the abandoned `agent/fonts` branch)
`[ ]` Cross-team: native theme gallery in `apps/playground` (owner:
`playground`; blocked by B1); Fumadocs Theming page from `docs/tokens.md` and the
docs platform toggle (macOS / Linux / Windows / Default) built on
`platformTypes` + `platformTheme` (owner: `docs-site`); ignore the `references`
**symlink** — a `references/` rule does not match a symlink, so every worktree
shows it as untracked (owner: repo tooling; `packages/README.md` already lists
`tokens`)
`[x]` Components consume `@gpuixui/tokens` directly: the local `withAlpha`,
`focusRing`, `elevation` and hand-mixed `tone` palette are gone; `internal/theme.ts`
re-exports the token helpers and keeps only the `danger` → `destructive` mapping
(plan 157)
`[ ]` Cross-team: `primitives` still carries its local focus-ring and
first-shadow helpers (`primitives/src/core/style.ts`) — delete them now that
`focusRing` and `elevationShadow` are in tokens (owner: `primitives`; plan 157
records the components half)
`[x]` Components carry no structural copy of `@gpuixui/tokens` and import the
package directly (plan 157)
`[x]` Tokens' `src/react.tsx` is compiled inside the components program when
tokens resolves from source; the isolated linker puts `@gpuix/react` only under
`packages/components/node_modules`, so components' `tsconfig.json` maps the JSX
runtime through a loadable `.ts` shim (`src/internal/{jsx-runtime,jsx-dev-runtime}.ts`).
Mapping straight to the installed `.d.ts` made `nub` fail with
`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`; plan 380 fixes it and a drift
check holds the shim's intrinsic map to the installed declaration. A tokens-side
`@gpuix/react` devDependency or `@jsxImportSource react` pragma would let the
shim go (owner: tokens-theme, optional)
`[x]` Promote the workstream to `main`: plans 010–019 and 051, `packages/tokens`
and the union plan index are on `main` (commit `458fe10`); `main` now compiles
`@gpuixui/tokens` from source, so `primitives`, `components` and `docs-site` can
merge it and drop their structural copies
`[ ]` Merge `main` into `agent/tokens-theme` once plan 019 (motion tokens) lands
there, then promote that commit — `agent/tokens-platform` is a second branch for
this workstream, created because two live sessions shared one worktree (see
`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`), and should be
retired once both branches are one

## Phase C — Tier 1–2 components

`[~]` `[███░░░░░░░]` 2/3

`[~]` Tier 1 foundational components (code + test + example + docs + inventory):
      all 19 components have code, tests, a runtime-verified interaction, an
      in-package docs page, a mounted example and an inventory row; **docs-site
      pages are still pending** (docs-site workstream)
`[x]` Tier 2 composition/feedback components (same bar)
  - [x] Write and index the Tier 2 plan set (plans 110–119)
  - [x] `packages/components` package, token/primitives adapters, native test harness
    - [x] Package scaffold (package.json, tsconfig, vitest config, README)
    - [x] `internal/collection.ts` (index arithmetic), `internal/key.ts` (key predicates)
    - [x] `internal/theme.ts` adapter over the landed token API (plan 110 §6) — the tokens workstream is merged into this branch
    - [x] `runtime.test.tsx` — the renderer guard (plan 117 §5b): a lifted dynamic import decides `available` / `unsupported-host` / `missing`, and fails on a supported host. Proven to fail by adding this host to `supportedHosts`.
    - [x] `internal/test-root.tsx` (`renderComponent`) — renders under a theme; runs here now that the native binding loads
    - [x] `internal/a11y.ts` — the accessibility dump normalised for assertions (role case, `value` vs `label`)
    - [x] Behaviour suites under a second config (`src/behaviour/`, `test:behaviour`): a static GPUix import fails to *load* on an unsupported host, so `describe.skipIf` cannot gate them (plan 117 §5a/§5c). **The split stays**: the suites now run here, on hosts with a binding
  - [x] Foundation parts: Card, Badge, Avatar, Alert, EmptyState, List (plan 111)
    - [x] `internal/collection.ts` (List single-selection core, shared with Tabs/menus)
    - [x] Card: `src/card.tsx`, behaviour suite, example, docs page, inventory record — **verified natively** (5/5, `nub run --filter @gpuixui/components test:behaviour`)
    - [x] Badge: `src/badge.tsx` + `toneSurface` in the theme seam, behaviour suite (7/7), example, docs page, inventory record
    - [x] Avatar: `src/avatar.tsx` + `src/avatar/logic.ts` (unicode-safe initials), behaviour suite (7/7) + logic suite (8), example, docs page, inventory record
    - [x] Alert: `src/alert.tsx`, behaviour suite (10/10, real click + keyboard), example, docs page, inventory record — the dismiss control is `internal/button.tsx`
    - [x] Local button stand-in: `src/internal/button.tsx` (`Button`, `IconButton`), behaviour suite (9/9); plan 110 §7 amended
    - [x] EmptyState: `src/empty-state.tsx`, behaviour suite (6/6), example, docs page, inventory record
    - [x] List / ListItem: `src/list.tsx` over `internal/collection.ts`, behaviour suite (12/12: real focus, wrap over disabled rows, controlled), example, docs page, inventory record
  - [x] Overlays: Dialog, Confirmation dialog, Popover
    - [x] Plan 112 §1/§1b re-measured against 0.10.0 and corrected: there is **no** `Dialog`, `DismissableLayer`, `pushDismissLayer` or `anchored fill="window"`, so the overlays are local implementations over host elements
    - [x] Plan 112 §1b's five overlay probes answered and recorded in plan 112 §1c — the veil must be an `<anchored position={{x:0,y:0}}>`, because `position:"absolute"` resolves against the mount parent; `focusNextWithin` wraps; a focused `tabIndex={-1}` node receives keys
    - [x] `internal/dismiss-layer.ts` (topmost-layer-wins, one event consumes one layer) + `dialog.tsx` (+ 5 logic tests, 12 native behaviour tests)
    - [x] `confirm-dialog.tsx` — Cancel-first, caller-owned close, loading locks both dismissals (+ 5 native behaviour tests)
    - [x] `popover.tsx` — `FloatingLayer` anchoring, Escape restores focus, Tab/outside press do not, mouse-down re-open guard (+ 8 native behaviour tests, both themes)
    - [x] Examples, docs pages and inventory rows for Dialog, Confirmation dialog and Popover
    - [x] Plans 112/113 reference `keyboardFocusDim` and `focusVisible`, which 0.10.0's `StyleDesc` does not have — corrected in the plans before any overlay style was written
    - [x] `StyleDesc` has per-side border *widths* but a single `borderColor`; a separator that needs its own colour uses a 1px `div` or `borderColor` (as `CardFooter` does). Plan 111's footer row uses `borderColor`.
    - [x] Plan 112's `DialogContent` names the surface through `aria-label` only (0.10.0 has no `aria-labelledby`; verified in `AnchoredProps`/`HostProps`)
  - [x] Disclosure and navigation: Tabs, Accordion, Collapsible, Breadcrumb, Pagination (plan 113)
    - [x] Logic: `accordion/logic.ts`, `breadcrumb/logic.ts`, `pagination/logic.ts`, `tabs/logic.ts`
    - [x] `tabs.tsx` + 8 native behaviour tests (automatic/manual activation, wrap, disabled, controlled)
    - [x] `collapsible.tsx` + 4 native behaviour tests (unmounts while closed, Enter/Space, controlled)
    - [x] `accordion.tsx` + 8 native behaviour tests (single/multiple, collapsible, disabled, null close)
    - [x] `breadcrumb.tsx` + 5 native behaviour tests (collapse keeps the ends, separators follow their item)
    - [x] `pagination.tsx` + 8 native behaviour tests (edges, current page no-op, both themes)
    - [x] Examples, docs pages and inventory rows for all five
  - [x] Menus: Dropdown, Context, Command (plan 114)
    - [x] Logic: `menu/logic.ts` over the shared collection
    - [x] `menu/state.ts` + `menu/item.tsx` + `menu/surface.tsx` (the shared row registry, highlight-follows-focus, menu keyboard rules)
    - [x] `dropdown-menu.tsx`, behaviour suite (9/9), example, docs page, inventory row
    - [x] `context-menu.tsx` on `onAuxClick` + `isRightClick` and an `anchored` surface at the pointer (6/6), example, docs, inventory
    - [x] `command-menu.tsx` composing Dialog + the shared row look; input keeps focus, Enter arrives as `submit` (8/8), example, docs, inventory
  - [x] Choice inputs: Search input, Combobox (plan 116)
    - [x] Logic: `combobox/logic.ts` (ranking + selection)
    - [x] `search-input.tsx` + 6 native behaviour tests (typing, clear + focus, Enter, Escape once, controlled)
    - [x] `combobox.tsx` wrapping GPUix's headless combobox with pre-ranked items; 10 native behaviour tests (ranking, value payload, single/multiple, disabled, Escape)
    - [x] Examples, docs pages and inventory rows for both
  - [x] Feedback: Toast system, inline validation (`Field`)
    - [x] `toast/model.ts` + test (the `ToastInput` boundary type and the queued `Toast`)
    - [x] `toast/store.ts` + test (queue, monotonic ids, `FiberMap` timers, `TestClock`)
    - [x] `validation/logic.ts` + test (`validate` / `validateAll` over schema issues)
    - [x] `toast/provider.tsx` + `viewport.tsx` + `toast.tsx` (ManagedRuntime boundary, `useToast`, viewport) + 7 native behaviour tests
    - [x] `field.tsx` (Field/FieldLabel/FieldDescription/FieldError/FieldInput) + 5 native behaviour tests
    - [x] Examples, docs pages and inventory rows for Toast and Field
  - [x] Date / time picker (plan 119) — the day picker is done; a time picker is documented as out of scope
  - [x] Tier 2 verification matrix and inventory sync check (plan 117)
    - [x] `src/inventory.ts` + `src/inventory.test.ts`: files exist, rows agree, no duplicates, `done` implies a behaviour test
    - [x] `src/behaviour/theme-matrix.test.tsx`: the both-theme matrix for the 11 components without one
    - [x] Six records corrected from `gpuixSupport: "yes"` to `partial` where the runtime lacks the ARIA surface or a keyboard path
  - Tier 2 hardening after the inventory closed (plans 120+)
    - [x] Combobox `debounce`: one query per burst, never one the user abandoned — plan 541; the optional window collapses a burst of edits into its last query while opening stays immediate and a close drops a pending report; 2 native tests (Combobox 41, behaviour 658), both-direction proof; example, docs and `COMPONENTS.md` synced
    - [x] Date picker month chooser and year stepping — plan 546; the month label opens a 12-month chooser for the viewed year, the header then steps years, a choice keeps the day-of-month (clamped to a shorter month) and never writes the value, an out-of-bounds month and a wholly out-of-bounds year are inert, and the chooser is its own roving grid; 6 pure + 8 native tests (DatePicker 31, calendar 30), both-direction proof (the 8 native cases fail on the old header), docs, example, `COMPONENTS.md` and the inventory synced
    - [x] Breadcrumb composed separators and an announced current page — plan 547; `BreadcrumbSeparator` renders its child (it painted `/` regardless), a collapsed trail keeps the hidden entry's separator at the ellipsis, and the item holding the current page carries `currentLabel` through `aria-description` (an authored description wins). 5 native tests (Breadcrumb 12), three mutation proofs; docs, example, `COMPONENTS.md` and the inventory synced
    - [x] Toast viewport placement — plan 548; `position` names one of four corners (default bottom-right) through one exhaustive rule, so an app with a bottom-right rail can move its notifications. 2 native tests (Toast 18), both-direction proof (the composed test fails on a fixed corner, the default test fails without the rule); example, docs, `COMPONENTS.md` and the inventory synced
    - [x] An invalid field keeps its focus ring — plan 552; `FieldInput` drew its ring only while valid, so a focused invalid field looked exactly like an unfocused one (same destructive border, no `boxShadow`). A focused input now paints the token ring whether or not it is valid, with the destructive border still carrying the error; 2 native tests (Field 9) + a no-focus pin, both-direction proof; docs, `COMPONENTS.md` and the inventory synced
    - [x] Form and multi-step form re-check after an edit (`revalidate`) — plan 397; 5 pure + 7 native tests, both-direction proof (unit 395, behaviour 626); docs, examples, `COMPONENTS.md` and inventory synced
    - [x] Leaving a field finishes the edit without `onBlur` — plan 554; the runtime delivers no React `focus`/`blur` for a native focus change, so `ColorPicker` never committed a typed HEX, `HotkeyRecorder` stayed in “Press keys…” and `TimePicker` never padded a one-digit segment. Each now finishes on `Tab` and on a press outside the field, and the time picker pads the untouched segment on the other’s edit; six native cases replace three unobservable ones (TimePicker 14, Color picker 10, Hotkey recorder 15), six mutation proofs, behaviour 737 with the 55 plan-540 binding failures; docs, `COMPONENTS.md` and the inventory synced (owner: components)
    - [x] A dropdown opened with `Space` stays open — plan 557; the trigger opened on key down, and the local `Button`'s key-up activation click then toggled it closed, because a real window renders between the two events. `simulateKeystrokes` batched them, so the suite missed it; the trigger now names its row from the keyboard activation click and the new native case drives `nativeSimulateKeyDown`/`nativeSimulateKeyUp` separately (Dropdown menu 51), three mutation proofs; docs, example, `COMPONENTS.md` and the inventory synced
    - [x] A refused non-collapsible accordion toggle reports nothing — plan 559; a single non-collapsible accordion returned the same state from `toggle`, but the renderer still called `onValueChange` with the unchanged value, unlike every other controlled component. The callback now returns before reporting when the state reference is unchanged; 1 native case (Accordion 23), mutation proof; docs, example, `COMPONENTS.md` and the inventory synced
    - [x] A pasted comma-separated tag list commits every token — plan 561; the field kept the last segment of a bulk change as the draft, so pasting `"a,b"` added only `"a"` and left `"b"` in the field although the docs promised both. The rule is now a pure `editDraft` that distinguishes a typed comma (empty tail) from a paste (non-empty tail); 4 pure cases, two mutation failures; docs, `COMPONENTS.md` and the inventory synced
    - [x] Tabs panels are named by their trigger — plan 564; measured: a
      `tabpanel` announced `profile` (the internal value) instead of `Profile`
      (the visible label), so a screen reader heard an opaque id for the only
      region the tab set revealed. The panel now borrows the trigger's
      plain-text name, a caller `aria-label` still wins, and an unnamed/composed
      trigger or removed controlled tab falls back to the value. Registration
      now updates a row in place, so a tab disabled and enabled again keeps its
      authored position (it used to move to the end, and the next arrow key
      skipped a neighbour). 5 native cases (Tabs 28, behaviour 744), three
      mutation proofs; docs, `COMPONENTS.md` and the inventory synced
    - [x] A refused tag edit reports no change — plan 562; `TagInput` called `onValueChange` with the same list on every keystroke that had not completed a token, and for a duplicate, the `max` cap and an empty commit. Both reporting paths now return when the rule handed back the current list by reference, so a controlled consumer sees only real edits; 2 strengthened native cases (Tag / token input: 15, one known plan-540 binding failure), both fail on the old wiring; docs, `COMPONENTS.md` and the inventory synced
    - [x] The combobox trigger paints focus and keeps the caller's style — plan
      565; measured: an `autoFocus` trigger was the focused element yet painted
      no ring, and a caller `style` was overwritten. The trigger now seeds
      `focused`, paints the token ring unless disabled or open, and merges the
      caller's style last; 4 native cases (Combobox 45), four mutation proofs;
      docs, `COMPONENTS.md` and the inventory synced
    - [x] The `List` activation doc promised a double-click action that never existed — the measured host carries no click count (playground plan 525 §2), so the `Activatable` comment now matches the single-press contract (owner: components)
    - [x] A tab panel needs a live trigger — plan 566; a selected value that
      named a removed tab kept painting its panel, so the tab set revealed a
      region no trigger could select (the controlled case was documented; the
      uncontrolled case was not). `TabsContent` now renders only while a
      registered trigger carries its value; the selection is never rewritten,
      and a disabled selected tab still keeps its panel. 3 native cases
      (Tabs 31), both-direction proof plus a disabled-gate mutation; docs,
      `COMPONENTS.md` and the inventory synced
    - [x] The avatar keeps its initials behind the picture — plan 571; a `src`
      replaced the initials in the tree, so a file that never loads left the disc
      blank although `ImgProps` has no load/error event. The initials now always
      render and the picture is an inset absolute layer over them (absolute
      resolves against the positioned disc, measured). 1 changed + 1 new native
      case (Avatar 10), both fail on the old conditional; example, docs,
      `COMPONENTS.md` and the inventory synced
    - [x] The message scroller's jump affordance floats in its corner — plan 572;
      it took a flex row beneath the viewport because plan 112 measured only the
      unpositioned absolute case. The root is now the positioning context and
      the button overlays the transcript's bottom-right (the old layout's bottom
      measured 233 against a viewport ending at 200). 1 native case (Message
      scroller 11), both-direction proof; docs, `COMPONENTS.md` and the inventory
      synced
    - [x] A notification-centre header action owns its keys — plan 576; measured:
      `Enter` on `NotificationCentreMarkAll` ran the action **and** read the
      active row, and an arrow key stole focus from the header button into the
      list. Key ownership is now decided from the focused element, because
      `EventPayload.elementId` names the handler's own element; 3 native cases
      (Notification centre 16), the first two failing without the gate; docs,
      `COMPONENTS.md` and the inventory synced (owner: components)
    - [x] A control inside a list row owns its keys — plan 577; measured: with a
      row active, `Enter` on a trailing button ran the button **and** activated
      the row, and typing in a trailing field moved native focus out of it on
      every character. The list now acts only while a registered row holds
      focus; 2 native cases (List 52), both failing without the gate; docs,
      `COMPONENTS.md` and the inventory synced (owner: components)
    - [x] The natively focused list row is the roving origin — plan 578;
      measured: `Space` on the focused row reported nothing, the first arrow
      jumped to the first row, a first `Shift+Arrow` started its range there and
      type-ahead started from the first match, because a native focus change
      never runs React's `onFocus`. The origin now comes from
      `getFocusedElementId()` at key time (the rule Tabs adopted in plan 367);
      four new native cases (List 56), all failing without it, eleven recorded
      List failures flip to pass, and the three row-removal cases stay red
      pending plan 540's focus-event fix; docs, `COMPONENTS.md` and the
      inventory synced (owner: components)
    - [x] The message scroller measures its pin in the scroller's visible box —
      plan 582; measured: a scroll container's own bounds are reported in
      scrolled content space (viewport `y: -1080` at offset `-1080`) while its
      rows are in window space, so nine cases were read as plan-540 failures: the
      suite wheeled at off-screen coordinates and a scroll back to the end could
      never re-pin. The pin and the suite now use the unscrolled root's box, and
      a new re-pin case fails with the old rule (12 tests, behaviour 741/35);
      docs, `COMPONENTS.md` and the inventory synced (owner: components)
    - [x] A press on an overlay's own trigger closes it once — plan 583; measured:
      the runtime delivers `mouseDownOutside` on the press and the trigger's click
      on release in separate tasks, so the microtask-cleared one-gesture mark was
      gone and the click re-opened every overlay — a user could not close a
      Popover, Dropdown menu, Combobox, Preview card, Navigation menu or
      Notification centre by pressing its trigger. The layer now reads the press
      position and claims it without closing; 6 native cases, both-direction proof;
      docs, `COMPONENTS.md` and the inventory synced (owner: components)
    - [x] The event claim lives one task — plan 587; playground plan 558 measured
      a live window closing **both** a submenu and its dialog on one Escape: the
      nested handler and its parent's arrive across a microtask, and the claim was
      cleared in one. `claimEvent` now schedules a task-scoped cleanup that clears
      only its own claim, and the behaviour teardown crosses a task so a claim
      cannot leak between tests. 5 claim + 1 dismiss-stack unit cases, both
      direction proven (unit 432); the native suite stays at 747/35 of 782
      because the `TestRenderer` delivers copies synchronously, and the seven
      tests that only passed on the short claim are named in the plan; docs,
      `docs/component-api.md`, `COMPONENTS.md` and the inventory synced (owner:
      components)
    - [x] Closing the command menu returns focus to its opener — plan 589; the
      playground's `tier2-command` and `live-tier2-command` both measured
      `focused=none` (plan 581). `CommandMenuInput`'s `autoFocus` took native
      focus in the same commit, before `useModalFocus` recorded the opener, so
      the saved id was the input being destroyed. The field now relies on the
      dialog's `initialFocus` (the ring stays seeded from the open state), and
      the dead `Home`/`End` branches (consumed by the host input) are gone; 1
      native case (Command menu 24), mutation proof; docs, `COMPONENTS.md` and
      the inventory synced (owner: components).
    - [x] Toast progress — plan 592: the store publishes `ToastTiming`
      (`totalMs`/`remainingMs`/`paused`) and a card paints a 2px bar that ticks
      every 100 ms, freezes with the hover/focus hold and is absent for a
      zero/infinite duration; 6 timing + 5 store + 1 stream + 2 native cases
      (Toast 20), two mutation proofs; docs, `COMPONENTS.md` and the inventory
      synced (owner: components)
    - [x] The chat composer paints the focus ring — plan 595: measured that an
      `autoFocus` `<textarea>` was the focused element yet painted no
      `boxShadow`, the one focusable part plan 522 never reached. It now seeds
      `focused` from `autoFocus`, composes the caller's `onFocus`/`onBlur` and
      paints the token ring only while focused; 2 native cases (Chat 12), a
      no-ring pin, both-direction proof; docs, `COMPONENTS.md` and the inventory
      synced (owner: components)
    - [x] Animated surfaces are addressable — plan 597: `motion.div`'s published
      type omits `testId`/`role`/`aria-*` (though the runtime forwards them), so
      Collapsible/Accordion bodies, the Popover and Drawer panels and the Toast
      exit ghost had no id and the playground measured a neighbouring row
      instead. A typed `MotionSurface` restores the host surface and the tween
      boxes carry `<part testId>-surface` / `toast-<id>-surface`; 6 native
      cases (behaviour 758/35 of 793, the same 35 plan-540 failures), five
      mutation proofs; docs, `COMPONENTS.md` and the inventory synced
      (owner: components)
    - [x] The date picker and combobox expose their open state — plan 602:
      both roots now take the same `open`/`defaultOpen`/`onOpenChange` trio as
      Popover and ContextMenu. `DatePicker` restores focus only when the close is
      accepted, and a `defaultOpen` combobox reports the empty opening query
      once; 3 native cases each (DatePicker 34, Combobox 49), four mutation
      proofs; docs, examples and `COMPONENTS.md` synced (owner: components)
    - [x] A List row keeps its hover tint over a trailing control — plan 606:
      measured in plan 335 §1.3 that GPUix hover is per element, so a child's
      hover cancels the row's refinement and the row goes flat under a trailing
      button; the row tracks its own crossing and `Button`/`IconButton` report
      their hover through an internal hover group (unmount-safe), while a custom
      interactive child stays per element and is documented, and a member removed
      while hovered leaves the group on unmount. 4 native cases (List 60),
      both-direction proof (all four fail before the wiring); docs,
      `COMPONENTS.md` and the inventory synced (owner: components)
    - [x] Pagination reports only real pages — plan 611: measured four ways to
      hand `onPageChange` a page that does not exist: a caller `disabled={false}`
      re-enabled Previous on page 1 (`0`) or Next on the last page (`11`), and
      fractional `page`/`pageCount` desynced the window from `current` (no
      current item, then `0.5`; a `6` beyond a 5-page list). `pageCountOf` and
      `currentPageOf` normalise once for the root and the window, and each edge
      control ORs the caller's `disabled` and guards its handler. 4 pure + 4
      native cases (unit 449, Pagination 17), both-direction proof; docs,
      `COMPONENTS.md` and the inventory synced (owner: components)
    - [x] A disabled date picker is inert even when it is open — plan 612:
      measured that a `disabled defaultOpen` picker focused a day, reported
      `2026-10-18` from a press and `null` from Clear, kept the header browsing
      and the grid undescribed. The surface now stays painted but takes no
      focus, puts every day/month/header control out of the tab order with no
      hover or ring, announces `Disabled` on the grid, hides Clear, and the
      root's `choose`/`clear` refuse. 3 native cases (DatePicker 37,
      behaviour 811), both-direction proof; docs, `COMPONENTS.md` and the
      inventory synced (owner: components)
    - [x] InlineEdit commits when native focus leaves without a blur event —
      plan 613; measured `renderer.focusNext()` moves native focus while
      dispatching no React focus/blur (the state the plan-605 live gate hit), so
      the open edit samples `getFocusedElementId()` every 50 ms and commits once
      the input has held focus and another host takes it, keeping the user's
      focus. 2 native cases (InlineEdit 19), both-direction proof (the focus
      case fails with the sampler removed); docs, `COMPONENTS.md`, `TODO.md`
      and the inventory synced (owner: components)
    - [x] A control inside a carousel slide owns its keys — plan 614; the docs
      said arrows/Home/End work when the **carousel** is focused, but the root
      handled every bubbled key, so `ArrowRight`/`End` on a nested tab rail also
      stepped the carousel (the host `<input>` consumes its own arrow keys, so
      the case uses a nested widget). The root gates its branches on
      `getFocusedElementId()` at key time and forwards every key to the caller;
      1 native case (Carousel 18), both-direction proof (two carousel reports
      before the gate); docs, `COMPONENTS.md` and the plan indexed
      (owner: components)
    - [x] Heading levels belong to the caller — plan 617; Card, Dialog, Drawer
      and the Keyboard shortcuts group hard-coded their `aria-level`, so a
      consumer could not fit them into the document outline (and the shortcuts
      group had no escape hatch at all). Each heading part now takes an optional
      typed `level` (1–6) with its shipped default, and the raw `aria-level`
      still works; 4 native cases (Card 6, Dialog 17, Drawer 15, Keyboard
      shortcuts 7), four mutation proofs; docs, `COMPONENTS.md` and the
      inventory synced (owner: components)
    - [x] A carousel index that names no slide hides every slide — plan 619.
      Measured: `value={1.5}` / `value={NaN}` made `active` fractional, so no
      slide compared equal and the whole track painted nothing (and stepping
      could not recover). One pure `slideIndex` rule truncates and clamps; 5 rule
      + 2 native cases (Carousel 20), both new cases failing on the old
      derivation; docs and `COMPONENTS.md` synced (owner: components)
    - [x] A registered row keeps its place when its state changes — plan 620.
      Measured: a `disabled` toggle ran the registration cleanup and re-appended
      the row, so a re-enabled middle section or list row jumped to the end of
      the registry — the next arrow key skipped the authored neighbour, and the
      accordion drew the divider under the wrong section. Accordion and List now
      update a registered row in place; 2 accordion + 1 list native cases
      (Accordion 25, List 61), all three failing at `HEAD`; docs, `PLAN.md`,
      `COMPONENTS.md` and the inventory synced (owner: components)
    - [x] The avatar's picture is decorative — plan 624. Measured: an avatar with
      `src` exposed **two** image nodes both named `"Ada Lovelace"`, because the
      `<img alt={name}>` inside the `role="img"` root was a second named image.
      The picture is now `role="presentation"` with an empty `alt`, so the photo
      still paints over the initials while the accessibility tree carries one
      image; 1 native case (Avatar 11), both-direction proof (removing the role
      restores the second node); docs, `COMPONENTS.md` and the inventory synced
      (owner: components)
    - [x] Readable marks — plan 625: measured that the menu's 2px highlight bar,
      its check glyph and its radio dot painted the `accent` wash on `popover`
      (about 1.1:1, under the 3:1 mark floor), and the timeline's upcoming dot
      painted `muted` on the canvas (1.06:1 light, 1.23:1 dark). They now paint
      `popoverForeground` and `mutedForeground`; 1 new + 2 strengthened native
      cases (Dropdown menu 53), both-direction proof; docs, `COMPONENTS.md`
      (owner: components)
    - [x] A status list announces its rows — plan 626: `StepperStep` and
      `TimelineItem` exposed only the current row (`aria-selected`); complete
      and upcoming were colour-only, so assistive technology heard three
      identical list items. Both now append `Complete`/`Current`/`Upcoming`
      through the shared `statusDescription` joiner, keeping a caller's own
      description first; 4 new native cases (Stepper 10, Timeline 8), the four
      failing on the old source; docs, `docs/component-api.md`, `COMPONENTS.md`
      and the inventory synced (owner: components)
    - [x] A dialog or drawer announces its description — plan 627: 0.10.0 has
      no `aria-describedby`, so `DialogDescription`/`DrawerDescription` were
      visual only and a screen reader heard the name but not the consequence.
      The parts register their plain text with the modal root and the surface
      delivers it through `aria-description` (an explicit content value wins);
      2 dialog + 1 drawer + 1 confirmation native cases (Dialog 19, Drawer 16,
      Confirmation dialog 6), three mutation proofs; docs, `COMPONENTS.md` and
      the inventory synced (owner: components)
    - [x] A disabled colour picker leaves the tab order — plan 628: the swatches
      dropped out with `disabled`, but the HEX input only became `readOnly`, and
      a read-only input is still a tab stop, so a keyboard user could reach a
      field they could not edit. The field now carries `tabIndex={-1}` when
      disabled; 1 new native case (Color picker 11), proven to fail on the old
      input and a pin keeps the enabled field reachable; docs, `COMPONENTS.md`
      and the inventory synced (owner: components)
    - [x] Keyboard shortcuts: a raw `aria-level` is honoured, and never leaks
      onto the group — plan 630. Plan 617 promised the raw fallback; the group
      only wired the typed `level` and spread `aria-level` onto its
      `role="group"` element. The heading now reads
      `headingLevel(level, authoredLevel, 3)` and the raw prop is destructured
      off `rest`; 2 native cases (Keyboard shortcuts 9), both failing on the old
      source; docs and `COMPONENTS.md` synced (owner: components)
    - [x] A modal returns focus to its opener even when its content auto-focused
      — plan 638. Measured: `useModalFocus` recorded the opener in the effect
      that waits for `contentId`, by which point a child's `autoFocus` had
      already moved native focus; a dialog or drawer with an auto-focused
      `FieldInput` closed with focus on the field inside the exiting surface
      (`Option.none()` after the exit). The opener is now captured at the
      surface's first render, before any focus change; 1 dialog + 1 drawer
      native case (Dialog 20, Drawer 17), both failing on the old source;
      docs, `COMPONENTS.md`, `PLAN.md` D30 and the plan index synced
      (owner: components)
    - [x] A colour swatch activates Space on release — plan 640: plan 334's
      sweep of the remaining button-shaped parts missed the colour picker's
      swatch grid, which still ran `isActivation` from `onKeyDown`; Space chose
      a colour on press, before it could be cancelled. The swatch now uses the
      shared `activationHandlers`, so `Enter` activates on key down and Space on
      key up; 2 native cases (Color picker 13, the Space-down case failing with
      `onValueChange("#2a303b")` on the old source); the full behaviour suite is
      805 passed / 35 failed of 840 (the same plan-540 binding failures); docs,
      `COMPONENTS.md`, `PLAN.md` D30 and the plan index synced (owner:
      components)
    - [x] The notification centre scrolls its reading cursor into view — plan
      644. Measured: 10 `ArrowDown` presses left the active row at `y: 511`
      under a feed ending at `339`, and one press after a 400 px wheel left it at
      `y: -285`, although `focusElement` had moved focus; `scrollIntoView`
      under-scrolls on this binding. The feed is now an unscrolled frame around
      a scrolling viewport with a zero-height top sentinel, and a measured rule
      reveals the row with an 8 px margin in both directions. 2 native cases
      (Notification centre 19), the down case failing with the reveal removed
      and the up case with its `above` branch removed; docs, `COMPONENTS.md`,
      `PLAN.md` D30 and the plan index synced (owner: components)
    - [x] Tabs: the disabled-tab handover reads the natively focused tab — plan
      646. Measured: a tab focused through the renderer (a `Tab` entry or a
      programmatic `focusElement`, neither of which runs React's `onFocus`) kept
      native focus when the app disabled it, because the plan-511 handover keyed
      only on the remembered id; the origin is now the renderer's focused row,
      with the remembered id as fallback. 3 existing native cases fail at `HEAD`
      and pass after (Tabs 29 of 31); the removed-host and `onBlur` cases stay
      red with the plan-540 focus-signal failures. Docs, `COMPONENTS.md`,
      `PLAN.md` D30 and the plan index synced (owner: components)
    - [x] List: the disabled-row handover reads the natively focused row — plan
      647, the List half of 646. Measured: a row focused through the renderer
      kept native focus when the app disabled it, because the plan-510 handover
      keyed only on `focusedRow.current`; the origin is now the renderer's
      focused row, with the remembered row as fallback. 1 existing native case
      fails at `HEAD` and passes after (List 59 of 61); the two removed-host
      cases stay red with the plan-540 focus-signal failures. Docs,
      `COMPONENTS.md`, `PLAN.md` D30 and the plan index synced
      (owner: components)
    - [x] Breadcrumb: a non-finite `maxItems` hides the current page — plan 649.
      Measured: `Math.trunc(NaN)` made the budget `NaN`, the "fits" branch was
      skipped and `Arr.takeRight(items, NaN)` returned nothing, so the trail
      painted `Projects …` with every middle entry and the current page gone
      (while `Infinity` rendered the whole trail). A non-finite budget now means
      "no collapse"; 1 pure + 1 native case (Breadcrumb 13), both-direction proof
      (the pure case renders `a …` and the native case paints three entries at
      `HEAD`); docs, `COMPONENTS.md` and the inventory synced (owner: components)
    - [x] Countdown: a non-finite remaining duration paints `NaN:NaN` — plan
      650. Measured: `Math.max(0, NaN)` flowed through `breakdown` and
      `formatCountdown`, the text read `NaN:NaN` (`Infinityd Infinity:NaN:NaN`
      with days), and `remainingMs <= 0` kept it in the live colour with
      `expired: false`. `wholeSeconds` maps a non-finite value to 0 and the
      component normalises once for expiry, the text and the style state; 2 pure
      + 1 native case (Countdown 6, unit 457), both-direction proof (the pure
      cases read `NaN:NaN`/NaN units and the native tree painted no `00:00` at
      `HEAD`); docs, `COMPONENTS.md` and the inventory synced (owner: components)
    - [x] A malformed count cap hides nothing — plan 651. Measured: `siblingCount={NaN}`
      painted `1 … 10` with the current page gone, `maxVisible={NaN}` returned no
      suggestion and `recentLimit={NaN}` recorded no recent, because `Math.max`
      propagated `NaN` and `Arr.take(list, NaN)` is empty. One shared `wholeCap`
      treats a non-finite bound as no bound (never "hide everything") and keeps
      each component's documented floor for finite values; 1 helper + 3 pure +
      3 native cases (unit 462, behaviour 58 → 61 in the three touched files with
      the same 3 recorded plan-540 failures), both-direction proof (the 3 native
      cases fail on the old source); docs, `COMPONENTS.md`, `PLAN.md` D30 and the
      inventory synced (owner: components)
    - [x] A malformed pin threshold stops the scroller following — plan 652.
      Measured: `observeScroll(initial, { distanceFromEnd: 0, threshold: NaN })`
      read `pinned: false`, because `Math.max(0, NaN)` is `NaN` and
      `distanceFromEnd <= NaN` is always false, so an appended row was never
      followed, wheeling back to the end could not re-pin and every arrival
      stayed counted. `pinThreshold` falls back to the theme's 24px default for
      an absent or non-finite value and clamps a negative one to zero; 2 pure +
      1 native case (unit 464, Message scroller 13), the native case failing on
      the old wiring; docs, `COMPONENTS.md`, `PLAN.md` D30 and the inventory
      synced (owner: components)
    - [x] A loading confirmation announces that it is in progress — plan 655.
      Measured: the `…` glyph's own `aria-label` never reaches its parent
      `div role="button"`, so a loading confirm announced "Confirm / Disabled".
      The action now carries `aria-description="In progress"`, joined with
      `Disabled` by the shared description helper; 1 native case (Confirmation
      dialog 7), both-direction proof; docs, `COMPONENTS.md`, `PLAN.md` D30 and
      the inventory synced (owner: components)
    - [x] A fractional multi-step index names no step — plan 657. Measured:
      `step={1.5}` with three steps painted step one while reporting
      `1.5:false:false`, and `next` reported `2.5`, skipping a step, because
      `Number.clamp` truncates nothing. The rule is now the shared
      `wholeIndex` (truncate a finite value, start a non-finite one at the first
      entry, clamp in range), which Carousel's `slideIndex` delegates to; 4 pure
      + 2 native cases (unit 468, Multi-step form 17, behaviour 820/31 of 851 —
      the same recorded binding failures), the fractional case failing on the
      old source; docs, `COMPONENTS.md`, `PLAN.md` D30 and the inventory synced
      (owner: components)
    - [x] The search field's clear control paints a focus ring — plan 659;
      measured 2026-10-19: it was its own tab stop (`tabIndex 0`) and took native
      focus, but had no `focused` state or `focusRing`, and the field's surface
      ring stayed on after focus left the input because no React `blur` is
      delivered. While there is text to clear the field now samples
      `getFocusedElementId()` every 50 ms (the plan-613 precedent): the surface
      rings only while the input holds focus, the clear control rings while it
      does, and both clear when focus leaves; 2 native cases (Search input 15),
      three mutation proofs; docs, `COMPONENTS.md`, `PLAN.md` D30 and the
      inventory synced. The shared-focus-tracker interlock on `primitives`
      remains the long-term home for the sample (owner: components)
    - [x] A search field's ring follows focus in every state — plan 660;
      measured 2026-10-19: plan 659's sample ran only while the field had text,
      so an empty seeded field kept its ring after `focusNext()`, an empty field
      focused by `focusElement()` painted none, and disabling a focused field
      kept both the ring and `focused: true`. The sample now runs while the field
      is enabled, the disabled branch clears both states and the ring never
      paints while disabled; 3 native cases (Search input 18), all failing on the
      old source; docs, `COMPONENTS.md`, `PLAN.md` D30 and the inventory synced
      (owner: components)
    - [x] A malformed stepper step names no step — plan 661; measured 2026-10-19:
      `value={1.5}` marked step one complete and every later step upcoming, and
      `value={NaN}` marked every row upcoming, so the stepper painted no current
      row at all. The root normalises its 1-based step once through `wholeStep`
      (a fractional value truncates, a non-finite one starts at the first step);
      2 pure + 2 native cases (unit 470, Stepper 12), all failing on the old
      source; docs, `COMPONENTS.md`, `PLAN.md` D30 and the inventory synced
      (owner: components)
    - [x] A fractional tag cap admits one token too many — plan 662; measured
      2026-10-19: the cap was compared with the raw number, so `max={1.5}` with
      one token admitted a second (`1 >= 1.5` is false). `wholeCap` now
      normalises it once, so a fractional cap truncates and a non-finite one
      means no cap; 2 pure + 1 native case (unit 472, Tag / token input 16), the
      fractional assertions failing on the old source; docs, `COMPONENTS.md`,
      `PLAN.md` D30 and the inventory synced (owner: components)
    - [x] A combobox trigger without a label is unnamed — plan 666; measured
      2026-10-19: 0.10.0 does not lift a role-bearing div's text child into its
      accessible name, and `ComboboxTrigger` wrote `aria-label` only when the
      optional `label` was authored, so an unlabelled trigger painted "Select…"
      but announced `button` with no name. `controlName` now names it from the
      visible selected labels or placeholder, and a caller `aria-label` still
      wins and is trimmed; 3 native cases (Combobox 52), the placeholder and
      selected-label cases failing on the old source; docs, `COMPONENTS.md`,
      `PLAN.md` D30 and the inventory synced (owner: components)
    - [x] One Escape closes one layer at any nesting depth — plan 669; measured
      2026-10-19: the event claim was consumed by the first enclosing reader, so
      with three surfaces (a submenu, its menu, the dialog around both) one
      Escape closed the submenu **and** the menu, and a third surface could still
      act; `isEventClaimed` now reports without clearing for the rest of the
      task, so every enclosing handler skips the same event. 1 claim + 1
      dismiss-stack unit case and 1 native case (Dialog 21), the new cases
      failing at `HEAD`; the two-Escape and two-ArrowDown suites cross a task
      between real gestures, as plan 587 established; docs,
      `docs/component-api.md`, `COMPONENTS.md`, `PLAN.md` D30 and the inventory
      synced (owner: components)
    - [x] The combobox trigger's ring follows native focus — plan 672; measured:
      a trigger focused by code, Tab or the focus an accepted close returns
      reported the focused host but painted no ring, because 0.10.0 delivers no
      React focus/blur for a native move. One `useNativeFocusId` sample now
      serves both SearchInput and the trigger, so the ring appears on native
      focus and is given up while the popup's field owns it; 2 native cases
      (Combobox 54), both failing on the old source; docs, `COMPONENTS.md`,
      `PLAN.md` D30 and the inventory synced (owner: components)
    - [x] A part's default `testId` no longer discards the caller's — plan 675;
      measured: `AlertDismiss` spread `...rest` and then hard-coded
      `testId="alert-dismiss"`, so the `testId` its host props promise did
      nothing and two alerts on one screen shared one handle. The prop now
      defaults and the caller's value wins, so each dismiss control is
      addressable apart; 2 native cases (Alert 14), both failing on the old
      source; docs, `COMPONENTS.md`, `PLAN.md` D30 and the inventory synced
      (owner: components)
    - [x] A malformed toast cap keeps the default queue bound — plan 677;
      measured on 2026-10-19: `max: NaN` and `max: Infinity` each kept all five
      pushed toasts (the documented bound is 3), because `Math.max(1, NaN)` is
      `NaN` and the overflow arithmetic propagated it. A finite cap now
      truncates and floors at 1, a non-finite one keeps the default, and the
      queue can no longer become unbounded from a bad config value; 2 store
      cases fail on the old source (store 22 → 24), the native Toast suite stays
      20/20; docs, `COMPONENTS.md`, `PLAN.md` D30 and the inventory synced
      (owner: components)
     - [x] A control disabled while focused is inert — plan 680; measured on
       2026-10-19: a `Button` with `autoFocus`, a clicked `TabsTrigger` and a
       recording `HotkeyRecorder` each kept the token focus ring after the app
       disabled them, and the recorder still painted `Press keys…` (the
       accordion header, collapsible trigger and inline edit had the same
       wiring). One shared `useFocusState` drops the painted focus on disable,
       the recorder also cancels its recording, and the colour picker clears
       both focus states; 7 native cases (6 fail at `HEAD`; the shared-hook
       probe is the pin), full suite 843/31 of 874 with the same plan-540
       binding failures; docs, `COMPONENTS.md`, `PLAN.md` D30 and the inventory
       synced (owner: components)
    - [x] A menu group is named by its label — plan 689; measured on 2026-10-19:
      a `MenuLabel` beside a group did **not** name it (the docs promised it
      did), and neither did a label inside it, although `MenuGroup` accepts one,
      so the accessibility tree carried anonymous `role="group"` nodes.
      `MenuGroup` now takes `label` and falls back to its first label child,
      with a caller `aria-label` winning; the two pages also now state the
      dumped `menuitemcheckbox` role. 3 native cases (Dropdown menu 53 → 56),
      the label-child and label-prop cases failing on the old source; docs,
      `COMPONENTS.md` and the inventory synced (owner: components)
    - [x] List multiple selection (`selectionMode="multiple"`, modifiers, range) and the duplicate `COMPONENTS.md` row — plan 120
    - [x] Accordion arrow/Home/End movement between headers — plan 121
    - [x] Context menu Shift+F10 opening and focus return — plan 122
    - [x] Toast pause-on-hover with remaining-time resume — plan 123
    - [x] Toast hold on keyboard focus, composed with hover — plan 124
    - [x] List select-all (`Cmd`/`Ctrl`+A) over enabled rows — plan 125
    - [x] Dropdown menu keyboard opening lands on the first/last row — plan 126
    - [x] Date picker `min`/`max` bounds and a clear action — plan 127
    - [x] Trigger parts merge the caller's ref with their internal one (found by plan 127)
    - [x] Every part that owns a ref composes the caller's too — plan 128
    - [x] Menu type-ahead (`DropdownMenu`/`ContextMenu`) — plan 129
    - [x] List type-ahead over the shared type-ahead core — plan 130
    - [x] Dropdown menu submenus — plan 131
    - [x] Time picker, the time half of the date/time item — plan 132
    - [x] Command menu fuzzy matching and in-group ranking — plan 133
    - [x] List row activation on Enter and click — plan 134
    - [x] Submenu pointer activation and ContextMenu submenus — plan 135
    - [x] SearchInput ref and TabsTrigger onBlur forwarding — plan 136
    - [x] ListItem caller `onClick` forwarding — plan 137
    - [x] Combobox pointer selection coverage — plan 138
    - [x] Inventory test counts and the drifted rows — plan 139
    - [x] Tabs vertical orientation verified: axis keys, layout and manual activation — plan 321
    - [x] Toast actions: one labelled action with a provider-owned handler — plan 322
    - [x] Floating placement truth: compensate `align="center"` from the measured
      panel and flip a snapped surface off its trigger — plan 323 (evidence:
      plan 156 §8; `PopoverContent`/`DropdownMenuContent` promised a runtime
      flip that 0.10.0 does not provide)
    - [x] Cross-team: handle the playground's measured floating defects
      (`align="center"` off by half the panel; `fit="snap"` clamping over the
      trigger) in `PopoverContent`, `DropdownMenuContent` and
      `ComboboxContent` — plan 323; 6 new native tests, both-direction proof
    - [x] Adopt `@gpuixui/icons` for every component-owned fixed mark:
      close/dismiss, search and clear, chevrons, check marks and the toast tone
      glyph — plan 324; 451 native behaviour tests, both-direction proof, docs
      and inventory sync
    - [x] Navigation menu hover-open over one shared hover-travel policy
      (`internal/hover.ts`, also used by PreviewCard): `openOnHover`,
      `openDelay`, `closeDelay`, pointer travel into the panel, no focus theft,
      disabled triggers never open — plan 325; 7 new native tests (458 total),
      both-direction proof
    - [x] Behaviour teardown: a failed assertion no longer leaks the native root
      and reports four phantom failures — plan 326; `afterEach` teardown, a
      two-test harness proof, one wrong assertion now reports one failure
      (460 behaviour tests)
    - [x] Behaviour timing robustness under a loaded host — plan 327;
      condition-based waits in the hover suites, a 20 s native budget, and
      preview-card's 8 tests green three runs in a row
    - [x] Combobox create-new option: one trailing row over the typed query,
      single/multi selection, no sentinel leak — plan 328; 6 logic + 6 native
      tests, both-direction proof (behaviour 487)
    - [x] Command menu recent commands: front-inserted, deduped, capped, shown
      first only on an empty query — plan 329; 7 logic + 5 native tests,
      both-direction proof (behaviour 492)
    - [x] Example registry completeness and native render coverage: 17 of 41
      examples were unregistered and none had ever been rendered — plan 330;
      1 inventory assertion + 1 native suite mounting all 41, both-direction
      proof (unit 332, behaviour 493)
    - [x] List: a plain activatable list joins the roving tab stop (arrows +
      Enter; Space does not activate) — plan 373; 3 native tests, both-direction
      proof
    - [x] Carousel indicator dots: one named, pressable dot per slide — plan
      374; 3 native tests (Carousel 15)
    - [x] DatePicker display labels are the caller's (`labels`), not fixed
      English — plan 375; 4 calendar + 2 native tests, both-direction proof
      (unit 361, behaviour 547)
    - [x] Preview card and navigation menu placement truth: centre alignment and
      the near-edge flip use the shared measured rule, and the nav panel composes
      the caller's ref — plan 376; 4 native tests, both-direction proof
      (behaviour 551)
    - [x] Inline edit commits when the user leaves the field: `Tab` and an
      outside press finish the edit, because a native focus change does not
      deliver React's `onBlur` in a live window; the press restores the display
      only when it focused nothing — plan 379; 3 native tests (InlineEdit 14,
      behaviour 554), both-direction proof
    - [x] Tag chip removal control is nameable: `<chip testId>-remove`, so a
      native harness can press one token's control without coordinates — plan
      381; 1 native test (Tag / token input 10), both-direction proof
    - [x] Submenu placement truth: a submenu opens left when the right side
      cannot hold it (measured once per open), so it never covers its own row at
      the window edge — plan 382; 7 rule + 2 native tests, both-direction proof
      (Dropdown menu 36, Context menu 18, behaviour 557)
    - [x] Form field-level errors: `validateFields` keeps the schema path and
      `Form` exposes `fieldErrors`/`errorFor` — plan 384; 4 logic + 2 native
      tests, both-direction proof
    - [x] Menu radio groups: one exclusive value per group
      (`DropdownMenuRadioGroup`/`DropdownMenuRadioItem` and the Context menu
      pair), controlled, kept open, one marked row, available inside a submenu
      — plan 387; 6 dropdown + 1 context native tests, 6 mutation proofs
      (Dropdown menu 42, Context menu 19, behaviour 567); example, docs,
      `docs/component-api.md` and inventory synced
    - [x] Menu rows carry their accessible name: `MenuItem` names a plain-text
      row from its child because 0.10.0 reports no name for a menu item; a
      composed row still passes `aria-label` — measured in plan 387
    - [x] Navigation menu: leaving an open panel for another trigger switches
      panels — the pointer direction plan 387's probe found untested; 1 native
      test (Navigation Menu 20); docs and inventory synced
    - [x] `autoFocus` establishes the real focus state on every ring-owning
      part — plan 388; measured: the runtime focuses after React's effects, so
      `onFocus` never runs and the ring plus the public `<Part>State.focused`
      were wrong. 12 parts seed `focused` from the prop and the two roving roots
      are told; 11 new native tests (behaviour 578), 6 mutation proofs, docs and
      inventory synced
    - [x] Nested submenu rows stay clickable while a deeper level is open —
      plan 389; a press on an enclosing submenu row was reported as an outside
      press by the deeper layer, which closed the parent before the click could
      run. The dismiss check now tests every enclosing menu surface; 4 dropdown
      + 1 context native tests, both-direction proof (behaviour 583); docs,
      examples and inventory synced
    - [x] Combobox group headers — plan 395: `ComboboxOption.group`, one
      `role="group"` heading per contiguous run, ranking scoped to the run, the
      create row ungrouped; 6 logic + 5 native tests (Combobox 33, unit 389,
      behaviour 616), four mutation proofs; docs, example and `COMPONENTS.md`
      synced
    - [x] Date picker adjacent-month days — plan 396: `monthGrid` returns 42 real
      days, adjacent days are muted, selectable and bounds-aware, so the grid has
      no dead cells; 2 pure + 3 native tests, both-direction proof (unit 390,
      behaviour 619); docs, inventory and `COMPONENTS.md` synced
    - [x] Combobox joins the dismiss stack: one Escape or outside press
      closes the popup, not the enclosing dialog, and a trigger press does not
      re-open what it just dismissed — plan 398; 3 native cases (Combobox 36,
      behaviour 629), both-direction proof; docs, `COMPONENTS.md` and inventory
      synced
    - [x] Mention input claims its Escape, so one Escape closes the list and
      leaves an enclosing dialog open — plan 399; 2 native cases (Mention input
      13, behaviour 631), both-direction proof; docs, `COMPONENTS.md` and
      inventory synced
    - [x] Disabled means inert — plan 394: measured five leaks (a disabled
      Button/IconButton kept its hover/press fill, InlineEdit painted a ring and
      a hover with `disabled` + `autoFocus`, `CollapsibleTrigger` had no
      `disabled` at all, a disabled SearchInput still cleared by button, Escape
      and Enter, a disabled List row kept the pointer cursor and hover, a
      disabled TagInput still committed on Enter, a disabled TimePicker still
      shifted on arrows). 9 native cases (Button 13, InlineEdit 16, Collapsible
      13, SearchInput 11, List 44, TagInput 11, TimePicker 12, behaviour 611),
      eight mutation proofs; docs, `COMPONENTS.md` and the inventory synced
    - [x] A disclosure close returns focus to its trigger — plan 386: measured
      that a controlled close from a control inside the body left focus on the
      hidden control (body `visibility: hidden`, focused id still the inner
      control). `Reveal` now compares the focused box's centre with the closing
      body's bounds and hands focus back to the registered trigger, on both the
      tween and the snap path; a close that began outside does not steal focus.
      5 native cases (Collapsible 16, Accordion 22, behaviour 636), both-direction
      proof (3 fail without the restore, the 2 outside cases pass); docs,
      `COMPONENTS.md` and the inventory synced
    - [x] List: the roving tab stop and focus survive a change in the rows —
      plan 510. Measured: removing the active row left every remaining row
      `tabIndex -1` with focus `null`, and disabling it kept the tab stop and
      the ring on the disabled row. `liveActive`, a live-row tab stop and
      focus relocation only when the list held focus; 6 native cases
      (List 50, behaviour 642), four mutation proofs; docs, `COMPONENTS.md` and
      the inventory synced
    - [x] Tabs: a tab that turns disabled must not keep focus or the ring —
      plan 511. Measured: a disabled focused tab kept native focus and the
      focus ring while the tab stop moved off it. Focus now hands over to the
      tab stop without selecting; 5 native cases (Tabs 22, behaviour 647), four
      mutation proofs; docs, `COMPONENTS.md` and the inventory synced
    - [x] Preview card: a restored focus must not re-open it — plan 515.
      Measured after plan 514: Escape from inside the card returned focus to
      the trigger, whose focus handler re-opened the card, so it never closed.
      The dismiss layer marks the restore and the trigger consumes the mark; 2
      native cases (PreviewCard 15, behaviour 656), both-direction proof.
    - [x] A disabled control announces its state — plan 516. Measured: 0.10.0
      has no `aria-disabled`, so a part that dropped its handlers, left the tab
      order and dimmed was still announced as an ordinary control. A shared
      `stateDescription` appends `Disabled` to the supported `aria-description`
      for 16 control families, keeping the caller's text and any validation
      message; 6 pure + 12 native cases (unit 404, behaviour 668), mutation proof
      (removing it from Button, FieldInput and ComboboxTrigger fails 4 cases);
      docs, `COMPONENTS.md` and the inventory synced
    - [x] The first motion slice — plan 525: Toast uses `toastMotion(theme)`
      (500 ms cubic-bezier) with `AnimatePresence` and keyed cards, Dialog uses
      `dialogMotion(theme)` and Popover `motionFromClasses` (100 ms fade + side
      slide); `zoom-*` stays unsupported, and focus/dismiss behaviour is gated
      at close so the exit ghost is inert. 6 new native cases (Toast 16, Dialog
      16, Popover 19; behaviour 694); live 2/2 once the scratch toast scenario
      waits for the 500 ms exit
    - [x] Drawer motion — plan 526: the veil fades in 100 ms and the edge
      surface fades and slides in 300 ms from its own edge; the closing drawer
      is inert and unmounts after its exit. 4 native cases measure the painted
      slide, not only the motion prop (Drawer 14, behaviour 698); two mutation
      proofs
    - [x] Disabled mention and tag fields are inert — plan 527: measured that
      `autoFocus` focused a disabled `MentionInput`/`TagInputField`, both stayed
      tabbable (`tabIndex` absent) and a programmatic focus painted the group
      ring. Each now ignores `autoFocus`, sets `tabIndex=-1` and guards the ring
      with `!disabled`; 4 native cases (Mention input 17, Tag / token input 15,
      behaviour 702), six mutation proofs; docs, `COMPONENTS.md` and the
      inventory synced
    - [x] Every component is proven in both themes — plan 528. Six components
      landed after the theme matrix (Carousel, Countdown, Inline edit, Mention
      input, Preview Card, Tag / token input) and five `COMPONENTS.md` rows
      already claimed "both themes" while their suites rendered dark only. One
      role assertion each (behaviour 702 → 708), six mutation proofs, and a
      `theme-coverage.ts` registry held to the suites by `inventory.test.ts` so
      a new dark-only component or a stale entry fails (unit 404 → 405); docs,
      `COMPONENTS.md` and the inventory synced
    - [x] Behaviour suites wait for the tree, not a microtask — plan 529. Under
      eight CPU burners the command-menu reopen tests read the dialog's 100 ms
      exit ghost (`no element with testId "command-open-file"`), because they
      clicked behind a closing surface and flushed one microtask; 3 of 5 runs
      failed. `until` / `isShown` are shared from `internal/interaction.ts`, the
      two tests finish the exit and wait for the reopened row, and the suite is
      green under load (21/21 five runs at eight burners; 708/708 full suite)
    - [x] A highlighted command row is scrolled into view — plan 530. Measured:
      with 30 actions and 24 arrow presses the highlight's bottom sat at 746
      against a list viewport ending at 568, so `Enter` ran a row the user could
      not see. The list's `scrollIntoView` was never called; the row now reveals
      itself on the flip to highlighted, with two native cases (23 total,
      behaviour 710) and a mutation proof. `Home`/`End` measured as consumed by
      the GPUix `<input>` and documented. Combobox is recorded as the follow-up:
      its options are nested inside list wrappers, so `scrollIntoView` moves only
      9 px and needs a measured `scrollTo`
    - [x] The highlighted combobox option is scrolled into the list's viewport —
      plan 535. Measured: the popup content was the scroll container, so
      revealing a row took the focused search field to `y -360`, and flex shrink
      squeezed the field to `height: 0`. The popup is now a fixed field over a
      scrolling list; the row observes `highlighted` through GPUix's
      children-as-function API and the reveal works in the list's content space
      (a window-space rule re-scrolled on every key). 2 native cases + 6 rule
      cases (Combobox 39, unit 411), mutation proofs; docs, `COMPONENTS.md` and
      the inventory synced
    - [x] Behaviour truth under the rebuilt binding — plan 536: measured that
      `getElementBounds` reports a content-box origin with a padding-box size
      (so an absolute centre comparison mixed the trigger's 8 px inset with the
      surface's 4 px and read a 4 px defect on a correctly centred popup), and
      that the binding delivers no `focus`/`blur` for `focusElement`,
      `focusNext` or a pointer focus change. The centring case now measures the
      shift the component owns (fails with `196` when the offset is removed),
      and the ring case covers the seeded ring and the reopen path (fails when
      the ring line is removed); the unobservable half is recorded for the live
      suite. 39 combobox tests; docs truth updated
    - [x] Submenu hover — plan 539: measured that a `disabled` submenu row
      opened on hover (the press and key paths already honoured the disabled
      contract) and that leaving the row and its panel never closed the level,
      leaving focus on an unmounted row. The shared `useHoverTravel` now closes
      one level after 150 ms with focus back on the row, the surface accepts
      pointer travel, and a disabled row opens nothing; 3 native cases
      (Dropdown menu 50), four mutation proofs; docs, `COMPONENTS.md` and the
      inventory synced. The one 1 px left-placement failure in each menu suite
      is the plan-536 binding measurement, not this change
    - [x] A controlled-state request for the current value is a no-op — plan
      517. Measured: an uncontrolled `Tabs` fired `onValueChange("profile")`
      when the already-selected tab was pressed, because the shared hook
      compared the request with the (always undefined) prop instead of the
      value it held. The hook now compares the resolved value with `Object.is`;
      3 hook cases + 1 Tabs case (behaviour 672), both-direction proof (2 fail
      on the old comparison); docs, `COMPONENTS.md` and the inventory synced
    - [x] Popover: Tab walks the panel's controls and leaves at the ends — plan
      521. Measured: Tab closed a two-control panel on the first press and left
      focus `null`. Focus now lands on the first tab stop on open, Tab walks the
      panel and closes only at either end, where focus continues with the app
      control after the trigger; the visited stops bound the cycle so a removed
      first stop cannot trap; 5 new native cases + 1 strengthened (Popover 17,
      behaviour 677), four mutation proofs; docs, `COMPONENTS.md` and the
      inventory synced
    - [x] Every focusable part paints the focus ring — plan 522. Measured seven
      controls that took native focus and painted no ring (the `Carousel` root
      and its dots, a color swatch, a chip's removal control, the time and
      hotkey clear controls, a mention row), plus two `autoFocus` fields whose
      group ring never lit because the runtime focuses after React's effects.
      Each now owns its `focused` state and paints `focusRing`, and
      `MentionInput`/`TagInput` seed the group ring from `autoFocus`; 9 native
      cases (behaviour 686), nine mutation proofs; docs, `COMPONENTS.md` and the
      inventory synced
    - [x] The overlay search fields paint the focus ring — plan 523. Measured:
      the command palette's always-`autoFocus` input and the combobox's
      open-focused input both took native focus and painted no ring. Both now
      own a `focused` state seeded from `autoFocus`/`open` and paint
      `focusRing`, tracking later focus changes; the combobox root's open effect
      was proven not to dispatch React's `onFocus`; 2 native cases (Command menu
      21, Combobox 37, behaviour 688), three mutation proofs; docs,
      `COMPONENTS.md` and the inventory synced
    - [x] Pagination never hides a single page behind an ellipsis — plan 513.
      Measured: a 7-page list was windowed although all seven numbers fit, and
      a gap of one page rendered `…` instead of the page (also a zero-page
      ellipsis with a wide `siblingCount`). The threshold is the maximum window
      (`2 * siblingCount + 5`) and a single-page start gap is promoted; 15
      window tests + 13 native tests (behaviour 648), three mutation proofs;
      docs, `COMPONENTS.md` and the inventory synced
    - [x] An inner field that acts on Escape claims the event — plan 514.
      Measured five leaks: a SearchInput clear, InlineEdit cancel,
      HotkeyRecorder stop, Chat stop and a PreviewCard trigger close each ran
      **and** closed the enclosing dialog on one Escape. Each now claims its
      key (the card goes through the dismiss stack); an empty search, idle
      recorder and idle chat still pass Escape on. 5 dialog cases + 1 pin
      (search-input 13, inline-edit 17, hotkey-recorder 13, chat 10, preview-card
      13, behaviour 654), both-direction proof; docs, `COMPONENTS.md` and the
      inventory synced
  - Reference adoption
    - [x] 200 — adopt `base-gpui`'s compound-part contract as the Tier 1–2 API spec: `docs/component-api.md`, ADR 0004, `LICENSES/base-gpui.md`, `PLAN.md` D25 and a contract check in `inventory.test.ts` (plan 200; proven to fail by changing one translation row)
    - [x] 201 (components half) — `core/runtime.ts` (`createRuntime`: initial/reduce/query/run), its pure test, the `docs/component-api.md` §7 state-model section, ADR 0005 and PLAN.md D26 (plan 201; both-direction proof: deleting the select branch fails the fold test)
    - [ ] 201 (shared helper) — `packages/testing/src/state.ts` + its test (`runCommands` over a runtime), so suites outside `packages/components` replay commands (owner: playground; this package's `runtime.run` is the same fold)
    - [x] Split Alert into parts — `Alert`, `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`, `AlertDismiss` over a tone context; 11 native tests; docs, example and API table updated (plan 158)
    - [x] Split the remaining landed deviations named in `docs/component-api.md` §9 into parts — each with its own behaviour test, docs update and inventory row (owner: components). Plans 300–303 are landed.
      - [x] Pagination parts — plan 300
      - [x] CommandMenu parts — plan 301
      - [x] Combobox parts — plan 302
      - [x] DatePicker + TimePicker parts — plan 303
    - [x] Typed-by-position children — plan 304: `PartChildren` (elements/conditionals, never text) plus a family-scoped render check on 32 parents; part identity cannot be a compile error in React 19's JSX types, recorded in `docs/component-api.md` §1 (owner: components)
    - [x] Expose `style` as `StateStyle<PartState>` on the interactive parts — plan 305: 11 parts with exported state types; button-shaped triggers stay on the local stand-in until `@gpuixui/primitives` owns it (owner: components)
    - [ ] `packages/primitives` adopts the same contract for Tier 1 (a parts table row is the spec; the package is owned by primitives) (owner: primitives)
  - Tier 2 gap rows (plan 205; each row gets its own plan before implementation)
    - [x] Write and index plans 309–320 for the twelve remaining gap rows
    - [x] Fieldset — plan 306: groups fields, propagates `disabled` to `FieldInput` (7 native tests; both-direction proof)
    - [x] Stepper — plan 307: read-only multi-step indicator, statuses derived from `value` (8 native tests; both-direction proof)
    - [x] Form — plan 308: owned-value schema validation, one alert summary, decoded `onSubmit`, pending guard (7 native tests; both-direction proof)
    - [x] Drawer — plan 309: 10 native tests; the modal rules extracted from Dialog, whose 18 tests re-pass
    - [x] Keyboard shortcuts / keycap display — plan 310 (owns the accelerator model): 10 accelerator tests + 6 native tests; both-direction proof
    - [x] Timeline — plan 311: 6 native tests; both-direction proof
    - [x] Countdown — plan 312: 9 formatting tests + 5 native tests
    - [x] Inline edit — plan 313: 8 native tests; both-direction proof
    - [x] Tag / token input — plan 314: 10 rule + 8 native tests; both-direction proof
    - [x] Carousel — plan 315: 8 native tests; both-direction proof
    - [x] Hotkey-recorder input — plan 316 (consumes plan 310): 8 capture + 8 native tests; both-direction proof
    - [x] Preview Card — plan 317: 8 native tests; delay, pointer travel and Escape proven
    - [x] Color picker — plan 318 (discrete swatches: 0.10.0 has no gradients): 8 hex + 8 native tests; both-direction proof
    - [x] Mention input — plan 319: 12 rule + 9 native tests; both-direction proof
    - [x] Navigation Menu — plan 320: 6 parts, 10 native tests; both-direction proof
    - [x] Message scroller — plan 206: pinned follow over a 1px tail sentinel, no yank when scrolled up, unread count, jump-to-latest, streamed growth; 11 rule + 10 native tests + 1 theme-matrix case; both-direction proof (behaviour 437, unit 296). Non-virtualized viewport recorded as the limitation (`<virtual-list>` takes an item count, not compound children)
    - [x] AI conversation — plan 207: `Message` (variants + avatar/content/reasoning/tool calls/sources/attachments/streaming/actions) and `Chat` (transcript + composer + status union); 10 + 9 native behaviour tests, 10 transition tests, both-theme rows; credit on both docs pages, `LICENSES/` interlock recorded
    - [x] Tier 2 gap cluster complete: all twelve landed with code, a native test, an example, a docs page and an inventory row; after plan 206 the suite is behaviour 437, unit 296
`[x]` Verify every component in both themes

## Blockers (project-level, with evidence)

`[x]` **The GPUix native runtime now loads on this machine, so the Tier 2 behaviour
suites run here.** Resolved 2026-10-17 08:57 by plan `140` (playground workstream):
`@gpuix/native@0.10.0` publishes no `darwin-x64` binary, so the pinned source was
built locally with `gpui_macos/runtime_shaders` (which removes the build-time
`xcrun metal` dependency) and the resulting `gpuix-native.darwin-x64.node` is in
the store, hard-linked across worktrees. Verified from `packages/components`:
`nub run --filter @gpuixui/components test:behaviour` runs the real
`TestRenderer` and Card's suite passes 5/5.

Evidence, 2026-10-17 (the failure this replaced): `uname -m` → `x86_64`;
`@gpuix/native@0.10.0` published only `-darwin-arm64`, `-linux-x64-gnu`,
`-win32-x64-msvc`; loading it failed with `mach-o file, but is an incompatible
architecture (have 'arm64', need 'x86_64')`.

Still true and worth remembering:

- The `wasm` build exports only `GpuixRenderer`, not `TestGpuixRenderer`.
- The binding is a **locally built artifact**, not a published one: a clean
  `nub install` on a bare host still has none, so the behaviour suites stay out
  of the default `test` run (plan 117 §5a–§5c) and a host without a binding
  reports `unsupported-host` from `src/runtime.test.tsx`.
- On an Apple-silicon Mac, Linux x64 or Windows x64 the published binding works
  with no local build.

`[x]` **nub's isolated linker does not install optional platform binaries of
transitive dependencies.** `@gpuix/native-darwin-arm64` (an optional dependency
of `@gpuix/native`) was absent from the store entry; `nub install --node-linker
hoisted` links it. Superseded on this host: the store now carries a locally built
`darwin-x64` binding (first entry above), hard-linked across worktrees.

`[x]` **Two sessions wrote this worktree at once — B3, resolved 2026-10-17
08:56.** Root cause and permanent fix: plan `022-swarm-single-writer.md`
(primitives worktree). Measurement for this worktree: plan
`118-single-writer-components.md`, which also records the resolution: the stale
turn `ses_eb7f09666ffeRRbJxPz0d344Cw` (07:12) committed and pushed everything it
produced and stood down, because the rotating `run-components.sh` turn is the one
the supervisor can see and replace. Re-verified at 08:56 and again at 09:00: the
`session_v2` count is `1`, and the tree is clean apart from the untracked
`nub.lock` and `references` symlink. The permanent fix — pinning `--session` and
teaching `agent_alive` to count live server-side sessions (plan 022 §5) — is
still the coordinator's, in `scripts/`.

`[!]` **`@gpuix/react@0.10.0` (the latest published release) is far behind the
reference clone in `~/GPUIXUI/references/gpuix`.** Verified against the installed
package, 2026-10-17:

| Surface | Reference clone | installed 0.10.0 |
| ------- | --------------- | ---------------- |
| `KeyEvent` type, `preventDefault`, `defaultPrevented` | yes | **no** — handlers receive `EventPayload` |
| `Button`, `buttonProps` | yes | **no** |
| `Dialog` + parts, `DialogPortal/Backdrop/Popup` | yes | **no** |
| `DismissableLayer`, `pushDismissLayer`, layer stack, focus restore | yes | **no** |
| `FloatingLayer`, `renderSlot`, `useControllableState`, `mergeStyles` | yes | yes, via `@gpuix/react/floating` |
| `Select` + parts, `Combobox` + parts, `Tooltip` + parts | yes | yes |
| `motion`, `AnimatePresence` | yes | yes |
| WASM build exports `TestGpuixRenderer` | no | no |

Consequences for Tier 2: Escape dismissal, layer stacking, focus-in/out and
Tab trapping must be implemented in this package on top of `renderer.focusElement`
/ `focusNextWithin` / `focusPreviousWithin` and element-level `onKeyDown`, instead
of relying on the clone's `DismissableLayer`. `Button`/`buttonProps` and
`Dialog` parts must be equivalent local implementations over `<div>` + host props
until `packages/primitives` and a newer `@gpuix/react` land. Plans 110 §1/§7 and
112/114 have been corrected for this.

Related: the reference clone must not be treated as the API of the pinned
dependency anywhere in this repo, and `package.json` pins must stay explicit.

`[!]` **Two sessions write this worktree at once — B3, still live** (measured
2026-10-17 08:47). Root cause and permanent fix: plan
`022-swarm-single-writer.md` (primitives worktree). Measurement for this
worktree: plan `118-single-writer-components.md`. Two live top-level sessions
hold `workspaces/components` at the same time —
`ses_eb7f09666ffeRRbJxPz0d344Cw` (07:12:12, a stale turn from an earlier tick)
and `ses_eb7a7c3edffeSehcVqeqHJEsYa` (08:31:44, the current `run-components.sh`
turn). `run-components.sh` starts a new `opencode run` session every iteration
and does not own the turn, so a turn that outlives its CLI call keeps writing
while the loop starts another on top of it; `agent_alive` only checks the runner
pid, so the supervisor cannot see the duplicate. Between 08:40 and 08:47 the tree
gained `card.tsx`, `behaviour/card.test.tsx`, `docs/card.mdx`,
`examples/card.example.tsx` and the commits `7786193`, `f424b1e`, `ab000ab` —
none authored by the supervisor's session. **Response:** this workstream stopped
writing component code the moment the duplicate was confirmed, restoring the
one-writer invariant; the one clean non-overlapping commit (`22f706c`, the
status-tone palette) is preserved. No session was deleted — that is the
coordinator's call and would discard the stale session's in-flight work (plan
022 §4/§7). Resume `packages/components` only when the plan 118 §5 check prints
`1` twice. **Re-measured 08:54:** the pair rotates — `ses_eb7a7c3e…` went idle and
`ses_eb795d97…` took its place while the stale turn stayed live — so the count
stays `2` and the condition **cannot** be met by agent discipline; it needs plan
022 §5's pinned-session fix (coordinator, `scripts/`). Component code stays
paused on a green, pushed `HEAD`; plan 118 carries the measurement.

**Recurred 2026-10-18 19:36–20:05** during the plan-525 motion slice
(`ses_eb065779…` still writing while `ses_eb02154a…` read the tree). The §5
check is **not sufficient**: the older session had `time_idle` set to a stale
timestamp while `time_updated` kept advancing, so `time_idle is null` printed
`1`. Liveness must be measured by recent `time_updated` (and the runner pid).
The older turn finished and pushed plan 525; this turn verified it and then
claimed plan 526. Details and the corrected query are in plan 118's recurrence
section.

## Interlocks (cross-workstream dependencies)

Work that this workstream needs but does not own. Another agent owns each row.

| Need | Owner | Status |
| ---- | ----- | ------ |
| `@gpuixui/tokens` roles in plan 110 §6 | tokens-theme | **resolved** — the workstream is merged into `agent/components`; `internal/theme.ts` is the seam over it |
| Serialise writers per worktree: a second live session writes `packages/components` alongside the supervisor's; root cause in plan `022` (primitives), this worktree's measurement in plan `118` | repo tooling (`scripts/`) | **recurred 2026-10-18** (plan 525 turn); the `time_idle is null` gate undercounts — use recent `time_updated` (plan 118's recurrence section). Permanent `scripts/` fix (plan 022 §5) pending |
| Decide the GPUix version: stay on 0.10.0 and implement dismiss layers/focus locally, or ship a release that includes `Dialog`/`Button`/`DismissableLayer` (0.10.0 is the latest published) | owner / playground | pending |
| Soft tone pair per status (`info`, `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft` + readable foregrounds) | tokens-theme | **resolved** — landed on `main`; `internal/theme.ts` consumes `statusTone` (plan 157) |
| `alpha(color, amount)` helper | tokens-theme | **resolved** — landed on `main`; the local `withAlpha` is deleted (plan 157) |
| An `info` status role so Alert/Badge/Toast stop borrowing `accent` | tokens-theme | **resolved** — `infoSoft`/`infoSoftForeground` are the tone's roles (plan 157) |
| `@gpuixui/tokens`' React file compiles with this package's `jsxImportSource`; tokens cannot resolve `@gpuix/react` under the isolated linker | tokens-theme | **resolved** — the JSX runtime maps through a loadable `.ts` shim, so the package imports from source (plan 380); a tokens devDependency/pragma would remove the shim |
| Playground can drop `apps/playground/tsconfig.vendor.json` and import `@gpuixui/components` from source: the `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` cause is gone (plan 380) | playground | pending — hand-off recorded |
| `packages/testing/src/state.ts` + test: `runCommands(runtime, commands)` for suites outside this package (plan 201) | playground | pending — `runtime.run` in `packages/components` is the same fold meanwhile |
| Plan 347's Carousel scenario expected an inactive slide to stay hit-testable; plan 365 fixes the component, so that step should assert the fixed behaviour | playground | resolved in `packages/components`; the playground assertion needs updating |
| `live-tier2-toast` checks `bounds("toast-5") === null` immediately after the queue count drops; the 500 ms toast exit (plan 525) keeps the card painted, so the check needs a ~650 ms wait | playground | pending — measured on 2026-10-18; the component side is correct and the scratch run passes with the wait |
| Plan 347 §8.2 found InlineEdit's blur commit is headless-only (live `onBlur` is never delivered for a native focus change) | playground → components | **resolved** in `packages/components` — `Tab` and an outside press finish the edit, the press restores the display only when it focused nothing (plan 379), and plan 613 adds a focused-host sample while an edit is open: `renderer.focusNext()` moves native focus with no React event, and the draft now commits instead of leaving the editor stuck. 2 new native cases (InlineEdit 19); the live scenario's missed-blur branch stays as a harness safety net |
| Plan 347 §8.2 found TagInput's chip removal control has no `testId`, so the live harness could only assert the chip's presence | playground → components | **resolved** — the control is named `<chip testId>-remove` (plan 381) |
| Plan 302 §2 measured that `<virtual-list>` retains 3 host nodes per row and `<code>` reparses only when its document key changes | playground → components (COMPONENTS.md) | **resolved** — folded into the Tier 3 rows |
| An avatar diameter scale (20/26/32/40) so `DIAMETER` in `avatar.tsx` can be deleted | tokens-theme | pending |
| Export a shared native-focus tracker (`NativeFocusProvider` / `useNativeFocusId`) so `InlineEdit`'s plan-613 sampler, `SearchInput`'s plan-659 sampler and other components reuse one per-app interval instead of a local one | primitives | pending — plans 613 and 659 keep their samplers scoped to the open edit / the field with text meanwhile |
| `@gpuixui/primitives` exports in plan 110 §7 | primitives | **package landed** (19 Tier 1 components + `Button`/`Input`/`Spinner`). The components' `internal/button.tsx`, the `FieldInput` host input and the `…` busy glyph stay until primitives' `ThemeProvider` and `@gpuixui/tokens/react` are one provider — two contexts would make every consumer wrap both. Owner of the unification: cross-package decision, not components |
| A `primaryHover` / `destructiveHover` role pair so filled buttons stop using a half-alpha fill for hover | tokens-theme | pending |
| Playground mounts the Tier 2 examples and runs a dialog/menu/toast smoke | playground | pending — the registry is complete and every entry is render-proven in this package (plan 330); mounting still belongs to `apps/playground` |
| Docs site renders `packages/components/docs/*.mdx` and the example registry | docs-site | pending |
| The docs-site workstream's two open components hand-offs: the `./validation/logic` export and the controlled/`defaultPrevented` contract | docs-site | **answered** — the subpath export and its check landed in plan 336, and plan 685 states the shipped controlled rule (§4 already said "No default suppression"); their TODO rows can flip to done |
| Root `README.md`'s status line still says 517 behaviour tests / 41 areas; the suite is now 611 and the package has 43 modules | repo README (coordinator) | pending — recorded by plan 373, count refreshed by plan 394 (390 last touched it); not edited from `packages/components` |
| `scripts/verify-two-directions.sh` uses `jj`, which is not installed (D1) | tooling | pending |
| The shared store's `@gpuix/native` binding was **rebuilt in place by another worktree while suites were running** (2026-10-18 21:47 and 22:00, `workspaces/gpuix-zindex`; md5 `c0e554b…`). The new build changes bounds/anchoring — the combobox trigger measures `{x:549,width:738}` instead of `{x:540,width:740}` — so "centres a requested popup on its trigger" is off by 4 px and "paints the focus ring on the search field" keeps the ring after focus moves. **Both fail at `HEAD` with that binding and passed on the 21:47 build**, so no component change is at fault; every native verdict taken across the swap is suspect until one build is pinned | gpuix-zindex / playground | **wider than first measured** — plan 540 proved `getElementBounds` mixes **three** conventions inside one build (block/`flex-start`: content-box origin; centred flex: border-box origin; padding-box size in all three) and that a release-tag build (`9fcd628`, zed `81c99f81`, md5 `e7a3c64…`) reproduces it, so no harness normalisation is sound. The 59 red cases are classified: 34 position, 24 focus/blur (no `onFocus`/`onBlur` for a native focus change), 1 scroll. Fix required: one box convention for every element (border box) plus focus events; then the suite's 34 position cases pass unchanged. Artifact + build log kept in `workspaces/components/.agents/slop/scratch/gpuix-release/` |
| The native renderer keeps **one** child at the root: a two-`div` fragment renders only the second (measured while writing plan 510's test fixture, both children identical in every other respect) | playground / `docs/gpuix-capabilities.md` (plan 203) | pending — behaviour fixtures wrap sibling roots in a container; no production example is affected |
| A **scroll container's own `getElementBounds`** is reported in scrolled content space (measured: `viewport { y: -1080, height: 200 }` at offset `-1080`, while its rows are in window space: row 39 at `y: 168`). `MessageScroller` measures its pin against the unscrolled root instead (plan 582); a binding fix should make a scrolled element's own box the visible box | binding-gaps | pending — plan 582 records the component-side adaptation and its two-way proof |
| The playground's `tier2-command` / `live-tier2-command` assert the measured close-focus defect (`focused=none`), and `tier2-scroller` asserts the measured no-re-pin. Plans 589 and 582 fix both, so those checks must flip to assert the fixed behaviour (focus back on the opener; re-pin at the end) and the §9 notes updated | playground | pending — the component side is landed; no playground file was edited from this workstream |
| Decide whether `nub.lock` is committed: it is currently untracked and regenerated per worktree, so every workstream's copy would conflict | tooling | **resolved** — master tracks `nub.lock`; the merge took master's committed copy |
| `LICENSES/`: record GPUI Kit = Apache-2.0 (+ CC BY 4.0 for its docs prose, Lucide ISC for icons, no NOTICE file); shadcn/ui is referenced as design inspiration only, not copied source. The Message Scroller behaviour port (MIT) needs its own `provenance.md` row (plan 206 credits it on the docs page) | licensing | pending |
| `LICENSES/`: credit shadcn/ui AI Elements `chat` + `message` (MIT) for plan 207's behaviour port; both docs pages already credit it in prose | licensing | pending |
| `@gpuixui/tw`: `classesToStyle` returns `shadow-sm/md/lg/xl` as a flat `BoxShadow`, so its `color` overwrites the element's text colour (`classesToStyle("text-popover-foreground shadow-xl", light).style.color` is `#191D2529`, the shadow, not `#191D25`). Found while evaluating the plan-524 Dialog/Popover recipes; the component integration is blocked until `shadow-*` wraps the value in `boxShadow` (plan 524 is owned by the tw workstream) | tw (plan 524) | pending — measured 2026-10-18 in this worktree |
| A `bell` icon (and a few notification marks) for the notification centre's trigger; `ICON_NAMES` has no `bell`, so v1 uses a text label plus the count badge and accepts a custom child | icons | pending — plan 568 records the gap; no icon was copied into `packages/components` |
| Animated surfaces now carry `<part testId>-surface` / `toast-<id>-surface` (plan 597), so a native suite can measure the tween box directly | playground | hand-off — plan 592's next-row proxy can flip to `collapse-content-surface`; no playground file was edited from this workstream |
| Hover is per element: a child control's hover cancels its row's `hover` style (measured, plan 335 §1.3), so a List row's tint drops while the pointer is over its trailing control | components | **resolved** — plan 606: the row scripts its own crossing and `Button`/`IconButton` report their hover to the enclosing row through an internal hover group, so the accent tint survives; a custom interactive child is still per element and documented in `docs/list.mdx` |
| Focus rings follow React `focus`/`blur`; the published `0.10.0` does not dispatch them for a native focus change in the headless renderer (plans 536/540) and a live window's delivery is state-dependent (playground 390/603/605) | components | **resolved** — plan 608: `ComponentMeta.focusable` marks the 36 focusable records, every one of their pages states the `autoFocus`-seeded limitation, and `inventory.test.ts` holds the pages to the flag; `docs/component-api.md` §5 and `COMPONENTS.md` carry the measured two-state claim |

## Phase D — data and workspace components

`[ ]` `[░░░░░░░░░░]` 0/3

`[ ]` Tier 3 data presentation
`[ ]` Tier 4 desktop workspace (panels, docking, tabs, command palette)
`[ ]` Verify critical interactions in the real runtime

## Phase E — specialised components

`[ ]` `[░░░░░░░░░░]` 0/2

`[ ]` Tier 5 specialised components where justified
  - [x] Multi-step form — plan 390: `MultiStepForm` composes `Form`'s validation
    with `Stepper`; each step validates a projection schema over the caller's
    draft, `back` never validates, the full schema runs once on the last step and
    delivers the decoded value, messages carry the step that produced them;
    controlled/uncontrolled `step`, one `role="alert"` summary, 12 native tests,
    example, docs page and inventory row; five mutation proofs (behaviour 595)
  - [x] Notification centre — plan 568: the unclaimed `packages/components` task
    from the playground's measured contract (plan 381). `NotificationCentre` +
    Trigger/Content/Header/Title/MarkAll/Clear/List: the unread badge is derived
    from the caller's read flags, grouping is one heading per contiguous run in
    the caller's newest-first order, a press or `Enter` requests one read and
    keeps the panel open, opening marks nothing read, the empty state is a real
    `EmptyState`, Escape closes and returns focus while an outside press closes
    without stealing it, and arrows move the active row over notifications only.
    13 native tests + 5 pure model tests, five mutation proofs, including the scrolled prepend; example, docs
    page, `COMPONENTS.md`, the §8 parts table and the inventory synced. v1
    renders every row in a plain viewport (the `<virtual-list>` host needs
    app-side windowing) and uses a labelled text trigger until `@gpuixui/icons`
    gains a bell
`[ ]` Document every capability GPUix does not provide, with evidence

## Phase F — integration and polish

`[~]` `[███░░░░░░░]` 1/3

`[~]` Consistency, keyboard, themes, composability pass
  - [x] Caller handler composition on interactive parts — plan 331: a part that
    accepts a host handler composes it with its own action (Pagination,
    CommandMenu, Carousel, Alert, InlineEdit, MentionInput); nine native cases,
    both-direction proof
  - [x] Activation contract — plan 332: a held key never activates twice
    (`isHeld` in the shared predicates) and a button-shaped control activates
    Space on release; the two clear controls share the helper; 7 new native
    cases (behaviour 508, unit 334), both-direction proof
  - [x] Docs truth: the native-test count a docs page states matches its
    behaviour suite — plan 333; the one drifted page (`Field`) fixed and the
    check added; both-direction proof (unit 335)
  - [x] Move the remaining pure-activation button-shaped parts to Space on
    release (`AccordionTrigger`, `CollapsibleTrigger`, `TabsTrigger`,
    `Breadcrumb`, `HotkeyRecorder`, the `InlineEdit` display, the `TagInput`
    chip); plan 334 — 9 native tests; the hotkey clear control now claims its
    key, so a keyboard clear no longer starts a recording
  - [x] Accessible names for every role-bearing part — plan 391: 0.10.0 reports
    no name from a control's text child, so `internal/name.ts` derives
    `aria-label` from plain-text children (authored labels win) on `Button`,
    `TabsTrigger`, `AccordionTrigger`, `CollapsibleTrigger` and
    `BreadcrumbLink`; a new all-example native contract found 43 unnamed
    interactive nodes across 22 examples and now finds none. 9 pure + 1 native
    case (behaviour 596), both-direction proof (30 failures with Button's name
    removed); docs and inventory synced
  - [x] Avatar announces its presence state — plan 392: `status` is delivered as
    `aria-description`, the caller's description wins and the accessible name
    stays the person's; 2 native cases (Avatar 9, behaviour 598), both-direction
    proof; docs and inventory synced
  - [x] A disabled trigger never opens anything — plan 393: measured that the
    Preview card opened on hover and on focus, and the Dropdown and Navigation
    menus opened on arrow keys (and moved focus), all with `disabled`; 3 guards,
    4 native cases (Preview card 12, Dropdown menu 47, Navigation menu 21,
    behaviour 602), both-direction proof; docs, inventory and `COMPONENTS.md`
    synced
  - [x] Docs verification truth: every component docs page states its real
    native-test count in one canonical line, checked for all 41 pages rather
    than only those that happened to adopt the sentence — plan 335; 14 pages
    normalised (three had no verification section), unit 335, behaviour 517;
    both-direction proof
  - [x] Packaging truth: every documented subpath import resolves, and every
    public module reaches `src/index.ts` — plan 336; the documented
    `@gpuixui/components/validation/logic` import pointed at a missing `.tsx`,
    so `exports` now names the `.ts` module; 2 new checks, unit 337
    both-direction proof
  - [x] Component API truth (`packages/components`): the §8 parts tables are
    checked against the package's exports, a landed component can no longer sit
    in a "planned" table, and every page keeps a limitations heading — plan 337;
    the Avatar page's opening claim contradicted its own limitations, and five
    "until primitives lands" notes were stale (the package landed; the real
    blocker is two theme providers); unit 340, both-direction proof
  - [x] Behaviour bounds truth — plan 540: `getElementBounds` reports **three**
    box conventions in one build (block and `flex-start` elements a content-box
    origin, a centred flex container a border-box origin, all with a
    padding-box size), so no harness can normalise it; the normaliser was
    implemented, measured (2 of 19 popover cases still red, on different cases)
    and reverted rather than tuned to the current binding. The 59 red behaviour
    cases are classified — 34 position, 24 focus/blur, 1 scroll — and handed to
    `binding-gaps`; a release-tag build (`9fcd628`, zed `81c99f81`) reproduces
    both defects, so neither is artifact-specific. Native suite unchanged at
    656/715 by design
`[x]` Performance and packaging
  - `[x]` Plan 338 — explicit package surface (no wildcard, no internals/tests),
    a manifest dependency check, and a measured large-list performance baseline
    with a documented limitation (owner: components)
    - `[x]` `package.json` enumerates the 42 component modules + `validation/logic`;
      `internal/*`, `menu/item` and `runtime.test` no longer resolve
    - `[x]` `src/exports.test.ts` (6 checks) and `src/manifest.test.ts` (3 checks),
      both-direction proven
    - `[x]` `test:perf` + `src/perf/list.test.tsx` + `docs/performance.md`; the
      1,000-row cost and the row-repaint limitation are recorded
    - `[x]` Packaging runtime truth: `@gpuixui/components` imports from source
      again — the JSX runtime maps to loadable `.ts` shims instead of the
      installed `.d.ts`, which Node refused to strip; `nub -e` reports 210
      exports and a drift check holds the shim's intrinsic map to the installed
      declaration — plan 380; unit 362, both-direction proof
    - `[x]` Plan 339 — row-level subscription for `List`: a per-row mask store and
      a stable actions context, so one focus move repaints exactly the two rows
      that changed; the style-count test fails with all six fixture rows on the
      old code; List 39, behaviour 518 (owner: components)
    - `[x]` Combobox async option loading: `onQueryChange`, `shouldFilter` and
      `loading` close the last documented Combobox gap without adding a
      transport — plan 340; 2 logic + 4 native tests (unit 356, behaviour 522),
      both-direction proof
    - `[x]` Carousel hides inactive slides with the runtime's visibility
      mechanism (`display: none` is a no-op in 0.10.0) — plan 365; 3 new native
      cases (Carousel 12, behaviour 525), 6 of 12 fail on the old code
    - `[x]` One Escape closes one overlay: the dismiss stack uses the shared
      field claim instead of payload identity — plan 366; unit copy case + 1
      native nested-dismiss case (Dialog 14, behaviour 526), both fail on the old
      `WeakSet`
    - `[x]` Tabs starts an arrow move from the natively focused tab (a live click
      and `autoFocus` never run React's `onFocus`) — plan 367; 1 native case
      (Tabs 16, behaviour 527), fails on the old origin
    - `[x]` DatePicker opens on today (clamped to the bounds) instead of the
      month head when it has no value — plan 368; 2 native cases (DatePicker 18,
      behaviour 529), both fail on the old fallback
    - `[x]` ComboboxTrigger exposes a button role and its expanded state — plan
      369; 1 native case (Combobox 28, behaviour 530), fails without the role
    - `[x]` Each toast card is the status region, named by its own message — plan
      370; card `role="status"` + viewport group (Toast 14, behaviour 530), the
      strengthened case fails on the old shape
    - `[x]` Docs truth: the example pointer names the package's own registry and
      native example suite, not another app's catalogue — plan 371; 19 pointers
      across 17 pages, no docs page mentions the playground
    - `[x]` Collapsible/Accordion measured-height animation — plan 372: the
      collapsed body **was** in the tab order (measured `trigger → draft →
      after`), so both surfaces hide it with `visibility` through the shared
      `internal/reveal.tsx`; the body stays mounted, state survives a close or a
      section switch, and it tweens to the measured content height
      (`animate={false}` snaps). Collapsible 10, Accordion 19 native tests;
      both-direction proof (5 mutations); docs, inventory and COMPONENTS rows
      synced
`[ ]` Docs truth pass against the implementation (docs-site pages still owned by
the docs-site workstream; the `packages/components` half is plan 337)
  - [x] Plan 383 — every component page documents its public API: 15 pages had
    no `## API` section and four omitted exported parts; the tables are added
    and `inventory.test.ts` now holds every page to its §8 parts row (owner:
    components)

## Phase G — release readiness

`[~]` `[████░░░░░░]` 2/4

`[ ]` Clean-environment install (fresh checkout, native binding and network)
`[x]` Public-export checks — plan 676: every specifier in the export map loads
      through the package name (45 entries), not merely resolves on disk; the
      check reports Node's own module error when one is not exported. 8 checks
      in `src/exports.test.ts`, unit 474
`[x]` The controlled/uncontrolled contract is the shipped rule — plan 685: the
      docs-site hand-off found `docs/component-api.md` §2 promising a warning
      the hook never emitted (§4 already said "No default suppression"; no edit
      was needed there). §2, the hook's JSDoc and `docs/tabs.mdx` now state the
      shipped rule — both props may be supplied, `value` wins, `defaultValue` is
      inert, no warning or error. 1 behaviour pin and 1 contract pin, both
      proven to fail on the old text/mutation; unit 477, behaviour 844/31 of 875
      with the same plan-540 failures; `nub run check`/`lint`/`test` green
`[ ]` Licence inventory and attribution complete
`[x]` All gates green (`nub run check`, `nub run lint`, `nub run test`) —
      re-run from the components worktree on 2026-10-19 (plan 680):
      all three exit 0; the unit suite is 476 tests in 46 files. The full native
      behaviour suite was re-run after plan 680 on 2026-10-19: **843 passed /
      31 failed of 874** — every failure is one of the recorded plan-540 binding
      defects (the focus/blur cases, the box-convention position cases and the
      command-menu scroll case), and the new disabled-inert suite is 7/7. The
      count before plan 680 was 836/31 of 867 after plan 677. Plan 685 re-ran
      all three gates on 2026-10-19: exit 0, unit 477 in 46 files; the full
      native suite is 844 passed / 31 failed of 875 (the same plan-540 binding
      defects). Re-run it before release — every later merge can change the
      count.

## Swarm-owned blockers (fix these)

- **B1** GPUix native bindings fail to install (blocks the playground + every native smoke test).
- **B2** No durable scheduler — the swarm runs on a detached daemon; launchd and cron do not fire here.

Both are specified in ; each fix starts with a plan under .

- **Docs: platform toggle (macOS / Linux / Windows / Default)** — every component preview switches platform style; the styles are real editable token themes in packages/tokens, not docs-only CSS (see MISSION.md).
