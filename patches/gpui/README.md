# GPUI `ElementTransform` — optional patch for the pinned GPUix Zed

`0001-transform.patch` ports Ignacio Perez's (`0xErwin1`) GPUI transform
implementation onto the Zed/GPUI revision pinned by GPUix. It is an **optional
renderer patch**, not a GPUix fork commit and not a dependency of any package in
this repository — the component library still ships the fade + slide fallback
(plan 525 §7.2).

The patch adds `Style::transform`, `ElementTransform` (`translate`, `scale`,
`origin`) and the prepaint/paint, hit-testing, culling, replay, text-raster and
view-cache plumbing required to make them correct. It does **not** expose a
`rotate` method and does not change GPUix's `StyleDesc`.

## Provenance

| Source | Revision | Role |
| ------ | -------- | ---- |
| `0xErwin1/zed`, branch `feature/53306-07-text-raster-subpixel-regressions` | `fc4c1586647ad987cb88bf96e1fb4e543f4bdaca` (2026-05-20) | transform implementation; 17 commits; author **Ignacio Perez** `<ignacio@feuer.me>` |
| merge base — upstream `zed-industries/zed` `main` | `251456cf20887b91e0ba2d507b47ace14d4c24ff` (2026-05-20) | three-way merge base |
| `remorses/zed`, branch `gpuix` | `2565b8a3e33537c3d3f56d0d45f11e50a17e512d` (2026-10-16) | GPUix pin; the patch preimage |
| `remorses/gpuix` | `515df198` (zed submodule pin above) | Apache-2.0 host project |

### The 17 commits (oldest first)

| Commit | Subject |
| ------ | ------- |
| `c2befe68ddea45242043451ee2672ca2ca03c0c0` | gpui: Add transform foundation |
| `7c436f1e323de09410638ddaf64932ec579d856b` | gpui: Preserve transforms through clipping and replay |
| `443bb34a3bbb9e09ad1ec62dad4c868caaa3d9a3` | gpui: Fix transformed sprite culling |
| `b07122d015e34c951da4968efddf511565fcc3f2` | gpui: Fix transformed glyph culling |
| `ad2af86ff37b700d17c1e52bf59ab6c87b1b7305` | gpui: Account for transforms in cached prepaint |
| `ae73a3474f41dbb8e677159666758f288e12b894` | gpui: Add transform-aware hit testing |
| `36feb8aeaa02e3298f3263a591de5c20eafcff41` | gpui: Preserve transform metadata on prepaint reuse |
| `9195524af4257d6bf33f3559256d370cb567046d` | gpui: Add styled transform API |
| `e3e2cf19297149dcfd4f427b6901109ed8b12a24` | gpui: Derive ElementTransform default |
| `7c272a2716497560334f281d4449d4528b52488d` | gpui: Rasterize transformed text at effective scale |
| `95dcd1c485a9c55e7a22105e3fb566721e199d76` | gpui: Add text raster transform regressions |
| `8b803b9c258544834938674f7e0ea3efd7bb2ad3` | Merge branch 'main' into feature/53306-01-transform-foundation |
| `0c2136bbde49998a4213a1ab187c5a1f6292f528` | Merge feature/53306-01-transform-foundation into feature/53306-02-clip-replay |
| `e152d4ad105cde440701276c3906916feb61db1f` | Merge feature/53306-02-clip-replay into feature/53306-03-hit-test |
| `3b94f67de7afe96349a5d0a1d74c88067f37393e` | Merge feature/53306-03-hit-test into feature/53306-04-public-api-pivot |
| `045c7c975d820cd9f519daeba9600d2857394798` | Merge feature/53306-05-downstream-validation into feature/53306-06-text-raster-core |
| `fc4c1586647ad987cb88bf96e1fb4e543f4bdaca` | Merge feature/53306-06-text-raster-core into feature/53306-07-text-raster-subpixel-regressions |

The patch was generated from a scratch merge whose two parent trees are
byte-identical to the pin (`24587e9c…`) and the branch tip (`007d8f9b…`), so the
`index` blobs in the diff are the real upstream blob hashes for those trees.

## What changed

Seven files, all under `crates/gpui/src/`: `elements/div.rs`, `scene.rs`,
`style.rs`, `styled.rs`, `text_system/line.rs`, `view.rs`, `window.rs`.
The port resolves the 14 three-way conflict hunks and the semantic gaps between
the May branch and the October GPUix fork:

- import unions in `style.rs`, `styled.rs`, `text_system/line.rs`; GPUix's
  `GridTemplateMinSize` spelling is kept;
- `div.rs`: both the prepaint and paint bodies are wrapped in
  `Window::with_style_transform`, preserving GPUix's focus-handle registration,
  hitbox insertion, a11y action-listener drain and `paint_bounds_listener`;
- `view.rs`: the branch's `AnyView` element implementation is not restored
  (GPUix replaced it with `ViewElement`); instead `ViewElementCacheKey` gains
  `transform` and a `matches` predicate, and the branch's cache-key test is
  ported to it;
- `window.rs`: the deferred-draw prepaint keeps GPUix's `element.take()` and
  threads `content_mask`/`transform` through the tuple; `paint_quad` keeps
  GPUix's transparent-border strip split and routes every insert through
  `Window::insert_primitive`; `insert_hitbox` keeps GPUix's `identity` capture
  and stores transformed bounds plus inverse-map metadata; the branch's tests
  live in `mod transform_tests` beside GPUix's `mod tests`;
- `scene.rs`: `Primitive::transform` also transforms `Shadow.element_bounds`
  (GPUix added it for inset/drop-shadow shaders), so shadows stay attached to a
  scaled or translated element.

Every remaining direct `next_frame.scene.insert_primitive` call introduced by
GPUix after the branch's base (split drop/inset shadows, image sub-tiles, the
macOS/Linux `paint_surface` paths) is converted to `Window::insert_primitive`.

## Applying

The patch is rooted at the repository root and applies with `git apply --3way`
to the GPUix pin. It will not apply to upstream `zed-industries/zed` without a
new port.

```sh
git clone --filter=blob:none https://github.com/remorses/zed.git
cd zed
git switch -c gpuix-transform gpuix
git checkout 2565b8a3e33537c3d3f56d0d45f11e50a17e512d
git apply --3way /path/to/patches/gpui/0001-transform.patch
cargo check -p gpui --locked
```

Check without modifying a checkout:

```sh
sh patches/gpui/check.sh /path/to/zed
```

The playground's local binding build fetches this fork at the GPUix gitlink and
applies the patch behind a flag (plan 538):

```sh
sh apps/playground/scripts/build-native-binding.sh                 # baseline, no transform
GPUIX_TRANSFORM=1 sh apps/playground/scripts/build-native-binding.sh
```

## Verification (2026-10-18)

Environment: macOS 15.8.1, `x86_64-apple-darwin`, Command Line Tools only,
`rustc`/`cargo` 1.97.1 from the pinned `rust-toolchain.toml`.

| Command | Result |
| ------- | ------ |
| `git apply --3way --check` on a clean `2565b8a` tree | pass; applying reproduces the merged files byte-for-byte |
| `cargo check -p gpui --locked` | pass, no warnings from `gpui` |
| `cargo clippy -p gpui --lib --locked` | pass, no warnings from `gpui` |
| `cargo test -p gpui --lib --locked` | **299 passed, 0 failed** |

The test run enabled `gpui_platform/runtime_shaders` on `gpui`'s
`gpui_platform` dev-dependency because this host has no `xcrun metal`; that is
a local test-build flag, not part of the patch. The patch contains 26 transform
tests: 18 in `window::transform_tests`, 5 in `scene`, 1 view-cache test and 2
glyph-culling tests. The branch's two `ViewCacheKey` tests were consolidated
into the one `ViewElementCacheKey::matches` test because GPUix no longer has
`ViewCacheKey`.

## Licence and attribution

`crates/gpui` is **Apache-2.0** at the pin (`crates/gpui/Cargo.toml`;
`crates/gpui/LICENSE-APACHE` → root `LICENSE-APACHE`, "Copyright 2022 - 2025
Zed Industries, Inc."). The 17 branch commits change no licence file and are
used under those terms.

- GPUI: Copyright Zed Industries, Inc. and contributors — Apache-2.0.
- Transform implementation: Copyright Ignacio Perez (`0xErwin1`) — Apache-2.0.
- GPUix: Copyright the GPUix authors — Apache-2.0.

Zed's application code is GPL-3.0-or-later, but this patch touches only
`crates/gpui`, which is marked Apache-2.0. No `crates/zed`, `crates/collab` or
other GPL application file is included. The branch has no recorded CLA (it is a
public fork, not an upstream-merged contribution); upstreaming it to Zed would
require their CLA. Keep the upstream `LICENSE-APACHE` and this attribution when
redistributing a forked source tree or a built artifact.

## Remaining limitations

Unchanged from the audit (plan 525 §3.5):

1. **No rotation.** `ElementTransform` exposes translate, scale and origin only;
   quads/shadows/underlines only transform their bounds, so a rotated box would
   render axis-aligned.
2. **Scale is not fully geometric.** `corner_radii`, `border_widths`,
   `border_style` and shadow `blur_radius` are not scaled with `bounds`.
   Invisible for 0.95→1 entrances; wrong for a 0.25×–4× camera.
3. **Bounds-only sprites.** `PolychromeSprite`/`PaintSurface` scale and
   translate but cannot rotate.
4. **Text AA pops** at the end of a fractional-scale animation: 0.95 uses
   grayscale, 1.0 re-enables subpixel.
5. **Raster cap is 4×.** Above that, text is a 4× raster upscaled by the matrix.
6. **Only `div`** (and `text`, which GPUix builds as a div) honours
   `Style::transform`; wrap other elements in a div.
7. **Anchored overlays position in layout space** — never nest `<anchored>` in a
   scaled subtree; portal overlays to the root.
8. **Hit-test metadata lookup is a linear scan** over transformed hitboxes.
9. **GPUix text selection inside a transformed container is unverified.**
