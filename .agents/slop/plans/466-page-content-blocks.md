# 466 — The page template checks the blocks a page must *keep*, not only the headings it must have

**Phase:** F (docs contract) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 411 (the template and `component-pages.test.ts`), 414 (copyable
source via `<include>`), 415 (the generated API table), 462/465 (the latest
template and truth work)

## 1. Why

`apps/docs/src/component-pages.test.ts` proves three things about every
delivered page: it has the required `## ` headings, it carries
`<ComponentState>`, `<NativePreview>` and `<ComponentDependencies>`, and its
frontmatter title/description equal the registry record. It never reads what is
*inside* a section. So a page can keep `## Usage`, `## API reference` and
`## Source` and render them empty and still pass every gate:

- delete the fenced `tsx` example from **Usage** and `MISSION.md`'s "usage
  example" requirement is unmet, invisibly;
- delete the `<auto-type-table …>` from **API reference** and the page has no
  prop documentation while the template guard stays green;
- delete the `<include …>` from **Source** and "copyable source" (plan 414)
  disappears from the page — `content-references.test.ts` guards the includes a
  page *has*, not that a delivered page still has one.

This is the same failure mode plan 465 fixes for limitations: a guard checks
presence of a marker, not the content the marker stands for. The headings stayed
after the original content moved; only a content check notices.

Measured on this HEAD: all 66 delivered pages already satisfy all three rules
(each Usage fence imports `@gpuixui/…`, each API section has at least one
`<auto-type-table>`, each Source section has an `<include>`). The guard is
therefore a drift guard, not a correction, and it must be shown to fail.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/src/component-pages.test.ts` | Add `sectionBody` and the three content checks (§3). Update the file header comment to name the bug. |
| `apps/docs/README.md` | One sentence under **Adding a component page**: the template guard checks the content blocks, not only the headings. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Tick the docs-site row and advance the count. |

No package, page or record changes: the pages already comply.

## 3. The guard

In `component-pages.test.ts`, add after `headings`:

```ts
/** The body under one `## ` heading, up to the next heading. */
const sectionBody = (document: string, name: string): string => {
  const start = document.indexOf(`## ${name}`);
  if (start < 0) return "";
  const rest = document.slice(start + name.length + 3);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
};
```

Then, in `describe("component page template")`, one test whose problems array
names each failing slug and rule:

```ts
  it("keeps each finished page's example, API table and source", () => {
    const problems = components
      .filter((component) => component.status !== "planned")
      .flatMap((component) => {
        const body = readFileSync(
          join(pageDirectory, `${component.slug}.mdx`),
          "utf8",
        );
        const usage = sectionBody(body, "Usage");
        return [
          /^```(tsx|ts)\b/m.test(usage) && usage.includes("@gpuixui/")
            ? []
            : [`${component.slug}: Usage has no @gpuixui example`],
          sectionBody(body, "API reference").includes("<auto-type-table")
            ? []
            : [`${component.slug}: API reference has no <auto-type-table>`],
          sectionBody(body, "Source").includes("<include")
            ? []
            : [`${component.slug}: Source has no <include>`],
        ].flat();
      });
    expect(problems).toEqual([]);
  });
```

Rules, in words:

1. **Usage** must contain a fenced `tsx`/`ts` block that imports from
   `@gpuixui/` — a runnable snippet of this library, not a decorative fence.
2. **API reference** must contain at least one `<auto-type-table>`, the only
   mechanism that renders real prop docs (plan 415).
3. **Source** must contain at least one `<include>`, the only mechanism that
   renders the real file (plan 414).

`status !== "planned"` matches the existing tests. A planned record has no page.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | 0 failures; 42 files (262 tests once plans 465, 468 and 469 had landed) |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run fmt` | exit 0 |

## 5. STOP conditions

- A delivered page fails one of the three rules: fix that page in the same
  commit and record why it lost the block. Do **not** weaken the rule (a subset
  match, or accepting an empty `<auto-type-table>` list) to make the suite pass.
- Making a page comply would require inventing an example or a props type the
  package does not export: STOP and record it for the owning workstream; an
  invented example is worse than a failing guard.
- The Usage fence legitimately imports only React or a local path (a layout
  illustration, not a component usage): STOP and report the page; this template
  contract assumes every delivered component page shows its own import.

## 6. Test plan (both directions)

1. Delete the `<auto-type-table …>` line from `content/docs/components/badge.mdx`
   → the new test fails with `badge: API reference has no <auto-type-table>`;
   restore → green.
2. Delete the fenced `tsx` block from `content/docs/components/card.mdx`'s
   Usage section → fails with `card: Usage has no @gpuixui example`; restore →
   green.
3. Delete the `<include …>` block from `content/docs/components/timeline.mdx`'s
   Source section → fails with `timeline: Source has no <include>`; restore →
   green.

Record the exact failure messages in §8.

## 7. Acceptance

- The three rules run against every delivered page.
- Each rule is proven to fail on a real page and to pass after restoring it.
- `nub run --filter docs test`, `check-types`, `build`, `nub run check` and
  `nub run lint` pass.
- The change is committed on `agent/docs-site` and pushed.

## 8. Progress (2026-10-18)

- `sectionBody` and the "keeps each finished page's example, API table and
  source" test landed in `component-pages.test.ts`; the header comment names the
  bug (headings-only checking).
- Two-direction proofs, measured and reverted:
  - `badge.mdx` without `<auto-type-table>` → failed with
    `badge: API reference has no <auto-type-table>`;
  - `card.mdx` without its Usage fence → failed with
    `card: Usage has no @gpuixui example`;
  - `timeline.mdx` without `<include>` → failed with
    `timeline: Source has no <include>`.
- `nub run --filter docs test`: 42 files / 262 tests green (measured at
  `359455f`, after plans 465, 468 and 469 had landed); `check-types`, `build`,
  `nub run check`, `nub run lint` and `nub run fmt` green.
- **Plan 469 corrected this plan's guard before it reached a gate.** The first
  version tested the fence with `/^```(tsx|ts)\b/m`; `scripts/check-tests.ts`
  read the leading slash as division and the backticks as template delimiters,
  so `nub run check:tests` rejected the block. The fence is now tested line by
  line (`line.trimStart().startsWith("```tsx")`), with the same failure message
  and the same two-direction proof; the helper lives outside the test body so
  the checker sees one assertion. Plan 469 records the checker's false positive.
- `apps/docs/README.md` states that the template guard checks blocks, not only
  headings.
