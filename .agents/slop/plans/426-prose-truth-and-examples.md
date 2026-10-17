# 426 — Prose truth pass and the real Examples page

**Phase:** F (integration and polish) · **Owner:** docs-site · **Status:** planned
**Depends on:** 410 (site), 424 (component truth pass), primitives 047 and
components 110–119 (the packages the prose now describes)

## 1. The bug this plan fixes

Plan 424 audited the **component** pages. The prose pages were written before
Tier 1 and Tier 2 landed and several of them still describe the repository as it
was in Phase A. They build, sit in the sidebar and link correctly, so no
existing test notices. Measured on 2026-10-17 against the tree at
`f9381e8`:

| Page | Claim | Reality |
| ---- | ----- | ------- |
| `content/docs/layouts.mdx` | "These will live in `@gpuixui/primitives`, which is not published yet." | `packages/primitives` exists with 19 components and 20 docs pages. |
| `content/docs/examples/index.mdx` | "Examples will be runnable applications … `examples/` and run through the native playground. **Neither exists yet**" | `examples/basic-app` exists (`package.json`, `src/`, a README that records what is verified). |
| `content/docs/getting-started.mdx` | "The library will run in a native playground … It is not built yet" | `apps/playground` contains only `README.md` and no `package.json`; the claim is close, but it must name that evidence instead of implying the app is merely unfinished. |
| `content/docs/installation.mdx` | "the packages are **not on a registry yet**" | Still true (every workspace package is `private`). Leave, but add the source-install path that actually works. |

The failure mode is the same one plan 424 named: **a sentence that drifts
silently**. The fix has two halves — correct the prose, and make the drift a test
failure instead of a reader's discovery.

## 2. Non-goals

- Do not document Tier 3–5 components. They do not exist; the existing
  `workspace.mdx` / `data-display.mdx` "not published yet" sentences stay.
- Do not claim `examples/basic-app` runs. It has never been run in a native
  window (its own README says so); the page must carry that limitation.
- Do not touch `packages/README.md` (stale package ledger) or
  `apps/playground/README.md` (playground workstream). Record both as cross-team
  tasks in `TODO.md` if they are still stale when this plan finishes.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/layouts.mdx` | Rewrite around the **landed** primitives: name `Box`, `Stack`, `Grid`, `Separator`, `Spacer`, `ScrollArea`, link their component pages, and say which runtime limits are recorded (grid is numeric-only; no scrollbar tinting). Keep it a section landing page, not a duplicate of the pages. |
| `apps/docs/content/docs/examples/index.mdx` | Document the real `examples/basic-app`: what it composes, the exact run command, the verification table (type-check green, native run never performed), and the honest pointer to `apps/playground`. Remove "Neither exists yet". |
| `apps/docs/content/docs/getting-started.mdx` | Replace "It is not built yet" with the measured fact: `apps/playground` holds the README only; no `package.json`, so `nub run dev:playground` does not resolve yet. Keep the direction/plan language. |
| `apps/docs/content/docs/installation.mdx` | Add a "From this repository" subsection for `examples/basic-app` and the workspace install; keep the registry warning. |
| `apps/docs/content/docs/architecture.mdx` | Keep the "`docs/architecture.md` is not written yet" sentence **only if** the file still does not exist; otherwise point at it. Re-read `TODO.md` before editing. |
| `apps/docs/src/prose-truth.test.ts` | **New.** The drift guard (see §4). |
| `apps/docs/README.md` | One paragraph under a new "Prose truth" heading: what the guard checks and how to add a page. |
| `.agents/slop/plans/README.md` | Add this plan's row to the docs-site table. |
| `TODO.md` | Tick the plan's task under the docs-site workstream; add the cross-team rows from §7. |

## 4. The test plan (write it first, prove it fails)

Create `apps/docs/src/prose-truth.test.ts`. It must be able to fail **before** the
content edit and pass after; record both runs in the plan's §6.

The test derives facts from the repository, not from a copied list:

```ts
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const hasPackage = (dir: string) => existsSync(join(repoRoot, dir, "package.json"));
const implementedPackages = readdirSync(join(repoRoot, "packages"))
  .filter((name) => hasPackage(`packages/${name}`));
const runnableExamples = readdirSync(join(repoRoot, "examples"))
  .filter((name) => hasPackage(`examples/${name}`));
const playgroundIsRunnable = hasPackage("apps/playground");
```

Pages are every `.mdx` under `apps/docs/content/docs/**`.

**Check 1 — no future-tense package claim for a package that exists.**
For every page, match /will live in `@gpuixui\/([\w-]+)`/ and fail when the name
is in `implementedPackages`. This catches the shipped `layouts.mdx` line.

**Check 2 — no "does not exist" claim about a runnable example.**
Fail when a page matches /\bNeither exists yet\b/ (or
/`examples\/[^`]+`[^.]*\bdoes not exist\b/) while `runnableExamples` is non-empty.
This catches the shipped `examples/index.mdx`.

**Check 3 — no "not built" claim about the playground once it is runnable.**
Fail when a page names `apps/playground` or `dev:playground` and matches
/\bnot built yet\b/i while `playgroundIsRunnable` is true. The check is inverted
so the playground workstream landing its app makes this suite fail until the page
is updated — the drift is caught in the direction that matters.

**Check 4 — every backticked repo path on every page resolves.**
Reuse the pattern from `src/component-truth.test.ts`
(`/`((?:packages|apps|examples|docs|LICENSES)\/[^`\s]+)`/g`) over the prose pages
too. A missing path passes only when its section README registers it (the same
`registered()` rule: `packages/README.md`, `docs/README.md`). Report
`page: missing <path>`.

**Check 5 — the guard cannot pass on an empty tree.** Assert
`implementedPackages.length >= 3`, `runnableExamples.length >= 1`, and that at
least 10 prose pages were scanned. Without this, deleting the directory makes
every check vacuously green (`check:tests` also rejects an assertion-free test).

Order of work:

1. Write the test, run `nub run --filter docs test`. Expected: **fails** on
   Check 1 (`layouts.mdx`) and Check 2 (`examples/index.mdx`). Save the output.
2. Edit the pages until the test passes. Do not weaken a check to make it pass;
   if a check is wrong, change the check and explain why in a comment.
3. Re-run the full `nub run --filter docs test`. Expected: all files pass.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` (before the content edit) | the new suite fails on `layouts.mdx` and `examples/index.mdx` |
| `nub run --filter docs test` (after) | 21 files, all tests pass; no skipped tests |
| `nub run --filter docs check-types` | exits 0 |
| `nub run --filter docs build` | exits 0; the build prints the docs routes |
| `nub run --filter docs dev` then `curl -s localhost:3000/docs/examples` | 200; the page names `examples/basic-app`; no "Neither exists" |

Stop the dev server afterwards (`Ctrl-C`). If port 3000 is occupied, use
`--port 3001` and say so in the report.

## 6. Evidence to record

After the two test runs, append a short "Measured" section to this plan:

- the failing assertion text from step 1 (which page, which claim);
- the passing counts from step 2;
- the `check-types` / `build` exit status;
- the curl status and the sentence found on `/docs/examples`.

## 7. STOP conditions

- A prose page names a path that does not exist **and** the owning README does
  not register it, and the path is outside this workstream's ownership: stop,
  record it as a `TODO.md` cross-team row, and leave the sentence out rather than
  inventing a path.
- The playground has gained a `package.json` since this plan was written: Check 3
  will fail. Update `getting-started.mdx` to the playground's real run command
  after reading its README; do not claim a screen that does not exist.
- A check requires reading another workstream's source semantics (e.g. whether a
  component is "done"): stop. Status belongs to `COMPONENTS.md` and the registry,
  not to prose.

## 8. Acceptance

- `layouts.mdx`, `examples/index.mdx`, `getting-started.mdx` and
  `installation.mdx` describe the repository as it is, with the unverified parts
  named as unverified.
- `prose-truth.test.ts` fails on the pre-fix tree and passes after it, and its
  five checks each have a non-empty justification (no dead assertions).
- `nub run --filter docs test`, `check-types` and `build` pass.
- The plan index and `TODO.md` are updated; the change is committed and pushed on
  `agent/docs-site`.

## 9. Measured (2026-10-17)

- **Before**, `nub run --filter docs test -- prose-truth` failed exactly twice:
  - `layouts.mdx: "will live in @gpuixui/primitives"`;
  - `examples/index.mdx`, from the `Neither exists yet` denial.
- **After** the content edits: `Test Files 21 passed (21)`, `Tests 111 passed
  (111)`.
- `nub run --filter docs check-types` exit 0; `nub run --filter docs build`
  completed (`Done`) with only Vite's sourcemap/plugin-timing warnings.
- `landing.test.tsx` caught the follow-on drift the first edit missed: the
  landing quick start still printed `nub run dev:playground`. `QUICK_START` in
  `src/components/landing.tsx` now matches the installation shell block
  (`nub install` + `nub run --filter @gpuixui/basic-app dev`).

