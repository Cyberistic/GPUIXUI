# 537 — gpui-ce: capability delta, patch-vs-switch, and the integration verdict

| Field | Value |
| ----- | ----- |
| Status | **research complete — verdict: do not switch; port binding-level patches, defer renderer features.** No app/component code changed. No build run. |
| Phase | infra (runtime / renderer capability) |
| Owner | runtime owner; reviewed by the components and `packages/tw` owners |
| Depends on | `020` (GPUix runtime capability), `524` (tw `unsupported` channel), `525` (transform branch), `140` (darwin-x64 binding) |
| Sources | `gpui-ce/gpui-ce` @ `a8d3969d…` (**Apache-2.0**); `remorses/gpuix` @ `515df19` with zed submodule `2565b8a3…`; `0xErwin1/zed` transform branch `fc4c1586…`; published GPUix `0.10.0` |
| Reference clone | `/Users/cyberistic/GPUIXUI/references/gpui-ce` (full clone, read-only; 292 MiB `.git`, 35 964 commits) |
| Feeds | `packages/tw` `unsupported` set; `COMPONENTS.md` GPUix-support column; plan 525's fork decision; `PLAN.md` decision rows |

---

## 1. Verdict first

**`gpui-ce` is a real, active, Apache-2.0 fork of GPUI. It is not a drop-in, it is
not a superset of the pinned GPUix GPUI, and it does not solve the transform gap.**

The one-sentence comparison: *`gpui-ce` is a competing GPUI fork that has
invested in styling and text (declarative style transitions, backdrop/filter,
squircle corners, a Parley text stack) while replacing, not extending, the
GPUix fork's embedding and rendering work.*

| Question | Answer |
| -------- | ------ |
| Is `gpui-ce` abandoned? | **No.** Tip `a8d3969` on 2026-10-17; 76 first-parent commits and 16 authors since its 2026-09-03 upstream sync; CI on Linux, macOS, Windows and wasm. |
| Is it a drop-in replacement for the pinned GPUI? | **No.** Package names, `WindowOptions`, `Outline` → `RingStyle`, the text system and the renderer all differ. |
| Does it offer transform/scale/rotate? | **No.** No `ElementTransform`, no `Style::transform`, no transform stack. `TransformationMatrix` exists only for SVG/path painting (`crates/gpui/src/scene.rs:953`, `crates/gpui/src/elements/svg.rs:256`). Plan 525's branch remains the only transform source. |
| Does it offer zIndex? | **No.** Zero `z_index`/`zIndex` symbols in the workspace. The GPUix-side layer patch in plan 524 §5 remains the path. |
| Does it offer percentage insets / auto margins? | **Yes — but so does the pinned GPUI.** `Length::Auto` and `DefiniteLength::Relative` already exist in both (`crates/gpui/src/geometry.rs:3580,3734` in gpui-ce; `geometry.rs:3460,3611` at `2565b8a`). The gap is GPUix's `StyleDesc` (`top: Option<f64>`, `margin: Option<f64>`), not GPUI. |
| Does it offer backdrop-filter? | **Yes**, with real Metal/WGPU/DirectX passes. But it is coupled to `gpui-ce`'s new `gpui_render` shader pipeline; porting it to the pin is a renderer project, not a cherry-pick. |
| Does it offer colour transitions? | **Yes**, declaratively (`.transitions(|t| t.bg(...).text_color(...))`). This is CPU-side and portable in principle, but ~4 k LOC and entangled with `div`/`window`. |
| Is switching practical? | **No.** `gpui-ce` removed the embedded macOS platform that GPUix depends on (`MacPlatform::new_embedded`, `pump_events`, `set_frame_wake_hook`), renamed `WindowOptions.window_background`, and deleted `Outline`. The binding does not compile without a port. |
| Licence | **Apache-2.0**, verified from `LICENSE.md` and every crate's `Cargo.toml`. No GPL/AGPL file in the tree. Attribution/NOTICE is required if we copy code. |

**Recommended path, in order:**

1. **Stay on the GPUix pin (`2565b8a`) + the transform branch (plan 525).** Do
   not replace the runtime with `gpui-ce`.
2. **Land the binding-level patches that are independent of `gpui-ce`**:
   percentage insets, auto margins, `zIndex` (plan 524 §5), outline/ring-offset
   mapping from GPUix `main`, and the missing ARIA props. These are small and
   unblock shadcn conformance now.
3. **Keep renderer-coupled `gpui-ce` features unsupported** (backdrop-filter,
   content filter, squircle corners, fade masks) and record why. They need a
   renderer/shader project on the pinned Metal/WGPU stack.
4. **Spike a minimal style-transition port only if a component genuinely needs
   native hover colour animation.** Do not port the whole 4 k LOC up front.
5. **Re-audit only if** upstream/GPUix adopts one of these features, or
   `gpui-ce` grows an embedded macOS mode and a GPUix-compatible binding surface.

---

## 2. Pinned sources, clone, health and licence

### 2.1 The clone (created for this audit; read-only)

```sh
cd /Users/cyberistic/GPUIXUI/references
git clone --depth 1 https://github.com/gpui-ce/gpui-ce.git gpui-ce
cd gpui-ce
git fetch --unshallow origin main     # full history; 35 964 commits, 292 MiB .git
```

Do not check out, edit or build in `references/`. The clone is a reference, not
a workspace.

### 2.2 Pins read on 2026-10-18

| Ref | SHA | Date | Subject |
| --- | --- | ---- | ------- |
| `gpui-ce` `main` | `a8d3969d5478fa0b8f6c0bd20f12869b39db2601` | 2026-10-17 08:18 -0700 | `fix Crash: index out of bounds: the len is 0 but the index is 0. (#337)` |
| `gpui-ce` last upstream sync | `2e354dfab2dab2311ed321bda349ce94a7667bd0` | 2026-09-03 | `Sync/zed 20260903 b1a7ef0 (#219)` |
| GPUix `zed` submodule | `2565b8a3e33537c3d3f56d0d45f11e50a17e512d` | 2026-10-16 | `gpui_macos: Add a display-link frame wake hook` |
| GPUix upstream base | `1d7e5f1d014acf0d288c6d11be93c31fe647e725` | 2026-08-26 | `gpui_windows: Fix window placement…` |
| Transform branch tip | `fc4c1586647ad987cb88bf96e1fb4e543f4bdaca` | 2026-05-20 | merge `…06-text-raster-core` into `…07-text-raster-subpixel-regressions` |
| Transform branch base | `251456cf20887b91e0ba2d507b47ace14d4c24ff` | 2026-05-20 | upstream `main` at the branch's base |

The two forks are **not ordered**. `gpui-ce` synced zed on 2026-09-03 and then
added 76 first-parent commits; GPUix is based on 2026-08-26 and has 61 GPUix
commits through 2026-10-16. Each has work the other lacks:

- pin-only: `Outline` with `offset`, cross-platform `WindowOptions.window_background`,
  embedded macOS (`new_embedded`/`pump_events`), `set_frame_wake_hook`,
  `runtime_shaders`, GPUix's own list/overlay/embedding patches;
- gpui-ce-only: declarative style transitions, backdrop/content filters, squircle
  corners, Parley text, touch-drag/long-press gestures, a few ARIA methods,
  a Rust-DSL cross-compiled shader pipeline.

### 2.3 Repo health (measured 2026-10-18)

| Probe | Result |
| ----- | ------ |
| Last commit | `a8d3969`, 2026-10-17 (GitHub `pushed_at` 2026-10-17T15:18Z) |
| Stars / forks | **1 373** / **151** |
| Open issues | 34 |
| Commits | 35 964 total (includes inherited Zed history); **185 first-parent** since the June 2026 fork; **76 first-parent** since the September sync |
| Authors since last sync | 16 (first-parent); 33 since the fork |
| Releases / tags | **none** (`releases: []`, `tags: []`) |
| crates.io | `gpui-ce` **0.2.2**, published 2026-08-28; 0.3.x are **yanked**; `gpui_ce_parley` and `gpui_ce_render` are **not published** |
| CI | `.github/workflows/ci.yml`: Linux, macOS, Windows, wasm; `audit.yml` runs cargo-audit/cargo-deny |
| README claim | "mostly API compatible with upstream, but that is changing!" (`README.md`) |

**Health verdict: active and credible, not abandoned.** The distribution story
is the problem: there is no tagged release, and the published `0.2.2` predates
every gpui-ce-unique feature this plan cares about (parley, style transitions,
backdrop, corner smoothing all landed September–October). A consumer must use a
git dependency or build from source.

### 2.4 Licence — verified from files, not a badge

| Evidence | Result |
| -------- | ------ |
| `references/gpui-ce/LICENSE.md` | Apache License 2.0, full text |
| `Cargo.toml` `[workspace.package]` | `license = "Apache-2.0"`, `publish = true` |
| `crates/gpui/Cargo.toml`, `gpui_platform`, `gpui_macos`, `gpui_apple`, `gpui_web`, `gpui_ce_parley`, `gpui_elements`, `gpui_render` | each declares `license = "Apache-2.0"` |
| `grep -rl 'GPL\|General Public License' crates` | **no hits** |
| `LICENSE-GPL` / AGPL file | **absent** |
| `crates/gpui_render/THIRD_PARTY_NOTICES.md` | MIT notice for `figma-squircle` (only relevant if corner smoothing is copied) |
| GitHub API | `license.spdx_id = "Apache-2.0"`, not archived |

The fork inherits Zed's GPUI, which is Apache-2.0 at both the pin and upstream;
Zed's GPL-3.0-or-later applies to the Zed application, not to `crates/gpui`.
There is no GPL/AGPL contamination in the files this plan would port.

**Obligations if we copy any `gpui-ce` code** (Apache-2.0 §4):

1. keep the Apache-2.0 licence text;
2. add a `LICENSES/provenance.md` row: source repo, commit `a8d3969`, the exact
   files, what changed, licence;
3. retain copyright/attribution notices (Zed Industries for the base, gpui-ce
   contributors for their changes);
4. do not use the GPUI-CE or Zed marks as our identity.

If we copy the corner-smoothing shader, also carry the `figma-squircle` MIT
notice. This plan does **not** recommend copying it.

---

## 3. Method (reproducible)

The comparison is source-level, not README-level. No build was run.

1. Read the pinned files with `git show 2565b8a:<path>` from
   `~/GPUIXUI/references/transform-zed` (the only clone that has the GPUix zed
   objects).
2. Read `gpui-ce` files directly from `~/GPUIXUI/references/gpui-ce`.
3. Diff the `Style` field set, the `Primitive` enum, `WindowOptions`, the
   `Element` trait and the ARIA surface.
4. Search for each capability by symbol, not by prose.
5. Simulate the transform port against `gpui-ce` with `git merge-file`, exactly
   as plan 525 §4.1 did against the pin.

The field-set diff command (run from the repo root):

```sh
CE=$HOME/GPUIXUI/references/gpui-ce
PIN=$HOME/GPUIXUI/references/transform-zed

awk '/^pub struct Style \{/,/^\}/' "$CE/crates/gpui/src/style.rs" \
  | grep -E '^\s+pub [a-z_]+:' | sed 's/.*pub //' | sort > /tmp/ce-style.txt
git -C "$PIN" show 2565b8a:crates/gpui/src/style.rs \
  | awk '/^pub struct Style \{/,/^\}/' \
  | grep -E '^\s+pub [a-z_]+:' | sed 's/.*pub //' | sort > /tmp/pin-style.txt

comm -23 /tmp/pin-style.txt /tmp/ce-style.txt   # pin only
comm -13 /tmp/pin-style.txt /tmp/ce-style.txt   # gpui-ce only
```

Result:

```
pin only:  border_color: Option<Hsla>,  outline: Option<Outline>,
ce only:   backdrop_filter, border_dashed_gap, border_dashed_length,
           border_color: Option<Background>, corner_smoothing, direction,
           filter, inset_ring, overflow_fade, ring, unicode_bidi,
           unicode_bidi_explicit, vertical_align
```

The transform-port simulation:

```sh
S=/tmp/transform-merge-gpui-ce
mkdir -p "$S"
for f in crates/gpui/src/{elements/div.rs,scene.rs,style.rs,styled.rs,text_system/line.rs,view.rs,window.rs}; do
  n=$(echo "$f" | tr '/' '_')
  git -C "$HOME/GPUIXUI/references/transform-zed" show 251456cf:"$f" > "$S/$n.base"
  git -C "$HOME/GPUIXUI/references/transform-zed" show fc4c1586:"$f" > "$S/$n.theirs"
  cp "$HOME/GPUIXUI/references/gpui-ce/$f" "$S/$n.ours"
  git merge-file -L gpui-ce -L base -L erwin -p \
    "$S/$n.ours" "$S/$n.base" "$S/$n.theirs" > "$S/$n.merged" || true
done
grep -c '^<<<<<<<' "$S"/*.merged
```

Result: **28 conflict hunks in 7 files** against `gpui-ce`, versus **14** against
the GPUix pin (plan 525 §4.2). `scene.rs` alone goes from clean to 4 hunks
because `gpui-ce` rewrote the primitives and the shader/ABI boundary.

| File | Conflicts vs pin | Conflicts vs gpui-ce |
| ---- | ----------------: | --------------------: |
| `elements/div.rs` | 2 | 2 |
| `scene.rs` | 0 | 4 |
| `style.rs` | 1 | 1 |
| `styled.rs` | 1 | 1 |
| `text_system/line.rs` | 1 | 3 |
| `view.rs` | 3 | 3 |
| `window.rs` | 6 | 14 |
| **total** | **14** | **28** |

**Consequence:** if transform is a requirement, `gpui-ce` doubles the port and
still gives no transform. Plan 525's target must remain the GPUix pin.

---

## 4. Feature matrix

Class legend:

- **A** — the capability exists in GPUI core or is a small, self-contained
  patch; we can add it to the GPUix pin/binding without adopting `gpui-ce`.
- **B** — present in `gpui-ce`, but tied to its renderer, text stack or platform
  API; using it means switching GPUI (or writing a new renderer/text project).
- **C** — absent everywhere; needs original work (or the transform branch).
- **D** — the pin has it and `gpui-ce` removed or regressed it.

| Feature | GPUix pin `2565b8a` / GPUix `main` binding | `gpui-ce` `a8d3969` | Transform branch `fc4c1586` | Class | Primary evidence |
| ------- | ------------------------------------------ | ------------------- | --------------------------- | ----- | ---------------- |
| `translate` / `scale` / `origin` | absent | **absent** | present (`ElementTransform`), no rotate | **C** | `gpui-ce/crates/gpui/src/style.rs:231-411` has no transform field; no `ElementTransform`/`with_style_transform` anywhere; `TransformationMatrix` is SVG-only (`scene.rs:953`, `elements/svg.rs:256`) |
| `rotate` | absent | absent | public API omits it; quads are bounds-only | **C** | plan 525 §3.5 item 1 |
| `zIndex` / stacking order | absent (layers only) | **absent** | n/a | **A** (GPUix patch) | zero `z_index`/`zIndex` symbols in `gpui-ce/crates`; plan 524 §5 |
| `backdrop-filter` | absent | present, real passes | n/a | **B** | `style.rs:381-382`, `styled.rs:103`, `style.rs:1019`, `scene.rs:378`, `gpui_apple/src/metal_renderer.rs:1039`, `gpui_wgpu/src/wgpu_renderer/frame.rs:423`, `gpui_windows/src/directx_renderer.rs:605` |
| content `filter` | absent | present | n/a | **B** | `style.rs:378-379`, `styled.rs:92`, `window.rs:4605` (`with_filter_layer`), `gpui_render/src/shaders/filters.rs` |
| percentage insets | **core supports** (`Length`/`DefiniteLength::Relative`); binding uses `number` | core supports the same | n/a | **A** (binding patch) | pin `geometry.rs:3460,3611`, `taffy.rs:529-577`; ce `geometry.rs:3580,3734`, `taffy.rs:933-981`; GPUix `style.rs:197-200`, `host.ts:161-164` |
| auto margins | **core supports** (`Length::Auto`); binding uses `number` | core supports the same; `.mx_auto()` generated | n/a | **A** (binding patch) | ce `gpui_macros/src/styles.rs:1214-1263,1594-1611`; pin macros have the same `auto_allowed`/`auto` suffix |
| outline / ring offset | pin: `Outline { width, color, offset }`; GPUix `main` exposes `outlineWidth/Color/Offset`; **0.10.0 does not** | **regressed**: `RingStyle { width, color }` only, no offset | n/a | **A** (publish/upgrade binding) | pin `style.rs:353-360,296`; GPUix `style.rs:225-229`, `host.ts:188-193`; ce `style.rs:195-200` |
| ring / inset ring | absent | present (width/colour, no offset) | n/a | **A** (covered by `outline`) | ce `style.rs:195-226`, `gpui_macros/src/styles.rs:853-887` |
| colour transitions (`transition-colors`) | absent natively; GPUix motion animates numbers only | present, CPU-side | n/a | **A** (portable subset) / **B** if whole stack | ce `div.rs:920-932`, `gpui_macros/src/styles.rs:355-435`, `style_transitions.rs`; GPUix `motion.rs:37-51` (numbers only) |
| size/inset/radius transitions | absent | present | n/a | **A** (portable subset) | ce `style_transitions.rs:68-200`, `gpui_macros/src/styles.rs:161-420` |
| motion / spring builder | pin has `spring.rs` + `AnimationExt::with_animation`; no `Motion`/`Animated` wrapper | present (`Motion`, `Animated`, `Lerp`, reverse passes, delays) | n/a | **A** (optional) | ce `motion.rs`, `animated.rs`, `lerp.rs`, `transition.rs`; pin `spring.rs`, `crates/gpui/src/elements/animation.rs` |
| ARIA extras | pin has 22 `aria_*` methods; GPUix binding exposes 7 props | 27 methods (adds `aria_disabled`, `aria_hidden`, `aria_live`, `aria_live_atomic`, `aria_modal`) | n/a | **A** (tiny patch) | ce `elements/div.rs:1544-1767`; pin `elements/div.rs:1307-1468`; GPUix `accessibility.rs:39-59` |
| Parley text / rasterisation | custom text system; subpixel sprites | **Parley** text stack, new rasterisers | branch edits `text_system/line.rs` | **B** | ce `crates/gpui_ce_parley/src/lib.rs`, `text_system/*`; `CHANGELOG.md`; pin `crates/gpui/src/text_system.rs` |
| letter spacing / text transform / font width | absent | present | n/a | **A/B** (text work) | ce `style.rs:704-707`; pin `style.rs:450-500` |
| input / event model | pin has key/mouse/touch + long press | same base + `TouchDragEvent`, `on_drag_alt`/`on_drop_alt` | n/a | **A** (small) | ce `interactive.rs:25-64`, `gestures.rs:386-432`, `elements/div.rs:627-765`; pin `interactive.rs:25-64`, `gestures.rs:171` |
| web target | **present**: `crates/gpui_web` + wasm `gpui_platform` | present | n/a | **C** (no advantage) | pin `crates/gpui_web/Cargo.toml`, `gpui_platform/src/gpui_platform.rs:20-63`; ce `crates/gpui_web/src/gpui_web.rs` |
| squircle corner smoothing | absent | present, shader-heavy | n/a | **B** | ce `style.rs:365`, `styled.rs:1131`, `gpui_render/src/shaders/corner_smoothing.rs` (1 176 LOC) |
| overflow fade mask | absent (`ContentMask` is bounds-only) | present (`ContentMask.fade_out`) | n/a | **B** | ce `style.rs:254`, `styled.rs:202`, `window.rs:2166`; pin `window.rs:1935` has no `fade_out` |
| configurable dashed border | pin: solid/dashed only | dashed length/gap | n/a | **B** | ce `style.rs:351-357`; pin `scene.rs:597-603` |
| native animation (`with_animation`) | present | present, migrated to `Motion` | n/a | **C** (no advantage) | pin `elements/animation.rs:82-158`; ce `elements/animation.rs` |

**Summary:** of the recorded tw gaps, only two are *implemented by gpui-ce and
portable as a CPU-side patch*: colour/style transitions and the five extra ARIA
methods. Two are **already in the pin's core** and only need a binding patch
(percentage insets, auto margins). One is **worse in gpui-ce** (outline offset).
The rest are either absent in `gpui-ce` (transform, zIndex) or renderer/text
projects (backdrop, filter, squircle, fade, Parley).

---

## 5. Feature-by-feature analysis

### 5.1 Transform / translate / scale / rotate / origin — absent

`gpui-ce`'s `Style` struct is at `crates/gpui/src/style.rs:231-411`. It has no
transform field. The string `ElementTransform` does not occur in the workspace;
`with_style_transform` does not occur; `Style::transform` does not occur.

`TransformationMatrix` exists at `crates/gpui/src/scene.rs:953` with `rotate`,
`scale`, `compose`, and is used by the SVG element
(`crates/gpui/src/elements/svg.rs:256`). That is painting-time geometry for one
element, not a layout-relative subtree transform.

**Verdict: C.** A `gpui-ce` switch would still require porting the 0xErwin1
branch, and the simulation in §3 shows the port is **twice** as conflicted
(28 hunks vs 14), because `gpui-ce` rewrote `scene.rs` and `window.rs`. Plan 525
remains the only transform plan.

### 5.2 zIndex / stacking — absent

There is no `z_index`, `zIndex` or `ZIndex` symbol in `gpui-ce/crates`. Paint
order is scene insertion order plus explicit layers (`Window::paint_layer`,
`push_layer`); `gpui-ce`'s "Make opacity grouped" commit (#330) groups opacity,
not z-order. `gpui-ce` does not solve `z-50`.

**Verdict: A — GPUix binding/renderer patch, as already planned in 524 §5.**
Do not switch for this.

### 5.3 Backdrop-filter and content filter — real, renderer-coupled

`gpui-ce` has:

- `Style::filter: Vec<Filter>` and `Style::backdrop_filter: Vec<Filter>`
  (`crates/gpui/src/style.rs:378-382`);
- builder methods `.filter(...)` and `.backdrop_blur(...)`
  (`crates/gpui/src/styled.rs:92-105`);
- paint integration: `window.paint_backdrop_filter(...)`
  (`crates/gpui/src/style.rs:1019-1024`, implementation `window.rs:4575-4603`)
  and `window.with_filter_layer(...)` (`window.rs:4605`);
- a scene primitive `Primitive::BackdropFilter` and a batching pass
  (`scene.rs:378,401,746`);
- real backend implementations: Metal (`gpui_apple/src/metal_renderer.rs:1039`),
  WGPU (`gpui_wgpu/src/wgpu_renderer/frame.rs:423`), DirectX
  (`gpui_windows/src/directx_renderer.rs:605`).

This is genuine. But it is built on `gpui-ce`'s renderer rewrite:

- `crates/gpui_render/build.rs` compiles Rust-authored WGSL (`wgsl-rs`) into
  **MSL, HLSL, GLSL and WGSL** at build time;
- `crates/gpui_render/src/shaders/filters.rs` is the blur/filter shader;
- `crates/gpui_apple/src/metal_renderer.rs` is 2 978 lines and consumes those
  artifacts, versus the pin's 1 629-line hand-written `metal_renderer.rs` and
  `shaders.metal`.

The pinned GPUix stack has **no** `gpui_render` crate, **no** filter primitive,
and **no** blur shader in MSL/WGSL. Porting backdrop-filter means adding:

1. `Style` + `StyleRefinement` fields and painter;
2. `Scene` primitive, ordering, batching and ABI;
3. an offscreen isolation pass and render-target pooling in `gpui_apple` and
   `gpui_wgpu`;
4. a blur shader in **both** MSL and WGSL (and HLSL if Windows is in scope);
5. tests across the renderers.

**Verdict: B.** Not a cherry-pick. Keep `supports-backdrop-filter:backdrop-blur-*`
in `packages/tw`'s `unsupported` set with the reason "no filter primitive or
offscreen pass in the pinned renderer". If a product needs glass, plan a
single-target renderer project; do not port all of `gpui-ce`.

### 5.4 Percentage insets and auto margins — already in GPUI core

Both trees support the shapes:

- `Length::Auto` and `Length::Definite(DefiniteLength)`:
  `gpui-ce/geometry.rs:3734-3739`, pin `geometry.rs:3611-3616`;
- `DefiniteLength::Relative`/`Fraction`:
  `gpui-ce/geometry.rs:3580-3585`, pin `geometry.rs:3460-3465`;
- Taffy mapping to `LengthPercentageAuto::auto()`/`percent()`:
  `gpui-ce/taffy.rs:933-981`, pin `taffy.rs:529-577`;
- generated helpers: `.mx_auto()`, `.top_1_2()`, `.w_1_2()` from
  `gpui_macros/src/styles.rs:1214-1263,1318-1355,1594-1611` (both trees use the
  same macro shape; pin has `auto_allowed` and `suffix: "auto"`).

The gap is entirely in GPUix's JS boundary:

- `packages/native/src/style.rs:189-200`: `margin*: Option<f64>`,
  `top/right/bottom/left: Option<f64>`;
- `packages/native/src/renderer.rs:6332-6366`: every one maps through
  `gpui::px(...)`;
- `packages/native/js/host.ts:154-164`: `margin?: number`, `top?: number`, etc.

**Verdict: A — one GPUix binding patch.** Reuse the existing `DimensionValue`
(`Pixels | Percentage | Auto`, already used for width/height and mapped in
`renderer.rs:6142-6158`):

- `top/right/bottom/left` → `Option<DimensionValue>`; map `Auto` to `.top_auto()`
  (or the style field), `Percentage` to `.top(relative(v))`;
- `margin*` → `Option<DimensionValue>`; map `Auto` to `.m_auto()`/`.mx_auto()`,
  `Percentage` to `.m(relative(v))`;
- `host.ts` → `top?: number | string` (or a named `DimensionValue`), same for
  margins;
- `packages/tw/src/utilities.ts` → `top-1/2`/`left-1/2` become `{ top: "50%" }`
  / `{ left: "50%" }`, `mx-auto` becomes `{ marginLeft: "auto", marginRight:
  "auto" }`; remove the three entries from `unsupported.ts:128-129`.

This also fixes `top-1/2 left-1/2` centring in the current `Dialog`/`Popover`
recipes (`packages/tw/src/recipes.ts:55`). No GPUI change, no `gpui-ce`.

### 5.5 Outline / ring offset — the pin is better

The pin has a real CSS-shaped outline:

```rust
// git show 2565b8a:crates/gpui/src/style.rs:353-360
pub struct Outline {
    pub width: Pixels,
    pub color: Hsla,
    /// Gap between the border box and the line. Negative values draw it inside.
    pub offset: Pixels,
}
```

`Style::outline` is at `style.rs:296`; `Styled::outline` is at
`git show 2565b8a:crates/gpui/src/styled.rs:36-40`. GPUix `main` already exposes
it as `outlineWidth`/`outlineColor`/`outlineOffset`
(`packages/native/src/style.rs:225-229`, `js/host.ts:188-193`) and maps it in
`renderer.rs:6489-6500`. Published `0.10.0` does not, which is why plan 020
records it as missing.

`gpui-ce` replaced it with `RingStyle { width, color }` and `inset_ring`
(`style.rs:195-226`). There is **no offset field**. The outer ring dilates the
quad by the ring width (`RingStyle::outer_quad`), so it cannot express
`ring-offset-2` without a second shadow.

**Verdict: D (regression) + A.** Do not switch. Build the binding from GPUix
`main` (or wait for the next release), map `ring-offset-*` to `outlineOffset`
plus the ring colour, and remove `ring-offset-background` from
`packages/tw/src/unsupported.ts:120`. `gpui-ce` would make this worse.

### 5.6 Colour transitions and declarative style transitions — the one real win

`gpui-ce` adds an entire declarative animation layer:

- `Lerp` for colours, lengths, corners, shadows, text
  (`crates/gpui/src/lerp.rs`, 240 LOC);
- `Animated<T>` (`animated.rs`, 477 LOC), `Motion`/`Spring`
  (`motion.rs` 1 369 LOC, `spring.rs` 825 LOC), `Transition<T>`
  (`transition.rs`, 406 LOC);
- `StyleTransitions` (`style_transitions.rs`, 1 752 LOC) and its macro-generated
  builder (`gpui_macros/src/styles.rs:161-435`);
- the public fluent API:

  ```rust
  div()
      .transitions(|t| t.bg(millis(200)).text_color(millis(150)))
      .hover(|s| s.bg(hover_color))
  ```

  (`crates/gpui/src/elements/div.rs:920-932`; runnable example at
  `crates/gpui/examples/learn/style_transitions.rs:40-90`).

It handles hover/active/focus refinements because it applies to the resolved
`Style` during prepaint (`div.rs:4158-4172`), not in JS. It also honours
reduced-motion (`reduce_motion` is threaded through `style_transitions.rs`).

The pin has **no** `Lerp`, `Animated`, `Motion`, `Transition` or
`StyleTransitions`. It has spring physics (`spring.rs`) and the older
`AnimationExt::with_animation` (`elements/animation.rs:82-158`), but no
declarative style transitions.

GPUix's own `motion` interpolates only numbers
(`packages/native/src/motion.rs:37-51`: width, height, opacity, top/right/bottom/
left, border radius). It cannot animate a colour, and it only runs for JS-driven
`motion` props. A native `hover` colour switch is instant.

**Verdict: A (CPU-side, portable) but large.** Two honest options:

1. **Do not port now.** Keep `transition-*` in `unsupported` with the reason
   "native state styles switch instantly; GPUI has no style transitions". This
   is what the runtime actually does. Entrance/exit motion (the thing shadcn
   users notice) already works through GPUix `motion` with opacity/position.
2. **Port a minimal subset later** (see §7.2): `Lerp` + `Animated` + `Motion` +
   a reduced `StyleTransitions` for `bg`, `text_color`, `border_color`,
   `opacity` only. Drop ring/inset/corner/flex fields that the pin does not
   have. Estimated 1.5–2.5 k LOC after deletion, plus conflicts in
   `elements/div.rs` and `window.rs`. This is a focused GPUI patch, not a fork
   switch.

Do **not** describe `transition-colors` as supported until option 2 lands.

### 5.7 Accessibility — a small patch, not a reason to switch

The pin already has the hard part: `role`, `aria_label`, `aria_description`,
`aria_selected`, `aria_expanded`, `aria_toggled`, `aria_numeric_value`,
`aria_min/max_numeric_value`, `aria_level`, `aria_row/column_*`, etc.
(`git show 2565b8a:crates/gpui/src/elements/div.rs:1307-1468`, 22 methods).

`gpui-ce` adds five: `aria_disabled`, `aria_hidden`, `aria_live`,
`aria_live_atomic`, `aria_modal` (`elements/div.rs:1544-1767`, 27 methods).
Those are ~40 lines and map directly onto `accesskit::Node`.

GPUix's binding currently maps only 7 props
(`packages/native/src/accessibility.rs:39-59`, `js/host.ts:499-510`):
`aria-label`, `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`,
`aria-valuetext`, `aria-level`. The missing `aria-checked`,
`aria-valuenow/min/max` do **not** need `gpui-ce`: the pin already has
`aria_toggled` and `aria_numeric_value`/min/max. Map them in the binding.

**Verdict: A.** Binding patch for `aria-checked`/`aria-valuenow/min/max`; a tiny
GPUI patch for `aria_disabled`/`aria_hidden` if those are needed. `aria-labelledby`
and `aria-describedby` are absent in **both** GPUI forks; that is a separate
accesskit relation task, not a `gpui-ce` win.

### 5.8 Text rasterisation — a text-stack switch, not a patch

`gpui-ce` replaced the text layout system with **Parley**:

- `CHANGELOG.md`: "Default text layout system switched to parley";
- `crates/gpui_ce_parley/src/lib.rs` exposes `ParleyTextSystem`,
  `SystemFonts`, `SwashGlyphRasterizer`, `BitmapFallbackGlyphRasterizer`;
- `crates/gpui/src/text_system/` is split into font/line/layout/raster modules
  (10 962 LOC including `gpui_ce_parley`), and `line_layout.rs:338` explicitly
  references `gpui_ce_parley`;
- `scene.rs` has `SubpixelSprite` and `text_system/mod.rs` defines
  `SUBPIXEL_VARIANTS_X/Y`.

The pin has its own text system (`crates/gpui/src/text_system.rs` plus
submodules) and no Parley. The transform branch edits
`crates/gpui/src/text_system/line.rs` for subpixel raster regressions — a file
that is 1 025 lines at the pin and 474 lines in `gpui-ce`, with 3 conflict hunks
in the simulation.

There is no evidence in this audit that Parley improves *rasterisation quality*
on macOS; it is a shaping/layout/font-fallback rewrite. The `SubpixelSprite`
primitive already exists in the pin.

**Verdict: B.** Adopting Parley means switching the text system and porting
GPUix's custom input, selection, highlighting and `registerFont` code. It also
conflicts with the transform branch's text work. Do not port; revisit only if a
complex-script/bidi requirement appears.

### 5.9 Input / event model and web target — no meaningful delta

The base event types are identical between the two trees: `KeyDownEvent`,
`KeyUpEvent`, `ModifiersChangedEvent` (`interactive.rs:25-64` in both). The pin
already has `LongPressEvent` (`gestures.rs:171`). `gpui-ce` adds
`TouchDragEvent` (`gestures.rs:386-432`) and `on_drag_alt`/`on_drop_alt`
(`elements/div.rs:627-765`). Those are small, portable patches if touch/drag
becomes a requirement; they are not needed for shadcn conformance.

The web target is **not** a `gpui-ce` advantage: the pin already has
`crates/gpui_web` (`Cargo.toml` with `wasm_thread`, `wgpu`, `web-sys`) and the
same `gpui_platform` wasm entry points (`application()`,
`single_threaded_web()`, `web_init()`, `WebBackendPreference`) at
`gpui_platform/src/gpui_platform.rs:20-63`. GPUix already publishes a wasm
build (`packages/native` `browser.mjs` / `gpuix-web*.wasm`). `gpui-ce` has its
own `gpui_web` crate but adds no capability the pin lacks.

**Verdict: C/A.** No switch; port gestures only on demand.

### 5.10 Other `gpui-ce`-only features (not in our recorded gaps)

| Feature | Where | Why it is not a patch candidate now |
| ------- | ----- | ----------------------------------- |
| Squircle corner smoothing | `style.rs:365`, `styled.rs:1131`, `gpui_render/src/shaders/corner_smoothing.rs` (1 176 LOC) | Shader + renderer; cosmetic; shadcn uses plain radii. |
| Overflow fade mask | `style.rs:254`, `styled.rs:202`, `window.rs:2166` (`ContentMask.fade_out`) | Changes `ContentMask` and every renderer's mask shader; not a tw gap. |
| Configurable dashed border | `style.rs:351-357` | Pin already has solid/dashed; only dash length/gap is new; shader-level. |
| `text_transform`, `letter_spacing`, `font_width` | `style.rs:704-707`, `text_system/` | Text-system work; `letter_spacing` is the only small one. |
| `Mutex`-based `opacity` grouping (#330) | `scene.rs` paint grouping | Does not provide z-order; no component need. |

---

## 6. Integration cost of switching

This section answers "could we just point the binding at `gpui-ce`?" The answer
is no; the items below are ordered by blocking severity.

### 6.1 Crate layout and package names

`gpui-ce` is a standalone workspace with 24 crates. The main crate is
**package** `gpui-ce` with **lib name** `gpui` (`crates/gpui/Cargo.toml:2,47-49`),
which preserves `use gpui::…`. Everything else is renamed and aliased at the
workspace level (`Cargo.toml:242-256`):

```toml
gpui = { path = "./crates/gpui/", package = "gpui-ce", … }
gpui_platform = { path = "./crates/gpui_platform/", package = "gpui_ce_platform", … }
gpui_macos = { path = "./crates/gpui_macos/", package = "gpui_ce_macos", … }
gpui_apple = { path = "./crates/gpui_apple/", package = "gpui_ce_apple", … }
gpui_web = { path = "./crates/gpui_web/", package = "gpui_ce_web", … }
```

GPUix's `packages/native/Cargo.toml` points at
`../../zed/crates/{gpui,gpui_platform,gpui_macos,reqwest_client,http_client}`.
A switch means rewriting every path and adding `package =` aliases. Mechanical,
but it touches the build script, CI and every crate that names a zed crate.

### 6.2 macOS embedding — the hard blocker

GPUix embeds GPUI in Node/Bun and drives AppKit from the host loop:

- `gpui_macos::MacPlatform::new_embedded()`
  (`packages/native/src/renderer.rs:1177`);
- `Application::run_embedded(...)` (`renderer.rs:1191`);
- `MacPlatform::pump_events()` via the platform's embedded mode;
- `gpui_macos::set_frame_wake_hook(...)` (`renderer.rs:1489,1507`), the
  display-link wake hook added at the GPUix pin commit `2565b8a`.

`gpui-ce` has **none of these**:

- `MacPlatform::new(headless)` only (`crates/gpui_macos/src/platform.rs:225`);
- no `MacPlatformMode`, no `EmbeddedLifecycle`, no `pump_events`;
- no `set_frame_wake_hook` anywhere in the workspace.

`grep -rn 'new_embedded\|pump_events\|set_frame_wake_hook' "$HOME/GPUIXUI/references/gpui-ce/crates"`
returns nothing. The pin's implementation is at
`git show 2565b8a:crates/gpui_macos/src/platform.rs` (`new_embedded`,
`pump_events`, `MacPlatformMode`) and
`crates/gpui_macos/src/display_link.rs:107` (`set_frame_wake_hook`).

**Consequence:** switching means re-implementing the embedded AppKit lifecycle
and display-link pacing on `gpui-ce`'s `MacPlatformState`. That is the single
most delicate part of GPUix (plan 525's pin commit is literally the frame-wake
hook), and it blocks every native smoke test. This alone makes the switch a
new runtime project, not a dependency bump.

### 6.3 Renderer pipeline — the second hard blocker

The pin and `gpui-ce` render differently:

| Pin (`2565b8a`) | `gpui-ce` (`a8d3969`) |
| --------------- | --------------------- |
| `gpui_apple` Metal renderer, hand-written `shaders.metal`, `metal_renderer.rs` 1 629 LOC | `gpui_render` Rust shader DSL + Naga → MSL/HLSL/GLSL/WGSL; `metal_renderer.rs` 2 978 LOC |
| optional `runtime_shaders` (compile MSL through the OS at runtime) | no `runtime_shaders`; shaders are generated at build time by `wgsl-rs`/Naga |
| `gpui_wgpu` hand-written WGSL | `gpui_wgpu` consumes generated artifacts (`crates/gpui_render/build.rs`) |
| `gpui_macos` feature set includes `runtime_shaders` | `gpui_platform` feature set includes `macos-wgpu`, not `runtime_shaders` |
| GPUix build script applies `runtime_shaders` for darwin-x64 (`apps/playground/scripts/build-native-binding.sh`) | the script's `grep runtime_shaders` would fail; a new build path is needed |

The shader rewrite is why backdrop/filter/squircle/fade are cheap *inside*
`gpui-ce` and expensive *outside* it. It also introduces a pinned git dependency,
`wgsl-rs` (`Cargo.toml:183`, rev `b2de16a…`), which must be licence- and
supply-chain-reviewed before it enters our build.

### 6.4 `Style` / `Window` / `Scene` API differences

Concrete compile breaks in GPUix's binding if pointed at `gpui-ce`:

1. **`WindowOptions.window_background` is gone.** The pin has one cross-platform
   `window_background: WindowBackgroundAppearance`
   (`git show 2565b8a:crates/gpui/src/platform.rs:1924-1925`). `gpui-ce` replaces
   it with cfg-specific `macos_window_background`, `windows_window_background`,
   `linux_window_background`, `web_window_background`
   (`crates/gpui/src/platform.rs:2672-2686`). GPUix constructs
   `gpui::WindowOptions { window_background, … }` at
   `packages/native/src/renderer.rs:7510-7542`, so this is a hard error.
2. **`gpui::Outline` is gone.** GPUix calls
   `el.outline(gpui::Outline { width, color, offset })`
   (`renderer.rs:6489-6500`). `gpui-ce` has `RingStyle { width, color }`
   (`style.rs:195-200`) and no `Outline` type; the call must be rewritten to
   `ring(width)`/`ring_color(color)` and loses the offset.
3. **`Style.border_color` type changed** from `Option<Hsla>` (pin) to
   `Option<Background>` (gpui-ce), which is a gradient-capable type. GPUix's
   `el.border_color(color)` may still resolve through `Into`, but any code that
   reads/writes the field needs attention.
4. **New `Primitive` variants** (`BackdropFilter`, `FilterBoundary`) and a new
   `ContentMask.fade_out` (`window.rs:2166`) change exhaustive matches in any
   custom element or scene consumer. GPUix's custom elements use `paint_quad`
   and `Element`, not `Primitive` directly, so this is mostly confined to the
   fork's own code — but it is exactly the code transform would touch.
5. **`Element` trait a11y defaults differ** (`gpui-ce` adds `is_a11y_hidden`,
   `_accessibility.rs` docs). GPUix's custom elements implement
   `write_a11y_info`; they should still compile, but the default tree shape
   changes are observable in the AccessKit dump.
6. **`WindowInsets`/`Window::insets()` are present in both**, so the inset API
   is not a blocker.

### 6.5 Text and input

`gpui-ce` keeps the names `TextLayout`, `TextRun`, `StyledText`,
`EntityInputHandler`, so GPUix's imports may resolve. But the implementation is
Parley-backed and the layout/raster contracts changed (`text_system/line.rs`
1 025 → 474 lines; `line_layout.rs` 1 546 LOC). GPUix's
`packages/native/src/custom_elements/input.rs` implements selection, IME,
marked text and painting against the pin's text system; that needs a port and a
new native test pass. This is not a compile-only change.

### 6.6 HTTP and assets

GPUix depends on two Zed crates that **do not exist** in `gpui-ce`:

- `reqwest_client` (the updater and image loader use it:
  `packages/native/src/updater.rs:205-210`,
  `custom_elements/img.rs:123-128`);
- `http_client` (`updater.rs:30-94`).

`gpui-ce` has a `gpui::http_client` module for the runtime's own client, but no
`reqwest_client` crate and no `http_client` crate with `AsyncBody`/`HttpRequestExt`.
A switch means rewriting the updater and image loading onto a new client
(`gpui_ce_web::FetchHttpClient` on wasm; something else on desktop) — another
project.

### 6.7 Distribution

- No tags, no GitHub releases; crates.io `gpui-ce` is **0.2.2 (2026-08-28)**,
  0.3.x are yanked, and `gpui_ce_parley`/`gpui_ce_render` are not on crates.io.
- The features that make `gpui-ce` interesting (Parley, style transitions,
  backdrop, corner smoothing) are all **post-0.2.2**. Consumers must pin a git
  commit or vendor the workspace.
- A component library cannot require a git-only runtime without owning the
  build and prebuilds for every target. GPUix already has that problem for
  transform (plan 525 gate 2); switching would add a second one.

### 6.8 Licence

No new licence obstacle: Apache-2.0 throughout, no GPL/AGPL files. The cost is
provenance, not permission. A switch would also need a fresh `NOTICE` surface
for the Rust-DSL shader pipeline and its `wgsl-rs` git dependency.

---

## 7. What is portable as a patch (ranked)

### 7.1 P0 — do now, GPUix-side only (no GPUI fork)

| # | Patch | Files | Effort | Test |
| - | ----- | ----- | ------ | ---- |
| P0.1 | Percentage insets + auto margins | `references/gpuix/packages/native/src/style.rs` (`top/right/bottom/left`, `margin*` → `DimensionValue`), `renderer.rs:6332-6366`, `js/host.ts:154-164`, `packages/tw/src/utilities.ts`, `packages/tw/src/unsupported.ts:128-129` | 0.5–1 day | Rust unit tests for each variant; TS tests for `top-1/2`, `left-1/2`, `mx-auto`; a focused native smoke scenario for centring |
| P0.2 | `zIndex` / sibling paint + hit-test order | plan 524 §5 (GPUix `StyleDesc` + renderer) | 1–2 days | overlay scenario: a `z-50` surface paints above a later sibling and receives the click |
| P0.3 | Outline / ring offset | publish/use GPUix `main` binding; map `ring-offset-*` in `packages/tw`, remove `unsupported.ts:120` | 0.5 day | focus ring visual + `getElementBounds`/hit test; verify `outlineOffset` moves the ring without moving layout |
| P0.4 | ARIA props | `packages/native/src/accessibility.rs:39-59`, `js/host.ts:499-510`; map `aria-checked` → `aria_toggled`, `aria-valuenow/min/max` → `aria_numeric_value`/min/max | 0.5 day | AccessKit dump assertions for checkbox/switch/slider |
| P0.5 | Colour animation for JS-driven styles (optional) | `packages/native/src/motion.rs:37-51`, `style.rs`, `js/host.ts` | 1 day | motion test: `backgroundColor` at 50% is between endpoints; hover still switches instantly (documented) |

P0.1–P0.4 are the honest fixes for the tw `unsupported` entries that are not
renderer-bound. They do not touch `references/` and do not need `gpui-ce`.

### 7.2 P1 — conditional GPUI patch (only if a component needs native hover colour)

**Minimal style-transition port.** Do not cherry-pick the whole feature. Port
the CPU-side core and only the properties the components use:

- new: `crates/gpui/src/lerp.rs`, `animated.rs`, `motion.rs` (or a reduced
  duration/easing-only version), `style_transitions.rs`;
- extend: `crates/gpui/src/spring.rs` (pin already has the physics),
  `gpui_macros/src/styles.rs` (the transition builder), `elements/div.rs`
  (apply before prepaint/paint), `window.rs` (transition context + reduced
  motion), `style.rs` (only the fields that exist in the pin);
- **drop** the `ring`/`inset_ring`, `corner_smoothing`, `filter`,
  `backdrop_filter`, and `Length::Auto` inset branches that the pin lacks;
- start with `bg`, `text_color`, `border_color`, `opacity` — this covers
  shadcn's `transition-colors` and `transition-opacity`.

Estimate: 1.5–2.5 k LOC after deletion, 2–4 files with semantic conflicts
(`div.rs`, `window.rs`, `styles.rs`). A spike must prove:

1. `cargo check -p gpui` and the gpui tests (do not run in this research task);
2. a hover colour transition in the real binding;
3. reduced-motion disables it;
4. no regression in the existing `apply_styles` path.

If the spike fails or the LOC grows past ~3 k, keep `transition-*` unsupported
and stop. A component library does not need a physics engine.

### 7.3 P2 — do not port without a renderer project

- backdrop-filter / content filter;
- squircle corner smoothing;
- overflow fade mask;
- configurable dashed borders.

Each is coupled to `gpui_render`'s generated shader pipeline or `ContentMask`'s
fade field. Porting means writing MSL + WGSL (+ HLSL) and an offscreen
isolation pass by hand. That is a standalone renderer plan with its own gate,
not a patch to bundle with a components milestone.

### 7.4 P3 — transform stays on plan 525

`gpui-ce` does not provide `ElementTransform`; its `scene.rs`/`window.rs` make
the transform port harder (§3). The decision in plan 525 is unchanged: port the
0xErwin1 branch to the GPUix pin, or ship the fade + top/left fallback. Do not
route transform through `gpui-ce`.

---

## 8. Decision point

### 8.1 The three options

| Option | What it means | Cost | Verdict |
| ------ | ------------- | ---- | ------- |
| **Use `gpui-ce`** | Replace the zed submodule/binding base with `gpui-ce` `a8d3969` | Re-implement embedded macOS, port `WindowOptions`/`Outline`/`WindowBackground`, replace `reqwest_client`/`http_client`, port input/text selection, port transform, own a git-only runtime and its prebuilds | **Rejected.** Blocked by §6.2/§6.3; loses pin-only work; no transform. |
| **Port individual patches** | Keep the GPUix pin; add the binding-level patches in §7.1; optionally the style-transition subset in §7.2 | 2–4 days for P0; 1–2 weeks for P1 if justified; renderer features deferred | **Recommended.** Smallest honest path; keeps plan 525 viable. |
| **Stay on upstream/transform** | Do nothing new; keep the current fallback and plan 525's fork gate | Zero now; transform remains blocked on distributability | **Default.** Correct until a component needs a P0/P1 feature. |

### 8.2 Decision gates

**Gate 1 — is there a component requirement?**
Only port a `gpui-ce` feature when a shipped component cannot meet its contract
without it. Today:

- dialog/popover/toast entrance motion → GPUix `motion` suffices (fade + slide);
- hover colour transition → not required for correctness; instant state is
  acceptable and must be documented;
- backdrop blur / squircle → cosmetic, no component requires it;
- transform/zoom → plan 525's gate 2, not `gpui-ce`.

**Gate 2 — is the port CPU-side?**
If the feature touches `gpui_render`, `gpui_apple` shaders, `ContentMask` or the
text system, it is a renderer/text project. Stop and write a new plan; do not
fold it into a components milestone.

**Gate 3 — is the switch surface complete?**
A switch becomes discussable only when **all** of these exist:

1. an embedded macOS mode (`new_embedded` + `pump_events`) and a frame-wake hook;
2. `WindowOptions` compatibility or an adapter for `window_background`;
3. an `Outline` equivalent with `offset` (or GPUix accepts `ring` semantics);
4. `reqwest_client`/`http_client` equivalents, or GPUix's HTTP layer is ported;
5. a Parley-era input/selection port with native tests;
6. a transform port to `gpui-ce`'s scene/renderer;
7. tagged releases and prebuilds for GPUix's targets.

As of 2026-10-18, **zero of the seven** are satisfied. Do not open a switch
branch.

### 8.3 Signals to revisit

1. GPUix adopts one of these features upstream (then the port is free).
2. `gpui-ce` adds an embedded macOS mode and a `WindowOptions`/`Outline`
   compatibility layer.
3. A product requirement appears for backdrop blur, squircle corners, or
   complex-script text.
4. Plan 525's transform fork ships, changing the runtime baseline.

When a signal fires, re-run §3 against the new pins before §7.

---

## 9. STOP conditions

1. **A switch is proposed without §6.2 and §6.3 being solved.** Stop; the
   binding cannot run on macOS. Report the missing `new_embedded`/`pump_events`/
   `set_frame_wake_hook` symbols.
2. **A patch edits `references/`.** Stop. Clone to
   `.agents/slop/scratch/` and patch there; `references/` is read-only.
3. **A port reaches `gpui_render` shaders, `gpui_apple` MSL, `ContentMask.fade_out`
   or the Parley text system.** Stop; that is a new renderer/text plan, not a
   component patch.
4. **Transform is treated as a `gpui-ce` feature.** Stop; it is absent and the
   conflict surface doubles. Use plan 525.
5. **The published `gpui-ce` 0.2.2 is used.** Stop; it predates Parley,
   transitions, backdrop and corner smoothing, and the internal crates are not
   published.
6. **The `gpui-ce` tip is not `a8d3969…`.** Re-audit before citing this plan;
   the capability matrix may have moved.
7. **The GPUix zed pin is not `2565b8a…`.** Re-audit §§5–7; `WindowOptions`,
   `Outline` and the embedded hooks are pin-sensitive.
8. **A copied file carries GPL/AGPL or an unknown licence.** Stop; do not copy.
   Record the file and the licence text.
9. **A build, `cargo` command, or native smoke run is requested inside this
   research task.** Stop; this plan is source-audit only. Implementation plans
   own the build gates.

---

## 10. Licence and provenance

### 10.1 Record for any copied code

| Source | Commit | What may be copied | Licence |
| ------ | ------ | ------------------ | ------- |
| `gpui-ce/gpui-ce` | `a8d3969d5478fa0b8f6c0bd20f12869b39db2601` | `crates/gpui/src/{lerp,animated,motion,transition,style_transitions}.rs` subsets; `gpui_macros/src/styles.rs` transition builder; ARIA methods | Apache-2.0 |
| `gpui-ce/gpui-ce` | same | **not recommended:** `crates/gpui_render/src/shaders/*`, `crates/gpui_apple/src/metal_renderer.rs` | Apache-2.0 + MIT (`figma-squircle`) |
| GPUix `remorses/zed` | `2565b8a3…` | base fork; unchanged files | Apache-2.0 |
| `0xErwin1/zed` transform branch | `fc4c1586…` | transform patch (plan 525) | Apache-2.0 |

### 10.2 Obligations

1. Add a `LICENSES/provenance.md` row before the first copied line lands:
   source URL, commit, files, what changed, licence.
2. Keep the Apache-2.0 text; add a `NOTICE` entry naming Zed Industries (GPUI
   base) and the gpui-ce contributors (ported changes).
3. If the corner-smoothing shader is ever copied, carry the `figma-squircle`
   MIT notice from `crates/gpui_render/THIRD_PARTY_NOTICES.md`.
4. Do not use the GPUI-CE, Zed or GPUI marks as our identity.
5. The repository's own distribution licence is still undecided (plan 525
   §5.4). That is an owner decision; this plan adds no new obligation beyond
   Apache-2.0 attribution.

---

## 11. Acceptance criteria

**Research (this plan):**

- [x] `references/gpui-ce` cloned; tip `a8d3969`, branch `main`, date and
      commit count recorded (§2).
- [x] Licence verified from `LICENSE.md` and per-crate `Cargo.toml`; no GPL/AGPL
      (§2.4).
- [x] Repo health measured: stars, forks, issues, last commit, commits/authors,
      releases, crates.io (§2.3).
- [x] Feature matrix covers transform, zIndex, backdrop, percentage/auto,
      outline/ring, colour transitions, a11y, text, input, web, animation (§4).
- [x] Every claim cites a file and line or a pinned command (§4, §5).
- [x] Patch-vs-switch classification with integration cost (§6–§7).
- [x] Decision point and STOP conditions (§8–§9).
- [x] No app/component code changed; no build run.

**Implementation (later plans, not this one):**

- [ ] P0.1 percentage/auto binding + tw classes; tests in both directions.
- [ ] P0.2 `zIndex` paint/hit-test ordering; overlay scenario.
- [ ] P0.3 outline/ring-offset mapping from GPUix `main`.
- [ ] P0.4 ARIA `checked`/`valuenow`/`min`/`max` mapping; AccessKit dump test.
- [ ] P1 style-transition spike **only if** a component requirement exists;
      otherwise keep `transition-*` unsupported and document the limitation.
- [ ] `LICENSES/provenance.md` row for any copied `gpui-ce` code.

---

## 12. One-page command summary

```sh
# clone / audit (read-only)
cd /Users/cyberistic/GPUIXUI/references
git clone --depth 1 https://github.com/gpui-ce/gpui-ce.git gpui-ce
cd gpui-ce
git fetch --unshallow origin main
git rev-parse HEAD                         # a8d3969d5478fa0b8f6c0bd20f12869b39db2601
git log -1 --format='%H %ci %s'
git log --first-parent --format='%h %ci %s' -20
git log --grep='Sync/zed'

# licence
head -5 LICENSE.md
grep -n 'license' Cargo.toml crates/gpui/Cargo.toml
grep -rn 'GPL\|General Public License' crates --include='*.rs' --include='Cargo.toml'

# capability probes
rg -n 'ElementTransform|with_style_transform' crates/gpui/src
rg -n 'z_index|zIndex' crates
rg -n 'backdrop_filter|backdrop_blur' crates/gpui/src/style.rs crates/gpui/src/styled.rs
rg -n 'overflow_fade|corner_smoothing|text_transform|letter_spacing' crates/gpui/src
rg -n 'new_embedded|pump_events|set_frame_wake_hook' crates
rg -n 'runtime_shaders' crates Cargo.toml
rg -n 'pub struct Outline|pub struct RingStyle' crates/gpui/src/style.rs

# pinned comparisons
git -C /Users/cyberistic/GPUIXUI/references/transform-zed show 2565b8a:crates/gpui/src/style.rs > /tmp/pin-style.rs
diff -u /tmp/pin-style.rs crates/gpui/src/style.rs | head -100

# transform-port simulation (expects 28 hunks)
S=/tmp/transform-merge-gpui-ce
mkdir -p "$S"
for f in crates/gpui/src/{elements/div.rs,scene.rs,style.rs,styled.rs,text_system/line.rs,view.rs,window.rs}; do
  n=$(echo "$f" | tr '/' '_')
  git -C /Users/cyberistic/GPUIXUI/references/transform-zed show 251456cf:"$f" > "$S/$n.base"
  git -C /Users/cyberistic/GPUIXUI/references/transform-zed show fc4c1586:"$f" > "$S/$n.theirs"
  cp "/Users/cyberistic/GPUIXUI/references/gpui-ce/$f" "$S/$n.ours"
  git merge-file -L gpui-ce -L base -L erwin -p "$S/$n.ours" "$S/$n.base" "$S/$n.theirs" > "$S/$n.merged" || true
done
grep -c '^<<<<<<<' "$S"/*.merged
```

**No build commands here.** Implementation plans own `cargo check`,
`cargo nextest`, and the native smoke runs.

---

## 13. Results (2026-10-18)

- **Clone:** `references/gpui-ce` at `a8d3969` (2026-10-17), full history
  (35 964 commits, 292 MiB `.git`).
- **Health:** active — 1 373 stars, 151 forks, 34 open issues, 76 first-parent
  commits / 16 authors since the 2026-09-03 zed sync. No tags or GitHub
  releases; crates.io `gpui-ce` is 0.2.2 (2026-08-28), predating every feature
  in this plan.
- **Licence:** Apache-2.0 (`LICENSE.md`, every crate, cargo-deny CI), no
  GPL/AGPL; `figma-squircle` MIT notice only in the shader crate.
- **Transform:** absent in `gpui-ce`; the pin-only transform branch remains the
  source. Porting it to `gpui-ce` produces **28 conflict hunks in 7 files**,
  double the 14 against the pin.
- **zIndex:** absent in both; GPUix-side layer patch (plan 524 §5) remains.
- **Percentage insets / auto margins:** already in GPUI core in both trees; the
  gap is GPUix's `StyleDesc` (`number` → `DimensionValue`). Small binding patch.
- **Outline/ring offset:** pin has `Outline { offset }`; `gpui-ce` regressed to
  `RingStyle { width, color }` with no offset. GPUix `main` already exposes the
  pin's outline; `0.10.0` does not.
- **Colour transitions:** `gpui-ce` has a real declarative implementation, but
  ~4 k LOC and entangled with `div`/`window`. Port a minimal `bg`/`text`/
  `border`/`opacity` subset only if a component needs native hover animation.
- **Backdrop/filter/squircle/fade:** present in `gpui-ce`, coupled to its
  Rust-DSL shader pipeline (`gpui_render` + `wgsl-rs` + Naga). Not portable to
  the pin without a renderer project.
- **Text:** Parley migration is a text-stack switch, not a patch; it conflicts
  with the transform branch's `text_system/line.rs` work.
- **Events/web/a11y:** base events identical; `gpui-ce` adds touch-drag and
  four ARIA methods; web target already exists at the pin. No switch value.
- **Switch verdict:** **rejected.** Blocked by the missing embedded macOS
  lifecycle (`new_embedded`/`pump_events`/`set_frame_wake_hook`), the renderer
  rewrite, `WindowOptions`/`Outline` API breaks, and the missing
  `reqwest_client`/`http_client` crates — and it still would not give transform.
- **Recommended next step:** stay on the GPUix pin + plan 525; land P0.1–P0.4
  as GPUix binding patches; keep renderer features unsupported with evidence;
  revisit only when a real component requirement or an upstream adoption
  appears.
