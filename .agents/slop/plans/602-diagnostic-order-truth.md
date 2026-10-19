# 602 — The diagnostic order the documents retype

**Phase:** F (the documentation half of the total theme check) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 383 (the total check), 398 (the check index), 540 (the
opacity check), 573 (the find highlight), 583 (the native text check) ·
**Number block:** 500–699 (`tokens-theme` overflow; 599 and 600 are in use by
the `playground` worktree and 601 is the last landed plan, so this takes 602).

## 1. The gap

`themeChecks` is the ordered owner of the nine checks `themeFailures` composes:

```ts
["color", "opacity", "typeface", "contrast", "highlight", "nativeText",
 "hierarchy", "direction", "metric"]
```

Plans 573 and 583 inserted `highlight` and `nativeText` between `contrast` and
`hierarchy`. The count guardians followed, but the documents that retype the
**order** did not. On the merged 2026-10-19 tree:

1. **`packages/tokens/README.md:316-318` is false.** It says “The order is
   diagnostic — `color`, `opacity`, `typeface`, `contrast`, `hierarchy`,
   `direction`, then `metric` — and `themeChecks` is that order as a list”. The
   list has seven members, not nine, and it is not the order `themeChecks`
   carries. A consumer building a report from the documented order silently
   omits the find-highlight and native-document checks.
2. **The README's ordinals are false.** Line 322 calls
   `themeTextTierFailures` “the fifth check” and line 330 calls
   `themeDirectionFailures` “the sixth”. They are the **seventh** and
   **eighth** (`themeChecks.indexOf("hierarchy")` is 6 and
   `indexOf("direction")` is 7). The sentence claims a position the index does
   not support.
3. **The README's payload list is incomplete.** Lines 320-322 name
   `ColorFailure`, `OpacityFailure`, `TypefaceFailure`, `ContrastFailure`,
   `TextTierFailure`, `DirectionFailure` and `MetricFailure` — seven of the
   nine payload types. `HighlightFailure` and `NativeTextFailure` are absent,
   so the sentence that says “the same … the individual check returns” leaves
   two checks without a payload.
4. **`docs/design-system.md:959-972` omits two checks.** It says
   `themeFailures` “composes the colour format, role opacity, typeface,
   contrast, text hierarchy, interaction direction and numeric metric checks”
   (seven), and its “Each part is available on its own” list names eight
   functions — `themeNativeTextFailures` is the missing one. A reader of the
   design system learns that a native-document defect is outside the total
   check.
5. **`COMPONENTS.md` and `docs/tokens.md` are correct but unguarded.**
   `docs/tokens.md:2641-2646` lists all nine in order, and the **Total theme
   check** row of `COMPONENTS.md` names all nine functions and the same order.
   Neither statement is derived from `themeChecks`.

The guard gap is the cause. `readme.test.ts` imports `themeChecks` but uses it
only for the count words. `docs.test.ts` checks the design system for the two
substrings “Each part is available on its own” and “`themeTypefaceFailures`”.
`inventory.test.ts` checks the ledger row for “`themeChecks`” and
“`ThemeFailureKind`”. A check added between two existing kinds leaves every
gate green while the front door, the design system and the ledger describe a
different composition.

No token, colour, pair, floor, metric, runtime helper or component changes.

## 2. Decisions

1. **The order is stated once from `themeChecks` in every document.** The
   README gets the full derived list; `docs/tokens.md` keeps its existing
   ordering sentence and is held by extracting the backticked kinds and
   comparing them with the index. The design system does not repeat the order:
   it says “it composes every check in `themeChecks`”, so a new check cannot
   leave a hand-typed prose list behind.
2. **Ordinals come from the index.** The README's two positional claims are
   derived with `themeChecks.indexOf(kind)`. A new check inserted before
   `hierarchy` must move the words.
3. **The payload words come from a complete map.** A test-local
   `Record<ThemeFailureKind, string>` lists the failure type of each kind. The
   `satisfies` clause makes a tenth kind fail to type-check until its payload is
   added.
4. **The function words come from the same kind map.** A test-local
   `Record<ThemeFailureKind, string>` names the individual check function, so
   the design system's “Each part is available on its own” and the ledger's
   composed list are both derived.
5. **No new public value.** `themeChecks` and `ThemeFailureKind` already own
   the domain; a `themeCheckFunctions` export would be a documentation lookup
   that no runtime caller needs. The kind-to-word and kind-to-function maps live
   in the documentation tests that read each document because they describe
   prose, not the package's API.
6. **No executed example.** This unit changes documentation truth only; there
   is no new runtime surface to demonstrate. `src/theme-check.example.ts` is
   already the runnable example for the composition this plan holds to its
   index.

## 3. Exact edits

All paths are relative to the worktree root
`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

### 3.1 `packages/tokens/README.md`

Replace lines 316-322 (the order, payload and first ordinal) with:

```md
The order is diagnostic — `color`, `opacity`, `typeface`, `contrast`,
`highlight`, `nativeText`, `hierarchy`, `direction` and
`metric` — and `themeChecks` is that order as a list, so a report or a settings
screen iterates the index instead of retyping the kinds. The payload is the same
`ColorFailure`, `OpacityFailure`, `TypefaceFailure`, `ContrastFailure`,
`HighlightFailure`, `NativeTextFailure`, `TextTierFailure`, `DirectionFailure`
or `MetricFailure` the individual check returns. `themeTextTierFailures` is the
seventh check: `textTiers` is `[dimmer, brighter]` for `mutedForeground` below
```

and change the `themeDirectionFailures` sentence at line 330 from “is the
sixth:” to “is the eighth:”.

The README is read with whitespace collapsed by `readme.test.ts`, so the line
breaks above are not significant; do not add a second order statement.

### 3.2 `docs/design-system.md` — §11

Replace the composition sentence (lines 959-962) with:

```md
Verify an edited theme with `themeFailures(theme)`: it composes every check in
`themeChecks`, checks contrast at the level the theme declares, and tags every
entry with the `kind` that found it. An empty array is the library's guarantee,
```

Replace the “Each part is available on its own” list (lines 968-972) with the
complete list, in `themeChecks` order:

```md
available on its own — `themeColorFailures`, `themeOpacityFailures`,
`themeTypefaceFailures`,
`themeContrastFailures`, `themeHighlightFailures`, `themeNativeTextFailures`,
`themeTextTierFailures`, `themeDirectionFailures` and `themeMetricFailures` — but
```

Keep the surrounding “Each part is” / “a consumer that runs only one” prose.

### 3.3 `packages/tokens/src/readme.test.ts`

1. Add `type ThemeFailureKind` to the `theme-check.js` import.
2. After the `sentenceList` helper, add the two complete maps:

```ts
/** The failure type each check returns, keyed by the kind that tags it. */
const failureTypes = {
  color: "ColorFailure",
  opacity: "OpacityFailure",
  typeface: "TypefaceFailure",
  contrast: "ContrastFailure",
  highlight: "HighlightFailure",
  nativeText: "NativeTextFailure",
  hierarchy: "TextTierFailure",
  direction: "DirectionFailure",
  metric: "MetricFailure",
} as const satisfies Record<ThemeFailureKind, string>;

/** The individual check function each kind belongs to. */
const checkFunctions = {
  color: "themeColorFailures",
  opacity: "themeOpacityFailures",
  typeface: "themeTypefaceFailures",
  contrast: "themeContrastFailures",
  highlight: "themeHighlightFailures",
  nativeText: "themeNativeTextFailures",
  hierarchy: "themeTextTierFailures",
  direction: "themeDirectionFailures",
  metric: "themeMetricFailures",
} as const satisfies Record<ThemeFailureKind, string>;

const ordinals = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
] as const;
```

3. Add three cases after “states the number of checks from the index”:

```ts
it("states the diagnostic order from the index", () => {
  expect(readme).toContain(
    `The order is diagnostic — ${sentenceList(
      themeChecks.map((kind) => `\`${kind}\``),
    )} — and \`themeChecks\` is that order as a list`,
  );
});

it("states the payload type of every check", () => {
  const types = themeChecks.map((kind) => `\`${failureTypes[kind]}\``);
  expect(readme).toContain(
    `The payload is the same ${types.slice(0, -1).join(", ")} or ${types.at(-1)} the individual check returns`,
  );
});

it("states each check's ordinal from the index", () => {
  const claims = [
    ...readme.matchAll(/`(theme[A-Za-z]+Failures)` is the ([a-z]+) check/g),
  ];
  expect(claims.length).toBeGreaterThan(0);
  claims.forEach(([, fn, word]) => {
    const kind = themeChecks.find(
      (candidate) => checkFunctions[candidate] === fn,
    );
    expect(kind, fn).toBeDefined();
    if (kind !== undefined) {
      expect(word, fn).toBe(ordinals[themeChecks.indexOf(kind)]);
    }
  });
});
```

### 3.4 `packages/tokens/src/docs.test.ts`

1. Move the `checkNames` map currently inside the case “states the size of the
   guarantee in both documents” to module scope, after `readmeSource`, renamed
   `checkWords`, and add the function map:

```ts
const checkWords = {
  color: "colour format",
  opacity: "role opacity",
  typeface: "typeface form",
  contrast: "contrast",
  highlight: "find highlight",
  nativeText: "native text fades",
  hierarchy: "text hierarchy",
  direction: "interaction direction",
  metric: "numeric metrics",
} as const satisfies Record<ThemeFailureKind, string>;

const checkFunctions = {
  color: "themeColorFailures",
  opacity: "themeOpacityFailures",
  typeface: "themeTypefaceFailures",
  contrast: "themeContrastFailures",
  highlight: "themeHighlightFailures",
  nativeText: "themeNativeTextFailures",
  hierarchy: "themeTextTierFailures",
  direction: "themeDirectionFailures",
  metric: "themeMetricFailures",
} as const satisfies Record<ThemeFailureKind, string>;
```

Update the existing “states the size of the guarantee” case to read
`checkWords` (no behaviour change).

2. Add a case to the same `describe`:

```ts
it("states the composed checks and their parts from the index", () => {
  expect(designSystem).toContain("it composes every check in `themeChecks`");
  const parts = themeChecks.map((kind) => `\`${checkFunctions[kind]}\``);
  expect(designSystem).toContain(
    `Each part is available on its own — ${parts.slice(0, -1).join(", ")} and ${parts.at(-1)} — but a consumer that runs only one has not run the guarantee`,
  );
});
```

3. Add a case after “states the guarantee's size only from the index”:

```ts
it("states the diagnostic order from the index", () => {
  const section =
    /The order is diagnostic:(.*?)`themeChecks` is that order as a list/.exec(
      markdownProse,
    )?.[1] ?? "";
  const isKind = (value: string): value is ThemeFailureKind =>
    themeChecks.some((kind) => kind === value);
  const kinds = [...section.matchAll(/`([A-Za-z]+)`/g)].flatMap(([, kind]) =>
    kind !== undefined && isKind(kind) ? [kind] : [],
  );
  expect(kinds).toEqual([...themeChecks]);
});
```

### 3.5 `packages/tokens/src/inventory.test.ts`

1. Import `themeChecks` and `type ThemeFailureKind` from `./theme-check.js`.
2. Add the same `checkFunctions` map at module scope (after the `floorRow`
   helper).
3. Add a case after “states the checks from the index, never a subset” (keep
the existing case's `themeChecks`/`ThemeFailureKind` assertions):

```ts
it("states the checks and the diagnostic order from the index", () => {
  const total = row("Total theme check");
  themeChecks.forEach((kind) => {
    expect(total, kind).toContain(`\`${checkFunctions[kind]}\``);
  });
  const order = themeChecks.map((kind) => `\`${kind}\``).join(", then ");
  expect(total).toContain(
    `in diagnostic order — ${order} — tagging each entry with its \`kind\``,
  );
});
```

Keep the existing case's `themeChecks`/`ThemeFailureKind` assertions.

### 3.6 `COMPONENTS.md`

Append to the **Total theme check** row, after the sentence naming the nine
functions:

> `inventory.test.ts` holds this row's nine names and order to `themeChecks`
> (plan 602).

No status change: the row is already `done`.

### 3.7 `TODO.md`

Before implementation, add the claimed row at the end of the tokens bullets:

```md
`[~]` Hold every document that retypes the diagnostic order to `themeChecks` —
the README named seven of the nine checks and called `themeTextTierFailures`
“the fifth” and `themeDirectionFailures` “the sixth” after plans 573 and 583
inserted `highlight` and `nativeText`, its payload list omitted
`HighlightFailure` and `NativeTextFailure`, and the design system omitted both
checks and `themeNativeTextFailures`, while only the count was guarded (plan
602)
```

Advance the progress bar from 248/322 to 248/323 (one new task, still in
progress). On completion change `[~]` to `[x]` and the bar to 249/323.

### 3.8 `.agents/slop/plans/README.md`

Add to the `tokens-theme` table:

```md
| [602](./602-diagnostic-order-truth.md) | The diagnostic order the documents retype | F | 383, 398, 540, 573, 583 | planned |
```

Change the status to `done` after the gates pass.

## 4. Commands

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the tokens suite is still 155 files and grows by six cases (three in
`readme.test.ts`, two in `docs.test.ts` and one in `inventory.test.ts`). All
gates exit 0. No shipped value moves.

Two-direction proof, run by hand (the repo's `scripts/verify-two-directions.sh`
is a cross-team item):

1. Restore the old README order sentence (`... contrast, hierarchy, direction,
   then metric ...`): the `readme.test.ts` order case fails.
2. Restore “`themeTextTierFailures` is the fifth check”: the ordinal case fails.
3. Remove `themeNativeTextFailures` from the design-system list: the
   `docs.test.ts` parts case fails.
4. Remove `\`nativeText\`` from the `docs/tokens.md` order sentence: the order
   case fails.
5. Remove `themeHighlightFailures` from the ledger row: the ledger case fails.
6. Restore each: every case passes.

## 5. STOP conditions

Stop and report, do not improvise, if any of these is true:

- `themeChecks` is not the nine members listed in §1 on this tree; re-read
  `packages/tokens/src/theme-check.ts` and re-plan the words.
- a document already contains a second order or ordinal claim not named in §3;
  list it and stop instead of deleting it silently.
- a shipped theme fails `themeFailures` after the change (this plan changes no
  token, so any failure is unrelated and must be reported).
- the tokens suite fails for a reason unrelated to the new cases.
- a guard fails on a sentence not listed in §3.

## 6. Acceptance

- The README's order sentence, payload list and two ordinals are derived from
  `themeChecks`, and a case fails when any of them drifts.
- `docs/design-system.md` says it composes every check in `themeChecks` and
  names all nine individual checks; a case derives the list.
- `docs/tokens.md`'s order sequence and `COMPONENTS.md`'s order/function list
  are held to the same index.
- A tenth check added to `themeChecks` fails the type-check of every map until
  its word, function and payload are named, and then fails any document still
  listing the old set.
- `TODO.md` ticks the row and the plan index marks 602 `done`.
- `nub run check`, `nub run lint` and `nub run test` pass.
