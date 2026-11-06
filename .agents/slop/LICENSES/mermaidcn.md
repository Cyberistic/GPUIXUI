# `mermaidcn` — Mermaid renderer reference

- Repository: <https://github.com/Riley1101/mermaidcn>
- Commit read: `b4fd5ff` (2026-02-15)
- Licence: **MIT, declared in the README's License section** (`MIT License.
  Built with shadcn/ui.`). The repository ships **no `LICENSE` file**, and
  GitHub's licence API reports no detected licence for it; the README is the
  only licence statement the repository carries, so this record names that
  source rather than pretending a licence file exists.
- What we read: `registry/mermaidcn/mermaid.tsx`, `registry/mermaidcn/zoom-pan.tsx`,
  `components/mermaid-playground.tsx`, `components/mermaid-preview.tsx`,
  `components/mermaid-editor.tsx`, `components/mermaid-toolbar.tsx`,
  `lib/mermaid-themes.ts`, `lib/diagram-templates.ts` and the README.

## What we use

The **component API and interaction model**, reimplemented in our own React
over Pele: the `chart` prop and `config`/`onSuccess`/`onError` surface, the
`ZoomPan` prop names and controls render prop, the playground's editor + live
preview split, the theme names and their eight Mermaid variables, and the idea
of a small template picker. Theme palettes are colour values (facts) and the
templates were rewritten for this tree; the implementation and CSS are ours.

The renderer is **Pele**, not Mermaid.js. No `mermaid` dependency is added and
none of mermaidcn's Next.js, shadcn/ui or Lucide internals are copied.

## What we do not use

No component source is copied or transcribed, no package is vendored, and no
mermaidcn logo, mark or trademark is used. The repository ships no `NOTICE`
file. Our MIT-declared attribution is the README statement above.

The rebuilt components live in `apps/docs/src/components/mermaidcn/`; the docs
page is `/diagrams`, and the licence appears on `/license` with this record.
