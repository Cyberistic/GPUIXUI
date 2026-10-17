# docs/

Source-of-truth design and architecture documents, written in Markdown beside
the code. This directory is **not** the documentation site.

- `docs/` — the library's own documents: design-system rationale, the token
  catalogue, the theming extension mechanism, architecture notes, provenance.
  Written for maintainers; referenced by the docs site.
- `apps/docs/` — the Fumadocs site: the published component documentation and
  showcase, generated from structured metadata where possible.

Keeping them apart is deliberate: the site is a browser app, the documents are
repo content, and the native runtime must never depend on either.

Documents land here as the phases produce them:

| Document | Phase |
| -------- | ----- |
| `design-system.md` — identity, semantic roles, both themes | B |
| `tokens.md` — every public token and the extension mechanism | B |
| `architecture.md` — boundaries, packages, data flow | A/B |
| `gpuix-capabilities.md` — what the runtime supports, with evidence | A |
| `preview-strategy.md` — how the docs site shows native components honestly | B |
