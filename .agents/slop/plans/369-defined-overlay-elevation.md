# Plan 369 — a defined elevation level is a level, `overlay` included

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
085 (a level is geometry plus an alpha over the `shadow` tint), 358 (the metric
contract), 360 (elevation geometry is finite and the alpha is a fraction), 368
(every numeric member of every group is finite).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`themeMetricFailures` describes itself as the numeric half of the editable-theme
guarantee, and since plan 368 its JSDoc says *every* numeric member of *every*
group must be finite. The elevation group does not honour that claim: its rule
loop walks `sm`, `md` and `lg` only, and `overlay` is exempt — in the JSDoc
("reserved and empty, so it is exempt"), in `COMPONENTS.md`, in the package
README, and in `docs/tokens.md` ("`elevation.overlay` is exempt because it is
reserved and empty").

The exemption is true of the **shipped data** (every shipped set ships
`overlay: []`), but it is not true of the **type or of the runtime path**:

- `ElevationLevel` is `keyof Elevation` and therefore includes `"overlay"`.
- `elevationShadow(theme, "overlay")` accepts it and paints the first entry.
- `extendTheme(base, { elevation: { overlay: [...] } })` is a documented edit:
  elevation levels `replace` their arrays, so a consumer can define one.

A probe on the shipped light theme:

```ts
const broken = extendTheme(getTheme("light"), {
  elevation: {
    overlay: [
      { offsetX: Number.NaN, offsetY: 4, blurRadius: 12, spreadRadius: 0, alpha: 2 },
    ],
  },
});

themeMetricFailures(broken);   // []
themeContrastFailures(broken); // []
elevationShadow(broken, "overlay");
// { offsetX: NaN, offsetY: 4, blurRadius: 12, spreadRadius: 0,
//   color: "#191D25FF" }
```

Two silent failures in one level:

1. `offsetX: NaN` is handed to the renderer, which casts it to `f32` and paints
   invalid layout with no error — the exact failure plan 360 documented for
   `sm`/`md`/`lg`.
2. `alpha: 2` is silently clamped to an opaque shadow by `alpha()`, so a
   translucent level paints as a solid tint — the failure plan 360's `fraction`
   rule exists to report.

Because the level is exempt, both checkers return `[]`. The contract's own
sentence ("every numeric metric … must be a finite number") is false for an
edited theme.

The correct rule is not "`overlay` is always invalid" and not "`overlay` is
always exempt": an **empty** level paints nothing and stays exempt (the shipped
`overlay`), while a level a consumer **defines** is governed by the same rules as
`sm`, `md` and `lg`, because `elevationShadow` will paint it.

## 2. Decision

Walk all four levels in the elevation rule. Keep the non-empty requirement for
the three designed levels (`sm`, `md`, `lg`); an empty `overlay` is the reserved
case and reports nothing. A defined `overlay` entry takes every existing rule:
`finite` on both offsets, the blur and the spread, `non-negative` on the blur,
`fraction` on the alpha.

Rejected alternatives:

- **Delete `overlay` from `ElevationLevel` / `Elevation`** — that changes the
  public type, removes the reserved level the primitives already pass, and is a
  breaking API change for a defect the checker can report instead.
- **Hold every level non-empty, `overlay` included** — the shipped sets and the
  documented "reserved, empty" level would all fail; every set would need a
  designed overlay shadow, which is a design decision this plan has no evidence
  for.
- **Leave `overlay` exempt and delete the total claim from the docs** — the
  runtime will still paint a defined overlay, so the silent NaN/unpaintable
  shadow stays. The guarantee should shrink the hole, not the promise.
- **A new rule name or group** — no new concept is involved; `finite`,
  `non-negative` and `within` already say what is broken.

Every shipped theme, platform variant and recipe ships `overlay: []`, so this
plan moves **no token value**.

## 3. Exact edits

### 3.1 `packages/tokens/src/metrics.ts` — the elevation loop

Replace the `(["sm", "md", "lg"] as const).flatMap(...)` block with:

```ts
    ...(["sm", "md", "lg", "overlay"] as const).flatMap((level) => {
      const shapes = elevation[level];
      if (shapes.length === 0) {
        return level === "overlay"
          ? []
          : [failure("elevation", level, "at-least", shapes.length, 1)];
      }
      return shapes.flatMap((shape, index) => [
        ...finite("elevation", `${level}[${index}].offsetX`, shape.offsetX),
        ...finite("elevation", `${level}[${index}].offsetY`, shape.offsetY),
        ...finite("elevation", `${level}[${index}].blurRadius`, shape.blurRadius),
        ...nonNegative(
          "elevation",
          `${level}[${index}].blurRadius`,
          shape.blurRadius,
        ),
        ...finite(
          "elevation",
          `${level}[${index}].spreadRadius`,
          shape.spreadRadius,
        ),
        ...fraction("elevation", `${level}[${index}].alpha`, shape.alpha),
      ]);
    }),
```

The failure `member` strings keep the existing shape, so an `overlay` entry
reports `overlay[0].offsetX` and a consumer can point at the level.

### 3.2 `packages/tokens/src/metrics.ts` — the JSDoc

In the "elevation" bullet, replace:

> `overlay` is reserved and empty, so it is exempt.

with:

> `overlay` ships reserved and empty, and an empty level is exempt; a level a
> consumer defines — `overlay` included — is held to the same rules, because
> `elevationShadow` will paint it.

No other JSDoc paragraph changes: the "every numeric member … must be finite"
sentence becomes true as written.

### 3.3 New `packages/tokens/src/overlay-elevation.test.ts`

Header states the guarded bug: the elevation rule loop walked `sm`, `md` and
`lg` only, so a defined `overlay` entry with `offsetX: NaN` and `alpha: 2`
returned `[]` from both checkers while `elevationShadow(theme, "overlay")`
handed the renderer a NaN shadow with an opaque tint.

Cases:

1. A NaN `overlay[0].offsetX` reports exactly the `finite` failure for
   `overlay[0].offsetX` (and `themeContrastFailures` stays `[]`).
2. An out-of-range `overlay[0].alpha` reports the `within` failure named
   `overlay[0].alpha`.
3. A negative `overlay[0].blurRadius` reports `non-negative` (and `finite`
   passes — the two rules stay separate).
4. A **valid** custom overlay returns `[]`, proving the rule governs a defined
   level instead of rejecting the level itself.
5. An empty overlay returns `[]` for the identity themes, the shipped platform
   variants and both recipes — the reserved case stays exempt.
6. The evidence case: `elevationShadow(theme, "overlay")` returns the NaN
   `offsetX` the rule now reports (this is the renderer-facing value the case
   guards).
7. The `sm`/`md`/`lg` rules still report on the named levels (one existing
   `NaN` case per designed level), so moving the loop did not narrow them.

### 3.4 `docs/tokens.md` — "Numeric metrics"

Replace:

> `elevation.overlay` is exempt because it is reserved and empty.

with:

> An empty elevation level is exempt — `elevation.overlay` ships reserved and
> empty — but a level a consumer defines, `overlay` included, is held to the
> same rules, because `elevationShadow` will paint it.

The elevation table (all four levels, `[]` for `overlay`) stays as shipped.

### 3.5 `docs/design-system.md` — the elevation paragraph

Extend the `elevation.overlay` sentence:

> `elevation.overlay` is a different concern — a reserved shadow level, empty so
> the shape stays stable; a consumer who defines one is held to the same finite
> geometry and alpha as `sm`, `md` and `lg`, because `elevationShadow` will
> paint it.

### 3.6 `packages/tokens/README.md` — "Checking the numbers"

Replace:

> `elevation.overlay` is exempt because it is reserved and empty.

with:

> an empty elevation level is exempt (the shipped `elevation.overlay`), while a
> level a consumer defines is held to the same rules because `elevationShadow`
> paints the first entry.

### 3.7 `COMPONENTS.md` — the **Theme metric check** row

Replace "`elevation.overlay` is exempt as reserved and empty" with "an empty
elevation level (the shipped `overlay`) is exempt, while a defined one is
checked because `elevationShadow` paints it".

### 3.8 `packages/tokens/src/docs.test.ts`

Add one case beside the elevation table case:

```ts
  it("governs a defined elevation level, overlay included", () => {
    const prose = markdown.replace(/\s+/g, " ");
    expect(prose).toContain(
      "a level a consumer defines, `overlay` included, is held to the same rules",
    );
  });
```

### 3.9 `.agents/slop/plans/README.md` and `TODO.md`

- Add the plan row (`369`) after `368` and a closing paragraph in the same
  voice: the probe, the two silent failures, the four-level loop, the empty
  exemption and that no value moves.
- Add one ticked TODO row and move the progress count (`136/186` → `137/187`).

## 4. Test plan and both directions

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/metrics.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/overlay-elevation.test.ts)
# EXPECT: cases 1–3 FAIL (the pre-fix loop never reaches `overlay`); cases 4–7
# pass, because they document the exemption, the valid level and the
# `elevationShadow` path rather than the missing rule. A "reports" case that
# passes here is not guarding the fix — STOP and rewrite it.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/overlay-elevation.test.ts)
# EXPECT: every case passes.
```

Then the gate:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: the full tokens suite green; `check:tests` reports every test asserts
something; oxfmt and oxlint clean; `tsc --noEmit` clean; `docs.test.ts` accepts
the new sentence.

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe gains an elevation failure — a
  shipped `overlay` is non-empty, which contradicts the documented data and
  would mean a token value must move (this plan forbids that);
- an existing `metrics.test.ts` expectation changes — the loop move must not
  alter which rule an `sm`/`md`/`lg` edit reports;
- `docs.test.ts`, `inventory.test.ts` or `readme.test.ts` rejects §3.4–§3.7 —
  adjust the wording to the guard, not the guard to the wording;
- the change appears to need a new group, rule name or public function — it is
  one loop and four documentation sentences;
- a "reports" case passes on the pre-fix `metrics.ts` (see §4).

## 6. Acceptance criteria

- `themeMetricFailures(extendTheme(getTheme("light"), { elevation: { overlay: [
  { ...shape, offsetX: NaN } ] } }))` reports `finite` on
  `overlay[0].offsetX`, and the `alpha: 2` case reports `within` on
  `overlay[0].alpha`; both return `[]` from `themeContrastFailures`.
- A valid custom overlay and every shipped empty overlay return `[]`.
- `elevationShadow(theme, "overlay")` still paints a defined entry — the rule
  guards a reachable renderer path rather than inventing one.
- The four documents and the ledger state the refined rule; `docs.test.ts` holds
  the catalogue sentence.
- The new cases fail on the pre-fix `metrics.ts` and pass after.
- No token value, colour pair, floor, platform style or recipe changes; no path
  outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None. The change is a checker rule over a type the package already publishes; no
shipped consumer defines `elevation.overlay` today. The recorded `primitives`
bug — Tooltip and Select pass `elevation: "overlay"` and get no shadow — is
unchanged by this plan: an empty level still paints nothing, and the cross-team
row already says they should read `"md"`.
