# 422 — the first real component page: Buttons

- **Workstream:** docs-site
- **Phase:** B/C — the end of "the docs shell documents a working component"
- **Owns:** `apps/docs/content/docs/components/**`, `apps/docs/src/component-meta/entries.ts`,
  `apps/docs/src/components/related-components.tsx`, `apps/docs/src/component-pages.test.ts`,
  `apps/docs/README.md`, `TODO.md`, this plan and the plan index
- **Depends on:** plan `411` (the page template and registry), plan `412` (preview tiers),
  plan `414` (copyable source), plan `415` (API tables), and the primitives workstream's
  plan `047` (the real Button: code, tests, example, in-package page)
- **Depended on by:** every later component page, which copies this one's shape

This is the cross-team row `Document the first real component page` in `TODO.md`.
The primitives workstream says explicitly that the `apps/docs` pages stay with the
docs-site workstream (plan 047, `TODO.md` "docs-site pages are still pending").

---

## 1. Goal

Prove the whole documentation chain on one component that really exists:

```
registry record -> index + sidebar -> page -> <ComponentState> + <NativePreview>
                -> <auto-type-table> from real props -> <include> of real source
                -> a realistic example included from the package
```

The page is **Buttons** (`slug: button`), the primitive shipped in
`packages/primitives/src/components/Button.tsx` and runtime-verified by the
primitives workstream. Nothing is invented: every claim is traceable to that
source, `packages/primitives/docs/button.mdx` or the `COMPONENTS.md` row.

## 2. Why the package must be in this tree first

`<auto-type-table>` and `<include>` read real files at build time (plans 414 and
415). The component source is on `origin/agent/primitives`, not on this branch.
The docs page cannot be honest against a path that does not exist, so step 1 is
the documented cross-team handoff: merge the primitives branch. That is an
**integration**, not an edit of another workstream's files.

- Merge `origin/agent/primitives` into `agent/docs-site`; do not modify anything
  under `packages/primitives` or `packages/icons`.
- If the merge conflicts in `TODO.md`, `COMPONENTS.md` or the plan index, resolve
  by keeping **both** workstreams' rows. Never drop a row to make the merge small.
- If the merged tree fails a gate for a reason inside `packages/primitives`,
  **STOP** and record the failing command and error. Do not fix another
  workstream's code from here.

## 3. The record

`apps/docs/src/component-meta/entries.ts` — replace the `planned("button", …)`
call with a real record, keeping its position so the tier/group order test still
holds:

```ts
{
  slug: "button",
  title: "Buttons",
  tier: "1",
  group: "foundational",
  status: "wip",
  gpuix: "yes",
  summary: "Triggers an action; the primary interactive control.",
  packageName: "@gpuixui/primitives",
  sourcePath: "packages/primitives/src/components/Button.tsx",
  dependencies: [],
  related: ["button-group"],
  playgroundScreen: null,
  screenshots: [],
  limitations: [
    "No focusVisible: the focus ring cannot distinguish pointer from keyboard focus.",
    "No aria-disabled, aria-pressed or toggle state; a disabled button leaves the tab order.",
    "An icon-only button must pass label; the component cannot infer one.",
    "No native button element: the runtime renders a div with role and handlers.",
  ],
},
```

- `status: "wip"`, not `"done"`: the primitives plan marks every Tier 1 row `wip`
  until the playground can show it. `gpuix: "yes"` is accurate — the runtime
  supports every host feature the component uses, and the primitives runtime suite
  proves the interaction.
- `playgroundScreen: null` and `screenshots: []` are honest: the playground has no
  per-component screen yet (`TODO.md` cross-team row). The preview therefore lands
  on tier **X**; do not invent a screen, a PNG or a browser approximation.

## 4. The page

Create `apps/docs/content/docs/components/button.mdx` with the plan 411 template,
in order. The required headings are exactly:

`Usage`, `Variants`, `Sizes`, `States`, `Composition`, `API reference`,
`Keyboard and focus`, `Theming`, `Accessibility and limitations`, `Source`,
`Related`.

Content rules:

1. Frontmatter `title` equals the registry `title` ("Buttons") and `description`
   equals the registry `summary`; the page cannot drift from the index.
2. Open with `<ComponentState slug="button" />` and `<NativePreview slug="button" />`.
3. `Usage`: a short, realistic TSX snippet importing from `@gpuixui/primitives`.
4. `Variants`: the six real variants from `core/variants.ts`
   (`primary`, `secondary`, `outline`, `ghost`, `destructive`, `link`) and what
   each paints.
5. `Sizes`: `sm` / `md` / `lg` from `density`, plus `square` and `fullWidth`.
6. `States`: disabled, loading (busy, still focusable), focus.
7. `Composition`: include the real, runtime-mounted form example
   `packages/primitives/examples/form.example.tsx` with `<include>`, and say what
   it demonstrates (save/cancel, busy state, progress).
8. `API reference`: `<auto-type-table path="../../../../../packages/primitives/src/components/Button.tsx" name="ButtonProps" />`.
9. `Keyboard and focus`: Enter on key down; Space on key up; held keys ignored;
   disabled/loading refuse activation; no `focusVisible`.
10. `Theming`: `controlStyle` / `buttonVariants` resolve colour **roles** and
    `density`; no literals.
11. `Accessibility and limitations`: role `button`, name from `label`/text,
    `aria-description="Loading"`; the four recorded limitations.
12. `Source`: `<include lang="tsx" meta='title="packages/primitives/src/components/Button.tsx"'>`
    around the real path (five `../` segments from `content/docs/components/`).
    Paired tags only — a self-closing include renders nothing.
13. `Related`: `<RelatedComponents slug="button" />`.

## 5. The related-link truth fix

`RelatedComponents` currently links every related slug. `button` relates to
`button-group`, which is still `planned` and has no page, so the link would 404.
Change the component (docs-site path) so:

- a related record that is `planned` renders as a **plain label** with
  "(planned)" — no link;
- a non-planned record renders the existing `Link`.

This is not cosmetic: it is the first page exposing the bug, and the same bug
would multiply across every later page. Add a test that fails on the old
behaviour.

## 6. Exact files

```
A .agents/slop/plans/422-first-real-component-page.md     (this plan)
M .agents/slop/plans/README.md                            index this plan
M apps/docs/src/component-meta/entries.ts                 the button record
M apps/docs/content/docs/components/meta.json             pages: ["index", "button"]
A apps/docs/content/docs/components/button.mdx            the page
M apps/docs/src/components/related-components.tsx         planned -> label, not link
A apps/docs/src/components/related-components.test.tsx    the 404 guard
M apps/docs/src/component-pages.test.ts                   title/description agree with registry
M apps/docs/README.md                                     the first page + related-link rule
M TODO.md                                                 tick the two first-page rows
```

No other path. `packages/**` is merged, never edited.

## 7. Commands and expected results

From the worktree root, in order:

```sh
git fetch origin && git merge origin/master
# expect: clean merge (or resolve ledgers keeping both sides)
git merge origin/agent/primitives
# expect: clean merge apart from ledger conflicts; resolve keeping both

nub install
# expect: exit 0; @gpuixui/primitives and @gpuixui/icons linked

nub run --filter docs test
# expect: every suite passes, including the new related-link test and the
#         page contract (no "missing section", no "generated no props")

nub run --filter docs check-types
# expect: fumadocs-mdx generate + tsc --noEmit, 0 errors

nub run --filter docs build
# expect: exit 0; the SSR bundle includes the component page

nub run check
nub run lint
nub run test
# expect: the repo gates pass; report the exact counts
```

Browser check (the app's own verification standard, plans 410/413):

```sh
nub run --filter docs dev
```

- open `/docs/components/button`: one `<h1>Buttons</h1>`, the status block says
  `wip`, the API table has the ButtonProps rows, the source block is highlighted
  and copyable, the form example is present;
- the sidebar shows Components → Buttons;
- `/docs/components` lists Buttons with status `wip`;
- `/sitemap.xml` includes the new URL;
- `/api/search?query=button` returns the page (or the planned registry result —
  whichever the search adapter's contract says; assert it names Buttons).

## 8. Test plan

| Test | File | What it must catch |
| ---- | ---- | ------------------ |
| Page has every required section and both blocks | `component-pages.test.ts` (existing) | a page that builds but silently lacks the API table or preview |
| Frontmatter equals the registry | `component-pages.test.ts` (new assertion) | a page whose title/description drift from the index |
| Source and type-table paths resolve and generate props | `content-references.test.ts` (existing) | a renamed file, a typo in `ButtonProps`, a self-closing include |
| Sidebar equals index + every non-planned slug | `registry.test.ts` (existing) | a page added without `meta.json`, or the reverse |
| Planned related records are not links | `related-components.test.tsx` (new) | the 404 the old component rendered for `button-group` |

### Two-direction proof (required before "done")

1. **Break:** remove the `## Keyboard and focus` heading (or change the
   frontmatter title) and run `nub run --filter docs test`; record the failing
   assertion.
2. **Restore:** put it back and rerun; record the pass.
3. **Break the 404 guard:** restore the old unconditional `<Link>` for planned
   records and show `related-components.test.tsx` fails; restore and pass.
4. Record both runs, with counts, in §10 below and in the commit message.

## 9. STOP conditions

- The primitives merge cannot be completed without editing another workstream's
  source → stop and report the conflicting paths.
- `ButtonProps` generates zero rows, or `fumadocs-typescript` cannot resolve a
  type imported by it → record the exact output; do not replace the real table
  with a hand-written prop list.
- The generated page fails `docs build` for a reason in the page → fix the page;
  if the failure is in another workspace, stop and report it.
- The only way to fill a section is to invent a prop, a state or a capability →
  write what is true, including "none" or "not applicable", rather than deleting
  the section or guessing.
- No screenshot or playground screen exists → tier X stays. Do not add a fake
  image, and do not point `playgroundScreen` at an unrelated scenario.
- A gate fails outside `apps/docs` after the merge → stop, report the workspace
  and command; do not weaken a gate.

## 10. Acceptance criteria and evidence

- [ ] The primitives package is in the tree through a merge, not a copy.
- [ ] The Buttons record is real (`wip`, real `sourcePath`, limitations).
- [ ] The page has every template section, both blocks, a generated API table,
      the real source include and the real form example.
- [ ] `related-components.test.tsx` proves a planned related record renders no
      link.
- [ ] The page appears in the sidebar, the index and the sitemap; it is reachable
      in the built site.
- [ ] `docs test`, `docs check-types`, `docs build`, `nub run check`,
      `nub run lint`, `nub run test` all pass, with counts recorded.
- [ ] `TODO.md` rows are ticked and the plan index is current.
- [ ] Evidence: merge commit, gate output, two-direction proof, browser URLs.

### §10.1 Evidence (filled by the executor)

- Merge:
- Gates:
- Two-direction proof:
- Browser check:
