# Docs voice

The docs read like shadcn/ui's: a title, one sentence, a preview, code, a table.
They do not argue. Nothing explains why the code is shaped the way it is — that
belongs in the commit, the plan, or the source comment.

## Page shape

```mdx
---
title: Accordion
description: One sentence, under 15 words.
---

<ComponentPreview name="accordion-demo" />

## Installation

```bash
nub add @gpuixui/components
```

## Usage

```tsx
<a short example, under 15 lines>
```

## Composition

```text
Accordion
├── AccordionItem
│   ├── AccordionTrigger
│   └── AccordionContent
```

## Examples

### Multiple

```tsx
<one line or a short block>
```

## API

| Part | Prop | Type | Default |
| ---- | ---- | ---- | ------- |

## Limitations

- One short fact per line.
```

Use `<ComponentPreview name="…" />` when `demos.tsx` has a demo for the page.

## Budget

- **60 prose words** outside frontmatter, code fences, tables and JSX blocks.
- A sentence is under 25 words.
- At most three examples; at most four limitations.
- No "Installation" section when the package is already the page's dependency —
  one `nub add` line is enough.

## Delete, do not compress

- Implementation rationale ("the state is modelled as a tagged union…").
- Test counts and verification sections ("16 native tests…", "both directions
  measured").
- Runtime archaeology ("0.11.0 has no `aria-controls`…" — keep the *fact* in
  Limitations, drop the version story).
- Plans, issue numbers and measurement prose.
- "Genuinely", "deliberately", "the point is", "what this means", "in short",
  "we", "let's", "the honest half".

## Keep

- The frontmatter title and description.
- One usage example that compiles.
- The composition tree for compound parts.
- The API table (props, types, defaults).
- Runtime limitations as one-line bullets.
- A `## Related` list only when it names a real alternative.
