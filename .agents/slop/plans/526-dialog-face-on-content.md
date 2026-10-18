# 526 — The dialog's face over the content a window shows

**Phase:** F (integration and polish) · **Workstream:** `tokens-theme` ·
**Depends on:** plans 099, 359, 371, 375, 383, 395, 507, 508, 509, 525 ·
**Number block:** 500–599 (`tokens-theme` overflow).

## 1. The bug

Plan 507 measured the element the modal scrim carries — the dialog's face — but
only over the **six page layout surfaces** (`layoutSurfaces`): the canvas, a card,
the quiet panel, the field fill, the persistent selected fill and a floating
surface. It excluded the twelve **content fills** behind the scrim with this
rationale, quoted in the code, both documents, the README and the test header:

> Over a bright action patch the face meets the scrim (macOS dark 1.021:1 on
> `primary`), where the dialog's `border` edge carries the silhouette at
> 1.495:1.

Both halves of that sentence are false for the compositions a window actually
shows:

1. **The face can be erased over content, not only over the layout.** A dialog
   opens over whatever is on screen. macOS dark's face (`popover` `#2C2C2E`)
   composited with its own scrim (`#000000A6`) over its `primary` action
   measures **1.0213:1** — under the 1.05:1 surface floor — and that is the very
   number the rationale uses to justify the exclusion. Every check returns `[]`
   for it because the pair is not in the contract.
2. **The `border` cannot carry that patch.** The claim holds for the one patch
   it quotes (`border` `#48484A` over the scrimmed `primary`: 1.4954:1). Over
   the rest of the content fills the edge is inside the divider floor:

   | shipped set | patch | `border` on the scrimmed patch |
   | --- | --- | --- |
   | Windows dark (and XP, Aero) | `success` | **1.0057:1** |
   | macOS dark | `warning` | **1.0066:1** |
   | Linux dark | `success` | 1.0256:1 |
   | identity dark | `success` | 1.0439:1 |
   | Linux dark | `info` | 1.0461:1 |

   A dialog whose face met the scrim over a Badge would therefore have neither a
   face nor an edge, while every check returned `[]`.
3. **"No scrim opacity can clear it" is also false.** The probe that chose the
   exclusion compared 65% and 70%: at 70% the face clears `primary` (1.0775:1)
   and meets `destructive` at 1.0185:1. But the scrimmed content darkens past the
   face as the alpha rises, so a **higher** alpha puts the whole band below the
   face. macOS dark's own fill triples stop colliding at 82%: `#000000D0` clears
   every content fill on its own canvas (`warning`, the brightest, at
   **1.0826:1**), and a face pair at 80% (`#000000CC`) still fails that patch
   (`warning` 1.0383:1), so the boundary is measured rather than assumed.

## 2. Decisions

1. **`dialogSurfacePairs` derives from `overlaySurfaces`, not `layoutSurfaces`.**
   The face is the element a reader sees on the scrim, and the scrim is already
   measured over all eighteen surfaces a window shows (plans 375 and 508). A
   dialog can open over a status chip or an action exactly as easily as over the
   canvas, so the face list becomes the same eighteen surfaces: six layout +
   four resting actions (`primary`, `secondary`, `accent`, `destructive`) +
   three solid status chips (`info`, `success`, `warning`) + the panel action
   (`softAction`) + four soft status panels. One list owns the surfaces, so a
   fifth content fill cannot join the scrim and miss the face.
2. **Fix the palette, not the face or the edge.** macOS dark is the only shipped
   set that fails. Its `overlay` moves from `#000000A6` (65%) to `#000000D0`
   (82%). The alternatives were measured and rejected:
   - lightening `popover` to clear `primary` also clears `secondary`/`hover`
     into the face (a fill that equals its panel is not a state), and darkening
     it toward black makes the floating surface darker than the canvas;
   - the macOS accent cannot darken (black `primaryForeground` on `#0A84FF`
     already measures 5.76:1 and falls under 4.5:1 one ramp step down);
   - `border` is not the carrier (decision 3).
   Every other set already clears all eighteen face pairs at its own scrim; the
   identity, Linux, Windows, XP and Aero overlays do not move.
3. **No `border`-on-scrim pair.** At the default floor a border pair would be
   satisfiable, but at AAA the divider floor is 3:1 and the high-contrast light
   edge on the scrimmed canvas measures 1.074:1 — a pair would make the AAA
   palette infeasible for a job the face already does there at 7.005:1. The
   border's own pair on the face (`border` on `popover`) stays measured.
4. **A copied brand owns its scrim.** The executed brand example (`Acme`, dark)
   changes `primary` to `#7C5CFF`, which is darker than the identity accent, so
   the inherited 65% scrim left its face at **1.038:1** over its own action. The
   example deepens its `overlay` to `#000000D9` (85%) — 80% still failed over
   `info` (1.010:1) and `warning` (1.036:1) — and the documents teach the rule:
   a dark brand with a darker accent deepens the scrim, a lighter one keeps the
   base.
5. **Correct the documents instead of re-quoting them.** The "edge carries the
   patch" sentence and its 1.495 figure leave `docs/tokens.md`,
   `docs/design-system.md` and the package README; the new text states the face
   rule, the new tightest pair and why the edge was rejected.

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

Replace the `dialogSurfacePairs` block (currently `layoutSurfaces.map(...)`, with
its comment) with:

```ts
/**
 * The dialog's face on the scrim. A dialog, drawer or command palette paints
 * `popover` over the modal scrim, so the surface a reader sees is the `overlay`
 * wash composited over whatever the window showed at that spot — not `popover`
 * on a page surface. `overlayWashPairs` measures the scrim itself; this list
 * measures what sits on it, on every surface `overlaySurfaces` names, because a
 * dialog opens over a status chip or an action as easily as over the canvas.
 *
 * macOS dark's face met its own scrim over its `primary` at **1.021:1** while
 * the list named only the layout, and the edge cannot stand in: a dialog's
 * `border` measures **1.006:1** over Windows dark's scrimmed `success` chip,
 * under the divider floor. The face is the carrier, so that set's scrim is
 * stronger and every shipped face clears the surface floor (1.079:1 at the
 * tightest). The list derives from `overlaySurfaces`, so a fifth content fill
 * joins one place.
 */
export const dialogSurfacePairs: readonly ContrastPair[] = overlaySurfaces.map(
  (background): ContrastPair => ["popover", background, "surface"],
);
```

In the `contentFillSurfaces` JSDoc, replace the sentence that says a dialog's
face is not measured there with a pointer to the face list:

> The scrim's own perceivability is measured on them (`overlayWashPairs`), and
> so is the dialog's face (`dialogSurfacePairs`): a dialog opens over a status
> chip or an action, and the face — not the 1px edge — is what separates it.

In `themeContrastFailures`' JSDoc, update the `dialogSurfacePairs` bullet:

> - `dialogSurfacePairs` — the dialog's face, `popover` composited over the
>   `overlay` scrim on every surface a window shows (`overlaySurfaces`), because
>   a theme whose scrim meets its own floating surface ships a dialog with no
>   face and, over a bright status chip, with an edge that is under the divider
>   floor too.

### 3.2 `packages/tokens/src/platform-styles/macos.ts`

- In the dark palette, add:

  ```ts
  // The modal scrim is 82%: the floating face (#2C2C2E) met the scrim over the
  // dark accent at 1.021:1 (plan 507) and the edge could not stand in — a
  // dialog's border measures 1.006:1 over the scrimmed status chips in the
  // Windows palette. At 82% the scrimmed content sits below the face and every
  // face pair clears 1.05:1 (warning, the brightest, at 1.083:1; plan 526).
  overlay: "#000000D0",
  ```

  It is the only value that moves in this file.
- In the file header JSDoc, after the elevation sentence, add:

  > The dark scrim is deeper than the identity's (82%) so the floating face
  > separates from every content fill a dialog can open over; the shipped
  > `primary` patch measured 1.021:1 under the identity scrim (plan 526).

### 3.3 `packages/tokens/src/color.ts`
In `ThemeColors.overlay`'s JSDoc, extend the face sentence:

> The face a dialog paints on it is measured through the wash
> (`dialogSurfacePairs`) on every surface a window shows, because a scrim that
> meets its own floating surface — or a bright status chip — leaves a dialog
> with only its edge, which is not always visible either.

### 3.3b `packages/tokens/src/brand-theme.example.ts`

Add to `brandTheme.colors`:

```ts
    overlay: "#000000D9",
```

and extend the header JSDoc (after the groove paragraph):

> The scrim moves with the brand as well (plan 526). A dialog's face is measured
> on the scrim over every surface a window shows, and this fill is darker than
> the identity accent, so the inherited 65% scrim left the floating face at
> 1.038:1 over the brand's own primary action. At 85% the face clears the floor
> over every content fill. A brand with a lighter accent can keep the base
> scrim; a darker one deepens it, like the macOS dark style does.

`brandLightTheme` keeps the light identity scrim: the face is white over a dark
brand fill, so it passes at 45%.

### 3.4 `packages/tokens/src/dialog-scrim.test.ts`

Rewrite the header's third paragraph (the "deliberately not a face pair"
paragraph) to state the new bug: the face was measured on the layout only; macOS
dark met its `primary` at 1.0213:1; the edge cannot carry it (Windows dark
`border` on the scrimmed `success` 1.0057:1); the scrim is now 82%.

Replace the case `"measures the page layout the scrim splits off, not the
content fills"` with:

```ts
it("measures every surface a window shows", () => {
  expect(layoutSurfaces).toEqual(overlaySurfaces);
  expect(dialogSurfacePairs.length).toBe(overlaySurfaces.length);
});
```

Replace `"records the content-patch band no scrim opacity can clear"` with two
cases:

```ts
it("records why the edge cannot carry a content patch", () => {
  const windows = getPlatformTheme("win32", "dark");
  const successPatch = compositeOver(
    windows.colors.overlay,
    windows.colors.success,
  );
  const aaa = getTheme("light", "high");
  const scrimmedCanvas = compositeOver(
    aaa.colors.overlay,
    aaa.colors.background,
  );

  expect(
    contrastRatio(windows.colors.border, successPatch),
  ).toBeCloseTo(1.0057, 3);
  expect(contrastRatio(aaa.colors.border, scrimmedCanvas)).toBeCloseTo(
    1.0736,
    3,
  );
  expect(contrastFloors.high.divider).toBeGreaterThan(
    contrastRatio(aaa.colors.border, scrimmedCanvas),
  );
});

it("records the scrim opacity that keeps the face outside the content band", () => {
  const macosDark = getPlatformTheme("darwin", "dark");
  const regressed = extendTheme(macosDark, {
    colors: { overlay: "#000000A6" },
  });
  const tooLight = extendTheme(macosDark, {
    colors: { overlay: "#000000CC" },
  });

  expect(macosDark.colors.overlay).toBe("#000000D0");
  expect(faceRatio(macosDark, "warning")).toBeCloseTo(1.0826, 3);
  expect(faceRatio(tooLight, "warning")).toBeCloseTo(1.0383, 3);
  expect(faceRatio(regressed, "primary")).toBeCloseTo(1.0213, 3);
  expect(
    themeContrastFailures(regressed).filter(
      (failure) =>
        failure.foreground === "popover" && failure.wash === "overlay",
    ),
  ).toEqual([
    expect.objectContaining({
      background: "primary",
      pairClass: "surface",
      floor: contrastFloors.default.surface,
      ratio: expect.closeTo(1.0213, 3),
    }),
  ]);
});
```

Update the first case's pinned figures, because the list now includes the
content fills:

```ts
it("keeps every shipped face above the surface floor", () => {
  const failures = shippedThemes.flatMap(({ theme }) => {
    const floor = contrastFloors[theme.contrast].surface;
    return dialogSurfacePairs.flatMap(([, surface]) => {
      const ratio = faceRatio(theme, surface);
      return ratio >= floor
        ? []
        : [`${theme.name} on ${surface}: ${ratio.toFixed(3)}`];
    });
  });

  const tightest = shippedThemes
    .flatMap(({ theme }) =>
      dialogSurfacePairs.map(([, surface]) => ({
        name: theme.name,
        surface,
        ratio: faceRatio(theme, surface),
      })),
    )
    .reduce((worst, current) =>
      current.ratio < worst.ratio ? current : worst,
    );

  expect(failures).toEqual([]);
  expect(darkestFace(getTheme("dark"))).toBeCloseTo(1.1993, 3);
  expect([tightest.name, tightest.surface]).toEqual([
    "Dark · Linux",
    "destructive",
  ]);
  expect(tightest.ratio).toBeCloseTo(1.0785, 3);
});
```

`darkestFace` stays `Math.min(...)` over `dialogSurfacePairs`; the identity dark
minimum moves from `selected` (1.210) to `softAction` (**1.1993**) because the
content fills join the list.

### 3.5 `packages/tokens/src/docs.test.ts`

- `"quotes the dialog face's tightest pair and the shadow cap"`:
  - replace `expect([tightest.name, tightest.surface]).toEqual(["Dark", "selected"])`
    with `["Dark · Linux", "destructive"]`;
  - replace the figure list `["1.210", "1.035", "1.042"]` with
    `["1.079", "1.035", "1.042"]` (verify the derived tightest before writing;
    the shadow figures do not move).
- Replace `"quotes the content patch and the scrim trade"` with a case that
  derives the edge evidence and the new figure:

  ```ts
  it("quotes the edge that cannot carry a content patch", () => {
    const windows = getPlatformTheme("win32", "dark");
    const successPatch = compositeOver(
      windows.colors.overlay,
      windows.colors.success,
    );
    const macosDark = getPlatformTheme("darwin", "dark");

    expect(faceRatio(macosDark, "warning")).toBeCloseTo(1.0826, 3);
    expect(
      contrastRatio(windows.colors.border, successPatch),
    ).toBeCloseTo(1.0057, 3);
    expect(designSystem).toContain("1.006:1");
    expect(designSystem).toContain("1.083:1");
  });
  ```

- The floor-row guard `"names every layout surface in the dialog face's floor
  row"` keeps its loop over `dialogSurfacePairs`; rename it
  `"names every surface in the dialog face's floor row"`.
- The explanation guard reads up to `"The inactive state is measured too"`;
  keep it and add an assertion that the explanation names `overlaySurfaces`.

### 3.6 `docs/design-system.md`

- **§7, the dialog paragraph** (starts “The dialog's own face is measured on
  that scrim”, ends before “The inactive state is measured too”): replace it
  with:

  > The dialog's own face is measured on that scrim: `dialogSurfacePairs`
  > composites `overlay` over every surface `overlaySurfaces` names — the six
  > layout surfaces and the twelve resting content fills — and holds `popover`
  > to 1.05:1, because a theme whose scrim meets its own floating surface ships
  > a dialog with no face. The layout alone was not enough: macOS dark's face
  > met the scrim over its own `primary` action at **1.021:1**, and the edge
  > cannot stand in — a dialog's `border` measures **1.006:1** over Windows
  > dark's scrimmed `success` chip, under the divider floor (the AAA light
  > edge could not do it either: 1.074:1 against a 3:1 floor). The face is the
  > carrier, so macOS dark's scrim is 82% and the scrimmed content sits below
  > the face; every shipped face clears the floor at **1.079:1** (Linux dark on
  > `destructive`). The shadow is still not a separation: on the identity dark
  > scrim the `lg` tint paints 1.035:1 and pure black reaches only 1.042:1.

- **§9 floor table**, the dialog-face row: replace the six-surface clause with
  all eighteen, in `overlaySurfaces` order:

  `| dialog face (\`popover\` over the composited \`overlay\` on \`background\`/\`card\`/\`muted\`/\`input\`/\`selected\`/\`popover\`, the four resting filled actions \`primary\`/\`secondary\`/\`accent\`/\`destructive\`, the three solid status chips \`info\`/\`success\`/\`warning\`, the raised action a status panel carries (\`softAction\`) and the four soft status panels \`infoSoft\`/\`successSoft\`/\`warningSoft\`/\`destructiveSoft\` — every surface \`overlaySurfaces\` names, \`dialogSurfacePairs\`) | 1.05:1 | 1.05:1 |`

- **§9 dialog paragraph** (around the current “The dialog's own face is measured
  on that scrim” sentence at line 594): replace its six-surface clause, the
  “only its 1px edge” rationale, the 1.210 figure and the border/70% trade with
  the same facts as §7, quoting **1.079:1** (`Dark · Linux` on `destructive`)
  and **1.006:1** for the Windows edge.
- Keep the elevation paragraph's “six page layout surfaces” (that is
  `elevationSurfaces`, unchanged).

### 3.7 `docs/tokens.md`

- The `themeContrastFailures` description (around line 1694): replace “over the
  six page layout surfaces — `background`, `card`, `muted`, `input`,
  `selected`, `popover`” with “over every surface `overlaySurfaces` names — the
  six layout surfaces and the twelve resting content fills”, and replace the
  1.210 figure with **1.079** (`Dark · Linux` on `destructive`).
- The audit history (around line 2582): replace the plan-507 paragraph's
  exclusion rationale and the 1.210 figure with the plan-526 evidence (macOS
  dark 1.021:1 on `primary`; the edge 1.006:1 on Windows dark's scrimmed
  `success`; the scrim at 82%; the tightest 1.079:1) and add one sentence:

  > Plan `526` extends that face to every surface a window shows — the list
  > derives from `overlaySurfaces` — after macOS dark's face measured
  > **1.021:1** over the scrim on its own `primary` action and the edge it was
  > said to rely on measured **1.006:1** on a scrimmed status chip. The dark
  > macOS scrim is 82% (`#000000D0`), the six layout surfaces become eighteen
  > and every shipped set passes (1.079:1 at the tightest).

- The role-table note at line ~1611 and any other “six page layout surfaces” for
  the face: update to the eighteen-surface rule (leave `elevationSurfaces`
  mentions at six).
- The brand snippet (around line 1473): add `overlay: "#000000D9",` beside
  `ring`, and one sentence after the family paragraph: “A dark brand whose accent
  is darker than the base's also deepens the modal scrim: a dialog's face is
  measured on the scrim over every surface a window shows, and the inherited 65%
  scrim left the floating face at 1.038:1 over this brand's own primary action,
  so the example ships 85% (`#000000D9`). A lighter accent can keep the base
  scrim.”

### 3.8 `packages/tokens/README.md`

Replace lines 341–345's six-surface clause and 1.210 figure with the
eighteen-surface rule, the 1.079 tightest and the edge evidence (1.006:1).

### 3.9 `COMPONENTS.md`

- “Theme contrast check” row: `6 dialog-face pairs` → `18 dialog-face pairs`.
- Append one sentence before the closing cell:

  > Plan 526 extends the dialog face to every surface a window shows — the list
  > derives from `overlaySurfaces`, so the face is measured over the status chips
  > and actions a dialog opens over — after macOS dark's face met the scrim on
  > its `primary` at **1.021:1** while the edge it was said to rely on measured
  > **1.006:1** on a scrimmed `success` chip; the macOS dark scrim deepens to
  > 82%, the list grows 6 → 18 pairs, and every shipped set passes (1.079:1 at
  > the tightest).

### 3.10 `TODO.md`

Add, immediately before the cross-team block that follows the last `[x]` row:

```
`[x]` Hold the dialog's face over the content a window shows — plan 507 measured
`popover` over the scrim on the six layout surfaces only, so macOS dark's face
met its own `primary` action at **1.021:1** and the `border` it was said to rely
on measures **1.006:1** on a scrimmed `success` chip, under the divider floor,
while every check returned `[]`; `dialogSurfacePairs` derives from
`overlaySurfaces` (6 → 18 pairs), the macOS dark scrim deepens to 82%
(`#000000D0`) so every shipped face clears 1.05:1 (1.079:1 at the tightest), and
the documents stop naming the 1.495:1 edge as the carrier (plan 526)
```

Bump the section's progress bar denominator and numerator by one (the bar is
currently `190/252` → `191/253`).

### 3.11 Plan index

Add to `.agents/slop/plans/README.md`:

```
| [526](./526-dialog-face-on-content.md) | The dialog's face over the content a window shows | F | 099, 359, 371, 375, 383, 395, 507, 508, 509, 525 | done |
```

and append a paragraph after the plan 525 description.

## 4. Commands and expected results

Run in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

1. `nub run --filter @gpuixui/tokens test -- dialog-scrim`
   → the rewritten file passes. Before the source edits, case 2 and the new
   scrim case fail (the layout-only list returns no `primary` failure; the
   shipped macOS overlay is `#000000A6`).
2. `nub run --filter @gpuixui/tokens test -- docs`
   → the updated quotes pass; before the document edits it fails on the figures
   the case derives.
3. `nub run --filter @gpuixui/tokens test`
   → the whole package suite passes (discover the count from the run; do not
   quote a number the run did not print).
4. `nub run check`
   → `check:tests`, lint, format and `check-types` pass.
5. `nub run test` and `nub run lint`
   → both pass.
6. `nub run --filter @gpuixui/tokens test -- platform-composition`
   → every base × style combination still returns `[]` from `themeFailures`,
   which proves the macOS scrim change composes with the other palettes.

## 5. STOP conditions

Stop and report instead of improvising if:

- A shipped set **other than macOS dark** fails a new face pair at its current
  scrim. Record the theme, surface and ratio; a second palette move needs its own
  plan.
- `#000000D0` leaves any macOS dark face pair under the floor, or makes
  `themeFailures(getPlatformTheme("darwin", "dark"))` non-empty. Report the
  failure and the measured tightest; do not lower the floor or drop a surface.
- `applyPlatformStyle` over another dark base produces a face failure anywhere
  (`platform-composition.test.ts`). Report the base × style pair.
- `contrastPairs` moves (it must stay **396**; only `dialogSurfacePairs` grows,
  6 → 18, and `overlayWashPairs` stays 18).
- A documentation guard fails on a sentence this plan did not edit. Do not
  rewrite an unrelated claim to make it pass; find the drift.
- The measured tightest after the change is not Linux dark on `destructive`
  (1.0785:1). Do not paste a number the probe did not produce.

## 6. Test plan

| What can break | The case that catches it |
| --- | --- |
| The face list stops covering a content fill | `dialog-scrim.test.ts` case “measures every surface a window shows” (`toEqual(overlaySurfaces)`) |
| A shipped face erases over a content patch | “keeps every shipped face above the surface floor” (all 24 sets × 18 surfaces) |
| The scrim regresses to 65% | “records the scrim opacity…” (old overlay reports exactly `primary`, 1.0213) |
| The chosen alpha is too weak | the same case (`#CC` measures 1.0383 on `warning`, under the floor) |
| The documents re-quote the edge as the carrier | `docs.test.ts`'s edge case (1.0057) and the floor-row/explanation guards |
| A doc figure drifts | `docs.test.ts` derives the tightest and the edge ratio |
| The pair count drifts | `inventory.test.ts` derives `dialogSurfacePairs.length`; `contrast.test.ts` keeps the published lists unique |
| The scrim change breaks another palette | `platform-composition.test.ts` asks `themeFailures` for every base × style |
| A copied brand keeps the base scrim over a darker accent | `theme.test.ts` `holds the documented examples to the contrast contract` (the example's 85% scrim is required for it to pass) |
| The reference loses a list | `contrast-reference.test.ts` (unchanged membership) |

To prove the new cases fail without the fix: revert `contrast.ts`'s list to
`layoutSurfaces` and run `nub run --filter @gpuixui/tokens test -- dialog-scrim`;
the “every surface” case fails on length and the regression case returns `[]`.
Revert only the macOS overlay and the scrim case fails its shipped-pair
assertion. `scripts/verify-two-directions.sh` follows the repo convention used
for plans 500–525.

## 7. Acceptance criteria

- [ ] `dialogSurfacePairs` is `overlaySurfaces.map(...)` — 18 pairs, `popover`
      on each, `surface` class.
- [ ] macOS dark `overlay` is `#000000D0`; no other colour or metric moves.
- [ ] Every shipped set clears every face pair (1.0785:1 at the tightest,
      Linux dark on `destructive`).
- [ ] `themeFailures` for every shipped set and every base × style composition
      is `[]`.
- [ ] `docs/tokens.md`, `docs/design-system.md` and the README no longer claim
      the edge carries a content patch; each states the face rule and the new
      figures, and `docs.test.ts` holds them.
- [ ] `COMPONENTS.md` says 18 dialog-face pairs; `TODO.md` and the plan index
      record plan 526.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.
