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

## 435b — Adopt the Fumadocs Editor for authoring the docs

**Reference:** `https://github.com/fuma-nama/fumadocs-editor`.

**Why.** The component pages are authored as MDX by hand. The Fumadocs Editor turns an MDX
file into an editable page (prose, tables, code fences, frontmatter, the `fumadocs-ui`
component set) with a slash menu and an attributes panel — **and keeps untouched blocks
byte-for-byte**, so a one-line edit stays a one-line diff.

**Scope:** authoring only. The docs *reader* stays the existing Fumadocs site; this adds an
editing surface for `apps/docs/content`.

**Steps:**
1. Verify the current package names/versions (`@fumadocs-editor/*` — the ecosystem is
   pre-v1; confirm the published packages and the editor URL before adding anything).
2. Mount the editor on one docs page in a **local/dev-only** route. It must not be reachable
   on the deployed Worker (no auth story there).
3. Prove the byte-for-byte promise on a real page: open a component page, change one
   sentence, confirm the diff is one line and the untouched MDX (our custom components,
   `<include>`, code fences) is unchanged.
4. Wire the "save" path to the file (the editor ships a Studio CLI / sync path), not to a
   database copy — **the file stays the source of truth**.

**Tests / evidence:** a round-trip check (open → no edit → save → `git diff` empty); a
one-sentence edit producing a one-line diff; the deployed site still builds.

**Acceptance:** a component page can be edited in the editor and lands as a minimal diff;
the deployed docs never expose the writing surface.

**STOP:** if the byte-for-byte promise fails on our MDX (custom components, includes), do
not adopt it; record the exact failing page and move on.

---

## 435c — RTL support

**Reference:** `https://ui.shadcn.com/docs/rtl`.

**Why.** The library claims to be usable for real products; a product that ships in Arabic,
Hebrew, Persian or Urdu needs a mirrored layout, not a CSS afterthought. It also forces the
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
