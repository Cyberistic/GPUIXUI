# Plan 352: The boundary row omits the surfaces the contract measures

> **Status:** done 2026-10-18. Owner: `tokens-theme`. Paths touched:
> `docs/design-system.md`, `packages/tokens/src/docs.test.ts`, `COMPONENTS.md`,
> `TODO.md`, `.agents/slop/plans/README.md`. No token, colour, pair or floor
> changes.

## Execution record (2026-10-18)

- Before the document edit, the suite reported **2 failed | 4219 passed**:
  the exact-row case (the new boundary wording was absent) and
  `names every control boundary role and surface the contract measures`
  (`focus ring (\`ring\`) on: expected undefined to be defined`).
- The stronger clause assertion was then proven separately: with
  `` `background`/`card` `` removed from the `borderStrong` clause, the case fails
  with ``background: expected '(`borderStrong`) on `popover`/`muted`…' to contain '`background`'``.
  Reverting the row passes it, so the case can fail on the omission the plan
  exists for.
- After the document edit: **4221 passed**. `nub run check`, `nub run lint` and
  the root `nub run test` are green.

## Why

Plan 351 gave every `ContrastPairClass` a row in the design-system's
accessibility table and derived the mark, track and Toast rows from the contract.
The **boundary** row is now the last row whose content is hand-written, and it
lists fewer surfaces than `contrastPairs` measures:

- `["borderStrong", "background", "boundary"]`
- `["borderStrong", "card", "boundary"]`
- `["borderStrong", "input", "boundary"]`

are in the contract, but the row says only "essential boundaries on `popover`,
`muted`, the four state washes and the four soft status fills". A reader learns
that an unchecked checkbox edge is held on a dialog or a sidebar row, but not on
the canvas, a card, or the `input` fill a field's hover edge repaints. The
contract already measures them; the document does not say so.

The same `docs.test.ts` case still asserts the boundary row as one exact string,
so the omission is frozen rather than caught.

## Files to change

### 1. `docs/design-system.md` — §9 boundary row

Replace:

```md
| focus ring on `background`/`card`/`popover`/`muted`/`accent`, the `hover`/`active`/`selected` washes and the four soft status fills, the `destructive` ring an invalid control paints on the same surfaces, essential boundaries on `popover`, `muted`, the four state washes and the four soft status fills, plus the invalid field edge (`destructive` on `input`/`background`) and the field's pressed edge (`ring` on `input`) | 3:1 | 4.5:1 |
```

with:

```md
| focus ring (`ring`) on `background`/`card`/`popover`/`muted`/`accent`, the `hover`/`active`/`selected` washes and the four soft status fills, the `destructive` ring an invalid control paints on the same surfaces, essential boundaries (`borderStrong`) on `background`/`card`/`popover`/`muted` and the `input` fill a field sits on, the four state washes and the four soft status fills, plus the invalid field edge (`destructive` on `input`/`background`) and the field's pressed edge (`ring` on `input`) | 3:1 | 4.5:1 |
```

The three role names (`ring`, `destructive`, `borderStrong`) are now explicit so a
guard can check that each role a boundary pair uses is named.

### 2. `packages/tokens/src/docs.test.ts`

Update the exact boundary row in the "states the floors the contrast checker
enforces" array to the new wording.

Add a derived case after the plan-351 guards:

```ts
it("names every control boundary role and surface the contract measures", () => {
  const row = tableRow("focus ring (`ring`) on");

  const expand = (text: string): string =>
    text
      .replace(
        "the four state washes",
        "`hover` `active` `accent` `selected`",
      )
      .replace(
        "the four soft status fills",
        "`infoSoft` `successSoft` `warningSoft` `destructiveSoft`",
      );

  const clause = (from: string, to: string): string => {
    const start = row.indexOf(from);
    expect(start, from).toBeGreaterThanOrEqual(0);
    return expand(row.slice(start, row.indexOf(to)));
  };

  const surfacesOf = (role: "ring" | "borderStrong"): ReadonlyArray<string> =>
    contrastPairs
      .filter(
        ([foreground, , pairClass]) =>
          foreground === role && pairClass === "boundary",
      )
      .map(([, surface]) => surface);

  ["ring", "destructive", "borderStrong"].forEach((role) => {
    expect(row, role).toContain(`\`${role}\``);
  });

  const ringClause = clause("(`ring`) on", ", the `destructive` ring");
  surfacesOf("ring")
    .filter((surface) => surface !== "input")
    .forEach((surface) => {
      expect(ringClause, surface).toContain(`\`${surface}\``);
    });
  expect(row).toContain("the field's pressed edge (`ring` on `input`)");

  const boundaryClause = clause("(`borderStrong`) on", ", plus");
  surfacesOf("borderStrong").forEach((surface) => {
    expect(boundaryClause, surface).toContain(`\`${surface}\``);
  });
});
```

Notes for the executor:

- The two clauses are checked separately, not against the whole row. The whole
  row already names `background`, `card` and `input` in the focus-ring and
  invalid-edge clauses, so a row-wide search would not catch the omission this
  plan fixes — removing `background`/`card` from the `borderStrong` clause must
  fail.
- `surfacesOf("ring")` includes `input` from `fieldPressedEdgePairs`; that pair is
  documented by its own "field's pressed edge" phrase, which the case asserts.
  The ring clause therefore skips `input`.
- `expand` translates the document's own shorthand for the four state washes and
  the four soft status fills; the assertion still requires each literal role name
  the contract stores.
- Do not deduplicate: the contract legitimately pairs `destructive` with
  `input`/`background` and with the ring surfaces, and the row must survive every
  surface it names.

Update the file header's plan-351 paragraph with one sentence: the boundary row
is derived too, so a boundary pair cannot ship without its surface.

### 3. `COMPONENTS.md`

In the **Theme contrast check** row, extend the plan-351 clause: the boundary
row now names every surface a `boundary` pair measures, `background`, `card` and
the `input` fill included (plan 352).

### 4. `TODO.md`

Add under **Design tokens and theming (`tokens-theme`)**, ticked:

```md
`[x]` Hold the design-system's boundary row to the contract — it named the
dialog, panel, row washes and soft fills but not the canvas, a card or the
`input` fill, where `borderStrong` is also measured; the row names its three
roles and a derived case holds every boundary surface to it (plan 352)
```

Bump the subsection count by one.

### 5. `.agents/slop/plans/README.md`

Add the plan row with status `done` after plan 351.

## Commands and expected results

After step 2's new case exists but **before** the document edit:

```sh
nub run --filter @gpuixui/tokens test
```

Expected: **fail** —

- the exact-row case, because the old boundary wording is unchanged and the new
  one is absent;
- `names every control boundary role and surface the contract measures` on
  `` `borderStrong` `` (the old row never names the role) and on
  `` `background` `` / `` `card` `` / `` `input` ``.

Capture the output.

After the document edit:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

Expected: green; the tokens suite reports 4221 tests.

## STOP conditions

- Stop if expanding the grouped phrases is insufficient and a surface is named
  nowhere; the doc row is the thing to fix, not the assertion.
- Stop if a boundary pair has a surface the design system cannot name without
  inventing a new role; report it.
- Stop if a gate fails outside these files; report with the output.

## Acceptance

- The boundary row names `ring`, `destructive` and `borderStrong`, and every
  surface in a `boundary` pair.
- The derived case fails before the document edit and passes after it.
- No token, colour, pair or floor value changes.
- `nub run check`, `nub run lint` and `nub run test` pass.
