# 531 — GPUix binding gaps: percentage insets, auto margins, outline, ARIA values

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (native capability) |
| Owner | binding-gaps workstream |
| Depends on | `530` (the source-built binding and its patch mechanism), `537` (the capability audit) |
| Feeds | `524` §5 (`packages/tw`), Checkbox / Slider / Meter / Progress ARIA, Dialog / Popover centring |
| Amends | `537` §7.1 P0.1, P0.3, P0.4 |

## 1. Goal

Close the three binding-level gaps the `gpui-ce` audit ranked P0, without
switching GPUI and without porting anything the pinned source already has:

1. **Percentage insets and auto margins.** GPUI's `Length` already accepts
   pixels, a fraction of the parent, and `Auto`; GPUix's `StyleDesc` exposed
   only `Option<f64>` for `top/right/bottom/left` and the margins. `top-1/2`,
   `left-1/2` and `mx-auto` cannot be expressed.
2. **Outline / ring offset.** The pin has `Outline { width, color, offset }` and
   GPUix `main` already maps `outlineWidth` / `outlineColor` /
   `outlineOffset`. Verify that the source this worktree builds from exposes and
   applies them; do not port them again.
3. **ARIA value props.** The pin has `aria_toggled`,
   `aria_numeric_value`, `aria_min_numeric_value` and `aria_max_numeric_value`;
   the binding exposes only `aria-valuetext`. Map `aria-checked`,
   `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.

**Non-goals:** `packages/tw` mapping (separate package owner; recorded as a
follow-up), component adoption of the newly available props, transform /
backdrop-filter / colour transitions (plan `537` §7.3–§7.4), and any GPUI
change.

## 2. Sources read

- `references/gpuix/packages/native/src/{style,renderer,motion,accessibility}.rs`
  and `packages/native/js/host.ts` at `515df19` (GPUix `main`).
- GPUix pin `2565b8a`: `crates/gpui/src/{geometry,style,styled}.rs`,
  `crates/gpui/src/elements/div.rs`, `crates/gpui_macros/src/styles.rs`.
- Audit `537` §5.4, §5.5, §5.7 and §7.1.

## 3. Design

### 3.1 Percentage insets and auto margins (`0003-dimension-insets.patch`)

Reuse `DimensionValue` — already the width/height type and already decoded from
a number (**pixels**) or a string (`"50%"` → `Fraction(0.5)`, `"auto"`).

- `style.rs`: `margin*` and `top/right/bottom/left` become
  `Option<DimensionValue>`.
- `style.rs`: one `DimensionValue::length() -> gpui::Length` conversion
  (`px` / `relative` / `Length::Auto`), used by both insets and margins.
- `renderer.rs`: the existing setters pass `value.length()` instead of
  `gpui::px(value as f32)`. A numeric style produces the same `Pixels` as
  before, so every existing tree is unchanged.
- `motion.rs`: motion still animates **pixels only** (plan `537` §5.6); its
  `apply_to` wraps the animated number in `DimensionValue::Pixels`. A motion
  track cannot turn a percentage or `auto` into a keyframe.
- `js/host.ts`: the same eight fields become `DimensionValue`; `packages/react`
  re-exports the type, so no second definition.

### 3.2 Outline / ring offset (no patch)

Verified in the pinned source, not re-ported:

- `styles.rs` / `style.rs`: `Outline { width, color, offset }`;
- `style.rs`: `outline_width`, `outline_color`, `outline_offset`;
- `renderer.rs`: `el.outline(gpui::Outline { ... offset ... })`;
- `js/host.ts`: `outlineWidth`, `outlineColor`, `outlineOffset`.

The published 0.10.0 typings and binary lack them; the source-built binding
this worktree installs has them (plan `529` records the provenance delta).

### 3.3 ARIA values (`0004-aria-values.patch`)

`accessibility.rs` maps:

| React prop | GPUI call |
| ---------- | --------- |
| `aria-checked` boolean / `"mixed"` | `aria_toggled(Toggled::{True,False,Mixed})` |
| `aria-valuenow` number | `aria_numeric_value(f64)` |
| `aria-valuemin` number | `aria_min_numeric_value(f64)` |
| `aria-valuemax` number | `aria_max_numeric_value(f64)` |

A string that is not `"true"`, `"false"` or `"mixed"`, and a non-number value,
is ignored like an invalid role. `js/host.ts` gains the four props with React's
`aria-checked` type (`boolean | "false" | "mixed" | "true"`).

## 4. Patch mechanics

`apps/playground/scripts/build-native-binding.sh` copies `references/gpuix`
into `.agents/slop/scratch/gpuix-build/gpuix`, then applies, in this order and
idempotently (reverse-dry-run first):

1. `gpuix-zindex.patch` (plan `530`)
2. `0003-dimension-insets.patch`
3. `0004-aria-values.patch`

`0003` is generated against the tree **after** `zIndex`; the two touch adjacent
lines in `style.rs` and `host.ts`. `0004` is independent of both.

## 5. Test plan

| Test | What it guards |
| ---- | -------------- |
| `deserializes_percentage_and_auto_insets_and_margins` | `"50%"` → `Fraction(0.5)`, `"auto"` → `Auto`, numbers stay pixels |
| `maps_dimensions_to_gpui_lengths` | the renderer conversion is pixels / relative / auto, not all pixels |
| `maps_aria_checked_to_toggled` | bool and `"mixed"` map; junk and a different prop do not |
| `reads_numeric_aria_values` | all three numeric props read; a string is not a number |
| `decodes checked and numeric accessibility fields` | the adapter keeps `toggled` and the three numeric values instead of dropping them |
| `cargo test --release --lib` in the patched scratch tree | the tests above plus no regression in the existing suite |
| `nub apps/playground/dist/smoke/run.js --only input-edit` | the rebuilt binding still mounts and edits |
| `nub apps/playground/dist/smoke/run.js --only layout-flex` | numeric flex layout is unchanged |

Both Rust tests fail if the conversion collapses to pixels or the mapping is
removed. The two smoke scenarios are regression checks, not new capability
claims: no scenario can spell `top: "50%"` until the patched `@gpuix/native`
typings ship.

## 6. STOP conditions

1. A change needs a GPUI source edit — stop and report; this plan is
   binding-only.
2. A `StyleDesc` field cannot be mapped honestly (for example a percentage
   silently truncated to pixels) — stop.
3. The build fails for a reason unrelated to the patches — stop and report the
   exact error.
4. `references/` would be edited — stop; only patch the scratch copy.

## 7. Results (2026-10-18, darwin-x64)

**Patches.** `0003-dimension-insets.patch` (style, renderer, motion, host type)
and `0004-aria-values.patch` (mapping, helpers, tests, host type) apply after
`gpuix-zindex.patch` to `references/gpuix` `515df19`. The build script now
preflights every patch with `git apply --check` and detects an already-patched
tree by reverse-applying a throwaway copy of the touched files. The old BSD
`patch -R --dry-run` check exited `0` after ignoring a failed hunk, so a fresh
tree was reported as "already applied" and the next patch failed. The real
scratch tree reports `binding patches already applied` on a second pass.

**Build.** `sh apps/playground/scripts/build-native-binding.sh`: `EXIT=0` in
**12 m 02 s**; artifact 25 611 648 B; sha256
`9c0a5830ac03147b4f4838b4ba36581c10398001c98c9816a7160c68ee9416b8`. Four
pre-existing warnings (`license`/`license-file`, `browser_platform_is_macos`,
`is_empty`, `hash_into`) plus the `aws-lc` compact-unwind linker note; none in a
patched file. The binary contains `zIndex`, `outlineWidth` and
`aria-valuenow`.

**Outline.** Verified in the pinned source, not patched: `style.rs:243-245`
(`outline_width/color/offset`), `js/host.ts:195-198`, and
`renderer.rs:6497-6501` (`gpui::Outline { width, color, offset }`). The
published 0.10.0 package still lacks them; the source-built binding has them.

**Rust.** `cargo test --release --locked --target x86_64-apple-darwin --lib` in
the patched scratch tree: **273 passed, 0 failed**. New:
`deserializes_percentage_and_auto_insets_and_margins`,
`maps_dimensions_to_gpui_lengths`, `maps_aria_checked_to_toggled`,
`reads_numeric_aria_values`.

Two-direction proofs (mutation, then restore):

- `Percentage` mapped to `px(0)` → `maps_dimensions_to_gpui_lengths` fails
  (`left: 0px, right: 50%`); restored, passes.
- `"mixed"` mapped to `Toggled::True` → `maps_aria_checked_to_toggled` fails
  (`left: Some(True), right: Some(Mixed)`); restored, passes.

**Runtime probes** (private package copy, outside the registry):

```text
top: 50% / left: 25% -> {"x":50,"y":100,"width":50,"height":50}
mx-auto             -> {"x":75,"y":0,"width":50,"height":50}
PROBE PASS

checkbox -> {"role":"CheckBox","author_id":"probe-checkbox","label":"Check","toggled":"Mixed"}
slider   -> {"role":"Slider","author_id":"probe-slider","label":"Volume","numeric_value":42,"min_numeric_value":0,"max_numeric_value":100}
PROBE PASS
```

The probe imports `TestRenderer` from `@gpuix/native/testing`; the bare native
class returned an empty dump in the same process, so the shared test adapter is
part of the evidence path.

**Smoke** (private package with the same sha256, linked into
`apps/playground/node_modules/@gpuix/native` for the run): `--only input-edit`
`1/1`, `--only layout-flex` `1/1`, `--only a11y-tree` `1/1`, all exit `0`. The
machine-wide nub store was overwritten by another worktree before the first
smoke run (installed hash `fee1fcaa…`), which is why the private copy was used.

**Tests and gate.** `nub run --filter @gpuixui/testing test`: 59 passed.
`nub run --filter playground test`: 31 files, 397 tests passed.
`nub run --filter playground check-types`: exit `0`.
`nub run test`: tokens 196, testing 59, icons 19, components 308, primitives 282,
playground 397 — all green. `nub run check`: exit `0` (including
`check:tests`, lint, format and every `check-types`).

## 8. Follow-ups

- `packages/tw`: emit `top-1/2` / `left-1/2` as `{ top: "50%" }` /
  `{ left: "50%" }`, `mx-auto` as `{ marginLeft: "auto", marginRight: "auto" }`,
  and remove the corresponding `unsupported.ts` entries. Not edited here.
- `packages/tw`: `ring-offset-*` → `outlineOffset`; remove
  `ring-offset-background` from `unsupported.ts`.
- `@gpuixui/primitives` / `components`: adopt `aria-checked` and
  `aria-valuenow/min/max` where they currently carry state in `aria-valuetext`.
- The published `@gpuix/native` 0.10.0 typings do not know these fields; code in
  this repo needs a rebuilt package or the next release, exactly as plan `530`
  recorded for `zIndex`.
- `motion` remains pixels-only; percentage insets and auto margins do not
  animate.
