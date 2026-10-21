010-phase-b-design-tokens.md | discarded | packages/tokens, docs/tokens.md and docs/design-system.md already landed; phase slice satisfied
011-package-tokens.md | discarded | @gpuixui/tokens already ships the full core, extension and React entry
012-docs-design-system.md | discarded | docs/design-system.md and docs/tokens.md already exist and are guarded by docs.test.ts
013-high-contrast-theme.md | discarded | high-contrast light/dark themes already ship via getTheme(mode, "high")
014-status-tones-and-colour-helpers.md | discarded | status tones plus alpha/statusTone helpers already exported by tokens
015-colour-role-index.md | discarded | colorRoles already exported for the docs tables
016-tokens-consumable-exports.md | discarded | tokens already resolves from source with consumable exports
017-focus-ring-and-docs-truth.md | discarded | focusRing and keyboardFocusRing already ship, docs/claims corrected
018-elevation-truth.md | discarded | elevationShadow already hoisted and BoxShadow.inset dropped
019-motion-tokens.md | discarded | superseded: @gpuixui/motion owns easings/springs; TODO.md records the cancellation
020-gpuix-runtime-capability.md | discarded | Phase A recon doc pinned at 0.10.0; the capability matrix now ships in @gpuixui/runtime and /docs/runtime
021-primitives-consume-tokens.md | discarded | primitives core/theme.ts already imports @gpuixui/tokens directly
022-swarm-single-writer.md | discarded | harness row already tracked in TODO.md (single live session per worktree); infrastructure is the coordinator's
023-primitives-alpha-from-tokens.md | discarded | local core/color.ts is gone; alpha comes from tokens
024-icons-size-scale-from-tokens.md | discarded | packages/icons/src/sizes.ts already derives ICON_SIZES from token iconSize
025-fields-disabled.md | discarded | Input/TextArea already expose disabled with read-only, tab-order and guard behaviour
026-blank-label-surfaces.md | queued | real gap in primitives: blank explicit labels still pass raw to aria-label; workstream path, TODO row added
027-tier1-api-sections.md | discarded | all 28 primitives pages carry ## API
028-skeleton-circle-diameter.md | queued | real gap: Skeleton circle with one explicit dimension paints an ellipse; primitives workstream, TODO row added
030-primitives-package.md | discarded | packages/primitives ships the 19 Tier 1 components; plan superseded by landed 030/040 work
031-icons-package.md | discarded | packages/icons exists with Icon, names, registry, sizes and tests
040-phase-c-tier1.md | discarded | Tier 1 components, docs pages and inventory rows already landed
041-tier1-runtime-verification.md | discarded | runtime suites exist and run against the native TestRenderer
042-tier1-theme-verification.md | discarded | runtime theme-matrix suite already verifies both themes
043-presentational-testid.md | discarded | Text, Separator and Spacer already accept testId
044-radio-skip-disabled.md | discarded | RadioGroup already skips disabled options in its roving tab stop
045-labelledby-prop.md | discarded | labelledBy already returns { label }, which the controls read
046-textarea-no-submit.md | discarded | TextAreaProps already omits onSubmit
047-tier1-docs-and-examples.md | discarded | 28 primitives docs pages and examples already ship
048-tier1-fixable-limitations.md | discarded | ButtonGroup name and the other two fixes already landed
049-radio-group-focus-contract.md | discarded | selection-control focus contract already landed and tested
050-docs-layering-and-omissions.md | discarded | docs/tokens.md already carries the layering model and platform notes
051-platform-type-styles.md | discarded | platformStyles/platformTheme already ship and are tested
052-register-font.md | discarded | registerFonts already ships with tests, docs and a live probe
053-reconcile-tokens-branches.md | discarded | stale branch reconciliation from the retired agent/tokens-* branches
053-value-controls.md | discarded | Slider, RangeSlider and Meter already ship with runtime tests
054-avatar-size-scale.md | discarded | tokens already ships avatarSize as a fixed scale
054-remaining-tier1-controls.md | discarded | NumberField, OTPField, Toggle and Rating already ship
055-filled-control-hover-roles.md | discarded | blend/filledHover/filledPressed already ship with contrast floors
055-tier1-theme-axes.md | discarded | runtime/theme-axes.runtime.test.tsx already proves high contrast, density and platform type
056-docs-truth-guard.md | discarded | packages/tokens/src/docs.test.ts already guards the catalogue
056-toggle-group.md | queued | real gap: no ToggleGroup/segmented control in primitives; TODO row added
057-select-accessibility.md | discarded | Select already publishes role, label and expanded state
057-status-text-roles.md | queued | real gap: no info/success/warning/destructive Text roles for plain surfaces; TODO row added
058-accessible-names-from-text.md | queued | real gap: Button/Toggle with text children and no label have no accessible name; folded into the blank-label row
058-docs-numeric-tables-guard.md | discarded | docs.test.ts already guards the numeric token tables
059-catalogue-index-and-contrast-completeness.md | discarded | docs.test.ts already derives the type-role and colour catalogues from the exports
059-text-semantics.md | queued | real gap: Text cannot publish heading/code semantics to the accessibility tree; TODO row added
060-motion-property-count-truth.md | discarded | stale: motion now lives in @gpuixui/motion, not the token package
060-tooltip-placement.md | discarded | Tooltip already delegates anchoring to the shipped GPUix mechanism, trigger-anchored
061-radio-group-invalid.md | discarded | RadioGroup already accepts invalid and paints its ring
061-react-entry-consumer-jsx.md | discarded | react.tsx carries the JSX pragma and react.test.tsx guards it
062-design-system-truth-guard.md | discarded | docs.test.ts already holds the design-system narrative to the catalogue
062-select-list-width.md | discarded | Select's list already carries full trigger width
063-platform-style-variants.md | discarded | platformStyles/platformTheme variants already shipped
063-slider-drag-contract.md | discarded | Slider already captures a drag and starts only on the primary button
064-autofocus-ring.md | discarded | autoFocus fields already paint the keyboard ring
064-documentation-indexes.md | discarded | platform and status indexes already documented
065-checkbox-group.md | queued | real gap: no CheckboxGroup control in primitives; grouped with the ToggleGroup row
065-readme-truth-guard.md | queued | real gap: packages/tokens has no readme drift guard; TODO row added
066-public-value-coverage.md | discarded | docs.test.ts already fails when a public export has no catalogue line
066-select-placement-flip.md | queued | real gap: Select's list does not flip off the window edge; TODO row added
067-persisted-choice-guards.md | queued | real gap: tokens publishes unions with no runtime narrowing guards; TODO row added
067-tooltip-placement-flip.md | discarded | Tooltip delegates placement to GPUix's shipped mechanism; 0.10.0-era plan is stale
068-density-and-tone-guards.md | queued | real gap: no isDensity/isStatusTone narrowing guards for persisted choices; folded into the narrowing row
068-select-long-list-scroll.md | queued | real gap: Select's list cannot scroll when it exceeds the window; folded into the Select row
069-select-keyboard-scroll.md | queued | Select's highlighted option cannot be revealed while the list has no scroll; folded into the Select row
069-selection-and-scrollbar-reach.md | discarded | docs/tokens.md already records the scrollbar and selection reach
070-install-path-and-claim-guards.md | discarded | package README and tokens docs already state the install path from source
070-rating-invalid.md | queued | real gap: Rating cannot show a failed validation; TODO row added
071-contrast-contract.md | discarded | contrastFailures/contrastFloors/highContrastFloors already ship as public API
071-tooltip-accessible-description.md | queued | real gap: Tooltip content is not published as an accessible description on the trigger; TODO row added
072-palette-table-guard.md | queued | real gap: docs/tokens.md palette ramps have no drift guard; folded into the token-guards row
072-scroll-area-keyboard.md | queued | real gap: ScrollArea is not focusable and has no keyboard scrolling; TODO row added
073-declared-contrast.md | discarded | Theme.contrast already records the variant
073-info-tip.md | discarded | examples/basic-app already uses the shipped Tooltip around its info icon
074-contrast-state-and-overlay-surfaces.md | queued | real gap: hover/pressed/selected washes and overlay surfaces are outside the contrast contract; folded into the contrast-coverage row
074-docs-coverage-guard.md | discarded | primitives docs.test.ts already guards the page table and inventory
075-quoted-contrast-figures.md | discarded | docs.test.ts already pins the documented pair count to contrastPairs.length
075-select-option-groups.md | queued | real gap: Select has no option groups; folded into the Select row
076-contrast-surface-and-divider-pairs.md | queued | real gap: soft surfaces and dividers are unmeasured; folded into the contrast-coverage row
076-otp-single-tab-stop.md | queued | real gap: every OTP cell is a tab stop; TODO row added
077-alpha-nan.md | queued | real gap: alpha(NaN) emits #RRGGBBNaN, which the runtime ignores; folded into the token-guards row
077-number-field-decimal-step.md | queued | real gap: stepNumber adds raw floats, so 0.1 steps accumulate noise; TODO row added
078-button-group-square-edges.md | discarded | ButtonGroup attached mode already rounds the group and clips it
078-skeleton-surface-pairs.md | queued | real gap: skeleton is outside the contrast contract; folded into the contrast-coverage row
079-secondary-text-state-washes.md | queued | real gap: secondary text on state washes is unmeasured; folded into the contrast-coverage row
079-tier1-state-aware-style.md | queued | real gap: state-aware style adopted only by fields, not every control; folded into the state-aware row
080-control-edge-on-fills.md | queued | real gap: control boundaries on fills are unmeasured; folded into the contrast-coverage row
080-tier1-state-aware-style-groups.md | queued | real gap: group roots and overlays lack state-aware style; folded into the state-aware row
081-selection-on-painted-surfaces.md | queued | real gap: selection wash on painted surfaces is unmeasured; folded into the contrast-coverage row
081-tier1-per-item-style.md | queued | real gap: data-driven groups have no per-item style; folded into the state-aware row
082-primary-text-role.md | queued | real gap: primary as a text role is unmeasured; folded into the contrast-coverage row
082-text-clamp-runtime-cache.md | queued | real gap: Text clamp resolves from the first identical string laid out; TODO row added
083-select-focus-ring.md | queued | real gap: the Select trigger paints no ring; folded into the Select row
083-status-text-state-washes.md | queued | real gap: status text on washes is unmeasured; folded into the contrast-coverage row
084-control-boundary-on-state-washes.md | queued | real gap: control boundaries on row washes are unmeasured; folded into the contrast-coverage row
084-focus-ring-matrix.md | queued | real gap: no focus-ring matrix over every focusable Tier 1 control; folded into the state-aware row
085-button-onclick-activation.md | discarded | keyboard activation is onActivate by contract; the pointer also calls onClick
085-elevation-tint-role.md | queued | real gap: elevation shadows use literal colours instead of the shadow role; TODO row added
086-icon-button.md | queued | real gap: no IconButton part in primitives; TODO row added
086-total-contrast-contract.md | queued | real gap: the ring on each control surface is unmeasured; folded into the contrast-coverage row
087-label-beside-control-truth.md | queued | real gap: docs advise a Label beside a standalone checkbox/switch, which names nothing; TODO row added
087-selected-secondary-text.md | queued | real gap: selected secondary text is unmeasured; folded into the contrast-coverage row
088-body-text-on-panels.md | queued | real gap: body text on the muted panel and popover is unmeasured; folded into the contrast-coverage row
088-one-value-callback.md | queued | real gap: value callbacks are named inconsistently; folded into the callback row
089-density-metric-merge.md | discarded | mergeDensity already merges density groups per size
089-disabled-tab-order-matrix.md | queued | real gap: no disabled tab-order matrix guard; folded into the state-aware row
090-soft-status-border-role.md | queued | real gap: the soft status edge is alpha-mixed rather than a role; TODO row added
090-tier1-component-api-contract.md | discarded | already tracked in TODO.md Phase C (primitives plans 040, nine ordered steps)
091-invalid-field-fill.md | discarded | invalid already repaints only the border and ring, not the surface
091-selection-in-soft-surfaces.md | queued | real gap: selection inside soft status surfaces is unmeasured; folded into the contrast-coverage row
092-control-boundary-soft-fills.md | queued | real gap: control boundaries on soft fills are unmeasured; folded into the contrast-coverage row
092-examples-suite-parity.md | discarded | runtime/examples.runtime.test.tsx already mounts every registered example
093-accessible-name-matrix.md | queued | real gap: no accessible-name matrix over the Tier 1 controls; folded into the accessible-name row
093-ring-on-soft-fills.md | queued | real gap: the ring on soft status fills is unmeasured; folded into the contrast-coverage row
094-rating-hover-preview.md | queued | real gap: Rating has no hover preview; folded into the Rating row
094-skeleton-on-row-washes.md | queued | real gap: skeleton on row washes is unmeasured; folded into the contrast-coverage row
095-soft-fill-divider.md | queued | real gap: dividers on soft fills are unmeasured; folded into the contrast-coverage row
095-tooltip-center-align.md | queued | real gap: Tooltip still offers align="center", measured as off by half a panel; folded into the Tooltip row
096-button-group-orientation.md | queued | real gap: ButtonGroup cannot stack; folded into the groups row
096-control-size-index.md | queued | real gap: no control-size index or narrowing guard; folded into the token-guards row
097-filled-control-states.md | discarded | blend/filledHover/filledPressed already ship as designed state fills
097-style-wins-last.md | queued | real gap: no guard that a caller's style merges last on every part; folded into the state-aware row
098-brand-theme-truth.md | discarded | brand-theme.example.ts already passes invalidColorRoles and the contrast contract
098-floating-horizontal-sides.md | queued | real gap: floating layers' left/right sides are unmeasured; TODO row added
099-modal-scrim-perceivability.md | queued | real gap: the scrim over every surface is unmeasured; folded into the contrast-coverage row
099-token-helper-single-source.md | discarded | selection.ts already resolves its ring through tokens
100-package-testing.md | discarded | packages/testing already ships the smoke/async/pixels/state harness
110-native-smoke-test.md | discarded | the 21-scenario headless smoke suite already runs on 0.11.0
110-package-components.md | discarded | packages/components already ships all 39 Tier 2 components
111-tier2-foundation-parts.md | discarded | foundation parts already landed
112-tier2-overlays.md | discarded | Dialog/ConfirmDialog/Popover already landed
113-tier2-disclosure-navigation.md | discarded | Tabs/Accordion/Collapsible/Breadcrumb/Pagination already landed
114-tier2-menus.md | discarded | Dropdown/Context/Command menus already landed
115-tier2-feedback.md | discarded | Toast and Field already landed
116-tier2-choice-inputs.md | discarded | SearchInput and Combobox already landed
117-tier2-verification.md | discarded | inventory, theme matrix and completion gate already landed
118-single-writer-components.md | discarded | blocker B3 resolved in this worktree and recorded in TODO.md
119-tier2-date-picker.md | discarded | DatePicker and TimePicker already landed
120-app-playground.md | discarded | apps/playground already ships the headless and live runners
120-list-multi-select.md | discarded | List multiple selection already landed (TODO plan 120)
121-accordion-keyboard.md | discarded | landed (TODO plan 121)
122-context-menu-keyboard.md | discarded | landed (TODO plan 122)
123-toast-pause.md | discarded | landed (TODO plan 123)
124-toast-focus-hold.md | discarded | landed (TODO plan 124)
125-list-select-all.md | discarded | landed (TODO plan 125)
126-menu-keyboard-open.md | discarded | landed (TODO plan 126)
127-date-picker-bounds-and-clear.md | discarded | landed (TODO plan 127)
128-ref-composition-sweep.md | discarded | landed (TODO plan 128)
129-menu-typeahead.md | discarded | landed (TODO plan 129)
130-list-typeahead.md | discarded | landed (TODO plan 130)
130-tier3-4-feasibility-probes.md | queued | real but large: no Tier 3/4 feasibility probes were run; TODO row added
131-dropdown-submenus.md | discarded | landed (TODO plan 131)
132-time-picker.md | discarded | landed (TODO plan 132)
133-command-menu-fuzzy.md | discarded | landed (TODO plan 133)
134-list-activation.md | discarded | landed (TODO plan 134)
135-submenu-pointer-activation.md | discarded | landed (TODO plan 135)
136-prop-forwarding-sweep.md | discarded | landed (TODO plan 136)
137-list-item-click-forwarding.md | discarded | landed (TODO plan 137)
138-combobox-pointer-coverage.md | discarded | landed (TODO plan 138)
139-inventory-test-counts.md | discarded | landed (TODO plan 139)
140-gpuix-native-darwin-x64-build.md | discarded | the darwin-x64 binding is built, installed and recorded in TODO.md
150-native-theme-gallery.md | discarded | native theme gallery already exists in the playground (TODO cross-team row)
151-playground-shell-navigation.md | discarded | the shell-navigation scenario already ships
152-virtualized-table-probe.md | discarded | the virtualized-table scenario already ships
153-tree-view-probe.md | discarded | the tree-view scenario already ships
154-log-viewer-probe.md | discarded | the log-viewer scenario already ships
155-modal-focus-semantics.md | discarded | the modal-focus-trap scenario already ships
156-floating-placement.md | discarded | the floating-placement scenario already ships; its findings are recorded
157-components-consume-token-helpers.md | discarded | components internal/theme.ts already re-exports the token helpers and keeps only the danger mapping
157-motion-collapse.md | discarded | measurement landed; Collapsible height motion is recorded
158-alert-parts.md | discarded | Alert already ships six parts with tests
158-roving-focus.md | discarded | roving focus measured and landed in the shared collection core
159-native-popups.md | discarded | Select/Combobox/Tooltip already use the shipped GPUix popup layer
160-native-a11y-tree.md | discarded | measurement landed; the a11y dump is decoded in the harness
161-native-content-surfaces.md | queued | real gap: svg/img/diff/canvas content surfaces have no native probe; TODO row added
162-drag-targets.md | queued | real gap: cross-element drag targets and file drops have no probe; folded into the playground probe row
163-text-selection.md | queued | real gap: native text selection and copy have no probe; folded into the playground probe row
164-native-context-menus.md | discarded | measurement landed; ContextMenu uses the native right click
165-virtualized-tree.md | discarded | measurement landed and the tree-view scenario exists
166-scroll-into-view.md | discarded | measurement landed; virtual-list anchor reads listScrollTop
167-workspace-restore.md | discarded | measurement landed; the workspace scenario exists
168-native-primitives.md | queued | real gap: the shipped Tier 1 components are not in the native smoke suite; folded into the playground probe row
169-primitives-advanced.md | queued | real gap: the remaining Tier 1 controls are not in the native suite; folded into the playground probe row
170-platform-styles-native.md | discarded | the theme-platform scenario already reads the platform faces in the runtime
171-native-search-highlights.md | queued | real gap: no native search-highlight probe; folded into the playground probe row
172-drag-autoscroll.md | queued | real gap: drag edge auto-scroll is unprobed; folded into the playground probe row
173-horizontal-scroll.md | queued | real gap: horizontal scroll and tab overflow are unprobed; folded into the playground probe row
174-tab-strip-focus.md | queued | real gap: no tab-strip focus probe; folded into the playground probe row
175-nested-panels.md | queued | real gap: no nested-panel probe; folded into the playground probe row
176-command-palette.md | queued | real gap: no command-palette probe; folded into the playground probe row
177-workspace-panes.md | queued | real gap: no tabbed-pane probe; folded into the playground probe row
178-shared-native-host.md | queued | real gap: the native renderer adapter is duplicated in apps/playground/src/smoke/host.ts; TODO row added
179-terminal-feasibility.md | discarded | measurement landed; terminal support ships in @gpuixui/runtime and the landing page
180-chart-feasibility.md | discarded | measurement landed; the dashboard chart is recorded as a gap
181-markdown-feasibility.md | discarded | measurement landed; native markdown renders in the text scenario
182-shell-selection.md | discarded | the shell-navigation scenario already covers selection and keys
183-toast-feasibility.md | discarded | measurement landed; the toast component ships
184-docking-layout.md | discarded | measurement landed; docking is recorded as a Tier 4 gap
185-pinned-grid-chrome.md | discarded | measurement landed; the virtualized table scenario exists
186-collapsible-height.md | discarded | measurement landed; Collapsible ships with measured height behaviour
187-nested-layer-dismiss.md | discarded | measurement landed; dismiss-layer arrow layering ships with tests
188-text-entry-contract.md | discarded | measurement landed; the controlled Input live probe proves typing
189-real-window-smoke.md | discarded | the live window runner already drives a real window through automation
190-live-focus.md | discarded | the focus-visible live probe already measures focus in a real window
191-live-selection.md | discarded | measurement landed; selection is recorded in the live README
192-live-motion.md | discarded | measurement landed; motion is recorded in the live README
193-live-context-menu.md | discarded | measurement landed; the right-click contract is recorded
194-in-window-float.md | discarded | measurement landed; in-window floating is recorded
195-live-float.md | discarded | measurement landed; the in-window float is recorded
196-preview-card.md | discarded | PreviewCard already ships with hover-intent and grace-close tests
197-live-observation-surface.md | discarded | measurement landed; the live renderer report is the observation surface
198-variable-row-heights.md | discarded | measurement landed; the virtual-list scenario covers row heights
199-live-hover.md | discarded | measurement landed; hover enter/leave is recorded in the live README
200-adopt-compound-part-api.md | discarded | the compound-part contract already landed (docs/component-api.md, ADR 0004, inventory check)
201-adopt-runtime-state-model.md | discarded | duplicate: .agents/slop/plans/201-adopt-runtime-state-model.md is the active copy
202-adopt-theme-tokens.md | discarded | duplicate: .agents/slop/plans/202-adopt-theme-tokens.md is the active copy
203-adopt-capability-map.md | discarded | duplicate: .agents/slop/plans/203-adopt-capability-map.md is the active copy
204-adopt-workspace-data-tiers.md | discarded | duplicate: .agents/slop/plans/204-adopt-workspace-data-tiers.md is the active copy
205-implement-gpuix-gaps.md | discarded | duplicate: .agents/slop/plans/205-implement-gpuix-gaps.md is the active copy
206-message-scroller.md | discarded | landed: MessageScroller ships with follow/pin/jump-to-latest tests
207-ai-chat-and-message.md | discarded | duplicate: .agents/slop/plans/207-ai-chat-and-message.md is the active copy
300-message-scroller-feasibility.md | discarded | landed: MessageScroller ships with pin/follow/jump tests
300-pagination-parts.md | discarded | landed: Pagination is a compound part
300-soft-status-quiet-panel.md | queued | real gap: soft status surface on the quiet panel is unmeasured; folded into the contrast row
301-applied-style-contrast-claim.md | queued | real gap: an applied platform style does not declare its contrast; folded into the token-guards row
301-command-menu-parts.md | discarded | landed: CommandMenu is a compound part
301-live-scroller.md | queued | real gap: MessageScroller has no live probe; folded into the playground probe row
302-combobox-parts.md | discarded | landed: Combobox is a compound part
302-native-cost-model.md | queued | real but large: no native cost model or performance baseline; TODO row added
302-platform-type-bridge.md | discarded | stale: describes a removed platformTheme/consumer split that master does not have
303-date-time-picker-parts.md | discarded | landed: DatePicker and TimePicker are compound parts
303-inventory-truth-guard.md | discarded | landed: inventory guards hold the rows
304-create-theme-contrast-selection.md | queued | real gap: createTheme ignores a requested contrast variant; folded into the token-guards row
304-typed-by-position-children.md | discarded | landed: PartChildren and the family render check ship
305-state-aware-style.md | discarded | landed: StyleDesc StateStyle ships on the interactive parts
305-theme-axis-indexes.md | queued | real gap: no ordered indexes for the remaining unions; folded into the token-guards row
306-fieldset.md | discarded | landed: Fieldset ships with native tests
306-inactive-control-state.md | queued | real gap: inactive control label/edge is unmeasured; folded into the contrast row
307-inactive-label-soft-fills.md | queued | real gap: inactive label on soft fills is unmeasured; folded into the contrast row
307-stepper.md | discarded | landed: Stepper ships with tests
308-form.md | discarded | landed: Form ships with validation tests
308-soft-edge-surfaces.md | queued | real gap: soft status edge on badge surfaces is unmeasured; folded into the contrast row
309-drawer.md | discarded | landed: Drawer ships with modal tests
309-state-fills-on-panels.md | queued | real gap: state fills on panels are unmeasured; folded into the contrast row
310-keyboard-shortcuts.md | discarded | landed: KeyboardShortcuts ships over @gpuixui/keyboard
310-platform-edit-example-contract.md | queued | real gap: the copy-and-own platform example contract is unguarded; folded into the docs row
311-platform-recipe-styles.md | queued | real but large: Windows XP/Aero platform recipes are missing; TODO row added
311-timeline.md | discarded | landed: Timeline ships with tests
312-countdown.md | discarded | landed: Countdown ships with tests
312-row-text-on-washes.md | queued | real gap: row text on washes is unmeasured; folded into the contrast row
313-inline-edit.md | discarded | landed: InlineEdit ships with tests
313-ledger-role-count.md | queued | real gap: the ledger's second role count is unguarded; folded into the token-guards row
314-row-surface-text.md | queued | real gap: selected row/link text on fills is unmeasured; folded into the contrast row
314-tag-input.md | discarded | landed: TagInput ships with rule and native tests
315-canvas-input-text.md | queued | real gap: typed text on the canvas field is unmeasured; folded into the contrast row
315-carousel.md | discarded | landed: Carousel ships with tests
316-hotkey-recorder.md | discarded | landed: HotkeyRecorder ships over @gpuixui/keyboard
316-selected-label-accent-wash.md | queued | real gap: selected label on the accent wash is unmeasured; folded into the contrast row
317-placeholder-surfaces.md | queued | real gap: placeholder on each field surface is unmeasured; folded into the contrast row
317-preview-card.md | discarded | landed: PreviewCard ships with hover-intent tests
318-color-picker.md | discarded | landed: ColorPicker ships with hex and native tests
318-neutral-press-edge.md | queued | real gap: neutral control edge on hover/press is unmeasured; folded into the contrast row
319-input-text-surfaces.md | queued | real gap: input text on each surface is unmeasured; folded into the contrast row
319-mention-input.md | discarded | landed: MentionInput ships with rule and native tests
320-navigation-menu.md | discarded | landed: NavigationMenu ships with tests
320-soft-body-text.md | queued | real gap: body text on soft status fills is unmeasured; folded into the contrast row
321-tabs-vertical-orientation.md | discarded | landed: vertical Tabs verified (TODO plan 321)
321-total-theme-merges.md | queued | real gap: an explicit undefined erases instead of inheriting; folded into the token-guards row
322-skeleton-accent-wash.md | queued | real gap: skeleton on the accent hover wash is unmeasured; folded into the contrast row
322-toast-action.md | discarded | landed: Toast ships one provider-owned action
323-floating-placement.md | discarded | landed: centre alignment and near-edge flip fixed (components plan 323)
323-undefined-platform-colour.md | queued | real gap: an undefined platform colour overwrites a role; folded into the token-guards row
324-controlled-mode-per-render.md | discarded | landed: useControllableState decides per render
324-public-type-index.md | queued | real gap: no complete public type index on /docs/reference; folded into the docs row
324-tier2-icon-adoption.md | queued | real gap: Tier 2 has not adopted @gpuixui/icons uniformly; folded into the components row
325-invalid-field-edge.md | queued | real gap: the invalid field edge is unmeasured; folded into the contrast row
325-navigation-menu-hover.md | queued | real gap: NavigationMenu has no hover-open; folded into the components row
325-number-field-draft-sync.md | queued | real gap: a controlled NumberField ignores an external value change; folded into the primitives row
326-behaviour-teardown.md | queued | real gap: a failing behaviour test can poison the next; folded into the components row
326-contract-count-truth.md | queued | real gap: the contract's surface counts are unpinned; folded into the docs row
326-number-field-late-value.md | queued | real gap: NumberField drops a value supplied after mount; folded into the primitives row
327-accent-states.md | queued | real gap: the accent family has no hover/press roles; folded into the contrast row
327-basic-app-native-workflow.md | queued | real gap: basic-app's composed workflow is not run natively; folded into the playground probe row
327-behaviour-timing.md | queued | real gap: behaviour-suite timing is fragile under load; folded into the components row
328-combobox-create-new.md | queued | real gap: Combobox cannot create an option; folded into the components row
328-progress-tone-and-idle-timer.md | queued | real gap: Progress ignores tone while indeterminate and animates when idle; folded into the primitives row
328-recipe-windows-dark.md | queued | real gap: Windows recipes have no dark edition; folded into the platform-recipes row
329-command-menu-recents.md | queued | real gap: CommandMenu has no recents; folded into the components row
329-recipe-filled-states.md | queued | real gap: the filled-state matrix omits the shipped recipes; folded into the token-guards row
329-switch-thumb-motion.md | queued | real gap: the switch thumb does not slide; folded into the primitives row
330-authored-accent-family.md | queued | real gap: the authored platform example leaves an accent family unfinished; folded into the platform-recipes row
330-example-registry.md | queued | real gap: the docs example registry page is incomplete; folded into the docs row
330-skeleton-circle-default.md | discarded | landed: Skeleton circle defaults already keep the box square with no explicit dimension
330-tier2-in-playground.md | queued | real gap: shipped Tier 2 components are not mounted in the playground; folded into the playground probe row
331-authored-selection-wash.md | queued | real gap: the authored style leaves selection on the identity iris; folded into the platform-recipes row
331-caller-handler-composition.md | queued | real gap: caller handler composition is not uniform on interactive parts; folded into the primitives row
331-live-tier2.md | queued | real gap: no live Tier 2 window probe; folded into the playground probe row
331-slider-max-step.md | queued | real gap: Slider's maximum is unreachable when the step does not divide the span; folded into the primitives row
332-activation-contract.md | queued | real gap: no activation-once/Space-on-release contract across parts; folded into the primitives row
332-disabled-after-focus.md | queued | real gap: a control disabled while focused keeps acting and its ring; folded into the primitives row
332-mark-contrast.md | queued | real gap: a fill used as a mark is unmeasured; folded into the contrast row
332-shared-command-replay.md | discarded | landed: packages/testing/src/state.ts replays commands without a renderer
333-docs-test-counts.md | queued | real gap: stated native-test counts are unguarded; folded into the docs row
333-documented-theme-paths.md | queued | real gap: documented theme claims are not resolved by a guard; folded into the token-guards row
333-search-and-replace.md | queued | real gap: no search-and-replace probe; folded into the playground probe row
333-tokens-suite-timeout-budget.md | queued | real gap: the tokens suite has no time budget; folded into the token-guards row
334-activation-sweep.md | queued | real gap: remaining button-shaped parts do not activate Space on release; folded into the primitives row
334-rating-clear-focus.md | queued | real gap: Rating's clear paints its ring on a star that does not hold focus; folded into the Rating row
334-search-replace.md | queued | real gap: no wash/replace-cursor probe; folded into the playground probe row
334-secondary-wash-text.md | queued | real gap: secondary label on washes is unmeasured; folded into the contrast row
335-declared-styles-and-text-truncation.md | queued | real gap: declared interaction states and native text truncation are unguarded; folded into the components row
335-docs-verification-truth.md | queued | real gap: docs pages do not state their real native-test count; folded into the docs row
335-floating-horizontal-side-fit.md | queued | real gap: a requested horizontal side is clamped, not honoured; folded into the playground probe row
335-selected-row-edge.md | queued | real gap: the control edge on the selected row fill is unmeasured; folded into the contrast row
336-documented-subpath-exports.md | queued | real gap: no test loads every documented subpath; folded into the components row
336-floating-vertical-side-fit.md | queued | real gap: an explicit vertical side is not honoured as a preference; folded into the playground probe row
336-quoted-figure-guards.md | queued | real gap: the catalogue's tightest figures are unpinned; folded into the token-guards row
336-toast-frozen-exit.md | queued | real gap: the toast frozen-exit assertion is not deterministic; folded into the components row
337-component-api-truth.md | queued | real gap: documented parts do not have to equal exported parts; folded into the components row
337-native-field-reach.md | queued | real gap: the native field's hint and selection reach is unmeasured; folded into the primitives row
337-scroll-area-position.md | queued | real gap: ScrollArea reports deltas only, no position; folded into the ScrollArea row
337-tier2-toast-timer-exit.md | queued | real gap: the toast timer under a frozen motion clock is unproven; folded into the components row
338-data-grid-virtual.md | queued | real gap: no row-virtualization-under-horizontal-pan probe; folded into the Tier 3 row
338-filled-control-family.md | queued | real gap: the filled-control family has no single-call helper; folded into the token-guards row
338-number-field-caret-keys.md | queued | real gap: NumberField advertises caret keys it never receives; folded into the primitives row
338-package-surface-and-performance.md | queued | real gap: no package-surface truth or performance baseline; folded into the performance row
339-field-adornment-text.md | queued | real gap: field adornment text contrast is unmeasured; folded into the contrast row
339-list-row-subscriptions.md | queued | real gap: List repaints every row instead of the changed ones; folded into the components row
339-live-restore.md | queued | live playground gap; folded into the playground native-probe backlog row
339-number-field-enter-submit.md | queued | live primitives gap; folded into the primitives salvage backlog row
340-button-disabled-loading-tab-stop.md | queued | live primitives gap; folded into the primitives salvage backlog row
340-combobox-async-options.md | queued | live components gap; folded into the components salvage backlog row
340-invalid-control-ring.md | queued | live tokens gap; folded into the tokens salvage backlog row
340-live-table-sort.md | queued | live playground gap; folded into the playground native-probe backlog row
341-combobox-check-mark.md | queued | live tokens gap; folded into the tokens salvage backlog row
341-grid-layout-contract.md | queued | live playground gap; folded into the playground native-probe backlog row
341-overlay-trigger-handlers.md | queued | live primitives gap; folded into the primitives salvage backlog row
342-box-gradient-truth.md | queued | live primitives gap; folded into the primitives salvage backlog row
342-filled-state-steps.md | queued | live tokens gap; folded into the tokens salvage backlog row
342-typography-layout.md | queued | live playground gap; folded into the playground native-probe backlog row
343-field-pressed-edge.md | queued | live tokens gap; folded into the tokens salvage backlog row
343-pointer-text-entry.md | queued | live playground gap; folded into the playground native-probe backlog row
343-select-indicator.md | queued | live primitives gap; folded into the primitives salvage backlog row
344-button-group-focus-ring.md | queued | live primitives gap; folded into the primitives salvage backlog row
344-selection-on-fill.md | queued | live tokens gap; folded into the tokens salvage backlog row
344-tier2-foundation-navigation.md | queued | live playground gap; folded into the playground native-probe backlog row
345-contrast-platform-elevation.md | queued | live tokens gap; folded into the tokens salvage backlog row
345-live-key-routing.md | queued | live playground gap; folded into the playground native-probe backlog row
345-tier1-slot-triggers.md | queued | live primitives gap; folded into the primitives salvage backlog row
346-select-open-state.md | queued | live primitives gap; folded into the primitives salvage backlog row
346-soft-panel-text.md | queued | live tokens gap; folded into the tokens salvage backlog row
346-tier2-choice-and-forms.md | queued | live playground gap; folded into the playground native-probe backlog row
347-tier2-remaining-catalogue.md | queued | live playground gap; folded into the playground native-probe backlog row
347-tooltip-open-state.md | queued | live primitives gap; folded into the primitives salvage backlog row
347-value-track-role.md | queued | live tokens gap; folded into the tokens salvage backlog row
348-inspector-panel.md | queued | live playground gap; folded into the playground native-probe backlog row
348-runtime-dependency-manifests.md | queued | live primitives gap; folded into the primitives salvage backlog row
348-toast-tone-on-floating-card.md | queued | live tokens gap; folded into the tokens salvage backlog row
349-data-grid-columns.md | queued | live playground gap; folded into the playground native-probe backlog row
349-exported-values-tsdoc.md | queued | live primitives gap; folded into the primitives salvage backlog row
349-pair-uniqueness-and-role-count-guards.md | queued | live tokens gap; folded into the tokens salvage backlog row
350-app-chrome.md | queued | live playground gap; folded into the playground native-probe backlog row
350-runnable-examples.md | queued | live tokens gap; folded into the tokens salvage backlog row
350-two-provider-contract.md | queued | live primitives gap; folded into the primitives salvage backlog row
351-floor-table-pair-classes.md | queued | live tokens gap; folded into the tokens salvage backlog row
351-invalid-state-matrix.md | queued | live primitives gap; folded into the primitives salvage backlog row
352-boundary-row-surfaces.md | queued | live tokens gap; folded into the tokens salvage backlog row
352-tier1-theme-matrix.md | queued | live primitives gap; folded into the primitives salvage backlog row
353-component-dimensions.md | queued | live tokens gap; folded into the tokens salvage backlog row
353-radio-group-space-activation.md | queued | live primitives gap; folded into the primitives salvage backlog row
354-activation-contract-matrix.md | queued | live primitives gap; folded into the primitives salvage backlog row
354-interaction-state-table.md | queued | live tokens gap; folded into the tokens salvage backlog row
355-documented-snippets.md | queued | live tokens gap; folded into the tokens salvage backlog row
355-group-row-pointer-feedback.md | queued | live primitives gap; folded into the primitives salvage backlog row
356-invalid-selection-hover.md | queued | live primitives gap; folded into the primitives salvage backlog row
356-jsdoc-example-guard.md | queued | live tokens gap; folded into the tokens salvage backlog row
357-icon-caller-style.md | queued | live primitives gap; folded into the primitives salvage backlog row
357-wash-state-steps.md | queued | live tokens gap; folded into the tokens salvage backlog row
358-metric-contract.md | queued | live tokens gap; folded into the tokens salvage backlog row
358-otp-rejected-input.md | queued | live primitives gap; folded into the primitives salvage backlog row
359-modal-scrim-surfaces.md | queued | live tokens gap; folded into the tokens salvage backlog row
359-roving-cursor.md | queued | live components gap; folded into the components salvage backlog row
360-metric-completeness.md | queued | live tokens gap; folded into the tokens salvage backlog row
360-otp-complete-contract.md | queued | live primitives/components gap; folded into the components salvage backlog row
361-pill-rounds-largest-avatar.md | queued | live tokens gap; folded into the tokens salvage backlog row
361-pointer-feedback-matrix.md | queued | live primitives gap; folded into the primitives salvage backlog row
362-number-field-field-contract.md | queued | live primitives gap; folded into the primitives salvage backlog row
362-selection-status-panel-text.md | queued | live tokens gap; folded into the tokens salvage backlog row
363-select-empty-group-heading.md | queued | live primitives gap; folded into the primitives salvage backlog row
363-selection-card-foreground.md | queued | live tokens gap; folded into the tokens salvage backlog row
364-motion-contract.md | queued | live tokens gap; folded into the tokens salvage backlog row
364-separator-labelled-style-root.md | queued | live primitives gap; folded into the primitives salvage backlog row
365-carousel-hiding.md | queued | live components gap; folded into the components salvage backlog row
365-overlay-scroll-height.md | queued | live tokens gap; folded into the tokens salvage backlog row
365-text-align-end.md | queued | live primitives gap; folded into the primitives salvage backlog row
366-dismiss-stack-event-identity.md | queued | live components gap; folded into the components salvage backlog row
366-rating-non-finite-max.md | queued | live primitives gap; folded into the primitives salvage backlog row
366-status-selection.md | queued | live tokens gap; folded into the tokens salvage backlog row
367-checkbox-group-disabled-fade.md | queued | live primitives gap; folded into the primitives salvage backlog row
367-tabs-arrow-origin.md | queued | live components gap; folded into the components salvage backlog row
367-type-scale-contract.md | queued | live tokens gap; folded into the tokens salvage backlog row
368-control-label-containment.md | queued | live primitives gap; folded into the primitives salvage backlog row
368-date-picker-open-anchor.md | queued | live components gap; folded into the components salvage backlog row
368-finite-metrics.md | queued | live tokens gap; folded into the tokens salvage backlog row
369-button-group-width-sharing.md | queued | live primitives gap; folded into the primitives salvage backlog row
369-combobox-trigger-role.md | queued | live components gap; folded into the components salvage backlog row
369-defined-overlay-elevation.md | queued | live tokens gap; folded into the tokens salvage backlog row
370-font-weight-metric.md | queued | live tokens gap; folded into the tokens salvage backlog row
370-shadcn-conformance-primitives.md | queued | live primitives gap; folded into the primitives salvage backlog row
370-toast-status-per-card.md | queued | live components gap; folded into the components salvage backlog row
371-colour-role-format.md | queued | live tokens gap; folded into the tokens salvage backlog row
371-docs-example-pointer-truth.md | queued | live components gap; folded into the components salvage backlog row
371-nonsense-numbers.md | queued | live primitives gap; folded into the primitives salvage backlog row
372-collapsible-height-animation.md | queued | live components gap; folded into the components salvage backlog row
372-positive-named-sizes.md | queued | live tokens gap; folded into the tokens salvage backlog row
372-shadcn-field-family.md | queued | live primitives gap; folded into the primitives salvage backlog row
373-applied-default-palette.md | queued | live tokens gap; folded into the tokens salvage backlog row
373-list-plain-activation.md | queued | live components gap; folded into the components salvage backlog row
373-range-slider-noop-report.md | queued | live primitives gap; folded into the primitives salvage backlog row
374-carousel-indicators.md | queued | live components gap; folded into the components salvage backlog row
374-example-coverage.md | queued | live primitives gap; folded into the primitives salvage backlog row
374-platform-style-over-platform.md | queued | live tokens gap; folded into the tokens salvage backlog row
375-date-picker-labels.md | queued | live components gap; folded into the components salvage backlog row
375-icon-button-recipe-truth.md | queued | live primitives gap; folded into the primitives salvage backlog row
375-scrim-over-filled-actions.md | queued | live tokens gap; folded into the tokens salvage backlog row
376-design-system-elevation-truth.md | queued | live tokens gap; folded into the tokens salvage backlog row
376-grid-track-sizing.md | queued | live primitives gap; folded into the primitives salvage backlog row
376-multi-pane-editor.md | queued | live playground gap; folded into the playground native-probe backlog row
376-preview-and-nav-placement.md | queued | live components gap; folded into the components salvage backlog row
377-data-toolbar.md | queued | live playground gap; folded into the playground native-probe backlog row
377-design-system-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
377-text-decoration.md | queued | live primitives gap; folded into the primitives salvage backlog row
378-number-field-stepper-range.md | queued | live primitives gap; folded into the primitives salvage backlog row
378-query-builder.md | queued | live playground gap; folded into the playground native-probe backlog row
379-inline-edit-leave-field.md | queued | live components gap; folded into the components salvage backlog row
379-select-left-side-width.md | queued | live primitives gap; folded into the primitives salvage backlog row
380-components-run-from-source.md | queued | live components gap; folded into the components salvage backlog row
380-radio-group-horizontal-containment.md | queued | live primitives gap; folded into the primitives salvage backlog row
380-stored-theme-choice.md | queued | live tokens gap; folded into the tokens salvage backlog row
381-notification-centre.md | queued | live playground gap; folded into the playground native-probe backlog row
381-selected-row-step.md | queued | live primitives/components gap; folded into the components salvage backlog row
381-separator-cross-axis-stretch.md | queued | live primitives gap; folded into the primitives salvage backlog row
381-tag-chip-remove-name.md | queued | live components gap; folded into the components salvage backlog row
382-accent-fill-selection.md | queued | live primitives/components gap; folded into the components salvage backlog row
382-live-add-reveal-wait.md | queued | live playground gap; folded into the playground native-probe backlog row
382-spacer-main-axis.md | queued | live primitives gap; folded into the primitives salvage backlog row
382-submenu-placement.md | queued | live components gap; folded into the components salvage backlog row
383-component-page-api.md | queued | live components gap; folded into the components salvage backlog row
383-text-row-containment.md | queued | live primitives gap; folded into the primitives salvage backlog row
383-total-theme-check.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
384-column-configuration.md | queued | live playground gap; folded into the playground native-probe backlog row
384-content-box-fit.md | queued | live tokens gap; folded into the tokens salvage backlog row
384-form-field-errors.md | queued | live components gap; folded into the components salvage backlog row
384-skeleton-row-containment.md | queued | live primitives gap; folded into the primitives salvage backlog row
385-crop-area.md | queued | live playground gap; folded into the playground native-probe backlog row
385-text-selection-truth.md | queued | live primitives gap; folded into the primitives salvage backlog row
385-typeface-contract.md | queued | live tokens gap; folded into the tokens salvage backlog row
386-body-line-fit.md | queued | live tokens gap; folded into the tokens salvage backlog row
386-chrome-not-selectable.md | queued | live primitives gap; folded into the primitives salvage backlog row
386-collapsible-close-focus.md | queued | live components gap; folded into the components salvage backlog row
386-multi-step-form.md | queued | live playground gap; folded into the playground native-probe backlog row
387-editable-grid-cells.md | queued | live playground gap; folded into the playground native-probe backlog row
387-menu-radio-groups.md | queued | live components gap; folded into the components salvage backlog row
387-shipped-theme-enumeration.md | queued | live tokens gap; folded into the tokens salvage backlog row
387-stack-wrap-cross-axis.md | queued | live primitives gap; folded into the primitives salvage backlog row
388-autofocus-state.md | queued | live components gap; folded into the components salvage backlog row
388-examples-subpath.md | queued | live primitives gap; folded into the primitives salvage backlog row
388-file-upload.md | queued | live playground gap; folded into the playground native-probe backlog row
388-shipped-list-migration.md | queued | live primitives/components gap; folded into the components salvage backlog row
389-live-command-palette.md | queued | live playground gap; folded into the playground native-probe backlog row
389-nested-submenu-rows.md | queued | live components gap; folded into the components salvage backlog row
389-no-password-input.md | queued | live primitives gap; folded into the primitives salvage backlog row
389-platform-style-numeric-groups.md | queued | live tokens gap; folded into the tokens salvage backlog row
390-elevation-ladder.md | queued | live tokens gap; folded into the tokens salvage backlog row
390-live-focus-variance.md | queued | live playground gap; folded into the playground native-probe backlog row
390-multi-step-form.md | queued | live components gap; folded into the components salvage backlog row
390-select-option-locator.md | queued | live primitives gap; folded into the primitives salvage backlog row
391-contrast-reference.md | queued | live tokens gap; folded into the tokens salvage backlog row
391-control-accessible-names.md | queued | live components gap; folded into the components salvage backlog row
391-list-reorder.md | queued | live playground gap; folded into the playground native-probe backlog row
391-tooltip-long-content.md | queued | live primitives gap; folded into the primitives salvage backlog row
392-avatar-presence-description.md | queued | live components gap; folded into the components salvage backlog row
392-hierarchical-reorder.md | queued | live playground gap; folded into the playground native-probe backlog row
392-number-field-nonfinite-value.md | queued | live primitives gap; folded into the primitives salvage backlog row
392-text-hierarchy.md | queued | live tokens gap; folded into the tokens salvage backlog row
393-disabled-triggers.md | queued | live components gap; folded into the components salvage backlog row
393-loading-pulse.md | queued | live tokens gap; folded into the tokens salvage backlog row
393-tooltip-side-width-cap.md | queued | live primitives gap; folded into the primitives salvage backlog row
394-disabled-is-inert.md | queued | live components gap; folded into the components salvage backlog row
394-soft-status-panel-action.md | queued | live tokens gap; folded into the tokens salvage backlog row
394-toggle-group-keyboard-truth.md | queued | live primitives gap; folded into the primitives salvage backlog row
395-combobox-groups.md | queued | live components gap; folded into the components salvage backlog row
395-info-tip-wrap-truth.md | queued | live primitives gap; folded into the primitives salvage backlog row
395-scrim-over-panel-action.md | queued | live tokens gap; folded into the tokens salvage backlog row
396-blank-accessible-labels.md | queued | live primitives gap; folded into the primitives salvage backlog row
396-date-picker-adjacent-days.md | queued | live components gap; folded into the components salvage backlog row
396-type-index-claims.md | queued | live tokens gap; folded into the tokens salvage backlog row
397-form-revalidation.md | queued | live components gap; folded into the components salvage backlog row
397-scroll-area-default-axis.md | queued | live primitives gap; folded into the primitives salvage backlog row
397-status-panel-action-scope.md | queued | live tokens gap; folded into the tokens salvage backlog row
398-combobox-dismiss-stack.md | queued | live components gap; folded into the components salvage backlog row
398-theme-check-index.md | queued | live tokens gap; folded into the tokens salvage backlog row
398-tooltip-not-selectable.md | queued | live primitives gap; folded into the primitives salvage backlog row
399-blank-icon-label.md | queued | live primitives gap; folded into the primitives salvage backlog row
399-mention-input-escape-claim.md | queued | live components gap; folded into the components salvage backlog row
399-solid-status-fill.md | queued | live tokens gap; folded into the tokens salvage backlog row
399b-scroll-area-slot-trigger.md | queued | live primitives gap; folded into the primitives salvage backlog row
410-docs-site.md | discarded | the docs site, page template, preview strategy, metadata and platform toggle already ship
411-component-page-template.md | discarded | the docs site, page template, preview strategy, metadata and platform toggle already ship
412-preview-strategy.md | discarded | the docs site, page template, preview strategy, metadata and platform toggle already ship
413-docs-page-metadata.md | discarded | the docs site, page template, preview strategy, metadata and platform toggle already ship
414-copyable-component-source.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
415-api-type-table.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
416-docs-identity-from-tokens.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
417-component-index-filter.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
418-absolute-urls-and-sitemap.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
419-search-component-registry.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
420-docs-platform-toggle.md | discarded | the docs site, page template, preview strategy, metadata and platform toggle already ship
421-component-search-deep-link.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
422-first-real-component-page.md | discarded | the docs site, page template, preview strategy, metadata and platform toggle already ship
423-tier1-component-pages.md | discarded | the docs site, page template, preview strategy, metadata and platform toggle already ship
424-docs-truth-pass.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
425-tier2-component-pages.md | discarded | the docs site, page template, preview strategy, metadata and platform toggle already ship
426-prose-truth-and-examples.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
427-phase-d-docs-and-patterns.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
428-component-page-dependencies.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
429-inventory-status-is-registry-status.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
430-theming-token-scales.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
431-search-relevance.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
432-native-coverage-preview.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
433-platform-theme-recipes.md | discarded | duplicate: .agents/slop/plans/433-platform-theme-recipes.md is the active copy
433-theming-native-captures.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
434-landing-page.md | discarded | duplicate: .agents/slop/plans/434-landing-page.md is the active copy
434-platform-styled-previews.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
435-pele-fumadocs-editor-rtl.md | discarded | duplicate: .agents/slop/plans/435-pele-fumadocs-editor-rtl.md is the active copy
435-tier1-value-and-choice-pages.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
436-blocks-and-theme-editor.md | queued | live tokens gap; folded into the tokens salvage backlog row
436-prose-truth-playground.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
437-embedded-apis-and-foreign-surfaces.md | discarded | duplicate: .agents/slop/plans/437-embedded-apis-and-foreign-surfaces.md is the active copy
437-tiered-component-sidebar.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
438-internal-link-integrity.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
438-keyboard-ota-and-runtime-gaps.md | discarded | duplicate: .agents/slop/plans/438-keyboard-ota-and-runtime-gaps.md is the active copy
439-built-site-smoke.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
439-motion-and-ely-components.md | discarded | duplicate: .agents/slop/plans/439-motion-and-ely-components.md is the active copy
440-landing-showcase.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
441-api-reference-index.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
442-props-type-search.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
443-gpuix-support-column.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
444-preview-dark-mode.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
445-preview-platform-snapshot.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
446-browser-smoke.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
447-tokens-api-reference.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
448-capability-evidence-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
449-tier-a-preview-coverage.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
450-preview-count-truth.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
451-tier1-static-previews.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
452-tier2-static-previews.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
453-layout-static-previews.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
454-component-index-finds-limitations.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
455-live-wasm-preview.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
456-live-interaction-scenes.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
457-live-scene-coverage.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
458-live-scene-finish.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
459-architecture-page-truth.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
460-stop-denying-live-surface.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
461-tier2-expansion-pages.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
462-first-compound-records.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
463-tier2-page-truth.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
464-preview-strategy-gap-truth.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
465-record-limitation-truth.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
466-page-content-blocks.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
467-fumadocs-editor-authoring.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
468-search-suite-cold-budget.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
469-test-checker-regex-false-positive.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
470-contributing-page-checks.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
471-live-scene-command-menu-parts.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
472-scene-painted-text.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
473-page-surface-sized-canvas.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
474-live-surface-light-mode.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
475-scene-surface-sized-canvas.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
476-drawer-navigation-live-scenes.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
477-mention-input-live-scene.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
478-preview-card-live-scene.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
479-compound-parts-api.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
480-state-ownership.md | queued | live components gap; folded into the components salvage backlog row
481-part-name-search.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
482-component-api-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
483-live-surface-chrome-truth.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
484-toast-live-scene.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
485-patterns-index-truth.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
486-gesture-live-scenes.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
487-component-page-template-docs.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
488-extending-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
489-license-page-truth.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
490-public-value-api-index.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
491-native-testing-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
492-choice-control-live-scenes.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
493-form-control-live-scenes.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
494-preview-count-guard.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
495-preview-hydration-every-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
496-docs-keyboard-navigation.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
497-remaining-value-live-scenes.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
498-code-contrast.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
499-heading-outline.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
500-exported-symbol-search.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
500-option-description-a11y.md | queued | live primitives gap; folded into the primitives salvage backlog row
500-text-hierarchy-surface-body-roles.md | queued | live tokens gap; folded into the tokens salvage backlog row
501-floor-table-scrim-row.md | queued | live tokens gap; folded into the tokens salvage backlog row
501-fragment-anchor-integrity.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
501-select-empty-value.md | queued | live primitives gap; folded into the primitives salvage backlog row
502-interaction-direction.md | queued | live tokens gap; folded into the tokens salvage backlog row
502-responsive-smoke.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
502-selection-empty-value.md | queued | live primitives gap; folded into the primitives salvage backlog row
503-getting-started-providers.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
503-track-row-washes.md | queued | live tokens gap; folded into the tokens salvage backlog row
504-solid-status-chip-selection.md | queued | live tokens gap; folded into the tokens salvage backlog row
504-token-search.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
505-capability-search.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
505-elevation-tint-aaa-dark.md | queued | live tokens gap; folded into the tokens salvage backlog row
506-search-palette-smoke.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
506-selected-row-title-selection.md | queued | live tokens gap; folded into the tokens salvage backlog row
507-dialog-face-on-scrim.md | queued | live tokens gap; folded into the tokens salvage backlog row
507-icon-catalogue.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
508-solid-chip-on-scrim.md | queued | live tokens gap; folded into the tokens salvage backlog row
508-stateful-live-scenes.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
509-elevation-persistent-surfaces.md | queued | live tokens gap; folded into the tokens salvage backlog row
509-platform-toggle-interaction.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
510-brand-and-document-head.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
510-inactive-label-selection-wash.md | queued | live primitives/components gap; folded into the components salvage backlog row
510-list-dynamic-rows.md | queued | live components gap; folded into the components salvage backlog row
511-native-field-caret.md | queued | live primitives gap; folded into the primitives salvage backlog row
511-tabs-disabled-focus.md | queued | live components gap; folded into the components salvage backlog row
511-theme-toggle-smoke.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
512-docs-accessibility-smoke.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
512-panel-action-selection.md | queued | live tokens gap; folded into the tokens salvage backlog row
513-message-scroller-live-scene.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
513-pagination-single-gap.md | queued | live components gap; folded into the components salvage backlog row
513-selection-veil-pointer-states.md | queued | live tokens gap; folded into the tokens salvage backlog row
514-dark-mode-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
514-disabled-panel-action.md | queued | live tokens gap; folded into the tokens salvage backlog row
514-escape-claims-in-fields.md | queued | live components gap; folded into the components salvage backlog row
515-preview-card-focus-reopen.md | queued | live components gap; folded into the components salvage backlog row
515-preview-strategy-scene-list.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
516-disabled-description.md | queued | live components gap; folded into the components salvage backlog row
516-install-metadata.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
516-ring-on-value-groove.md | queued | live tokens gap; folded into the tokens salvage backlog row
517-controllable-noop-change.md | queued | live components gap; folded into the components salvage backlog row
517-focused-live-smoke.md | queued | live playground gap; folded into the playground native-probe backlog row
517-keycap-surface-metric.md | queued | live tokens gap; folded into the tokens salvage backlog row
517-live-scene-authoring.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
518-inventory-roadmap-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
518-qr-code-rendering.md | queued | live playground gap; folded into the playground native-probe backlog row
518-shipped-weight-claims.md | queued | live tokens gap; folded into the tokens salvage backlog row
519-application-menu-bar.md | queued | live playground gap; folded into the playground native-probe backlog row
519-motion-scale-indexes.md | queued | live tokens gap; folded into the tokens salvage backlog row
519-responsive-controls.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
520-disabled-panel-action-selection.md | queued | live tokens gap; folded into the tokens salvage backlog row
520-media-surface.md | queued | live playground gap; folded into the playground native-probe backlog row
520-typography-blocker-truth.md | queued | live tokens gap; folded into the tokens salvage backlog row
521-confirmation-flow-pattern.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
521-inline-icon-line-fit.md | queued | live tokens gap; folded into the tokens salvage backlog row
521-popover-tab-cycle.md | queued | live components gap; folded into the components salvage backlog row
522-command-palette-pattern.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
522-inline-avatar-row-fit.md | queued | live tokens gap; folded into the tokens salvage backlog row
522-root-single-child.md | queued | live playground gap; folded into the playground native-probe backlog row
522-visible-focus-ring.md | queued | live components gap; folded into the components salvage backlog row
523-control-horizontal-padding.md | queued | live tokens gap; folded into the tokens salvage backlog row
523-overlay-field-rings.md | queued | live components gap; folded into the components salvage backlog row
523-preview-totals-derived.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
524-disabled-selection-wash.md | queued | live tokens gap; folded into the tokens salvage backlog row
524-docs-source-completeness.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
524-shadcn-tailwind-conformance.md | discarded | duplicate: .agents/slop/plans/524-shadcn-tailwind-conformance.md is the active copy
525-gpui-transform.md | discarded | duplicate: .agents/slop/plans/525-gpui-transform.md is the active copy
525-input-payload-contract.md | queued | live playground gap; folded into the playground native-probe backlog row
525-llms-discovery.md | queued | live components gap; folded into the components salvage backlog row
525-motion-slice.md | queued | live components gap; folded into the components salvage backlog row
525-row-text-selection.md | queued | live tokens gap; folded into the tokens salvage backlog row
526-dialog-face-on-content.md | queued | live tokens gap; folded into the tokens salvage backlog row
526-drawer-motion.md | queued | live components gap; folded into the components salvage backlog row
526-window-layout.md | queued | live playground gap; folded into the playground native-probe backlog row
527-disabled-field-focus.md | queued | live components gap; folded into the components salvage backlog row
527-field-text-row-washes.md | queued | live tokens gap; folded into the tokens salvage backlog row
527-paint-frame-counters.md | queued | live playground gap; folded into the playground native-probe backlog row
528-link-through-text-selection.md | queued | live tokens gap; folded into the tokens salvage backlog row
528-playground-scenario-filter.md | queued | live playground gap; folded into the playground native-probe backlog row
528-theme-matrix-completion.md | queued | live components gap; folded into the components salvage backlog row
529-behaviour-settle.md | queued | live components gap; folded into the components salvage backlog row
529-native-binding-provenance.md | queued | live playground gap; folded into the playground native-probe backlog row
529-shareable-theme-choice.md | queued | live tokens gap; folded into the tokens salvage backlog row
530-command-menu-scroll.md | queued | live components gap; folded into the components salvage backlog row
530-drawer-chat-carousel-dimensions.md | queued | live tokens gap; folded into the tokens salvage backlog row
530-gpuix-zindex.md | queued | live components gap; folded into the components salvage backlog row
531-gpuix-binding-gaps.md | queued | live playground gap; folded into the playground native-probe backlog row
531-headless-cli-guard.md | queued | live playground gap; folded into the playground native-probe backlog row
531-metric-member-completeness.md | queued | live tokens gap; folded into the tokens salvage backlog row
532-live-terminal.md | queued | live playground gap; folded into the playground native-probe backlog row
532-non-finite-diagnostics.md | queued | live components gap; folded into the components salvage backlog row
533-input-payload-contract.md | queued | live playground gap; folded into the playground native-probe backlog row
533-typeface-exact-family.md | queued | live tokens gap; folded into the tokens salvage backlog row
534-live-variable-rows.md | queued | live playground gap; folded into the playground native-probe backlog row
534-platform-density-metrics.md | queued | live tokens gap; folded into the tokens salvage backlog row
535-combobox-scroll.md | queued | live components gap; folded into the components salvage backlog row
535-live-pointer-entry.md | queued | live playground gap; folded into the playground native-probe backlog row
535-platform-table-and-figures.md | queued | live primitives/components gap; folded into the components salvage backlog row
536-binding-measurement-truth.md | queued | live components gap; folded into the components salvage backlog row
536-live-pointer-gesture.md | queued | live playground gap; folded into the playground native-probe backlog row
536-present-tense-figures.md | queued | live components gap; folded into the components salvage backlog row
537-gpui-ce.md | discarded | duplicate: .agents/slop/plans/537-gpui-ce.md is the active copy
537-tier-figures.md | queued | live components gap; folded into the components salvage backlog row
538-tier-surface-counts.md | queued | live components gap; folded into the components salvage backlog row
538-transform-build-fork-source.md | discarded | duplicate: .agents/slop/plans/538-transform-build-fork-source.md is the active copy
539-disabled-dim-figure.md | queued | live tokens gap; folded into the tokens salvage backlog row
539-submenu-hover.md | queued | live components gap; folded into the components salvage backlog row
540-colour-role-opacity-form.md | queued | live tokens gap; folded into the tokens salvage backlog row
540-getelementbounds-conventions.md | queued | live components gap; folded into the components salvage backlog row
541-applied-level-palette-name-elevation.md | queued | live tokens gap; folded into the tokens salvage backlog row
541-combobox-debounce.md | queued | live components gap; folded into the components salvage backlog row
542-shareable-choice-density-rule.md | queued | live tokens gap; folded into the tokens salvage backlog row
543-contrast-floor-class-index.md | queued | live tokens gap; folded into the tokens salvage backlog row
544-quoted-figure-extent.md | queued | live tokens gap; folded into the tokens salvage backlog row
545-applied-style-name-idempotence.md | queued | live tokens gap; folded into the tokens salvage backlog row
546-date-picker-month-chooser.md | queued | live components gap; folded into the components salvage backlog row
546-pair-list-uniqueness-owner.md | queued | live tokens gap; folded into the tokens salvage backlog row
547-breadcrumb-composition.md | queued | live components gap; folded into the components salvage backlog row
547-interactive-fill-family-index.md | queued | live tokens gap; folded into the tokens salvage backlog row
548-soft-status-tone-index.md | queued | live tokens gap; folded into the tokens salvage backlog row
548-toast-placement.md | queued | live components gap; folded into the components salvage backlog row
549-status-text-tone-index.md | queued | live tokens gap; folded into the tokens salvage backlog row
550-border-width-ladder.md | queued | live tokens gap; folded into the tokens salvage backlog row
551-undefined-platform-colour-palette.md | queued | live tokens gap; folded into the tokens salvage backlog row
552-invalid-field-focus-ring.md | queued | live components gap; folded into the components salvage backlog row
552-scale-ladder-totality.md | queued | live tokens gap; folded into the tokens salvage backlog row
553-documented-brand-and-builder-examples.md | queued | live tokens gap; folded into the tokens salvage backlog row
554-leaving-a-field-finishes-the-edit.md | queued | live components gap; folded into the components salvage backlog row
554-live-popups.md | queued | live playground gap; folded into the playground native-probe backlog row
554-surface-metric-sign.md | queued | live tokens gap; folded into the tokens salvage backlog row
555-border-rationale-and-duplicate-claim.md | queued | live tokens gap; folded into the tokens salvage backlog row
555-inline-edit-blur.md | queued | live playground gap; folded into the playground native-probe backlog row
556-dialog-calendar-and-mark-dimensions.md | queued | live tokens gap; folded into the tokens salvage backlog row
556-live-grid-wide-table.md | queued | live playground gap; folded into the playground native-probe backlog row
557-dropdown-space-open.md | queued | live components gap; folded into the components salvage backlog row
557-live-states-and-truncation.md | queued | live playground gap; folded into the playground native-probe backlog row
557-native-field-caret-mark.md | queued | live tokens gap; folded into the tokens salvage backlog row
558-live-nested-layers.md | queued | live playground gap; folded into the playground native-probe backlog row
558-opaque-alpha-suffix.md | queued | live tokens gap; folded into the tokens salvage backlog row
559-accordion-refused-toggle.md | queued | live components gap; folded into the components salvage backlog row
559-live-virtual-tree.md | queued | live playground gap; folded into the playground native-probe backlog row
559-platform-easing.md | queued | live tokens gap; folded into the tokens salvage backlog row
560-showcase-surface.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
561-search-multiword-names.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
561-tag-input-paste.md | queued | live components gap; folded into the components salvage backlog row
562-console-error-smoke.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
562-tag-input-noop-report.md | queued | live components gap; folded into the components salvage backlog row
563-caret-mark-list.md | queued | live tokens gap; folded into the tokens salvage backlog row
563-search-index-and-phone.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
564-playground-capture-provenance.md | queued | live playground gap; folded into the playground native-probe backlog row
564-quoted-family-name.md | queued | live tokens gap; folded into the tokens salvage backlog row
564-search-name-variants.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
564-tabs-panel-name.md | queued | live components gap; folded into the components salvage backlog row
565-accessibility-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
565-colour-form-index.md | queued | live tokens gap; folded into the tokens salvage backlog row
565-combobox-trigger-surface.md | queued | live components gap; folded into the components salvage backlog row
565-live-tab-strip.md | queued | live playground gap; folded into the playground native-probe backlog row
566-overlay-feather-ladder.md | queued | live tokens gap; folded into the tokens salvage backlog row
566-search-vocabulary.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
566-tabs-orphan-panel.md | queued | live components gap; folded into the components salvage backlog row
567-color-picker-inline-edit-live-scenes.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
567-contract-prose-counts.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
568-notification-centre.md | queued | live components gap; folded into the components salvage backlog row
568-search-page-description.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
568-theme-extreme-bounds.md | queued | live tokens gap; folded into the tokens salvage backlog row
569-native-text-theme.md | queued | live tokens gap; folded into the tokens salvage backlog row
569-search-promoted-name-candidate.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
570-component-index-live-filter.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
570-live-tier1-primitives.md | queued | live playground gap; folded into the playground native-probe backlog row
571-avatar-image-fallback.md | queued | live components gap; folded into the components salvage backlog row
571-live-log-viewer.md | queued | live playground gap; folded into the playground native-probe backlog row
571-preview-guide-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
572-form-live-scene.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
572-message-scroller-affordance.md | queued | live components gap; folded into the components salvage backlog row
572-native-text-metric-scale.md | queued | live tokens gap; folded into the tokens salvage backlog row
573-blank-tip-and-name.md | queued | live primitives gap; folded into the primitives salvage backlog row
573-form-valid-submit.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
573-native-find-highlight.md | queued | live tokens gap; folded into the tokens salvage backlog row
574-late-value-matrix.md | queued | live primitives gap; folded into the primitives salvage backlog row
574-native-syntax-document-surfaces.md | queued | live tokens gap; folded into the tokens salvage backlog row
574-page-subject-summaries.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
575-live-workspace-panes.md | queued | live playground gap; folded into the playground native-probe backlog row
575-project-browser-pattern.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
576-notification-centre-key-ownership.md | queued | live components gap; folded into the components salvage backlog row
576-platform-difference-table.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
577-blank-caption.md | queued | live primitives gap; folded into the primitives salvage backlog row
577-copyable-imports.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
577-list-row-control-keys.md | queued | live components gap; folded into the components salvage backlog row
577-live-content-surfaces.md | queued | live playground gap; folded into the playground native-probe backlog row
578-blank-select-all.md | queued | live primitives gap; folded into the primitives salvage backlog row
578-list-native-focus-origin.md | queued | live components gap; folded into the components salvage backlog row
578-preview-scene-index.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
579-reader-vocabulary-second-pass.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
579-select-blank-group-heading.md | queued | live primitives gap; folded into the primitives salvage backlog row
580-blank-value-text.md | queued | live primitives gap; folded into the primitives salvage backlog row
580-live-drag.md | queued | live playground gap; folded into the playground native-probe backlog row
580-part-name-ranking.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
581-api-table-resolution.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
581-label-required-marker.md | queued | live primitives gap; folded into the primitives salvage backlog row
581-native-highlight-step.md | queued | live tokens gap; folded into the tokens salvage backlog row
581-tier2-scroller-and-command.md | queued | live playground gap; folded into the playground native-probe backlog row
582-live-scene-search.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
582-message-scroller-visible-box.md | queued | live components gap; folded into the components salvage backlog row
582-native-highlight-code-surface.md | queued | live tokens gap; folded into the tokens salvage backlog row
583-native-text-fades.md | queued | live tokens gap; folded into the tokens salvage backlog row
583-overlay-trigger-press.md | queued | live components gap; folded into the components salvage backlog row
583-reader-vocabulary-third-pass.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
583-release-runtime-focus.md | queued | live primitives gap; folded into the primitives salvage backlog row
584-auto-focus-later-mount.md | queued | live primitives gap; folded into the primitives salvage backlog row
584-elevation-on-content.md | queued | live tokens gap; folded into the tokens salvage backlog row
584-install-prerequisites-and-native-targets.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
585-field-resting-elevation.md | queued | live primitives gap; folded into the primitives salvage backlog row
585-native-text-runtime-metrics.md | queued | live tokens gap; folded into the tokens salvage backlog row
585-search-inflection-and-roadmap-vocabulary.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
586-blank-description.md | queued | live primitives gap; folded into the primitives salvage backlog row
586-high-contrast-token-catalogue.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
586-image-source-contract.md | queued | live playground gap; folded into the playground native-probe backlog row
587-event-claim-task-lifetime.md | queued | live components gap; folded into the components salvage backlog row
587-live-search-replace.md | queued | live playground gap; folded into the playground native-probe backlog row
587-shared-host-props.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
587-text-shrink-grid-max-content.md | queued | live primitives gap; folded into the primitives salvage backlog row
588-native-chrome-washes.md | queued | live tokens gap; folded into the tokens salvage backlog row
588-reader-vocabulary-fourth-pass.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
588-verification-counts.md | queued | live primitives gap; folded into the primitives salvage backlog row
589-blank-option-label.md | queued | live primitives gap; folded into the primitives salvage backlog row
589-command-menu-close-focus.md | queued | live components gap; folded into the components salvage backlog row
589-native-code-block-edge.md | queued | live tokens gap; folded into the tokens salvage backlog row
589-overlay-layering.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
590-inline-code-accent-wash.md | queued | live tokens gap; folded into the tokens salvage backlog row
590-native-focus-tracker.md | queued | live primitives gap; folded into the primitives salvage backlog row
590-reader-vocabulary-fifth-pass.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
591-live-layout-typography.md | queued | live playground gap; folded into the playground native-probe backlog row
591-native-diff-row-tint.md | queued | live tokens gap; folded into the tokens salvage backlog row
591-reader-vocabulary-sixth-pass.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
591-tracked-focus-lifetime.md | queued | live components gap; folded into the components salvage backlog row
592-live-collapsible-height.md | queued | live playground gap; folded into the playground native-probe backlog row
592-native-diff-chrome-type.md | queued | live tokens gap; folded into the tokens salvage backlog row
592-reader-vocabulary-seventh-pass.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
592-toast-progress.md | queued | live components gap; folded into the components salvage backlog row
592-tracker-in-runtime-suites.md | queued | live components gap; folded into the components salvage backlog row
593-live-chart.md | queued | live playground gap; folded into the playground native-probe backlog row
593-number-field-blank-formatter.md | queued | live primitives/components gap; folded into the components salvage backlog row
593-reader-vocabulary-eighth-pass.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
594-docs-site-output-and-title-fragments.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
594-harness-unmount.md | queued | live components gap; folded into the components salvage backlog row
594-live-panels-and-floating.md | queued | live playground gap; folded into the playground native-probe backlog row
595-chat-composer-focus-ring.md | queued | live components gap; folded into the components salvage backlog row
595-field-control-fill.md | queued | live tokens gap; folded into the tokens salvage backlog row
595-info-tip-keyboard-open.md | queued | live components gap; folded into the components salvage backlog row
595-theme-editor.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
596-control-glyph-fit.md | queued | live tokens gap; folded into the tokens salvage backlog row
596-page-actions.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
596-tooltip-trigger-ref.md | queued | live primitives/components gap; folded into the components salvage backlog row
597-animated-surface-identity.md | queued | live components gap; folded into the components salvage backlog row
597-published-box-model.md | queued | live primitives/components gap; folded into the components salvage backlog row
597-site-output-vocabulary.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
598-notification-panel-dimensions.md | queued | live tokens gap; folded into the tokens salvage backlog row
598-page-alias-vocabulary.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
598-scroller-report-offset.md | queued | live primitives/components gap; folded into the components salvage backlog row
599-live-qr.md | queued | live playground gap; folded into the playground native-probe backlog row
599-reader-integration-vocabulary.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
599-select-scroll-into-view.md | queued | live primitives/components gap; folded into the components salvage backlog row
600-live-blur-entry.md | queued | live playground gap; folded into the playground native-probe backlog row
600-motion.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
600-toggle-group-tab-stop-after-click.md | queued | live primitives/components gap; folded into the components salvage backlog row
601-date-field-width.md | queued | live tokens gap; folded into the tokens salvage backlog row
601-keyboard-conventions.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
601-live-scroll-into-view.md | queued | live playground gap; folded into the playground native-probe backlog row
601-roving-focus-outlives-focus.md | queued | live playground gap; folded into the playground native-probe backlog row
602-architecture-runtime-truth.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
602-diagnostic-order-truth.md | queued | live tokens gap; folded into the tokens salvage backlog row
602-overlay-open-state.md | queued | live components gap; folded into the components salvage backlog row
602-range-thumb-focus-loss.md | queued | live components gap; folded into the components salvage backlog row
603-focus-lifetime-matrix.md | queued | live components gap; folded into the components salvage backlog row
603-live-onfocus-variance.md | queued | live playground gap; folded into the playground native-probe backlog row
603-toast-countdown-groove.md | queued | live tokens gap; folded into the tokens salvage backlog row
603-troubleshooting-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
604-drop-unused-lucide-icons.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
604-floating-window-resize.md | queued | live components gap; folded into the components salvage backlog row
604-timeline-marker-metrics.md | queued | live tokens gap; folded into the tokens salvage backlog row
605-disabled-control-helper.md | queued | live tokens gap; folded into the tokens salvage backlog row
605-live-blur-state.md | queued | live playground gap; folded into the playground native-probe backlog row
605-performance-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
605-tooltip-click-dismiss.md | queued | live primitives/components gap; folded into the components salvage backlog row
606-list-hover-child-control.md | queued | live components gap; folded into the components salvage backlog row
606-live-data-grid.md | queued | live playground gap; folded into the playground native-probe backlog row
606-scroll-area-focus-reveal.md | queued | live primitives/components gap; folded into the components salvage backlog row
606-styling-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
607-box-shrink-content-floor.md | queued | live primitives/components gap; folded into the components salvage backlog row
607-highlight-radius.md | queued | live tokens gap; folded into the tokens salvage backlog row
607-live-data-grid-anchor-sync.md | queued | live playground gap; folded into the playground native-probe backlog row
607-reader-vocabulary-ninth-pass.md | queued | live components gap; folded into the components salvage backlog row
608-composed-app-docs-truth.md | queued | live primitives gap; folded into the primitives salvage backlog row
608-focus-signal-docs-truth.md | queued | live components gap; folded into the components salvage backlog row
608-reader-vocabulary-tenth-pass.md | queued | live components gap; folded into the components salvage backlog row
609-deployment-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
609-inset-focus-ring.md | queued | live tokens gap; folded into the tokens salvage backlog row
609-select-idle-window-poll.md | queued | live primitives gap; folded into the primitives salvage backlog row
610-scrim-over-resting-fills.md | queued | live tokens gap; folded into the tokens salvage backlog row
610-scroll-area-tooltip-focus.md | queued | live primitives gap; folded into the primitives salvage backlog row
610-site-search-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
611-content-ring.md | queued | live tokens gap; folded into the tokens salvage backlog row
611-pagination-page-normalisation.md | queued | live components gap; folded into the components salvage backlog row
611-porting-from-shadcn.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
612-authoring-framework-vocabulary.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
612-disabled-date-picker-inert.md | queued | live components gap; folded into the components salvage backlog row
613-examples-compile.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
613-inline-edit-focus-loss.md | queued | live components gap; folded into the components salvage backlog row
613-ring-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
614-carousel-key-ownership.md | queued | live components gap; folded into the components salvage backlog row
614-design-system-data-grid-failure-vocabulary.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
615-app-shell-pattern.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
615-selection-change-signal.md | queued | live playground gap; folded into the playground native-probe backlog row
616-docs-source-links.md | queued | live tokens gap; folded into the tokens salvage backlog row
616-preview-strategy-open-claim.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
617-heading-levels.md | queued | live components gap; folded into the components salvage backlog row
617-ledger-check-counts.md | queued | live components gap; folded into the components salvage backlog row
617-license-question.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
618-applied-default-elevation.md | queued | live tokens gap; folded into the tokens salvage backlog row
618-reader-questions-and-frame-vocabulary.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
619-carousel-index-normalisation.md | queued | live components gap; folded into the components salvage backlog row
619-security-and-privacy.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
619-selection-row-press.md | queued | live tokens gap; folded into the tokens salvage backlog row
620-fixed-surface-chrome.md | queued | live tokens gap; folded into the tokens salvage backlog row
620-live-scale-cost.md | queued | live playground gap; folded into the playground native-probe backlog row
620-operational-vocabulary.md | queued | live components gap; folded into the components salvage backlog row
620-registry-row-position.md | queued | live components gap; folded into the components salvage backlog row
621-pointer-and-touch-input.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
621-time-segment-two-digits.md | queued | live tokens gap; folded into the tokens salvage backlog row
622-part-state-contract.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
622-row-press-direction.md | queued | live tokens gap; folded into the tokens salvage backlog row
623-live-toast.md | queued | live playground gap; folded into the playground native-probe backlog row
623-part-state-table.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
623-selected-label-tier.md | queued | live primitives/components gap; folded into the components salvage backlog row
624-avatar-picture-semantics.md | queued | live components gap; folded into the components salvage backlog row
624-field-query-and-action.md | queued | live tokens gap; folded into the tokens salvage backlog row
624-live-text-entry.md | queued | live playground gap; folded into the playground native-probe backlog row
624-refs-and-element-handles.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
625-application-window-page.md | queued | live runtime gap; folded into the runtime salvage backlog row
625-dialog-drawer-shell-chrome.md | queued | live tokens gap; folded into the tokens salvage backlog row
625-readable-marks.md | queued | live components gap; folded into the components salvage backlog row
626-native-elements.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
626-status-list-description.md | queued | live components gap; folded into the components salvage backlog row
627-modal-description.md | queued | live components gap; folded into the components salvage backlog row
627-selection-and-find.md | queued | live runtime gap; folded into the runtime salvage backlog row
627-surface-border-fit.md | queued | live tokens gap; folded into the tokens salvage backlog row
628-disabled-color-field-tab-order.md | queued | live components gap; folded into the components salvage backlog row
628-testing-your-components.md | queued | live components gap; folded into the components salvage backlog row
629-native-text-theme.md | queued | live runtime gap; folded into the runtime salvage backlog row
629-notification-inbox-header.md | queued | live tokens gap; folded into the tokens salvage backlog row
630-function-words-and-question-forms.md | queued | live primitives/components gap; folded into the components salvage backlog row
630-keyboard-shortcuts-heading-level.md | queued | live components gap; folded into the components salvage backlog row
631-display-scale.md | queued | live tokens gap; folded into the tokens salvage backlog row
631-toast-dismiss-control.md | queued | live tokens gap; folded into the tokens salvage backlog row
632-async-data-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
632-date-disclosure-icon.md | queued | live tokens gap; folded into the tokens salvage backlog row
633-auto-update.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
633-tabs-vertical-consumer-path.md | queued | live playground gap; folded into the playground native-probe backlog row
634-automation-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
634-field-query-leading-icon.md | queued | live tokens gap; folded into the tokens salvage backlog row
635-events-page.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
635-select-announced-value.md | queued | live primitives/components gap; folded into the components salvage backlog row
636-nested-scroll-reveal.md | queued | live primitives/components gap; folded into the components salvage backlog row
636-overlay-placement.md | queued | live components gap; folded into the components salvage backlog row
636-toast-tone-bar-token.md | queued | live tokens gap; folded into the tokens salvage backlog row
637-frame-loop.md | queued | live runtime gap; folded into the runtime salvage backlog row
637-infinity-value-clamp.md | queued | live primitives gap; folded into the primitives salvage backlog row
637-live-roving-focus.md | queued | live playground gap; folded into the playground native-probe backlog row
637-panel-action-figures.md | queued | live components gap; folded into the components salvage backlog row
638-field-adornment-glyph-fit.md | queued | live tokens gap; folded into the tokens salvage backlog row
638-modal-opener-auto-focus.md | queued | live components gap; folded into the components salvage backlog row
638-shipping-a-desktop-app.md | queued | live components gap; folded into the components salvage backlog row
638-unlabelled-scroll-area-trigger.md | queued | live primitives gap; folded into the primitives salvage backlog row
639-final-merge-gate.md | queued | live playground gap; folded into the playground native-probe backlog row
639-group-disabled-state.md | queued | live primitives gap; folded into the primitives salvage backlog row
640-color-swatch-activation.md | queued | live components gap; folded into the components salvage backlog row
640-selection-mark-size.md | queued | live primitives gap; folded into the primitives salvage backlog row
641-fit-bound-usability.md | queued | live tokens gap; folded into the tokens salvage backlog row
641-inventory-count-guard.md | queued | live primitives gap; folded into the primitives salvage backlog row
642-elevation-shape-count.md | queued | live tokens gap; folded into the tokens salvage backlog row
642-number-field-commit-flag.md | queued | live primitives gap; folded into the primitives salvage backlog row
643-capability-scroll-trigger-truth.md | queued | live primitives gap; folded into the primitives salvage backlog row
643-live-theme.md | queued | live playground gap; folded into the playground native-probe backlog row
643-mark-stroke-floor.md | queued | live tokens gap; folded into the tokens salvage backlog row
644-loading-square-button-fit.md | queued | live primitives gap; folded into the primitives salvage backlog row
644-notification-centre-reveal.md | queued | live components gap; folded into the components salvage backlog row
645-fixed-surface-insets.md | queued | live tokens gap; folded into the tokens salvage backlog row
645-floating-trigger-follow.md | queued | live primitives gap; folded into the primitives salvage backlog row
646-f32-metric-range.md | queued | live tokens gap; folded into the tokens salvage backlog row
646-slider-value-commit.md | queued | live primitives gap; folded into the primitives salvage backlog row
646-tabs-disabled-native-focus.md | queued | live components gap; folded into the components salvage backlog row
647-label-marker-width.md | queued | live primitives gap; folded into the primitives salvage backlog row
647-list-disabled-native-focus.md | queued | live components gap; folded into the components salvage backlog row
648-diff-interaction-contract.md | queued | live playground gap; folded into the playground native-probe backlog row
648-tier1-inventory-status-truth.md | queued | live primitives gap; folded into the primitives salvage backlog row
649-breadcrumb-nonfinite-max-items.md | queued | live components gap; folded into the components salvage backlog row
649-floating-follow-docs-truth.md | queued | live primitives gap; folded into the primitives salvage backlog row
649-native-highlight-diff-tint.md | queued | live tokens gap; folded into the tokens salvage backlog row
649-promotion-gate-with-diff.md | queued | live playground gap; folded into the playground native-probe backlog row
650-countdown-nonfinite-duration.md | queued | live components gap; folded into the components salvage backlog row
650-disabled-field-input.md | queued | live tokens gap; folded into the tokens salvage backlog row
651-nonfinite-count-caps.md | queued | live components gap; folded into the components salvage backlog row
651-selected-row-press.md | queued | live tokens gap; folded into the tokens salvage backlog row
652-message-scroller-nonfinite-threshold.md | queued | live components gap; folded into the components salvage backlog row
653-live-coverage-guard.md | queued | live playground gap; folded into the playground native-probe backlog row
654-live-theme-platform.md | queued | live playground gap; folded into the playground native-probe backlog row
655-confirm-dialog-busy-description.md | queued | live components gap; folded into the components salvage backlog row
655-promotion-gate-with-theme-platform.md | queued | live playground gap; folded into the playground native-probe backlog row
655-source-example-imports.md | queued | live tokens gap; folded into the tokens salvage backlog row
656-copyable-theme-declarations.md | queued | live tokens gap; folded into the tokens salvage backlog row
656-live-capture.md | queued | live playground gap; folded into the playground native-probe backlog row
657-multistep-fractional-step.md | queued | live components gap; folded into the components salvage backlog row
657-promotion-gate-with-live-capture.md | queued | live playground gap; folded into the playground native-probe backlog row
658-recipe-edit-family.md | queued | live tokens gap; folded into the tokens salvage backlog row
658-tier1-range-button-group-loading.md | queued | live playground gap; folded into the playground native-probe backlog row
659-field-content-surfaces.md | queued | live tokens gap; folded into the tokens salvage backlog row
659-promotion-gate-with-tier1-evidence.md | queued | live playground gap; folded into the playground native-probe backlog row
659-search-clear-focus-ring.md | queued | live components gap; folded into the components salvage backlog row
660-search-input-every-state-ring.md | queued | live components gap; folded into the components salvage backlog row
661-stepper-malformed-step.md | queued | live components gap; folded into the components salvage backlog row
662-tag-input-fractional-cap.md | queued | live components gap; folded into the components salvage backlog row
663-selected-label-fills.md | queued | live primitives/components gap; folded into the components salvage backlog row
664-ledger-pair-counts.md | queued | live components gap; folded into the components salvage backlog row
665-elevation-content-prose.md | queued | live docs-site gap; folded into the docs-site salvage backlog row
666-combobox-trigger-name.md | queued | live components gap; folded into the components salvage backlog row
666-scrim-explanation-chips.md | queued | live components gap; folded into the components salvage backlog row
667-chip-chrome-fit.md | queued | live components gap; folded into the components salvage backlog row
668-scale-indexes.md | queued | live tokens gap; folded into the tokens salvage backlog row
669-claim-all-enclosing-readers.md | queued | live components gap; folded into the components salvage backlog row
669-metric-member-index-owner.md | queued | live tokens gap; folded into the tokens salvage backlog row
670-example-links.md | queued | live tokens gap; folded into the tokens salvage backlog row
671-invalid-ring-pressed-row.md | queued | live tokens gap; folded into the tokens salvage backlog row
672-combobox-trigger-native-focus.md | queued | live components gap; folded into the components salvage backlog row
672-link-pressed-row-surfaces.md | queued | live tokens gap; folded into the tokens salvage backlog row
673-state-ladder-index.md | queued | live tokens gap; folded into the tokens salvage backlog row
674-disabled-press-surfaces.md | queued | live tokens gap; folded into the tokens salvage backlog row
674-pixel-evidence.md | queued | live playground gap; folded into the playground native-probe backlog row
675-alert-dismiss-test-id.md | queued | live components gap; folded into the components salvage backlog row
675-promotion-gate-with-pixel-evidence.md | queued | live playground gap; folded into the playground native-probe backlog row
676-live-theme-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
676-public-entrypoints-load.md | queued | live components gap; folded into the components salvage backlog row
677-promotion-gate-with-palette-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
677-toast-malformed-max.md | queued | live components gap; folded into the components salvage backlog row
678-default-platform-mono.md | queued | live tokens gap; folded into the tokens salvage backlog row
679-invalid-focus-ring.md | queued | live tokens gap; folded into the tokens salvage backlog row
680-disabled-focus-inert.md | queued | live components gap; folded into the components salvage backlog row
681-check-ordinals.md | queued | live tokens gap; folded into the tokens salvage backlog row
682-caret-surface-owner.md | queued | live tokens gap; folded into the tokens salvage backlog row
683-chip-surface-count.md | queued | live tokens gap; folded into the tokens salvage backlog row
684-remaining-eight-surface-counts.md | queued | live tokens gap; folded into the tokens salvage backlog row
685-controlled-contract-truth.md | queued | live components gap; folded into the components salvage backlog row
685-theme-diff.md | queued | live tokens gap; folded into the tokens salvage backlog row
686-density-boundary-truth.md | queued | live tokens gap; folded into the tokens salvage backlog row
687-platform-theme-recipes.md | discarded | duplicate: .agents/slop/plans/433-platform-theme-recipes.md is the active copy
688-plan-number-collision.md | queued | live tokens gap; folded into the tokens salvage backlog row
689-field-text-selection.md | queued | live primitives/components gap; folded into the components salvage backlog row
689-menu-group-name.md | queued | live components gap; folded into the components salvage backlog row
690-live-image-source-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
691-disabled-button-hover.md | queued | live components gap; folded into the components salvage backlog row
691-promotion-gate-with-image-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
691-runtime-focus-wait-race.md | queued | live primitives gap; folded into the primitives salvage backlog row
692-focus-identity-reorder.md | queued | live primitives gap; folded into the primitives salvage backlog row
692-platform-variant-owner.md | queued | live primitives/components gap; folded into the components salvage backlog row
693-hotkey-clear-pointer-guard.md | queued | live components gap; folded into the components salvage backlog row
693-retire-focus-sleep.md | queued | live primitives gap; folded into the primitives salvage backlog row
694-plus-accelerator-token.md | queued | live components gap; folded into the components salvage backlog row
694-slot-handler-parity.md | queued | live primitives gap; folded into the primitives salvage backlog row
695-blockquote-body-role.md | queued | live tokens gap; folded into the tokens salvage backlog row
695-info-tip-style-seam.md | queued | live primitives gap; folded into the primitives salvage backlog row
696-late-caller-refs.md | queued | live components gap; folded into the components salvage backlog row
696-surface-primitive.md | queued | live primitives gap; folded into the primitives salvage backlog row
697-chart-colour-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
697-surface-bounds.md | queued | live primitives gap; folded into the primitives salvage backlog row
698-selected-option-check.md | queued | live primitives/components gap; folded into the components salvage backlog row
698-surface-revision-repaint.md | queued | live primitives gap; folded into the primitives salvage backlog row
699-promotion-gate-with-chart-colour-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
699-surface-adapter-handoff.md | queued | live primitives gap; folded into the primitives salvage backlog row
700-pressed-option-label.md | queued | live tokens gap; folded into the tokens salvage backlog row
700-scoped-verification-command.md | queued | live primitives gap; folded into the primitives salvage backlog row
701-highlight-wash-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
702-promotion-gate-with-wash-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
703-design-system-inactive-surface-count.md | queued | live tokens gap; folded into the tokens salvage backlog row
704-refused-overlay-close-focus.md | queued | live components gap; folded into the components salvage backlog row
705-caret-fill-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
706-disabled-combobox-open.md | queued | live components gap; folded into the components salvage backlog row
706-track-rejected-roles.md | queued | live tokens gap; folded into the tokens salvage backlog row
707-word-wash-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
708-list-focus-continuity.md | queued | live components gap; folded into the components salvage backlog row
708-qr-module-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
709-primary-text-cell-washes.md | queued | live tokens gap; folded into the tokens salvage backlog row
710-row-press-rejected-fill.md | queued | live tokens gap; folded into the tokens salvage backlog row
711-composition-matrix-budget.md | queued | live tokens gap; folded into the tokens salvage backlog row
712-tabs-focus-continuity.md | queued | live components gap; folded into the components salvage backlog row
713-crop-mask-pixels.md | queued | live components gap; folded into the components salvage backlog row
713-no-mutation-contract.md | queued | live tokens gap; folded into the tokens salvage backlog row
714-caret-pair-figure.md | queued | live tokens gap; folded into the tokens salvage backlog row
714-promotion-gate-with-qr-and-crop-pixels.md | queued | live components gap; folded into the components salvage backlog row
715-docking-indicator-paint-order.md | queued | live components gap; folded into the components salvage backlog row
715-tabs-indicator.md | queued | live components gap; folded into the components salvage backlog row
716-highlight-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
717-jsdoc-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
718-popover-tab-walk-turns.md | queued | live components gap; folded into the components salvage backlog row
719-popover-tab-inside-dialog.md | queued | live components gap; folded into the components salvage backlog row
720-density-consumer-exception.md | queued | live tokens gap; folded into the tokens salvage backlog row
721-combobox-tab-leave.md | queued | live components gap; folded into the components salvage backlog row
722-media-waveform-pixels.md | queued | live primitives/components gap; folded into the components salvage backlog row
722-menu-tab-continues.md | queued | live components gap; folded into the components salvage backlog row
723-pressed-row-selection-wash.md | queued | live tokens gap; folded into the tokens salvage backlog row
723-promotion-gate-with-media-pixels.md | queued | live components gap; folded into the components salvage backlog row
724-click-routing.md | queued | live components gap; folded into the components salvage backlog row
724-navigation-panel-name.md | queued | live components gap; folded into the components salvage backlog row
725-scale-ladder-indexes.md | queued | live tokens gap; folded into the tokens salvage backlog row
726-empty-state-heading.md | queued | live components gap; folded into the components salvage backlog row
727-stored-theme-edit-base.md | queued | live tokens gap; folded into the tokens salvage backlog row
728-nested-modal-tab.md | queued | live components gap; folded into the components salvage backlog row
729-soft-panel-caption-tier.md | queued | live tokens gap; folded into the tokens salvage backlog row
730-modal-nesting-order.md | queued | live components gap; folded into the components salvage backlog row
731-select-typeahead.md | queued | live primitives gap; folded into the primitives salvage backlog row
732-overlay-nesting-order.md | queued | live components gap; folded into the components salvage backlog row
732-select-typeahead-cursor.md | queued | live primitives/components gap; folded into the components salvage backlog row
733-surface-slot-trigger.md | queued | live primitives gap; folded into the primitives salvage backlog row
733-unchecked-selection-control.md | queued | live tokens gap; folded into the tokens salvage backlog row
734-inline-click-routing.md | queued | live components gap; folded into the components salvage backlog row
735-promotion-gate-with-inline-click-routing.md | queued | live components gap; folded into the components salvage backlog row
736-combobox-trigger-activation.md | queued | live components gap; folded into the components salvage backlog row
736-shadow-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
737-disabled-fill-surface.md | queued | live tokens gap; folded into the tokens salvage backlog row
738-toast-action-hover-hold.md | queued | live components gap; folded into the components salvage backlog row
739-promotion-gate-with-shadow-pixels.md | queued | live tokens gap; folded into the tokens salvage backlog row
740-labelled-selection-controls.md | queued | live primitives gap; folded into the primitives salvage backlog row
741-notification-row-space.md | queued | live components gap; folded into the components salvage backlog row
741-radio-group-typeahead.md | queued | live primitives gap; folded into the primitives salvage backlog row
742-pressed-row-exclusion-reason.md | queued | live tokens gap; folded into the tokens salvage backlog row
742-tooltip-rich-tip-label.md | queued | live primitives gap; folded into the primitives salvage backlog row
743-blank-visible-label-row.md | queued | live primitives gap; folded into the primitives salvage backlog row
743-toast-native-focus-hold.md | queued | live components gap; folded into the components salvage backlog row
744-blank-node-tip.md | queued | live primitives gap; folded into the primitives salvage backlog row
744-brand-edit-storage.md | queued | live tokens gap; folded into the tokens salvage backlog row
745-border-and-radius-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
745-empty-select.md | queued | live primitives gap; folded into the primitives salvage backlog row
745-light-brand-total-check.md | queued | live tokens gap; folded into the tokens salvage backlog row
746-nested-text-control-name.md | queued | live primitives gap; folded into the primitives salvage backlog row
746-notification-focus-continuity.md | queued | live components gap; folded into the components salvage backlog row
747-disabled-fill-exemption-claims.md | queued | live tokens gap; folded into the tokens salvage backlog row
747-group-root-containment.md | queued | live primitives gap; folded into the primitives salvage backlog row
748-field-native-focus-ring.md | queued | live components gap; folded into the components salvage backlog row
748-labelled-selection-description.md | queued | live primitives gap; folded into the primitives salvage backlog row
749-label-click-to-focus.md | queued | live primitives gap; folded into the primitives salvage backlog row
749-placeholder-surface-claims.md | queued | live tokens gap; folded into the tokens salvage backlog row
750-checkbox-mixed-activation.md | queued | live primitives gap; folded into the primitives salvage backlog row
750-disabled-fill-palette-and-status-claims.md | queued | live tokens gap; folded into the tokens salvage backlog row
751-promotion-gate-with-border-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
751-toggle-group-typeahead.md | queued | live primitives gap; folded into the primitives salvage backlog row
752-native-focus-ring-buttons.md | queued | live components gap; folded into the components salvage backlog row
752-otp-paste-truth.md | queued | live primitives gap; folded into the primitives salvage backlog row
753-dimensions-consumer-reach.md | queued | live tokens gap; folded into the tokens salvage backlog row
753-number-field-infinity-side.md | queued | live primitives gap; folded into the primitives salvage backlog row
754-loading-spinner-contrast.md | queued | live primitives gap; folded into the primitives salvage backlog row
754-pair-enforcement.md | queued | live tokens gap; folded into the tokens salvage backlog row
754-remaining-native-focus-rings.md | queued | live components gap; folded into the components salvage backlog row
754-state-colour-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
755-canonical-density.md | queued | live tokens gap; folded into the tokens salvage backlog row
755-last-native-focus-rings.md | queued | live components gap; folded into the components salvage backlog row
755-progress-fractional-announcement.md | queued | live primitives gap; folded into the primitives salvage backlog row
755-promotion-gate-with-state-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
756-pagination-item-real-page.md | queued | live components gap; folded into the components salvage backlog row
756-typeahead-prefix-window.md | queued | live primitives gap; folded into the primitives salvage backlog row
757-tint-measurement-claims.md | queued | live tokens gap; folded into the tokens salvage backlog row
758-theme-edit-member-boundary.md | queued | live tokens gap; folded into the tokens salvage backlog row
759-mention-row-activation.md | queued | live components gap; folded into the components salvage backlog row
760-native-text-figures.md | queued | live primitives/components gap; folded into the components salvage backlog row
761-opacity-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
762-promotion-gate-with-opacity-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
763-malformed-hover-delay.md | queued | live components gap; folded into the components salvage backlog row
764-editing-actions.md | queued | live playground gap; folded into the playground native-probe backlog row
765-mention-query-reset.md | queued | live components gap; folded into the components salvage backlog row
766-status-row-surface-claims.md | queued | live tokens gap; folded into the tokens salvage backlog row
767-status-fill-chip-count.md | queued | live tokens gap; folded into the tokens salvage backlog row
768-promotion-gate-with-editing-actions.md | queued | live playground gap; folded into the playground native-probe backlog row
769-self-removing-control-focus.md | queued | live components gap; folded into the components salvage backlog row
770-toast-dismiss-focus.md | queued | live components gap; folded into the components salvage backlog row
770-washed-inactive-figure.md | queued | live components gap; folded into the components salvage backlog row
771-font-family-advances.md | queued | live playground gap; folded into the playground native-probe backlog row
772-inset-ring-figures.md | queued | live components gap; folded into the components salvage backlog row
772-shortcut-row-name.md | queued | live components gap; folded into the components salvage backlog row
773-empty-date-range.md | queued | live components gap; folded into the components salvage backlog row
773-text-ink-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
774-index-paragraph-counts.md | queued | live components gap; folded into the components salvage backlog row
775-readme-index-counts.md | queued | live components gap; folded into the components salvage backlog row
775-text-decoration-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
776-date-grid-column-headers.md | queued | live components gap; folded into the components salvage backlog row
777-promotion-gate-with-ink-and-decoration.md | queued | live playground gap; folded into the playground native-probe backlog row
777-readme-elevation-paragraph.md | queued | live tokens gap; folded into the tokens salvage backlog row
778-aaa-elevation-tint.md | queued | live tokens gap; folded into the tokens salvage backlog row
778-truncation-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
779-accordion-body-region.md | queued | live components gap; folded into the components salvage backlog row
780-hex-guard-boundary.md | queued | live tokens gap; folded into the tokens salvage backlog row
780-progress-value-text.md | queued | live primitives gap; folded into the primitives salvage backlog row
781-invalid-field-interaction-border.md | queued | live primitives gap; folded into the primitives salvage backlog row
781-platform-style-text-step.md | queued | live tokens gap; folded into the tokens salvage backlog row
782-notification-centre-headings.md | queued | live components gap; folded into the components salvage backlog row
782-wrapped-blank-content.md | queued | live primitives gap; folded into the primitives salvage backlog row
783-listbox-option-names.md | queued | live components gap; folded into the components salvage backlog row
783-text-leading-ellipsis.md | queued | live primitives gap; folded into the primitives salvage backlog row
784-native-content-theme.md | queued | live playground gap; folded into the playground native-probe backlog row
784-text-selection-colour.md | queued | live primitives gap; folded into the primitives salvage backlog row
785-brand-example-figures.md | queued | live components gap; folded into the components salvage backlog row
785-busy-button-spinner-status.md | queued | live primitives gap; folded into the primitives salvage backlog row
786-field-read-only-state.md | queued | live primitives/components gap; folded into the components salvage backlog row
786-promotion-gate-with-truncation-and-content-theme.md | queued | live playground gap; folded into the playground native-probe backlog row
787-ledger-scale-ranges.md | queued | live tokens gap; folded into the tokens salvage backlog row
788-alert-region-names.md | queued | live components gap; folded into the components salvage backlog row
789-selection-press-veil.md | queued | live tokens gap; folded into the tokens salvage backlog row
790-text-field-names.md | queued | live components gap; folded into the components salvage backlog row
791-modal-veil-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
792-named-role-roots.md | queued | live components gap; folded into the components salvage backlog row
792-native-syntax-capture-table.md | queued | live components gap; folded into the components salvage backlog row
793-native-field-table.md | queued | live primitives/components gap; folded into the components salvage backlog row
794-edit-artifact-defined-overlay.md | queued | live tokens gap; folded into the tokens salvage backlog row
794-notification-trigger-name.md | queued | live components gap; folded into the components salvage backlog row
795-platform-disabled-step-figures.md | queued | live primitives/components gap; folded into the components salvage backlog row
796-rating-readonly-pointer.md | queued | live primitives/components gap; folded into the components salvage backlog row
797-field-ink-pixels.md | queued | live playground gap; folded into the playground native-probe backlog row
797-select-read-only.md | queued | live primitives/components gap; folded into the components salvage backlog row
798-busy-spinner-locator.md | queued | live components gap; folded into the components salvage backlog row
798-linux-wash-premise.md | queued | live tokens gap; folded into the tokens salvage backlog row
799-aero-disabled-rationale.md | queued | live components gap; folded into the components salvage backlog row
799-message-status-name.md | queued | live components gap; folded into the components salvage backlog row
799-selection-read-only.md | queued | live primitives/components gap; folded into the components salvage backlog row
800-readonly-rating-tab-stop.md | queued | live primitives gap; folded into the primitives salvage backlog row
800-recipe-status-ink-ranges.md | queued | live components gap; folded into the components salvage backlog row
801-scroll-affordance.md | queued | live playground gap; folded into the playground native-probe backlog row
801-stale-hover-preview.md | queued | live primitives gap; folded into the primitives salvage backlog row
802-message-row-name.md | queued | live components gap; folded into the components salvage backlog row
802-slider-read-only.md | queued | live primitives/components gap; folded into the components salvage backlog row
803-mixed-label-inline.md | queued | live components gap; folded into the components salvage backlog row
803-palette-rationale-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
804-description-sentence-join.md | queued | live components gap; folded into the components salvage backlog row
804-pressed-family-read-only.md | queued | live components gap; folded into the components salvage backlog row
805-example-header-figures.md | queued | live components gap; folded into the components salvage backlog row
805-otp-enter-submit.md | queued | live primitives gap; folded into the primitives salvage backlog row
806-message-section-names.md | queued | live components gap; folded into the components salvage backlog row
806-primary-mark-claims.md | queued | live tokens gap; folded into the tokens salvage backlog row
806-select-auto-focus.md | queued | live primitives gap; folded into the primitives salvage backlog row
807-elevation-rationale.md | queued | live tokens gap; folded into the tokens salvage backlog row
807-gradient-backgrounds.md | queued | live playground gap; folded into the playground native-probe backlog row
807-pressable-auto-focus.md | queued | live primitives gap; folded into the primitives salvage backlog row
808-navigation-link-focus.md | queued | live components gap; folded into the components salvage backlog row
808-roving-auto-focus.md | queued | live primitives gap; folded into the primitives salvage backlog row
809-message-row-keys.md | queued | live components gap; folded into the components salvage backlog row
809-radio-option-description-line.md | queued | live primitives gap; folded into the primitives salvage backlog row
810-disabled-state-announcement.md | queued | live primitives gap; folded into the primitives salvage backlog row
810-mention-suggestion-option.md | queued | live components gap; folded into the components salvage backlog row
810-solid-status-marks.md | queued | live tokens gap; folded into the tokens salvage backlog row
811-local-binding-extension-guard.md | queued | live playground gap; folded into the playground native-probe backlog row
811-surface-blur.md | queued | live primitives gap; folded into the primitives salvage backlog row
812-invalid-state-announcement.md | queued | live primitives gap; folded into the primitives salvage backlog row
812-promotion-gate-with-extension-guard.md | queued | live playground gap; folded into the playground native-probe backlog row
813-docs-table-rows.md | queued | live primitives gap; folded into the primitives salvage backlog row
813-malformed-overlay-offsets.md | queued | live components gap; folded into the components salvage backlog row
814-track-surface-enumerations.md | queued | live tokens gap; folded into the tokens salvage backlog row
814-value-keyboard-tables.md | queued | live primitives gap; folded into the primitives salvage backlog row
815-border-role-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
816-content-surface-washes.md | queued | live playground gap; folded into the playground native-probe backlog row
816-nested-surface-press.md | queued | live components gap; folded into the components salvage backlog row
817-state-floor-figures.md | queued | live components gap; folded into the components salvage backlog row
818-warning-fill-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
819-beside-derived-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
819-hidden-surface-recipe.md | queued | live playground gap; folded into the playground native-probe backlog row
820-scroll-clip.md | queued | live playground gap; folded into the playground native-probe backlog row
820-toast-surface-press.md | queued | live components gap; folded into the components salvage backlog row
821-skeleton-pulse-tightest-set.md | queued | live tokens gap; folded into the tokens salvage backlog row
822-disabled-label-tier-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
823-declared-motion-curves.md | queued | live components gap; folded into the components salvage backlog row
823-toast-slot-surface.md | queued | live components gap; folded into the components salvage backlog row
823-wrong-role-mark-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
824-toast-press-nonmodal-overlays.md | queued | live components gap; folded into the components salvage backlog row
825-document-anchors.md | queued | live tokens gap; folded into the tokens salvage backlog row
825-size-constraints.md | queued | live components gap; folded into the components salvage backlog row
826-dialog-from-menu-focus.md | queued | live components gap; folded into the components salvage backlog row
827-command-action-dialog-focus.md | queued | live components gap; folded into the components salvage backlog row
828-row-mark-fills.md | queued | live tokens gap; folded into the tokens salvage backlog row
829-line-clamp-pixels.md | queued | live components gap; folded into the components salvage backlog row
830-toast-action-dialog-focus.md | queued | live components gap; folded into the components salvage backlog row
831-ledger-status-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
832-overlay-close-focus-handoff.md | queued | live components gap; folded into the components salvage backlog row
833-flex-distribution.md | queued | live components gap; folded into the components salvage backlog row
833-live-row-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
834-bezier-easing-storage.md | queued | live tokens gap; folded into the tokens salvage backlog row
835-box-model-insets.md | queued | live primitives/components gap; folded into the components salvage backlog row
835-persisted-row-decoder.md | queued | live tokens gap; folded into the tokens salvage backlog row
836-motion-easing-index.md | queued | live tokens gap; folded into the tokens salvage backlog row
837-toast-origin-successor.md | queued | live components gap; folded into the components salvage backlog row
838-stored-edit-decoder.md | queued | live tokens gap; folded into the tokens salvage backlog row
838-toast-mount-action.md | queued | live components gap; folded into the components salvage backlog row
839-alert-dismiss-focus.md | queued | live components gap; folded into the components salvage backlog row
839-positioning-contract.md | queued | live components gap; folded into the components salvage backlog row
840-status-selection-figures.md | queued | live tokens gap; folded into the tokens salvage backlog row
841-flex-axes.md | queued | live components gap; folded into the components salvage backlog row
components__041-tier1-runtime-verification.md | queued | live primitives gap; folded into the primitives salvage backlog row
components__100-package-testing.md | discarded | duplicate of 100-package-testing.md, already discarded
components__110-package-components.md | discarded | duplicate of 110-package-components.md, already discarded
components__118-single-writer-components.md | discarded | duplicate of 118-single-writer-components.md, already discarded
components__140-gpuix-native-darwin-x64-build.md | discarded | duplicate of 140-gpuix-native-darwin-x64-build.md, already discarded
components__207-ai-chat-and-message.md | discarded | duplicate of 207-ai-chat-and-message.md, an active master plan
components__434-landing-page.md | discarded | duplicate of 434-landing-page.md, an active master plan
gpui-ce__524-shadcn-tailwind-conformance.md | queued | live components gap; folded into the components salvage backlog row
gpui-ce__525-gpui-transform.md | queued | live components gap; folded into the components salvage backlog row
playground__140-gpuix-native-darwin-x64-build.md | discarded | duplicate of 140-gpuix-native-darwin-x64-build.md, already discarded
playground__529-native-binding-provenance.md | queued | live playground gap; folded into the playground native-probe backlog row
playground__530-gpuix-zindex.md | queued | live playground gap; folded into the playground native-probe backlog row
primitives-hover__030-primitives-package.md | queued | live primitives gap; folded into the primitives salvage backlog row
primitives-hover__093-accessible-name-matrix.md | queued | live primitives gap; folded into the primitives salvage backlog row
primitives-hover__094-rating-hover-preview.md | queued | live primitives gap; folded into the primitives salvage backlog row
primitives__030-primitives-package.md | queued | live primitives gap; folded into the primitives salvage backlog row
primitives__053-value-controls.md | discarded | duplicate of 053-value-controls.md, already discarded
primitives__203-adopt-capability-map.md | discarded | duplicate of 203-adopt-capability-map.md, an active master plan
tokens-platform__200-adopt-compound-part-api.md | discarded | duplicate of 200-adopt-compound-part-api.md, already discarded
tokens-platform__201-adopt-runtime-state-model.md | discarded | duplicate of 201-adopt-runtime-state-model.md, an active master plan
tokens-theme__019-motion-tokens.md | discarded | duplicate of 019-motion-tokens.md, already discarded
tokens-theme__052-register-font.md | discarded | duplicate of 052-register-font.md, already discarded
tokens-theme__202-adopt-theme-tokens.md | discarded | duplicate of 202-adopt-theme-tokens.md, an active master plan
tokens-theme__206-message-scroller.md | discarded | duplicate of 206-message-scroller.md, already discarded
transform__524-shadcn-tailwind-conformance.md | queued | live components gap; folded into the components salvage backlog row
FINAL | 1332 plans processed | 0 implemented | 215 discarded | 1117 queued into TODO.md backlog rows | queue empty 2026-10-21
