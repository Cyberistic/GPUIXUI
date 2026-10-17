# `@gpuixui/primitives` documentation

One page per Tier 1 component, co-located with the source so a page, its example
and the component cannot drift. The browser docs site (`apps/docs`) is a separate
workstream; these pages are the in-package source of truth it can copy or link,
and the examples registry is what `apps/playground` mounts natively.

Each page follows the same contract: what it is, usage, variants/sizes/states,
API, keyboard, accessibility, theming, limitations, verification, related. Every
claim is traceable to the source, `COMPONENTS.md`'s `Runtime (041)` notes or
`.agents/slop/plans/041-tier1-runtime-verification.md` §9. A capability GPUix
0.10.0 does not have is written as a limitation with the alternative in use —
never as a promise.

## Pages

| Page | Component | Example |
| ---- | --------- | ------- |
| [theme-provider](theme-provider.mdx) | `ThemeProvider`, `useTheme` | every example (host-supplied) |
| [box](box.mdx) | `Box` | [layout](../examples/layout.example.tsx) |
| [stack](stack.mdx) | `Stack` | [layout](../examples/layout.example.tsx) |
| [grid](grid.mdx) | `Grid` | [layout](../examples/layout.example.tsx) |
| [separator](separator.mdx) | `Separator` | [layout](../examples/layout.example.tsx) |
| [spacer](spacer.mdx) | `Spacer` | [layout](../examples/layout.example.tsx) |
| [scroll-area](scroll-area.mdx) | `ScrollArea` | [layout](../examples/layout.example.tsx) |
| [text](text.mdx) | `Text` | [typography](../examples/typography.example.tsx) |
| [label](label.mdx) | `Label`, `labelledBy` | [form](../examples/form.example.tsx) |
| [button](button.mdx) | `Button` | [form](../examples/form.example.tsx) |
| [button-group](button-group.mdx) | `ButtonGroup` | [form](../examples/form.example.tsx) |
| [input](input.mdx) | `Input` | [form](../examples/form.example.tsx) |
| [textarea](textarea.mdx) | `TextArea` | [form](../examples/form.example.tsx) |
| [checkbox](checkbox.mdx) | `Checkbox` | [selection](../examples/selection.example.tsx) |
| [radio-group](radio-group.mdx) | `RadioGroup` | [selection](../examples/selection.example.tsx) |
| [switch](switch.mdx) | `Switch` | [selection](../examples/selection.example.tsx) |
| [select](select.mdx) | `Select` | [form](../examples/form.example.tsx) |
| [slider](slider.mdx) | `Slider` | [value](../examples/value.example.tsx) |
| [range-slider](range-slider.mdx) | `RangeSlider` | [value](../examples/value.example.tsx) |
| [meter](meter.mdx) | `Meter` | [value](../examples/value.example.tsx) |
| [progress](progress.mdx) | `Progress` | [form](../examples/form.example.tsx) |
| [skeleton](skeleton.mdx) | `Skeleton` | [feedback](../examples/feedback.example.tsx) |
| [spinner](spinner.mdx) | `Spinner` | [feedback](../examples/feedback.example.tsx) |
| [tooltip](tooltip.mdx) | `Tooltip` | [feedback](../examples/feedback.example.tsx) |

The icon package has its own page: [`@gpuixui/icons`](../../icons/docs/icon.mdx).

## Page contract

1. **Frontmatter** — `title`, `description`.
2. **What it is** — including what it is *not*.
3. **Usage** — a TSX snippet importing from the public package root.
4. **Variants / sizes / states** — a table from the real unions.
5. **API** — prop, type, default, consequence.
6. **Keyboard** — the `core/keyboard.ts` contract, or "not focusable".
7. **Accessibility** — the role and `aria-*` GPUix 0.10.0 actually supports.
8. **Theming** — the semantic roles the resolver reads.
9. **Limitations** — measured gaps and the honest alternative.
10. **Verification** — the suites and the command that ran them.
11. **Related**.

## Verification commands

```sh
nub run --filter @gpuixui/primitives test          # pure logic + element trees
nub run --filter @gpuixui/primitives test:runtime  # real GPUix renderer
nub run --filter @gpuixui/primitives check-types
```
