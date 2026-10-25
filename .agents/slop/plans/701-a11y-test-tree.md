# 701 — Headless accessibility assertions in the test renderer

| Field | Value |
| ----- | ----- |
| Status | **landed** — `TestGpuixRenderer.getA11yTree()` exists in `packages/native/src/test_renderer.rs:1124`, backed by `Window::debug_a11y_tree_json()`. Remaining: a typed `a11yTree()` helper in `packages/testing` and converting suites to read it. |
| Phase | testing (GPUI fork + binding tests) |
| Owner | runtime owner; reviewed by the components workstream |
| Depends on | 700 |
| Source | `references/fc-gpui` (Apache-2.0) `crates/gpui/src/window.rs:5815` (`debug_a11y_tree_json`), `crates/gpui/src/platform/test/window.rs:456`; upstream `remorses/zed` at the pin; `remorses/gpuix` fork |
| Feeds | an `aria-*` guard for every component, replacing prose claims |

---
## Goal

Expose the accessibility tree a window drew, so tests assert roles and names
instead of reading `customProps`.

## Why

Today the component suites assert `role`/`aria-*` off the props a part was
handed. That cannot catch a role the runtime drops, which is exactly the class of
bug the aria budget keeps finding.

## Work

- Port `Window::debug_a11y_tree_json()` (pretty JSON: `role`, `label`,
  `children`) and `TestAppContext::simulate_accessibility_activation()` with the
  plan 700 cherry-pick.
- Add `getA11yTree(): A11yNode[]` to `TestGpuixRenderer` in
  `packages/native/src/test_renderer.rs` (decoded JSON, napi object).
- Add `a11yTree(page)` to the JS test helpers (`packages/testing`), typed.
- Convert three representative suites first (button, dialog, table), then the
  rest as plan 700 lands.

## Tests

- Rust: a window with a labelled button reports `role == "Button"` and the label.
- JS: a component that loses its `role` in a refactor fails by name; the negative
  control renders the same tree without `role` and expects the node to be absent.

## Acceptance

At least one assertion per component lane reads the tree; `COMPONENTS.md` rows
that claim a role cite the tree test.

## STOP

If activation needs a real renderer frame on Linux (the test renderer is
macOS/Windows only), scope the JS helper to those platforms and say so.
