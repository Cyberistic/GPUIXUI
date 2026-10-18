# Plan 435: Pele, the Fumadocs Editor, and RTL

Three queue items, each self-contained. They can be split into their own plans when claimed;
the numbering block stays `400–499` (docs/authoring) and `300–399` (library behaviour).

---

## 435a — Pele (Obsidian's design system) as a reference

**Reference:** `https://github.com/obsidianmd/pele`.

**Why.** Obsidian is a mature desktop app with a design system that has solved the same
problems we face: dense information surfaces, sidebars, tabs, a command palette, settings
panes, and a theme that must not fight the user. Its component inventory is a second opinion
on ours, and it is closer to our register than a web marketing kit.

**Recon first (do not assume the stack):**
- Read the repository's README and licence. Record the licence in `LICENSES/` **before**
  adapting anything, and distinguish inspiration from copied source.
- Note the language/framework. If it is React/TS, its component *shape* may be portable; if
  it is another stack, treat it as behaviour reference only.
- Enumerate its components and tokens into the research file
  (`.agents/slop/reference-research.md`), then diff against `COMPONENTS.md`.

**What to port:** component decomposition, token names/semantics, the dense-desktop layout
patterns (sidebar + tabs + status bar + inspector), and any interaction detail we lack
(settings panes, command palette, property editors). **Not** its branding or art.

**Deliverable:** an inventory diff (covered / missing) added to `COMPONENTS.md`, plus a
short "what Pele taught us" section in the research file. No implementation in this step.

**STOP:** if the licence does not permit adaptation, use it as behaviour reference only.

---

## 435b — The Fumadocs Editor as a component in the suite

**Reference:** `https://github.com/fuma-nama/fumadocs-editor`.

**Why.** A rich-text/MDX editor is a component our users need — notes, reports, docs inside
their own apps. The Fumadocs Editor is the reference for the **behaviour and API**: an MDX
document edited as blocks (prose, tables, code fences, frontmatter, the `fumadocs-ui`
component set) with a slash menu and an attributes panel, where **untouched blocks serialize
byte-for-byte** so a one-line edit is a one-line diff.

**It is not how we author our own docs.** Our docs stay hand-authored MDX in
`apps/docs/content`; the editor is a **component the library ships**, showcased on its own
docs page like any other component.

**The runtime question comes first.** The Fumadocs Editor is a DOM/web component; our
library targets GPUix. Before designing the API, establish what the runtime can host:

- If GPUix can embed a web surface (webview or wasm browser surface), the editor ships as an
  **embedded-surface component**, and the plan specifies the boundary — what crosses it, and
  what state lives on which side.
- If it cannot, the editor ships as a **web-tier component** — clearly labelled a browser
  surface, not a native one — and the native alternative is a documented gap, not a fake.

Do not design a native "editor" that is secretly a DOM element, and do not claim native
behaviour the runtime does not provide.

**API shape (target).** Compound parts consistent with `200`:

```tsx
<Editor.Root value defaultValue onValueChange>
  <Editor.Content />
  <Editor.SlashMenu />
  <Editor.Attributes />
  <Editor.Frontmatter />
</Editor.Root>
```

with the byte-for-byte guarantee stated as a contract, not a hope.

**Evidence.** A round-trip test: open a real MDX document, change one sentence, assert the
diff is one line and the untouched blocks are byte-identical. A docs page with a live demo
(or a labelled browser surface). Licence recorded in `LICENSES/`.

**Acceptance:** the editor is a documented component with typed parts and a live demo; the
runtime boundary is stated; the round-trip contract is tested.

**STOP:** if the runtime cannot host a DOM editor and a web-tier component is unacceptable,
record the gap and stop — do not fake a native editor.

---

## 435c — RTL support

**Reference:** `https://ui.shadcn.com/docs/rtl`.

**Why.** The library claims to be usable for real products; a product that ships in Arabic,
Persian or Urdu needs a mirrored layout, not a CSS afterthought. It also forces the
layout primitives to be honest about direction.

**Scope:**
- **Logical properties everywhere**: `start`/`end` instead of `left`/`right` in padding,
  margin, borders, insets, and placement. Where the runtime takes physical coordinates
  (floating placement, canvas, drag), a single direction-aware helper converts.
- **Direction as a token**: `direction: ltr | rtl` in the theme, settable per app and
  per docs preview; it flips the layout helpers, not the components.
- **Mirrored icons** where direction carries meaning (chevrons, arrows, back/forward);
  never mirror glyphs that are direction-neutral (play, check, plus).
- **Docs**: an RTL toggle beside the platform toggle; every component page states its RTL
  behaviour; screenshots for a representative set.
- **Tests**: an RTL fixture — a form, a menu, a table and a panel layout rendered in RTL;
  assertions that logical placement swapped and physical coordinates did not leak.

**Acceptance:**
- [ ] A component tree renders mirrored under `direction: rtl` with no component-level
      special-casing.
- [ ] Directional icons mirror; neutral icons do not.
- [ ] The docs toggle flips every preview and is documented.
- [ ] The RTL fixture covers form, menu, table and layout, with screenshots.

**STOP:** if the runtime cannot express logical placement, build the direction-aware helper
first and document which primitives still need physical values — do not sprinkle
`if (rtl)` through components.
