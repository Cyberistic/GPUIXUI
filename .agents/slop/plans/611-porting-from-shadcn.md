# 611 — Coming from shadcn/ui: the adoption path the site cannot answer

**Status:** planned → implemented in this change.
**Phase:** F (documentation completeness).
**Owner:** docs-site workstream (`apps/docs`, the component-page template's
sibling guide).
**Depends on:** 410 (site), 411 (registry), 482 (Component API), 487
(component-page template), 598/599/601/602/603/605/607/608/609/610 (page-alias
and summary vocabulary), 606 (Styling).

---

## 1. The gap, measured

`MISSION.md` makes shadcn/ui the **architectural and DX reference** and requires
"clear install, usage, contribution and extension instructions". The site
documents the styling model (`/docs/styling`), the parts contract
(`/docs/component-api`) and the tokens, but it never answers the question a
react developer actually arrives with: *"I know shadcn/ui — how do I move?"*

Measured against the production index (`nub run --filter docs smoke:build`,
built output served with `vite preview`, `/api/search?query=…`):

| Query | First result before |
| ----- | ------------------- |
| `migration` | **nothing** |
| `porting` | **nothing** |
| `tailwind` | **nothing** |
| `convert` | **nothing** |
| `shadcn` | `/docs/roadmap`, then `/docs/components/radio-group` |
| `from shadcn` | `/docs/capabilities#where-the-verdicts-come-from` |
| `radix` | `/docs/api-values`, then `/docs/components/radio-group` |
| `asChild` | `/docs/components/combobox` |

The words exist only incidentally: `shadcn` appears twice in the content tree
(a Message scroller limitation and a Radio group deviation note), `radix` never
appears in `content/`, and nothing owns the migration vocabulary. This is the
same class plan 566 fixed for component vocabulary and plan 598 fixed for page
vocabulary — but the fix here is **a page**, not a ranker: there is no document
that maps the two design systems.

A second, independent gap: the site never states which shadcn/ui components
have **no counterpart** here (data table, resizable, sidebar, menubar, chart).
A reader arriving with an existing screen needs that list before adopting, and
it is the same honesty rule as `COMPONENTS.md`'s limitations.

## 2. Decision

Add one hand-authored page, **`/docs/porting-from-shadcn`**, titled *"Coming
from shadcn/ui"*, whose three tables are **data, not prose**:

1. **Component mapping** — shadcn component name → the registry record that
   replaces it. Every target must be a real record; the table links its page.
2. **What changes in the code** — a React/DX difference (className, `cva`/`cn`,
   CSS variables + `next-themes`, Radix portals, `asChild`, `data-state`,
   `focus-visible:`), each row carrying a **repository evidence path** that must
   resolve and a page that explains it.
3. **What has no counterpart yet** — shadcn component → a Tier 3–5 roadmap
   target that is still `todo` in `COMPONENTS.md` (rendered from
   `roadmap.generated.ts`, so the row cannot claim a shipped component is
   missing).

Search reaches the page through the existing mechanisms only: the frontmatter
summary names the vocabulary, and `src/lib/page-aliases.ts` gets a tenth block
for the words the summary cannot outrank (`migration`, `porting`, `shadcn`,
`radix`, `aschild`, `convert`). No ranker change.

Why this shape:

- **Honest by construction.** The mapping cannot point at a component that was
  removed, the "not shipped" rows cannot name a delivered component, and the
  evidence paths cannot rot — each is a guard.
- **No second styling page.** The CSS-level absences stay owned by
  `/docs/styling`; the porting page links it and covers only the React-level
  concepts a shadcn user has in their fingers.
- **Named after the reader's question.** `shadcn` is the term they type;
  `porting`/`migration` are the tasks they search for.

## 3. Files

### Create

| Path | Purpose |
| ---- | ------- |
| `apps/docs/src/lib/porting.ts` | The three tables as typed data + the pure helpers the guards use. No React, no `node:*` (it reaches the client bundle). |
| `apps/docs/src/components/porting-tables.tsx` | `<PortingComponents />`, `<PortingConcepts />`, `<PortingGaps />`. Tables mirror `part-index.tsx` / `absent-styling-concepts.tsx` (scrollable `role="region"`, `data-*` hooks for tests). |
| `apps/docs/src/porting-page.test.tsx` | The guards in §6. |
| `apps/docs/content/docs/porting-from-shadcn.mdx` | The page. |
| `.agents/slop/plans/611-porting-from-shadcn.md` | This plan. |

### Change

| Path | Change |
| ---- | ------ |
| `apps/docs/content/docs/meta.json` | Insert `"porting-from-shadcn"` directly after `"getting-started"` — it is the second question after installation. |
| `apps/docs/src/lib/page-aliases.ts` | Tenth block, plus its doc comment. |
| `apps/docs/src/lib/page-aliases.test.ts` | New `owned` rows for the recovered terms; the existing invariants (one page per term, no shadowing) must stay green unchanged. |
| `apps/docs/scripts/smoke-build.ts` | Two production queries: `migration` and `asChild`. |
| `apps/docs/README.md` | A short section naming the page, the module, the guards. |
| `.agents/slop/plans/README.md` | Index row. |
| `TODO.md` | Tick the task in the docs-site block. |
| `PLAN.md` | Decision D59. |

## 4. The data module — exact contract

`apps/docs/src/lib/porting.ts`:

```ts
export interface PortedComponent {
  /** The shadcn/ui component name as its docs write it. */
  readonly shadcn: string;
  /** A registry record slug. Guarded against `bulk`/`bySlug`. */
  readonly slug: string;
  /** One sentence: the shape difference a reader must know. */
  readonly note: string;
}

export interface PortedConcept {
  readonly concept: string;   // the shadcn/React idiom
  readonly shadcn: string;    // what it does there
  readonly here: string;      // what replaces it
  readonly evidence: string;  // repo-relative path that must exist
  readonly href: string;      // a site page that explains it
}

export interface UnportedComponent {
  readonly shadcn: string;
  /** A `COMPONENTS.md` Tier 3–5 target name, verbatim. */
  readonly roadmap: string;
  readonly note: string;
}
```

### 4.1 Component mapping (exact rows)

Notes are required because shadcn's shape and ours differ; a bare link would
imply an API they can paste.

| `shadcn` | `slug` | `note` (summary) |
| -------- | ------ | ---------------- |
| Button | `button` | `onActivate`, not `onClick`; Enter on key down, Space on key up. |
| Badge | `badge` | Tone roles, not colour classes. |
| Card | `card` | Parts (`CardHeader`, `CardContent`, …), the same composition model. |
| Avatar | `avatar` | Initials are unicode-safe; the image prop is the runtime's. |
| Alert | `alert` | `tone` + a dismiss control; no `variant` string. |
| Input | `text-input` | A `Field` wires its label, description and error. |
| Textarea | `text-area` | No `onSubmit`; Enter is a newline. |
| Label | `label` | Sighted-name part; `labelledBy` is the runtime's field link. |
| Checkbox | `checkbox` | Press/checked contract is the component's, `aria-checked` is real. |
| Radio Group | `radio-group` | Options are data, so the group owns the roving index (D16). |
| Select | `select` | Headless GPUix `Select`, themed by us. |
| Switch | `switch` | Same role contract; `invalid` exists. |
| Slider | `slider` | Value maths is a pure module; the track is a `div`. |
| Progress | `progress` | Deterministic value; no CSS animation. |
| Tooltip | `tooltip` | Headless GPUix `Tooltip`, themed by us. |
| Skeleton | `skeleton` | A paint, not an animation; reduced motion needs no media query. |
| Separator | `separator` | A 1 px box; orientation is a prop. |
| Tabs | `tabs` | Parts + `value`/`defaultValue`; automatic or manual activation. |
| Accordion | `accordion` | Compose `AccordionItem`/`Trigger`/`Content`; single or multiple. |
| Collapsible | `collapsible` | Unmounts while closed. |
| Breadcrumb | `breadcrumb` | Collapse keeps the ends. |
| Pagination | `pagination` | Edge-aware; current page is a no-op. |
| Dialog | `dialog` | No portal and no `DialogPortal`; paint order is the dismiss stack. |
| Alert Dialog | `confirm-dialog` | Cancel-first, caller-owned close, both dismissals locked while loading. |
| Popover | `popover` | `side`/`align`/`sideOffset`; `align="center"` is measured off by half. |
| Dropdown Menu | `dropdown-menu` | A shared row registry; submenus compose. |
| Context Menu | `context-menu` | Opens at the pointer from `onAuxClick`. |
| Command | `command-menu` | Subsequence ranking over your own actions, in a Dialog. |
| Combobox | `combobox` | Headless GPUix combobox with pre-ranked items. |
| Sonner | `toast` | `ToastProvider` + viewport; the queue is Effect-owned. |
| Toggle | `toggle` | A two-state control; shadcn's `ToggleGroup` has no counterpart yet. |
| Input OTP | `otp-field` | One cell group, key-up paste contract. |
| Date Picker | `date-picker` | A day picker; separate time picking is out of scope. |
| Form | `form` | Schema-driven; submit decodes to a typed value. |
| Field | `inline-validation` | `Field`, `FieldLabel`, `FieldDescription`, `FieldError`. |
| Empty | `empty-state` | Title, body and one action. |
| Navigation Menu | `navigation-menu` | A value-driven menu, not a hover mega-menu. |
| Drawer | `drawer` | One edge surface for shadcn's `Drawer` and `Sheet`. |
| Scroll Area | `scroll-area` | Wheel deltas are real; the runtime owns the scrollbar. |
| Carousel | `carousel` | Explicit index; no drag physics. |
| Kbd | `keycap` | Renders a key set, sized from the type scale. |

### 4.2 What changes (exact rows)

| `concept` | `shadcn` | `here` | `evidence` | `href` |
| --------- | -------- | ------ | ---------- | ------ |
| `className` and Tailwind utilities | A string of utility classes per element | One `StyleDesc` object from theme values | `packages/primitives/src/core/style.ts` | `/docs/styling` |
| `cva` + `cn` | Variant maps merged with `tailwind-merge` | Variant tables over colour roles; the caller's object is spread last | `packages/primitives/src/core/variants.ts` | `/docs/styling` |
| CSS variables + `next-themes` | `:root` variables flipped by a class | `useTheme()` returns resolved values; the app owns the mode | `packages/tokens/src/theme.ts` | `/docs/dark-mode` |
| Radix primitives and portals | Portalled surfaces, a focus scope per primitive | Parts over host elements; one dismiss stack, no portal | `packages/components/src/internal/dismiss-layer.ts` | `/docs/component-api` |
| `asChild` + Slot | The child element *becomes* the trigger | A part renders its own host element; compose by nesting parts | `packages/primitives/src/components/Button.tsx` | `/docs/component-api` |
| `data-state` / `data-slot` attributes | State and identity are DOM attributes styled by CSS | State arrives as props and style variants; there is no DOM attribute surface beyond `HostProps` | `node_modules/@gpuix/native/dist/host.d.ts` | `/docs/component-api` |
| `focus-visible:` utilities | A pseudo-class paints the ring | Components call `focusRing(theme)`; pointer focus looks the same | `packages/tokens/src/styles.ts` | `/docs/accessibility` |

### 4.3 Not shipped (exact rows)

| `shadcn` | `roadmap` | `note` |
| --------- | --------- | ------ |
| Data Table | `Tables` | Tier 3: grid + `div` rows; sortable and virtualized tables are separate targets. |
| Resizable | `Resizable split panes` | Tier 4, `packages/docking`. |
| Sidebar | `Collapsible sidebars` | Tier 4; a collapsible section is not a workspace sidebar. |
| Menubar | `Application menus` | Tier 4; `Navigation Menu` is a page menu, not the app menu bar. |
| Chart | `Charts` | Tier 3; no native chart renderer is verified. |

`Tier 3–5` remains owned by `/docs/roadmap`; this table exists so a reader with
an existing screen knows in one glance.

## 5. Page structure (`porting-from-shadcn.mdx`)

Frontmatter:

```yaml
title: Coming from shadcn/ui
description: Porting a shadcn/ui interface to the native runtime — the components that map across, what className, Tailwind, Radix and CSS variables become, and what is not shipped yet.
```

Sections, in order:

1. Intro — same composition model, different substrate; shadcn referenced as a
   design reference, not copied source (link `/docs/license`).
2. `## What maps across` — one sentence + `<PortingComponents />`.
3. `## What changes in the code` — `<PortingConcepts />`, then the two
   consequences a React reader hits first (no CSS, no `asChild`) in prose.
4. `## A port in practice` — one "before" fence in shadcn's shape
   (`@/components/ui/*`, allowed by `code-imports.test.ts` because only
   `@gpuixui/*` is resolved) and one "after" fence importing the **real**
   exports (`@gpuixui/components/card`, `@gpuixui/primitives`, …), followed by a
   link to the confirmation-flow live scene as the honest running proof.
5. `## What has no counterpart yet` — `<PortingGaps />` + a link to the Roadmap
   and Previews.
6. `## Where to go next` — Getting started, Styling, Component API, Theming,
   Contributing.

Every external `@gpuixui/*` name in a fence must resolve (plan 577).

## 6. Test plan

`apps/docs/src/porting-page.test.tsx` — each test states the drift it prevents:

1. **Every mapped slug is a delivered record.** `portedComponents` slugs are a
   subset of `bySlug` and each record's `status` is not `planned`; fails on a
   renamed or removed component.
2. **The mapping is unambiguous.** No shadcn name appears twice, no slug
   appears twice, every note is non-empty and trimmed.
3. **Every "not shipped" row is still a real target and still missing.** The
   `roadmap` name exists in `roadmapTargets` **and** its `status` is `todo`; the
   record side is checked in both directions, so shipping the target (status
   change or a new record whose title matches) fails the page.
4. **Every concept row resolves.** `evidence` exists on disk
   (`existsSync(join(repoRoot, evidence))`, and `node_modules/…` for the
   declared runtime path) and `href` is a page `source.getPages()` serves.
5. **The page renders the data, not a copy.** `renderToStaticMarkup` of each
   component has one row per data entry (count equality), the row counts are
   non-zero, and a row's `data-*` key matches the data.
6. **The page is wired.** It exists in `source`, is ordered in `meta.json`
   between `getting-started` and `showcase`, and the MDX contains the three
   component tags plus the six `##` headings.
7. **The page cannot claim CSS.** `absentStylingConcepts` still includes
   `className and CSS classes` and `Stylesheets and Tailwind`, and the page
   links `/docs/styling` (the claim and its owner move together).
8. **Search finds it.** With the real index, each of `migration`, `porting`,
   `shadcn`, `radix`, `asChild`, `convert` returns `/docs/porting-from-shadcn`
   first; `tailwind` and `className` still return `/docs/styling`, and
   `prop`/`button` keep their owners.

`apps/docs/src/lib/page-aliases.test.ts` — new `owned` rows for the six terms;
the existing shadowing/shared-term invariants must pass unchanged.

### Forced defects (run, measured, reverted)

Each must fail by name; record the output in the commit message/README:

- **F1** Point one mapped slug at `data-grid` (no such record) → test 1 fails.
- **F2** Mark the `Tables` roadmap row `done` in the test fixture (or rename it
  to a delivered title) → test 3 fails.
- **F3** Rename an `evidence` path → test 4 fails by path.
- **F4** Remove `<PortingGaps />` from the MDX → test 6 fails by tag.
- **F5** Drop `migration` from the alias block → test 8 fails by query.
- **F6** Add `tailwind` to the page's alias block → `page-aliases.test.ts` fails
  as a shared term.

## 7. Commands and expected results

```sh
nub run --filter docs test
# expected: 123 files, 1117 + ~10 tests, exit 0

nub run --filter docs check-types
# expected: fumadocs-mdx + both tsconfigs, exit 0

nub run --filter docs smoke:build
# expected: "smoke: sitemap 105 pages", "pages 105 checked", "search checked", exit 0

nub run --filter docs smoke:a11y -- --only /docs/porting-from-shadcn
# expected: 2 documents (light + dark), 0 violations, exit 0

nub run check   # repo gate: test quality, lint, format, types
nub run lint
nub run test
# expected: exit 0
```

The built crawl is the page-count check; axe is the whole-page check the new
tables can fail (scroll regions, table headers).

## 8. STOP conditions

- If `roadmapTargets` cannot prove a "not shipped" row (a target also has a
  delivered record with the same title), **drop that row** rather than weaken
  the guard; if two rows drop, stop and report — the page's claim is unsound.
- If a concept row's evidence path does not exist, do not invent a path: either
  name the real file or drop the row.
- If `tailwind`/`className` aliases must move to make search pass, **do not**
  move them — the Styling page owns them (plan 606). Report the tie instead.
- If the axe sweep finds a failure in the new tables, fix the table (headers,
  scroll region, contrast) — do not exclude the page.
- Do not add a live scene for this page; it links the existing confirmation-flow
  scene. A new scene is a separate plan with its own smoke assertions.

## 9. Acceptance criteria

- `/docs/porting-from-shadcn` renders three guarded tables, a worked before/after
  and the "not shipped" list, and sits directly after Getting started.
- The six measured queries return the page first in the **production** index;
  the two owned words keep their owner.
- Every mapping, gap and evidence row is a test, and all six forced defects were
  observed failing before being reverted.
- `nub run --filter docs test`, `check-types`, `smoke:build`, the axe run for
  this page, `nub run check`, `nub run lint` and `nub run test` are green.
- `TODO.md`, `PLAN.md` (D59), the plan index and `apps/docs/README.md` record
  the page and the measured before/after.

## 10. Out of scope

- Per-platform colour variants (tokens workstream, `MISSING` in TODO).
- Copying any shadcn/ui source or asset: this page maps *concepts*, and the
  License page already records shadcn as inspiration only.
- A `ToggleGroup`, data table or docking component (Tier 3–4, other owners).
