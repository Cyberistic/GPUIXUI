# 488 — Extension instructions: the primitives core and a worked component

**Phase:** F (extension docs) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410 (site), 030/041 (primitives and its `core/` layer),
021/023 (tokens seam), 487 (the component-page template)

## 1. Why

`MISSION.md` requires "clear install, usage, **contribution and extension**
instructions" and calls the library "independently branded, maintainable and
**extensible**". Plan 487 closed the contribution half (how to document a
component). The extension half is still missing:

- `@gpuixui/primitives` publishes a second entry point, `./core`, and its
  `index.ts` exports **every** decision helper — keyboard contracts, controlled
  state, the value/number/OTP/rating arithmetic, layout resolution, selection
  and loading metrics, the style resolvers, the variant tables.
- The site names those modules only in passing (`core/value.ts` on the Slider
  page, `core/keyboard.ts` on Component API) and has no page that says what the
  layer is for, what each module decides, or how a component is built on it.
- A consumer or contributor who wants to add a component has to read the
  package's source, and nothing fails when a new core module is added with no
  documentation.

The fix is one page, `/docs/extending`, built from the **real module list** so
it cannot silently omit a module, with real source includes instead of pasted
code, and a guard that fails when the core layer grows.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/extending.mdx` | New page: the two layers, the module map, the public surface, a worked component, where a decision belongs, a theme, how to verify, related links. |
| `apps/docs/content/docs/meta.json` | Add `"extending"` after `"contributing"`. |
| `apps/docs/src/extending.test.ts` | New guard (see §4). |
| `apps/docs/content/docs/architecture.mdx` | One paragraph linking `/docs/extending` for the core layer. |
| `apps/docs/content/docs/api-reference.mdx` | One sentence linking `/docs/extending` for the non-component exports. |
| `apps/docs/content/docs/component-api.mdx` | One sentence linking `/docs/extending` as the extension path. |
| `apps/docs/README.md` | One line under `## Authoring` naming the extension page. |
| `.agents/slop/plans/README.md` | Index this plan. |
| `TODO.md` | Add and tick the row; keep the docs progress bar current. |

No path outside the workstream changes: `packages/*`, `docs/` and `LICENSES/`
are read, never edited.

## 3. The page

Slug `/docs/extending`, title `Extending`, description `The primitives core,
and how a component is built on it.`

Sections, in order:

1. **The two layers** — `core/` decides, `components/` renders (the D13 rule:
   behaviour lives in pure modules so it is provable without a GPUix window).
   Name the consequence honestly: the runtime is still the only proof of paint,
   focus and events (tier N/S/V).
2. **The core modules** — a table of module → what it decides, one row per real
   `packages/primitives/src/core/*.ts` module (twelve today). This table is the
   contract the guard checks.
3. **The public surface** — `<include>` of
   `packages/primitives/src/core/index.ts`: the exact exports, including the
   fact that `core/` is also published as `@gpuixui/primitives/core`.
4. **A worked component** — `<include>` of
   `packages/primitives/src/components/Toggle.tsx`, with a walk-through that
   maps each concern to the module it comes from: `decideActivation`, the
   `pressedValueText` accessibility workaround, `controlStyle` /
   `controlFocusStyle`, `toggleVariants`, `useControlState` / `useFocus`, and
   what the component deliberately does not own.
5. **Where a decision goes** — the placement rules: pure behaviour → a `core/`
   module with a unit test; React-local wiring (refs, focus, intervals) → the
   component; paint → `core/style.ts`; a variant name → `core/variants.ts`;
   never a colour, space or radius literal.
6. **A theme, not a rewrite** — link Theming and Tokens API, and include
   `packages/tokens/src/brand-theme.example.ts` so the extension mechanism is
   shown, not described.
7. **Verify it** — a table of the four layers with their exact commands:
   `nub run --filter @gpuixui/primitives test` (pure), `... test:runtime` (the
   real `TestRenderer`), `... --filter playground build` + the smoke runner, and
   `nub run --filter docs test` (this page's own guard). A component page is
   not done until all four apply.
8. **Related** — Architecture, Component pages, Component API, Contributing.

The page names only real files and real scripts. It does not paste a fake
component.

## 4. Test plan — `apps/docs/src/extending.test.ts`

`node:fs`/`node:path` are deliberate, as in `content.test.ts` and
`pattern-pages.test.ts`: this is a browser app whose tests read the content tree
directly, and the Effect runtime must not reach its bundle.

| Test | Failure it must catch | Derivation |
| ---- | --------------------- | ---------- |
| names every core module and no other | a new `core/*.ts` module ships undocumented, or a deleted module stays on the page | `readdirSync(packages/primitives/src/core)` filtered to `.ts`, not `*.test.ts`, not `index.ts`, compared with the backticked module names in the page's module table |
| includes the real public surface and examples | an include is deleted or points at a path that moved; a self-closing `<include>` renders nothing | parse paired `<include>` bodies, resolve each against the page directory, assert they exist and that `core/index.ts`, `Toggle.tsx` and `brand-theme.example.ts` are among them |
| names verification commands every package defines | a renamed script (`test:runtime`, `test`, `build`) leaves a command that fails for the reader | parse `nub run --filter <package> <script>`, resolve `<package>` against every workspace `package.json`, assert the script exists |
| links the page from the three places that describe the layers | the page exists but nothing routes a reader to it | read `architecture.mdx`, `api-reference.mdx`, `component-api.mdx`; each must contain `/docs/extending` |
| ships no placeholder prose | a "coming soon" promise replaces a real module row | the word list `coming soon|TBD|TODO|FIXME` |

Two-direction proofs (run, record in §7):

1. Delete the `value.ts` row from the module table → test 1 fails naming
   `value.ts`.
2. Add a `gone.ts` row → test 1 fails naming `gone.ts` (so the guard is not a
   one-way subset check).
3. Remove the `Toggle.tsx` include → test 2 fails naming the file.
4. Rename `test:runtime` to `test:runtime-x` on the page → test 3 fails.
5. Remove the `/docs/extending` link from `architecture.mdx` → test 4 fails.

## 5. Commands and expected results

| Command | Expected |
| ---- | -------- |
| `nub run --filter docs test` | pass; each proof above fails when applied |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0` |
| `nub run --filter docs smoke:build` | exit `0`; `/docs/extending` is crawled as one more sitemap page and is searchable |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 6. STOP conditions

- A module under `packages/primitives/src/core/` has no honest one-line purpose
  (it would need invented prose): stop and document the module's real header
  comment instead of guessing.
- A command the page names is not defined by a workspace package: stop; name
  the real script or drop the row. Never publish a command a reader cannot run.
- The page would need a component that does not exist: stop; use `Toggle`, the
  smallest delivered component that composes the layer.
- `core/` stops being exported from `@gpuixui/primitives`: stop; the page's
  public-surface claim is false until the package changes.

## 7. Progress (2026-10-18)

- Landed `content/docs/extending.mdx`, the `meta.json` entry, the three
  cross-links (`architecture`, `api-reference`, `component-api`), the README
  line and `src/extending.test.ts` (7 tests).
- Two-direction proofs, measured:
  1. deleting the `value.ts` row failed `names every core module, and only real
     ones` (`expected [ 'keyboard.ts', 'layout.ts', …(9) ] to deeply equal
     [… …(10) ]`);
  2. adding a `gone.ts` row failed the same test with `+ "gone.ts"`;
  3. removing the `Toggle.tsx` include failed `includes the real public surface
     and examples` with that path;
  4. renaming `test:runtime` to `test:runtime-x` failed `names verification
     commands every package defines` with `@gpuixui/primitives has no
     test:runtime-x script`. This proof found a real guard bug: the command
     regex stopped at `-`, so a renamed script still resolved. It now uses
     `[\w:-]+`, as `pattern-pages.test.ts` does.
  5. removing the link from `architecture.mdx` failed `is linked from the three
     pages that describe the layers` with `+ "architecture.mdx"`.
  Restoring each passed; no test was weakened.
- `nub run --filter docs test`: 48 files / 311 tests, exit `0`.
- `nub run --filter docs smoke:build`: 88 pages / 107 links, exit `0`.
- A rendered `/docs/extending` was fetched from the production build: the page
  paints its `<h1>`, and all three `<include>` blocks render their files
  (`packages/primitives/src/core/index.ts`, `Toggle.tsx`,
  `brand-theme.example.ts`) — checked in the served HTML, because a bad include
  renders nothing and the build still succeeds.
- `nub run check` (test-quality, lint, format, types): exit `0`.

## 8. Acceptance

- `/docs/extending` explains the core layer, names every real core module, shows
  the public surface, the real `Toggle` source and the theme example, and names
  commands that exist.
- The guard is proven in both directions for every rule.
- The page is in the sidebar, sitemap, search index and the three pages that
  discuss the layers; `TODO.md` and the plan index are current; the commit is
  pushed on `agent/docs-site`.
