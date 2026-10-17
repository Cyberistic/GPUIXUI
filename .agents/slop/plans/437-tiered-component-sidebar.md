# 437 — The component sidebar names its tiers

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 411, 417, 423, 425, 435, 436

## 1. Why

`MISSION.md` asks for a **clear sidebar**. The component index groups its 49
delivered pages under `Tier N — <group>` headings
(`src/components/component-index.tsx`), but `content/docs/components/meta.json`
is a flat list of 49 slugs. A reader scrolling the sidebar cannot tell where
Tier 1 ends and Tier 2 begins, even though that boundary is the library's own
dependency law.

Fumadocs supports separator nodes in `meta.json`: a page named
`---<title>---` is rendered as a separator
(`fumadocs-core` `dynamic` builder, `/^---(?<name>.+)---$/`). The docs already
depend on that convention nowhere, so this is the first use.

## 2. Measured current state (2026-10-17, `d5954e4`)

- `content/docs/components/meta.json`: `index` followed by 49 slugs, Tier 1
  order then Tier 2 order, with no group markers.
- `src/components/component-index.tsx`: a local `groupTitles` map and the string
  `Tier ${group.tier} — ${groupTitles[group.group] ?? group.group}`.
- `src/component-meta/registry.test.ts` asserts the sidebar equals
  `["index", ...delivered slugs]` exactly (line ~166), so any separator fails
  the suite until the test is taught the contract.
- `src/component-meta/registry.ts` exposes `components` and `groups`; the
  group-title map is not shared.

## 3. Exact changes

### 3.1 `apps/docs/src/component-meta/registry.ts`

Hoist the title rule so the index, the sidebar test and any future consumer
share one source (AGENTS §1: hoist when a second consumer appears):

```ts
/** The heading a tier/group section uses in the index and the sidebar. */
export const groupTitles: Readonly<Record<string, string>> = {
  foundational: "Foundational",
  composition: "Composition and feedback",
  "data-display": "Data presentation",
  workspace: "Desktop workspace",
  specialised: "Specialised",
};

export const tierGroupTitle = (tier: string, group: string): string =>
  `Tier ${tier} — ${groupTitles[group] ?? group}`;
```

### 3.2 `apps/docs/src/components/component-index.tsx`

Delete the local `groupTitles` map and render
`{tierGroupTitle(group.tier, group.group)}`. No visual change to the index.

### 3.3 `apps/docs/content/docs/components/meta.json`

Insert separators at the real group boundaries, keeping the existing order:

```json
{
  "title": "Components",
  "pages": [
    "index",
    "---Tier 1 — Foundational---",
    …every Tier 1 slug, unchanged…
    "---Tier 2 — Composition and feedback---",
    …every Tier 2 slug, unchanged…
  ]
}
```

The separator title is exactly `tierGroupTitle(tier, group)`. Tier 3–5 get a
separator when their first page lands; do not add an empty one.

### 3.4 `apps/docs/src/component-meta/registry.test.ts`

Replace the flat assertion with the tiered contract, derived from the records
(no hard-coded slug list):

```ts
const delivered = components.filter((entry) => entry.status !== "planned");
const sections = delivered.reduce<{ title: string; slugs: string[] }[]>(
  (all, entry) => {
    const title = tierGroupTitle(entry.tier, entry.group);
    const last = all.at(-1);
    return last?.title === title
      ? [...all.slice(0, -1), { ...last, slugs: [...last.slugs, entry.slug] }]
      : [...all, { title, slugs: [entry.slug] }];
  },
  [],
);
const expected = [
  "index",
  ...sections.flatMap((section) => [
    `---${section.title}---`,
    ...section.slugs,
  ]),
];
expect(sidebar.pages).toEqual(expected);
```

This fails when a separator is missing, misspelled or misplaced, and when a
page is missing or out of order. Keep the existing title/status/related guards
untouched.

### 3.5 `apps/docs/src/content.test.ts`

The IA guard resolves every page in a section's sidebar to a file; a separator
is not a file. Add `isSeparator(page)` (`/^---.*---$/`) and skip separator
entries in `resolves every page in each section's own sidebar`. Without this the
correct `meta.json` fails as if it pointed at a missing page.

## 4. Commands and expected results

1. Apply §3.1–§3.2 and §3.4 only (leave `meta.json` flat):
   `nub run --filter docs test` → **FAIL** in
   `component registry > keeps the components sidebar in step with the pages
   that exist`, expected `---Tier 1 — Foundational---` present, received the
   flat list.
2. Apply §3.3.
3. `nub run --filter docs test` → **PASS**, 182 tests (the sidebar assertion
   changed, not the count).
4. `nub run --filter docs check-types` and `nub run --filter docs build` →
   exit 0.
5. `nub run check`, `nub run lint`, `nub run test` at the root → exit 0.
6. Browser: `nub run --filter docs dev`, open `/docs/components` and any
   component page; the sidebar shows `Tier 1 — Foundational` and
   `Tier 2 — Composition and feedback` separators in order, with no empty
   section and no 404. Screenshot checked.

## 5. STOP conditions

- STOP if Fumadocs renders the separator as a broken link or a page (verify in
  the browser, not only in the JSON).
- STOP if the sidebar order would need to change: this plan adds headings, it
  does not reorder pages.
- STOP if the separator title has to differ from the index heading to render;
  report the exact Fumadocs syntax rather than inventing a second naming scheme.

## 6. Test plan and two-direction proof

- The sidebar assertion is the test that can fail. Prove it in both directions:
  run it against the flat `meta.json` first (§4.1) and against the tiered file
  second (§4.3).
- `scripts/verify-two-directions.sh` is jj-based and does not run here
  (`TODO.md`), so record the two commands and outputs in §7.
- No runtime test: navigation is a browser/MDX concern; the browser check in
  §4.6 is the rendered verification, and the registry test is the automated
  contract.

## 7. Completion evidence (2026-10-17)

**Fail first.** With §3.1, §3.2 and §3.4 landed but `meta.json` still flat:

```
FAIL src/component-meta/registry.test.ts > component registry > keeps the components sidebar in step with the pages that exist
- Expected
+ Received
  [
    "index",
+   "---Tier 1 — Foundational---",
    "text",
    …
  ]
```

**Second failure, expected and instructive.** With `meta.json` tiered, the IA
guard failed because it tried to resolve `---Tier 1 — Foundational---` to a
file. §3.5 fixed the guard, not the content.

**Pass after §3.3 + §3.5.** `182 passed (182)`, 31 files. The existing page
count did not change because the assertion was replaced, not added.

**Gates.** `nub run check`, `nub run lint`, `nub run test` and the docs
`check-types` + `build` all exited `0`.

**Browser.** `/docs/components` in headless Chrome shows the two tier
separators in the sidebar, above their own slugs, with no empty section and no
broken link. The component page sidebar shows the same.

## 8. Acceptance

- The sidebar names both delivered tiers at the real boundary, exactly as the
  index does.
- One shared `tierGroupTitle` rule drives the index and the sidebar contract.
- The registry test fails on a missing or misplaced separator and passes on the
  shipped file; all gates are green.
