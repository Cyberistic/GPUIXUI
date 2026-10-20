# 701 — The highlight wash colour contract, in pixels

**Status:** planned · **Phase:** F · **Workstream:** playground
**Depends on:** `171` (the highlight geometry report), `674`/`676` (the frame
sampler and the palette pixels), `197` (the live renderer is the observation
surface), `587` (the live search twin).
**Owns:** `apps/playground/src/scenarios/{search.tsx,highlight-pixels.ts,
highlight-pixels.test.ts,frames.ts}`, `apps/playground/src/live/scenarios.tsx`.

## 1. Why this plan exists

`COMPONENTS.md` (search-highlights paragraph) records the last unmeasured part
of the find contract:

> The honest gap: the report carries no wash colour, so `color`/`activeColor`
> are unasserted — screenshot evidence only.

`getPaintedHighlights()` returns rects and match offsets, never the colour it
painted. Plans `674`/`676`/`690`/`697` made a captured PNG a first-class
assertion source (pure decoder + `frames.ts` sampler), so the gap is now
closable without a new host verb.

The contract has a **consumer consequence** worth recording: the published
`HighlightSpec` says `color` "defaults to the theme accent at 30% alpha" and
`activeColor` to "accent at 65%". That accent is **GPUix's own dark theme
accent** (`Theme::dark()`, `oklch(0.673, 0.182, 276.935)`), **not**
`@gpuixui/tokens`' `accent` (dark `#2E2370`) and not its `selection`
(`#A7A9FF3D`). A library component that wants a token-driven wash must pass one
explicitly. This plan proves both halves so no component has to guess.

## 2. Measured premises (verified before writing this plan)

1. The runtime composites a wash over the line's background in **sRGB
   channels**, with a plain alpha blend:
   `round(alpha * fg + (1 - alpha) * bg)`.
2. GPUix dark accent = `#7C86FF` (124, 134, 255; the sRGB conversion of
   `oklch(0.673, 0.182, 276.935)`).
3. Over the playground's dark background `#11141A` (17, 20, 26):
   - default inactive (`alpha = 0.30`) = `#31365F` (49, 54, 95);
   - default active (`alpha = 0.65`) = `#575EAF` (87, 94, 175).
   Both are the exact pixels already in
   `apps/playground/.artifacts/screenshots/search-highlights.png` (2560 × 1600,
   device scale 2) and `apps/playground/.artifacts/live/live-highlights.png`
   (2200 × 1440, device scale 2), so the headless and live hosts agree.
4. The top of a wash rect is glyph-free: the rect is 20 px tall and glyph pixels
   begin 5–6 px below its top. A sample at `(rect.x + rect.width / 2,
   rect.y + 2)` is a pure wash pixel in both hosts.
5. `parse_color_rgba` accepts 6- and 8-digit hex; an 8-digit value keeps its
   alpha (the documented API), so a token such as `#A7A9FF3D` must composite to
   `#353851` over `#11141A` (53, 56, 81).

## 3. Files

Create:

- `apps/playground/src/scenarios/highlight-pixels.ts` — pure derivation.
- `apps/playground/src/scenarios/highlight-pixels.test.ts` — 4 tests.

Change:

- `apps/playground/src/scenarios/frames.ts` — add `pixelAtRect`.
- `apps/playground/src/scenarios/search.tsx` — six wash fixtures and a shared
  `highlightColourChecks` used by both heads.
- `apps/playground/src/live/scenarios.tsx` — call the shared checks from
  `live-highlights` and reuse that capture as the run artifact.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md`,
  `.agents/slop/plans/README.md`.

Do **not** change the registry ids (`search-highlights`, `live-highlights`) or
their capabilities (`search`).

## 4. Steps

### 4.1 The pure derivation

`highlight-pixels.ts`:

```ts
import { Pixels } from "@gpuixui/testing";

/** GPUix `Theme::dark()`'s accent, `oklch(0.673, 0.182, 276.935)`, as sRGB. */
export const RUNTIME_DARK_ACCENT = new Pixels.Rgba({
  r: 124, g: 134, b: 255, a: 255,
});

/** The runtime's two default wash alphas (`text/search.rs`). */
export const WASH_ALPHA = { inactive: 0.3, active: 0.65 } as const;

/** `alpha` of `foreground` over an opaque `background`, rounded per channel. */
export const blendOver = (
  foreground: Pixels.Rgba,
  alpha: number,
  background: Pixels.Rgba,
): Pixels.Rgba => new Pixels.Rgba({
  r: Math.round(alpha * foreground.r + (1 - alpha) * background.r),
  g: Math.round(alpha * foreground.g + (1 - alpha) * background.g),
  b: Math.round(alpha * foreground.b + (1 - alpha) * background.b),
  a: 255,
});

export interface WashColours {
  readonly inactive: Pixels.Rgba;
  readonly active: Pixels.Rgba;
}

/** The two default washes for an accent over a background. */
export const washColours = (
  accent: Pixels.Rgba,
  background: Pixels.Rgba,
): WashColours => ({
  inactive: blendOver(accent, WASH_ALPHA.inactive, background),
  active: blendOver(accent, WASH_ALPHA.active, background),
});
```

JSDoc every export (EF-11). Clamp/ignore an out-of-range alpha? Keep it total
for `[0, 1]`; the call sites are literals or `a / 255`, so a guard is not
needed and an invalid value must not be silently clamped — document the
precondition instead.

`highlight-pixels.test.ts` (vitest, co-located):

1. `blendOver` at `alpha = 1` is the foreground and at `0` is the background.
2. `washColours(RUNTIME_DARK_ACCENT, #11141A)` is exactly `#31365F` and
   `#575EAF` (`Pixels.rgbaNear` with tolerance 0, or compare the four channels).
3. The token `accent` (`#2E2370`) and the token `selection` (`#A7A9FF` at
   `61 / 255`) produce **different** washes from the runtime default — the
   consumer-consequence guard.
4. An 8-digit token's alpha is used as `a / 255`, not ignored: `#A7A9FF3D` over
   `#11141A` is `#353851`.

Every assertion must be able to fail: do not assert a value the test itself
constructed; read the expected literals from §2.

### 4.2 The shared rect sampler

In `frames.ts`:

```ts
import type { Pixels, Smoke } from "@gpuixui/testing"; // Pixels already imported
// add Smoke.HighlightRect to the smoke import's type usage

/** The top-centre pixel of a wash, above the glyphs (measured in plan 701). */
export const pixelAtRect = <E>(
  ctx: Pick<Smoke.SmokeContext, "expectSome">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
  rect: Smoke.HighlightRect,
  label: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError | E> =>
  Effect.gen(function* () {
    const window = yield* reader.windowSize();
    return yield* pixelAtPoint(
      ctx, frame, window,
      rect.x + rect.width / 2,
      rect.y + 2,
      label,
    );
  });
```

Document that `+2` is the measured glyph-free band and that a wash rect is
20 px tall in the fixture; a different fixture must re-measure.

### 4.3 The fixture (six washes)

In `SearchProbe`, inside the right-hand 260 px column **below** the 264 px
`search-list` wrapper, add one block:

```tsx
<div
  testId="search-colour"
  style={{
    display: "flex", flexDirection: "column", gap: 2,
    marginTop: 12,
    backgroundColor: theme.colors.background,
  }}
>
  {/* one <div highlight> per line, the proven declaration shape */}
</div>
```

Six lines, each a `div` with `highlight={{ query: "wash", ... }}` and one
`<text style={lineStyle}>` child, each a **unique run text** so a wash can be
found by `text` alone:

| testId | text | spec |
| --- | --- | --- |
| `search-wash-default` | `alpha wash` | `{ query: "wash" }` |
| `search-wash-default-active` | `bravo wash` | `{ query: "wash", activeIndex: 0 }` |
| `search-wash-custom` | `charlie wash` | `{ query: "wash", color: "#FF0000" }` |
| `search-wash-custom-active` | `delta wash wash` | `{ query: "wash", color: "#FF0000", activeColor: "#00FF00", activeIndex: 0 }` |
| `search-wash-primary` | `echo wash` | `{ query: "wash", color: theme.colors.primary }` |
| `search-wash-selection` | `foxtrot wash` | `{ query: "wash", color: theme.colors.selection }` |

The block ends at about `y = 436` in both windows (30 top margin + 264 list +
12 gap + 130 block), so it needs no scroller and no scroll in either host.

### 4.4 The shared checks

In `search.tsx`, export:

```ts
export const highlightColourChecks = <E>(
  ctx: Pick<Smoke.SmokeContext, "check" | "expectSome" | "expectEqual">,
  reader: FrameReader<E>,
  frame: Pixels.Pixels,
): Effect.Effect<void, Smoke.SmokeAssertionError | E>
```

It must:

1. Find each fixture's wash by exact `text` (`Arr.findFirst`) and its first
   rect (`Arr.head`) through `ctx.expectSome` — a missing wash fails by name,
   not silently.
2. Sample each with `pixelAtRect` and compare with `expectColour`:
   - default inactive = `washColours(RUNTIME_DARK_ACCENT, background).inactive`
     (`#31365F`);
   - default active = `… .active` (`#575EAF`);
   - custom `color` = `#FF0000`;
   - custom `activeColor` = `#00FF00` (its sibling `color` is also red, proving
     the two props are independent);
   - `theme.colors.primary` as `color` = `#A7A9FF` (opaque token);
   - `theme.colors.selection` as `color` = `blendOver(primary, 61 / 255,
     background)` (`#353851`, the semantic wash route).
3. Asserts the default is **not** the token accent at 30 %:
   `washColours(tokenAccent, background).inactive` differs from the sampled
   default. Label it so the ledger reads as a limitation, not a defect.
4. Asserts the default active is brighter than the default inactive
   (`r+g+b` strictly greater) — the 30 %/65 % distinction survives.

Parse the theme hexes with `ctx.expectSome(…, Pixels.hexToRgba(…))`; never
hard-code the token hexes in the scenario.

Call it at the **end** of `searchScenario.steps`:

```ts
const frame = yield* captureHeadless(ctx.host);
yield* highlightColourChecks(ctx, readSync(ctx.host), frame);
```

(`captureHeadless` forces one paint and removes its temp file.)

### 4.5 The live twin

In `live-highlights`, replace the final
`yield* ctx.host.screenshot(…)` with:

```ts
yield* settle;
const frame = yield* captureLive(
  ctx.host,
  `${LIVE_ARTIFACTS}/${highlights.id}.png`,
);
yield* highlightColourChecks(ctx, readAsync(ctx.host), frame);
```

Import `highlightColourChecks` from `../scenarios/search.js`. The capture is
still the run artifact, so no second screenshot is written.

### 4.6 Ledgers

- `COMPONENTS.md`, search paragraph: replace the "unasserted — screenshot
  evidence only" sentence with the measured contract: the two defaults
  (`#31365F`/`#575EAF`), the runtime-vs-token distinction, the explicit
  `color`/`activeColor` proof, and the `selection` route.
- `apps/playground/README.md`: add the two ids and the new check counts to the
  scenario table/paragraph that cites `search-highlights`/`live-highlights`.
- `TODO.md`: tick a new row under the playground workstream with the measured
  counts, mutation proofs and the focused ids run.
- This index: mark `701` landed (and `702` once its gate runs).

## 5. Commands and expected results

```sh
nub run --filter playground test
# expected: playground suite green (442 + 4 = 446 tests)

nub run --filter playground build
# expected: exit 0, dist/ refreshed

nub apps/playground/dist/smoke/run.js --only search-highlights
# expected: 1/1 passed, exit 0; ~15 more checks than the previous 41

nub apps/playground/dist/live/run.js --only live-highlights
# expected: 1/1 passed, exit 0

nub run check && nub run lint && nub run test
# expected: all exit 0
```

Record the exact check counts in the plan and the TODO row. Do **not** run
`--all` here; plan `702` is the promotion gate.

## 6. Mutation proofs (observe each failure, then revert)

| # | Edit | Expected failing check |
| - | ---- | ---------------------- |
| M1 | drop `color: "#FF0000"` from `search-wash-custom` | "an explicit color reaches the wash" — actual `#31365F` |
| M2 | swap `color`/`activeColor` on `search-wash-custom-active` | both custom checks fail (green/red reversed) |
| M3 | change `RUNTIME_DARK_ACCENT` to `#2E2370` | test 2 and the two default checks fail |
| M4 | set the colour block's background to `theme.colors.card` | the two default checks fail (the blend's background input is real) |
| M5 | use `theme.colors.accent` in `search-wash-primary` | "a token colour passed as color paints exactly" fails |

M3 is the pure-helper proof; M1/M2/M4 are the paint proof. Record the actual
failing output for each in the plan when it is executed.

## 7. STOP conditions

- **The wash is not glyph-free at `rect.y + 2`** in either host: stop, print the
  sampled band (rows `rect.y … rect.y + 8`) and record it. Do not widen the
  tolerance or pick an arbitrary point to make it pass.
- **The live default differs from the headless default** (for example the live
  window resolves a light theme): stop and record both values. A host-dependent
  default is a finding, not a check to relax.
- **The fixture does not paint in the live window** (`bounds` is `null` after
  the capture): stop; the view may exceed the 720 px window.
- **A mutation does not fail**: stop and report which premise is wrong.

## 8. Measured results (2026-10-20)

- `search-highlights`: **41 → 82 checks**, focused green.
- `live-highlights`: **12 → 53 checks**, focused green.
- `highlight-pixels` unit tests: **4**, suite **442 → 446**.
- The frame confirms the derivation in both hosts: `#31365F` / `#575EAF`,
  red/green exact, `primary` `#A7A9FF`, `selection` `#353851`.
- Mutation proofs observed and reverted (each `exit 1`):
  - **M1** (custom `color` removed): `an explicit color reaches the wash:
    expected #ff0000ff, got #31365fff`.
  - **M2** (`color`/`activeColor` swapped): `an explicit activeColor reaches the
    active wash: expected #00ff00ff, got #ff0000ff`.
  - **M3** (`RUNTIME_DARK_ACCENT` → `#2E2370`): the unit test fails
    (`expected '#1a1934' to be '#31365f'`) and the scenario fails
    `the runtime default wash is the GPUix accent at 30 %: expected #1a1934ff,
    got #31365fff`.
  - **M4** (colour block background → `theme.colors.card`): `the runtime
    default wash … expected #31365fff, got #373d66ff`.
  - **M5** (`search-wash-primary` uses `accent`): `a token colour passed as
    color paints exactly: expected #a7a9ffff, got #2e2370ff`.
- One correction to the plan's fixture model: `HighlightMatch.rects` is per
  **visual row** of one match, not per match; the two-match line is sampled by
  match index. The shared `sample` helper indexes the filtered match list.

## 9. Acceptance

- The pure helper and its 4 tests exist and fail under M3.
- `search-highlights` and `live-highlights` both sample six washes from a real
  frame and pass; the check counts are recorded.
- `COMPONENTS.md` no longer calls the wash colour screenshot-only.
- `nub run check`, `nub run lint` and `nub run test` pass.
- Every command above was run; the focused ids are named in the TODO row.
