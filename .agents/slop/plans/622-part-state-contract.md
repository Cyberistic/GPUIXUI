# 622 — The part-state contract states the real sources

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 413, 419, 431, 479, 482, 568, 601, 621

## 1. Why this plan exists

`/docs/component-api#state-aware-styles` tells a consumer how to style a part by
state. Its key sentence is:

> The state vocabulary is fixed — `active`, `checked`, `closed`, `disabled`,
> `focused`, `highlighted`, `invalid`, `open`, `orientation`, `selected` — and a
> part's type is named after the part: `TabsTriggerState`,
> `AccordionTriggerState`, `ComboboxItemState`.

Measured 2026-10-20 at `3fad1392` by parsing every exported `*State` interface
under `packages/components/src` (tests and `behaviour/` excluded):

| Claim | Measured |
| ----- | -------- |
| "the vocabulary is fixed" to ten fields | there are **25** exported state types and **27** distinct fields |
| the ten fields are the vocabulary | `checked`, `closed`, `invalid`, `orientation` and `selected` each appear in **one** type; `status` appears in two and is not listed |
| a part's type is *named after the part* | `ComboboxItemState` is not exported by this package — it is imported from `@gpuix/react/combobox` |
| the examples exist | `TabsTriggerState` and `AccordionTriggerState` exist; `InlineEditState.editing`, `MessageScrollerState.pinned`/`unread`, `StepperStepState.status` and `TimelineItemState.status` are unmentioned |

The state surface is real API metadata, and the current sentence misstates it in
three ways. A consumer styling `InlineEdit` by `editing` or `MessageScroller` by
`pinned` gets no hint that those fields exist, and a reader looking for
`ComboboxItemState` in this package will not find it.

## 2. The decision

1. **The page states the ownership rule, not a fixed list.** Fields belong to
   the part. Five (`active`, `disabled`, `focused`, `highlighted`, `open`)
   recur across parts; others are part-specific, with the real examples named
   alongside their types.
2. **A part may use the runtime's state type.** The sentence distinguishes our
   own `<Part>State` export from a headless runtime component's type, and names
   `ComboboxItemState` with its real import.
3. **A guard parses the package.** `src/lib/part-states.ts` extracts every
   exported `*State` interface and its fields from the component sources; the
   page test requires each named field to exist, each "recurring" field to
   appear in at least two types, each named type to exist in either the package
   or a component's `@gpuix/react` import, and the page never to return to the
   fixed-vocabulary claim.
4. **No generated table in this plan.** A full per-part state table is useful
   API metadata, but it needs a generated module, an index document and a
   search entry (D32). It is recorded as a follow-up in `TODO.md`; this plan
   fixes the false claim and proves the examples it keeps.

## 3. Files

### Create

| File | Responsibility |
| ---- | -------------- |
| `.agents/slop/plans/622-part-state-contract.md` | this plan |
| `apps/docs/src/lib/part-states.ts` | pure extraction of `*State` interfaces from component sources |
| `apps/docs/src/lib/part-states.test.ts` | the pure parser's fixtures |
| `apps/docs/src/part-states-page.test.ts` | the page against the real package |

### Change

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/component-api.mdx` | the `## State-aware styles` paragraph |
| `apps/docs/README.md` | one paragraph beside the input capabilities |
| `.agents/slop/plans/README.md` | this plan's row |
| `TODO.md` | the workstream task, the follow-up table task, progress fraction |

No package source change. Nothing outside `apps/docs/`, `TODO.md` and the plan
index is edited.

## 4. The paragraph

Replace the sentence at `component-api.mdx:100–104` with:

```mdx
The fields belong to the part; there is no single fixed vocabulary. `active`,
`disabled`, `focused`, `highlighted` and `open` recur across parts, while
`editing` belongs to the inline edit, `pinned` and `unread` to the message
scroller, and `status` to the stepper and timeline. A part's type is usually
named after the part (`TabsTriggerState`, `AccordionTriggerState`); a part built
on a headless runtime component uses that component's state type instead, such
as `ComboboxItemState` from `@gpuix/react/combobox`. Every token a style reads
comes from the active theme; see [Theming](/docs/theming).
```

The example above it (`TabsTrigger` reading `state.active`) stays.

## 5. The parser

`apps/docs/src/lib/part-states.ts`:

```ts
/** One exported `<Part>State` interface and the fields it declares. */
export interface PartState {
  readonly name: string;
  readonly file: string;
  readonly fields: ReadonlyArray<string>;
}

/** One source file offered to the parser. */
export interface StateSource {
  readonly path: string;
  readonly text: string;
}

const INTERFACE = /export interface (\w+State)\s*\{([^}]*)\}/g;
const FIELD = /readonly (\w+)\??:/g;

export const partStates = (
  sources: ReadonlyArray<StateSource>,
): ReadonlyArray<PartState> =>
  sources.flatMap((source) =>
    [...source.text.matchAll(INTERFACE)].flatMap((match) => {
      const [declaration, body] = [match[1], match[2]];
      if (declaration === undefined || body === undefined) return [];
      return [
        {
          name: declaration,
          file: source.path,
          fields: [...body.matchAll(FIELD)].flatMap((field) =>
            field[1] === undefined ? [] : [field[1]],
          ),
        },
      ];
    }),
  );
```

The parser is deliberately narrow: every state type in this package is a
top-level `export interface ... { readonly ... }` with no nested braces in its
fields. The fixture test proves a nested object field does not truncate the
parse, and a non-exported interface is ignored.

## 6. The guards

### 6.1 `src/lib/part-states.test.ts`

1. Parses a two-interface fixture and keeps declaration order and fields.
2. Ignores a non-exported `interface` and a `type` alias.
3. A fixture with a nested object field (`readonly size: { width: number }`)
   parses the fields before the nested brace and does not invent others — the
   test pins the current contract, so a future nested state fails visibly rather
   than silently.

### 6.2 `src/part-states-page.test.ts`

Read the **real** component sources (walk `packages/components/src`, skip
`*.test.*` and `behaviour/`), then assert:

1. `partStates(sources).length` is at least 20 (measured 25) — a parser that
   stops matching fails by count, not silently.
2. Every field named in the paragraph (`active`, `disabled`, `focused`,
   `highlighted`, `open`, `editing`, `pinned`, `unread`, `status`) exists in some
   state, and each recurring field appears in at least two types.
3. `editing` → `InlineEditState`, `pinned`/`unread` → `MessageScrollerState`,
   `status` → `StepperStepState` and `TimelineItemState` — the exact pairing the
   paragraph states.
4. Every `*State` token named on the page resolves: either it is an exported
   interface from the package, or the component sources import it from
   `@gpuix/react` (`ComboboxItemState`).
5. The page does not contain `vocabulary is fixed`.

### 6.3 Search

No alias is needed: the paragraph contains `editing`, `pinned`, `unread`,
`status` and `ComboboxItemState`, so the page is already a lexical candidate for
those terms. The full state table follow-up is where promotion belongs.

## 7. Commands and expected results

From `apps/docs`:

```sh
nub exec vitest run src/lib/part-states.test.ts src/part-states-page.test.ts
# pre-fix: the fixed-vocabulary sentence and the missing fields fail; post-fix: pass
```

From the workspace root:

```sh
nub run --filter docs test          # exit 0 — 131 files / 1 359 tests
nub run --filter docs check-types   # exit 0
nub run --filter docs smoke:build   # exit 0 — 107 pages, 235 links, 1 382 anchors
nub run check                       # exit 0
nub run lint                        # exit 0
```

The page is prose; the scoped axe sweep was run over it:
`nub scripts/smoke-a11y.ts --no-build --only /docs/component-api` reported
`1 pages × 2 schemes, 0 violations` and exit `0`.

## 8. Two-direction proofs

The forced defects were run on 2026-10-20; #4 is the permanent parser case.

1. **The old claim fails.** Replacing `there is no single fixed vocabulary` with
   `vocabulary is fixed` failed
   `does not return to claiming one fixed vocabulary`; restored.
2. **A dropped example fails.** Removing `` `pinned` `` from the paragraph failed
   `names part-specific fields and the types that declare them` with
   `+ "pinned"`; restored.
3. **A renamed type fails.** Renaming `` `InlineEditState` `` to
   `` `InlineEditStateX` `` in the paragraph failed the same test with
   `+ "InlineEditState"`; restored.
4. **The parser ignores what it should.** The fixture with a non-exported
   `InternalState` and a `type` alias parses to `[]` (permanent unit case).
5. **A type that resolves nowhere fails.** Replacing `ComboboxItemState` with
   `ComboboxState` failed `resolves every state type the section names` with
   `+ "ComboboxState"`; restored.

One correction found while forcing #3: the first version resolved only
backticked tokens ending in `State`, so a renamed type written as
`InlineEditStateX` escaped the scan. The test now also requires every type in
the `PAIRS` table to appear by name in the section, which is what #3 exercises.

## 9. STOP conditions

- Stop if the component sources stop declaring top-level `*State` interfaces;
  the parser's contract changed. Report the shape and adapt §5 rather than
  widening the regex until it passes.
- Stop if `ComboboxItemState` moves into this package: the paragraph's second
  half changes, not just the guard.
- Do not add a generated per-part table here; record it in `TODO.md` instead
  (needs a generated module, an index document and a search entry).
- Stop if `smoke:build` exits `2`.

## 10. Acceptance

- `/docs/component-api` no longer claims a fixed state vocabulary and names the
  real ownership rule, five recurring fields and the part-specific examples with
  their types.
- The parser and page guard fail when a field, pairing or type import stops
  being true.
- `nub run --filter docs test`, `check-types`, `smoke:build`, `nub run check`
  and `nub run lint` pass; counts and proofs are recorded in §8.
