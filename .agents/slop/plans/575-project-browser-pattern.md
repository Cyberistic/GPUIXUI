# 575 — Project browser: a search-and-filter pattern on the live surface

**Phase:** F · **Owner:** docs-site · **Status:** planned
**Depends on:** 410, 412, 427, 455, 456, 486, 493, 503, 517, 521, 522, 523, 573

## 1. Why this plan exists

`/docs/patterns` composes three real tasks: a settings form (type-checked, never
launched), a confirmation flow and a command palette. None of them proves the
most ordinary desktop task there is: **type into a field, the collection
filters, open a row**. That is the "filtering/search" interaction `MISSION.md`
lists, and it is buildable today from delivered components:

- `SearchInput` reports every edit and owns clear/Enter/Escape;
- `List` / `ListItem` own single selection, a roving tab stop and `onActivate`;
- `EmptyState` is the honest no-match panel;
- `Card`, `Badge`, `Button`, `Stack`, `Text` supply the surface.

It is deliberately a **list**, not a table. `packages/data-grid` does not exist,
and a docs-owned grid would be the placeholder `MISSION.md` forbids. The page
says so, and links the roadmap.

The pattern is also the fourth composed live scene. Its gesture has two phases
— filter, then open — so it exercises `SceneStep.fill`, `SceneStep["click-text"]`
and the per-step milestone contract added in plan 573.

## 2. Current state (measured 2026-10-19, `ab868322`)

- `LIVE_SCENES` has 48 keys: 45 record scenes plus `showcase`,
  `confirmation-flow` and `command-palette`. `preview-gaps.test.ts` derives the
  45 / 3 split, the 25 gesture scenes and every prose total from the table.
- `SceneStep` supports `click`, `click-text`, `hover`, `press`, `fill` and
  `wheel`; `SCENE_STEP_TEXT` asserts an intermediate expectation (Form).
- `SearchInput` is controlled/uncontrolled and forwards `testId` to the
  `<input>`; `List` with `selectionMode="single"` accepts `value`,
  `onValueChange` and `onActivate`; `ListItem` renders `ListItemTitle` /
  `ListItemDescription` and a `trailing` slot; `EmptyState` takes an `action`.
- The pattern contract (`src/pattern-pages.test.ts`) requires
  `## The task`, `## Composition`, `## State`, `## What is verified`,
  `## Source` and `## Related`, a real `<include>`, sidebar + index links, and
  every `nub run --filter` command to exist.
- `smoke:preview` drives every `LIVE_SCENES` key standalone and on
  `SCENE_PAGE[scene] ?? /docs/components/<scene>`.

## 3. Files

### Create

| File | Responsibility |
| ---- | -------------- |
| `apps/docs/preview/patterns/project-browser-logic.ts` | the pure filter rule and the project data type |
| `apps/docs/preview/patterns/project-browser.tsx` | the real composition (Card + SearchInput + List + EmptyState + Badge) |
| `apps/docs/src/components/preview/project-browser-logic.test.ts` | the rule's unit suite |
| `apps/docs/content/docs/patterns/project-browser.mdx` | the pattern page |

### Change

| File | Change |
| ---- | ------ |
| `apps/docs/preview/scenes.ts` | `project-browser` in `LIVE_SCENES`; `SCENE_TEXT`, `SCENE_PAGE`, `SCENE_LABEL`, `SCENE_GESTURE`, `SCENE_INTERACTION`, `SCENE_STEP_TEXT` |
| `apps/docs/preview/scene-views.tsx` | import the composition and add it to `LIVE_SCENE_VIEWS` |
| `apps/docs/content/docs/patterns/meta.json` | sidebar entry after `command-palette` |
| `apps/docs/content/docs/patterns/index.mdx` | a fourth pattern section |
| `apps/docs/content/docs/component-pages.mdx` | 49 scenes; three pattern pages; the new file in the mechanism table |
| `apps/docs/README.md` | the composed-scene sentence: three pattern screens |
| `docs/preview-strategy.md` | tier-L composed names, 49/45/four/26 totals, the gesture row |
| `apps/docs/src/lib/search.test.ts` | one integration query for the new page |
| `.agents/slop/plans/README.md` | this plan's row |
| `TODO.md` | the workstream task and the updated progress count |

## 4. The composition

### 4.1 Data and rule — `project-browser-logic.ts`

```ts
export interface SearchableProject {
  readonly name: string;
  readonly description: string;
}

export const matchesProject = (
  project: SearchableProject,
  query: string,
): boolean => {
  const needle = Str.toLowerCase(Str.trim(query));
  return (
    needle === "" ||
    Str.includes(needle)(
      Str.toLowerCase(`${project.name} ${project.description}`),
    )
  );
};

export const filterProjects = <A extends SearchableProject>(
  projects: ReadonlyArray<A>,
  query: string,
): ReadonlyArray<A> => Arr.filter(projects, (project) => matchesProject(project, query));
```

Use `effect/Array` and `effect/String` (`preview/` already imports Effect —
`confirmation-flow.tsx` imports `Duration`). No `any`, no native `filter`.

Data (six fixed projects; lower-case typing must match the capitalised names):

| id | name | description | badge |
| -- | ---- | ----------- | ----- |
| `atlas` | Atlas | Design tokens and the component library | `warning` — Needs attention |
| `beacon` | Beacon | Release automation and smoke reports | `success` — On track |
| `cinder` | Cinder | Desktop editor shell | `warning` — Needs attention |
| `delta` | Delta | Documentation site and previews | `success` — On track |
| `ember` | Ember | Archive of the first prototype | `neutral` — Archived |
| `fjord` | Fjord | Workspace layout experiments | `success` — On track |

### 4.2 Component — `project-browser.tsx`

`/** @jsxImportSource @gpuix/react */` at the top, imports by subpath
(`@gpuixui/components/card`, `.../badge`, `.../empty-state`, `.../list`,
`.../search-input`) plus `Button`, `Stack`, `Text` from primitives.

State:

- `query` (`useState("")`) — controlled by `SearchInput` `value` /
  `onValueChange`; test id `scene-project-search`.
- `opened` (`useState<string | null>(null)`) — set by `List` `onActivate`.
- `selected` (`useState("atlas")`) — controlled single selection.

Render:

1. `Card` → `CardHeader` / `CardTitle` "Projects" / `CardDescription` with the
   count: all rows → `6 projects`; filtered → `1 of 6 projects`.
2. `SearchInput` with `placeholder="Filter projects…"`, `onClear` clearing the
   query.
3. When `matches.length === 0`, `EmptyState` title `No projects match` with a
   `Button` `testId="scene-project-clear"` that clears the query. Otherwise a
   `List testId="scene-project-list" selectionMode="single"` with one
   `ListItem` per match, `textValue={name}`, `trailing` a `Badge`, and the
   description under the title.
4. After activation, `Text testId="scene-project-status"` exactly
   `Opened Atlas` (template literal from the opened name is fine, but the
   literal must occur in the source for the contract guard).

The component must not paint `Opened Atlas` before a row is activated, and must
not paint `1 of 6 projects` before the query is non-empty.

### 4.3 Scene tables — `preview/scenes.ts`

| Export | Value |
| ------ | ----- |
| `LIVE_SCENES` | append `"project-browser"` |
| `SCENE_TEXT` | `project-browser: "Opened Atlas"` |
| `SCENE_PAGE` | `"project-browser": "/docs/patterns/project-browser"` |
| `SCENE_LABEL` | `{ scene: "project-browser", title: "Project browser" }` |
| `SCENE_GESTURE` | `[{ kind: "fill", testId: "scene-project-search", text: "atlas" }, { kind: "click-text", text: "Atlas", within: "scene-project-list" }]` |
| `SCENE_INTERACTION` | `"Type a project name, then open the match."` |
| `SCENE_STEP_TEXT` | `project-browser: { 1: "1 of 6 projects" }` |

The instruction must not contain `Opened Atlas` or `1 of 6 projects`
(`scene-contract.test.ts` enforces both).

### 4.4 Page — `content/docs/patterns/project-browser.mdx`

Frontmatter: `title: Project browser`, `description: A searchable project list
that filters as you type and opens the match.`

Sections (exact headings, in this order):

1. `## The task` — find a project by name or description and open it; state
   that it is a composition of delivered components, **not** a data-grid.
2. `## Composition` — `<LiveSurface scene="project-browser" title="Project browser" />`
   then the parts list (`SearchInput`, `List`, `ListItem`, `EmptyState`, `Card`,
   `Badge`, `Button`, `Stack`, `Text`) and the file location.
3. `## State` — query, selection and the opened row; `SearchInput` owns the
   clear/Enter, `List` owns the roving focus, the page owns the filter and the
   route/data-grid distinction.
4. `## What is verified` — the `smoke:preview` rows (filter then open, absent
   before / present after), the package suites (search-input, list, empty-state),
   and the docs unit suite (the rule, the page contract). Limits: no async
   query, no persistence, no table columns; `@gpuixui/data-grid` is planned.
5. `## Source` — two `<include>` blocks:
   `../../../preview/patterns/project-browser.tsx` and
   `../../../preview/patterns/project-browser-logic.ts`.
6. `## Related` — Search input, List, Empty state, Patterns, Command palette,
   Roadmap.

`content/docs/patterns/meta.json` appends `project-browser`; `index.mdx` adds a
"Project browser" section with a link. Every page on disk is ordered by
`content.test.ts`.

## 5. Derived totals — update every document, never remember a number

After the change the tables derive:

- `LIVE_SCENES.length` = **49**
- record scenes = **45**
- composed scenes = **4** (Showcase + three patterns)
- pattern scenes = **3**
- gesture scenes = **26**

Update exactly these prose facts (the guards derive and compare them):

| File | Old | New |
| ---- | --- | --- |
| `docs/preview-strategy.md` | `25 more are opened` | `26 more are opened` |
| same | `**48 scenes ship today**: 45 … and three are composed pages (Showcase, the confirmation-flow pattern and the command-palette pattern)` | `**49 scenes ship today**: 45 … and four are composed pages (Showcase, the confirmation-flow pattern, the command-palette pattern and the project-browser pattern)` |
| same | `The three composed pages (Showcase, the confirmation-flow pattern and the command-palette pattern)` | `The four composed pages (Showcase, the confirmation-flow pattern, the command-palette pattern and the project-browser pattern)` |
| same | `25 scenes document state only a gesture produces` | `26 scenes document state only a gesture produces` |
| same | gesture table | add `| Project browser | type a project name, then open the match | the list filters to the match and a row opens |` |
| `apps/docs/content/docs/component-pages.mdx` | `48 scenes today` … `the two pattern pages` | `49 scenes today` … `the three pattern pages`; add the new file row |
| `apps/docs/README.md` | `(45 today), plus the Showcase page and the two composed pattern screens` | `(45 today), plus the Showcase page and the three composed pattern screens` |

Do **not** add `Project browser` to the tier-L `declares a \`liveScene\` (...)`
list: that list is exactly the record scenes (`preview-gaps.test.ts` compares it
with the registry).

## 6. Test plan

### 6.1 The rule — `project-browser-logic.test.ts`

Header names the bugs guarded: a case-sensitive match would make the typed
lower-case gesture miss `Atlas`; a name-only haystack would miss a description
search; an untrimmed query would hide everything after a trailing space.

Cases:

1. an empty and a whitespace-only query return every project (and the same
   array order);
2. `atlas` matches `Atlas` (case-insensitive) and `atlas` alone;
3. `release` matches Beacon by its **description**;
4. ` zzz ` returns `[]`;
5. two matches keep their input order.

**Two-direction proof:** temporarily remove `Str.toLowerCase` from the haystack
→ case test fails; temporarily use only `project.name` → description test
fails. Record both measured runs in §8, then revert.

### 6.2 Automatic guards (must fail before the tables are complete)

- `scene-contract.test.ts`: every key has `SCENE_TEXT`; the text occurs in the
  composed source; the test ids and `Atlas` occur inside `scene-project-list`;
  the milestone is at a real step, is not the final text and is not in the
  instruction; `SCENE_INTERACTION` exists exactly for gesture scenes.
- `preview-gaps.test.ts`: tier row, gesture row, 49/45/four/26 totals, README
  and component-pages totals.
- `pattern-pages.test.ts`: six headings, both includes exist, sidebar + index,
  the smoke command exists, no placeholder prose.
- `content.test.ts` / `source-completeness.test.ts`: the new page is on disk,
  in the sidebar, and in `source`.
- `search.test.ts`: add `expect((await search("project browser", 5)).map(r => r.url)).toContain("/docs/patterns/project-browser")`.

### 6.3 Commands

Run from the worktree root, in this order:

```sh
nub run --filter docs test          # expect every file pass; the new logic file included
nub run --filter docs check-types   # expect exit 0
nub run --filter docs build         # expect the production bundle, 98 routes
nub run --filter docs smoke:build   # expect "pages 98 checked", exit 0
nub run --filter docs smoke:preview # expect 49 scenes + 49 pages, scene project-browser opened by 2 steps, exit 0
nub run check                       # expect the test-quality, lint, format and type gates green
nub run lint
nub run test
```

`smoke:preview` runs real time in Chrome (the renderer canvas is black under
virtual time) and usually takes several minutes. Exit `2` means Chrome or the
preview build was missing; that is **unverified**, not a pass. Record the exact
output line for `project-browser` (canvas size, text nodes) in §8.

## 7. STOP conditions

- **STOP** if the composition needs a table, virtualisation or a `data-grid`
  package. The page is a list and says so; do not fake a grid.
- **STOP** if the filter cannot be driven through `fill` (for example the field
  does not forward `testId`). Do not replace the gesture with a prop that
  pre-filters the list; that would make the before/after proof vacuous.
- **STOP** if `click-text` cannot target `Atlas` inside `scene-project-list`.
  Do not target the page's prose or the search field; fix the row's painted
  text or the scope instead.
- **STOP** if `smoke:preview` exits `2`. Report Chrome/wasm missing; do not tick
  the task.
- **STOP** if a guard's expected count differs from §5. Re-derive it from the
  registry; never hard-code around the guard.
- **STOP** if a change would be needed outside `apps/docs`, `docs/preview-strategy.md`,
  `.agents/slop/plans/` or `TODO.md`. Record it in `TODO.md` instead.

## 8. Measured results (executor fills this in)

- Logic suite: _(pending)_
- Forced defect 1 (drop lower-casing): _(pending)_
- Forced defect 2 (name-only filter): _(pending)_
- `smoke:preview` `project-browser`: _(pending — canvas, text nodes, steps)_
- `smoke:build`: _(pending — page count)_
- Root gates: _(pending)_

## 9. Acceptance criteria

- `/docs/patterns/project-browser` is in the sidebar, the patterns index and
  search; every required section, both source includes and the six-part
  contract pass.
- The live scene filters the six rows to `1 of 6 projects` after typing and
  paints `Opened Atlas` only after the row is activated; the smoke proves both
  halves.
- The four composed scenes, 49 total scenes, 26 gesture scenes and 45 record
  scenes are stated by the derived guards, not by memory.
- `nub run --filter docs test`, `check-types`, `build`, `smoke:build`,
  `smoke:preview` and the root `check`, `lint`, `test` gates are green, or the
  exact unverified reason is recorded.
- The plan index row is `implemented`, and the `TODO.md` task is ticked with
  the measured proof.
