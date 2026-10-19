# 580 — A part name ranks its component first

**Phase:** F (search quality) · **Workstream:** docs-site · **Depends on:** 411,
419, 441, 442, 479, 481, 500, 561, 566

## 1. The measured defect

Plan 481 made every declared part name (`DialogTitle`, `CardTitle`,
`FieldError`, …) *findable*: the registry document contains it, so the component
page appears somewhere in the answer. It did not make the part name a **name**
for ranking.

`src/lib/search.ts` ranks a component by `componentRank`, which reads the
record's title, the symbols its props types imply (`componentSymbols`) and the
reader aliases — never `record.parts`. A part-name query therefore leaves the
component at `Number.POSITIVE_INFINITY` while the Fumadocs page index returns
authored chunks that merely mention the name.

Measured on `agent/docs-site` at `e0aa85f3` with the throwaway audit that became
§4's guard:

| Query | First result | Component page |
| ----- | ------------ | -------------- |
| `CardTitle` | `/docs/components/card#accessibility-and-limitations` | second |
| `CardDescription` | `/docs/components/card#usage` | second |
| `CardContent` | `/docs/patterns/project-browser#composition` | third |
| `FieldDescription` | `/docs/components/inline-validation#usage` | second |
| `FieldError` | `/docs/components/inline-validation#usage` | second |
| `DialogClose` | `/docs/components/dialog#state-and-ownership` | second |
| `CollapsibleContent` | `/docs/components/collapsible#state-and-ownership` | second |
| `BreadcrumbPage` | `/docs/components/breadcrumb#states` | second |
| `DropdownMenuGroup` | its own `#dropdownmenugroup` heading | second |
| `ContextMenuGroup` | its own `#contextmenugroup` heading | second |

`DialogTitle`, titles, props types and aliases already reached the base page
first, which is why the existing spot checks passed.

A reader who types the export they import should land on the page that documents
it, not on a paragraph in the limitations list that happens to name it.

One name is genuinely shared: `MenuGroupProps` is documented by **Dropdown
menus** and **Context menus**, and both re-export `MenuGroup` from
`packages/components/src/menu/item.tsx`. A shared name cannot honestly pick one
page; the guard requires *one of its owning pages*, not a specific one.

## 2. The change

### 2.1 `apps/docs/src/lib/search.ts`

Add one derived list and use it in `componentRank`:

```ts
const componentNames = (
  component: Pick<ComponentMetaInput, "title" | "api" | "parts">,
): ReadonlyArray<string> => [
  component.title,
  ...componentSymbols(component),
  ...component.parts.map((part) => part.name),
];
```

`componentRank` calls `nameRank(componentNames(component), query)` instead of
`nameRank([component.title, ...componentSymbols(component)], query)`.

Nothing else changes: the record already declares its real parts (plan 479), so
no record and no page is edited, and a new part becomes rankable with no docs
edit. The existing tie-break (rank, source rank, shorter title, index order)
decides a shared name.

### 2.2 `apps/docs/src/lib/search.test.ts`

Add two cases to the existing `describe("search", …)` block:

1. **`a declared part ranks its component above a page that mentions it`** — a
   table of the ten measured queries above, each asserting
   `results[0]?.url` is the owning record's `componentSearchUrl`.
2. **`every name a record owns reaches one of its owners first`** — derive a
   `name → owner URLs` map from the real registry:

   ```ts
   const owned = components.flatMap((record) =>
     [
       record.title,
       ...componentSymbols(record),
       ...record.parts.map((part) => part.name),
       ...record.api,
       ...aliasesFor(record.slug),
     ].map((name) => ({ name, url: componentSearchUrl(record) })),
   );
   ```

   Group by `name`, then for every name call `search(name, 3)` and assert the
   first result's URL is in that name's owner set. This is the mechanical guard
   plan 481 lacked: it covers all 66 records instead of one sampled query, so a
   record that adds a part (or a new page that mentions it first) fails by name.
   Shared names pass when either owner is first.

No assertion is written against a stubbed value: both read the real registry,
the real aliases table and the real Fumadocs index.

### 2.3 `apps/docs/README.md`

In `## Search`, after the part-name sentence, add one paragraph:

> A declared **part** is a name too (plan 580). `CardTitle`, `FieldError` and
> `DialogClose` are scored like a title, so the component page is the first
> result rather than a limitations paragraph that mentions the name. A part two
> compound records share (`MenuGroup`) ranks both; the tie-break chooses one and
> the guard accepts either owner.

## 3. Commands and expected results

Run from the repository root unless stated.

| Command | Expected |
| ------- | -------- |
| `cd apps/docs && nub x vitest run src/lib/search.test.ts` | all cases pass in < 60 s; the two new cases present |
| `nub run --filter docs test` | 93 files / 668 tests (666 + 2), exit 0 |
| `nub run check` | `check:tests`, lint, format and types green |
| `nub run --filter docs smoke:build` | `smoke: ok`, 98 pages, no failing query |

## 4. Two-direction proof

1. Revert only the `componentNames` line in `componentRank` and re-run
   `nub x vitest run src/lib/search.test.ts`. **Expected:** the ten-query case
   fails on `CardTitle` (first result is the `#accessibility-and-limitations`
   chunk) and the exhaustive case lists every part name it lost.
2. Restore the change. **Expected:** both pass.
3. Remove the `DialogClose` part entry from the `dialog` record and run the
   suite. **Expected:** the explicit ten-query case fails on `DialogClose`
   (`/docs/components/dialog#state-and-ownership` first) while the exhaustive
   case stays silent — it derives its names from the registry, so the two guards
   are complementary: the table pins the measured names, the exhaustive case
   covers every new one.
4. Restore the entry.

Record the measured first results before and after in the commit message.

## 5. STOP conditions

- **STOP** if the exhaustive case takes more than 60 s warm or needs a larger
  `timeout`; report the measurement instead of raising the budget silently.
- **STOP** if a **title** or **alias** query regresses while part names are
  added — that means a part name shadows a real name; report the pair and do not
  add a special case without a plan.
- **STOP** if the shared `MenuGroup` name needs a per-record exception; the
  owner-set rule exists so no exception is required.
- Do not edit `apps/docs/content/**`, the registry or `COMPONENTS.md`: this is a
  ranker fix, not new content.

## 6. Acceptance

- Every declared part name reaches its owning component page first, except a
  name shared by two records, which reaches one of them first.
- The exhaustive ownership guard fails when a record's part list loses a name and
  when `componentNames` stops including parts.
- The full docs suite, `nub run check` and the built-site crawl are green.
- `apps/docs/README.md` documents the rule.
