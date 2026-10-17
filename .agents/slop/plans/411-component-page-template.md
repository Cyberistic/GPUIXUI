# 411 — the component-page template and API metadata

- **Workstream:** docs-site
- **Phase:** B (contract + first page) → C–F (one entry per component)
- **Owns:** `apps/docs/src/component-meta/**`, `apps/docs/src/components/component-index.tsx`,
  `apps/docs/src/components/preview/props-table.tsx`, `apps/docs/content/docs/components/**`,
  and the component-page contract documented in `apps/docs/README.md`
- **Depends on:** 410 (the app shell); the components workstream (`1xx`) for the real
  prop types the API tables read
- **Depended on by:** every component page on the site

This is the cross-cutting "component-page template" the supervisor assigns to the
docs-site workstream. It is the single contract that makes navigation, the index,
status badges and API tables generated rather than hand-maintained.

---

## 1. Goal

One structured metadata record per component drives:

1. the **component index** page (grouped by tier, with status and GPUix support);
2. the **sidebar** order and status;
3. the **status badge**, GPUix-support badge, dependencies and related links on the
   page;
4. the **preview strategy** the page must use (plan 412);
5. the **API/prop table**, generated from the component's real TypeScript types.

The page prose lives in MDX; everything mechanical is generated. A test fails if a
record is malformed or disagrees with the repository.

## 2. Why metadata lives in `apps/docs` for now

The clean end state is: each component package exports a `ComponentMeta` from a
dependency-free subpath (`@gpuixui/components/meta`), and the site imports the
records. That is a cross-team change (the component packages are another
workstream). Phase B therefore keeps the records **docs-owned** under
`apps/docs/src/component-meta/entries/`, typed by a shared schema, and records the
hoist as a `TODO.md` task. The schema and the page template are designed so moving
the records into the packages is a file move, not a rewrite. The site still reads
**prop types from the component source** (`sourcePath`) so API tables cannot drift
even while the metadata is docs-owned.

## 3. The metadata contract

`apps/docs/src/component-meta/schema.ts` defines the record with Effect Schema. The
**type** is the source of truth; the **value** is used only by the test (see §5).

```ts
import * as Schema from "effect/Schema";

export const Tier = Schema.Literal("1", "2", "3", "4", "5");
export const Status = Schema.Literal("planned", "wip", "done", "blocked", "unsupported");
export const GpuixSupport = Schema.Literal("yes", "partial", "no", "unverified");

export class ComponentMeta extends Schema.Class<ComponentMeta>("ComponentMeta")({
  slug: Schema.NonEmptyString,                 // URL segment under /docs/components/<slug>
  title: Schema.NonEmptyString,                // display name, e.g. "Button"
  tier: Tier,
  group: Schema.NonEmptyString,                // "foundational" | "composition" | "data-display" | "workspace" | "specialised"
  status: Status,
  gpuix: GpuixSupport,
  summary: Schema.NonEmptyString,              // one sentence, shown in the index
  packageName: Schema.String,                  // "@gpuixui/components" | "planned"
  sourcePath: Schema.OptionFromNullOr(Schema.String), // path to the component source, repo-relative
  dependencies: Schema.Array(Schema.String),
  related: Schema.Array(Schema.String),        // slugs of other records
  playgroundScreen: Schema.OptionFromNullOr(Schema.String),
  limitations: Schema.Array(Schema.String),
}) {}

export const decodeComponentMeta = Schema.decodeUnknownSync(ComponentMeta);
```

Notes:

- The schema is **not** in the browser bundle (§5). `entries/*.ts` import only the
  `ComponentMeta` **type**.
- `sourcePath` is where the prop table and copyable source read from. When the
  component does not exist yet, it is `Option.none()` and the page renders the
  "not published yet" state — never fabricated props.
- `group` and `tier` mirror `COMPONENTS.md`'s tiers so the inventory and the site
  cannot describe the component differently.

`apps/docs/src/component-meta/entries/<slug>.ts` (one file per component):

```ts
import type { ComponentMeta } from "../schema.js";

export const button: ComponentMeta = {
  slug: "button",
  title: "Button",
  tier: "1",
  group: "foundational",
  status: "planned",
  gpuix: "unverified",
  summary: "Triggers an action; the primary interactive control.",
  packageName: "@gpuixui/primitives",
  sourcePath: null,
  dependencies: [],
  related: ["button-group"],
  playgroundScreen: null,
  limitations: [],
};
```

`apps/docs/src/component-meta/registry.ts` aggregates the entries into a stable,
sorted list and provides grouped views. It imports the entry modules (not the
schema value):

```ts
import type { ComponentMeta } from "./schema.js";
import { button } from "./entries/button.js";
// ... one import per entry

export const components: readonly ComponentMeta[] = [button /* ... */ ];
export const bySlug = new Map(components.map((c) => [c.slug, c]));
export const groups = /* ordered by tier then group */;
```

Because entries are imported explicitly, a missing/renamed file is a type error —
that is the compile-time half of the consistency guarantee.

## 4. The page template

`apps/docs/content/docs/components/<slug>.mdx` renders the standard sections. The
MDX components come from plan 412 (`<NativePreview>`, `<ComponentSource>`,
`<PreviewUnavailable>`) and this plan (`<PropsTable>`, `<ComponentState>`):

```mdx
---
title: Button
description: Triggers an action; the primary interactive control.
---

<ComponentState slug="button" />

<NativePreview slug="button" />

## Usage

```tsx
import { Button } from "@gpuixui/primitives";

<Button variant="primary">Save changes</Button>;
```

## Variants
<!-- one <NativePreview> per variant when the runtime path exists; a labelled
     illustrative approximation only per plan 412 -->

## Sizes

## States

## Keyboard and focus

## Theming

## Accessibility and limitations

## API reference

<PropsTable sourcePath="@gpuixui/primitives/button" exportName="ButtonProps" />

## Related

See <RelatedComponents slug="button" />.
```

`<ComponentState slug>` reads the registry and renders status, GPUix support,
dependencies, related components and the recorded limitations — all from one
record, so the page cannot contradict `COMPONENTS.md`.

`<PropsTable>` wraps `fumadocs-typescript`'s `AutoTypeTable`:

```tsx
import { AutoTypeTable } from "fumadocs-typescript/ui";

export function PropsTable({ sourcePath, exportName }: PropsTableProps) {
  return <AutoTypeTable path={sourcePath} name={exportName} />;
}
```

The prop types are read from the component package's **source** at build time via
`remarkAutoTypeTable` (configured in `source.config.ts`), using tsdoc annotations the
component workstream already must write:

- `@internal` hides a prop;
- `@remarks \`Type\`` simplifies a displayed type;
- `@fumadocsType` sets a display type;
- `@fumadocsHref` cross-links to another table.

This is why the component packages must export a props type with tsdoc (recorded as
a handoff task). If a component has no exported props type yet, `<PropsTable>`
renders the honest "prop table unavailable until the component publishes its props
type" state — never a hand-written guess.

## 5. `effect` is a test-only dependency

`effect/Schema` validates every record in `registry.test.ts`. The site's browser
bundle must not import `effect`: the metadata entry files import the `ComponentMeta`
**type** only (`import type`), and the route/index components import the registry
**values** (plain objects). The schema value is reached only from the test. This
keeps Effect out of the client and still satisfies AGENTS §5 (domain validation is
Effect-native) at the correct boundary: the test.

If, on implementation, a bundler analysis shows `effect` would be included, STOP:
report it, and keep validation in the test only (which is already the design) rather
than thinning the schema.

## 6. Files to create

```
apps/docs/src/component-meta/
├── schema.ts                 # Effect Schema contract (test-only usage)
├── registry.ts               # aggregates entries; grouped views
├── registry.test.ts          # the load-bearing test
└── entries/
    ├── button.ts             # first record(s); "planned" until the package lands
    └── ...                   # one per COMPONENTS.md row as components land
apps/docs/src/components/
├── component-index.tsx       # index page body, generated from the registry
├── component-state.tsx       # status/support/deps/related/limitations block
├── related-components.tsx    # inline related links from the registry
└── preview/
    └── props-table.tsx       # fumadocs-typescript AutoTypeTable wrapper
apps/docs/content/docs/components/
├── meta.json                 # order; may be generated from the registry
└── index.mdx                 # <ComponentIndex />
```

`source.config.ts` gains the `remarkAutoTypeTable` plugin:

```ts
import { createGenerator, createFileSystemGeneratorCache, remarkAutoTypeTable } from "fumadocs-typescript";
import { defineConfig } from "fumadocs-mdx/config";

const generator = createGenerator({
  cache: createFileSystemGeneratorCache("node_modules/.cache/fumadocs-typescript"),
});

export default defineConfig({
  mdxOptions: { remarkPlugins: [[remarkAutoTypeTable, { generator }]] },
});
```

## 7. Work breakdown

| # | Task | Deliverable | Depends on |
| - | ---- | ----------- | ---------- |
| T1 | Schema + first entries + registry | `schema.ts`, `registry.ts`, `entries/button.ts` | 410 T2 |
| T2 | Registry test | `registry.test.ts` (below), proven to fail both directions | T1 |
| T3 | Page components | `component-index.tsx`, `component-state.tsx`, `related-components.tsx` | T1 |
| T4 | Prop tables | `props-table.tsx`, `source.config.ts` plugin wiring, a rendered check | T1 |
| T5 | Index page + sidebar order | `content/docs/components/{index.mdx,meta.json}` | T3 |
| T6 | First real page | `content/docs/components/button.mdx` with honest status | 410 T8, primitives workstream |
| T7 | Document the template | `apps/docs/README.md` "Adding a component page" section | T1–T6 |
| T8 | Gates | `nub run check`, `lint`, `test`; commit | T1–T7 |

## 8. Commands and expected results

```sh
nub install
nub run --filter docs check-types   # fumadocs-mdx + tsc; a dangling registry import fails here
nub run --filter docs test          # registry.test.ts
nub run --filter docs build         # prop tables must build; a bad sourcePath fails the build
nub run lint
nub run check
```

| Command | Expected |
| ------- | -------- |
| `check-types` | exit 0; deleting an entry file breaks it (compile error from `registry.ts`) |
| `test` | all registry assertions pass; report the count |
| `build` | exit 0; the component index and the first page render |
| `lint`, `check` | exit 0 |

## 9. Test plan — `registry.test.ts`

Every assertion must be able to fail. The test decodes and cross-checks:

1. **Decodes** every entry through `decodeComponentMeta` — a wrong enum value, a
   missing field or a non-string throws (`Schema` decode error).
2. **Unique slugs** — two entries with the same slug fail.
3. **Unique titles** — two entries with the same display title fail.
4. **`related` resolves** — every slug in `related` exists in the registry.
5. **Status/support coherence** —
   - `status: "done"` requires `gpuix: "yes"`;
   - `status: "unsupported"` requires `gpuix: "no"` and at least one limitation;
   - `status: "wip"` or `"done"` requires a non-null `sourcePath`.
6. **Pages exist** — for every `status` other than `"planned"`, the MDX file
   `content/docs/components/<slug>.mdx` exists on disk.
7. **Source exists** — a non-null `sourcePath` resolves to a real file when the
   `packageName` is a workspace package.
8. **Coverage** — every component row in `COMPONENTS.md` has a registry entry
   (parse the table; if this is too brittle, assert the reverse:
   every registry entry's title appears in `COMPONENTS.md`). At minimum the test
   must fail when a row is added to one and not the other — state which direction it
   guards in the header comment.

Two-direction proof (required, AGENTS §3): set `button.status = "done"` while
`gpuix = "unverified"` and show the test fails; restore and show it passes. Record
both runs.

## 10. STOP conditions

- `fumadocs-typescript` in `5.5.2` does not support a **Vite/macro** setup (only
  Next's remark pipeline) and cannot generate tables in this app. Then: keep the
  metadata + index + `ComponentState` (they do not depend on it), and render prop
  tables from a small, typed `PropsTable` data file co-located with the component
  page, marked "hand-verified against the source at <commit>". Record the limitation
  and the evidence. Do not silently drop the API reference.
- A component package cannot expose a props type with tsdoc. Use the fallback in the
  previous condition for that component only.
- `COMPONENTS.md` and the registry disagree in a way the test cannot resolve. Stop
  and report which row is authoritative; do not edit `COMPONENTS.md` outside the
  docs section.
- The generated sidebar `meta.json` would need a file outside `apps/docs`. Use the
  registry's own ordering in `apps/docs` and record the packaging task.

## 11. Acceptance criteria

- [ ] `schema.ts` is the single typed contract; every entry decodes.
- [ ] `registry.test.ts` guards decode, uniqueness, `related` resolution,
      status/support coherence, page existence and source existence, and has been
      shown to fail in both directions for at least the coherence check.
- [ ] The component index and the sidebar are generated from the registry.
- [ ] `<ComponentState>` renders status, GPUix support, dependencies, related
      components and limitations from the record only.
- [ ] Prop tables come from the real component source via `fumadocs-typescript`, or
      the documented fallback is used and recorded.
- [ ] Adding a component is: one `entries/<slug>.ts` + one MDX page; nothing else
      hand-maintained.
- [ ] The template is documented in `apps/docs/README.md`.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.
