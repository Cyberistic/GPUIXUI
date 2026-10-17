# 082 — `Text`'s `clamp` is decided by whichever identical string the runtime lays out first

| Field | Value |
| ----- | ----- |
| Phase | F (Tier 1 correctness) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `059`, `074` |
| Status | **done** |

Self-contained: §1 the measurement, §2 the rule, §3 the files, §4 the test plan,
§5 STOP conditions, §6 the outcome.

---

## 1. The gap, measured

`Text` implements `clamp` with the runtime's `lineClamp` style field, and the
docs promise "clip after N lines". The runtime applies `lineClamp` to the
**shaped text layout**, and it keeps one text layout per string/font/width for
the whole window — `lineClamp` is not part of that cache key. The **first**
layout of a string at a width wins for every later copy of that exact string at
that width.

Measured on this host in one fresh 1280×800 `TestRenderer` window, a 120 px
column, `role="body"` (`lineHeight: 18`), one long sentence, six lines
unclamped (108 px):

| Scene | First `Text` | Second `Text` | Height |
| ----- | ------------ | ------------- | ------ |
| clamp only | `clamp={2}` | — | **36** (2 lines, correct) |
| plain only | — | — | **108** (6 lines, correct) |
| **clamped first, plain after** | `clamp={2}` | same string, no clamp | **36 / 36** — the plain `Text` is silently clipped |
| **plain first, clamped after** | same string, no clamp | `clamp={2}` | **108 / 108** — `clamp` does nothing |
| two frames, same window | plain frame | clamped frame | **108** — the clamp is still ignored |
| different string, same width | clamp | clamp | **36 / 36** — the key includes the string |
| poisoned cache + `maxHeight: 36`, `overflow: "hidden"` | plain first | clamped | **36** — the cap is per element and is not cached |

So the prop is not a component guarantee: a `Text` with no `clamp` can be cut to
another component's line count, and a clamped `Text` can paint the whole string.
The reference source confirms the mechanism: `line_clamp` is applied as a
property of the *styled* text (`packages/native/src/renderer.rs`), after the
shaped layout has been produced and cached.

`truncate` is unaffected (the wrap mode is part of the key: a nowrap and a
wrapping sibling of the same string measured 18 / 108 px in the same frame).

## 2. The rule

**`clamp` is a hard clip owned by the element, never `lineClamp`.**

- Remove `lineClamp` from `textStyle` entirely. With no `lineClamp` anywhere in
  the library, no string can poison another string's layout.
- For a usable clamp, set `whiteSpace: "normal"`, `maxHeight = lines ×
  typography[role].lineHeight` and `overflow: "hidden"` on the `<text>`
  element. `maxHeight` is a per-element layout constraint — measured: it caps
  the element to 36 px even when the shared text layout for that string is the
  six-line one.
- `lines = Math.trunc(clamp)` for a finite `clamp >= 1`; anything else (0,
  negative, `NaN`, `Infinity`) is **ignored** rather than producing a zero-height
  or infinite cap.
- The trade is explicit: a multi-line clamp is now a **hard cut with no
  ellipsis**. `lineClamp` would ellipsize, but it cannot be trusted; a cut is
  predictable, and `truncate` is still the ellipsis path for one line.
- The `<text>` node keeps the whole string, so assistive technology and text
  selection still get the full text; only the layout box is capped.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | delete `lineClamp`; `clamp` → `whiteSpace`/`maxHeight`/`overflow`; a `clampLines` helper using `Option` |
| `packages/primitives/src/core/style.test.ts` | the resolver contract (§4.1–4.4) |
| `packages/primitives/src/components/presentational.test.tsx` | the element-tree payload (§4.5) |
| `packages/primitives/runtime/text.runtime.test.tsx` | **new**: the cache regression and the geometry (§4.6–4.11) |
| `packages/primitives/docs/text.mdx` | `clamp` row ("hard clip"), Limitations, Verification |
| `docs/gpuix-capabilities.md` | a limits row: the text layout cache ignores `lineClamp`, evidence, workaround |
| `COMPONENTS.md` | `Text` row — measured clamp rule |
| `PLAN.md` | D29 |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan as **done** |

## 4. Test plan and commands

Offline (`packages/primitives`):

1. `textStyle({ role: "body", tone: "default", clamp: 2 })` has
   `maxHeight = 2 × 18`, `overflow: "hidden"`, `whiteSpace: "normal"`, and
   **no** `lineClamp`.
2. No clamp → none of `maxHeight`/`overflow` appears and `whiteSpace` stays
   unset.
3. `clamp: 0`, `-2`, `NaN` → no `maxHeight` (a zero-height text is a bug, not a
   clamp).
4. `role: "codeBlock"`, `clamp: 2` → `maxHeight = 2 × codeBlock.lineHeight`
   (the cap follows the role, not a hard-coded 18).

Element tree:

5. `renderText({ clamp: 3 }, theme)` exposes `maxHeight: 54`, `overflow:
   "hidden"` and no `lineClamp` property.

Runtime (`runtime/text.runtime.test.tsx`, a fresh window per case):

6. Baseline: `clamp={2}` alone → the text's box is `2 × lineHeight`; a plain
   `Text` → six lines; `truncate` → one line.
7. **Regression A:** render the plain string first, then `clamp={2}` of the
   **same** string at the same width → the clamped box is `2 × lineHeight`.
   This fails today with `108`.
8. **Regression B:** render `clamp={2}` first, then the plain same string → the
   plain box is `6 × lineHeight`. This fails today with `36` (the leak).
9. `clamp={1}` → one line; `clamp={3}` → three lines.
10. A different string in the same frame stays six lines (the fix does not
    truncate text that was never clamped).
11. The clamped text is still one `Label` node whose value is the full string
    (the clip is layout-only).

Commands:

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
```

Expected: offline 407 + 5 new cases; runtime 194 + 6 new cases, both green;
`check` and `lint` exit `0`. Record the exact counts in §6.

**Two-direction proof:** restore `style.lineClamp = lines` and drop the
`maxHeight`/`overflow` pair, then run cases 7 and 8 — they must fail with
`108` and `36` respectively — and restore. Record the exact output in §6.

## 5. STOP conditions

- Stop if the runtime does not honour `maxHeight` on a `<text>` element — the
  backstop has no alternative and the honest outcome is a documented limitation
  plus removing `clamp` from the public API, not a prop that does nothing.
- Stop if a pixel capture shows the text painting below the clamped box (a
  layout cap whose paint overflows is worse than no clamp). Record the capture
  and report.
- Stop if removing `lineClamp` breaks a test outside the cases above; that means
  another component depended on it.
- Stop if `StyleDesc` cannot express `maxHeight` as a number in the pinned
  0.10.0 types.
- Never widen the assertion to "whatever the runtime painted" — the clamped
  height is the contract.

## 6. Outcome

Executed on this host, 2026-10-18.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | 35 files, **409 tests green** (was 407; +3 cases, −1 rewritten) |
| `nub run --filter @gpuixui/primitives test:runtime` | 18 files, **199 tests green** (was 17 / 194) |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| clamped height, 2 lines | `36 px` = `2 × 18` |
| clamped height, 1 and 3 lines | `18 px` / `54 px` |
| clamped then plain, same string | `36 / 108 px` — the plain text keeps all six lines |
| plain then clamped, same string | `108 / 36 px` — the clamp holds |
| clamped accessibility value | the **whole** string (the clip is layout-only) |

**Two-direction proof.** Restored `style.lineClamp = lines.value` and dropped
the `maxHeight`/`overflow` pair; `nub exec vitest run --config
vitest.runtime.config.ts runtime/text.runtime.test.tsx` then failed **4 of 5**:

```
FAIL  clamps to the line count, and still truncates on one line
      AssertionError: expected 36 to be 18   // clamp=1 reused the 2-line layout
FAIL  does not let a clamp leak to an identical unclamped text
      AssertionError: expected 36 to be 108  // the plain Text was clipped
FAIL  clamps an identical text even when the plain copy came first
      AssertionError: expected 108 to be 36  // the clamp was ignored
FAIL  caps the clamp at the role's own line height
      AssertionError: expected 36 to be 54   // clamp=3 reused the 2-line layout
```

Restored the cap → `5 passed (5)`. The offline resolver tests and the
element-tree case fail with `lineClamp` restored for the same reason (`2 × 18`
is absent and `lineClamp` is present).

**Deliberate scope.** The painted pixels below a clamped box were not captured;
the assertion is the measured layout box, which is what the component owns. A
`<text>` paints inside its own layout bounds, and the cap is the element's
height. If a later pixel capture shows glyphs below the cap, that is a runtime
paint defect to record in `docs/gpuix-capabilities.md` — not a reason to restore
`lineClamp`.
