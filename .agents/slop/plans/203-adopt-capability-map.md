# 203 — Adopt `adabraka-ui`'s GPUI limits map as `docs/gpuix-capabilities.md`, re-verified against GPUix 0.10.0

| Field | Value |
| ----- | ----- |
| Phase | A (audit and feasibility) — the capability record every component plan cites |
| Owner | primitives workstream (owns `020` and the capability doc); docs-site consumes it |
| Depends on | `020-gpuix-runtime-capability.md` (**the probe record — do not duplicate it**), `110-native-smoke-test.md` (the executable verdicts) |
| Status | planned |
| Source | `references/adabraka-ui/GAP_ANALYSIS.md` §2 (MIT, `Copyright (c) 2025 Adabraka Team`), commit `e158684`; `references/gpuix` README + `packages/native/js/host.ts` |

This plan is self-contained. It writes **one document** by re-expressing
`adabraka`'s limits table in GPUix's terms. It is a verification task, not a
transcription: `adabraka` describes **upstream GPUI**, and it depends on a **GPUI
fork** (`adabraka-gpui` 0.5), so its verdicts are a checklist to check, never
authority.

---

## 1. Why

MISSION forbids faking unsupported capabilities. `adabraka`'s `GAP_ANALYSIS.md`
§2 is a pre-researched, itemised list of exactly what the renderer underneath
GPUix cannot do, with a "workaround possible?" column. Adopting its **structure**
gives us a capability map; re-verifying each row against **GPUix 0.10.0** makes it
true. Plan `020` already established the GPUix facts; this document is their
durable, publishable form.

**Relationship to plan `020`.** `020` is the *probe record* — the commands, the
host verdict, the verification strategy. This document is the *capability
reference* — one row per capability, with the verdict, the evidence path and the
workaround. Where they disagree, `020` §1 wins (it was measured) and this
document is corrected.

## 2. The document to write

Create `docs/gpuix-capabilities.md` with:

1. **Header** — GPUix version (`@gpuix/react` / `@gpuix/native` **0.10.0**,
   Apache-2.0), the evidence source (`references/gpuix`), and a one-line pointer
   to `020` §3 for the host/verification status.
2. **Host elements** — the verified `ElementType` union: `div`, `text`, `img`,
   `svg`, `canvas`, `input`, `textarea`, `anchored`, `code`, `diff`, `markdown`,
   `virtual-list`. Note `<canvas>` is **"Custom drawing (planned)"** in the
   README's Supported Elements table — do not build on it.
3. **Provided by GPUix** — the headless components published in 0.10.0
   (`Select`, `Combobox`, `Tooltip`, `AnimatePresence`/`motion`, `floating`'s
   `FloatingLayer`/`useControllableState`/`StateStyle`, `createPortal`) and the
   renderer APIs (`promptForPaths`, `focusElement`, `focusNext`,
   `focusPrevious`, `focusNextWithin`).
4. **The limits table** — one row per `adabraka` §2 entry, with columns
   `Capability | GPUix verdict | Evidence | Workaround`. Start from §3 below.
5. **Cross-cutting gaps** — the Accessibility and animation gaps (also in `020`
   §1.4), because components cite them.

## 3. The rows (re-verified against GPUix 0.10.0)

Each verdict was checked in `references/gpuix` on 2026-10-17. "Verified" means the
fact is in the README or the published types; "unverified" means it is **not**
documented and must not be assumed.

| Capability | GPUix verdict | Evidence |
| ---------- | ------------- | -------- |
| flexbox + grid | **supported** | `README.md` Styling: `display: "flex" \| "grid"`; `gridTemplateColumns`/`Rows` are numbers |
| two-stop linear gradients | **supported, 2 stops only** | `README.md` "Linear gradients": "does not support radial, conic, repeating, or gradients with more than two stops" |
| multi-stop / radial / conic / repeating gradients | **not supported** | same section |
| `boxShadow`, including `inset` | **supported** | `README.md` `boxShadow` is a structured object with an `inset` field |
| per-corner radii, per-side borders, `borderStyle: solid\|dashed` | **supported** | `README.md` Visual style list |
| opacity | **supported** | Visual list |
| per-element `transform` / `rotate` / `scale` | **not supported** | not in the Visual list; `motion` targets are only `width`, `height`, `top/right/bottom/left`, `opacity`, `borderRadius` |
| `z-index` / stacking order | **not supported** | "Beyond that, tree order is paint order: gpuix has no z-index" |
| backdrop blur | **macOS window only** | `windowBackground: "blurred"` is the macOS vibrancy backdrop; there is no per-element `backdropFilter` |
| CSS `filter` | **not supported** | not in the style list |
| `clip-path` | **not supported** | not in the style list |
| blend modes | **not supported** | not in the style list |
| text shadow | **not supported** | the Text list has no shadow field |
| sticky positioning | **not supported** | `position` is `relative \| absolute \| fixed`; `fixed` "lays out like absolute, because GPUI has no scrolling document to be fixed against" |
| scroll snap | **not supported** | no `scrollSnap*` in the style list |
| container queries | **not supported** | no such field; `useWindowSize` is the responsive hook |
| `aspectRatio` | **supported** | Sizing list: "`aspectRatio` (width divided by height)" |
| CSS shorthand / `calc()` | **not supported** | "No shorthand values … `calc()` are ignored" |
| keyframe animations | **not supported** | "Springs, keyframes, variants, and shared layout animations are not available yet" |
| animation interruption | **supported** (target change resumes from the current value) | `README.md` "If a target changes while motion is active, the next transition starts from the current visible value" |
| reduced-motion detection | **unverified** | not documented; do not assume a media query or a runtime flag |
| custom paint | **unverified / planned** | `<canvas>` = "Custom drawing (planned)" |
| pointer, keyboard, focus, scroll events | **supported** | `README.md` Events; native `FocusHandle`s |
| `role` + a subset of `aria-*` | **supported, partial** | `role`, `aria-label`, `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`, `aria-valuetext`, `aria-level`. **No** `aria-checked`, `aria-valuenow`, `aria-labelledby`, `aria-describedby` |

`adabraka`'s items **absent from this table** (quad transforms on divs, deferred
z-ordering, glyph-atlas text, 22 cursors, hit-testing) are covered by the
supported rows or by plan `020` §1.2 — do not copy them verbatim.

## 4. Files to create or change

| Path | Action |
| ---- | ------ |
| `docs/gpuix-capabilities.md` | **create** — §2 above |
| `docs/README.md` | `gpuix-capabilities.md` row already exists (Phase A) — confirm the path matches |
| `PLAN.md` §5 | close the open question "Which GPUix primitives actually exist…" by pointing at this document + `020` §3 |
| `LICENSES/adabraka-ui.md` | MIT + `Copyright (c) 2025 Adabraka Team`; **limits-table structure referenced, no source or asset copied** |
| `COMPONENTS.md` | the "GPUix support" column cites this document as its evidence |

## 5. Commands and expected results

```sh
test -f references/adabraka-ui/GAP_ANALYSIS.md        # expected: exit 0
test -f docs/gpuix-capabilities.md                    # expected: exit 0
grep -n "canvas" docs/gpuix-capabilities.md           # expected: "planned", not "supported"
grep -n "z-index" docs/gpuix-capabilities.md          # expected: "not supported"
grep -n "unverified" docs/gpuix-capabilities.md       # expected: >= 3 rows
nub run check                                          # expected: exit 0
```

## 6. STOP conditions

Stop and report if:

- you cannot find the evidence for a row in `references/gpuix` — mark it
  **`unverified`** and add it to this plan's STOP list; never assert it works;
- a row contradicts `020` §1 — stop and reconcile with the primitives workstream
  rather than editing `020`'s measured facts;
- the GPUix version in `references/gpuix` is not 0.10.0 — the whole table must be
  re-verified before it is written;
- you are about to copy text from `GAP_ANALYSIS.md` verbatim — re-express it, and
  never copy from `references/adabraka-ui/assets/` (unlicensed Lucide icons,
  Inter / JetBrains Mono fonts, a sample MP3).

## 7. Test plan

- `docs/gpuix-capabilities.md` is asserted by a small `docs/` contract test:
  it must contain the `ElementType` union, a `z-index` row marked not supported,
  and at least three `unverified` rows. Delete the `unverified` marker from the
  reduced-motion row and the test fails.
- The **executable** verification is plan `110`'s smoke suite; this document
  cites its `smoke-report.json` when it exists and says "blocked — plan 020 §3"
  when it does not.
- Never claim a capability is supported because `adabraka` says so.

## 8. Acceptance criteria

- `docs/gpuix-capabilities.md` exists with §2's five parts and §3's rows.
- Every row carries a verdict, an evidence path, and (where one exists) a
  workaround; every uncertain row says `unverified`.
- `COMPONENTS.md` and the component plans can cite it instead of restating facts.
- No `adabraka` asset and no `GAP_ANALYSIS.md` prose was copied.
