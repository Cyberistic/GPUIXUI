# 439 — Motion physics (open-gpui) and the Ely component inventory

| Field | Value |
| ----- | ----- |
| Status | research / spec (no implementation) |
| Phase | A (capability spec) → feeds the motion workstream and the Tier 3–5 component gap list |
| Owner | research / motion + components owner |
| Depends on | `019` (motion tokens), `020` (capability map), `203` (adopted limits map), `201` (runtime state model) |
| Feeds | a pure `spring`/`useSpring`/`useTransition` module over GPUix `motion`, and the Tier 3–5 port backlog |

Two independent questions, answered with evidence, no implementation:

1. **open-gpui `crates/motion`** — is the physics/state model pure and portable to
   TypeScript, or is it bound to GPUI's clock/frame hooks? What would a port look
   like, and what does GPUix's own `motion` already cover?
2. **Ely-GPUI-Components** — what ships, what is worth taking (behaviour, API,
   decomposition, theming), and what is off-limits (Rust source, GPUI-bound
   internals)?

Read `019` §1 and `203` §1 first; this plan extends them. Every reference below
is to the shallow clones at the stated commits.

---

## 1. open-gpui `crates/motion` findings

Shallow clone `Latias94/open-gpui` (workspace `version = "0.2.0"`,
`crates/motion` inherits it). Read on 2026-10-20. Paths are relative to the
clone root.

### 1.1 What it provides

It is **not** an animation runtime. It is a deterministic, renderer-neutral
motion *specification + sampling + policy* layer. Public API in
`crates/motion/src/lib.rs:24-53`:

- **Preference/duration/easing descriptors** (`motion.rs`):
  - `MotionPreference` (`Animated | Reduced`) — `motion.rs:7-12`. Reduced is not
    "no animation"; it is "complete immediately while preserving the final
    semantic value" (`is_immediate`, `motion.rs:24-26`).
  - `MotionDuration` (`Immediate | Short 120ms | Medium 180ms | Long 260ms |
    Custom(Duration)`) — `motion.rs:31-55`.
  - `MotionEasing` (`Linear | EaseOut | EaseInOut | EaseOutStrong |
    EaseInOutStrong`) with closed-form `sample(progress)` math — `motion.rs:59-96`.
  - `MotionSpec` — a `{preference, duration, easing}` triple with named
    constructors `layout` / `affordance` / `committed_layout` / `continuity` /
    `immediate` and `progress_at(elapsed)` — `motion.rs:99-198`.
- **Springs** (`spring.rs`):
  - `MotionSpringPhysics` — `{mass, stiffness, damping, rest_delta, rest_speed,
    bounce, review_duration}` with sanitizing constructors — `spring.rs:27-116`.
  - `MotionSpringPreset` (`Affordance | Layout | Continuity`) with default
    physics (`spring.rs:137-167`), `MotionSpringSpec`, `MotionPreset`,
    `MotionModel` (`Timeline | Spring`) — `spring.rs:208-470`.
  - **Real physics integration**: closed-form underdamped / critically-damped /
    overdamped sampling from explicit elapsed time, returning `(value, velocity)`
    with a `rest_delta`/`rest_speed` rest test — `spring.rs:472-579`. This is
    velocity-aware and retargetable, not a normalized-easing shortcut.
- **The facade** (`transition.rs`):
  - `MotionIntent` — 7 product reasons (`PointerInput | KeyboardFocus |
    VisualAffordance | Affordance | CommittedLayout | Continuity | Decorative`)
    — `transition.rs:18-33`.
  - `MotionTransition` — the root builder (`duration`/`spring`/`affordance`/
    `committed_layout`/`continuity`) plus `scalar_run` and `progress_run`
    (`0..1` normalized) — `transition.rs:58-225`.
  - `MotionFrameDriver` — adapter-owned frame-request bookkeeping with reset
    reasons (`Retarget | Cancel | Finish | PruneTerminal | MotionIdentityChanged`)
    — `transition.rs:319-501`.
- **Controllers** (`controller.rs`): `MotionFrameDemand` (`Idle | NeedsFrame`),
  `MotionClockSample` (clamps non-monotonic elapsed time — `controller.rs:88-102`),
  `MotionScalarTrack` (start/retarget/cancel/finish/sample with
  `cancelled_at`/`finished_at`), and `MotionScalarController<K>` (keyed tracks,
  retarget, cancel, finish, `prune_terminal_at`) — `controller.rs:199-752`.
- **Policy validation** (`policy.rs`): `MotionPolicyContext` (spatial motion
  forbidden in pointer/keyboard contexts; only `Continuity` may exceed the
  `MOTION_POLICY_MAX_UI_DURATION` 300ms budget) and `validate_motion_policy`
  which **downgrades failing input to immediate motion** — `policy.rs:6-38,177-212`
  and `controller.rs:149-170`.
- **Sequences** (`sequence.rs`): `MotionSequence<K>` — keyed steps with
  `insert_at` / `append` / `insert_with_previous` / `insert_after_previous` /
  `insert_staggered`, sampled by elapsed time with `Pending | Active | Immediate |
  Completed | Cancelled` per-step state — `sequence.rs:15-132`.
- **Geometry + projection** (`geometry.rs`, `projection.rs`, `runtime.rs`):
  `MotionPx/Point/Size/Rect/Edges` (pure `std::ops` math), `lerp_rect`,
  `preferred_motion_edge`, `motion_source_rect`, `reveal_rect_from_edge`, and the
  fallible `MotionProjection` → `MotionProjectionTransformSample`
  (scale+translation, snapped, `MotionProjectionError` for non-finite/zero-extent)
  and `MotionProjectionClip` — `projection.rs:36-228`.

Units: everything is logical pixels (`f32`) and `Duration`. No frame scheduler,
no window, no renderer, no DOM.

### 1.2 Is the model pure?

**Yes.** The crate declares **zero** dependencies — `crates/motion/Cargo.toml`
has no `[dependencies]` section at all. The only imports are `std::time::Duration`,
`std::collections::HashMap` and `std::ops`. This is not accidental: the test
`motion_manifest_has_no_ui_domain_or_platform_dependencies`
(`crates/motion/tests/public_contracts.rs:394-420`) asserts the manifest never
names `open_gpui*` / renderer crates, and
`advanced_manifest_does_not_export_instant_lifecycle_types`
(`public_contracts.rs:374-386`) proves no `Instant`-owning lifecycle type leaks
into the public surface. Time enters only as explicit `Duration` elapsed values
passed by the caller — the adapter owns the clock, exactly like a React hook
would own `requestAnimationFrame`/`performance.now`.

Portability to TypeScript is a mechanical translation: `enum` → discriminated
union, `Duration` → `number` (ms), the spring/timeline/policy/sequence functions
are pure `(inputs) => sample`. No unsafe Rust, no SIMD, no platform FFI.

### 1.3 License

Apache-2.0 (`crates/motion/LICENSE-APACHE`), with the fork notice in
`crates/motion/NOTICE`:
- "Copyright 2022 - 2025 Zed Industries, Inc." (derived from Zed GPUI)
- "Copyright 2026 Mingzhen Zhuang and Open GPUI contributors" (modifications).

Adaptation is **permitted** (Apache-2.0 §4 redistribution/derivative), with the
usual conditions: retain the NOTICE/copyright, state changes, and do not reuse
the `open-gpui` / `Open GPUI` / "Zed" trademarks in a way that implies
endorsement. A TS port must carry both copyright lines in its header (and be
listed under `LICENSES/`), exactly as the repo already does for the shadcn and
base-gpui ports (`COMPONENTS.md:251-253`, `LICENSES/`).

### 1.4 Integration paths

1. **Port the math to TypeScript** (recommended). A pure
   `packages/motion/src/spring.ts` + `useSpring`/`useTransition` React hooks that
   drive GPUix's existing `motion`/style updates. The crate is deliberately
   renderer-neutral and adapter-owned-clock, so the port is (a) faithful and (b)
   a *net-new* capability GPUix does not expose. **This is the path.**
2. **Native binding** — none. GPUix is a NAPI binding that loads the prebuilt
   renderer; there is no user Rust-extension seam. `@gpuix/native@0.10.0`
   publishes fixed `napi.targets` (`darwin-arm64`, `linux-x64`, `win32-x64`,
   `win32-arm64`) and `packages/testing/src/runtime.ts:43-58` documents exactly
   that surface. Nothing in `@gpuix/native` lets a consumer register custom Rust
   code or a custom animation clock. **Rejected.**
3. **Spec only** — take the API shape and behaviour, implement ourselves. This is
   a subset of path 1 (we must implement anyway; Apache-2.0 lets us port the
   constants and formulas directly rather than re-derive them, provided we
   attribute).

Recommendation: **path 1 (port the math)**, with Apache-2.0 attribution. Do **not**
import Rust code as a dependency; do **not** add any new npm dependency — the
spring/timeline/sequence math is pure arithmetic over `number` and `Duration`.

### 1.5 What GPUix already has

GPUix's own motion is a **declarative renderer-native executor**, not a physics
engine. From `packages/tw/src/motion.ts:1-16,138-145`:

- `@gpuix/react` exports `MotionProps { initial?, animate?, exit?, transition? }`,
  `MotionStyle { opacity?, top?, left?, … }`, `MotionTransition { duration, ease }`
  where `ease` is `"easeOut" | "easeIn" | "easeInOut" | "linear" | [a,b,c,d]`.
- The renderer animates **opacity, size, position, radius** only — **no
  `transform`** (`motion.ts:4-8`). `zoom-in/out` stay `unsupported`
  (`motion.ts:143`).
- **Correction (see §5):** `AnimatePresence` + `usePresence`/`useIsPresent` **do
  ship** in the pinned `@gpuix/react@0.10.0` (and `@gpuix/solid@0.10.0`). The
  earlier draft misread `COMPONENTS.md:59-63`, which actually lists
  `AnimatePresence` as an *available* building block for toasts; the changelog,
  homepage, and Solid guide all document it (changelog `@gpuix/react@0.10.0`
  item 2, `@gpuix/solid@0.10.0` item 1; homepage "Animate unmount"). What is
  still absent is a **JS-side spring/tween engine**: the renderer only tweens
  `initial`→`animate`→`exit` over `duration`/`ease` — no springs, keyframes,
  variants, or `transform` (`motion.ts:4-8,143`; homepage "Targets and timing"
  "Springs, keyframes, variants, and shared layout animations are not available
  yet").

So GPUix **executes** opacity/size/position/radius transitions on its own clock;
it does **not** compute spring values, retarget, sequence, or expose progress
samples. `packages/tw/src/motion.ts` already bridges shadcn *classes* → GPUix
*motion props*; what is missing is a **physics/state layer** that produces the
values GPUix can animate, and that computes values GPUix *cannot* animate (for
projection math, indicators, scrubbing).

`019` (motion tokens) owns durations/easings as *tokens*; this plan owns the
*spring/timeline/sequence state machine* that consumes them. They compose, they
do not overlap.

### 1.6 First slice + tests + STOP conditions

First slice (a later executor, not this plan):

1. `packages/motion/src/spring.ts` — port `MotionSpringPhysics`, `MotionSpringSpec`
   presets, and `sample_spring_value` (under/critical/over-damped) from
   `spring.rs:6-12,27-116,472-579`; `Duration` → `ms:number`; sanitize non-finite
   exactly as `sanitize_number`/`sanitize_positive` do (`spring.rs:582-600`).
2. `packages/motion/src/timeline.ts` — port `MotionSpec`/`MotionEasing`/`MotionDuration`
   and `progress_at` (`motion.rs:31-96,187-198`), `MotionRunState`
   (`runtime.rs:8-34`).
3. `useSpring(target, spec)` / `useTransition(target, spec)` React hooks — own
   `performance.now()`/`requestAnimationFrame`, produce `{ value, velocity,
   state, complete }`, and a reduced-motion branch that returns the final value
   immediately (mirror `MotionPreference::Reduced`, `spring.rs:356-364`).

Tests (deterministic — sample by explicit elapsed time, never wall-clock):

- Spring reaches the exact target at rest, monotonic, finite under NaN/Infinity
  physics (`spring.rs:609-719` port).
- Retarget preserves sampled value+velocity (`spring.rs:631-646`).
- Reduced motion publishes the final semantic sample at `t=0`
  (`spring.rs:689-702`).
- Timeline `progress_at` pins 0/1 and matches easing endpoints (`motion.rs:228-281`).
- `MotionClockSample` clamps non-monotonic time (`controller.rs:818-825`).
- Every test must fail when the ported formula is reverted (the repo's
  `check:tests` gate and `verify-two-directions.sh`).

STOP conditions (report, do not improvise):

- If GPUix's `motion` prop turns out not to accept the produced values as a
  style in the real renderer (probe first in the playground, `apps/playground`).
- If a spring's `rest_delta`/`rest_speed` cannot be made finite at the chosen
  `number` precision for a required precision case.
- If any npm dependency would be needed (none is — stop and re-scope).

---

## 2. Ely-GPUI-Components findings

Shallow clone `ELY-Open-Source/Ely-GPUI-Components` (crate `0.1.1`). Read on
2026-10-20. Paths relative to the clone root.

### 2.1 Inventory — what actually ships

`src/lib.rs:1-60` exposes 44 modules. `gpui-components.md` is a 44-chapter
**aspirational** catalogue (Chinese); the implemented set is smaller but still
large. The implemented modules and their purpose (one line each):

| Module | Files | Purpose |
| ------ | ----- | ------- |
| `primitives` | 18 | `Box/View`, `Text`, `Icon` (+ registry), `Image`, `Divider`, `Spacer`, `Portal`, `Backdrop`, `Focus`/`FocusScope`, `Pressable`, `Measure`, `Tooltip` trigger, `Held`, `Disclosure`, `Severity`, `Caret` |
| `theme` | 20 | One `Theme` global (mode/high-contrast/colour-blind-safe/density/radius/font-scale/reduced-motion/platform) + `Palette` (semantic colours, chart hues, ANSI, syntax) + size tokens per domain |
| `typography` | 14 | `Heading`/`Title`/`Paragraph`/`Label`/`Code`/`Kbd`/`Blockquote`/`Truncate`/`Link`/`RelativeTime`/formatted number/currency/percent/file-size/duration/emoji |
| `layout` | 18 | `Stack`/`Flex`/`Grid`/`Center`/`AspectRatio`/`ScrollArea`/`SplitPane`/`ResizablePanel`/`Collapsible`/`Accordion`/`Card`/`Panel`/`Sidebar`/`Drawer`/`Sheet`/`AppShell`/`MasterDetail` |
| `shell` | 17 | `TitleBar`/`WindowControls`/`MenuBar`/`Toolbar`/`StatusBar`/`ActivityBar`/`Splash`/`About`/`Tray`/`QuickLauncher`/multi-window/update/crash |
| `buttons` | 14 | `Button` (7 variants) / `IconButton` / `ButtonGroup` / `SplitButton` / `ToggleGroup` / `SegmentedControl` / `FAB` / `LoadingButton` / `ConfirmButton` / `CopyButton` / `ShareButton` / `CloseButton` |
| `forms` | 43 | text/number/currency/percent/unit/masked/pin/OTP/inline-edit/mention/hashtag/tag/key-value/list/path/regex/expression/hotkey inputs; checkbox/radio/switch/select/combobox/autocomplete/multiselect/cascade/tree-select/transfer/chips/rating/slider/range/knob; calendar/date/time pickers; colour (picker/swatch/palette/eyedropper/gradient); file upload; form structure |
| `menus` | 8 | `Menu`/`MenuItem`/`SubMenu`/`CheckboxMenuItem`/`ContextMenu`/`DropdownMenu`/`MenuBar`/`OverflowMenu`/`PieMenu` |
| `overlays` | 8 | `Tooltip`/`Popover`/`HoverCard`/`Dialog`/`AlertDialog`/`ConfirmDialog`/`PromptDialog`/`Sheet`/`Drawer`/`Lightbox`/`Spotlight`/`FloatingToolbar`/`Callout` |
| `feedback` | 10 | `Toast`/`Notification`/`NotificationCenter`/`Alert`/`Banner`/`Callout`/`EmptyState`/`Result`/`Countdown`/`Timer`/`SavingIndicator`/`SyncStatus` |
| `motion` | 14 | `Transition`/`Entrance`/`Stagger`/`AnimatePresence`/`Flip`/`Reorder`/`Spring` easing; `Spinner`/`Skeleton`/`Shimmer`/`ProgressBar`/`ProgressRing`; effects (`Blink`/`Flash`/`Glow`/`Marquee`/`Pulse`/`Shake`/`Ripple`/`Confetti`) |
| `data_display` | 18 | `Badge`/`Tag`/`Avatar`/`AvatarGroup`/`Statistic`/`Metric`/`DescriptionList`/`PropertyGrid`/`Timeline`/`Carousel`/`QRCode`/`Barcode`/`Meter`/`Gauge` |
| `lists` | 11 | `List`/`ListItem`/`VirtualList`/`InfiniteList`/`SortableList`/`SelectableList`/`GroupedList`/`Tree`/`FileTree`/`DirectoryListing` |
| `tables` | 18 | `Table`/`DataTable`/`VirtualTable`/`DataGrid`/`Spreadsheet`/`TreeTable`/`ColumnResizer`/`RowSelection`/`TableToolbar` |
| `navigation` | 12 | `Tabs`/`EditorTabs`/`Breadcrumb`/`Pagination`/`Stepper`/`NavigationMenu`/`CommandPalette`/`QuickOpen`/`SpotlightSearch`/`Onboarding` |
| `editor` | 36 | `CodeEditor`/`Gutter`/`Minimap`/`BracketMatcher`/`CursorRenderer`/`CompletionMenu`/`HoverInfo`/`FindWidget`/`ProblemsPanel`/`SettingsEditor` |
| `terminal` | 17 | `Terminal` (ANSI, alacritty backend)/`TerminalTabs`/`TerminalSearch`/`LogViewer` |
| `documents` | 25 | `MarkdownEditor`/`BlockEditor`/`SlashMenu`/`MarkdownRenderer`/`PDFViewer`/`DocumentViewer` |
| `charts` | 29 | line/area/bar/pie/scatter/radar/heatmap/gantt/network/sparkline + axis/legend/tooltip/zoom |
| `chat` | 18 | `ChatContainer`/`MessageList`/`MessageBubble`/`StreamingText`/`CodeBlock`/`Composer`/`ThinkingPanel`/`CitationBadge`/conversation list |
| `agent` | 12 | `ToolCallCard`/`AgentStatus`/`AgentPlan`/`FileChangeCard`/`CommandExecutionCard`/`ArtifactPanel`/`TraceViewer` |
| `generative` | 22 | image-gen panel/queue/grid, style/seed/aspect pickers, inpaint canvas, model download/status, hardware monitor |
| `finance` | 29 | candlestick/OHLC/volume/depth/order-book/watchlist/order-entry/position table — full trading platform |
| `calendar` | 21 | month/week/day/agenda views, event editor, time grid, recurrence |
| `collab` | 10 | presence avatars, remote cursor/selection, comment thread, reactions, share dialog |
| `project` | 15 | kanban, task list, gantt, sprint board, time tracker |
| `canvas` | 33 | infinite canvas, selection box, transform handles, layer panel, shape tools, node graph, whiteboard |
| `mail` | 13 | mailbox/mail list/reader/composer/thread view |
| `messaging` | 15 | channel list, chat message, reactions, read receipts, member list, voice/video call |
| `files` | 14 | file explorer/grid/list, folder tree, context menu, rename inline, transfer queue |
| `media` | 19 | image viewer/cropper, video/audio player, waveform, playlist |
| `maps` | 13 | map view/marker/popup/cluster/choropleth |
| `dashboard` | 9 | dashboard grid, stat card, metrics chart, alert list, resource gauge |
| `settings` | 13 | settings layout/section/row, theme selector, keyboard shortcuts, proxy/storage/privacy |
| `account` | 14 | login/signup/OAuth/2FA/profile/account-switcher/subscription/billing |
| `onboarding` | 9 | onboarding wizard, welcome tour, coachmark, checklist, help panel |
| `misc` | 18 | clock, stopwatch, calculator, unit converter, QR scanner, poll, share sheet, export/import |
| `interaction` | 6 | `Draggable`/`Droppable`/`Sortable`/`Resizable`/`Selectable`/gesture/pan-zoom/hotkeys/undo/roving tab index/typeahead |
| `git` | 15 | diff viewer, inline diff, changes list, commit graph, blame |
| `debug` | 10 | debug toolbar, breakpoints, call stack, variables/watch, memory/hex viewer, profiler |
| `devtools` | 22 | inspector overlay, FPS meter, render counter, event logger, design token viewer |
| `i18n` | 4 | i18n provider, `Trans`/`LocalizedText`, locale number/date, RTL |
| `rendering` | 3 | `RenderSurface` — host-drawn GPU frame surface abstraction |
| `tooling` | 8 | component gallery, playground panel, a11y checker, screenshot harness |

### 2.2 Diff vs our `COMPONENTS.md`

GPUixUI already has (Tier 1 + Tier 2, `COMPONENTS.md:110-184`) the large majority
of Ely's *primitive/form/menu/overlay/feedback* layer — often with more real
native-behaviour test coverage than Ely. The genuinely **missing / not-covered**
clusters that Ely ships and we do not yet:

- **Tier 3–4** (`COMPONENTS.md:186-231`): virtualized/sortable/resizable tables,
  tree views, split panes, docking, command palette, editor tabs, inspectors —
  Ely's `tables`, `lists`, `layout` (SplitPane/Dock), `editor`, `navigation`
  (EditorTabs, CommandPalette), `shell` (ActivityBar, MenuBar, StatusBar).
- **Tier 5** (`COMPONENTS.md:235-253`): terminal (`terminal`), charts (`charts`),
  rich-text/block editor (`documents`), canvas/design (`canvas`), agent/tool-call
  and generative panels (`agent`, `generative`), finance (`finance`) — all `todo`
  in ours, all present in Ely.
- **Variant coverage**: Ely ships variants we have not yet listed as rows —
  e.g. `Rating`/`Knob`/`Cascade`/`TreeSelect`/`TransferList`/`CronEditor`
  (forms), `QRCode`/`Barcode` (data_display), `PieMenu`/`MegaMenu` (menus),
  `AnimatedNumber`/`Typewriter`/`GradientText` (typography).

### 2.3 What to port vs what not

**Port (behaviour, API shape, decomposition, theming) — spec-level:**

- **Theming technique** (highest value): Ely's `Theme` is one global with a small
  set of *scale* dials (`density`, `radius_scale`, `font_scale`,
  `reduced_motion`, `platform`) and every size token is **derived**, e.g.
  `control_height(size) = px_to_rems(base + density_delta)` (`theme/tokens.rs:83-95`),
  `radius(size) = px_to_rems(base * radius_scale)` (`tokens.rs:471-479`). This
  composes with our `@gpuixui/tokens` (which already has density/radii/elevation
  — `COMPONENTS.md:17`) and is a cleaner density model than per-size literals.
- **Palette cross-fade** on mode switch (`theme/mod.rs:132-137,201-226`): ours is a
  re-render (`COMPONENTS.md:18`). Ely fades `from.mix(&to, ease_in_out_cubic(t))`
  over ~280ms with a monotonic transition id to cancel stale fades. A cheap
  win *if* GPUix's opacity `motion` can animate the theme transition — probe
  first (STOP condition).
- **Reduced-motion-as-duration** helper: `duration(base, cx)` returns `base`, or
  `1ms` under reduced motion (`motion/curve.rs:19-25`). Maps directly to the
  `MotionPreference::Reduced` semantics in §1.
- **Semantic colour naming**: Ely's `Palette` (`bg/surface/sunken/overlay/hover/
  active/border/border_strong/fg/fg_muted/fg_subtle/fg_disabled/accent/on_accent/
  focus/link/selection/success/warning/danger/info` + subtle tones + `backdrop/
  shimmer/glass/shadow/tooltip_*/paper/ink` + `chart[8]`/`ansi[16]`/`syntax[13]`,
  `theme/palette.rs:94-137`) is a good checklist to reconcile against our 47
  semantic roles — adopt any role we lack, drop the GPUI-specific ones.
- **The catalogue as a gap checklist** (§2.2 clusters) — feed it into Tier 3–5
  sequencing (`205`).

**Do not port (Rust source):** everything else. Ely depends on `gpui-pre =0.3.8`
and `gpui_platform` (`Cargo.toml:20-22`); its components are GPUI entity/`cx`
stateful, and its `motion` module imports `gpui::{App, Pixels}` and
`ActiveTheme` (`motion/curve.rs:3-5`) — it is **not** renderer-neutral, unlike
open-gpui `motion` (§1.2). GPUix's capability surface (no `transform`, no
`fieldset`, no `aria-*` set, no terminal/media host element — `COMPONENTS.md:28-107`)
means the Rust layout/rendering logic would not survive translation anyway.

### 2.4 Anything better than our current approach

1. **Derived scale/density tokens** (§2.3) — a single `density`/`scale` knob
   that *derives* every size token, vs per-size literal tables. Candidate for
   `@gpuixui/tokens`.
2. **Palette cross-fade on theme switch** — a materially nicer feel than a
   re-render, and cheap if the renderer can animate it.
3. **`reduced_motion` on the theme object**, consumed by one `duration()` helper
   at every call site — centralizes the reduced-motion decision (we currently
   have it only as a `MotionPreference`-style concept, not a theme flag).
4. **`Mix` + `syntax`/`ansi`/`chart` sub-palettes** — a color-blend trait and
   code/chart/terminal colour families as first-class theme members, useful for
   the `code`/`diff`/chart surfaces we will port.

### 2.5 License and attribution

MIT (`LICENSE`), "Copyright (c) 2026 Ely GPUI Component contributors". Third
parties called out in `README.md:66-69`: Lucide icons (ISC), Inter / JetBrains
Mono / IBM Plex Sans / Noto Sans Hebrew fonts (SIL OFL 1.1). Any adopted *code,
API, or token values* must carry the MIT notice (add to `LICENSES/`), and any
copied *icons/fonts* must carry their own ISC/OFL notices. **We take no Rust
source as a dependency** (§2.3); we only transcribe API shapes, token values and
techniques, which MIT permits with attribution.

---

## 3. Verdicts

| Project | Verdict | Evidence |
| ------- | ------- | -------- |
| open-gpui `crates/motion` | **port** (the math to TS) | Pure std-only crate (no `[dependencies]`, `Cargo.toml`; purity asserted by `tests/public_contracts.rs:394-420`); Apache-2.0 permits adaptation; GPUix `motion` is a renderer-native executor with no JS-side physics (`packages/tw/src/motion.ts:1-16`), so the spring/timeline/sequence/retarget model is net-new. |
| Ely-GPUI-Components | **spec-only** (skip Rust source) | MIT permits adaptation, but the crate is GPUI-bound (`gpui-pre =0.3.8`, `motion` imports `gpui`/`ActiveTheme`); the port targets a different runtime with a smaller capability surface. Take: theming technique, palette cross-fade, reduced-motion helper, semantic-colour checklist, and the Tier 3–5 catalogue as a gap list. Do not import Rust. |
| GPUix runtime `motion` (0.10.0) | **take as-is** (presence/exit + scalar tweens) | n/a (closed renderer) | `AnimatePresence`/`usePresence`/`useIsPresent`/`onMotionComplete` and opacity/size/position/radius tweens now ship (changelog 0.10.0, homepage "Native animations"). Do **not** reimplement presence; the net-new JS layer is physics/keyframes/inertia only. |
| gpui-motion `gpui-ce-motion` (0.4.0) | **borrow API shape + easing + inertia** | Pure core (`default = []`, `gpui` optional, §5.2) | MIT OR Apache-2.0 (`Cargo.toml`). Complementary to open-gpui: broader Motion-like API (`Target`/`Presence`/`Variants`/`GestureTargets`/`Inertia`, richer `Easing`) but no policy layer. Port the *math* from open-gpui; borrow the *surface* from here. No Rust import. |

No new dependency is proposed. No Rust code is imported.

---

## 4. Exact files to read, and versions

**open-gpui** (workspace `0.2.0`, `crates/motion` inherits):

| Finding | File |
| ------- | ---- |
| Public API re-exports | `crates/motion/src/lib.rs:24-53` |
| Preference / duration / easing / spec | `crates/motion/src/motion.rs:6-198` |
| Spring physics + sampling | `crates/motion/src/spring.rs:6-12,27-116,472-600` |
| Spring presets / model / sample | `crates/motion/src/spring.rs:14-273,398-470` |
| Intent + facade + frame driver | `crates/motion/src/transition.rs:18-55,58-225,319-501` |
| Frame demand / clock / scalar track+controller | `crates/motion/src/controller.rs:14-118,199-752` |
| Policy + max duration | `crates/motion/src/policy.rs:6-38,177-212` |
| Sequences | `crates/motion/src/sequence.rs:15-132` |
| Run state + retarget + edge/reveal/lerp | `crates/motion/src/runtime.rs:8-34,219-297` |
| Geometry | `crates/motion/src/geometry.rs:1-251` |
| Projection + clip + errors | `crates/motion/src/projection.rs:36-228` |
| Purity proof | `crates/motion/tests/public_contracts.rs:374-420` |
| License / notice | `crates/motion/LICENSE-APACHE`, `crates/motion/NOTICE` |

**Ely** (`0.1.1`):

| Finding | File |
| ------- | ---- |
| Module surface | `src/lib.rs:1-60` |
| Theme global + cross-fade | `src/theme/mod.rs:69-227` |
| Derived size tokens | `src/theme/tokens.rs:5-500` |
| Semantic palette | `src/theme/palette.rs:94-137` |
| Motion surface (GPUI-bound) | `src/motion/mod.rs:17-31` |
| Easing / reduced-motion duration | `src/motion/curve.rs:7-51` |
| Inventory (aspirational) | `gpui-components.md` |
| License + third-party notices | `LICENSE`, `README.md:66-69`, `Cargo.toml` |

**GPUixUI** (pinned `@gpuix/react@0.10.0`, `@gpuix/native@0.10.0`, `effect@4.0.5`):

| Finding | File |
| ------- | ---- |
| GPUix motion prop shape + transform gap | `packages/tw/src/motion.ts:1-16,109-145` |
| Component inventory + status | `COMPONENTS.md:17-253` |
| Native binding model (no extension seam) | `packages/testing/src/runtime.ts:43-58` |
| Token package surface | `packages/tokens/src/index.ts` (see `theme.ts`, `elevation.ts`, `scale.ts`) |
| Motion tokens plan (overlap boundary) | `.agents/slop/plans/019-motion-tokens.md` |

**Versions**: open-gpui-motion `0.2.0` (workspace), Ely `0.1.1`, `@gpuix/react`
`0.10.0`, `@gpuix/native` `0.10.0`, `effect` `4.0.5` (all from the respective
`Cargo.toml` / `package.json` catalogs).

---

## 5. Motion sources compared

Two more sources, read 2026-10-20 in a fresh clone of `Cyberistic/GPUIXUI`
(`@gpuix/react@0.10.0`, `@gpuix/native@0.10.0`): the **GPUix docs** (Solid guide
+ homepage React "Native animations" + changelog) and **`gpui-motion`**
(shallow clone `1bye/gpui-motion` @ `fd9baf9`, crate `gpui-ce-motion` `0.4.0`).

> There is **no `/guides/react` page** — `https://gpuix.dev/guides/react` returns
> 404 and `/llms.txt` lists only `index`, `guides/solid`, `guides/hermes`,
> `changelog`. The React motion API lives on the **homepage**
> (`https://gpuix.dev/index.md`, section **"Native animations"**), which I quote
> below. The Solid guide's **"Motion"** section (`guides/solid.md`) mirrors it.

### 5.1 What the GPUix runtime actually provides (docs, not source)

- `motion.div` (and `motion` in `@gpuix/solid`) with `initial` / `animate` /
  `exit` / `transition` / `style`, plus `onMotionComplete`. React sends the
  target **once**; Rust computes intermediate values on its own clock with no
  per-frame React render or N-API call (homepage "Animate a target").
- Numeric targets only: **`width`, `height`, `top`, `right`, `bottom`, `left`,
  `opacity` (0–1), `borderRadius`** (homepage "Targets and timing"; Solid
  "Motion"). No `transform`.
- Transition: `duration` (seconds, default `0.3`), `delay` (seconds, default
  `0`), `ease` = `"linear" | "ease" | "easeIn" | "easeOut" | "easeInOut" |
  [x1,y1,x2,y2]` (default `"easeOut"`). §1.5's ease enum omitted `"ease"`; the
  canonical token set includes it.
- Explicit gap, verbatim: **"Springs, keyframes, variants, and shared layout
  animations are not available yet."** (homepage "Targets and timing").
- **`AnimatePresence`** (added `@gpuix/react@0.10.0`, Sep 21 2026; Solid has it
  in `0.10.0` too): `AnimatePresence` (`initial={false}`, `onExitComplete`),
  `useIsPresent()`, `usePresence()` → `[isPresent, safeToRemove]`, child `exit`
  targets, unique `key` per leaving child (homepage "Animate unmount";
  changelog `@gpuix/react@0.10.0` item 2, `@gpuix/solid@0.10.0` item 1).
- Deterministic frame capture for tests: `app.clock.pause()` +
  `app.captureFrames(path, [t0, t0+50, …])` freezes the native motion clock
  (homepage "Capture exact frames").

**Gaps a `packages/motion` must still add:** springs, keyframes, variants,
inertia/momentum, colour interpolation, sequence/stagger orchestration,
transform/projection math, and reduced-motion-as-policy on the JS side. The
renderer has **no JS-side physics**; it is a declarative tween executor.

### 5.2 What `gpui-motion` adds (and whether it is pure)

`gpui-ce-motion` `0.4.0`, Rust 1.95, edition 2024. License **MIT OR Apache-2.0**
(`Cargo.toml`), "Copyright (c) 2026 1keep contributors" (`LICENSE-MIT`),
extracted from 1keep @ `0cb95d0`.

- **Public surface** (README "Public export index"): `Motion`/`MotionState`/
  `Target`/`Frame`/`Presence`/`Property`, `Transition`/`Spring`/`Easing`/
  `Bezier`/`CustomEasing`, `MotionValue`/`ValueFrame`/`Inertia`, `Animation`/
  `AnimationState`/`Keyframe`/`Timeline`/`Repeat`/`stagger`, `Color`/
  `ColorState`, `Drag`/`GestureTargets`/`InView`/`Interaction`/`Variants`,
  `PresenceGroup`/`PresenceMode`, `SvgMotion`/`SvgTarget`, `StyleMotion`/
  `StyleTarget`, `MotionGraph`, `MotionTree`/`MotionConfig`, `TypedAnimation`/
  `TypedTimeline`/`TypedState`, `PathShape`/`PathMorphState`/`StrokeReveal`,
  `LayoutPositionState`, `GeometryError`/`ScrollEdge`/`ScrollOffsets`.
- **Physics** (`transition.rs`, `value.rs`): `Easing::sample(t) -> (value,
  derivative)` covers Linear / EaseIn / EaseOut / EaseInOut / CircIn/Out/InOut /
  BackIn/Out/InOut / Anticipate / Bezier / Custom; `Spring` + `Transition`
  (tween or spring); `MotionValue` retains position + velocity (retarget,
  jump); `Inertia` = exponential deceleration + hard bounds + boundary spring +
  `project`.
- **Composition**: `Variants` (named states), `GestureTargets` (`while_hover`/
  `while_press`/`while_focus`/`while_drag`/`while_in_view`), `PresenceGroup`
  (enter/exit), `MotionTree` (parent/child variant inheritance + stagger/
  sequence), `Timeline`/`TypedTimeline` (keyframes, labels, stagger),
  `MotionGraph` (reactive derived values + subscriptions), linear-light colour
  interpolation, plus text/SVG/vector motion (README; `COVERAGE.md`).
- **Reduced motion** is an explicit `sample(elapsed, reduced_motion: bool)`
  flag; native adapters read `App::reduce_motion()` (README "Lifecycle and
  accessibility"; `lib.rs` doc example).

**Purity: yes, the core is pure.** `Cargo.toml` sets `default = []`; `gpui`,
`text`, `svg-path`, and `demo` are all opt-in features. The pure modules
(`motion`, `transition`, `value`, `animation`, `motions`, `color`, `interaction`,
`presence`, `svg`, `layout`, `style_motion`, `geometry`, `graph`,
`orchestration`, `completion`, `typed_animation`, `vector`) import only `std` +
`crate::*`; `gpui` appears solely behind `#[cfg(feature = "gpui")]` (the
`frame`/`now` methods and the `*_native` modules — verified by grep across the
module set above). Same portability profile as open-gpui: the caller owns the
clock and passes an elapsed `Duration`. Default build has **zero** third-party
dependencies (`svgtypes`, `unicode-segmentation`, `gpui-ce =0.2.2`,
`gpui_ce_platform =0.1.0` are all optional).

### 5.3 Is it pure / better than open-gpui, or complementary?

**Complementary, not a replacement.** open-gpui `crates/motion` is the focused,
minimal *physics + policy* layer (closed-form spring retarget, `MotionSpec`/
`MotionEasing`, keyed `MotionSequence`, `validate_motion_policy`
downgrade-to-immediate, projection). `gpui-motion` is the **broad Motion-like
API** (targets/variants/gestures/presence/inertia/keyframes/timeline/stagger/
graph) with a richer easing set and momentum, but no policy layer and no
projection-policy machinery. For a TS `packages/motion` over GPUix: **port the
math from open-gpui** (smaller, policy-aware, already vetted in §1) and
**borrow the API surface + easing variants + `Inertia` from gpui-motion**
(dual-licensed MIT/Apache, pure core). Its `Target`/`Motion`/`MotionState.
sample(elapsed, reduced_motion)` and `Presence`/`Variants`/`GestureTargets`
map 1:1 onto a React hook, which open-gpui's facade does not.

### 5.4 Comparison table

| Source | What it provides | Purity | License | Take / skip |
| ------ | ---------------- | ------ | ------- | ----------- |
| GPUix runtime `motion` (`@gpuix/react@0.10.0`) | declarative tween executor: `initial`/`animate`/`exit` + `transition{duration,delay,ease}`; `AnimatePresence`/`usePresence`/`useIsPresent`/`onMotionComplete`; opacity/size/position/radius only | n/a (closed renderer) | n/a (runtime) | **take as-is** for presence/exit + scalar tweens; skip reimplementing presence; gap = physics/keyframes/transform |
| open-gpui `crates/motion` (`0.2.0`) | springs (retarget, under/critical/over-damped), easing/spec, keyed sequences, reduced-motion policy, projection/geometry | pure, zero deps | Apache-2.0 (+ Zed NOTICE) | **port the math** (`spring.ts`/`timeline.ts`/`policy.ts`) |
| `gpui-motion` `gpui-ce-motion` (`0.4.0`) | Motion-like API: spring/tween/easing (+Circ/Back/Anticipate)/Bezier, keyframes/timeline/stagger, variants, gesture targets, presence, inertia/momentum, colour, graph, orchestration, typed clips; GPUI adapters behind `gpui` feature | pure core (`default = []`), `gpui` optional | MIT OR Apache-2.0 | **borrow API shape + easing + `Inertia`**; skip text/SVG/vector/native modules |

### 5.5 Reconciled verdict + revised first slice

**Reconciled verdict** (updates §1.5 and §3):

1. Presence/exit is **solved by the runtime** (`0.10.0`) — do **not** rebuild
   `AnimatePresence`/`usePresence`.
2. The net-new JS layer is **physics + policy + keyframes + inertia**: springs,
   easing, retarget, momentum, reduced-motion, sequences — which GPUix's tween
   executor does not compute.
3. Port the **math from open-gpui** (§1, already vetted); borrow the **API
   surface + easing variants + `Inertia` from gpui-motion** (§5.2).
4. No new npm dependency, no Rust import. Dual attribution: Apache-2.0
   (open-gpui, Zed + Open GPUI lines) and MIT (gpui-motion, "Copyright (c) 2026
   1keep contributors") under `LICENSES/`.

**Revised first slice** (supersedes §1.6's list where it differs):

1. `packages/motion/src/spring.ts` — open-gpui `spring.rs` closed-form
   under/critical/over-damped sampling + retarget + `rest_delta`/`rest_speed` +
   sanitize, **plus** gpui-motion `Spring`/`Transition`/`Inertia`
   (`transition.rs`, `value.rs`) for momentum/bounds.
2. `packages/motion/src/timeline.ts` — open-gpui `MotionSpec`/`MotionEasing`
   (`motion.rs`) **plus** gpui-motion `Animation`/`Keyframe`/`Timeline`/`stagger`
   and the extended `Easing` set (Circ/Back/Anticipate/Bezier).
3. `useMotion(target, spec)` hook — shape borrowed from gpui-motion
   `Target`/`Motion`/`MotionState.sample(elapsed, reduced_motion)`, returning
   `{ value, velocity, present, complete }`; reduced-motion branch returns the
   final value immediately (open-gpui `MotionPreference::Reduced`, gpui-motion
   `sample(_, true)`).
4. **Leave to the runtime**: `AnimatePresence`/`usePresence`/`useIsPresent`/
   `onMotionComplete` and all opacity/size/position/radius tweens. Our hook
   feeds `animate` targets (or computes transform/projection/scrub values the
   runtime cannot animate).
5. **Skip**: subtree transform (the runtime has none; both crates defer it —
   open-gpui projection is geometry-only, `COVERAGE.md` "Scale/rotation/skew/
   perspective … unsupported"), text/SVG/vector motion, and the `gpui`-feature
   native adapters (gesture/scroll/reorder/layout).

STOP condition (added to §1.6's list): if `onMotionComplete` + the automation
clock (`clock.pause()`/`captureFrames`) cannot deterministically assert spring
settling in the playground, report rather than improvise.

### 5.6 API shape worth borrowing from the guides

- Both guides express transitions as **declarative target triples** —
  `<motion.div initial={{…}} animate={{…}} exit={{…}} transition={{ duration,
  ease }}>` wrapped in `AnimatePresence`. Mirror this in `packages/motion`: a
  single declarative `Motion` descriptor (initial/target/exit + transition),
  not an imperative tween call, so it composes with the runtime's own
  `motion.div` and `AnimatePresence`.
- The runtime's **seconds** `duration` + **named `ease`** (or cubic-bezier
  tuple) is the vocabulary `timeline.ts`/`spring.ts` should speak, so produced
  values map cleanly onto `transition`/`animate` props.
- `initial={false}` ("mount at the first `animate` target") and `usePresence()`
  / `safeToRemove` (deferred removal) are worth mirroring in the hook API.
- gpui-motion's "ownership in four rules" (retain state; declare the
  destination; keep exits mounted; use one clock) is the discipline our
  `useMotion`/`useTransition` hooks should adopt — a retained `MotionState` over
  one monotonic `performance.now()` epoch.

### 5.7 Citations

| Finding | Source |
| ------- | ------ |
| React `motion`/`AnimatePresence`/`onMotionComplete`/`captureFrames`, targets + "not available yet" | `https://gpuix.dev/index.md` → "Native animations" ("Animate a target", "Targets and timing", "Animate unmount", "Capture exact frames") |
| Solid `motion`/`AnimatePresence`/`usePresence`, targets + ease list | `https://gpuix.dev/guides/solid.md` → "Motion" |
| `AnimatePresence` release notes | `https://gpuix.dev/changelog.md` → `@gpuix/react@0.10.0` item 2, `@gpuix/solid@0.10.0` item 1 |
| No React guide (404 / index) | `https://gpuix.dev/llms.txt`, `https://gpuix.dev/guides/react` |
| gpui-motion crate/features/license/deps | `gpui-motion/Cargo.toml` (name `gpui-ce-motion`, `0.4.0`, `default = []`, `gpui` optional, `license = "MIT OR Apache-2.0"`) |
| Pure core vs `gpui`-gated modules | `gpui-motion/src/lib.rs` (`#[cfg(feature = "gpui")]` gates), grep of `src/*.rs` imports |
| Easing/Spring/Transition | `gpui-motion/src/transition.rs:1-140` (`Easing::sample` → `(value, derivative)`) |
| MotionValue/Inertia (momentum) | `gpui-motion/src/value.rs:1-120` |
| API catalogue + renderer limits | `gpui-motion/README.md` "Public export index", `COVERAGE.md` |
| License text | `gpui-motion/LICENSE-MIT` ("Copyright (c) 2026 1keep contributors"), `LICENSE-APACHE` |
