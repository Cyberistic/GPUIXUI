# 643 — The theme switch in a real window

**Phase:** F
**Depends on:** `150`, `170`, `189`, `190`, `197`, `639`
**Workstream:** playground (`apps/playground`, `packages/testing`)

## 1. Why this plan exists

`theme` is the only core capability with **no live scenario**. The headless
gallery (`theme-color-roles`, plan `150`) proves every colour role paints its
exact token and that a palette switch repaints, by reading the runtime's
`paintedStyle`. The live renderer exposes no style (plan `197`), so colour must
stay headless — but the **interaction** the mission names ("theme switching")
has never run in a window. Plan `639`'s gate covers 91 live scenarios and the
`theme` capability is absent from all of them.

The existing `ColorRolesProbe` already has the right observable surface for a
window: a `theme-next` control and a painted `theme-readout` that names the
current palette, over the full swatch grid. A live twin can assert that a real
click moves the palette dark → light → high through React and that the grid is
still laid out (same bounds), while the token values themselves remain the
headless `paintedStyle` evidence. That is the honest split, and it closes the
last core capability's live gap.

**Bug guarded:** a theme provider that does not re-render its subtree on a
palette change, or a switch wired to the wrong cycle, would paint the old
palette in a window and no test would notice. The live twin fails on both,
proven in §5.

## 2. Files to create or change

### 2.1 `apps/playground/src/scenarios/theme.tsx`

Export the existing probe as a view. Additive, no behaviour change:

```tsx
/** The colour-roles gallery, mounted by `theme-color-roles` and `live-theme`. */
export const themeColorRolesView = (): ReactNode => <ColorRolesProbe />;
```

(`ColorRolesProbe` stays module-local; the export is a thunk so nothing mounts
at import time.)

### 2.2 `apps/playground/src/live/scenarios.tsx`

Import `themeColorRolesView`, then add the scenario beside `liveMedia`/`terminal`
(near the other gallery twins):

```tsx
/**
 * The palette switch in a real window (plan `643`).
 *
 * Colour is `paintedStyle`-only evidence (plan `197`), so this asserts the
 * interaction and the retained layout: a real click moves the palette through
 * `nextPalette`, the painted readout names it, and the swatch grid keeps its
 * box. The token values are `theme-color-roles`.
 */
const liveTheme: LiveScenario = {
  id: "live-theme",
  title: "Live theme: the palette switch repaints a window",
  capability: "theme",
  view: themeColorRolesView,
  ready: "theme-readout",
  steps: (ctx) =>
    Effect.gen(function* () {
      const opens = yield* textOf(ctx, "theme-readout");
      yield* ctx.expectContains("opens on the dark palette", opens, "palette=dark");
      const before = yield* boxOf(ctx, "swatch-background");

      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveTheme.id}-dark.png`);
      yield* ctx.host.click("theme-next");
      yield* settle;
      yield* ctx.expectContains(
        "the switch moves to light",
        yield* textOf(ctx, "theme-readout"),
        "palette=light",
      );
      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveTheme.id}-light.png`);

      yield* ctx.host.click("theme-next");
      yield* settle;
      yield* ctx.expectContains(
        "a second switch reaches high contrast",
        yield* textOf(ctx, "theme-readout"),
        "palette=high",
      );

      const after = yield* boxOf(ctx, "swatch-background");
      yield* ctx.expectEqual(
        "the swatch keeps its box across the switch",
        `${after.x},${after.y},${after.width},${after.height}`,
        `${before.x},${before.y},${before.width},${before.height}`,
      );
      yield* ctx.host.screenshot(`${LIVE_ARTIFACTS}/${liveTheme.id}.png`);
    }),
};
```

Add `liveTheme` to `liveScenarios` after `liveMedia` (or wherever keeps the
gallery twins together). The registry test in
`apps/playground/src/live/scenarios.test.ts` then requires it to be unique,
`live-`-prefixed and to have a headless `theme` scenario — all true.

### 2.3 `apps/playground/README.md`

In "The theme gallery (plan `150`)" add two bullets:

- the live twin (`live-theme`, plan `643`): a real click moves
  dark → light → high, the painted readout follows and the swatch grid keeps its
  box; colour stays `paintedStyle`/headless by plan `197`'s measured limit;
- the live totals in "What is proven here, honestly" and the gate paragraph
  move to the new run's numbers (92 scenarios).

### 2.4 `COMPONENTS.md`

The capability row for `theme` gains `live-theme`; the live totals in the
overview and the "second, smaller suite" paragraph move to the gate's numbers.

### 2.5 `TODO.md`

Add and tick a row for this plan with the focused and full-run numbers, and
update the `[~]` promotion row's final-gate addendum from 91 to 92.

### 2.6 `.agents/slop/plans/README.md`

Index `643` in the playground table and record the number in the numbering
paragraph (`640`–`642` were claimed by the components and tokens workstreams).

## 3. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter playground build` | exit `0`; the live registry lists `live-theme` |
| 2 | `nub apps/playground/dist/live/run.js --only live-theme` | exit `0`, `1/1 scenarios passed`; **run it three times** |
| 3 | `nub apps/playground/dist/smoke/run.js --only theme-color-roles` | exit `0` (the exported view changed nothing headless) |
| 4 | `nub apps/playground/dist/live/run.js --list \| wc -l` | `92` |
| 5 | `nub apps/playground/dist/smoke/run.js` | exit `0`, `104/104`, 3695 checks, 64 capabilities |
| 6 | `nub apps/playground/dist/live/run.js --all` | exit `0`, `92/92`; record checks, capabilities and duration. **This replaces plan `639`'s live gate**, which no longer covers the registry |
| 7 | `nub run check` / `nub run lint` / `nub run test` | exit `0`; playground 428 tests |

## 4. STOP conditions

1. The focused live run fails on the readout. Read the painted text; if the
   click did not commit, `settle` and retry once. If it still fails, the view's
   nested `ThemeProvider` or the `theme-next` handler is not reachable in a
   window — stop and report; do not drop the check.
2. The swatch bounds differ across the switch. That is a real layout change:
   record the numbers and investigate before asserting a tolerance.
3. The full live gate fails anywhere else. Follow plan `639` §4 — name the
   scenario, reproduce focused twice, and do not weaken a check.
4. A fix needs a path outside this workstream: record a cross-team `TODO.md`
   row, do not edit it.

## 5. Test plan and two-direction proofs

The live scenario is the test. Prove it can fail:

- **M1 (the switch is wired):** make `nextPalette.light` point at `"dark"` (or
  remove `setPalette`) → the first "the switch moves to light" check fails with
  the actual `palette=dark`. Revert.
- **M2 (the paint follows the state):** in `ColorRolesProbe`, keep
  `const theme = palettes.dark` instead of `palettes[palette]` → the readout
  still changes (it interpolates `palette`) but the swatch values would not;
  headless `theme-color-roles` is the check that catches it. Record that this
  live twin does **not** prove the colour — plan `197`'s limit — and cite the
  headless scenario.
- **M3 (the grid survives):** render the swatches only for `palette === "dark"`
  → the post-switch `boxOf("swatch-background")` fails with the missing id.
  Revert.
- Run M1 and M3, observe `exit 1`, revert, then three focused green runs.

The full headless suite is the control for the view export: 104/104 with the
same check count.

## 6. Acceptance

- [x] `live-theme` is registered, unique and `live-`-prefixed; the registry
      guard still passes.
- [x] Three focused green runs; M1 and M3 observed failing and reverted.
- [x] Headless full suite unchanged (`104/104`, 3695 checks).
- [x] Full live gate `92/92`, exit `0`, including `live-theme`.
- [x] `nub run check`, `nub run lint`, `nub run test` pass.
- [x] README, `COMPONENTS.md`, `TODO.md` and the plan index name the new totals.
- [x] Committed on `agent/playground` and pushed to `origin`.

## 7. Landed (2026-10-19)

**Files.** `apps/playground/src/scenarios/theme.tsx` exports
`themeColorRolesView` (the existing `ColorRolesProbe`, no behaviour change);
`apps/playground/src/live/scenarios.tsx` defines `liveTheme` and appends it to
`liveScenarios`; the ledgers and this index are updated.

**Focused.** `--only live-theme` green **three consecutive runs** (~2.4 s,
`1/1`, `theme=verified`). Headless control `--only theme-color-roles` green
(1/1, unchanged).

**Reverse proofs.** M1 — `nextPalette.light = "dark"` — failed the focused live
run with `a second switch reaches high contrast: expected a string containing
"palette=high", got "palette=dark name=Dark"` (exit `1`, `theme=failed`). M3 —
rendering `SwatchGrid` only while the palette is dark — failed with
`swatch-background is painted: expected a value, got none` (exit `1`). Both
reverted; the focused run green again. **M2 is a measured non-claim:** this twin
does not prove the colour values; `theme-color-roles`' `paintedStyle` does.

**Headless gate.** `104/104`, exit `0`, **3695 checks**, 64 capabilities.

**Live gate.** `--all` ran **twice green** on this head: **92/92**, exit `0`,
**2378 checks**, 60 capabilities (928.1 s, then 965.0 s after an `oxfmt`
comment-placement fix in `theme.tsx` and a rebuild); the final
`.artifacts/live-report.json` is the second run, with `live-theme` at 3.3 s. This
supersedes plan `639`'s 91/91 run and is the gate for the promotion merge.

**Quality gates.** `nub run check`, `nub run lint` and `nub run test` exit `0`;
playground **428** tests, testing 61, components 308, primitives 282, tokens
196, tw 103, icons 19, docs 7.
