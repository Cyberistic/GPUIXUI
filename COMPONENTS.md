# COMPONENTS.md — inventory, status, limitations

The inventory is a **target**, not permission to fake unsupported things. A row
may only move to `done` when the component has: code, a test appropriate to its
behaviour, at least one working example, a docs page, and a verified interaction
in the real runtime (or a documented, evidenced limitation).

Status: `todo` · `wip` · `done` · `blocked (reason)` · `unsupported (evidence)`

Every row also records **GPUix support** and, when it is not `yes`, the evidence
and the strongest honest alternative.

## Design system

| Capability | Status | GPUix support | Notes / limitations |
| ---------- | ------ | ------------- | ------------------- |
| Design tokens | wip | yes (inline style values) | 47 semantic roles, 10 type roles, spacing/radii/density/elevation; light + dark; `colorRoles` indexes the roles for generated doc tables; elevation resolves to the single shadow the runtime paints (`elevationShadow`); WCAG floors in the test suite. Native visual proof pending the playground gallery. |
| Theme extension | wip | yes (theme switch is a re-render) | `createTheme` / `extendTheme` / `ThemeProvider`; docs in `docs/tokens.md`. Provider test is a server render; native switch pending. |
| High-contrast theme | done | yes (values in a `Theme`) | AAA text floors (7:1) and 4.5:1 boundaries; same 47 roles; `getTheme(mode, "high")`; contrast test covers both variants. Docs in `docs/tokens.md`. |
| Status tones | done | yes (values in a `Theme`) | `info` plus soft `info`/`success`/`warning`/`destructive` pairs with readable foregrounds; `statusTone(theme, tone)` and `alpha(color, amount)`; the contrast test holds soft text to 7:1 in all four colour sets. Docs in `docs/tokens.md`. |
| Focus state | done | yes (a zero-blur spread `boxShadow`) | `focusRing(theme)` returns `{ boxShadow }` with zero offset, zero blur and `spreadRadius = borderWidth.strong`. GPUix 0.10.0 has no `outline*` and no `focusVisible`, so a mouse press shows the ring; overlay/menu animation is unavailable. Docs in `docs/tokens.md`; plan 017 corrected the earlier claim that the runtime supports outlines. |
| Density, type and spacing scales | done | yes | Pure values with no runtime dependency; consumed by primitives/components as they land. |
| Platform type styles | done | yes (values in a `Theme`) | `platformTypes` + `currentPlatform` + `systemMonoFamily` + `platformTheme(base, platform)`; the docs platform toggle renders a real theme, not a docs-only style sheet. 12 guard tests. Native visual check of the sans sentinel pending the playground (B1). |
| Native theme gallery | todo | yes | `apps/playground`; visual evidence for the rows above. Owner: playground workstream. |

---

## Not provided by GPUix

The owner's explicit ask: **whatever is missing and GPUix does not already
provide** — the rows that need real implementation, not API-shape work over an
existing host element.

Verdicts are against the **published `@gpuix/react` / `@gpuix/native` 0.10.0**
(the version this repo pins), read on 2026-10-17 from
`workspaces/components/node_modules/@gpuix/react/dist/index.d.ts`,
`dist/components/`, `dist/floating.d.ts`, `@gpuix/native/dist/host.d.ts` and
`@gpuix/native/index.d.ts`. They are **not** read from `references/gpuix`, which
is ahead of the published release — the divergence is called out below.

### Provided by GPUix — API-shape work only

| Row | GPUix provides | Verdict |
| --- | -------------- | ------- |
| Text / typography | `<text>` host element | **verified** (published 0.10.0) |
| Icons | `<svg>` (tintable monochrome) + `<img>` | **verified** |
| Separators, Spacers, Stack / layout primitives, Boxes / containers | `div` + flexbox / grid | **verified** |
| Scrollable containers | `overflow: "scroll"` | **verified** |
| Text inputs / Text areas | `<input>`, `<textarea>` | **verified** |
| Selects | `Select` + parts | **verified** |
| Comboboxes | `Combobox` + parts | **verified** |
| Tooltips | `Tooltip` + parts | **verified** |
| Virtualized lists | `<virtual-list>` | **verified** |
| Syntax highlighting | `<code>` (bundled languages) | **verified** |
| Diff viewer | `<diff>` (unified) | **verified** |
| Image preview | `<img>` (path, data URL, http(s)) | **verified** |
| File / folder selection | `GpuixRenderer.promptForPaths` | **verified** |

**Primitives only — still needs implementation:** Popovers / Dropdown menus /
Context menus (`floating`'s `FloatingLayer` + `<anchored>` give positioning and
occlusion, not menu semantics); Toasts / notifications (`AnimatePresence` +
`createPortal` + `<anchored>`); Buttons and Dialogs (**present on
`references/gpuix` `main`, absent from published 0.10.0** — no `./button` or
`./dialog` subpath and no `Button` / `Dialog` in `dist/index.d.ts`); `<canvas>`
custom drawing (**unverified** — the README's Supported Elements table marks it
"Custom drawing (planned)").

**Cross-cutting, verified, partial:** AccessKit `role`, `aria-label`,
`aria-description`, `aria-id`, `aria-expanded`, `aria-selected`,
`aria-valuetext`, `aria-level`; native `tabIndex` / `autoFocus` and renderer
`focusElement` / `focusNext` / `focusPrevious` / `focusNextWithin`. There is **no**
`aria-checked`, `aria-valuenow`, `aria-labelledby` or `aria-describedby`.

### Not provided — needs real implementation

Grouped by tier. The GPUix primitive each will be built on is in the row's Notes.

- **Tier 1:** Labels (association needs `aria-labelledby` — unsupported), Button
  groups, Checkboxes, Radio groups, Switches, Progress, Skeletons, Loading
  indicators, Slider, Range slider, Meter, Number Field, OTP Field, Toggle,
  Rating.
- **Tier 2:** Cards, Badges, Avatars, Lists / list items, Empty states, Alerts,
  Inline validation, Toasts / notifications, Dialogs, Confirmation dialogs,
  Popovers, Dropdown menus, Context menus, Command menus, Tabs, Accordions,
  Collapsible sections, Breadcrumbs, Pagination, Search inputs, Date / time
  pickers, Fieldset, Form, Navigation Menu, Preview Card, Drawer, Stepper,
  Timeline, Color picker, Tag / token input, Mention input, Hotkey-recorder
  input, Countdown, Carousel, Inline edit, Keyboard shortcuts / keycap display.
- **Tier 3:** Tables, Sortable tables, Row selection, Column configuration,
  Resizable columns, Filtering controls, Data toolbars, Virtualized tables, Tree
  views, Expandable rows, Key-value displays, Property panels, Statistic /
  metric cards, Charts.
- **Tier 4:** every row — Resizable split panes, Panel groups, Collapsible
  sidebars, Tabbed panels, Detachable / movable tabs, Docking layouts, Nested
  panel arrangements, Workspace layouts, Persistent panel state, Keyboard
  navigation, Command palette, Application menus, Status bars, Toolbars,
  Breadcrumb navigation, Inspector panels, Property editors, File trees, Log
  viewers, Terminal surfaces, Search and replace, Multi-pane editing layouts.
- **Tier 5:** Code editor integration, Rich-text editing, Drag and drop,
  Notification centre, Multi-step forms, Virtualized hierarchical data, Advanced
  filtering / query builders, QR code, File upload, Video / audio player +
  waveform, Crop area.

Nothing in this list may be claimed `done` until it runs in the real runtime or
carries an evidenced limitation. The capability evidence lives in
`docs/gpuix-capabilities.md` (plan `203`); the sequencing is in plan `205`.

---

## Tier 1 — foundational

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Text / typography | todo | yes | `<text>` host element. API-shape work, not implementation. |
| Icons | todo | yes | `<svg>` (tintable monochrome) + `<img>` provided. The icon *set* and sizing rules are ours. API-shape work, not implementation. |
| Separators | todo | yes | `div` + border. API-shape work, not implementation. |
| Spacers | todo | yes | `div`. API-shape work, not implementation. |
| Stack / layout primitives | todo | yes | flexbox + grid provided. API-shape work, not implementation. |
| Boxes / containers | todo | yes | `div`. API-shape work, not implementation. |
| Scrollable containers | todo | yes | `overflow: "scroll"` gives a native scroll container. API-shape work, not implementation. |
| Buttons | todo | ? | `Button` is on `references/gpuix` `main` but **not in published 0.10.0** (verified). Our own keyboard contract is required — plan `030` §3.4. Variants merged here: Floating action button and Copy button (adabraka `floating_action_button`, `copy_button`). |
| Button groups | todo | ? | Variants merged here: Toggle Group (base-gpui `ToggleGroup`) and Segmented control (adabraka `segmented_nav`) — pressed-state variants, not separate rows. |
| Labels | todo | ? | `<text>` exists; control association needs `aria-labelledby`, which GPUix does not expose (verified). |
| Text inputs | todo | yes | `<input>` host element. API-shape work, not implementation. |
| Text areas | todo | yes | `<textarea>` host element. API-shape work, not implementation. |
| Checkboxes | todo | ? | No checkbox host element; `aria-checked` is unsupported. Variant merged here: Checkbox Group (base-gpui `CheckboxGroup`). |
| Radio groups | todo | ? | No radio host element; roving-focus keyboard contract is ours. |
| Selects | todo | yes | `Select` + parts published. API-shape work, not implementation. |
| Switches | todo | ? | Distinct from Toggle (on/off state vs momentary pressed mode). |
| Progress | todo | ? | `div` + width/opacity `motion`. |
| Tooltips | todo | yes | `Tooltip` + parts published. API-shape work, not implementation. |
| Skeletons | todo | ? | `div` + opacity `motion` (GPUix animates opacity only — verified). |
| Loading indicators | todo | ? | **No rotation** in `motion` (verified); use an indeterminate sweep (width/left) or a discrete step cycle. |
| Slider | todo | ? | No slider host element or React export (verified). Track / thumb / indicator from `div`; pointer + keyboard behaviour ours. |
| Range slider | todo | ? | Two-thumb variant of Slider; its own runtime for min/max ordering and thumb crossing. No host element. |
| Meter | todo | ? | Distinct from Progress: a value in a range, not task completion. No host element. |
| Number Field | todo | ? | `<input>` exists (API-shape for the text part); stepper buttons, drag-to-scrub, clamping and locale formatting are ours. |
| OTP Field | todo | ? | `<input>` exists; segmented rendering, paste distribution and keyboard movement are ours. |
| Toggle | todo | ? | Momentary pressed mode, distinct from Switches. No `Button` in published 0.10.0; built on `div` + the shared keyboard contract. |
| Rating | todo | ? | Radio-group-like input; no host element. Reuses the radio roving-focus contract. |

## Tier 2 — composition and feedback

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Cards | done | yes | `variant` outline/elevated/plain; 5 native behaviour tests |
| Badges | done | yes | seven variants (neutral/primary/4 status tones/outline), two sizes sized by type role; 7 native behaviour tests. Not interactive by design; no icon or dismiss slot yet |
| Avatars | done | yes | four diameters, deterministic unicode-safe initials fallback (8 logic tests), presence dot; 7 native behaviour tests. No image loading/error state in v1 — a missing file paints nothing and does not restore the initials |
| Alerts | done | yes | compound parts (`Alert`, `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`, `AlertDismiss`) over a tone context; four tones from the shared status palette; 12 native behaviour tests (real click, keyboard activation, alert role, a caller `onClick` composing with `onDismiss`). Dismiss uses the local button stand-in; live-region announcement not verifiable here |
| Lists / list items | done | yes | `selectionMode` none/single/multiple over a roving tab stop: arrow wrap over disabled rows, real focus (`focusElement`), controlled + uncontrolled; multiple adds plain/Cmd/Ctrl/Shift clicks, Shift+Arrow ranges from an anchor and Cmd/Ctrl+A select-all of enabled rows; type-ahead jumps and cycles by an explicit `ListItem` `textValue`; single/none lists also take `onActivate` (Enter or click, never Space; disabled rows never), with the multiple variant rejecting it at the type level; a caller `onClick` on an enabled row is composed before activation; a held Enter activates only once; 38 native behaviour tests. **Scale:** a 1,000-row list mounts in ≈1.1 s and one roving-focus move takes ≈1–2 s because every row is repainted — measured, not estimated (`docs/performance.md`, `test:perf`); virtualise or paginate large collections. No `aria-multiselectable` in 0.10.0, no href/link role on activation, no drag reorder or virtualisation |
| Empty states | done | yes | title + optional description/action/icon, no surface of its own; 6 native behaviour tests including a real click on the action. Wrap width is a component constant (no measure token) |
| Inline validation | done | partial | `Field`/`FieldLabel`/`FieldDescription`/`FieldError`/`FieldInput` with schema-message `validate`/`validateAll`; 6 native behaviour tests + validation logic suite, both themes. A disabled input is `readOnly`, leaves the tab order and paints the disabled roles. No `aria-describedby`/`aria-invalid` in 0.10.0; the caller owns the value and when validation runs |
| Toasts / notifications | done | yes | Effect store (`SubscriptionRef` + `FiberMap`), bounded queue, monotonic ids, auto-dismiss tested with `TestClock`, stale-timer regression; hovering or keyboard focus on either control pauses and the last one leaving resumes with the remaining time; one labelled action (the handler lives in the provider) runs once and dismisses, and a label without a handler draws nothing; tone and dismiss marks are `@gpuixui/icons`; 14 native behaviour tests. No `zIndex` (render the viewport last), no progress bar |
| Dialogs | done | partial | local overlay over an `anchored` veil at window coordinates (0.10.0 ships no Dialog parts and no portal), caller `ref` composed on the content; 13 native behaviour tests + 5 dismiss-stack logic tests. No `aria-modal`/`aria-labelledby` in 0.10.0 — named through the required `label` |
| Confirmation dialogs | done | partial | Cancel holds initial focus (Enter cancels); confirm never closes the dialog itself, the caller does; `loading` disables both actions and suppresses Escape/backdrop; 5 native behaviour tests. Busy indicator is a `…` text glyph: primitives' `Spinner` reads a second theme context, so adoption waits on one provider |
| Popovers | done | partial | anchored through GPUix's `FloatingLayer`; the runtime snaps but does not flip and its `center` centres on the containing block, so the component flips a snapped surface back off its trigger and maps `align="center"` to a measured `start` offset; Escape restores focus, Tab and outside presses do not; share the dismiss stack with Dialog and a mouse-down re-open guard, caller `ref` composed on the trigger; 12 native behaviour tests, both themes |
| Dropdown menus | done | partial | anchored `FloatingLayer` surface with a shared row/highlight core; keyboard opens (`Enter`/`Space`, `ArrowDown`, `ArrowUp`) land on the first/last enabled row, arrow/Home/End wrap and skip disabled rows, Enter activates and restores focus, checkbox and destructive rows; type-ahead jumps by a case-insensitive 500 ms prefix, cycles on a repeated letter and skips disabled rows; one level of submenus opens by click, hover, `Enter`/`Space` or `ArrowRight`, positions at the row's right edge, keeps arrows and type-ahead inside, runs a pointer-clicked row once, closes one level on `Escape`/`ArrowLeft` and both on an outside press; the root surface flips off its trigger when snapping would cover it and `align="center"` is measured rather than the runtime's containing-block centre; check and submenu marks are `@gpuixui/icons`; 35 native behaviour tests, both themes. No deeper nesting is tested, submenus only open right and have no `aria-haspopup` in 0.10.0, and the checkbox row uses `aria-selected` instead of `aria-checked` |
| Context menus | done | partial | pointer-positioned `anchored` surface over the shared rows and submenu parts; 17 native behaviour tests (right click opens, lands within 12px of the pointer, select runs once, second right click moves it, `Shift+F10` opens at the trigger's bottom-left with focus in the menu, Escape returns focus, type-ahead jumps to a row, submenus open on `ArrowRight` and close one level on `Escape`/`ArrowLeft`, a pointer-clicked submenu row runs once). 0.10.0 has no `onContextMenu` — `onAuxClick` + `isRightClick`; no `aria-haspopup` and no portal |
| Command menus | done | partial | compound parts (`CommandMenu`, `CommandMenuInput`, `CommandMenuList`, `CommandMenuItem`, `CommandMenuEmpty`) over a dialog-hosted searchable palette composing Dialog and `menu/logic.ts`; default matching is a case-insensitive subsequence (initials match) ranked within each declared group so headings never repeat, with a custom `filter` keeping declaration order; input keeps focus while the highlight moves; a run command is recorded (front-inserted, deduped, capped) and shown first under `Recent` only while the query is empty, controlled through `recent`/`defaultRecent`/`onRecentChange` with `recentLimit`/`recentLabel`; 20 native behaviour tests + 12 fuzzy + 7 recents logic tests. A caller-composed `CommandMenuItem` composes its `onClick` with the action, not instead of it. Per-group rather than global ranking, recents are session state unless the caller persists `recent`, `aria-activedescendant` unavailable, input is the host element: primitives' `Input` reads a second theme context, so adoption waits on one provider |
| Tabs | done | partial | roving tab stop on the selected trigger, arrow wrap skipping disabled tabs, Home/End, automatic and manual activation, and both axes (`orientation` switches Down/Up movement and the row/column layout); Enter selects on press and Space on release, and a held Enter selects once; caller `ref` and `onBlur` are composed with the internal ones; 15 native behaviour tests, both themes. 0.10.0 has no `aria-orientation`/`aria-controls`, so the panel is named by its value |
| Accordions | done | yes | single (with `collapsible`) and multiple modes over a tagged-union state; divider order, disabled sections, chevron indicator; arrows/Home/End move focus between enabled headers (wrapping, without toggling), caller `ref` composed on the header; Enter toggles on press and Space on release, and a held Enter toggles only once; 15 native behaviour tests + 15 transition tests. No height animation; no `transform` for a rotating chevron |
| Collapsible sections | done | partial | trigger with `aria-expanded`, content unmounts while closed; Enter toggles on press and Space on release; 5 native behaviour tests. Mounts instantly: 0.10.0's motion needs a numeric height and an auto-height reveal needs a measured first paint |
| Breadcrumbs | done | partial | declarative trail with `maxItems` collapsing the middle (first + … + tail), separators follow their item; links fire `onSelect` on Enter press and Space release; 6 native behaviour tests + 7 collapse tests. No `aria-current` in 0.10.0, so the current page is text and colour |
| Pagination | done | partial | compound parts (`Pagination`, `PaginationPrevious`, `PaginationList`, `PaginationItem`, `PaginationNext`, `PaginationEllipsis`) over a derived window: the root clamps the page and computes the window once, so the caller never repeats the stable-width rule; 12 native behaviour tests + 9 window tests, both themes. A caller `onClick` on Previous/Next/Item composes with the page change (the current page still reports the caller and changes nothing). Current page uses `aria-selected` because 0.10.0 has no `aria-current`; no page-size control |
| Search inputs | done | yes | leading search icon, conditional clear control, Enter submit, Escape clears only when non-empty, the clear control activates from the keyboard on Space release, controlled/uncontrolled, caller `ref` composed with the internal focus ref; 8 native behaviour tests. No debounce (the consumer's job) |
| Comboboxes | done | partial | compound parts (`Combobox`, `ComboboxTrigger`, `ComboboxContent`, `ComboboxInput`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty`) wrapping GPUix's headless combobox with our ranked option shape; the popup flips once off a snapping trigger and `align="center"` is measured, single and multiple selection by value, disabled rows, empty state, Escape focus restore, pointer selection/toggling and outside-press dismissal; `onCreate` appends one create row over a new query (single closes and returns focus, multiple keeps the popup and stores the query once, never the sentinel); 23 native behaviour tests + ranking/create suite, both themes. No async option loading, no `aria-activedescendant` |
| Date pickers | done | partial | compound parts (`DatePicker`, `DatePickerTrigger`, `DatePickerContent`, `DatePickerCalendar`) over a month grid (Effect `DateTime`, no `Date`), surfaced through `Popover`; arrow/Home/End/PageUp/PageDown, inclusive `min`/`max` that clamp movement and stop month browsing at the bound, a `clearable` reset to `null`, ISO-day value; 16 native behaviour tests + 18 calendar tests, both themes. Fixed English labels, no adjacent-month days, no time of day (see **Time pickers**), no `aria-current`, no `aria-disabled` (an unavailable day leaves the tab order and is named `, unavailable`) |
| Time pickers | done | yes | compound parts (`TimePicker`, `TimePickerSegment`, `TimePickerSeparator`, `TimePickerClear`); `HH:mm` 24-hour value (`null` = none), two labelled input segments, typed digits clamp per segment (`99` hours → `23`), arrows carry across the hour and wrap at midnight from one clock function, `minuteStep` for arrows only, blur pads both segments, opt-in `clearable` reset that activates on Space release; 11 native behaviour tests + 12 logic tests, both themes. A field, not a trigger/popup (no `aria-valuenow` for a spinbutton); fixed 24-hour/no locale, no `aria-disabled` (disabled is `readOnly` + dimmed), no seconds or timezone |
| Message scroller | done | partial | `MessageScroller`, `MessageScrollerViewport`, `MessageScrollerItem`, `MessageScrollerJumpToLatest` over a pure pin/unread rule set; follows appended rows and a taller streamed row while pinned, leaves the reader's offset untouched when scrolled up, counts arrivals in the affordance, returns to the end on jump or wheel-down; 10 native behaviour tests + 11 rule tests, both themes. **Every row renders** (`<virtual-list>` takes an item count rather than compound children, so it is not virtualized in v1); the affordance sits beneath the viewport because `position: "absolute"` resolves against the mount parent; no resize observer and no `aria-live` in 0.10.0 |
| Fieldset | done | partial | `Fieldset` + `FieldsetLegend` over a `role="group"` named by the legend; `disabled` reaches `FieldInput` (read-only, out of the tab order, disabled roles) and dims only the legend; 7 native behaviour tests. 0.10.0 has no `fieldset` element and no `aria-disabled`, so the group state is not announced; other controls keep their own `disabled` |
| Form | done | partial | `Form` over an owned value: decodes with the caller's schema, shows every `validateAll` message in one `role="alert"` summary, calls `onSubmit` with the decoded value and refuses to submit while `pending`; a render prop hands over `errors`/`pending`/`submit` because the contract fixes Form as one part; 7 native behaviour tests. No field registration, no message-to-field mapping and no re-validation on edit |
| Navigation Menu | done | partial | `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink`: one anchored panel at a time over one shared hover-travel policy (`openOnHover`, `openDelay`, `closeDelay`) — hover opens, the pointer may cross into the panel, leaving both closes, a switch cannot race the previous item's timer, and hover never takes focus; press/Enter/Space/ArrowDown open (ArrowDown focuses the panel), Left/Right/Home/End move between triggers, Escape closes through the shared dismiss stack and returns focus, outside press closes, links run once and close, controlled `value`; 17 native behaviour tests, both themes. No `href` in 0.10.0 (links are buttons with `onSelect`), no pointer-type signal (touch uses press), no `aria-haspopup` |
| Preview Card | done | partial | `PreviewCard`, `PreviewCardTrigger`, `PreviewCardContent` over the anchored layer and the shared dismiss stack: delayed hover open (default 300 ms), immediate keyboard-focus open, pointer travel into the card keeps it open, close after leaving both (default 150 ms), Escape restores focus, outside press closes, press toggles (touch path), `open`/`openDelay`/`closeDelay` controlled; 8 native behaviour tests. Timers are component UI timers; no pointer-type signal (no touch hover), not auto-focused on hover, no anchor arrow or `aria-haspopup` in 0.10.0 |
| Drawer | done | partial | `Drawer`, `DrawerTrigger`, `DrawerClose`, `DrawerContent` (left/right/bottom, sm/md/lg), `DrawerHeader`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter` over the shared modal rules in `internal/modal.ts` (extracted from Dialog: open state, dismiss stack, focus in/return, Tab trap); 10 native behaviour tests, both themes. No swipe-to-dismiss (no drag host feature), no slide animation (no transform), no `aria-modal`/`aria-labelledby`, no portal (anchored veil), sizes are layout constants |
| Stepper | done | partial | `Stepper` + `StepperStep` over `role="list"`: statuses (`complete`/`current`/`upcoming`) derived from the one `value`, horizontal or vertical, `StateStyle<StepperStepState>`; 8 native behaviour tests. Display-only by design (no step click), no connector line, and `aria-selected` stands in for the missing `aria-current` |
| Timeline | done | partial | `Timeline` + `TimelineItem` over `role="list"`: an explicit `complete`/`current`/`upcoming` status (passed, not derived), timestamp/description, a connector after every event but the last, `StateStyle<TimelineItemState>`; 6 native behaviour tests, both themes. Display-only, no `aria-current` (the current event uses `aria-selected`), `last` comes from direct children, one connector style |
| Color picker | done | partial | one `ColorPicker`: a keyboard-reachable swatch grid (defaults are six theme colours), a HEX field that normalises `#abc`/`AABBCC` on commit, a live preview and `StateStyle<ColorPickerState>`; 8 native behaviour tests + 8 hex tests, both themes. **No saturation/value square** — 0.10.0 has two-stop linear gradients only and no radial gradient, so the square is not faked; no alpha/HSL/RGB fields or eyedropper |
| Tag / token input | done | partial | `TagInput` + `TagInputField` + `TagInputChip`: Enter and a typed comma commit through a pure add/remove rule set, duplicates refused unless `allowDuplicates`, `max` caps additions, a chip control removes on Enter press or Space release, controlled-only value, `StateStyle` on both field and chip; 9 native behaviour tests + 10 rule tests, both themes. No Backspace-on-empty (0.10.0 emits no keyDown for Backspace/Delete in the test renderer), no `aria-disabled` (readOnly + dimming), no autocomplete |
| Mention input | done | partial | `MentionInput` + `MentionInputList` + `MentionInputItem`: the text's last `@` token opens a ranked anchored list (prefix matches first, case-insensitive, capped), arrows wrap, Enter (the input's submit event) or a press inserts `@name `, Escape and a no-match query close, both callbacks fire once, `disabled`; 11 native behaviour tests + 12 rule tests, both themes. Caller `onKeyDown`/`onFocus`/`onBlur` and row handlers compose with the component's own action. The query comes from the text, not the caret (no caret API in 0.10.0), a space while the list is open is consumed by the runtime, and `listbox`/`option` roles are dropped from the a11y dump (rows are selected buttons) |
| Hotkey-recorder input | done | partial | one `HotkeyRecorder`: click/`Enter`/`Space` listens, a real chord reports the shared accelerator string, Escape cancels, blur cancels, a named clear control unbinds, the recorder starts on Enter press or Space release and a keyboard-cleared value never starts a recording, `disabled` leaves the tab order, `StateStyle<HotkeyRecorderState>`; 11 native behaviour tests + 8 capture tests, both themes. No `preventDefault` in 0.10.0 (a captured system chord still fires), clearing is a control because the test renderer emits no Backspace/Delete, no conflict detection |
| Countdown | done | yes | one `Countdown` over `<text>`: `MM:SS` under an hour, uncapped `HH:MM:SS` after, opt-in `Nd ` prefix, floored seconds, negatives clamp to `00:00`, expired renders `mutedForeground`; 5 native behaviour tests + 9 formatting tests, both themes. The component owns **no timer** — the app ticks with Effect `Clock` and passes `remainingMs`; fixed locale-free format, no `role=timer` for live announcement in 0.10.0 |
| Carousel | done | partial | `Carousel`, `CarouselTrack`, `CarouselSlide`, `CarouselControl`: discrete stepping with clamped edges, `loop` wrapping, arrow/Home/End keys, controlled/uncontrolled index, slides kept mounted and hidden with `display`, `StateStyle<CarouselSlideState>`; 9 native behaviour tests, both themes. A caller `onClick` on a control composes with the step. **No slide animation** (motion has no transform) and no swipe; no indicator dots or auto-advance; slides must be the track's direct children |
| Inline edit | done | partial | one `InlineEdit` that swaps a `role="button"` display for a real `<input>`: Enter or blur commits (once), Escape discards, an unchanged draft calls nothing, empty text is a valid value, the display starts editing on Enter press or Space release, controlled/uncontrolled edit state, `StateStyle<InlineEditState>`; 11 native behaviour tests, both themes. Caller display (`onClick`/`onKeyDown`) and field (`onChange`/`onSubmit`/`onFocus`/`onBlur`) handlers compose with the swap and commit. No `contenteditable` in 0.10.0 (the swap is explicit); no `aria-invalid`/`aria-describedby`; blur commits by contract |
| Keyboard shortcuts / keycap display | done | yes | `KeyboardShortcuts`, `KeyboardShortcutsGroup`, `KeyboardShortcut` and `Keycap` over the shared accelerator model (`mod` adapts to the platform; order preserved; unknown tokens display verbatim); 6 native behaviour tests + 10 accelerator tests, both themes. Display-only by design (a row documents a chord, never binds it); no `aria-keyshortcuts` in 0.10.0; rows are separated by 1px elements because an element has one `borderColor` |

## Tier 3 — data presentation

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Tables | todo | ? | No `<table>` element; grid + `div` rows. |
| Sortable tables | todo | ? | Grid + keyboard headers. |
| Row selection | todo | ? | `aria-selected` is supported (verified). |
| Column configuration | todo | ? | Grid tracks + a menu. |
| Resizable columns | todo | ? | Pointer events + grid tracks. |
| Filtering controls | todo | ? | `div` + `<input>`. |
| Data toolbars | todo | ? | Toolbars + Button groups. |
| Virtualized lists | todo | yes | `<virtual-list>` published (visible-range and scroll-anchor APIs). API-shape work, not implementation. |
| Virtualized tables | todo | ? | `<virtual-list>` rows can host a grid; there is no table element. |
| Tree views | todo | ? | `<virtual-list>` + indentation; hierarchical virtualization is ours. |
| Expandable rows | todo | ? | `motion` height. |
| Key-value displays | todo | ? | `div` + `<text>`. |
| Property panels | todo | ? | Fieldset + Inline validation + Key-value displays. |
| Statistic / metric cards | todo | ? | Cards + `<text>`. |
| Charts | todo | ? | No chart host element. `<svg>` can render static charts; `<canvas>` is "planned" (unverified). |

## Tier 4 — desktop workspace

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Resizable split panes | todo | ? | Pointer events + `motion`; `col-resize`/`row-resize` cursors are provided (verified). |
| Panel groups | todo | ? | Composition over split panes. |
| Collapsible sidebars | todo | ? | `motion` width (outer clipping container, not inner reflow). |
| Tabbed panels | todo | ? | Tabs + panels. |
| Detachable / movable tabs | todo | ? | Needs a portal/drag model; no drag host feature. |
| Docking layouts | todo | ? | Composition over split panes + tabs. |
| Nested panel arrangements | todo | ? | Composition. |
| Workspace layouts | todo | ? | Composition + persistence. |
| Persistent panel state | todo | ? | App-owned serialisation; no renderer storage. |
| Keyboard navigation | todo | ? | Real native focus handles (verified); the roving-focus model is ours. |
| Command palette | todo | ? | `<input>` + `FloatingLayer` + `<virtual-list>`. Variant merged here: Spotlight (adabraka `spotlight`). |
| Application menus | todo | ? | The macOS menu bar is a renderer API (`README.md` "The macOS menu bar"); cross-platform app menus are ours. |
| Status bars | todo | ? | `div` + `<text>`. |
| Toolbars | todo | ? | `div` + Button groups. |
| Breadcrumb navigation | todo | ? | Breadcrumbs + navigation. |
| Inspector panels | todo | ? | Property panels + panels. |
| Property editors | todo | ? | Fieldset + inputs. |
| File trees | todo | ? | Tree views + `<virtual-list>`. |
| Log viewers | todo | ? | `<virtual-list>` + `<text>`; text search/highlight hooks exist. |
| Terminal surfaces | todo | ? | No terminal host element; **unverified** whether a PTY surface is feasible. |
| Search and replace | todo | ? | `useTextSearch`/`findRanges` highlight rendered text; the replace UI is ours. |
| Multi-pane editing layouts | todo | ? | Composition over split panes + editors. |

## Tier 5 — specialised

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Code editor integration | todo | ? | `<code>` renders highlighted code; there is **no editable code surface** (verified). |
| Syntax highlighting | todo | yes | `<code>` renders syntax-highlighted blocks with bundled languages. API-shape work, not implementation. |
| Diff viewer | todo | yes | `<diff>` renders a unified diff. API-shape work, not implementation. |
| Rich-text editing | todo | ? | `<markdown>` renders markdown; editing is not provided (verified). |
| Image preview | todo | yes | `<img>` loads raster and SVG from path/data URL/http(s). API-shape work, not implementation. |
| File / folder selection | todo | yes | `GpuixRenderer.promptForPaths` opens the platform picker. API-shape work, not implementation. |
| Drag and drop | todo | ? | Mouse events exist; there is no drag host feature. `onFileDrop` handles file drops only. |
| Notification centre | todo | ? | Composition over toasts + panels. |
| Multi-step forms | todo | ? | Variant merged here: Form (adabraka `form`) — partial coverage; validation orchestration is the Tier 2 Form row. |
| Virtualized hierarchical data | todo | ? | Tree views + `<virtual-list>`; hierarchical virtualization is ours. |
| Advanced filtering / query builders | todo | ? | Composition over inputs + menus. |
| QR code | todo | ? | Render the matrix as a grid of `div`s or one `<svg>`; both are provided. The encoder is ours (dependency not yet chosen). |
| File upload | todo | ? | Picker provided (`promptForPaths`); the drop surface, progress and validation are ours. `onFileDrop` exists. |
| Video / audio player + waveform | todo | ? | **No media host element** (verified: not in `ElementType`). Playback needs a platform surface — **unverified**; a waveform can only be drawn via `<svg>` or the planned `<canvas>`. |
| Crop area | todo | ? | Draggable handles over `<img>`; crop geometry and constraints are ours. No custom-paint requirement unless the mask is drawn — **unverified**. |
| Chat (AI conversation) | done | partial | `Chat` + `ChatMessages` + `ChatComposer` + `ChatEmpty` over a schema status union (`idle`/`submitting`/`streaming`/`error`): Enter sends a trimmed draft, Shift+Enter stays a newline, Escape stops while in flight, Stop replaces Send, an error is a `role="alert"` row with retry, `onAttach` is the caller's control, and the transcript is `MessageScroller` (pinned follow, jump-to-latest); 9 native behaviour tests + a transition suite, both themes. Behaviour ported from **shadcn/ui's AI Elements `chat`** (credited in `docs/chat.mdx`). Every row renders (no virtualized history); no attachments picker, no `aria-live`, no token accounting |
| Message (AI message row) | done | partial | `Message` + `MessageAvatar` + `MessageContent` + `MessageReasoning` + `MessageToolCalls` + `MessageSources` + `MessageAttachments` + `MessageStreaming` + `MessageActions`: user/assistant/system variants, markdown repaint on a streamed source, reasoning closed by default, failed tool calls in `destructive`, caller-opened citations, attachment chips, a `status` line only while streaming, actions only when the caller wires them; 10 native behaviour tests, both themes. Behaviour ported from **shadcn/ui's AI Elements `message`** (credited in `docs/message.mdx`). No `aria-labelledby`/`aria-live`; links and sources report URLs because 0.10.0 has no `href` |
