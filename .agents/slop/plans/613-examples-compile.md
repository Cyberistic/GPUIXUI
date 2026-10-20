# 613 — Component examples compile: every fenced example is a standalone module

**Phase:** F (docs truth and example quality)
**Workstream:** docs-site (`apps/docs`, `docs/preview-strategy.md`, the
component-page template)
**Depends on:** 410, 411, 414, 422, 466, 487, 577, 611
**Status:** implemented (2026-10-20) — 74 fences now compile; the guard found 81
diagnostics after the eight structural fixes, and the prototype measured 47
failing examples / 133 diagnostics on the shipped tree. Four two-direction
proofs recorded in §8.

## 1. The measured defect

Every component page shows a fenced `tsx` example. The template calls it a
"usage example" and plan 577 made its `@gpuixui/*` imports resolve, but nothing
checks that the example is a **module that compiles**. A reader who copies one
can get `Cannot find name`, a prop the component does not accept, or a JSX tree
the runtime types reject.

Measured on 2026-10-20 at `cd7ecac7`, by extracting every `ts`/`tsx` fence from
`content/docs/components/*.mdx` and compiling each one as its own module with
the app's real compiler options (`jsxImportSource: "@gpuix/react"`, strict):

| Fact | Measurement |
| ---- | ----------- |
| component pages | 66 |
| fenced `ts`/`tsx` examples | 73 |
| examples that fail to compile | **47** |
| TypeScript diagnostics | **133** |

Most failures are missing context: `saving`, `setEmail`, `copies`, `go`,
`setOpen` are used as if the page had declared them. Several are worse — the
example names an API the component does not have:

| Page | Example today | The real component |
| ---- | ------------- | ------------------ |
| `alert.mdx` | `<Alert title="…">text</Alert>` | `AlertProps` has no `title`; children are `PartChildren`, so the body is `AlertContent`/`AlertTitle`/`AlertDescription` and dismissal is `AlertDismiss` |
| `combobox.mdx` | `<Combobox label="Assign reviewer" …>` | `ComboboxProps` has no `label`; the field is `ComboboxTrigger` and the popup is the declared parts |
| `date-picker.mdx` | `<DatePicker label="Due date" …>` | `DatePickerProps` has no `label`; the field is `DatePickerTrigger` |
| `form.mdx` | `Schema.Struct(...)` | `Schema` is never imported; `saving`/`save`/`email`/`name` are never declared |
| `collapsible.mdx` | `<Option label=… value=… />` | `Option` is not imported or defined (and `Option` shadows the DOM interface) |

The other 26 examples pass today. The bar must be uniform: an example a reader
can copy is a module, and a module compiles.

**Why this is not a style rule.** MISSION.md requires "accurate examples and API
info" and "copyable readable implementations". A snippet that cannot compile is
neither. Plan 577's header names the same defect class one level up (a module
that does not resolve); this plan closes the level below it.

## 2. What to build

### 2.1 `apps/docs/src/lib/example-snippets.ts` (new)

Pure extraction, no TypeScript import, so it can be unit-tested and reused:

```ts
export interface ExampleSnippet {
  /** Page slug, e.g. `button`. */
  readonly page: string;
  /** 1-based fence ordinal on the page. */
  readonly index: number;
  readonly lang: "ts" | "tsx";
  /** 1-based line of the opening fence in the MDX file. */
  readonly line: number;
  /** The fence body, verbatim. */
  readonly code: string;
}

/** Every `ts`/`tsx` fence in a page, in document order. */
export const fencedExamples: (
  page: string,
  markdown: string,
) => ReadonlyArray<ExampleSnippet>;
```

Rules:

- only fenced blocks count; prose and inline code are ignored;
- `sh`, `bash`, `json`, `md` fences are skipped;
- an unclosed fence is a failure, not a silently dropped example — return a
  snippet whose body runs to the end so the compiler names it;
- the body keeps its own newlines and indentation, so a diagnostic line maps
  back to the MDX line.

### 2.2 `apps/docs/src/example-snippets.test.ts` (new)

Three groups:

1. **Extractor fixtures** — two fences with different languages yield one
   snippet with the right page/index/line; an inline backtick is not a fence.
2. **Compile every component example** — walk
   `content/docs/components/*.mdx`, extract, and type-check every snippet with
   the TypeScript compiler API:
   - virtual root file `apps/docs/.examples/<page>-<index>.tsx` (or `.ts`);
   - options from `apps/docs/tsconfig.json`, overridden with
     `jsx: "react-jsx"`, `jsxImportSource: "@gpuix/react"`,
     `noUnusedLocals: false`, `noUnusedParameters: false`, `noEmit: true`;
   - a `CompilerHost` that serves the virtual files from memory and delegates
     everything else (module resolution, `node_modules`, the package sources)
     to `ts.sys`, with `getCurrentDirectory()` = `apps/docs`;
   - `ts.getPreEmitDiagnostics(program)` formatted with
     `ts.formatDiagnosticsWithColorAndContext` or
     `ts.flattenDiagnosticMessageText`, mapped back to
     `<page>.mdx:<line>`;
   - assert the list is empty. The failure message names the page, fence,
     MDX line and the TS code, so the fix is actionable.
3. **Module-ness** — every snippet must contain at least one module-level
   `import`/`export`. A fence without one is a script whose names leak across
   examples and whose example cannot stand alone.

The program is built once per test file. Measured prototype cost: about
5 seconds for 73 fences on this host.

**Do not compile other pages' fences.** Prose pages may show a deliberate
fragment; the contract is the component-page template.

### 2.3 Fix the examples (47 fences)

The rule for the rewrite:

- **Import every symbol the example uses**, including `useState` from `react`
  when it needs a local value.
- **Make it a component when it owns state**, e.g.
  `export function NotificationChannels() { const [email, setEmail] = useState(true); return (<Checkbox … />); }`.
  A hook at module top level is not runnable, so do not use it.
- A stateless example keeps the top-level JSX expression, but declares the
  callbacks it references (`const save = () => { /* persist */ };`).
- **Fix the API, not the type.** Where the snippet is wrong, use the real parts
  and props (Alert, Combobox, DatePicker, Form, Collapsible). Do not widen a
  component's props to make a doc pass.
- Keep the pin-name, comments and illustrative text. Do not add a second
  example where one suffices.
- Update the prose only when it states the same wrong API (e.g. the Alert page
  must describe the parts it now shows).

The worklist from the measured run (page → failures): alert, breadcrumb,
button (2nd fence), carousel, checkbox (both), collapsible, color-picker,
combobox, command-menu, confirm-dialog, context-menu, date-picker,
dropdown-menu (both), empty-state, fieldset, form, hotkey-input, inline-edit,
inline-validation, label, mention-input, message-scroller, navigation-menu,
number-field, otp-field, pagination, popover, radio-group, range-slider,
rating, scroll-area, search-input, select, separator (2nd), skeleton (2nd),
slider, switch, tag-input, text-area, text-input, time-picker, toast (both),
toggle, tooltip.

Re-run the test after each batch; the diagnostics are the worklist and they
shrink.

### 2.4 The template says so

- `content/docs/component-pages.mdx`: add the rule to the "what a page owes"
  table/paragraphs — every fenced example on a component page is a standalone,
  type-checked module, and the guard names the page.
- `apps/docs/README.md`, "Adding a component page": one sentence plus the
  command (`nub run --filter docs test -- example-snippets`).
- No change to `docs/preview-strategy.md`: the preview tiers are unaffected.

## 3. Order of work

1. Write `src/lib/example-snippets.ts` and its fixture tests; run
   `cd apps/docs && nub exec vitest run src/example-snippets.test.ts` — the
   fixture group passes.
2. Write the compile test with the real walk. Run it. **Record the failing
   count (expected 47 fences / 133 diagnostics) as the two-direction proof that
   the guard sees the shipped defect.**
3. Fix the fences in batches (tier 1 value/choice first, then overlays and
   compounds, then the rest). Re-run after each batch.
4. Fix the wrong APIs (Alert, Combobox, DatePicker, Form, Collapsible) and any
   prose that repeats them.
5. Add the rule to the template page and README.
6. Run the scoped gates in §4, then the full docs suite and the production
   build.

## 4. Commands and expected results

```sh
cd apps/docs && nub exec vitest run src/example-snippets.test.ts
# step 2: fails with 47 examples / 133 diagnostics, naming every page
# step 3+: passes, exit 0

cd apps/docs && nub run check-types
# exit 0

nub run --filter docs test
# exit 0, all existing suites plus the new one

nub run check
# exit 0 (test-quality, lint, format, every workspace type-check)

nub run --filter docs build
# exit 0; then:
nub run --filter docs smoke:build
# exit 0, every sitemap page, both discovery documents, search
```

`smoke:build` is the end-of-task check for this cross-cutting content change.
No live/native scenario is affected; the docs test suite is the runtime here.
If a page's *rendered* output changes (Alert/Combobox/DatePicker source blocks
are includes, not fences), the crawl still proves the page.

## 5. Test plan

The new suite must be able to fail:

1. **A missing import.** Remove `Button` from the Buttons example import list.
   Expected: one diagnostic naming `button.mdx` and `TS2304 Cannot find name
   'Button'`.
2. **A wrong prop.** Change the Badge example to `variant="nope"`.
   Expected: `TS2322` naming `badge.mdx`, because `BadgeVariant` is a literal
   union.
3. **A fragment.** Delete the imports from the Separator example.
   Expected: both the module-ness assertion and `TS2304`.
4. **Two roots.** Split a fence into two sibling JSX expressions with no
   wrapper. Expected: `TS2657 JSX expressions must have one parent element`.
5. **The real defect is visible before the fix.** Record step 2's measured
   output in the plan's status line; the guard must fail on the shipped tree
   before any page changes.

Each proof is run by editing the page, running the single test file, and
reverting. Record the exact output in the final report / plan status.

## 6. STOP conditions

Stop and report instead of improvising if:

- the TypeScript compiler API cannot resolve `@gpuixui/*` from a virtual file
  after 30 minutes of work (fall back to a generated `tsconfig` + spawned `tsc`,
  and record why);
- more than 5 fences need a component API change rather than a snippet fix
  (that is a cross-team task; record it in `TODO.md`, do not edit packages);
- a page's prose becomes false after the snippet fix and the correct wording is
  not derivable from the component source (record `// TODO:` and stop).
- the full docs suite exceeds 90 seconds because of the new program (move the
  compile check to a `check:examples` script wired into Contributing, and say
  so in the plan status).

## 7. Acceptance criteria

- Every `ts`/`tsx` fence on every component page is a standalone module.
- The new suite fails on each of the five proofs in §5 and passes on the fixed
  tree.
- The four wrong-API pages now show the component's real parts and props.
- The template page and README state the rule.
- `nub run --filter docs test`, `nub run check-types`, `nub run check`,
  `nub run --filter docs build` and `smoke:build` are green.
- `TODO.md` records the plan and its status; `.agents/slop/plans/README.md`
  indexes it; the branch is committed and pushed.

## 8. Result (2026-10-20)

**The guard.** `src/lib/example-snippets.ts` extracts the fences;
`src/example-snippets.test.ts` writes them to `apps/docs/.cache/example-snippets`
(gitignored) and runs the repository's own `tsc` over the generated project with
`jsxImportSource: "@gpuix/react"`, then maps each diagnostic back to the MDX
line. The suite also rejects a fence with no module-level import/export.

**Measured.** 67 component pages, **74 fenced examples** (the Toast page gained
one when its provider and push examples were split). The prototype over the
shipped tree measured 47 failing examples / 133 diagnostics. The guard's first
run surfaced 4 syntax errors and 7 fragments; TypeScript suppresses semantic
diagnostics while a syntax error exists, so fixing those exposed **81
diagnostics across 40 fences**. All 74 compile now.

**The real API defects it found and fixed:**

- `Alert` usage named `title` and `onDismiss`, which `AlertProps` does not have;
  it now composes `AlertContent`/`AlertTitle`/`AlertDescription`/`AlertDismiss`,
  and the page's Sizes/States/Keyboard prose matches.
- `Combobox` usage named `label`; it now composes `ComboboxTrigger`,
  `ComboboxContent`, `ComboboxInput`, `ComboboxList` and `ComboboxEmpty`.
- `DatePicker` usage named `label`; it now composes `DatePickerTrigger`,
  `DatePickerContent` and `DatePickerCalendar`.
- `Collapsible` used an undefined `<Option>`; it now nests a real `Input`.
- `Form` used `Schema` without importing it and referenced undeclared state; it
  is now a complete `SignupForm` component.
- Every stateful snippet declares its state inside a named component, so a
  copied example is runnable rather than a fragment leaning on page context.

**Two-direction proofs (each edit reverted after the run):**

| Proof | Edit | Guard output |
| ----- | ---- | ------------ |
| missing import | removed `import { Button }` from the second Buttons fence | `button.mdx:38` is both a non-module and `TS2304 Cannot find name 'Button'` |
| wrong prop | `variant="nope"` on Badge | `badge.mdx:21 (fence 1) TS2322: '"nope"' is not assignable to 'BadgeVariant \| undefined'` |
| fragment | removed the Separator import | `separator.mdx:30` in the module list and `TS2304 Cannot find name 'Separator'` |
| two roots | unwrapped the Label fragment | `label.mdx:24 (fence 1) TS2657: JSX expressions must have one parent element` |

**Gates.** `nub run check` green; `nub run test` green (docs: 124 files / 1 183
tests); `nub run --filter docs build` and `smoke:build` exit `0` over the
105-page built site. `nub run --filter docs test` also keeps the existing
content, search and template guards green.

**The rule is published.** `/docs/component-pages` gained `## The examples`, its
guard table names `src/example-snippets.test.ts`, and `apps/docs/README.md`'s
"Adding a component page" says a fenced example is a standalone module checked
by `nub run --filter docs test -- example-snippets`.
