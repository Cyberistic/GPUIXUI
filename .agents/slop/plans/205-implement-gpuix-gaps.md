# 205 — Implement the "not provided by GPUix" cluster

| Field | Value |
| ----- | ----- |
| Phase | C and E (Tier 1–2, then specialised) |
| Owner | components workstream for A–D; docking / data-grid for E; primitives for Tier 1 |
| Depends on | `200` (API contract), `201` (state model), `203` (capability map), `030` + `110–117` (the per-component plans this sequences) |
| Status | planned |

This plan is self-contained. It is the **coverage and dependency order** for every
`COMPONENTS.md` row that GPUix does not provide — the complement of the
"Not provided by GPUix" section. It does **not** re-specify components that plans
`110–117` already specify; it names them, fixes their order, and states the GPUix
primitive each is built on.

---

## 1. Scope

`COMPONENTS.md`'s "Not provided by GPUix" section lists the rows that need real
implementation. This plan groups them, gives the dependency order, and names the
GPUix primitive each builds on. A row already owned by another plan is marked
**`→ 1xx`** and left to that plan.

**Provided — not in scope** (API-shape only): Text, Icons, Separators, Spacers,
Stack/layout, Boxes, Scrollable containers, Text inputs, Text areas, Selects,
Comboboxes, Tooltips, Virtualized lists, Syntax highlighting, Diff viewer, Image
preview, File/folder selection.

## 2. Group A — input widgets

Built on `div`, `<input>`, `motion` (opacity/size/position only), the shared
keyboard contract (`packages/primitives/src/core/keyboard.ts`, plan `030`), and
roving focus. `aria-checked` / `aria-valuenow` are **unsupported** — model state
with `role` + `aria-selected` / `aria-valuetext` and record the gap.

| # | Row | Primitive | Depends on | Plan |
| - | --- | --------- | ---------- | ---- |
| A1 | Checkboxes | `div` + `role` + keyboard | keyboard contract | `030` |
| A2 | Radio groups | `div` + roving focus | A1 | `030` |
| A3 | Switches | `div` + `motion` | keyboard contract | `030` |
| A4 | Toggle | `div` + keyboard | A1 | — |
| A5 | Labels | `<text>` | — | — |
| A6 | Button groups | `div` + Button keyboard | Button (`030`) | — |
| A7 | Slider | `div` + pointer + keyboard | A1 (roving model) | — |
| A8 | Meter | `div` + `<text>` | — | — |
| A9 | Rating | `div` + roving focus | A2 | — |
| A10 | Number Field | `<input>` + stepper `div`s + pointer scrub | A7 (scrub is a slider) | — |
| A11 | OTP Field | `<input>` ×N + paste handling | A10 | — |
| A12 | Tag / token input | `<input>` + chip `div`s | A5 | — |
| A13 | Mention input | `<input>` + `FloatingLayer` + `<anchored>` | A12, `110` | — |
| A14 | Hotkey-recorder input | focused `div` + `KeyEvent` | A5 | — |
| A15 | Color picker | Slider ×3 + inputs + swatches | A7, A10, `201` | — |

**Color picker limitation (from `COMPONENTS.md`, unverified):** the
saturation/value square needs radial/multi-stop gradients, which GPUix does not
support. Ship a swatch grid or a pre-rendered bitmap; do not fake the square.

## 3. Group B — form primitives

Built on `div`, `<text>`, and Effect for validation. There is no form host
element; validation state lives in the package, not the renderer.

| # | Row | Primitive | Depends on | Plan |
| - | --- | --------- | ---------- | ---- |
| B1 | Fieldset | `div` + `<text>` | — | — |
| B2 | Inline validation | `div` + `<text>` + `ring` | B1 | — |
| B3 | Form | pure runtime (plan `201`) + Effect | B2, A1–A3, A10 | — |
| B4 | Multi-step forms (Tier 5) | composition over B3 + Stepper | B3, C-step | — |
| B5 | Stepper | `div` + `<text>` | B1 | — |

## 4. Group C — media / visual

Built on `<img>`, `<svg>`, `<virtual-list>`, `motion`, and — **unverified** —
`<canvas>` ("Custom drawing (planned)") and any media-playback surface.

| # | Row | Primitive | Depends on | Status |
| - | --- | --------- | ---------- | ------ |
| C1 | Carousel | `motion` width/left/opacity | — | **no transform/scale** (verified) — discrete stepping only |
| C2 | Timeline | `div` + `<text>` | — | — |
| C3 | Countdown | `<text>` + app `Clock` | — | — |
| C4 | Keyboard shortcuts / keycap display | `div` + `<text>` | — | — |
| C5 | QR code | grid of `div`s or one `<svg>` | — | encoder dependency not chosen |
| C6 | Crop area | `<img>` + pointer handles | — | mask painting **unverified** |
| C7 | File upload | `promptForPaths` + `onFileDrop` + `motion` | — | picker provided; surface ours |
| C8 | Video / audio player + waveform | **no media host element** | — | **blocked/unverified** — needs a platform surface |
| C9 | Charts (Tier 3) | `<svg>` static, or `<canvas>` | C5 | `<canvas>` **unverified** |
| C10 | Terminal surfaces (Tier 4) | none | — | **blocked/unverified** |
| C11 | Code editor integration (Tier 5) | `<textarea>` + `<code>` | — | **no editable code surface** (verified) |
| C12 | Rich-text editing (Tier 5) | `<textarea>` + `<markdown>` render | — | editing not provided (verified) |
| C13 | Drag and drop | mouse events | — | **no drag host feature**; `onFileDrop` only |

**STOP before building C8, C10 and C11.** They depend on a capability GPUix does
not document. Record the evidence, the affected rows and the strongest honest
alternative in `COMPONENTS.md` and `docs/gpuix-capabilities.md` — do not ship a
placeholder.

## 5. Group D — overlays and navigation

Built on `createPortal`, `FloatingLayer` + `<anchored>`, `AnimatePresence` +
`motion`, and focus handles. `Dialog` and `DismissableLayer` are **main-only**
(absent from published 0.10.0) — build the dialog shell ourselves.

| # | Row | Primitive | Plan |
| - | --- | --------- | ---- |
| D1 | Dialogs | `createPortal` + `div` + `motion` + focus handles | `112` |
| D2 | Confirmation dialogs | D1 + a real workflow | `112` |
| D3 | Popovers | `FloatingLayer` + `<anchored>` | `112` |
| D4 | Dropdown menus | D3 + menu runtime | `114` |
| D5 | Context menus | D4 + `onAuxClick` | `114` |
| D6 | Command menus | `<input>` + D3 + `<virtual-list>` | `114` |
| D7 | Toasts / notifications | `AnimatePresence` + `createPortal` + `<anchored>` | `115` |
| D8 | Drawer | `div` + `motion` + `createPortal` | `112` |
| D9 | Navigation Menu | D3 + nav runtime | — |
| D10 | Preview Card | D3 | — |
| D11 | Tabs | roving focus + `motion` | `113` |
| D12 | Accordions / Collapsible sections | `motion` height | `113` |
| D13 | Breadcrumbs / Pagination | `div` + `<text>` + Button groups | `113` |
| D14 | Search inputs | `<input>` | — |
| D15 | Date / time pickers | `div` + `<text>` + keyboard grid | — |

## 6. Group E — data and workspace

Semantics come from plan `204`; `<virtual-list>` is **reused, not
re-implemented**. All of Tier 4 is here.

| # | Row | Primitive | Plan |
| - | --- | --------- | ---- |
| E1 | Tables, Sortable tables, Row selection, Column configuration, Resizable columns, Filtering controls, Data toolbars | grid + `<virtual-list>` | data-grid plans |
| E2 | Virtualized tables, Expandable rows | `<virtual-list>` + grid | data-grid plans |
| E3 | Tree views, File trees, Virtualized hierarchical data | `<virtual-list>` + indentation | `204` |
| E4 | Key-value displays, Property panels, Property editors, Statistic / metric cards | `div` + `<text>` + B1/B2 | — |
| E5 | Resizable split panes, Panel groups, Collapsible sidebars, Tabbed panels, Nested arrangements, Workspace layouts, Persistent panel state | `div` + `motion` | `204` |
| E6 | Docking layouts, Detachable / movable tabs, Multi-pane editing layouts | E5 | `204` — detachable tabs **unverified** |
| E7 | Command palette, Application menus, Status bars, Toolbars, Breadcrumb navigation, Inspector panels, Log viewers, Search and replace | D4/D6 + `<virtual-list>` | `204` |
| E8 | Keyboard navigation | focus handles + roving model | `030`/`201` |
| E9 | Advanced filtering / query builders | inputs + menus | — |

## 7. Global dependency order

```
keyboard contract (030) + state model (201)
   → A1–A6, B1–B2, D11–D13
   → A7–A11 (controls with real state)
   → B3 (Form) → B4 (multi-step)
   → A12–A15
   → D1–D8 (overlays) → D9–D10, E7
   → E1–E4 (data) → E5–E6 (workspace) → E9
   → C1–C7, C9 (visual, independent)
   → C8, C10, C11, C12, E6-detach  [STOP — unverified capability]
```

## 8. Files to create or change

| Path | Action |
| ---- | ------ |
| `docs/implementation-order.md` | **create** — §2–§7 |
| `docs/README.md` | add the `implementation-order.md` row |
| `TODO.md` | one Phase C task per Group A/B row, one Phase D per E, one Phase E per C; plus the C8/C10/C11/C12 "documented limitation" tasks |
| `COMPONENTS.md` | keep the "Not provided by GPUix" list in sync; a row moves to `wip` when its plan starts |

Do **not** create component source here. Each row's implementation is a plan of
its own, per `AGENTS.md` §0.

## 9. Commands and expected results

```sh
grep -c "^| A\|^| B\|^| C\|^| D\|^| E" docs/implementation-order.md   # expected: >= 30
grep -n "unverified\|blocked" docs/implementation-order.md            # expected: C8, C10, C11, C12, E6
nub run check                                                          # expected: exit 0
```

## 10. STOP conditions

Stop and report if:

- a Group C or E6 row needs a capability `203` marks not supported — mark it
  `unverified`/`blocked`, cite the evidence, and do not build a placeholder;
- a row's primitive turns out not to be published in 0.10.0 (re-verify against
  `workspaces/*/node_modules/@gpuix/...`) — update `COMPONENTS.md` and stop;
- you are about to duplicate a row already specified by plans `110–117` or `204`.

## 11. Test plan

- The `docs/implementation-order.md` contract test asserts every row has a
  primitive and a plan/owner, and that C8/C10/C11/C12/E6 carry an
  `unverified`/`blocked` marker. Removing a marker fails it.
- Each implementation plan's own able-to-fail test is the behaviour proof; this
  plan ships sequencing only, so it ships no runtime test.

## 12. Acceptance criteria

- Every "Not provided by GPUix" row appears exactly once in Groups A–E, with a
  primitive, a dependency and a plan/owner.
- The unverifiable rows are marked and evidenced, not promised.
- `TODO.md` carries one trackable task per row; `docs/README.md` indexes the doc.
