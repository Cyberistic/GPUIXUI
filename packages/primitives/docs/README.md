# `@gpuixui/primitives` documentation

One page per Tier 1 component, co-located with the source so a page, its example
and the component cannot drift. The browser docs site (`apps/docs`) is a separate
workstream; these pages are the in-package source of truth it can copy or link,
and the examples registry is what `apps/playground` mounts natively.

Each page carries frontmatter, a paragraph saying what the component is, and the
sections §Page contract lists below. Every claim is traceable to the source and
to the suite each Tier 1 record in `src/inventory.ts` names; `COMPONENTS.md`
carries the same verdicts. A capability the pinned runtime does not have is
written as a limitation with the alternative in use — never as a promise.

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
| [icon-button](icon-button.mdx) | `IconButton` | [icon-button](../examples/icon-button.example.tsx) |
| [button-group](button-group.mdx) | `ButtonGroup` | [form](../examples/form.example.tsx) |
| [toggle](toggle.mdx) | `Toggle` | [toggle](../examples/toggle.example.tsx) |
| [toggle-group](toggle-group.mdx) | `ToggleGroup` | [toggle](../examples/toggle.example.tsx) |
| [input](input.mdx) | `Input` | [form](../examples/form.example.tsx) |
| [textarea](textarea.mdx) | `TextArea` | [form](../examples/form.example.tsx) |
| [number-field](number-field.mdx) | `NumberField` | [number-field](../examples/number-field.example.tsx) |
| [otp-field](otp-field.mdx) | `OTPField` | [otp](../examples/otp.example.tsx) |
| [checkbox](checkbox.mdx) | `Checkbox` | [selection](../examples/selection.example.tsx) |
| [checkbox-group](checkbox-group.mdx) | `CheckboxGroup` | [selection](../examples/selection.example.tsx) |
| [radio-group](radio-group.mdx) | `RadioGroup` | [selection](../examples/selection.example.tsx) |
| [switch](switch.mdx) | `Switch` | [selection](../examples/selection.example.tsx) |
| [rating](rating.mdx) | `Rating` | [rating](../examples/rating.example.tsx) |
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

Each page opens with frontmatter (`title`, `description`) and a paragraph saying
what the component is — and what it is *not*. The sections below are the shape
the pages carry now; a required one is on every page, an optional one is on the
pages whose component needs it. A page cannot invent a section the table does
not name, and a row cannot promise a section no page carries — `src/docs.test.ts`
reads this table and every page together.

| Section | Required | What it carries |
| ------- | -------- | --------------- |
| `## Usage` | yes | a TSX snippet importing from the public package root |
| `## API` | yes | prop, type, default, consequence; the variants, sizes and states are the `Type` column |
| `## Limitations` | yes | measured gaps and the honest alternative |
| `## Composition` | no | the parts and what each one is responsible for |
| `## Variants` | no | a variant set whose paint needs a sentence of its own |
| `## Roles` | no | the semantic roles a page enumerates from the theme |
| `## Tones` | no | the semantic tone set a page enumerates from the theme |
| `## Words` | no | the provider's vocabulary |
| `## Dependencies` | no | the runtime parts or packages the page composes |
| `## Absence` | no | what a component does when it has no value |

Every component takes the caller's `className` (compiled through the recipe
registry, after the component's own rules) and `style` (merged last); its `## API`
section names both. `Select` is the one exception, because its root paints only a
width: the page says so and teaches `triggerStyle`/`itemStyle` instead.
`src/docs.test.ts` fails when a page's API section never names `className`.

A keyboard rule, a supported `aria-*` and the roles a component paints belong in
the section they inform — the API table's consequence, a limitation, or a role
row — rather than a heading of their own, so no page promises a section its
component does not have. Every claim is traceable to the source and to the suite
each Tier 1 record in `src/inventory.ts` names; `COMPONENTS.md` carries the same
verdicts. A capability the pinned runtime does not have is written as a
limitation with the alternative in use — never as a promise.

## Cross-component guards

Three suites hold rules no single page owns:

- `src/components/handlers.test.tsx` — a caller's host handlers are **composed**
  with each part's own, never substituted, and a blocked control installs none.
  A part with several interactive elements (a group's option rows, a rating's
  stars, a slider's track and thumbs, a field's input/steppers/cells) installs
  the handler on the element that owns it, so the caller sees which one it was.
- `src/components/focus-matrix.test.tsx` — one row per focusable control
  (Button, IconButton, Toggle, Checkbox, CheckboxGroup, ToggleGroup, Switch,
  RadioGroup, Rating, Slider, RangeSlider, Input, TextArea, NumberField,
  OTPField): the tab stops it owes at rest, and that a disabled control has no
  tab stop and paints no ring. `Select` is absent because its trigger and items
  are GPUix's own components, so the element tree never holds their host nodes;
  its ring and stops are pinned on its page and in the runtime suite.
- `src/components/activation.test.tsx` + `src/components/keyboard-chords.test.tsx`
  — the keyboard contract every control shares. The first holds one activation
  per interaction (Enter on the press, Space on the release, a held key
  ignored); the second holds the chord rule: a key carrying Ctrl, Alt or Cmd is
  a platform or application shortcut (`Cmd+A`, `Ctrl+Space`, `Alt+Arrow`), so a
  control ignores it and keeps the chord's default action — while Shift is not a
  chord. Each case measures both directions: the chord does nothing **and** the
  plain key still acts. The scroll region's chord is in
  `runtime/layout.runtime.test.tsx`, because its handler reads the renderer.
- `src/components/keyboard-dim.test.tsx` — the runtime dims every other
  focusable element to 40% while one has keyboard focus, so a control whose own
  text is **content** (a field's value and placeholder, an OTP cell's digit, a
  select's chosen value) declares `keyboardFocusDim: false`, while a control
  whose content is a glyph (a toggle, a slider) keeps the where-can-Tab-go cue.
  A caller's `style` merges last, so the opt-out is never forced.

## Verification commands

```sh
nub run --filter @gpuixui/primitives test          # pure logic + element trees
nub run --filter @gpuixui/primitives test:runtime  # real GPUix renderer
nub run --filter @gpuixui/primitives check-types
```
