# 804 — A description's sentence join never doubles a stop

**Owner:** components workstream · **Phase:** F (Tier 2/5 hardening) ·
**Depends on:** 110, 117, 516, 626, 788

**Numbering:** `800` went to tokens-theme, `801` to the playground
(`801-scroll-affordance`), `802` is this workstream's message-row plan and `803`
to tokens-theme (`803-palette-rationale-figures`), so `804` is the first number
free across `main` and every worktree on 2026-10-20. Recorded in `PLAN.md` D30.

## 1. Why

`internal/state-description.ts` builds every derived `aria-description` by
joining its parts with `". "`:

```ts
const joined = (...authored) => … ({ "aria-description": Arr.join(parts, ". ") });
```

A caller's description is prose and often already ends its sentence. Measured on
2026-10-20 in this worktree against the installed 0.10.0 binding, the shipped
`field` example's only text field is announced as:

```
textinput name="Workspace URL" desc="Lowercase words joined by hyphens, e.g. design-system.. Required"
```

— a doubled stop. The defect has **two** sources, both in this package:

1. `internal/state-description.ts` joins its parts with `Arr.join(parts, ". ")`,
   which is what feeds `Disabled` (plan 516) and
   `Complete`/`Current`/`Upcoming` (plan 626);
2. `field.tsx` builds its own required sentence with a raw template —
   `` `${text}. Required` `` — before handing it to that helper, so the field
   example doubles the stop even when the helper is correct. Measured: the
   probe above printed `"… e.g. design-system.. Required"` **after** the helper
   was fixed and before `field.tsx` was.

A blind "strip trailing periods" fix would corrupt abbreviations: the same
example description contains `e.g.` mid-sentence, and a description ending
`"(see docs p. 4.)"` must keep its content. The join therefore has to look at
the **last character of the accumulated text**, not rewrite the part.

Scope of this plan:

- export one `sentenceJoin(parts)` from `state-description.ts`: a part is
  appended with `" "` when the text so far already ends in `.`, `!` or `?`, and
  with `". "` otherwise; `joined` and `FieldInput` both use it;
- three pure cases (the doubled stop, an abbreviation kept intact, a `?`/`!`
  ending) and one native `Field` case that reads the announced description;
- `docs/component-api.md` states the rule; `docs/field.mdx` and the
  `COMPONENTS.md` row take the new native count;
- plan index, `TODO.md` and `PLAN.md` D30 synced.

**Out of scope** (do not add): changing any component's description text, adding
a description prop anywhere, a punctuation-cleaning pass over caller prose, or a
localisation layer.

## 2. What exists today (read these first)

- `packages/components/src/internal/state-description.ts` — `joined(...)` maps
  the parts through trim/non-empty, dedupes, and `Arr.join(parts, ". ")`;
  `stateDescription(disabled, ...authored)` and
  `statusDescription(status, authored?)` are its two public callers.
- `packages/components/src/field.tsx` lines 230–234 — `FieldInput` builds
  `description` from the field's error/description and appends `Required` with a
  raw template (`${text}. Required`).
- `packages/components/src/internal/state-description.test.ts` — 6 cases,
  including `"joins several descriptions once, without repeating the state"`
  (`"Enter a valid email. Required. Disabled"`) and the `"Disabled"` dedupe.
- `packages/components/src/behaviour/field.test.tsx` — 12 native cases; the
  header comment lists the bugs guarded, `nodesWithRole` is imported, and
  `Form` (lines 24–45) wraps a `Field` with a `description`.
- `packages/components/docs/field.mdx` line 144 — `(12 tests)`.
- `COMPONENTS.md` line 197 — the `Inline validation` row states
  `12 native behaviour tests`.
- `docs/component-api.md` lines 199–210 — the disabled/required/derived-status
  description contract.

## 3. Exact changes

### 3.1 `packages/components/src/internal/state-description.ts`

1. Turn the private sentence fold into an exported helper:

   ```ts
   /**
    * Join description parts as sentences: a part that already ends in `.`, `!`
    * or `?` keeps its stop, so appending a state never reads `..` (plan 804).
    */
   export const sentenceJoin = (parts: ReadonlyArray<string>): string =>
     Arr.reduce(parts, "", (text, part) =>
       Str.isEmpty(text)
         ? part
         : endsSentence(text)
           ? `${text} ${part}`
           : `${text}. ${part}`,
     );
   ```

   `Arr.reduce`'s data-first signature is `Arr.reduce(self, initial, f)` —
   verified in the installed `node_modules/effect/dist/Array.d.ts` (line 7735).

2. Use `sentenceJoin(parts)` in `joined`'s `onNonEmpty` branch.

3. Extend the module JSDoc: a part that already ends a sentence keeps its stop,
   so appending `Required` cannot produce `..`, and `e.g.` inside a part is
   never rewritten.

### 3.2 `packages/components/src/field.tsx`

Replace the raw required join (lines 230–234) with the shared rule:

```ts
const message = field?.error ?? field?.description;
const description = Option.match(Option.fromNullishOr(message), {
  onNone: () => (field?.required === true ? "Required" : undefined),
  onSome: (text) =>
    field?.required === true ? sentenceJoin([text, "Required"]) : text,
});
```

and import `sentenceJoin` beside `stateDescription`.

### 3.3 `packages/components/src/internal/state-description.test.ts`

Add three cases (keep the existing six unchanged):

1. **No doubled stop.** `stateDescription(true, "Use a slug, e.g. design-system.",
   "Required")` → `"Use a slug, e.g. design-system. Required. Disabled"`.
   Fails at `HEAD` with `"design-system.. Required. Disabled"`.
2. **A question or exclamation closes its own sentence.** `stateDescription(true,
   "Delete this file?", "Required")` → `"Delete this file? Required. Disabled"`,
   and `stateDescription(false, "Saved!")` → `{ "aria-description": "Saved!" }`.
   Fails at `HEAD` with `"? . Required"` / `"! . …"` forms.
3. **The status path keeps the caller's sentence.** `statusDescription("complete",
   "Shipped at 09:41.")` → `"Shipped at 09:41. Complete"`. Fails at `HEAD` with a
   doubled stop.

### 3.4 `packages/components/src/behaviour/field.test.tsx`

- Extend the header comment: a required field whose description already ended a
  sentence announced `"… design-system.. Required"`, because `FieldInput` built
  the required sentence with its own template.
- Add one case: a `Field` with `description="Use a slug, e.g. design-system."`
  and `required` announces the input's `aria-description` as
  `"Use a slug, e.g. design-system. Required"`, read from the input's
  `customProps` (the suite's existing idiom for an `aria-description`). Fails at
  `HEAD`.
- That makes `field.test.tsx` 13 cases; sync `docs/field.mdx` (`(12 tests)` →
  `(13 tests)`, add the sentence to its verification prose) and the
  `COMPONENTS.md` `Inline validation` row (`12 native behaviour tests` →
  `13 native behaviour tests`).

### 3.5 `docs/component-api.md`

After the "**A disabled part says so.**" paragraph, add:

> The join is sentence-aware: when the caller's text already ends in `.`, `!` or
> `?`, the derived word is appended with a single space, so a description never
> reads `..` (plan `804`).

### 3.6 Index and tracking

- Add the row to `.agents/slop/plans/README.md` under the components table.
- Add the measured line under "Tier 2 hardening after the inventory closed" in
  `TODO.md` and tick it.
- Append `804` to the overflow sentence in `PLAN.md` D30.

## 4. Test plan

Run from `packages/components`:

```sh
nub x vitest run src/internal/state-description.test.ts
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/field.test.tsx
```

Expected **before** the source change: the three pure cases fail
(**3 failed | 6 passed (9)**) and the new field case fails
(**1 failed | 12 passed (13)**).

Expected after: **9 passed (9)** pure, **13 passed (13)** native.

**Both directions** (one at a time, reverting each):

1. Revert `joined` to `Arr.join(parts, ". ")` → the same three pure cases fail;
   restore.
2. Use `endsSentence = Str.endsWith(".")` only → the `?`/`!` case fails; restore.
3. Strip trailing stops from each part instead of inspecting the join → the
   `e.g.` abbreviation case fails; restore.
4. Restore the raw `${text}. Required` template in `field.tsx` → the field case
   fails with the doubled stop; restore.

Then the gates:

```sh
nub run test
nub run check
nub run lint
```

All exit 0. The `field` example's description is read in the real renderer by the
new case: `"Use a slug, e.g. design-system. Required"`; the shipped example's own
description (`"… e.g. design-system."`) is the same shape.

No playground smoke scenario reads an `aria-description`, so the native
`TestRenderer` read is the evidence and no live window is opened.

## 5. STOP conditions

- The first new case passes at `HEAD`: stop and re-measure; the example may have
  changed its description.
- `Arr.reduce`'s argument order differs from §3.1: stop and read the installed
  `effect/Array` source rather than guessing.
- The field case passes while the pure cases fail: stop; the field's template is
  the second source of the defect and must be fixed too.
- A component's visible text changes: stop; only the accessible description may
  change.
- Any existing state-description case changes state: stop and report which.

## 6. Acceptance

- A description part that already ends a sentence is appended with one space,
  never `. `; a `?` or `!` ending behaves the same; `e.g.` is untouched.
- `FieldInput` uses the same rule, so a required field whose description ends a
  sentence announces `"… design-system. Required"`.
- `state-description.test.ts` is **9/9 measured on this host** (three cases fail
  without the source change) and `field.test.tsx` is **13/13** (its new case
  fails without the field change).
- `docs/component-api.md`, `docs/field.mdx`, `COMPONENTS.md`, the plan index,
  `TODO.md` and `PLAN.md` D30 agree.
