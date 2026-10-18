# 540 — `getElementBounds` is not a well-defined box: evidence and hand-off

| Field | Value |
| ----- | ----- |
| Phase | F (verification truth) |
| Owner | components workstream (`packages/components`) — evidence and harness policy; the fix is binding-owned |
| Depends on | `110`, `117`, `326`, `536`, `539` |
| Status | done as evidence — the harness change was measured, rejected and reverted (§4) |
| Blocker | `~/GPUIXUI/BLOCKERS.md` **B1** — the native binding |

This plan is self-contained. Every number below was measured on this host.

---

## 1. Why — 59 red cases with no component change

At `HEAD` (2026-10-18, binding md5 `c0e554b…`):

```
Test Files  19 failed | 32 passed (51)
     Tests  59 failed | 656 passed (715)
```

Plan `536` classified two combobox cases and attributed them to a changed
`getElementBounds`. This plan finishes the classification: **no single
convention explains what the runtime reports**, so no test harness can normalise
it, and the components package must not try.

## 2. The measurement — three conventions in one build

Probe: one flex-column root (window 1280×800) with three children, each
`padding 10, borderWidth 1, height 30`, laid out at `x = 0`:

| child | authored layout x | reported |
| ----- | ----------------- | -------- |
| block (`display` default) | 0 | `x 11, width 1278` |
| flex, `justifyContent: flex-start` | 0 | `x 11, width 1278` |
| flex, `justifyContent: center, alignItems: center` | 0 | `x 1, width 1278` |

The third one reports the **border-box origin**; the first two report the
**content-box origin**. The size is the padding-box size in all three. A
per-side probe confirms the origin rule for the first two
(`paddingLeft 9, borderLeftWidth 5` → `x 14`).

The same inconsistency is visible in production trees: a `Popover` trigger
(`display:flex, justifyContent:center`, padding 10, border 1) reports `x 1`
inside a root at `x 0`, while its panel (block, padding 12, border 1) reports
`x 13` — the two boxes mix conventions, so `panel.x === trigger.x` cannot be
recovered from either box.

`getAutomationTree()` reports the same numbers, so it is not an alternative
source.

## 3. Why this is not artifact-specific

`@gpuix/native@0.10.0`'s release tag is `9fcd628` (GitHub tags API), pinning zed
`81c99f81`. That source was built here with the documented `runtime_shaders`
deviation:

```
.agents/slop/scratch/gpuix-release/  (gitignored scratch)
  gpuix @ 9fcd628, zed @ 81c99f81
  cargo build --release --locked --target x86_64-apple-darwin   EXIT=0
  libgpuix_native.dylib  md5 e7a3c648a0706f4d617d38b4f9923a78
```

Measured with that artifact the popover panel is still `x 53` against a trigger
at `x 41` (the pre-existing failure), so the `main`-based build the
`binding-gaps` workstream installs is not the cause. The tracked `canvas` that
records bounds (`automation::bounds_tracker` at the tag, `track_host_bounds` on
`main`) resolves against the element's layout in a way that depends on the
element's own alignment — in both sources.

The shared store
(`node_modules/.store/@gpuix+native@0.10.0/.../gpuix-native.darwin-x64.node`)
was restored to md5 `c0e554b…` after the experiment; the release-tag artifact
stays in this worktree's scratch for the owner to reuse.

## 4. The harness change that was tried and rejected

`boundsOf` was changed to normalise the reported box with the element's authored
`padding`/`borderWidth` and a once-per-process convention probe (all four modes
and the per-side parsing were unit-tested). Measured on `popover`:

- before: 2 of 19 red;
- after: 2 of 19 red, different cases (`panel.x` now off by 10, the trigger's
  padding).

The normaliser is sound only if one convention applies to every element; §2
shows it does not. The change was reverted rather than tuned to today's build,
which would encode the same brittleness one layer deeper. `interaction.ts` keeps
asserting raw reported geometry.

## 5. Classification of the 59

| Class | Cases | Owner |
| ----- | ----- | ----- |
| position/size from a mixed box convention | 34 (`popover` 3, `preview-card` 6, `dropdown-menu` 2, `context-menu` 1, `drawer` 1, `command-menu` 1, `button` 1, `combobox` 1, `time-picker` 1, `tabs` 2, `list` 8, `message-scroller` 6, `carousel` 1) | binding (`getElementBounds`) |
| no `focus`/`blur` event for a native focus change | 24 (every "paints the focus ring" case, the blur commits in `color-picker`/`inline-edit`/`hotkey-recorder`/`tabs`, the `mention-input` handler case) | binding (event delivery) |
| scroll bookkeeping changed | 1 (`message-scroller` pinned/unread) | binding `playground` to pin |

None of them is a component regression: the same suite was green before the
binding was replaced, and no component file changed with the swap.

## 6. Hand-off

To `binding-gaps` / `playground` (recorded in `TODO.md` → Interlocks):

1. Make `getElementBounds` report one box for every element. The layout
   (border) box is the only convention a component contract can be written
   against: a trigger and its surface then compare directly.
2. Deliver `focus`/`blur` for `focusElement`, `focusNext`/`focusPrevious` and a
   pointer focus change, or document that a live component cannot observe focus
   (24 cases stay red otherwise).
3. Reproduction (no component code needed): render a flex column with the three
   children in §2 and compare `getElementBounds` with the authored layout.

Nothing in `packages/components` changes until (1) and (2) land; the suite stays
honest and red rather than green by weakening.

## 7. STOP conditions

- A future binding reports one convention → delete this record's blocker note,
  re-run the suite, and expect the 34 position cases to pass without a harness
  change.
- A component is suspected instead of the binding → reproduce with the §2 probe
  first; do not tune an assertion to the current build.
