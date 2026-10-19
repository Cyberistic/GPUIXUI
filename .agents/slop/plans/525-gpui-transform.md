# 525 — GPUI transform/scale: audit the 0xErwin1 branch, merge surface, and the fallback

| Field | Value |
| ----- | ----- |
| Status | **research complete + optional patch ported** — `patches/gpui/0001-transform.patch` compiles and passes the GPUI lib tests; the fork is still not distributable, so the fallback remains the shipping path. |
| Phase | infra (renderer capability) |
| Owner | a dedicated `transform` workstream; reviewed by the components owner |
| Depends on | `020` (GPUix runtime capability), `524` (the `unsupported` channel), `140` (darwin-x64 binding) |
| Sources | `0xErwin1/zed` @ `fc4c1586…` (**Apache-2.0** `crates/gpui`); `remorses/zed` `gpuix` @ `2565b8a3…`; `zed-industries/zed` main @ `56934ec0…` (2026-10-17); `remorses/gpuix` @ `515df19` |
| Reference clone | `/Users/cyberistic/GPUIXUI/references/transform-zed` (treeless, read-only; §2) |
| Feeds | `packages/tw`'s `unsupported` set; Dialog/Popover/Toast/menu motion; `COMPONENTS.md` GPUix-support column; a `PLAN.md` decision row |

---

## 1. Verdict first

**The branch is real, self-contained and buildable in principle, but it is not a
drop-in.** It is based on GPUI from **2026-05-20**; the pinned GPUix fork is from
**2026-10-16** and contains **1 866 upstream commits plus 61 GPUix commits** on
top of that base. The branch touches **7 files**; a three-way merge against the
pin produces **14 conflict hunks in 7 files**; **three files need semantic
porting** (`view.rs`, `window.rs`, `div.rs`), the rest are import lists and
test-module placement.

| Question | Answer |
| -------- | ------ |
| Is the branch based on a compatible GPUI revision? | **Yes by ancestry** — its base `251456cf` is an ancestor of the GPUix pin. No forked ABI; the same `Style`, `Window` and `Scene` types. |
| Commits ahead / behind | Branch: **17 commits** (11 non-merge). GPUix fork: **61 commits** ahead of its upstream base `1d7e5f1d`, **771 behind** `zed-industries/main` as fetched 2026-10-18. Merge base: `251456cf`. |
| Conflict surface | 7 files, 14 hunks; 3 files need real porting (`view.rs`, `window.rs`, `div.rs`); 1 new-field hazard (`Shadow.element_bounds`). |
| Is it mergeable? | **Needs port, not blocked.** Bounded: one merge commit, one focused day for a careful Rust engineer, plus binding + smoke work. |
| Does it give rotate? | **No.** The public `ElementTransform` exposes `translate`, `scale`, `origin` only. `TransformationMatrix::rotate` exists but is not reachable from a style, and quads/shadows/underlines only transform their *bounds* — a rotated box would render as an axis-aligned box. **Do not expose rotate.** |
| Ship it now? | **No.** A component library cannot require an unmerged fork of two repositories with no published binaries. Adopt the **fallback** (§7) until the decision gate passes. |

**Recommended path, in order:**

1. **Do the zed merge and build it** (§6.1–§6.3) — it is cheap and answers the
   only question that matters: does the branch survive contact with the GPUix
   fork? Keep it on a branch; do not publish.
2. **Do not expose `transform` in GPUix's `StyleDesc` yet** unless step 1 is
   green and the owner accepts a forked runtime (§7, gate 2).
3. **Ship the fallback now**: fade + `top`/`left` slide, no zoom; keep
   `scale-*`/`zoom-*`/`rotate-*` in `packages/tw`'s `unsupported` set (plan 524).
4. Revisit when upstream accepts [#53306](https://github.com/zed-industries/zed/discussions/53306)
   or when four-platform prebuilds of a forked GPUix are feasible.

---

## 2. Pinned sources and the reference clone

### 2.1 The audit clone (already created; do not re-clone)

`/Users/cyberistic/GPUIXUI/references/transform-zed` is a **treeless**
(`--filter=tree:0`) clone with **no working tree**. Read files with
`git show <sha>:<path>`; never check out or edit this clone.

```sh
git clone --filter=tree:0 --no-checkout --single-branch \
  --branch feature/53306-07-text-raster-subpixel-regressions \
  https://github.com/0xErwin1/zed \
  /Users/cyberistic/GPUIXUI/references/transform-zed

cd /Users/cyberistic/GPUIXUI/references/transform-zed
git remote add gpuix    https://github.com/remorses/zed
git remote add upstream https://github.com/zed-industries/zed

git fetch --filter=tree:0 gpuix 2565b8a3e33537c3d3f56d0d45f11e50a17e512d
git fetch --filter=tree:0 upstream main
```

### 2.2 The SHAs (read 2026-10-18)

| Ref | SHA | Date | Subject |
| --- | --- | ---- | ------- |
| Branch tip | `fc4c1586647ad987cb88bf96e1fb4e543f4bdaca` | 2026-05-20 | merge `…06-text-raster-core` into `…07-text-raster-subpixel-regressions` |
| Merge base | `251456cf20887b91e0ba2d507b47ace14d4c24ff` | 2026-05-20 | upstream `main` at the branch's base |
| GPUix zed pin | `2565b8a3e33537c3d3f56d0d45f11e50a17e512d` | 2026-10-16 | `gpui_macos: Add a display-link frame wake hook` |
| GPUix upstream base | `1d7e5f1d014acf0d288c6d11be93c31fe647e725` | 2026-08-26 | `gpui_windows: Fix window placement…` |
| Upstream main | `56934ec0560bce8929025497411de7f5322fb6ca` | 2026-10-17 | `acp_thread: Apply v2 metadata patches by key` |

Commands that produced the compatibility numbers:

```sh
git merge-base fc4c1586 2565b8a                     # 251456cf…
git rev-list --left-right --count 2565b8a...fc4c1586  # 1866  17
git rev-list --left-right --count 2565b8a...upstream/main  # 61  771
git diff --stat 251456cf..fc4c1586                # 7 files, +1771 −131
git diff --stat 251456cf..2565b8a -- <the 7 files>  # +4759 −608 in the same files
```

### 2.3 The branch's 17 commits

Non-merge commits (oldest first): `c2befe68`, `7c436f1e`, `443bb34a`,
`b07122d0`, `ad2af86f`, `ae73a347`, `36feb8ae`, `9195524a`, `e3e2cf19`,
`7c272a27`, `95dcd1c4`; plus the stacked merge commits `8b803b9c`, `0c2136bb`,
`e152d4ad`, `3b94f67d`, `045c7c97`, `fc4c1586`. Author: **Ignacio Perez
`<ignacio@feuer.me>`** (`0xErwin1`). No `Signed-off-by`, no per-file copyright
headers, no CLA recorded (see §5).

### 2.4 What the branch changes

`git diff --stat` counts changed lines (additions + deletions):

```
crates/gpui/src/elements/div.rs       141
crates/gpui/src/scene.rs              390
crates/gpui/src/style.rs               64
crates/gpui/src/styled.rs              10
crates/gpui/src/text_system/line.rs     57
crates/gpui/src/view.rs                 61
crates/gpui/src/window.rs             1179
                              total: +1771 −131
```

No `Cargo.toml`, no public re-export file, no other crate. `Style`'s `pub use
style::*` already exports the new type.

---

## 3. What the implementation actually does

### 3.1 Public API (the only surface a consumer gets)

```rust
// crates/gpui/src/style.rs
pub struct Style {
    /// The transform applied to this element and its descendants after layout.
    pub transform: Option<ElementTransform>,
    // …
}

/// A 2D transform applied to a styled element subtree after layout.
pub struct ElementTransform {
    matrix: TransformationMatrix, // private
    origin: Point<f32>,           // private, fractions of the element's bounds
}

impl ElementTransform {
    pub fn translate(self, offset: Point<Pixels>) -> Self;
    pub fn scale(self, scale: Size<f32>) -> Self;
    pub fn origin(self, origin: Point<f32>) -> Self;
}

// crates/gpui/src/styled.rs — added to `trait Styled`
fn transform(self, transform: ElementTransform) -> Self;
```

Usage (from the discussion and the tests):

```rust
div()
    .relative()
    .size_full()
    .transform(
        ElementTransform::default()
            .translate(pan)
            .scale(size(zoom, zoom)),
    )
    .children(children)
```

**There is no `rotate` method.** `TransformationMatrix` (scene.rs) has
`rotate`, but `ElementTransform` never exposes it, and `Primitive::transform`
only bounds-transforms quads/shadows/underlines (see §3.5). Rotation is out of
scope; adding it would need quads painted as paths (or a new quad shader) — a
different project.

### 3.2 Semantics

- **Layout is untouched.** Taffy lays out in base coordinates; the transform is
  resolved at prepaint/paint from the element's *layout* bounds. Children do not
  multiply positions, sizes or font sizes.
- **Origin** is a fraction of the element's bounds: `(0,0)` is the top-left,
  `(0.5,0.5)` the centre. `ElementTransform::default()` has origin `(0,0)`.
  GPUix should default to **`(0.5, 0.5)`** in its JS API to match CSS/shadcn
  (`zoom-in-95` scales about the centre).
- **Composition order** is `translate` then `scale` (CSS
  `transform: translate(…) scale(…)`): `M = T · S`, applied about the origin.
  `origin` is last-writer-wins (it is a point, not a matrix).
- **Nesting composes** parent·child through a `Window` transform stack.
- **State styles** (`hover`/`active`/`focusVisible`) can carry a transform
  because they are `StyleRefinement`s. They switch instantly; GPUI does not
  interpolate state styles.
- `ElementTransform::resolve(bounds, scale_factor)` scales translation and the
  origin into device pixels; translation units are logical pixels.

### 3.3 The pipeline changes

| Area | Change |
| ---- | ------ |
| `div.rs` | `Interactivity::prepaint` and `paint` wrap their bodies in `window.with_style_transform(style.transform, bounds, …)`. Only `div`/`text` (which GPUix builds as a `div`) read `Style::transform`. |
| `window.rs` | `transform_stack` on `Window`; `current_transform`, `with_transform`, `with_style_transform`; every `paint_*` routes through `Window::insert_primitive`, which calls `Scene::insert_transformed_primitive`. `DeferredDraw` captures `transform`, and `prepaint_deferred_draws`/`paint_deferred_draws` restore it. `with_content_mask` transforms the mask on entry; `paint_layer`/`push_layer` transform layer bounds. |
| `scene.rs` | `transform_stack` on `Scene` (for replay); `Primitive::transform`; `transform_bounds` (axis-aligned hull of the four transformed corners); `TransformationMatrix::{inverse, apply_scaled}`; `Path::transform` (vertices); serde derives on `TransformationMatrix`. |
| hit testing | `insert_hitbox` stores the **transformed** visual bounds, plus a `HitboxTransformMetadata { id, local_bounds, inverse_transform, scale_factor }` when the transform is non-unit. `Frame::hit_test` inverse-maps the pointer into local space and tests `local_bounds`. Metadata is replayed with the hitboxes on prepaint reuse. |
| culling | `Scene::insert_transformed_primitive` culls on `visual_bounds()` (the transformed sprite bounds) instead of raw bounds, so translated/scaled sprites and glyphs are not discarded. |
| text raster | `transform_raster_multiplier`: max axis scale, quantised to `0.125`, clamped **1.0…4.0**. Glyph/emoji `RenderGlyphParams.scale_factor` is multiplied by it; the sprite bounds are divided by it so the matrix does the final scaling (no double scale). |
| subpixel policy | Subpixel (LCD) AA is allowed only when the transform is unit **or** a uniform positive **integer** scale, with no rotation/skew and finite values. Fractional (0.95) and anisotropic scales fall back to grayscale AA. |
| view cache | `ViewCacheKey`/`ViewElementCacheKey` includes the current transform, so a cached subtree cannot be reused with a different matrix. |
| replay | `Scene::replay` inserts primitives with the unit transform because the primitives are already transformed; layers are replayed with their pre-transformed bounds. |

### 3.4 Tests the branch adds

**27 new tests** (18 in `window.rs`, 5 in `scene.rs`, 2 in `view.rs`, 2 in
`text_system/line.rs`). They cover: style-level translate/scale/origin, nested
origins, `with_transform` on a painted quad, deferred draw scoping and z-order,
content-mask/layer transformation, hit testing (translate + scale + inverse
mapping), prepaint-reuse metadata, non-transformed hit testing unchanged, glyph
and sprite culling, raster multiplier quantisation/clamping and translation
independence, sprite-bounds compensation, subpixel policy, and transformed
glyph visual bounds.

**Not reproduced here.** The author reports
`cargo nextest run -p gpui`, `cargo fmt --check`, `./script/clippy -p gpui` and
`cargo check -p gpui` green. Treat that as author-reported until §6.3 runs it.

### 3.5 Honest limitations (do not paper over these)

1. **No rotation.** Public API omits it; quads/shadows/underlines only get their
   bounds transformed, so a rotation would render an axis-aligned box. Text
   sprites *do* carry a full matrix, which would make rotated text sit on an
   unrotated background — worse than no rotation.
2. **Scale is not fully geometric for box decorations.** `Primitive::transform`
   for `Quad` changes only `bounds`; `corner_radii`, `border_widths`, and
   `border_style` are unchanged. A 2× scaled card gets 1× border thickness and
   1× corner radius in device pixels. `Shadow.blur_radius` is not scaled either.
   For entrance/exit scales (0.95→1) this is invisible; for a 0.25×–4× camera it
   is wrong.
3. **`PolychromeSprite` / `PaintSurface` are bounds-only.** Images/emoji scale
   and translate correctly; they cannot rotate.
4. **Text AA pops at the end of a fractional-scale animation.** 0.95 disables
   subpixel; 1.0 re-enables it. Safer than misaligned RGB, but visible on some
   displays.
5. **Raster cap is 4×.** Above 4× text is a 4× raster upscaled by the matrix
   (soft).
6. **Only `div` (and `text`, which GPUix builds as a div) honour
   `Style::transform`.** `img`, `svg`, `input`, `virtual-list` and custom
   elements write the field and ignore it. GPUix must document this; components
   should transform a plain wrapper `div`.
7. **`<anchored>` positions in layout space.** Anchored/floating layers read
   GPUI layout bounds, which the transform does not change. A popup mounted
   *inside* a transformed subtree will be positioned in layout coordinates and
   then visually transformed. Rule: overlays portal to the root; never nest
   `<anchored>` in a scaled subtree.
8. **Hit-test metadata lookup is a linear scan** (`find` over transformed
   hitboxes). Fine for a dialog or a modest graph; a 10 000-node zoomed canvas
   would want an id→metadata map.
9. **GPUix text selection inside a transformed container is unverified.** Review
   `packages/native/src/text/selection.rs` before claiming selection under
   transform.

---

## 4. Compatibility with the GPUix pin

### 4.1 Method

A full `git merge-tree` would require materialising the whole zed tree
(several GB through the treeless promisor). It is unnecessary: **a conflict can
only occur in a file both sides changed, and the branch changes exactly 7
files.** Those 7 files were merged individually with the real three-way merge:

```sh
S=.agents/slop/scratch/merge
for f in crates/gpui/src/{elements/div.rs,scene.rs,style.rs,styled.rs,text_system/line.rs,view.rs,window.rs}; do
  n=$(echo "$f" | tr '/' '_')
  git show 251456cf:"$f" > "$S/$n.base"
  git show 2565b8a:"$f"  > "$S/$n.ours"
  git show fc4c1586:"$f" > "$S/$n.theirs"
  git merge-file -L gpuix -L base -L erwin -p \
    "$S/$n.ours" "$S/$n.base" "$S/$n.theirs" > "$S/$n.merged"
  echo "$f conflicts=$?"
done
```

### 4.2 Result

| File | Hunks | Kind | What happened |
| ---- | ----: | ---- | ------------- |
| `scene.rs` | 0 | clean | GPUix's 82-line delta does not overlap. Verify §4.4 item 1 after the merge. |
| `style.rs` | 1 | import list | Add `ScaledPixels`, `TransformationMatrix` to GPUix's list. |
| `styled.rs` | 1 | import list | Add `ElementTransform`; **keep GPUix's rename `TemplateColumnMinSize` → `GridTemplateMinSize`**. |
| `text_system/line.rs` | 1 | import list | Add `ScaledPixels`, `ShapedGlyph`, `ShapedRun`, `TransformationMatrix`. |
| `elements/div.rs` | 2 | semantic (mechanical) | Branch wraps the prepaint and paint bodies in `with_style_transform`; GPUix added focus-handle registration and an a11y action-listener drain inside the same blocks. Keep GPUix's body, add the wrapper. |
| `view.rs` | 3 | **semantic port** | GPUix replaced the `AnyView` `Element` impl with `ViewElement<V>` + `ViewElementCacheKey`; the branch's `AnyViewState`/`ViewCacheKey` no longer exists. Port the `transform` key/compare into `ViewElement`. |
| `window.rs` | 6 | **semantic port** | Import list; deferred-draw prepaint (GPUix now `take()`s the element); `paint_quad` (GPUix split it into fill + border-strip inserts); `insert_hitbox` (GPUix added `Hitbox.identity`); and the two test modules colliding at EOF. |

Totals: **7 files, 14 hunks**.

### 4.3 Exact conflict content and resolutions

1. **`style.rs` imports** — union:
   `PointRefinement, Rgba, ScaledPixels, SharedString, Size, SizeRefinement, Styled, TextRun, TransformationMatrix, Window, …`.
2. **`styled.rs` imports** — union, with GPUix's spelling:
   add `ElementTransform`, keep `GridTemplateMinSize` (the branch's import still
   says `TemplateColumnMinSize`; it is only an import, the added method does not
   use it).
3. **`text_system/line.rs` imports** — union: `ScaledPixels, ShapedGlyph,
   ShapedRun, …, TransformationMatrix`.
4. **`div.rs` prepaint** — keep GPUix's `if let Some(focus_handle) = …
   tab_stops.insert(...)` block; wrap the whole `with_content_mask(...)` body in
   `window.with_style_transform(style.transform, bounds, |window| { … })`.
5. **`div.rs` paint** — same: wrap `style.paint(...)` in
   `with_style_transform`; keep GPUix's a11y action-listener drain and
   `f(&style, window, cx)` in place.
6. **`view.rs` imports** — union; GPUix also added `RenderOnce`, keep it.
7. **`view.rs` mid-file** — do **not** restore the deleted `AnyViewState` /
   `AnyView` `Element` impl. Resolution is only the import union; the cache-key
   port is §4.4 item 2.
8. **`view.rs` `View` impl** — keep GPUix's `fn render(self, …) ->
   impl IntoElement` and delete the branch's old `request_layout/prepaint/paint`
   block for `AnyView`; that logic now lives in `ViewElement`.
9. **`view.rs` EOF** — keep GPUix's `EmptyView`; place the branch's `#[cfg(test)]
   mod tests` before or after it (no name collision — GPUix has no view tests).
10. **`window.rs` imports** — union. Keep GPUix's additions `AtlasTile`,
    `KeyListener`, `WindowInsets`; add `ElementTransform`.
11. **`window.rs` deferred prepaint** — GPUix destructures and `take()`s the
    element:
    `let (element, parent_node, current_view, rem_size, absolute_offset, prepaint_range) = { … }`.
    Add `content_mask` and `transform` to that tuple, then:
    `with_rendered_view(current_view, |w| w.with_transform(transform, |w| w.with_content_mask(content_mask, |w| w.with_rem_size(Some(rem_size), |w| w.with_absolute_element_offset(absolute_offset, |w| element.prepaint(w, cx))))));`
    Put the element back as GPUix does. Do not use the branch's
    `deferred_draw.element.as_mut()` form — it re-borrows the vector that GPUix
    deliberately took from.
12. **`window.rs` `paint_quad`** — keep GPUix's `let quad = Quad { … }` and its
    transparent-border strip split; replace **all four**
    `self.next_frame.scene.insert_primitive(...)` calls (fill early-return,
    empty-interior early-return, and the strip loop) with
    `self.insert_primitive(...)`.
13. **`window.rs` `insert_hitbox`** — keep both sides:
    GPUix's `identity`/`captured_hitbox` capture, then the branch's
    `let transformed_bounds = self.transform_hitbox_bounds(bounds, transform);`
    and the `HitboxTransformMetadata` push. `Hitbox { bounds: transformed_bounds,
    content_mask, behavior, identity }`.
14. **`window.rs` tests at EOF** — GPUix already has `#[cfg(test)] mod tests` at
    the end of the file. Rename the branch's module to
    `#[cfg(test)] mod transform_tests` and keep it separate; do not merge 18
    tests into GPUix's module (duplicate helper names: `TestQuadElement`,
    `TestHitboxElement`, `paint_test_root`).

### 4.4 Porting checklist beyond the textual conflicts

Run these after the merge; each is a compile or correctness trap.

1. **`Shadow` gained fields in GPUix.** `Primitive::transform` must transform
   **both** `bounds` and the new `element_bounds` (inset/drop-shadow shaders use
   the latter as the element rectangle). Leaving it untransformed breaks
   shadows as soon as the scale is not 1. `blur_radius` stays unscaled — record
   that in §3.5.
2. **`view.rs` cache key.** GPUix's `ViewElementCacheKey`:
   add `transform: TransformationMatrix`; in `ViewElement::prepaint` read
   `let transform = window.current_transform();` next to `content_mask` and
   `text_style`; add `&& element_state.cache_key.transform == transform`; add
   the field to the key literal. `ViewElementCacheKey` has no `PartialEq`
   derive — keep the field-by-field comparison style.
3. **Every paint insert goes through the transform.** After resolution:
   `grep -n "next_frame.scene.insert_primitive" crates/gpui/src/window.rs` must
   return **nothing**. GPUix added direct inserts after the branch's base (the
   split drop/inset shadow functions, the image sub-tile path, and
   `paint_surface` on macOS and Linux); convert each to
   `self.insert_primitive(...)`.
4. **New primitives.** `PaintSurface` has only `bounds`/`content_mask`, so the
   existing `Surface` arm is enough. If GPUix added a primitive the branch does
   not know, the `match` in `Primitive::transform` fails to compile — add an arm
   that transforms its bounds (and any rectangle the shader uses), never a
   catch-all `_ => self`.
5. **`Scene::transform` match must stay exhaustive.** No wildcard arm; a new
   primitive must be a deliberate decision.
6. **`PrepaintStateIndex` gained a field.** `hitbox_transform_metadata_index`
   must be initialised in `prepaint_index`, sliced in `reuse_prepaint`, and
   defaulted in `PrepaintStateIndex::default` (the merge usually gets this; grep
   for all three).
7. **`DeferredDraw.transform`** must be set in every construction site (GPUix
   has one in `defer_draw` and one in `reuse_prepaint`).
8. **`gpui_util` license field** — see §5.3; do not remove the upstream-added
   field if the fork is based on a newer commit.

### 4.5 Verdict

**Needs port.** The API and the algorithm are compatible; the branch is simply
old. The merge is one commit with 14 hunks; three files require reading GPUix's
refactors rather than picking a side, and one new `Shadow` field needs a
correctness fix. Nothing in the branch conflicts with GPUix's own 61 commits
(input, list, web, WASM, macOS event pump, accessibility) — those changes are
outside the seven files.

---

## 5. Licence and provenance (read before shipping a fork)

### 5.1 Finding

| Component | Licence | Evidence at the pin |
| --------- | ------- | ------------------- |
| `crates/gpui` (the crate the branch edits) | **Apache-2.0** | `crates/gpui/Cargo.toml` → `license = "Apache-2.0"`, `publish = true`; `crates/gpui/LICENSE-APACHE` is a symlink to the root `LICENSE-APACHE` |
| `crates/gpui_platform`, `gpui_macos`, `gpui_apple` | **Apache-2.0** | each `Cargo.toml` has `license = "Apache-2.0"` |
| Zed editor source | **GPL-3.0-or-later** | root `LICENSE-GPL` is GPL-3.0; `README.md` §Licensing: "Zed source code is licensed primarily under GPL-3.0-or-later, with Apache-2.0 components where marked." |
| **AGPL** | **not present** | tree contains only `LICENSE-APACHE` and `LICENSE-GPL`; no `LICENSE-AGPL`, no AGPL mention in the licensing section |
| GPUix | **Apache-2.0** | `references/gpuix/LICENSE`; `packages/native/package.json` `"license": "Apache-2.0"`; `THIRD_PARTY_NOTICES.md` lists "GPUI | Apache-2.0" |
| The 0xErwin1 branch | inherits **Apache-2.0** for `crates/gpui` | no licence change in the 17 commits; no per-file headers |

**Conclusion: merging the branch into a GPUI fork is an Apache-2.0 use, not a
GPL use.** The GPL applies to the Zed *application*; `gpui` is explicitly
Apache-2.0 and publishable. No AGPL obligation exists.

### 5.2 Obligations if we ship a fork

Apache-2.0 §4 requires, when redistributing:

1. a copy of the licence (`LICENSES/` or the fork's `LICENSE-APACHE`);
2. prominent notices of the files changed — a `NOTICE`/provenance row naming
   the seven files and the merge;
3. retention of copyright/attribution notices (Zed Industries for the base,
   Ignacio Perez for the branch);
4. no trademark use (do not use the Zed or GPUI marks as our identity).

Record in `LICENSES/provenance.md`:

| Source | Commit | What changed | Licence |
| ------ | ------ | ------------ | ------- |
| `0xErwin1/zed` `feature/53306-07-text-raster-subpixel-regressions` | `fc4c1586` | merged into `remorses/zed` `gpuix-transform`; 14 hunks resolved | Apache-2.0 |
| `remorses/zed` `gpuix` | `2565b8a` | fork base | Apache-2.0 |
| GPUI | `crates/gpui` | unchanged upstream files included in the fork | Apache-2.0 |

### 5.3 Two paperwork gaps to record, not fix by deletion

- **No CLA is recorded for the branch.** Zed's `CONTRIBUTING.md` requires a CLA
  before a contribution is merged. The branch is a public fork, not a merged
  contribution. We use it under Apache-2.0 and attribute the author; if we ever
  upstream it, a CLA is required.
- **`crates/gpui_util/Cargo.toml` at the pin has no `license` field**
  (`publish.workspace = true`, workspace `publish = false`). Upstream `main`
  has since added `license = "Apache-2.0"`. `gpui` depends on it. This is a
  metadata omission in the pinned tree, not a change of terms; do not strip the
  field if the fork base is newer, and note it if the audit is challenged.

### 5.4 Our repository's own licence

`GPUIXUI` has no root `LICENSE` yet (only `LICENSES/README.md` and
`LICENSES/base-gpui.md`). Apache-2.0 code can be redistributed inside an
MIT/Apache/GPL project with the notices above, but **the distribution licence
must be decided before shipping a fork**. That is an owner decision, not this
plan's.

---

## 6. Path A — how to integrate (only if gate 2 in §7 passes)

### 6.1 Fork zed and merge (expect conflicts)

Work in scratch, never in `references/`:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/transform
mkdir -p .agents/slop/scratch/zed-fork
cd .agents/slop/scratch/zed-fork

git clone --filter=blob:none https://github.com/remorses/zed.git zed
cd zed
git fetch origin gpuix:refs/remotes/origin/gpuix
git switch -c gpuix-transform origin/gpuix      # 2565b8a3…
git remote add erwin https://github.com/0xErwin1/zed
git fetch erwin feature/53306-07-text-raster-subpixel-regressions
git merge --no-ff erwin/feature/53306-07-text-raster-subpixel-regressions
```

Expected: `CONFLICT` in the 7 files, 14 hunks. Resolve them with §4.3/§4.4.
Then:

```sh
git add -A
git commit -m "merge(gpui): ElementTransform from 0xErwin1 #53306 onto gpuix"
git log --oneline --graph -5
git rev-parse HEAD
```

The merge commit must have two parents: `2565b8a…` and `fc4c1586…`. Verify:

```sh
git merge-base --is-ancestor 2565b8a HEAD && echo "gpuix parent ok"
git merge-base --is-ancestor fc4c1586 HEAD && echo "branch parent ok"
```

### 6.2 Build and test the merged GPUI

The pinned toolchain is Rust **1.97.1** (`rust-toolchain.toml` in both zed and
GPUix). If Rust is not installed, reuse plan 140's scratch toolchain:

```sh
# run from .agents/slop/scratch/zed-fork/zed
export RUSTUP_HOME=$PWD/../../gpuix-build/toolchain/rustup
export CARGO_HOME=$PWD/../../gpuix-build/toolchain/cargo
export PATH="$CARGO_HOME/bin:$PATH"
```

Then, in the merged zed checkout:

```sh
cargo check -p gpui
cargo nextest run -p gpui --no-fail-fast --no-tests=warn
./script/clippy -p gpui
cargo fmt --all -- --check
```

Expected: green; the 27 transform tests are present:
`cargo test -p gpui -- --list | grep -c transform` (approximate; use
`cargo nextest list -p gpui | grep transform`).

**STOP** if `gpui` itself fails to build for reasons unrelated to the 14 hunks
(e.g. a `gpui_platform` API change): the branch needs a new upstream port, not
more conflict resolution.

### 6.3 Publish the fork branch and bump the submodule

```sh
git push -u origin gpuix-transform        # remorses/zed — requires write access
```

Then, in a writable GPUix clone:

```sh
git clone --filter=blob:none https://github.com/remorses/gpuix.git
cd gpuix
git switch -c gpuix-transform
cd zed
git fetch origin gpuix-transform
git checkout <merged-sha>
cd ..
git add zed
git commit -m "build(gpui): pin ElementTransform fork (0xErwin1 #53306)"
```

**STOP** if the account has no write access to `remorses/zed` or
`remorses/gpuix`. Do not silently push to a personal fork with a different name;
record the fork URL in the plan and ADR instead.

### 6.4 GPUix `StyleDesc`: the transform surface

Three files, plus the generated types.

**`packages/native/src/style.rs`**

```rust
/// A 2D transform applied after layout. Layout bounds do not change.
#[derive(Debug, Clone, Copy, Default, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransformDesc {
    /// Logical pixels. Positive is right/down.
    pub translate_x: Option<f64>,
    pub translate_y: Option<f64>,
    /// Unitless, must be > 0. Defaults to 1.
    pub scale_x: Option<f64>,
    pub scale_y: Option<f64>,
    /// Fractions of the element's bounds. Defaults to 0.5 (centre).
    pub origin_x: Option<f64>,
    pub origin_y: Option<f64>,
}

pub struct StyleDesc {
    // …
    /// Honoured by `div`/`text`; ignored by elements that do not build a div.
    pub transform: Option<TransformDesc>,
}
```

Mapping (in the same file; `gpui` types are already imported):

```rust
impl TransformDesc {
    pub(crate) fn to_element_transform(self) -> Option<gpui::ElementTransform> {
        let (sx, sy) = (self.scale_x.unwrap_or(1.0), self.scale_y.unwrap_or(1.0));
        let (tx, ty) = (self.translate_x.unwrap_or(0.0), self.translate_y.unwrap_or(0.0));
        if ![sx, sy, tx, ty].iter().all(|v| v.is_finite()) || sx <= 0.0 || sy <= 0.0 {
            return None; // invalid values are ignored, like every other style value
        }
        if tx == 0.0 && ty == 0.0 && sx == 1.0 && sy == 1.0 {
            return None; // identity: do not pay for a transform
        }
        Some(
            gpui::ElementTransform::default()
                .origin(gpui::point(
                    self.origin_x.unwrap_or(0.5) as f32,
                    self.origin_y.unwrap_or(0.5) as f32,
                ))
                .translate(gpui::point(gpui::px(tx as f32), gpui::px(ty as f32)))
                .scale(gpui::size(sx as f32, sy as f32)),
        )
    }
}
```

**`packages/native/src/renderer.rs`**, inside `apply_styles`, after the box
properties and before display-specific work:

```rust
if let Some(transform) = style.transform.and_then(TransformDesc::to_element_transform) {
    el = el.transform(transform);
}
```

`apply_styles` is generic over `gpui::Styled`, so this compiles for `div` and
`list`; it only *has an effect* on `div`/`text` (§3.5 item 6). Document that in
the TS JSDoc and in the `COMPONENTS.md` GPUix-support column (plan 203's
`docs/gpuix-capabilities.md` is not written yet).

**`packages/native/js/host.ts`** (the hand-written public types; `@gpuix/react`
re-exports them, so no React source change):

```ts
export interface TransformDesc {
  translateX?: number
  translateY?: number
  /** Unitless, > 0. Defaults to 1. */
  scaleX?: number
  scaleY?: number
  /** Fraction of width/height. Defaults to 0.5 (centre). */
  originX?: number
  originY?: number
}

export interface StyleDesc {
  // …
  /** Honoured by `div`/`text`; wrap other elements in a div. No rotation. */
  transform?: TransformDesc
}
```

`StateStyleDesc = Omit<StyleDesc, …>` picks `transform` up automatically. State
transforms are instant.

**Do not add `rotate`.** If a `rotate` field is ever requested, it is a new
project (§3.5 item 1), not a field.

### 6.5 Motion: make zoom animatable natively

GPUix's `motion` is interpolated in Rust (`packages/native/src/motion.rs`), not
in React. Without this, a `scale` in `StyleDesc` would pop in at mount while
opacity fades.

Add to **both** `MotionStyle` definitions — same four fields, two spellings:

```rust
// packages/native/src/motion.rs
pub translate_x: Option<f64>,
pub translate_y: Option<f64>,
pub scale_x: Option<f64>,
pub scale_y: Option<f64>,
```

```ts
// packages/native/js/host.ts
translateX?: number
translateY?: number
scaleX?: number
scaleY?: number
```

Then:

- `with_fallback` — `or` each new field;
- `interpolate` — linear interpolation, same as the existing numbers;
- `apply_to` — `let transform = style.transform.get_or_insert_default();` then
  assign the animated fields. Do **not** touch `origin_x/y`; the origin is not
  an animated property.
- `validate_style` — finite; `scale_* > 0`; reject the whole motion description
  if violated, consistent with the existing `width`/`opacity` validation.

Mapping in `StyleDesc` is unchanged: motion writes `TransformDesc` fields, and
`apply_styles` maps them to `ElementTransform`.

**Tests (Rust, `packages/native/src/motion.rs`):** interpolation of scale from
0.95 to 1, fallback behaviour when the target omits a field, rejection of
`scale: 0`/negative, and `apply_to` preserving the static origin. The geometry
itself is covered by the smoke suite, because `ElementTransform`'s matrix is
private.

### 6.6 Build the binding and install it

Reuse plan 140's scratch build if this host has one; otherwise the script below
creates it. Replace its zed tree with the **merged** tree, then rebuild:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/transform
rm -rf .agents/slop/scratch/gpuix-build/gpuix/zed
mkdir -p .agents/slop/scratch/gpuix-build/gpuix/zed
git -C .agents/slop/scratch/zed-fork/zed archive gpuix-transform \
  | tar -x -C .agents/slop/scratch/gpuix-build/gpuix/zed

# apply §6.4/§6.5 to the scratch GPUix copy (or clone the fork into scratch)
sh apps/playground/scripts/build-native-binding.sh
```

The script skips the tarball download when `zed/crates/gpui/Cargo.toml` exists,
applies the `runtime_shaders` feature, builds
`x86_64-apple-darwin`, and installs
`node_modules/@gpuix/native/gpuix-native.darwin-x64.node`.

**Types.** `@gpuix/native`'s `index.d.ts` is napi-generated; `StyleDesc` lives in
`@gpuix/native/host` (`dist/host.d.ts`, generated from `js/host.ts` by
`bun run build:js`). For the playground to type-check the new field, install the
fork's native package (or run `tsc` in the scratch copy and point the workspace
at it). Do not hand-edit `node_modules` beyond the `.node` artifact.

**STOP** if the build needs a GPUix source change outside `style.rs`,
`renderer.rs`, `motion.rs`, `js/host.ts` (plus the test files). That is a new
fork surface and needs a new plan.

### 6.7 Focused native scenarios

Add **one** scenario module `apps/playground/src/scenarios/transform.tsx`,
registered in `apps/playground/src/scenarios/index.ts`. Tag it with a new
`transform` capability (add it to the union in `packages/testing/src/smoke.ts`
and to `CORE_CAPABILITIES`; `scenarioProblems` will then require it). Do **not**
run the full suite in this workstream; run only this scenario:

```sh
nub run --filter playground build
node apps/playground/dist/smoke/run.js --only transform
```

Checks, each able to fail:

1. **Translate** — a 200×100 div with `transform: { translateX: 40,
   translateY: 20 }` and an inner 50×20 filled div. `getElementBounds` reports
   the inner box at `+40/+20`.
2. **Scale + hit test** — outer scale `2,2` origin `0,0`; inner at
   `(10,10,50,20)`. Visual box `(20,20,100,40)`. A click at `(100,50)` (inside
   visual, outside layout) must fire `onClick`; a click at `(15,15)` (outside
   visual) must not. This is the inverse-map proof.
3. **Nested origin** — two nested centered scales of 2; assert the child's
   visual origin/size against the branch's unit-test arithmetic.
4. **Clip** — `overflow: "hidden"` parent, translated/overscaled child; a text
   run that leaves the visual mask must not appear in `getPaintedText`.
5. **Motion** — `AnimatePresence` with `initial: { opacity: 0, scaleX: 0.95,
   scaleY: 0.95 }`, `animate: { opacity: 1, scaleX: 1, scaleY: 1 }`; assert the
   mid-animation bounds are smaller than final, and `motionComplete` fires with
   the final bounds. If the fork is not installed, this scenario must fail, not
   skip.

Do not claim text quality from a screenshot alone; the raster/subpixel policy is
covered by the branch's Rust tests (§3.4). A screenshot may *document* it.

### 6.8 What the component packages may then do

Only after the runtime is distributable (gate 2):

- `packages/tokens` gets the transform-aware motion presets (dialog/popover/
  toast enter and exit), in one module.
- `packages/tw` maps `scale-*`, `translate-x-*`, `translate-y-*` and
  `origin-*` to `TransformDesc`; `rotate-*` stays `unsupported` with the reason
  "no public rotate; quads are bounds-only".
- Dialog/Popover/Toast use the presets. No component gets a raw `transform`
  prop; the preset is the API.
- Every target we claim (GPUix's four plus this host's `darwin-x64`) must have a
  binding before the package can claim the feature. On stock 0.10.0, `transform`
  is an unknown serde field and is silently ignored — so the fade still works.
  That graceful degradation is a requirement, not a nicety.

---

## 7. Decision point and the honest fallback

### 7.1 The two gates

**Gate 1 — correctness (this plan):** the merged branch builds, the 27 tests
pass, and the binding + `--only transform` scenario pass. If gate 1 fails,
delete the idea; do not weaken the tests.

**Gate 2 — distributability (owner decision):** can we ship a forked runtime?

| Requirement | Why | Status |
| ----------- | --- | ------ |
| A published/maintained `remorses/zed` branch with the merge | Consumers cannot build zed themselves | not started |
| A published `@gpuix/native` (and types) exposing `transform` | The published 0.10.0 has no `transform` field | not started |
| Prebuilt bindings for GPUix's four targets (`aarch64-apple-darwin`, `x86_64-unknown-linux-gnu`, `x86_64-pc-windows-msvc`, `aarch64-pc-windows-msvc`) plus this host's `x86_64-apple-darwin` | A component library cannot require a local Rust build | **blocked**: only darwin-x64 can be built here |
| Upstream acceptance or an explicit fork policy | We would own an unmerged GPUI patch indefinitely | not started |
| Licence/NOTICE/provenance updated | Apache-2.0 §4 | §5 |

**If any row is "not started"/"blocked", do not make components depend on
transform.** As of 2026-10-18, four of the five rows still need work; only the
licence table has a draft (§5).

### 7.2 Fallback (ship this now)

No zoom, no scale. Use the motion the runtime already animates natively
(`MotionStyle`: width/height/opacity/top/right/bottom/left/borderRadius):

```ts
// Dialog / popover / dropdown enter and exit, on an absolutely positioned
// content box (GPUix has no `position: fixed`)
initial: { opacity: 0, top: 4 }
animate: { opacity: 1, top: 0 }
exit:    { opacity: 0, top: 4 }
transition: { duration: 0.15, ease: "easeOut" }
```

- Toasts: fade + `top: 8` (or `left`/`right` for a side), same positioning
  constraint.
- No `transform` in `StyleDesc`, no `scale` in any preset.
- `packages/tw` keeps `scale-*`, `zoom-*`, `rotate-*`, `origin-*` in
  `unsupported` (plan 524's channel) with the reason "GPUix 0.10.0 has no
  transform".
- Document in the Dialog/Popover/Toast pages and `COMPONENTS.md`: the target
  motion is a fade + short slide; zoom requires the transform runtime (plan
  525). This is the "strongest honest alternative" MISSION asks for.

### 7.3 Signals to revisit

1. #53306 is promoted to an accepted issue or a PR is opened/merged upstream.
2. GPUix (or `gpui-ce`) ships `transform` in `StyleDesc`.
3. A first-class product need for true zoom (canvas/graph editor) justifies
   owning the fork and CI for five targets.

When any signal fires, re-run §4 (the base will have moved) before §6.

---

## 8. STOP conditions

1. **The branch tip is not `fc4c1586…`.** A force-push or a new tip invalidates
   the conflict analysis; re-audit instead of merging a moving target.
2. **A conflict appears outside the 7 files** listed in §2.4. The branch cannot
   cause one; if it happens, the clone or the base is wrong.
3. **`cargo nextest run -p gpui` fails after resolution.** Report the failing
   test names and the hunk that caused it; do not `#[ignore]` a transform test.
4. **The merged `gpui` requires edits outside `crates/gpui`** (for example
   `gpui_platform`), or GPUix requires edits outside §6.4/§6.5. Stop and write a
   new plan.
5. **A GPL/AGPL file would enter the fork** (copying from `crates/zed`,
   `crates/collab`, etc.). Do not copy application code into the GPUI fork.
6. **The transform silently no-ops on the element being tested** (e.g. an
   `<img>` or `<virtual-list>`). Do not ship a field that does nothing; wrap the
   element in a `div` or document the exclusion.
7. **No write access** to `remorses/zed`/`remorses/gpuix`. Record the blocker;
   do not rename the fork and pretend it is the pinned one.
8. **Licence review finds GPL contamination** or the repository's own
   distribution licence is still undecided at release time.
9. **The binding build needs `sudo`, Xcode's Metal toolchain, or a network
   source outside GitHub.** See plan 140's fallback.

---

## 9. Acceptance criteria

**Research (this plan):**

- [x] The branch is cloned to `references/transform-zed`; tip and base SHAs are
      recorded (§2.2).
- [x] Ahead/behind, merge base, `--stat`, and the 14-hunk conflict surface are
      measured (§4).
- [x] The public API, pipeline, tests and nine limitations are documented (§3).
- [x] The licence is verified from files, not a badge (§5).
- [x] The fallback and the decision gate are explicit (§7).
- [x] No app or component source changed; the full live smoke suite was not run.

**Implementation (a later plan):**

- [ ] Merge commit with parents `2565b8a…` and `fc4c1586…`; `git merge-base
      --is-ancestor` proves both.
- [ ] `cargo check -p gpui`, `cargo nextest run -p gpui`, `./script/clippy -p
      gpui`, `cargo fmt --check` green; 27 new tests present.
- [ ] GPUix `StyleDesc.transform` + `MotionStyle` scale/translate; Rust unit
      tests for mapping/validation/interpolation.
- [ ] Binding builds on this host and loads (`import("@gpuix/native")` →
      `loaded`).
- [ ] `node apps/playground/dist/smoke/run.js --only transform` exits `0`; the
      report names the five checks.
- [ ] `LICENSES/inventory.md`, `provenance.md`, `NOTICE` updated; a `PLAN.md`
      decision row records the fork-or-fallback outcome.

---

## 10. One-page command summary

```sh
# audit (done)
git -C ~/GPUIXUI/references/transform-zed log -1 --format='%H %ci %s'
git -C ~/GPUIXUI/references/transform-zed merge-base fc4c1586 2565b8a
git -C ~/GPUIXUI/references/transform-zed rev-list --left-right --count 2565b8a...fc4c1586

# merge (gate 1)
mkdir -p .agents/slop/scratch/zed-fork && cd .agents/slop/scratch/zed-fork
git clone --filter=blob:none https://github.com/remorses/zed.git zed && cd zed
git fetch origin gpuix:refs/remotes/origin/gpuix
git switch -c gpuix-transform origin/gpuix
git remote add erwin https://github.com/0xErwin1/zed
git fetch erwin feature/53306-07-text-raster-subpixel-regressions
git merge --no-ff erwin/feature/53306-07-text-raster-subpixel-regressions
# resolve §4.3 + §4.4, then
cargo check -p gpui && cargo nextest run -p gpui --no-fail-fast --no-tests=warn

# binding (after §6.4/§6.5 in the scratch GPUix copy)
cd /Users/cyberistic/GPUIXUI/workspaces/transform
sh apps/playground/scripts/build-native-binding.sh

# focused scenario (never the full suite in this workstream)
nub run --filter playground build
node apps/playground/dist/smoke/run.js --only transform
```

---

## 11. Open questions for the owner

1. **Do we want to own a two-repository fork (GPUI + GPUix) for zoom?** If the
   answer is no, the fallback is final until upstream lands.
2. **Which component actually needs scale?** Fade + slide covers dialog,
   popover, toast and menu motion. Zoom only pays for canvas/graph surfaces
   (Tier 5). If no Tier 5 surface is planned, the fork has no customer.
3. **Who signs the Apache-2.0 NOTICE and the repository licence?** §5.4.
4. **Is a CI matrix for five Rust targets in scope?** Without it, a fork is a
   local-only feature.

---

## 12. Results (2026-10-18)

- `references/transform-zed` cloned treeless; tip `fc4c1586`, base
  `251456cf`; GPUix pin `2565b8a` is **1 866 commits ahead** of the base and
  the branch is **17 ahead**.
- Branch diff: 7 files, **+1 771 −131**; the same files grew **+4 759 −608**
  in GPUix between the base and the pin.
- Simulated three-way merge: **7 files, 14 hunks**; `scene.rs` clean; 3
  semantic ports (`view.rs` cache key, `window.rs` deferred draw/paint_quad,
  `div.rs` wrappers) plus `Shadow.element_bounds` and the four new paint inserts.
- Verdict: **needs port**. Not blocked, but not shippable as a component
  dependency until a forked runtime has five-target prebuilds.
- Licence: GPUI is **Apache-2.0**; Zed is **GPL-3.0-or-later** with Apache
  components marked; **no AGPL**. GPUix is Apache-2.0. Attribution and NOTICE
  are required for a fork.
- Recommendation: keep the fallback (fade + top/left slide, no zoom) in the
  component library; treat the fork as a research branch until gate 2.

## 13. Results — optional patch port (2026-10-18)

**Verdict: the port compiles and its tests pass.** The 17 commits were replayed
as a three-way merge onto the pin `2565b8a3…`; the result is an optional patch
at `patches/gpui/0001-transform.patch`, not a change to GPUix's fork contract
and not a dependency of any package. It still does not expose `rotate` or
`StyleDesc::transform`; the fallback in §7.2 remains the shipping path.

Verification on Rust 1.97.1 / `x86_64-apple-darwin` (macOS 15.8.1, Command Line
Tools only):

| Command | Result |
| ------- | ------ |
| `cargo check -p gpui --locked` | pass |
| `cargo clippy -p gpui --lib --locked` | pass |
| `cargo test -p gpui --lib --locked` | 299 passed, 0 failed |
| `git apply --3way --check` on a clean pin tree | pass; reproduces the merged files |

The lib tests were built with `gpui_platform/runtime_shaders` on the
`gpui_platform` dev-dependency because this host has no `xcrun metal`; the patch
itself changes no manifest.

Resolution summary:

- import unions in `style.rs`, `styled.rs`, `text_system/line.rs`, keeping
  GPUix's `GridTemplateMinSize`;
- `div.rs`: prepaint and paint bodies wrapped in `with_style_transform`, keeping
  GPUix's focus registration, hitbox insertion, a11y drain and
  `paint_bounds_listener`;
- `view.rs`: the branch's stale `AnyView` element impl is dropped in favour of
  `ViewElement`; `ViewElementCacheKey` gains `transform` plus a `matches`
  predicate, and the branch's two cache-key tests become one test of it. The
  branch's other tests live in `transform_tests` beside GPUix's `mod tests`;
- `window.rs`: deferred prepaint keeps GPUix's `element.take()` and threads
  `content_mask`/`transform`; `paint_quad` keeps the transparent-border strip
  split and routes every insert through `Window::insert_primitive`;
  `insert_hitbox` keeps `identity` and adds transformed bounds plus inverse-map
  metadata;
- `scene.rs`: clean three-way merge plus the §4.4 item 1 fix —
  `Primitive::transform` also transforms `Shadow.element_bounds`;
- test fixtures that painted `Hsla::default()` quads now paint `white()`:
  GPUix's `paint_quad` splits transparent backgrounds into border strips, so a
  transparent fixture emitted zero (or four) quads instead of one. The
  assertions did not change.

Limitations are unchanged (§3.5). Gate 2 (§7.1) is untouched: the patch is not
a published fork, has no five-target prebuilds, and is not consumed by
`packages/tw` or any component.
