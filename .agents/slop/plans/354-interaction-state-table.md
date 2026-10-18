# Plan 354: The interaction-state table names the surfaces the contract measures

> **Status:** done 2026-10-18. Owner: `tokens-theme`. Paths touched:
> `docs/design-system.md`, `packages/tokens/src/docs.test.ts`, `COMPONENTS.md`,
> `TODO.md`, `.agents/slop/plans/README.md`. No token, colour, pair, floor or
> API changes.

## Execution record (2026-10-18)

- Ten cases were added to `docs.test.ts` and the eight drifting rows were
  rewritten before the first run; the whole suite was green at **4240 tests**
  (4230 before).
- Four probes proved the guards can fail before the document edit, then the
  rows were restored:
  - removing "and the four soft status fills a link in a status panel sits on"
    → `names every surface a link is measured on` fails with
    `expected [ 'infoSoft', 'successSoft', …(2) ] to deeply equal []`;
  - restoring "every surface and row wash a placeholder fills" in the loading
    row → `names every surface a loading placeholder is measured on` fails with
    `expected [ 'background', 'card', …(2) ] to deeply equal []`;
  - restoring "the same four surfaces" in the pressed row → `names every surface
    an interactive wash is measured on` fails with
    `pressed: expected [ 'background', 'card', …(2) ] to deeply equal []`;
  - deleting the invalid-ring clause from the focus row → `names the invalid
    field edge and the two ring roles` fails with
    `expected '| focus | \`focusRing(theme)\`: a zero-…' to contain '\`destructive\`'`.
- `nub run check`, `nub run lint` and the root `nub run test` are green.

## 1. The gap

Plans 351 and 352 made the design-system's **accessibility** table (§9) derive
its rows from the contrast contract: every pair class has a row, and the mark,
track, Toast and boundary rows name every role and surface their pairs use. The
**interaction-state** table (§8) is now the last published list on the page
whose content is still hand-written, and it has already drifted:

| Row | Says | The contract measures |
| --- | ---- | --------------------- |
| `link` | `primaryText` on "the plain surfaces", `muted`, the `hover`/`active` washes and the `accent`/`selected` fills (8) | plus the four soft status fills a link in a status panel sits on (`softPanelTextPairs`, plan 346); `background`, `card` and `popover` are not named (12 total) |
| `loading` | "every surface and row wash", then names only `hover`, `active`, `accent`, `selected` | `background`, `card`, `popover`, `muted` too (`skeletonSurfaces`) |
| `selected` | the fill is held "on the surface it marks" | `background`, `card`, `popover`, `muted` for the fill; `selected`, the `hover`/`active` washes and `accent` for `selectedForeground` |
| `disabled` | the label keeps 3:1 "on its fill" | thirteen surfaces: the `disabled` fill, the four plain surfaces, the four row washes and the four soft status fills (`inactiveSurfaces`) |
| `focus` | names no surface at all | the `ring` on `background`, `card`, `popover`, `muted`, `accent`, the three washes and the four soft status fills; the invalid `destructive` ring on the same surfaces except the canvas |
| `status` | "a plain surface, the `muted` panel or the four washes" | `background`, `card` and `popover` as distinct plain surfaces plus `muted` and the four washes |
| `hover` / `pressed` | "the canvas, card, popover and quiet panel" / "the same four surfaces" | the four roles `background`/`card`/`popover`/`muted` (`stateFillSurfacePairs`) |

A reader learns that a link in an Alert is not checked, that a loading row on a
card is not checked, and that a disabled action inside a Toast is not checked —
while `themeContrastFailures` does check all three. The page's own §9 rows name
those surfaces, so §8 contradicts §9 one section apart.

No test asserts §8, so the drift is invisible: a future pair list can grow and
the state table can keep the old list.

## 2. Decision

Hold §8 to the same standard §9 reached in plans 351/352:

- Rewrite the seven rows that name surfaces so they use the contract's role
  names (`background`, `card`, `popover`, `muted`) instead of prose aliases
  ("canvas", "quiet panel").
- Add a new `describe("docs/design-system.md interaction states")` block to
  `docs.test.ts` that derives each row's expected surface list from the pair
  lists the checker runs and fails when a surface is missing.
- Keep the `text selection` and `invalid` rows as they are except for the
  small wording needed to make their role names explicit; their surfaces are
  already correct.

Why not export new list constants (`skeletonSurfaces`, `ringPairs`)? The test
can derive every list from the already-public `contrastPairs`,
`stateFillSurfacePairs` and `inactiveSurfaces`. Exporting internals to make a
documentation guard easier would enlarge the public API for no consumer.

Why no colour change? Every pair already passes in all ten shipped sets. This
plan fixes the document and freezes it; the contract is the source of truth.

## 3. Files to change

### 3.1 `docs/design-system.md` — §8 table rows

Replace these seven rows (line breaks are the file's long single lines):

**hover**

```md
| hover | `hover` wash on ghost and subtle surfaces, held to the 1.05:1 perceivability floor on `background`, `card`, `popover` and the quiet `muted` panel it paints on; filled actions step to their family's `xHover` — opaque, contrast-checked, one 1.05:1 step from the resting fill — instead of compositing an alpha fill |
```

**pressed**

```md
| pressed | `active` wash on ghost and subtle surfaces, held to the same floor on `background`, `card`, `popover` and `muted`; filled actions step to `xActive`, one 1.05:1 step past their hover |
```

**loading**

```md
| loading | `skeleton` fill with `pulse` (or `step`) motion, held to the 1.05:1 perceivability floor on `background`, `card`, `popover`, the `muted` panel and the four row washes it fills — `hover`, `active`, the `accent` wash a selectable row hovers and `selected`; the identity and high-contrast skeletons were the `active` fill until plan 094; the active indicator uses `primary` |
```

**selected**

```md
| selected | `selected` + `selectedForeground`: the fill is held to the perceivability floor on `background`, `card`, `popover` and `muted`, and the label to its floor on `selected`, the `hover`/`active` pointer washes and the `accent` wash a selectable row hovers; a toggle that is on steps `accent` → `accentHover` → `accentActive` with `accentForeground` on all three |
```

**link**

```md
| link | `primaryText` on `background`, `card`, `popover`, the `muted` panel, the `hover`/`active` washes a link paints, the `accent`/`selected` fills a selectable row paints under it and the four soft status fills a link in a status panel sits on; `primary` is a fill and is never the colour of text |
```

**disabled**

```md
| disabled | `disabled` fill + `disabledForeground`, which keeps a readable dim (3:1, 4.5:1 at AAA) while staying well below secondary text, on the `disabled` fill, `background`, `card`, `popover`, the `muted` panel, the `hover`/`active`/`accent`/`selected` washes and the four soft status fills; the control paints its `border` edge on that fill so its shape survives on any panel, plus a non-colour cue where possible |
```

**focus**

```md
| focus | `focusRing(theme)`: a zero-offset, zero-blur `boxShadow` spread by `borderWidth.strong`, painted from `ring` while the control is focused, on `background`, `card`, `popover`, the `muted` panel, `accent`, the `hover`/`active`/`selected` washes and the four soft status fills; an invalid control recolours it with `destructive` on the same surfaces except the canvas, which the invalid field edge already covers |
```

**status**

```md
| status | a family (`info`/`success`/`warning`/`destructive`) via its solid role for a fill, its soft pair and designed edge through `statusTone(theme, tone)`, or its `xText` role for labels, icons and dots on `background`, `card`, `popover`, the `muted` panel or the `hover`/`active`/`accent`/`selected` wash a row paints; a tone from untrusted data narrows with `isStatusTone`. The shipped Toast is the one exception: it paints its glyph and 3px bar with `xSoftForeground` on the `popover` card, so that pair is held at the secondary floor until the `components` migration to `xText` lands (plan 348) |
```

Leave `invalid` and `text selection` unchanged.

### 3.2 `packages/tokens/src/docs.test.ts`

Add a new `describe` block after the existing design-system cases (before the
closing of the file's last `describe` is fine; a top-level `describe` at the end
is simplest):

```ts
describe("docs/design-system.md interaction states", () => {
  /**
   * The state table is the last published list plan 351 left hand-written. It
   * had drifted: the link row omitted the soft status fills plan 346 added, the
   * loading row said "every surface" and named four, and the focus row named
   * none. Each case below derives its surfaces from the pair list the checker
   * runs, so a new pair cannot ship with a state row that forgets it.
   */
  const expand = (text: string): string =>
    text
      .replace(
        "the four soft status fills",
        "`infoSoft` `successSoft` `warningSoft` `destructiveSoft`",
      )
      .replace(
        "the four row washes",
        "`hover` `active` `accent` `selected`",
      );

  const names = (
    label: string,
    surfaces: ReadonlyArray<string>,
  ): void => {
    const text = expand(tableRow(label));
    surfaces.forEach((surface) =>
      expect(text, `${label}: ${surface}`).toContain(`\`${surface}\``),
    );
  };

  const backgroundsOf = (foreground: string): ReadonlyArray<string> => [
    ...new Set(
      contrastPairs
        .filter(([role]) => role === foreground)
        .map(([, background]) => background),
    ),
  ];

  it("has a row for every interaction state", () => {
    [
      "hover",
      "pressed",
      "loading",
      "selected",
      "link",
      "disabled",
      "invalid",
      "focus",
      "text selection",
      "status",
    ].forEach((state) => expect(tableRow(state).length, state).toBeGreaterThan(0));
  });

  it("names every surface an interactive wash is measured on", () => {
    (
      [
        ["hover", "hover"],
        ["pressed", "active"],
      ] as const
    ).forEach(([label, role]) =>
      names(
        label,
        stateFillSurfacePairs
          .filter(([fill]) => fill === role)
          .map(([, surface]) => surface),
      ),
    );
  });

  it("names every surface a loading placeholder is measured on", () => {
    names("loading", backgroundsOf("skeleton"));
  });

  it("names the selected fill and its label's washes", () => {
    names(
      "selected",
      stateFillSurfacePairs
        .filter(([fill]) => fill === "selected")
        .map(([, surface]) => surface),
    );
    names("selected", backgroundsOf("selectedForeground"));
  });

  it("names every surface a link is measured on", () => {
    names("link", backgroundsOf("primaryText"));
  });

  it("names every surface an inactive label is measured on", () => {
    names("disabled", backgroundsOf("disabledForeground"));
  });

  it("names the invalid field edge and the two ring roles", () => {
    names("invalid", ["input", "background"]);
    const focus = tableRow("focus");
    expect(focus).toContain("`ring`");
    expect(focus).toContain("`destructive`");
  });

  it("names every surface the focus ring is measured on", () => {
    names(
      "focus",
      backgroundsOf("ring").filter((surface) => surface !== "input"),
    );
  });

  it("names every surface status text is measured on", () => {
    names("status", backgroundsOf("infoText"));
  });

  it("names the selection roles", () => {
    const text = tableRow("text selection");
    expect(text).toContain("`selection`");
    expect(text).toContain("`selectionOnFill`");
  });
});
```

Notes for the executor:

- `backgroundsOf("skeleton")` currently yields the eight surfaces in
  `skeletonSurfaces`; `backgroundsOf("primaryText")` yields twelve;
  `backgroundsOf("disabledForeground")` yields the thirteen `inactiveSurfaces`;
  `backgroundsOf("ring")` includes `input` from `fieldPressedEdgePairs`, which
  the focus row deliberately leaves to the invalid/field clause, hence the
  filter.
- `tableRow(label)` is the existing helper; it matches a line starting with
  `` `| ${label} ``, which is unique for each of these labels in the document.
- `expand` only translates the two grouped phrases; the rewritten rows name
  every other surface literally, so the assertions stay honest.
- Keep the surface order from the pair lists; do not sort or deduplicate in the
  document — only the test's `Set` deduplicates.

Update the file header comment with one sentence: plan 354 makes the
design-system's interaction-state table content-derived, so the last hand-written
list on the page cannot omit a surface the contract measures.

### 3.3 `COMPONENTS.md`

In the **Design tokens** row, append one sentence after the existing
`docs.test.ts` clause: the design-system's interaction-state table names every
surface the contract measures for hover, press, loading, selection, links,
inactive controls, focus and status (plan 354).

Do not change any count in the row: this plan adds no role, pair or type.

### 3.4 `TODO.md`

Under **Design tokens and theming (`tokens-theme`)**, add and tick after the
plan-352 row:

```md
`[x]` Hold the design-system's interaction-state table to the contract — it was
the last hand-written list on the page: the link row omitted the four soft
status fills plan 346 added, the loading row named four of eight surfaces, and
the focus row named none; every state row now names its surfaces and a derived
case holds each to the pair list that enforces it (plan 354)
```

Bump the subsection count 121/168 → 122/169.

### 3.5 `.agents/slop/plans/README.md`

- Add the plan row after 353:
  `| [354](./354-interaction-state-table.md) | The interaction-state table names the surfaces the contract measures | F | 346, 351, 352 | done |`
- Add a paragraph after the 353 paragraph: the state table was the last
  hand-written list, the link row had dropped plan 346's soft fills, and the
  derived cases hold every row to its pair list.

## 4. Commands and expected results

Run from the worktree root.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/tokens test` **before** the document edit, with the new cases present | **fails**: the loading case on `` `background` ``/`` `muted` `` (the old row names neither), the link case on the four soft fills and `` `background` ``, the selected case on `` `background` ``/`` `card` ``/`` `popover` ``/`` `muted` ``, the disabled case on the plain surfaces and soft fills, the focus case on every surface, the press case on `` `background` `` (the row says "the same four surfaces"), and the status case on `` `background` ``/`` `card` ``/`` `popover` `` |
| `nub run --filter @gpuixui/tokens test` **after** the document edit | exit 0; 70 files, 4240 tests (4230 before; ten new cases) |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run fmt` | exit 0 (run `nub run fmt:fix` first if it reports formatting; the long table rows must stay one line) |
| `nub run test` | exit 0 |

Capture the pre-edit failure output in the commit message body, and the
post-edit totals.

## 5. Test plan

The ten new cases are the regression guard. Each must be able to fail:

1. **Row presence** — delete the `pressed` row → fails on `pressed`.
2. **Hover/press surfaces** — revert `pressed` to "the same four surfaces" →
   fails on `background`.
3. **Loading** — revert to "every surface … `hover`, `active` …" → fails on
   `background`, `card`, `popover`, `muted`.
4. **Selected fill** — remove `muted` from the selected row → fails.
5. **Selected label** — remove `hover`/`active` from the selected row → fails.
6. **Link** — the pre-edit row → fails on `infoSoft` (and the other soft fills).
7. **Disabled** — the pre-edit row → fails on `background`, `card`, `popover`,
   `hover`, `active`, `accent`, `selected` and the soft fills.
8. **Focus** — the pre-edit row → fails on every derived surface; removing
   `destructive` from the new row fails the role assertion.
9. **Status** — revert to "a plain surface, the `muted` panel or the four
   washes" → fails on `background`, `card`, `popover`.
10. **Selection roles** — delete `selectionOnFill` from the text-selection row →
    fails.
11. **Invalid edge** — remove the `background` clause from the invalid row →
    fails.

Run probes 2, 3, 6 and 8 once each, record the failure text, and restore. The
`verify-two-directions.sh` script is not needed: the failure is demonstrated in
the same suite before and after the document edit.

No example and no colour probe are added: the plan changes documentation and
its guard only, and every shipped theme already passes the pairs the rows cite.
This follows plans 351 and 352, which are documentation-truth plans.

## 6. Acceptance criteria

- §8 names every surface the contract measures for hover, pressed, loading,
  selected, link, disabled, focus and status, using the role names.
- The link row names the four soft status fills; the loading row names the four
  base surfaces; the focus row names the ring surfaces and the invalid role.
- The nine derived cases fail against the pre-edit rows and pass after the edit.
- No token, colour, pair, floor, type or export changes.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. STOP conditions

- **A derived surface cannot be named in the row without inventing a role.**
  Stop and report; the document must use the contract's own names.
- **A pair list contains a surface that is not a real composition** (for
  example a pair that only exists for another role). Stop and report; do not
  weaken the assertion to make the suite green.
- **A gate fails outside `docs/design-system.md`, `packages/tokens/src/docs.test.ts`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/`.** Stop and report the
  file and error; do not edit another workstream's tree.
- **The document formatter joins or splits a table row.** Stop and reformat by
  hand; the table is read by `tableRow`, which needs the row on one line.
