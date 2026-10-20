# 783 — A `Text` run can keep the end of a long value

| Field | Value |
| ----- | ----- |
| Phase | F — Tier 1 typography reaches the runtime's whole truncation contract |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Text row in `COMPONENTS.md`) |
| Depends on | `030` (Text), `047` (docs + examples), `059` (text semantics), `082` (clamp), `097` (style wins last), `365` (a style value the runtime does not implement), `368` (label containment), `383` (row containment), `385` (measured pointer/capture evidence) |
| Status | done — 2 offline cases + 2 runtime cases (a four-frame capture comparison and one-line containment) + the example assertion, both directions measured (§6) |

## 0. The defect, in one sentence

The published runtime's `textOverflow` has **two** values — `"ellipsis"` (clip the
tail) and `"ellipsis-start"` (keep the tail, clip the beginning) — but `Text`
exposes only `truncate?: boolean`, which always sends `"ellipsis"`, so a value
whose meaning lives at its **end** (a file path, a package specifier, a long
identifier) can only be shown with its identifying part hidden; the page offers
no way to keep it and never mentions the missing half.

## 1. Measured evidence (2026-10-20)

**The capability exists in the pinned runtime.** `@gpuix/native@0.10.0`'s
`dist/host.d.ts` `StyleDesc` declares:

```ts
textOverflow?: "ellipsis" | "ellipsis-start";
```

A repo-wide search finds **no** use of `ellipsis-start` in `packages/primitives`
or `packages/icons`; `src/core/style.ts` has two `"ellipsis"` sites (the `Text`
resolver at line 373 and `controlLabelStyle` for fixed-height labels).

**The runtime paints the two values differently.** A throwaway probe (deleted
after measuring) rendered one 180 px row containing a 68-character path
(`workspaces/primitives/packages/primitives/src/components/Button.tsx`) and
captured the frame three ways with `renderer.captureScreenshot`:

| Frame | Bytes | Equal to the others |
| ----- | ----- | ------------------- |
| our `truncate` (`textOverflow: "ellipsis"`) | 84 676 | — |
| manual `textOverflow: "ellipsis-start"` | 84 626 | no |
| untruncated (wraps) | 86 808 | no |

A second probe at `role="h2"` in a 420 px row dumped the glyphs as ASCII art:
the `"ellipsis"` frame opens with the run's first letter (`a` of
`alpha bravo …`), while the `"ellipsis-start"` frame opens with a three-dot mark
on the baseline followed by the run's tail. So the second value is real and it
does what its name says — it is not a silently ignored enum member (the class
plan `365` found for `textAlign: "end"`).

**What the package says today.** `docs/text.mdx`'s API row reads
`| truncate | boolean | false | one line, clipped with an ellipsis |`, and its
Limitations section only warns that "`truncate` needs a bounded width". Nothing
states that the runtime can keep the other end, so a consumer reading the page
concludes the capability does not exist.

## 2. The contract

1. `Text.truncate` accepts `boolean | "start" | "end"`:
   - absent / `false` — no truncation (unchanged);
   - `true` / `"end"` — `whiteSpace: "nowrap"` + `textOverflow: "ellipsis"`
     (byte-identical to today);
   - `"start"` — `whiteSpace: "nowrap"` + `textOverflow: "ellipsis-start"`.
2. The resolver keeps one owner: `textStyle` maps the public value to the
   runtime's, the way it already maps `align: "end"` to `right`.
3. A clamp still wins: `clamp` is a multi-line height cap with no ellipsis
   (plan `082`), so when a valid `clamp` is present the truncation style is not
   emitted at all. `clamp` + `truncate` is a caller mistake the component
   resolves deterministically, and the page states it.
4. Nothing else moves: a fixed-height **control label** keeps the tail ellipsis
   (`controlLabelStyle`), because a button's words start at the beginning; only
   the standalone `Text` primitive gains the choice. No role, name, tone,
   decoration or selectable behaviour changes.
5. Short content is untouched: the runtime only ellipsizes an overflowing run,
   so `truncate="start"` on text that fits paints exactly like no truncation.

## 3. Files to change (exact)

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | `export type TextTruncate = "start" \| "end";` beside `TextDecoration`; `TextSpec.truncate?: boolean \| TextTruncate`; resolve `clamp` first and emit the truncation pair only when no clamp is present |
| `packages/primitives/src/core/index.ts` | export the new `TextTruncate` type beside `TextDecoration` |
| `packages/primitives/src/components/Text.tsx` | `TextProps.truncate?: boolean \| TextTruncate` with JSDoc naming both shapes; pass it through unchanged |
| `packages/primitives/src/core/style.test.ts` | extend the existing truncation case with `"start"`, `"end"`, `false` and `"start"` + `clamp` |
| `packages/primitives/src/components/presentational.test.tsx` | one case reading `textOverflow` for the three forms on the decoded element tree |
| `packages/primitives/runtime/text-overflow.runtime.test.tsx` | the plan-383 file gains the plan-783 cases: capture pass-through + difference, one-line containment, and "short content is unchanged" (§5). The file already measures truncation in a bounded row, so a second file would split one class in two |
| `packages/primitives/runtime/examples.runtime.test.tsx` | one assertion for the new inspector path: one line high and inside the panel (the example change below) |
| `packages/primitives/examples/layout.example.tsx` | the inspector's header becomes a column: the existing title/count row plus the selected layer's source path, `truncate="start"`, `testId="layout-example-path"` |
| `packages/primitives/docs/text.mdx` | API row + a short §Truncation paragraph and the example shape; Limitations: `clamp` wins, single line, bounded width, control labels still tail-clip |
| `COMPONENTS.md` | the Text row gains a `**Leading ellipsis (783):**` clause |
| `TODO.md` | one ticked row under the primitives workstream |
| `.agents/slop/plans/README.md` | index row for this plan |

## 4. Implementation

### 4.1 The resolver

```ts
/** Which end a one-line run keeps when it overflows. */
export type TextTruncate = "start" | "end";

// inside textStyle, replacing the truncate/clamp block
const lines = clampLines(spec.clamp);
if (Option.isSome(lines)) {
  // multi-line cap wins over a one-line truncation (plan 082 / 783)
  style.whiteSpace = "normal";
  style.maxHeight = lines.value * role.lineHeight;
  style.overflow = "hidden";
} else if (spec.truncate === "start") {
  style.whiteSpace = "nowrap";
  style.textOverflow = "ellipsis-start";
} else if (spec.truncate === true || spec.truncate === "end") {
  style.whiteSpace = "nowrap";
  style.textOverflow = "ellipsis";
}
```

The `"start"` branch goes first so the two string values are exhaustive and a
reader sees the runtime value we did not have before. Keep the existing comment
about `lineClamp` (the shared text-layout cache) where it is.

### 4.2 The page

Add under §API and before §Theming:

- API row: `truncate` | `boolean \| "start" \| "end"` | `false` | one line;
  `true`/`"end"` clips the tail, `"start"` keeps the tail and clips the
  beginning (plan `783`)
- a paragraph: a path or package specifier is identified by its end, so the
  leading form is the honest one for a file tree, inspector or breadcrumb; the
  runtime's own `textOverflow` value behind it is `"ellipsis-start"`, measured
  in the capture suite.
- Limitations: add "`truncate` is one line and needs a bounded width; `clamp`
  wins over it; a fixed-height control label always clips its tail."

### 4.3 The example

The inspector already shows a layer's properties. Its header becomes:

```tsx
<Stack direction="column" gap="xs" style={{ paddingLeft: theme.spacing.md, … }}>
  <Stack direction="row" align="center" justify="between" gap="sm">
    <Text role="h3">Inspector</Text>
    <Text role="caption" tone="muted">{properties.length} properties</Text>
  </Stack>
  <Text
    role="caption"
    tone="muted"
    truncate="start"
    testId="layout-example-path"
  >
    workspaces/primitives/packages/primitives/src/components/Button.tsx
  </Text>
</Stack>
```

The path is ~68 characters at caption size in a 308 px content width, so it
truncates at the start and the filename stays visible.

## 5. Test plan (both directions)

**Offline — `src/core/style.test.ts`** (extend the existing case)

- `truncate: true` and `truncate: "end"` → `whiteSpace: "nowrap"`,
  `textOverflow: "ellipsis"`.
- `truncate: "start"` → `whiteSpace: "nowrap"`, `textOverflow: "ellipsis-start"`.
- `truncate: false` → neither property.
- `truncate: "start"` with `clamp: 2` → `whiteSpace: "normal"`,
  `maxHeight: 2 × body lineHeight`, `overflow: "hidden"`, and **no**
  `textOverflow` (the clamp wins, rule 2.3).

**Offline — `src/components/presentational.test.tsx`**

- `renderText({ truncate: "start" }, testTheme)` → `textOverflow` is
  `"ellipsis-start"`; `{ truncate: "end" }` → `"ellipsis"`; `{ truncate: false }`
  → `None`. Read through the existing `stringIn` helper.

**Runtime — `runtime/text-overflow.runtime.test.tsx`** (the plan-383 file; its
header gains the 783 class so one file measures truncation in a bounded row)

1. **Pass-through and difference.** In a 180 px row, capture three frames of the
   same path: `truncate` (end), `truncate="start"`, and a manual
   `style={{ whiteSpace: "nowrap", textOverflow: "ellipsis-start" }}` reference
   that bypasses our mapping. Assert `start` bytes equal the manual frame and
   differ from the `truncate` frame; also capture the untruncated run and assert
   it differs from both.
2. **One line and contained.** `truncate="start"` paints the run's height at the
   body line height and its box inside the 180 px row, while the untruncated copy
   is taller (it wrapped) — the truncation did more than wrap.
3. **Short content is unchanged.** A short run with `truncate="start"` is
   byte-identical to the same run without it (the runtime ellipsizes only an
   overflow).

**Runtime — `runtime/examples.runtime.test.tsx`**

- For the `layout` screen, `layout-example-path` paints one line
  (`height === testTheme.typography.caption.lineHeight`) and its box is inside
  `layout-example`'s width. Existing layout assertions keep passing.

Both directions:

- **Old direction:** with `TextSpec.truncate` reverted to `boolean` and the
  resolver to `"ellipsis"`, `style.test.ts` and `presentational.test.tsx` fail on
  the `"start"` value (`ellipsis-start` vs `ellipsis`), the runtime capture case
  fails (`start` equals `end`), and the example case fails because the path wraps
  to two lines. Record the exact failures before landing the resolver.
- **New direction:** every case above green; the existing truncation cases
  (`style.test.ts`, `presentational.test.tsx`, `text-overflow.runtime.test.tsx`)
  unchanged, which proves the tail behaviour did not move.

## 6. Commands and expected results

```sh
# old direction (tests added, resolver not yet changed)
nub run --filter @gpuixui/primitives test src/core/style.test.ts src/components/presentational.test.tsx
# the "start" cases fail: expected 'ellipsis-start' to be 'ellipsis'

nub run --filter @gpuixui/primitives test:runtime runtime/text-overflow.runtime.test.tsx
# the capture case fails (start equals end); the short-content case passes

# new direction
nub run --filter @gpuixui/primitives test
# 71 files, 0 failed (998 + the new cases)

nub run --filter @gpuixui/primitives test:runtime runtime/text-overflow.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/examples.runtime.test.tsx
# all green (examples 19/19 keeps its count)

nub run --filter @gpuixui/primitives check-types
nub run lint
nub run check:tests
```

The full live suite is the merge/release gate and is **not** run while iterating;
these two scoped files are the proof for this change. `nub run fmt` repo-wide
still reports the recorded cross-team file
(`apps/docs/src/components/docs/demos.tsx`); only this change's files are
formatted.

Measured results (2026-10-20):

- **Old direction** (the resolver's old `truncate === true` branch, tests in
  place): `style.test.ts` + `presentational.test.tsx` → **2 failed | 93 passed**
  (`expected undefined to be 'nowrap'`; the element case reported no
  `textOverflow`). `text-overflow.runtime.test.tsx` → **2 failed | 3 passed**
  (`expected false to be true` for the capture equality — start painted like
  end — and `expected 54 to be 18` for the run's height: it wrapped to three
  lines). `examples.runtime.test.tsx` → **1 failed | 18 passed**
  (`expected 32 to be 16`: the inspector path wrapped to two caption lines).
  The short-content case passed in both directions, as it must.
- **New direction**: full offline suite **71 files / 1000 tests, 0 failed**
  (998 before). Scoped runtime
  `text-overflow` + `examples` → **2 files / 24 tests,
  0 failed** (5 + 19). `check-types`, `nub run lint` and
  `nub run check:tests` are green; the touched files are format-clean.
- The capture proof is a paint comparison: `truncate="start"` is byte-identical
  to the runtime's own `textOverflow: "ellipsis-start"` frame and differs from
  `truncate` and from the untruncated run — the same evidence shape as plans
  `365` and `377`, because the runtime reports the authored style either way.

## 7. STOP conditions

Stop and report instead of improvising if:

- `"ellipsis-start"` paints **identically** to `"ellipsis"` on this host (the
  probe above says it does not, but a rebuilt binding may differ): then do not
  add a prop that promises nothing — correct `docs/text.mdx`'s silent half to a
  measured limitation instead and close the plan as documentation;
- the capture comparison is unstable between two identical renders (a flaky
  capture is not evidence): report the noise instead of loosening the assertion
  to a style-record read, which cannot prove the paint (plan `365`);
- the leading form breaks an existing truncation or clamp assertion — do not
  re-baseline it; the tail behaviour must stay byte-identical;
- the example assertion needs a second new runtime file or a new helper beyond
  `openWindow`/`captureScreenshot`/`bounds` (that is a bigger change than this
  plan; record the gap).

## 8. Acceptance criteria

- `Text` accepts `truncate="start"` and the frame keeps the run's end, proven by
  a capture against the runtime's own `ellipsis-start` value and against the tail
  form; `true`/`"end"` are byte-identical to today.
- `clamp` wins over truncation, deterministically and in one place.
- The API table, the truncation paragraph and the limitations state the real
  contract; the inspector example shows the shape and is runtime-checked.
- The Text inventory row, `TODO.md`, this plan and the plan index are current;
  the runtime file count is unchanged (the cases join the existing file); `check-types`, `lint`,
  `check:tests` and the offline suite are green.
