# 637 — The panel action's rationale figures have one owner

**Phase:** F (documentation truth) · **Workstream:** `tokens-theme` ·
**Depends on:** 394 (the raised panel action), 397 (its scope), 399 (the solid
status fill), 503 (the track on the soft fills), 619 (the row press step) ·
**Number block:** 500–699 (`tokens-theme` overflow; 637 is the next free number
after 636) · **Status:** done

## 1. The defect

The rationale for `softAction` is told in five places: `docs/tokens.md` (three
times), `docs/design-system.md`, `packages/tokens/README.md`, the
`softActionPairs` JSDoc in `src/contrast.ts` and the `softAction` JSDoc in
`src/styles.ts`. It quotes four figures:

- **how many** of the 288 shipped `hover`/`active`/`secondary`-on-`xSoft` pairs
  miss the 1.05:1 floor;
- the **luminance band** the four soft fills occupy in each mode;
- the **worst** shipped pair;
- the identity light press on `destructiveSoft`.

Only `soft-action.test.ts` computed any of them, and only in its header. The
prose was not read by a test, so it drifted:

| Surface | Says | Shipped |
| ------- | ---- | ------- |
| `docs/tokens.md` §"An action inside a status panel" | **80** are under the floor | 84 |
| `docs/tokens.md` §"Deliberate omissions" | **80 of the 288** | 84 |
| `src/contrast.ts` `softActionPairs` JSDoc | 80 of the 288 | 84 |
| `docs/tokens.md`, `docs/design-system.md` | light band `0.742–0.765` | `0.657–0.765` (the AAA light tints reach lower) |
| `docs/tokens.md` | "the identity light press was 1.0492:1" | the tightest identity press is `active` on `infoSoft` at **1.0202:1**; `1.0492` is `active` on `destructiveSoft` |

The count moved from 80 to 84 when later plans (503, 619) moved palette values;
nothing forced the documents to move with it. The light band was measured on the
default palettes only and never named the AAA light set, whose `destructiveSoft`
is `0.657`.

### The probe

```ts
const softSurfaces = softActionPairs
  .filter(([fill]) => fill === "softAction")
  .map(([, background]) => background); // infoSoft, successSoft, warningSoft, destructiveSoft
const measured = shippedThemes.flatMap(({ theme }) =>
  ["hover", "active", "secondary"].flatMap((fill) =>
    softSurfaces.map((background) => contrastRatio(theme.colors[fill], theme.colors[background])),
  ),
);
measured.filter((ratio) => ratio < 1.05).length; // 84 of 288
```

The light soft fills range `0.657253…` (`destructiveSoft`, AAA light) to
`0.764543…` (`infoSoft`, light); dark ranges `0.011679…` (Linux dark
`destructiveSoft`) to `0.038644…` (dark `infoSoft`). Rounded to three decimals
that is `0.657–0.765` and `0.012–0.039`.

No token value is wrong. The defect is that the **documents and the JSDoc state
figures no test derives**, so a palette edit can leave a page quoting a count the
package no longer produces while every contrast pair still passes.

## 2. Decision

1. Correct the three stale 80s to **84**.
2. State the band over **all** shipped sets: light `0.657–0.765`, dark
   `0.012–0.039`.
3. Make the identity figure name its pair: "the identity light `active` on
   `destructiveSoft` was 1.0492:1" (the identity's tightest press is `active` on
   `infoSoft` at 1.0202:1, so an unqualified "the identity light press" was
   false).
4. Derive every figure in `soft-action.test.ts` (the shipped guarantee) and read
   the five surfaces in `docs.test.ts` (the documentation guard). Every
   `N of the M shipped` and `N are under the 1.05:1 floor` sentence in those
   surfaces must equal the derived pair, and each surface must still carry one;
   the band and the two named ratios are matched as exact sentences.

Not changed: any colour, pair, floor or metric; the `softAction` family itself;
the `TODO.md`/plan history (it records what plan 394 measured at the time).

## 3. Exact files

| File | Action |
| ---- | ------ |
| `docs/tokens.md` | 80 → 84 twice; band `0.742` → `0.657` twice (the second is the §"Deliberate omissions" recommendation); the identity sentence names `active` on `destructiveSoft` |
| `docs/design-system.md` | band `0.742–0.765` → `0.657–0.765` |
| `packages/tokens/src/contrast.ts` | `softActionPairs` JSDoc: 80 → 84 |
| `packages/tokens/src/soft-action.test.ts` | header note; one case deriving the count, total, worst pair, identity pair and both bands |
| `packages/tokens/src/docs.test.ts` | header note; one `describe` reading the five surfaces and holding every quoted figure |
| `COMPONENTS.md` | the Theme contrast check row names the guard and the derived figure |
| `TODO.md` | add and tick the row; bump the progress bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-637.md` | the audit note |

No runtime module changes. Do not edit the plan or TODO entries that record plan
394's original measurement.

## 4. `docs/tokens.md`

**§"An action inside a status panel"** (around line 437):

```markdown
four soft fills sit in a narrow luminance band (light `0.657–0.765`, dark
`0.012–0.039`), so a neutral wash tuned for the canvas has almost the tint's own
value there: of the 288 shipped `hover`/`active`/`secondary`-on-`xSoft` pairs,
**84** are under the 1.05:1 floor, the worst Windows light `active` on
`destructiveSoft` at **1.0042:1** (`#E0E0E0` on `#FFD6D6`). …
the identity light `active` on `destructiveSoft` was 1.0492:1.
```

Keep the plan-394 attribution and the softAction contract sentences untouched.

**§"Deliberate omissions"** (around line 3309):

```markdown
sit in the same luminance band as those fills, and **84 of the 288** shipped
fill-on-tint pairs measure under 1.05:1 (worst **1.0042:1**, Windows light
`active` on `destructiveSoft`).
```

The first occurrences at line ~199 and ~3884 already say 84 and do not move.

## 5. `docs/design-system.md`

Around line 501:

```markdown
status fills sit in a narrow luminance band in each mode — light `0.657–0.765`,
dark `0.012–0.039` — …
```

The rest of the paragraph (84, 1.0042, the scope) already agrees.

## 6. `packages/tokens/src/contrast.ts`

The `softActionPairs` JSDoc: "80 of the 288 shipped fill-on-tint pairs measured
under 1.05:1" → "84 of the 288 …". No code change.

## 7. `packages/tokens/src/soft-action.test.ts`

Extend the header with the plan-637 defect: the count and band were prose no test
read, two documents and one JSDoc still said 80, and the light band named only
the default palettes.

Add one case to the existing `describe("the action inside a soft status panel")`:

```ts
it("states the shipped figures the rationale quotes", () => {
  const softSurfaces = softActionPairs
    .filter(([fill]) => fill === "softAction")
    .map(([, background]) => background);
  const measured = shippedThemes.flatMap(({ theme }) =>
    neutralFills.flatMap((fill) =>
      softSurfaces.map((background) => ({
        name: theme.name,
        mode: theme.mode,
        fill,
        background,
        ratio: contrastRatio(theme.colors[fill], theme.colors[background]),
        floor: contrastFloors[theme.contrast].surface,
      })),
    ),
  );
  const failing = measured.filter(({ ratio, floor }) => ratio < floor);
  const worst = failing.toSorted((a, b) => a.ratio - b.ratio)[0];
  const identityLight = failing
    .filter(({ name }) => name === themes.light.name)
    .toSorted((a, b) => a.ratio - b.ratio)[0];
  const identityPress = failing.find(
    ({ name, fill, background }) =>
      name === themes.light.name &&
      fill === "active" &&
      background === "destructiveSoft",
  );
  const band = (mode: "light" | "dark") => {
    const values = shippedThemes
      .filter(({ theme }) => theme.mode === mode)
      .flatMap(({ theme }) =>
        softSurfaces.map((role) => relativeLuminance(theme.colors[role])),
      );
    return [Math.min(...values), Math.max(...values)] as const;
  };

  expect(measured).toHaveLength(288);
  expect(failing).toHaveLength(84);
  expect(worst?.name).toContain("Windows");
  expect(worst?.fill).toBe("active");
  expect(worst?.background).toBe("destructiveSoft");
  expect(worst?.ratio).toBeCloseTo(1.0042, 4);
  expect(identityLight?.fill).toBe("active");
  expect(identityLight?.background).toBe("infoSoft");
  expect(identityLight?.ratio).toBeCloseTo(1.0202, 4);
  expect(identityPress?.ratio).toBeCloseTo(1.0492, 4);
  expect(band("light").map((value) => value.toFixed(3))).toEqual(["0.657", "0.765"]);
  expect(band("dark").map((value) => value.toFixed(3))).toEqual(["0.012", "0.039"]);
});
```

Imports grow by `relativeLuminance`, `shippedThemes` (already imported),
`themes` (already imported). This case states the **shipped** guarantee: it
passes on the pre-fix tree, because the palette was never wrong, and fails only
if a shipped value moves the count, the worst pair or a band. The regression
proof for the prose is the `docs.test.ts` case below, which fails on the pre-fix
text.

## 8. `packages/tokens/src/docs.test.ts`

Extend the header with plan 637. Add a `describe` after the quoted-figures
sections:

```ts
describe("docs/tokens.md panel action rationale", () => {
  const softSurfaces = softActionPairs
    .filter(([fill]) => fill === "softAction")
    .map(([, background]) => background);
  const measured = shippedThemes.flatMap(({ theme }) =>
    (["hover", "active", "secondary"] as const).flatMap((fill) =>
      softSurfaces.map((background) => ({
        name: theme.name,
        mode: theme.mode,
        fill,
        background,
        ratio: contrastRatio(theme.colors[fill], theme.colors[background]),
        floor: contrastFloors[theme.contrast].surface,
      })),
    ),
  );
  const failing = measured.filter(({ ratio, floor }) => ratio < floor);
  const worst = failing.toSorted((a, b) => a.ratio - b.ratio)[0];
  const identityLight = failing
    .filter(({ name }) => name === themes.light.name)
    .toSorted((a, b) => a.ratio - b.ratio)[0];
  const identityPress = failing.find(
    ({ name, fill, background }) =>
      name === themes.light.name &&
      fill === "active" &&
      background === "destructiveSoft",
  );
  const band = (mode: "light" | "dark") => {
    const values = shippedThemes
      .filter(({ theme }) => theme.mode === mode)
      .flatMap(({ theme }) =>
        softSurfaces.map((role) => relativeLuminance(theme.colors[role])),
      );
    return [Math.min(...values), Math.max(...values)] as const;
  };
  const figures = { count: failing.length, total: measured.length };

  const sources = [
    ["docs/tokens.md", markdownProse],
    ["docs/design-system.md", designSystem],
    ["packages/tokens/README.md", readmeSource],
    [
      "src/contrast.ts",
      readFileSync(new URL("./contrast.ts", import.meta.url), "utf8"),
    ],
    [
      "src/styles.ts",
      readFileSync(new URL("./styles.ts", import.meta.url), "utf8"),
    ],
  ] as const;

  it("quotes the derived count and total in every surface that states it", () => {
    sources.forEach(([name, source]) => {
      const plain = source.replace(/\*\*/g, "").replace(/\s+/g, " ");
      const ofThe = [...plain.matchAll(/(\d+) of the (\d+) shipped/g)];
      const under = [...plain.matchAll(/(\d+) are under the 1\.05:1 floor/g)];

      expect(ofThe.length + under.length, name).toBeGreaterThan(0);
      ofThe.forEach(([, count, total]) => {
        expect(Number(count), name).toBe(figures.count);
        expect(Number(total), name).toBe(figures.total);
      });
      under.forEach(([, count]) => {
        expect(Number(count), name).toBe(figures.count);
      });
    });
  });

  it("quotes the derived luminance band", () => {
    const [lightMin, lightMax] = band("light").map((value) => value.toFixed(3));
    const [darkMin, darkMax] = band("dark").map((value) => value.toFixed(3));

    [markdownProse, designSystem].forEach((source) => {
      expect(source).toContain(`light \`${lightMin}–${lightMax}\``);
      expect(source).toContain(`dark \`${darkMin}–${darkMax}\``);
    });
  });

  it("quotes the worst pair and the identity pair they name", () => {
    const worstFigure = `${worst?.ratio.toFixed(4)}:1`;
    const identityFigure = `${identityPress?.ratio.toFixed(4)}:1`;

    [markdownProse, designSystem].forEach((source) => {
      expect(source).toContain(
        `Windows light \`active\` on \`destructiveSoft\` at **${worstFigure}**`,
      );
    });
    expect(markdownProse).toContain(
      `the identity light \`active\` on \`destructiveSoft\` was ${identityFigure}`,
    );
  });
});
```

The `docs.test.ts` imports grow by `relativeLuminance`, `softActionPairs`
(already imported) and `themes` (already imported). If a sentence is reworded,
the guard fails and the executor updates the sentence with the figure — that is
the contract.

**Proof both directions** (run before committing):

1. On the pre-fix tree (or with the three 80s restored and the band restored),
   `cd packages/tokens && nub x vitest run src/docs.test.ts` fails in
   "quotes the derived count and total…" (80 ≠ 84) and in "quotes the derived
   luminance band" (`0.742` ≠ `0.657`).
2. With the fix, every case passes.

## 9. `COMPONENTS.md`

In the **Theme contrast check** row, after the plan-394 sentence, add one short
clause: the rationale's **84 of 288** figure, its two bands and its named
pairs are derived from `shippedThemes` and held across the catalogue, the design
system, the README and the two JSDoc blocks (plan 637). Do not repeat the four
figures in a second place.

## 10. `TODO.md`

Add under "Design tokens and theming (`tokens-theme`)":

```
`[x]` Give the panel action's rationale one owner — the `softAction` story
quoted "80 of the 288" in two catalogue sections and the `softActionPairs`
JSDoc while the shipped count is **84**, its light band `0.742–0.765` omitted
the AAA light set (`destructiveSoft` is `0.657`) and "the identity light press"
named a ratio that is not its tightest (`active` on `infoSoft`, **1.0202:1**),
and no test read any of it; the count, total, both bands and the two named
ratios are derived in `soft-action.test.ts`, the five quoting surfaces are held
by `docs.test.ts`, three 80s and the band are corrected and no colour, pair,
floor or metric moves (plan 637)
```

Bump the section bar from `274/347` to `275/349` (the tick plus the row; the
bar is `[████████░░]`).

## 11. `.agents/slop/plans/README.md`

Add the row after 636 and a summary paragraph:

> 637 closes the last prose figures the panel-action story quotes. The rationale
> said "80 of the 288" in two catalogue sections and the `softActionPairs` JSDoc
> while `soft-action.test.ts` measured **84**; its light luminance band
> `0.742–0.765` described the default palettes only and omitted the AAA light
> tints (`0.657`); and "the identity light press was 1.0492:1" named a pair that
> is not the identity's tightest (`active` on `infoSoft`, 1.0202:1). The count,
> total, both bands and both named ratios are now derived — in
> `soft-action.test.ts` as the shipped guarantee, and in `docs.test.ts` across
> the catalogue, the design system, the README and the two JSDoc blocks, so a
> palette edit has to take the prose with it. No colour, pair, floor or metric
> moves.

## 12. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/soft-action.test.ts src/docs.test.ts`
   → every case passes.
3. Restore the three 80s and `0.742–0.765` temporarily and repeat step 2 → the
   two documented cases fail; restore the fix.
4. `nub run --filter @gpuixui/tokens test` → all suites green; no new file.
5. `nub run check` → exit 0.
6. `nub run lint` → exit 0.
7. `nub run test` → exit 0.

## 13. STOP conditions

Stop and report, do not improvise, if:

- the derived count is not 84 or the total is not 288 — re-read the palette and
  `shippedThemes`; a changed shipped set is an architecture decision;
- the derived light band does not round to `0.657–0.765` or the dark band to
  `0.012–0.039` — do not retype the old figures, report the new ones;
- a surface quotes the count in a sentence shape the regex does not match —
  extend the guard deliberately and record the shape in the plan, rather than
  weakening it to a substring check;
- `themeFailures` returns a failure for any shipped theme — this plan must not
  change a value;
- editing the prose would change a *historical* measurement (a plan file or a
  `TODO.md` done row) — those record what was measured then; leave them.

## 14. Acceptance

- Every present-tense surface that states the fill-on-tint figure says **84 of
  the 288**, and both documents state the band `0.657–0.765` / `0.012–0.039`.
- `soft-action.test.ts` derives the count, total, bands and the two named ratios;
  `docs.test.ts` reads the five surfaces and fails on any stale figure.
- The docs guard fails with the pre-fix text and passes after it.
- No colour, pair, floor or metric changes; `themeFailures` stays `[]` on all 24
  shipped sets.
- The catalogue, design system, README, JSDoc, inventory, TODO, plan index and
  audit note are current.
- `nub run check`, `nub run lint` and `nub run test` pass.
