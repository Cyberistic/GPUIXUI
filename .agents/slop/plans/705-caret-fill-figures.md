# 705 — The caret's shipped fill figures after plan 698

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (docs truth).
**Depends on:** 511 (the `primary` caret), 557 (the ink caret and `caretPairs`),
682 (the caret's surface owners), 698 (the macOS dark accent move).

## 1. The defect

Plan 698 moved macOS dark's `primary` from `#0A84FF` to `#2E93FF` so the
selected option's check clears the 3:1 mark floor on the `selected` fill. The
move changed both row-fill ratios every caret paragraph quotes:

| Pair, macOS dark default | Before 698 | Shipped today |
| ------------------------ | ---------- | ------------- |
| `primary` on `selected`  | 2.748:1    | 3.214:1       |
| `primary` on `active`    | 2.836:1    | 3.317:1       |

Five places still describe the **shipped** fill in the present tense as measuring
2.748:1 / 2.836:1 **under** the 3:1 floor:

| Place | Sentence |
| ----- | -------- |
| `packages/tokens/src/styles.ts` | `nativeFieldTheme` JSDoc: "On the shipped macOS dark set the fill measures **2.748:1** …" |
| `packages/tokens/src/contrast.ts` | `caretPairs` JSDoc: "on macOS dark it measures **2.748:1** …" |
| `docs/design-system.md` | "On macOS dark the fill measures **2.748:1** …" |
| `docs/tokens.md` | "… and on macOS dark it measures **2.748:1** …" |
| `COMPONENTS.md` (design tokens row) | "the `primary` fill measured **2.748:1** … under the 3:1 mark floor" |

The `COMPONENTS.md` row uses the past tense for the verb but introduces the
reason the caret is ink, so it reads as today's evidence; the other four are
literally present tense. Plan 698's own sentence in
`platform-styles/macos.ts` already records "3.214:1", so the package contradicts
itself.

The role decision is still right: a caret is a 1px **mark**, and `primaryText`
clears every surface a field sits on with margin (**5.587:1** at the tightest).
What changed is only the evidence — the fill failed the mark **before** plan 698
moved it, and the caret stays the ink because it is the mark role, not because
the fill is still under the floor.

**Why no test caught it.** `native-field-caret.test.ts` pins the pre-698 values
as a historical fixture (`oldPrimary`/`oldSelected`) and never reads the
sentence; `platform-claims.test.ts` holds macOS's ring, accent-on-canvas,
accent-on-card, dialog face and Windows border figures, not the caret's
row-fill pair; `docs.test.ts` only checks that the two pages mention
`caretPairs`.

## 2. Exact changes

### 2.1 `packages/tokens/src/styles.ts`

In the `nativeFieldTheme` JSDoc (the block beginning "The `theme` prop for a
native `<input>`/`<textarea>`"), replace:

```
 * field from its `theme` prop: `caret`. The caret is the accent's readable **ink** —
 * `primaryText` — not the `primary` fill: a caret is a 1px mark painted on the
 * field's surface, and the fill is tuned for a label on top of it. On the
 * shipped macOS dark set the fill measures **2.748:1** on a selected row and
 * **2.836:1** on a pressed one, under the 3:1 mark floor, so a caret in an
 * in-place editor (`InlineEdit`, which plan 527 holds on the four row washes)
 * vanished there. `primaryText` clears the floor on all nine surfaces a field
 * sits on — `primaryTextPairs` holds the eight and {@link caretPairs} adds the
 * field's own `input` fill as a mark — in all 24 shipped sets (5.587:1 at the
 * tightest).
```

with:

```
 * field from its `theme` prop: `caret`. The caret is the accent's readable **ink** —
 * `primaryText` — not the `primary` fill: a caret is a 1px mark painted on the
 * field's surface, and the fill is tuned for a label on top of it. The fill
 * failed that mark when the caret moved (plan 557): macOS dark measured
 * **2.748:1** on a selected row and **2.836:1** on a pressed one, under the 3:1
 * floor, so a caret in an in-place editor (`InlineEdit`, which plan 527 holds on
 * the four row washes) vanished there. Plan 698 has since moved it to 3.214:1
 * on `selected` and 3.317:1 on `active` for the option's check; the caret stays
 * the ink because `primaryText` clears all nine surfaces a field sits on in all
 * 24 shipped sets (5.587:1 at the tightest) — `primaryTextPairs` holds the
 * eight and {@link caretPairs} adds the field's own `input` fill as a mark.
```

### 2.2 `packages/tokens/src/contrast.ts`

In the `caretPairs` JSDoc, replace:

```
 * The native field's caret on the one surface the text contract does not
 * already hold: its own `input` fill. The caret is the accent's readable ink
 * (`primaryText`), not the `primary` fill — the fill is tuned for a label on top
 * of it, and on macOS dark it measures **2.748:1** on `selected` and
 * **2.836:1** on `active`, under the 3:1 mark floor, so a caret in a selected
 * inline edit vanished while every check returned `[]`. The other eight
 * surfaces a field sits on — the four `Surface` tones and the four row washes an
 * in-place editor paints — are already held by `primaryTextPairs` at the higher
 * `secondary` floor. This pair is a `mark` because a caret is a 1px indicator,
 * not text; `primaryText` clears it on all nine surfaces in every shipped set
 * (5.587:1 at the tightest, Windows dark on `active`). It is published inside
 * {@link markPairs}, so the mark class is whole.
```

with:

```
 * The native field's caret on the one surface the text contract does not
 * already hold: its own `input` fill. The caret is the accent's readable ink
 * (`primaryText`), not the `primary` fill — the fill is tuned for a label on top
 * of it. Before plan 698 moved it the macOS dark fill measured **2.748:1** on
 * `selected` and **2.836:1** on `active`, under the 3:1 mark floor, so a caret
 * in a selected inline edit vanished while every check returned `[]`; the fill
 * now measures 3.214:1 on `selected` and 3.317:1 on `active`, and the caret
 * stays the ink. The other eight surfaces a field sits on — the four `Surface`
 * tones and the four row washes an in-place editor paints — are already held by
 * `primaryTextPairs` at the higher `secondary` floor. This pair is a `mark`
 * because a caret is a 1px indicator, not text; `primaryText` clears it on all
 * nine surfaces in every shipped set (5.587:1 at the tightest, Windows dark on
 * `active`). It is published inside {@link markPairs}, so the mark class is
 * whole.
```

### 2.3 `docs/design-system.md`

In the native-field paragraph (around line 451), replace:

```
held by the `primaryText` text pairs. On macOS dark the fill measures **2.748:1**
on a selected row and **2.836:1** on a pressed one, under the 3:1 mark floor.
```

with:

```
held by the `primaryText` text pairs. The fill failed that mark when the caret
moved (plan `557`): macOS dark measured **2.748:1** on a selected row and
**2.836:1** on a pressed one, under the 3:1 mark floor. Plan `698` has since
moved it to **3.214:1** on `selected` and **3.317:1** on `active` for the
option's check; the caret keeps the ink role because `primaryText` clears every
surface with margin (**5.587:1** at the tightest).
```

### 2.4 `docs/tokens.md`

In the caret paragraph (around line 1775), replace:

```
because a caret is a 1px **mark**, not a label on a fill: `primary` is the fill,
and on macOS dark it measures **2.748:1** on a `selected` row and **2.836:1** on
a pressed one, under the 3:1 mark floor, so a caret in an in-place editor
(`InlineEdit` paints a field on the four row washes) vanished there while every
check returned `[]`. `primaryText` is the accent's readable ink: the text pairs
already hold it on the four `Surface` tones and the four row washes at the
4.5:1 secondary floor, and `caretPairs` holds it on the field's own `input`
fill at the mark floor. It clears all nine surfaces in every shipped set
```

with:

```
because a caret is a 1px **mark**, not a label on a fill: `primary` is the fill,
and when the caret moved (plan `557`) macOS dark measured **2.748:1** on a
`selected` row and **2.836:1** on a pressed one, under the 3:1 mark floor, so a
caret in an in-place editor (`InlineEdit` paints a field on the four row washes)
vanished there while every check returned `[]`. Plan `698` has since moved the
fill to **3.214:1** on `selected` and **3.317:1** on `active` for the option's
check, so the caret keeps the ink role: `primaryText` is the accent's readable
ink, the text pairs already hold it on the four `Surface` tones and the four row
washes at the 4.5:1 secondary floor, and `caretPairs` holds it on the field's own
`input` fill at the mark floor. It clears all nine surfaces in every shipped set
```

### 2.5 `COMPONENTS.md`

In the **Design tokens** row, replace:

```
because a caret is a 1px mark, not a label on a fill: the `primary` fill measured **2.748:1** on macOS dark's `selected` row and **2.836:1** on its pressed wash, under the 3:1 mark floor, while
```

with:

```
because a caret is a 1px mark, not a label on a fill: before plan `698` moved it the `primary` fill measured **2.748:1** on macOS dark's `selected` row and **2.836:1** on its pressed wash, under the 3:1 mark floor, and it now measures **3.214:1** on `selected` and **3.317:1** on `active`, while
```

### 2.6 `packages/tokens/src/native-field-caret.test.ts`

Append this block after the existing `describe("native field caret")` (the file
already imports `readFileSync`, `contrastRatio` and `getPlatformTheme`):

```ts
/**
 * Plan 698 moved macOS dark's `primary` for the selected option's check, taking
 * the fill to 3.214:1 on `selected` and 3.317:1 on `active`; five documents kept
 * describing the pre-698 fill in the present tense — "the fill measures
 * **2.748:1** on a selected row … under the 3:1 mark floor" — which the shipped
 * set no longer produces. The figures derive from the resolved set, so the next
 * accent move fails the sentences instead of leaving the package's own
 * rationale describing a value it does not ship (plan 535's class).
 */
describe("the caret's shipped fill figures", () => {
  const macOSDark = getPlatformTheme("darwin", "dark");
  const selected = contrastRatio(
    macOSDark.colors.primary,
    macOSDark.colors.selected,
  );
  const active = contrastRatio(
    macOSDark.colors.primary,
    macOSDark.colors.active,
  );

  /** A file's prose with its comment markers and line breaks collapsed. */
  const prose = (path: string, stripComments: boolean): string =>
    readFileSync(new URL(path, import.meta.url), "utf8")
      .split("\n")
      .map((line) =>
        stripComments ? line.replace(/^\s*(?:\*|\/\/)\s?/, "") : line,
      )
      .join(" ")
      .replace(/\s+/g, " ");

  /** The five places that justify the caret's role. */
  const documents = [
    ["styles.ts", prose("./styles.ts", true)],
    ["contrast.ts", prose("./contrast.ts", true)],
    ["docs/design-system.md", prose("../../../docs/design-system.md", false)],
    ["docs/tokens.md", prose("../../../docs/tokens.md", false)],
    ["COMPONENTS.md", prose("../../../COMPONENTS.md", false)],
  ] as const;

  /** Whether a passage names a ratio on a surface, bold or plain. */
  const names = (
    passage: string,
    figure: number,
    surface: string,
  ): boolean =>
    [
      `${figure.toFixed(3)}:1 on \`${surface}\``,
      `**${figure.toFixed(3)}:1** on \`${surface}\``,
    ].some((needle) => passage.includes(needle));

  /** Today's fill on both row fills, and no present-tense claim of the old one. */
  const statesCurrentFill = (passage: string): boolean =>
    names(passage, selected, "selected") &&
    names(passage, active, "active") &&
    !passage.includes("fill measures **2.748:1**");

  it("states today's fill on both rows it marks", () => {
    expect(selected).toBeCloseTo(3.214, 3);
    expect(active).toBeCloseTo(3.317, 3);

    documents.forEach(([name, passage]) => {
      expect(statesCurrentFill(passage), name).toBe(true);
    });
  });

  it("rejects the pre-698 present tense", () => {
    const stale =
      "On the shipped macOS dark set the fill measures **2.748:1** on a selected row and **2.836:1** on a pressed one, under the 3:1 mark floor.";
    expect(statesCurrentFill(stale)).toBe(false);

    // A page that adds today's figure elsewhere still fails while the old
    // sentence stands.
    const mixed = `${stale} Plan 698 moved the fill to ${selected.toFixed(3)}:1 on \`selected\` and ${active.toFixed(3)}:1 on \`active\`.`;
    expect(statesCurrentFill(mixed)).toBe(false);
  });
});
```

### 2.7 `TODO.md`

Under *Design tokens and theming (`tokens-theme`)*, append a ticked row and move
the progress bar from `317/394` to `318/395`:

```
`[x]` Hold the caret's shipped fill figures to plan 698's move — the macOS dark
accent moved from `#0A84FF` to `#2E93FF` so the selected option's check clears
the mark floor, taking the fill from 2.748:1 to **3.214:1** on `selected` and
from 2.836:1 to **3.317:1** on `active`, while five places still said in the
present tense that the shipped fill measured under the 3:1 floor; the four stale
sentences and the inventory now name the move, the historical failure and
today's figures, and a guard derives both ratios from
`getPlatformTheme("darwin", "dark")` and rejects the pre-698 present tense; no
colour, pair, floor, metric or shipped set moves (plan 705)
```

### 2.8 `.agents/slop/plans/README.md`

Add the row to the `tokens-theme` table after plan 703:

```
| [705](./705-caret-fill-figures.md) | The caret's shipped fill figures after plan 698 | F | 511, 557, 682, 698 | done |
```

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. **Guard first, documents untouched** — add §2.6, then:

   ```sh
   nub run --filter @gpuixui/tokens test -- native-field-caret.test.ts
   ```

   Expected: the new `states today's fill on both rows it marks` case fails on
   one of the five documents (the first is `styles.ts`), with
   `expected false to be true`; `rejects the pre-698 present tense` passes. The
   rest of the suite stays green. Record the exact failure in §7.

2. **Apply §2.1–§2.5**, then re-run the same command.

   Expected: both new cases pass with the rest of the file.

3. **Package suite**:

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: every test file green (193 files / 6788 cases at the branch point,
   plus the two new cases).

4. **Type check, lint, format**:

   ```sh
   nub run --filter @gpuixui/tokens check-types
   nub run lint
   nub run fmt
   ```

   Expected: clean. No `any`, no assertions, no native sort, no console.

5. **No scenario runs.** This plan changes four documents, one inventory row and
   one test; it touches no token value, pair, floor, metric, platform style or
   runtime path. The smoke and live playground suites are not scoped in, and the
   commit says so rather than implying a native check.

## 4. STOP conditions

Stop and report instead of improvising if:

- `contrastRatio(primary, selected)` on `getPlatformTheme("darwin", "dark")` is
  not 3.214, or `active` is not 3.317. That means the branch point differs from
  the plan and the documents need a fresh audit, not a numeral edit.
- Any document's caret paragraph does not contain the anchors used above
  ("The `theme` prop for a native `<input>`/`<textarea>`", "The native field's
  caret on the one surface", "held by the `primaryText` text pairs", "The one
  paint the theme can reach is the caret", "The one field paint the theme
  reaches, the caret"). Re-locate the paragraphs; do not delete an assertion.
- A shipped colour, pair, floor, metric or platform style would have to move.
  This plan moves none; a failing contrast case means the audit found something
  else and needs its own plan.
- Another worktree already owns `705-` (checked with the command below). Take
  the next free number and record it.

```sh
find /Users/cyberistic/GPUIXUI/workspaces -path "*/.agents/slop/plans/70[0-9]-*"
```

At the time of writing `700`–`704` are taken (`playground`, `primitives` and
`components`); `705` is free.

## 5. Test plan

**The bug the case guards.** A colour move lands and the sentences that justify a
role keep describing the pre-move value in the present tense. The pre-fix
documents are the failing fixture; the `rejects the pre-698 present tense` case
keeps that fixture in the suite, and its second half proves the negative clause
is load-bearing (a page that adds today's figure elsewhere still fails while the
old sentence stands).

**Both directions.**

- Without §2.1–§2.5: `states today's fill on both rows it marks` fails on
  `styles.ts`, and would fail on each of the other four once the first is fixed.
- With them: all five pass; the predicate still rejects the stale fixture.
- If plan 698's accent is reverted or moved again, the derived strings change
  and all five sentences fail, which is the intended guard.

**What the case must not do.** It must not read a hand-typed "3.214" as the
pass condition: the needle is built from `contrastRatio` on the resolved set, and
the literal stays only as a regression pin beside the derivation.

## 6. Acceptance

- Five documents name the move, the historical failure and today's two ratios.
- Two new cases in `native-field-caret.test.ts`, one of which fails on the
  pre-fix documents (recorded verbatim in §7).
- `nub run --filter @gpuixui/tokens test`, `check-types`, `nub run lint` and
  `nub run fmt` are green.
- `TODO.md`, `COMPONENTS.md` and the plan index carry the change.
- One commit on `agent/tokens-theme`, pushed to `origin`.

## 7. Execution notes (2026-10-20)

Ran at the branch point `c8f9b0b1`, all from this worktree.

1. **Guard first, documents untouched** —
   `nub run --filter @gpuixui/tokens test -- native-field-caret.test.ts` failed
   exactly one case:

   ```
   FAIL src/native-field-caret.test.ts > the caret's shipped fill figures >
   states today's fill on both rows it marks
   AssertionError: styles.ts: expected false to be true // Object.is equality
    ❯ src/native-field-caret.test.ts:293:48
   ```

   `rejects the pre-698 present tense` passed, and the rest of the suite stayed
   green. The first document in the list fails first, as expected; the same
   reduction fails each of the other four once the preceding one is fixed.

2. **Documents fixed, same command** — `193 passed`, `6790 passed (6790)`.

3. **Package suite** — `nub run --filter @gpuixui/tokens test`: 193 files,
   6790 cases, green.

4. **`nub run check`** — `check:tests` ("every test asserts something, and
   nothing asserts itself"), `oxlint`, `oxfmt` (284 files) and `tsc` on the
   three workspace projects are clean. `nub run lint` and `nub run test`
   (193 files / 6790 cases) are green.

5. **No scenario ran, deliberately.** The change touches four documents, one
   inventory row and one test: no token value, metric, pair, platform style,
   provider or runtime path. The smoke and live playground suites are therefore
   not scoped in, and the commit says so rather than implying a native check.
