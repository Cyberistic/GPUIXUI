# 059 — `Text` roles do not reach the accessibility tree (headings and code)

- **Phase:** C/F (Tier 1 truth pass). **Owner:** primitives workstream.
- **Depends on:** `030`, `041`, `047`, `058`.
- **Status:** done — implemented and measured. Evidence in §8.
  `COMPONENTS.md` keeps the row at `wip` (the docs-site page and the
  published-binary confirmation are the remaining bar, as for every Tier 1 row).

## 0. The bug, with evidence

`docs/text.mdx` says:

> GPUix's `<text>` has no heading level, no paragraph role and no semantics
> beyond its string; the `role` prop is **visual only**. … 0.10.0 exposes no
> heading element.

That is not true. GPUix 0.10.0's `HostProps` carries `role` and `aria-level`, and
`role_from_aria` / `aria_level` (`references/gpuix/packages/native/src/accessibility.rs`)
map them. Measured on this host (ADR 0003):

```tsx
<Text role="h2">A headline</Text>          // our component
<text role="heading" aria-level={2}>Raw heading</text>
<text role="code">inline()</text>
```

```json
[
  {"aria":{"role":"Label","value":"A headline"}},
  {"aria":{"role":"Heading","value":"Raw heading","level":2}},
  {"aria":{"role":"Code","value":"inline()"}}
]
```

So the raw element **can** be a heading or code; our `Text` simply never sets
it. Every heading in the library is announced as unstructured text, and the docs
teach the opposite `workaround`.

## 1. What changes

`Text` derives the host semantics from its own `role` — one table, no new prop:

| `Text role` | Host attributes | AccessKit |
| ----------- | --------------- | --------- |
| `h1` | `role="heading"`, `aria-level=1` | `Heading`, level 1 |
| `h2` | `role="heading"`, `aria-level=2` | `Heading`, level 2 |
| `h3` | `role="heading"`, `aria-level=3` | `Heading`, level 3 |
| `code`, `codeBlock` | `role="code"` | `Code` |
| `display` | none | `Label` (presentation scale, not an outline level) |
| `body`, `bodyStrong`, `label`, `caption` | none | `Label` (the runtime's default) |

`display` deliberately stays out of the outline: it is a visual scale, and the
page's heading level is the app's decision (`h1`). A caller who needs a heading
for display-scale text can use `h1`. The rule is exported as `textSemantics`
from `Text.tsx` so the table is testable and one source of truth.

Nothing about paint changes: the function only adds host props.

## 2. Files

```
A .agents/slop/plans/059-text-semantics.md
M .agents/slop/plans/README.md
M packages/primitives/src/components/Text.tsx
M packages/primitives/src/components/presentational.test.tsx
M packages/primitives/runtime/layout.runtime.test.tsx
M packages/primitives/docs/text.mdx
M COMPONENTS.md
M TODO.md
```

## 3. Implementation sketch

```ts
const HEADING_LEVELS: Partial<Record<TextRole, number>> = {
  h1: 1, h2: 2, h3: 3,
};

/** The host semantics a role carries (plan 059). */
export const textSemantics = (
  role: TextRole,
): { readonly role?: string; readonly "aria-level"?: number } => {
  const level = HEADING_LEVELS[role];
  if (level !== undefined) return { role: "heading", "aria-level": level };
  return role === "code" || role === "codeBlock" ? { role: "code" } : {};
};

<text testId={testId} {...textSemantics(role)} style={...}>
```

## 4. Test plan

### Element tree (`presentational.test.tsx`)

1. `textSemantics("h1" | "h2" | "h3")` returns `heading` with level 1/2/3.
2. `textSemantics("code" | "codeBlock")` returns `code`.
3. `textSemantics("display" | "body" | "caption" | "label" | "bodyStrong")`
   returns no role (the runtime's own `Label` remains).
4. `renderText({ role: "h2" })` carries `role="heading"` and `aria-level={2}`;
   `renderText({ role: "code" })` carries `role="code"`.

### Runtime (`layout.runtime.test.tsx`)

1. `<Text role="h2">Heading</Text>` is a `Heading` node with `level: 2` and the
   text as its value.
2. `<Text role="h1">Title</Text>` is level 1.
3. `<Text role="code">inline()</Text>` is a `Code` node.
4. `<Text role="body">Body copy</Text>` stays a `Label` (no invented semantics).

### Two-direction proof

Remove the semantic props from `renderText`; the `Heading` assertions must fail
with `no accessibility node for Heading` (the node is a `Label`). Restore; pass.

## 5. Commands, expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/primitives test` | all offline suites pass |
| 2 | `nub run --filter @gpuixui/primitives test:runtime` | all runtime suites pass (14 files; 133 before + new assertions) |
| 3 | `nub run check` | `check:tests`, lint, format and every `tsc` pass |
| 4 | `nub run lint` | exit `0` |
| 5 | `nub run test` | every workspace suite passes |

## 6. STOP conditions

Stop and report with evidence if:

- adding `role`/`aria-level` to `<text>` removes the text **value** from the
  node (the outline would lose the words);
- `aria-level` is ignored on a host `text` element;
- any `Text`-based component's existing runtime assertion changes for a reason
  other than the new node role.

## 7. Acceptance

- `h1`/`h2`/`h3` are real headings with levels; `code`/`codeBlock` are `Code`;
  the other roles keep the runtime's `Label`.
- Element and runtime tests pin the whole table; two-direction proof in §8.
- `docs/text.mdx` replaces the false "no semantics" section with the measured
  table and the `display` rationale; `COMPONENTS.md` Text row records it.
- `TODO.md` ticked; gates green.

## 8. Measured evidence (2026-10-17, this host)

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **27 files / 303 tests pass** (+1 element-tree test) |
| `nub run --filter @gpuixui/primitives test:runtime` | **14 files / 134 tests pass** (+1 runtime test; 133 before) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| `nub run check` | `check:tests`, lint, format and every `tsc` pass |
| `nub run lint` | exit `0` |
| `nub run test` | every workspace suite passes |

Measured after the fix: `<Text role="h1">Page title</Text>` is a `Heading` node
with `level: 1` and `value: "Page title"`; `h2` is level 2; `<Text role="code">`
is a `Code` node; `<Text role="body">` stays a `Label`. The text value survives
the role change — the outline gains structure without losing the words.

**Two-direction proof, observed:** removing `{...textSemantics(role)}` from
`renderText` made the runtime test fail with
`no Heading node with the value Page title` (1 failed / 133 passed). Restored:
134/134.
