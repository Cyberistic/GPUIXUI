# 562 — Every page loads with a clean browser console

**Phase:** F/G (docs site release quality).
**Owner:** `docs-site`.
**Depends on:** 410, 439, 446, 495, 512, 524.
**Status:** ready to implement.

## 0. Why

Every existing production gate reads either the server HTML or a *named* piece
of hydrated state:

| Gate | What it reads | What it cannot see |
| ---- | ------------- | ------------------ |
| `smoke:build` | server HTML | anything after hydration |
| `smoke:browser` | preview surfaces and code colours on preview pages | a thrown effect on another page; a missing client chunk |
| `smoke:a11y` | axe over server-rendered pages | the same |
| `smoke:search`, `smoke:theme`, `smoke:platform`, `smoke:keyboard` | one interaction each | a page that never hydrates |
| `smoke:responsive` | layout boxes | a client exception |

A page can therefore **load without errors and still be broken**: a stale asset
hash after a redeploy makes every chunk 404 while the server HTML renders, and a
thrown client effect fails silently because no gate listens to the browser
console. The stale-server failure was measured while writing this plan: a
`vite preview` process started before a rebuild served 200 for the document and
**500 for every `/assets/*.js` and `.css`**; the SSR crawl passed and only
Chrome's console showed it.

Measured 2026-10-19 against the current production build (95 sitemap pages, one
fresh Chrome per page load): **0 pages with a console error, uncaught exception
or error-level log entry**. So this plan adds a guard, not a fix; the
two-direction proof in §5 injects both failure classes.

## 1. Design

### 1.1 The gate

`scripts/smoke-console.ts` loads **every sitemap page** in a fresh session (the
same `startDocsPreview` + `startSession` plumbing as `smoke:a11y`), waits for
`document.readyState === "complete"` plus a short settle, and fails when the
page produced any:

- `Runtime.consoleAPICalled` with `type: "error"` (React hydration errors and
  every application `console.error`),
- `Runtime.exceptionThrown` (an uncaught exception),
- `Log.entryAdded` with `level: "error"` (a failed resource, a script error).

Warnings, info and verbose entries are ignored: they are not failures, and a
gate that fails on them becomes an allowlist. One scheme is enough — a console
error is not painted by a theme — so the sweep runs once, in light.

Exit `0` = every page clean, `1` = at least one page reported an error (the line
names the page and the error), `2` = build/server/Chrome could not run. `2` is
never a pass.

### 1.2 The report is pure and tested

`scripts/page-errors.ts` owns the event → `PageError` normalisation, deduping
and the one-line report; `src/page-errors.test.ts` tests it. `chrome-session.ts`
only records what the pure module returns, and `smoke-console.ts` only navigates
and prints. This mirrors plan 512's split (`accessibility-report.ts` +
`smoke-a11y.ts`) so the text a failing gate prints can be tested without Chrome.

Dedupe matters because one failure can surface twice (a `console.error` and the
exception it came from); the first occurrence wins and the order is kept.

### 1.3 What changes in the shared session

`startSession` enables `Log` alongside `Runtime`/`Page` and records every event
through `pageErrorFromEvent`. Two additions to `Session`:

- `errors(): ReadonlyArray<PageError>` — what arrived since the last reset;
- `resetErrors(): void` — called before each navigation.

The other smokes ignore both and keep their current behaviour.

## 2. Exact files

| Action | Path | What |
| ------ | ---- | ---- |
| create | `apps/docs/scripts/page-errors.ts` | event normalisation, dedupe, exit code, line and pass text |
| create | `apps/docs/src/page-errors.test.ts` | every rule, both directions |
| create | `apps/docs/scripts/smoke-console.ts` | the sitemap sweep and its CLI |
| edit | `apps/docs/scripts/chrome-session.ts` | enable `Log`, record events, expose `errors`/`resetErrors` |
| edit | `apps/docs/package.json` | `smoke:console` script |
| edit | `apps/docs/README.md` | the command list and a "Console smoke check" section |
| edit | `apps/docs/content/docs/contributing.mdx` | one row in the Docs site check table |
| edit | `.agents/slop/plans/README.md` | index this plan |
| edit | `TODO.md` | add and tick the task in the docs-site block |

`COMPONENTS.md` needs no row: this changes the docs site's verification, not a
component.

## 3. Steps

1. Create `scripts/page-errors.ts` with the API in §4.1.
2. Create `src/page-errors.test.ts` with the cases in §5.1.
3. Extend `chrome-session.ts` per §1.3.
4. Create `scripts/smoke-console.ts` per §4.2.
5. Add the `smoke:console` script to `apps/docs/package.json`.
6. Document it in `apps/docs/README.md` and the Contributing page (the
   `docs-checks.test.ts` guard fails until the page names it).
7. Run §6 and record the results in §7, including both two-direction proofs.
8. Tick `TODO.md`, index this plan, commit and push `agent/docs-site`.

## 4. Exact code contracts

### 4.1 `scripts/page-errors.ts`

```ts
export type PageErrorOrigin = "console" | "exception" | "network" | "script";

export interface PageError {
  readonly origin: PageErrorOrigin;
  readonly message: string;
}

/** null when the event is not a failure (a warning, an info log, …). */
export const pageErrorFromEvent = (
  method: string,
  params: unknown,
): PageError | null;

/** Same origin + message collapses; first occurrence wins. */
export const uniqueErrors = (
  errors: ReadonlyArray<PageError>,
): ReadonlyArray<PageError>;

export const errorLine = (path: string, error: PageError): string;
export const exitCode = (failures: number): 0 | 1;
export const passLine = (pages: number): string;
```

Rules:

- `Runtime.consoleAPICalled`, `type === "error"`: join each argument's `value`
  (or `description`) with a space → `console: <text>`; empty text becomes
  `console: (no message)`.
- `Runtime.exceptionThrown`: first line of
  `exceptionDetails.exception.description ?? exceptionDetails.text` →
  `exception: <line>`; no detail becomes `exception: (no detail)`.
- `Log.entryAdded`, `level === "error"`: `source === "javascript"` → `script:`;
  otherwise `network:`. Append ` (<url>)` when the entry carries a URL.
- Every other event, and every non-object `params`, returns `null`.
- `errorLine("/docs/x", {origin:"console", message:"boom"})` is
  `/docs/x console: boom`.
- `passLine(95)` is `console: 95 pages, 0 errors`.

### 4.2 `scripts/smoke-console.ts`

Same CLI shape as `smoke:a11y`:
`[--base-url <url>] [--chrome <path>] [--no-build] [--only <path>]`.

For each sitemap path:

1. `resetErrors()`;
2. `navigate(url)`;
3. `waitFor('document.readyState === "complete"')` — `SetupError` when it does
   not settle, because a page that never loaded was not verified;
4. wait 500 ms for hydration and late chunk loading;
5. read `errors()` and add one failure line per unique error.

Print `smoke: <path> checked` per page, then every failure line and
`smoke: <n> pages with errors`; exit `1` when `failures > 0`, otherwise
`passLine(pages)`. A `SetupError` is caught like the other smokes and exits `2`.

## 5. Test plan (each test must be able to fail)

### 5.1 `src/page-errors.test.ts`

1. **A console error is a failure** — `pageErrorFromEvent("Runtime.consoleAPICalled", {type:"error", args:[{value:"boom"}]})`
   is `{origin:"console", message:"boom"}`.
2. **A console warning is not** — the same event with `type:"warning"` is `null`.
3. **An object argument keeps its description** — `args:[{description:"Error: bad"}]`
   yields `console: Error: bad`.
4. **An exception keeps its first line only** —
   `{exceptionDetails:{exception:{description:"Error: boom\n at x"}}}` yields
   `exception: Error: boom`.
5. **An exception with no description still names the failure** —
   `{exceptionDetails:{text:"Uncaught"}}` yields `exception: Uncaught`.
6. **A failed resource is a network failure, with its URL** —
   `Log.entryAdded {level:"error", source:"network", text:"Failed to load resource", url:"…/x.js"}`
   yields `network: Failed to load resource (…/x.js)`.
7. **A script error is a script failure** — source `javascript` yields `script:`.
8. **Non-error log entries are ignored** — `level:"warning"`, `level:"info"` and
   an unknown `method` return `null`; a non-object `params` returns `null`.
9. **One failure is reported once** — `uniqueErrors` over a duplicate keeps the
   first and preserves order.
10. **The line and pass text are the ones the gate prints** — `errorLine` and
    `passLine` exactly as §4.1.

### 5.2 Forced failures (recorded in §7, then reverted)

- **Client exception.** Add a temporary client component that throws in an
  effect on `/docs/installation`; `smoke:console` must exit `1` and name
  `/docs/installation` with `exception:`.
- **Failed resource.** Add a temporary `<script src="/missing-chunk.js" />` to
  the same page; the gate must exit `1` with a `network:` line naming the file.

Both are reverted; the committed site stays clean.

## 6. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | exit 0; the new `page-errors` suite passes and `docs-checks` sees the new smoke documented |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run --filter docs smoke:console` | exit 0; `console: 95 pages, 0 errors` |
| `nub run --filter docs smoke:build` | exit 0; the production crawl is unchanged |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

## 7. Results

Run 2026-10-19 on `agent/docs-site` against the production build.

### The clean site

| Command | Result |
| ------- | ------ |
| `nub run --filter docs smoke:console` | exit 0 — `console: 95 pages, 0 errors` |
| `nub run --filter docs test` | exit 0 — 78 files / 545 tests (11 new) |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs smoke:build` | exit 0 — 95 pages, 118 links, 1 182 anchors |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

### Forced failures (applied, observed, reverted)

1. **Client exception.** A `useEffect` that throws was added to
   `CompactThemeToggle` (rendered on `/`), the build was refreshed and the gate
   run with `--only /`. It exited `1` with
   `FAIL / console: Error: forced console gate failure`.
   The thrown effect arrived as React's `console.error`, whose first argument
   carries the stack; the first version printed every stack line, so
   `consoleError` now keeps the first line and §5.1 gained that case. Reverted.
2. **Failed resource.** `<img src="/missing-proof.png" alt="" />` was added to
   `/docs/installation`. The gate exited `1` with
   `FAIL /docs/installation network: Failed to load resource: the server responded with a status of 404 (Not Found) (http://127.0.0.1:4173/missing-proof.png)`.
   Reverted.

The final clean-tree run is the one in the table above. Warnings, info logs and
unknown CDP events were measured silent over the same 95 pages.

## 8. STOP conditions

- A shipped page reports a console error. Stop and report the page and the exact
  line; do not add an allowlist, and do not weaken the event filter to pass.
- The only way to pass is to ignore an error class (for example treating all
  `network` errors as benign). Stop: the gate exists for that class.
- A page never reaches `readyState === "complete"` within the settle budget.
  Report the page; that is a real load failure, not a slow test.
- `smoke:console` needs more than ~6 minutes for 95 pages. Record the duration
  and stop; the budget is a plan decision, not something to hide by sampling
  fewer pages.

## 9. Acceptance

- Every sitemap page loads in the production build with no console error,
  uncaught exception or error-level log entry.
- Both injected failure classes fail by page name, and both are measured.
- The command is documented where a contributor looks, and the existing
  `docs-checks.test.ts` guard sees it.
- `TODO.md`, the plan index and this file record the measured run.
