# 501 — A fragment link lands on a heading

**Phase:** F (docs quality)
**Depends on:** 410 (site), 438 (internal-link integrity), 439 (built-site
smoke), 441 (API index), 499 (heading outline)
**Owner:** docs-site
**Status:** planned

## 1. The bug this closes

Plan 438 made every literal `/docs` link resolve to a **page**. It recorded the
gap it did not close: the fragment is stripped before resolution
(`apps/docs/src/internal-links.test.ts:79`, and again in
`apps/docs/scripts/smoke-build.ts:135`). So this passes today:

```mdx
Read [What is verified](#what-is-verifeid) before treating the run as proof.
```

The page loads, the link does nothing, and every test, type check and build
stays green. The site also **generates** a fragment link for every documented
component — `/docs/components/<slug>#api-reference` in
`src/components/api-index.tsx` — so renaming `## API reference` on one page
breaks 1 of 66 generated links with no failure anywhere.

Fumadocs assigns heading ids at build time with `github-slugger`
(`fumadocs-core/dist/mdx-plugins/remark-heading.js`, `new Slugger()`), and the
HTML also carries ids the site writes itself (`#nd-page`, `#main-content`).
Reimplementing that slugger in a test would be a second source of truth. The
**rendered HTML is the truth**, so the check belongs in the production crawl
that already loads every page: `smoke:build` (plan 439).

This is the "later plan" plan 438 anticipated ("a later plan can add heading
extraction if a fragment is dropped").

## 2. Exact change

One file changes: `apps/docs/scripts/smoke-build.ts`.

### 2.1 Fetch each sitemap page once

`auditPage` currently requests its page, then `audit()` re-requests every page
to collect link targets — two requests per page. Change `auditPage` to take the
already-fetched body:

```ts
const auditPage = async (
  path: string,
  page: Fetched | null,
): Promise<ReadonlyArray<Problem>> => { /* unchanged checks, no request() */ };
```

In `audit()`:

```ts
const fetched = await mapLimit(paths, CONCURRENCY, async (path) => ({
  path,
  page: await request(baseUrl + path),
}));
const pages = fetched.filter(
  (entry): entry is { path: string; page: Fetched } =>
    entry.page !== null && entry.page.status === 200,
);

const pageProblems = fetched.flatMap(({ path, page }) =>
  auditPage(path, page),
);
problems.push(...pageProblems);
```

`paths.length` is still what the `smoke: pages` line prints; keep it.

### 2.2 Extract ids and fragment links

Add two pure helpers above `audit()`:

```ts
/** Element ids in rendered HTML; script bodies are data, not markup. */
const elementIds = (html: string): ReadonlySet<string> =>
  new Set(
    [...html.replace(/<script[\s\S]*?<\/script>/gi, "").matchAll(
      /<[a-z][^>]*\sid="([^"]+)"/g,
    )].flatMap((match) => (match[1] === undefined ? [] : [match[1]])),
  );

interface FragmentLink {
  readonly source: string;
  readonly target: string;
  readonly fragment: string;
}

/** `href="#x"` and `href="/docs/...#x"`; external and empty fragments are not ours. */
const fragmentLinks = (
  source: string,
  html: string,
): ReadonlyArray<FragmentLink> =>
  [...html.matchAll(/\bhref="([^"]*#[^"]*)"/g)].flatMap((match) => {
    const raw = match[1];
    if (raw === undefined || raw.startsWith("//")) return [];
    const [path = "", fragment = ""] = raw.split("#");
    if (fragment === "" || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return [];
    const target = path === "" ? source : path;
    if (!target.startsWith("/")) return [];
    try {
      return [{ source, target, fragment: decodeURIComponent(fragment) }];
    } catch {
      return [{ source, target, fragment }];
    }
  });
```

### 2.3 Audit fragments against the destination page

After the link audit in `audit()`:

```ts
const ids = new Map(
  pages.map(({ path, page }) => [path, elementIds(page.body)] as const),
);
const anchors = [
  ...new Map(
    pages
      .flatMap(({ path, page }) => fragmentLinks(path, page.body))
      .map((link) => [
        `${link.source}→${link.target}#${link.fragment}`,
        link,
      ] as const),
  ).values(),
];
const anchorProblems = anchors.flatMap(({ source, target, fragment }) => {
  const targetIds = ids.get(target);
  // A target outside the sitemap is not a claim this check makes; the link
  // audit already proves it answers below 400.
  if (targetIds === undefined) return [];
  return targetIds.has(fragment)
    ? []
    : [
        {
          where: source,
          what: `#${fragment} has no element with that id in ${target}`,
        },
      ];
});
problems.push(...anchorProblems);
console.log(`smoke: anchors ${anchors.length} checked`);
```

The sitemap is every page (`src/lib/sitemap.test.ts` proves it), so in practice
every internal target is in `ids`; the `undefined` branch keeps the guard
honest for an asset or route that is not a page.

### 2.4 Expected results

- `nub run --filter docs smoke:build` → exit `0`; prints the existing lines
  plus `smoke: anchors <N> checked`, with **N ≥ 66** (the API index alone links
  every documented component to `#api-reference`).
- The page count and every existing assertion are unchanged.

## 3. Test plan — prove both directions

The rendered id is only observable after SSR, so the proof is the smoke itself,
exactly as plans 439, 446, 474 and 496 prove their browser-only rules. Run each
step, record the output in §7, then revert.

1. **Baseline.** `nub run --filter docs smoke:build` → exit `0`; record `N`.
2. **Break a generated link.** In `src/components/api-index.tsx` change
   `#api-reference` to `#api-references`. Rebuild and run with `--no-build`
   after `nub run --filter docs build`:
   `nub apps/docs/scripts/smoke-build.ts --no-build` → exit `1`, one `FAIL
   /docs/api-reference: #api-references has no element with that id in
   /docs/components/<slug>` per linked page. Restore the file.
3. **Break a prose heading.** Rename `## What is verified` in
   `content/docs/patterns/settings-form.mdx` to `## What was verified`.
   Rebuild; the crawl fails naming
   `/docs/patterns/settings-form: #what-is-verified has no element with that id
   in /docs/patterns/settings-form`. Restore the heading.
4. **Do not trust a script body.** Confirm the baseline still passes: every id
   the script inserts into the serialized payload is stripped before matching,
   so the check cannot be satisfied by a JSON string.
5. **No regressions.** `nub run --filter docs test` (369 tests today),
   `nub run --filter docs check-types`, `nub run --filter docs build`.

A guard that only ever runs against a passing site is unproven: steps 2 and 3
must fail with the message above before the guard counts as done.

## 4. Documentation and ledger

- `apps/docs/README.md` §"Built-site smoke check": add "when a `#fragment` link
  has no element with that id on the page it names (plan 501)" to the list of
  failures, and say the check compares the **rendered** ids, not a copy of the
  slugger.
- `content/docs/contributing.mdx`: extend the `smoke:build` row with "every
  `#fragment` lands on a heading". `src/docs-checks.test.ts` keeps the row and
  the script in step.
- `TODO.md`: add one docs-site row and tick it when green.
- Plan index: add this plan and note that `501` is the next free number (the
  `400–499` block is full).
- No `COMPONENTS.md` row: this is a docs-site check, not a component.

## 5. STOP conditions

- **STOP** if the baseline census finds fewer than 66 fragment links: the API
  index wiring changed; report the count and do not lower the assertion to fit.
- **STOP** if the destination id cannot be read from the SSR HTML (for example
  because Fumadocs moves headings into a client-only tree): the check would be
  false comfort. Record the measured HTML and stop.
- **STOP** if a baseline failure names a real dead link: fix that link or
  heading (content is this workstream's), do not exempt it.
- **STOP** if the crawl needs a third request per page to work; the map exists
  to make this check free, and a slower gate is not the goal.

## 6. Acceptance

- The production crawl checks every internal fragment link and names the
  source, the fragment and the destination when one is dead.
- Both direction proofs in §3 ran and are recorded.
- README, Contributing and TODO agree with the shipped check.
- `nub run --filter docs test`, `check-types` and `build` pass; the full gates
  (`nub run check`, `nub run lint`, `nub run test`) stay green.

## 7. Results

*(filled in by the executor: commands, counts, the two failing runs and their
exact messages, then the restored green run.)*
