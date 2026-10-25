# 700 — Accessibility tree: roles, aria-* and focus

| Field | Value |
| ----- | ----- |
| Status | **planned — not started** |
| Phase | runtime (GPUI fork + binding) |
| Owner | runtime owner; reviewed by primitives/components |
| Depends on | none (Zed's own code; port, do not vendor the fork) |
| Source | `references/fc-gpui` (Apache-2.0) `crates/gpui/src/window/a11y.rs`, `crates/gpui/src/elements/div.rs:1210-1378`; upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | the 24 unfiled aria gaps in `COMPONENTS.md` (`aria-current`, `aria-modal`, `aria-haspopup`, `aria-describedby`, `aria-invalid`, `aria-valuenow`, …) |

---
## Goal

Make GPUix publish a real accessibility tree, so a binding can set `role` and the
`aria-*` attributes the ARIA budget currently reports as absent.

## Why

`docs/gpuix-capabilities.md` and every `COMPONENTS.md` partial row cite the same
root cause: the pinned GPUix has no `accesskit` tree, so a role is dropped and a
state is worked around (`aria-selected` for `aria-current`, `aria-description`
for `aria-describedby`, `aria-valuetext` for `aria-valuenow`). fc-gpui carries
Zed's own implementation — this is an upstream cherry-pick, not fork-specific
work.

## Work

1. In `remorses/zed` (branch `feat/a11y`), cherry-pick the upstream accessibility
   commits behind a new `accessibility` cargo feature:
   - `crates/gpui/src/window/a11y.rs` (per-frame `A11y` → `accesskit::TreeUpdate`,
     focus ↔ `FocusId` map, lazy activation so an unused tree costs nothing);
   - the `div` builders (`role`, `aria_label`, `aria_description`, `aria_value`,
     `aria_placeholder`, `aria_disabled`, `aria_required`, `aria_invalid`,
     `aria_modal`, `aria_keyshortcuts`, `aria_selected`, `aria_expanded`,
     `aria_toggled`, `aria_numeric_value`, `aria_orientation`, `aria_level`,
     `aria_position_in_set`, `aria_row_index`);
   - `Element::a11y_role()` opt-in and `Role::Label` for `<text>`.
2. Enable the feature in `gpui_macos`/`gpui_windows`/`gpui_linux` platform builds.
3. In `remorses/gpuix`, add the prop surface: `role` (validated against the
   runtime's `Role` list, `packages/native/src/accessibility.rs`) and the `aria-*`
   keys the renderer already accepts, forwarding to the new builders.
4. In `@gpuix/react`/`@gpuix/solid`, type the attributes on `Props`; delete the
   `ariaSelected` substitutions from the primitives as each real attribute lands.
5. Update `docs/gpuix-capabilities.md`, the ARIA table, `COMPONENTS.md` rows and
   the primitives' `docs/*.mdx` limitations that cite the absence.

## Tests

- Upstream: `cargo test -p gpui --lib` plus the accesskit activation test from the
  cherry-picked commits.
- Binding: a Rust test that a `role`/`aria-*` prop reaches `AccessibilityElement`
  (no window needed), and a test that an unknown role is refused with the
  supported list.
- JS: type-level cases in `packages/react` and `packages/solid`; behaviour cases in
  the affected components replacing their `aria-selected` workaround assertions.

## Acceptance

`getA11yTree()` (plan 701) reports the role and attributes a page sets; the 24
unfiled aria rows move from `unfiled` to `done` (or to one remaining gap each).

## STOP

If the cherry-pick cannot build without the rest of the fork's renderer changes,
stop and report the commit range and the failing symbol. Do not port accesskit by
hand.
