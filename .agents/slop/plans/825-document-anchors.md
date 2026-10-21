# 825 — The anchors the three documents link to, and the heading rename nothing notices

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `355`, `356`,
`616`, `670`.

## 1. The defect

`packages/tokens/src/docs-links.test.ts` guards the relative **file** links in the
three documents this workstream publishes, and its own helper says what it does
not reach:

```ts
/**
 * The relative file links in `source` that do not resolve from `document`.
 * Anchors are stripped; absolute URLs and same-page anchors are not links to a
 * file and are ignored.
 */
```

The three documents carry **21 anchors** — 19 distinct — and no suite reads one:

| Anchor | Written in |
| ------ | ---------- |
| `#text-selection` | `docs/tokens.md` (Limitations) |
| `#native-text-fields` ×2 | `docs/tokens.md` (role table, Limitations) |
| `#find-highlighting` ×2 | `docs/tokens.md` (Limitations) and `docs/design-system.md` (`tokens.md#find-highlighting`) |
| `#one-check` ×2 | `docs/tokens.md` (Theme API, verification section) |
| `#every-shipped-theme`, `#role-opacity`, `#text-hierarchy`, `#typeface`, `#motion`, `#spacing`, `#density`, `#focus`, `#layering`, `#limitations-and-future-work` | `docs/tokens.md` |
| `#an-action-inside-a-status-panel`, `#custom-typefaces-are-unavailable-in-0100` | `docs/tokens.md` |
| `./design-system.md#9-accessibility`, `./tokens.md#layering` | `docs/tokens.md`, `docs/design-system.md` |

The anchors are all correct today — a probe over the three documents and
`COMPONENTS.md` resolves every one — but **nothing keeps them correct**. Measured
on this tree:

- renaming `## Text selection` to `## Selection of text` in `docs/tokens.md`
  leaves the package suite green at **226 files / 7154 tests**, while the
  Limitations link `[Text selection](#text-selection)` now points at a heading
  that no longer exists;
- the same holds for the cross-document link: renaming `## Layering` breaks
  `docs/design-system.md`'s `[Layering](./tokens.md#layering)` and its own
  `#layering` reference with no failure.

This is plan `616`'s failure mode one layer up: 616 made a dead **path** fail,
and a dead **anchor** — the half of a link a heading rename breaks — is still
silent. On a 4 408-line reference page the anchors are the navigation a reader
actually uses, and the docs site renders them as links, so a rename ships a dead
cross-reference.

No token value, pair, floor, metric, role or shipped theme is involved: the
defect is in the guard, not in the palette.

## 2. What the package produces today

| Document | Headings | Anchors out | Dead today |
| -------- | -------- | ----------- | ---------- |
| `docs/tokens.md` | 50 | 18 | 0 |
| `docs/design-system.md` | 13 | 2 | 0 |
| `packages/tokens/README.md` | 15 | 1 (none: 0) | 0 |

No document has two headings with the same text, so the GitHub/Fumadocs
duplicate suffix (`-1`) is not needed today; the guard must still state the rule
it implements so a future duplicate is a decision, not a surprise.

The slug rule the rendered documents use is the text slug: trim, lowercase, drop
every character that is not a letter, a digit, a space, `-` or `_`, then turn
each run of spaces into `-`. That is what makes `## Custom typefaces are
unavailable in 0.10.0` → `#custom-typefaces-are-unavailable-in-0100` and
`## 9. Accessibility` → `#9-accessibility`, the two headings whose anchors are
least obvious.

## 3. Decisions

1. **Extend `docs-links.test.ts`; do not add a fourth documentation file.** The
   file already owns "a link in a guarded document must resolve", holds the
   guarded-document list and reads the documents once. An anchor is the second
   half of the same rule, and a separate suite would duplicate the reader, the
   root URL and the guard list.
2. **Resolve an anchor against the document it is written in, unless the link
   names another guarded document.** `#focus` means `docs/tokens.md#focus` in
   `tokens.md` and `#9-accessibility` means `design-system.md#9-accessibility` in
   `design-system.md`; `tokens.md#find-highlighting` written in
   `design-system.md` resolves to the sibling file. A link to a document outside
   the guarded list is skipped and the comment says so, because its headings are
   another workstream's prose.
3. **Keep the slug rule honest and small.** One `slug()` function, the rule the
   rendered pages use, stated in its JSDoc with the two headings it exists for.
   Do not import a slug library: the package ships zero runtime dependencies and
   this is a documentation test.
4. **Do not add a table of contents.** The docs site renders in-page navigation
   from the headings; a hand-written TOC would be a second list to keep in step
   and would add ~60 lines to a page whose LOC budget is already the loosest in
   the workstream.
5. **Do not touch a heading.** Every anchor resolves today; the plan ships the
   guard only.

## 4. Files to change

1. `packages/tokens/src/docs-links.test.ts` — the slug helper, the anchor helper
   and two cases.
2. `.agents/slop/plans/README.md` — the plan row, plus the closing paragraph.
3. `TODO.md` — a ticked row and the workstream counter (`377/452` → `378/453`).

`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and
`COMPONENTS.md` need no edit.

## 5. Step 1 — the slug and anchor helpers

Add below `missingLinks` in `docs-links.test.ts`:

```ts
/**
 * The anchor the rendered page derives from a heading: the text slug. Two
 * headings make the rule observable — `## 9. Accessibility` →
 * `#9-accessibility` and `## Custom typefaces are unavailable in 0.10.0` →
 * `#custom-typefaces-are-unavailable-in-0100`; no guarded document has two
 * headings with the same text, so the `-1` suffix a duplicate earns is not
 * implemented and a duplicate must be argued before it is added.
 */
const slug = (heading: string): string =>
  heading
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s_-]/gu, "")
    .replaceAll(/\s+/g, "-");

/** Every heading's anchor in `source`. */
const headingAnchors = (source: string): ReadonlyArray<string> =>
  Array.from(source.matchAll(/^#{1,6} (.+)$/gm), (match) =>
    slug(match[1] ?? ""),
  );

/** The `#anchor` half of every link target, with the document it names. */
const anchorTargets = (target: string): string | undefined =>
  target.startsWith("#") ? target.slice(1) : target.split("#")[1];

/**
 * The anchors in `source` that the document they point at does not declare.
 * A same-page anchor resolves against `document`; a cross-document one against
 * the guarded document it names, and a link to a document outside the guarded
 * list is skipped — its headings are not this workstream's prose.
 */
const missingAnchors = (
  document: string,
  source: string,
  guarded: ReadonlyMap<string, string>,
): ReadonlyArray<string> => {
  const directory = document.split("/").slice(0, -1).join("/");
  return linkTargets(source).flatMap((target) => {
    const anchor = anchorTargets(target);
    if (anchor === undefined || anchor === "") {
      return [];
    }
    const [file = ""] = target.split("#");
    const targetDocument =
      file === ""
        ? document
        : new URL(`${directory === "" ? "" : `${directory}/`}${file}`, root)
            .pathname.replace(root.pathname, "");
    const headings = guarded.get(targetDocument);
    if (headings === undefined) {
      return [];
    }
    return headingAnchors(headings).includes(anchor)
      ? []
      : [`${document} -> ${targetDocument}#${anchor}`];
  });
};

/** The guarded documents by repository-relative path. */
const guardedDocuments = new Map(
  documents.map((document) => [
    document,
    readFileSync(new URL(document, root), "utf8"),
  ]),
);
```

`linkTargets` already returns every `](…)` target, so the two helpers share one
reader. Keep the existing `missingLinks` untouched.

## 6. Step 2 — the two cases

```ts
describe("document anchors", () => {
  it("resolves every in-page and cross-document anchor", () => {
    const missing = [...guardedDocuments].flatMap(([document, source]) =>
      missingAnchors(document, source, guardedDocuments),
    );

    expect(missing).toEqual([]);
  });

  it("catches an anchor a renamed heading orphaned", () => {
    const renamed = "# Catalogue\n\n## Selection of text\n\nthe wash";
    const fixture = new Map([["docs/tokens.md", renamed]]);

    expect(
      missingAnchors(
        "docs/tokens.md",
        "[Text selection](#text-selection)",
        fixture,
      ),
    ).toEqual(["docs/tokens.md -> docs/tokens.md#text-selection"]);
    expect(
      missingAnchors(
        "docs/tokens.md",
        "[Text selection](#selection-of-text)",
        fixture,
      ),
    ).toEqual([]);
  });
});
```

Case 2 is the one that proves the guard can fail without touching a real
document; the §7 mutations prove it against the shipped pages.

## 7. Test plan

```sh
nub run --filter @gpuixui/tokens test src/docs-links.test.ts
```

Expected after: one file, five cases green (the three existing link cases and the
two anchor cases).

**Prove every case in both directions** (apply the mutation, run the file,
restore):

1. Rename `## Text selection` → `## Selection of text` in `docs/tokens.md`:
   case 1 fails naming `docs/tokens.md -> docs/tokens.md#text-selection`. Before
   this plan the same rename left the whole package suite green — the §1
   evidence.
2. Rename `## Find highlighting` → `## Match highlighting` in `docs/tokens.md`:
   case 1 reports **three** entries (two same-page and
   `docs/design-system.md -> docs/tokens.md#find-highlighting`), which proves the
   cross-document branch runs.
3. Rename `## 9. Accessibility` → `## 9. Accessibility and contrast` in
   `docs/design-system.md`: case 1 fails on
   `docs/tokens.md -> docs/design-system.md#9-accessibility`, which proves a link
   *out* of `tokens.md` into the sibling is resolved against the sibling.
4. Change `#custom-typefaces-are-unavailable-in-0100` to
   `#custom-typefaces-are-unavailable-in-0-10-0`: case 1 fails, which proves the
   slug rule strips the dots rather than trusting the author.
5. Restore every file: all five cases pass.

Then the gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

No native scenario changes: no runtime code or token value moves. Record the ids
that were run (none) in the execution record.

## 8. STOP conditions

- Stop if a document has to change to make an anchor resolve: every anchor is
  correct today, so a failure means the slug rule is wrong, not the page. Fix the
  rule or record the anchor in `TODO.md` — do not rename a heading.
- Stop if a guarded document has two headings with the same text: the `-1`
  suffix becomes a real rule, so record the decision in this plan instead of
  silently indexing the first occurrence.
- Do not import a slug package, and do not add a fourth reader of the documents.
- Do not report a link to a document outside the guarded list as dead: the guard
  must skip it.
- Do not add a table of contents (Decision 4).

## 9. Acceptance

- `docs-links.test.ts` resolves every in-page and cross-document anchor in the
  three guarded documents against the headings they name, and one case proves the
  guard fails on a renamed heading in a fixture.
- Each of the four §7 mutations fails the file and the tree is restored
  afterwards.
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` are clean.
- `TODO.md` ticks the row and keeps the counter current; the plan index lists
  `825`.

## 10. Execution record

Executed on 2026-10-21 on `agent/tokens-theme`.

- The defect reproduced as §1 states: the three documents carry 21 anchors (19
  distinct) and `docs-links.test.ts` explicitly ignored every one. Renaming
  `## Text selection` to `## Selection of text` left the package suite green at
  **226 files / 7154 tests** while the Limitations link pointed at a heading that
  no longer existed.
- `docs-links.test.ts` gained `slug`, `headingAnchors`, `anchorTargets`,
  `missingAnchors` and `guardedDocuments`, plus two cases: every shipped anchor
  resolves, and a fixture whose heading is renamed is reported as
  `docs/tokens.md -> docs/tokens.md#text-selection`.
- Every §7 mutation was applied alone, the file run and the tree restored: the
  `Text selection` rename failed with the one entry; `Find highlighting` →
  `Match highlighting` reported three entries including the cross-document
  `docs/design-system.md -> docs/tokens.md#find-highlighting`; the
  `9. Accessibility` rename reported
  `docs/tokens.md -> docs/design-system.md#9-accessibility`; and the
  `0-10-0` respelling failed because the slug strips the dots. The restored tree
  passes.
- No anchor, heading, token value, pair, floor, metric, role or shipped theme
  moved.
- `nub run --filter @gpuixui/tokens test` → **226 files / 7156 tests** green
  (226 / 7154 before; two cases added). `nub run check`, `nub run lint` and
  `nub run test` clean.
- **No native scenario was run**: no runtime code or token value moves, and this
  worktree has no `apps/playground/dist` build (`BLOCKERS.md` B1).
