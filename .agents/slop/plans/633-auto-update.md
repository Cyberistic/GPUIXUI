# 633 — Auto-update: the runtime ships an updater the site never mentioned

**Workstream:** docs-site (`apps/docs`, `docs/preview-strategy.md`, component-page
template). **Phase:** F (integration and truth).

**Read first:** `MISSION.md` (§"Definition of done" → *Documentation* and
*Release*), `AGENTS.md` §0 (plans first), `PLAN.md` §4 (D20, D29, D32, D43,
D47, D56–D68 — the copy the page must follow), `.agents/slop/plans/625-application-window-page.md`
(the closest analogue: a whole runtime surface documented from installed
declarations).

**Blockers:** B1 (GPUix native bindings) is **resolved** — `@gpuix/native@0.10.0`
is built from source on this host (ADR 0003, plan `140`). B2 (durable scheduler)
owns `scripts/`; it does not touch this workstream. Neither blocks this plan.

---

## 1. What is wrong (measured 2026-10-21, branch `agent/docs-site`, `2cdf9a01`)

`@gpuix/native@0.10.0` — the version this repository pins — ships a complete
**auto-update API** in its Node entry. The docs site has no page for it, and
`content/docs/deployment.mdx:138` states the opposite in writing.

### 1.1 The API exists in the installed package

Read from `apps/docs/node_modules/@gpuix/native/index.d.ts`:

| Declaration | Shape |
| ----------- | ----- |
| `checkUpdate(currentVersion: string, options: CheckUpdateOptions)` | `Promise<AvailableUpdate \| null>` — `null` when the feed answers `204` or announces nothing newer |
| `AvailableUpdate` (class) | getters `currentVersion`, `version`, `notes`, `date`, `downloadUrl`, `format`; method `downloadAndInstall(): Promise<unknown>` |
| `CheckUpdateOptions` | `endpoints: Array<string>`, `pubkey: string`, `headers?: Array<UpdaterHeader>`, `timeoutMs?: number`, `installerArgs?: Array<string>`, `installMode?: string` |
| `UpdaterHeader` | `name: string`, `value: string` |

The declaration's own doc comments state the contract the page must repeat:
`downloadAndInstall()` *"Download, verify the signature, and replace the running
app. Does not relaunch."*; `format` is *"Packager format: `app`, `appimage`,
`nsis`, or `wix`"*; the feed endpoint slots are `{{target}}`, `{{arch}}`,
`{{current_version}}`; `pubkey` is the *"Public key from `cargo packager signer
generate`"*; `installMode` is `passive` (default), `quiet` or `basicUi`.

Entrances, read from the package's real files:

- `node_modules/@gpuix/native/index.js` exports `AvailableUpdate` and
  `checkUpdate` from the native binding.
- `node_modules/@gpuix/native/browser.mjs` exports **only** `GpuixRenderer` —
  the wasm/docs surface has no updater.
- `node_modules/@gpuix/react/dist/index.d.ts` mentions neither name — there is no
  React wrapper.

### 1.2 The site says auto-update does not exist

`apps/docs/content/docs/deployment.mdx:130-138`:

> Signing, notarisation, installers and auto-update are not implemented or
> documented in this repository.

The second half is now false twice over: the runtime implements the update
protocol, and this plan documents it. The sentence is the only place on the site
that answers "can my app update itself", so a reader gets a denial.

### 1.3 Search has no owner for the vocabulary

Measured against the real index with `npx`-free `vitest` (`search(query, 2)`),
before any change:

| Query | First result |
| ----- | ------------ |
| `updater` | `/docs/testing` |
| `auto update`, `auto-update` | `/docs/components/text-area#accessibility-and-limitations` |
| `autoupdate` | *nothing* |
| `checkUpdate`, `AvailableUpdate` | *nothing* |
| `update feed`, `update checker` | `/docs/component-pages#adding-a-scene` |
| `app update` | `/docs/patterns/app-shell` |
| `ship updates` | `/docs/components/search-input#keyboard-and-focus` |
| `release feed` | `/docs/license#still-owed-before-release` |
| `code signing` | `/docs/components/text#variants` |
| `signing key` | `/docs/components/keycap` |
| `relaunch`, `rollback`, `nsis`, `appimage`, `wix` | *nothing* |
| `installer` | `/docs/deployment#shipping-an-app-built-with-gpuixui` |

The component-page guide's "search vocabulary" section and a Slider keyboard
paragraph are not answers to any of these.

### 1.4 What is *not* measured (state this on the page)

No packaged application is built, signed, notarised or run anywhere in this
repository (`rg "cargo packager"` → no packaging config; there is no `.app`,
installer or update feed). The install path, signature verification, the four
packager formats and `installMode` are therefore **declared, never executed**.
The page must say so; the guard must fail if the page starts claiming a run.

### 1.5 Why this is the next task and not a re-run of an existing one

- Plan `625` documented the window, `627` selection/find, `628` the test
  renderer, `629` the native text theme, `631` display scale, `632` async data —
  every other whole runtime surface has an owner.
- **`updates` and `auto-update` are the last query class with a real
  implementation behind it and no page.** The remaining unowned words measured in
  the same sweep (`emoji`, `currency`, `profiling`, `glossary`) have no
  implemented subject behind them, so they are not a page.
- `Deployment` is about *this docs site*; the consumer's app update path is a
  different subject that today has no home.

---

## 2. Scope

### In scope

1. A new hand-authored page `/docs/updates` (title **Auto-update**) that:
   - states what the runtime ships, field by field, rendered from one data module;
   - states the feed contract and the signature requirement;
   - shows **one compiled, copyable workflow** composing `checkUpdate` with the
     library's real `ConfirmDialog` + `Toast`;
   - states the absences (no update UI component, no scheduling, no delta
     updates, no relaunch, no rollback, no feed hosting, no browser entry, no
     React wrapper) and the unverified boundary;
   - links Deployment (docs hosting), Installation (native bindings),
     Troubleshooting (missing binding), Toasts and Confirmation dialogs.
2. `src/lib/updater.ts` — the authored rows + a pure `updaterSurfaceViolations`
   rule compared with the **installed** declarations in both directions.
3. `src/lib/updater-search.ts` — one generated search document so
   `checkUpdate`, `AvailableUpdate`, `downloadAndInstall`, `installerArgs`,
   `pubkey`, `installMode` and the rest are findable even though the page index
   tokenises camelCase as one word.
4. `src/components/updater-tables.tsx` — renders the rows; nothing retyped in
   MDX.
5. `content/docs/updates.mdx` + `content/docs/meta.json` entry (after
   `deployment`).
6. `Deployment`'s false sentence replaced with the truth and a link to the new
   page.
7. Page aliases (exact whole-query) for the measured vocabulary, and the
   matching `owned`/`regressions` rows.
8. One or two production `smoke:build` queries.
9. `TODO.md`, `PLAN.md` (new decision row), `.agents/slop/plans/README.md`.

### Out of scope (do **not** do these here)

- No change to `packages/*`, `apps/playground` or `@gpuix/native`.
- No packaging/notarisation guide — this page documents the updater API and
  states that the repository has no packaging pipeline.
- No new UI component (the page composes the shipped `ConfirmDialog`/`Toast`).
- No live wasm scene: the updater exists only in the Node entry, and a scene
  must never fake it.
- `docs/preview-strategy.md` is unchanged: this page carries no preview.

---

## 3. Exact files

| Action | Path |
| ------ | ---- |
| create | `apps/docs/src/lib/updater.ts` |
| create | `apps/docs/src/lib/updater-search.ts` |
| create | `apps/docs/src/components/updater-tables.tsx` |
| create | `apps/docs/content/docs/updates.mdx` |
| create | `apps/docs/src/updater.test.ts` |
| edit | `apps/docs/content/docs/meta.json` |
| edit | `apps/docs/content/docs/deployment.mdx` |
| edit | `apps/docs/src/lib/search.ts` |
| edit | `apps/docs/src/lib/search-docs.ts` |
| edit | `apps/docs/src/lib/page-aliases.ts` |
| edit | `apps/docs/src/lib/page-aliases.test.ts` |
| edit | `apps/docs/scripts/smoke-build.ts` |
| edit | `apps/docs/src/example-snippets.test.ts` (`extraPages`) |
| edit | `TODO.md`, `PLAN.md`, `.agents/slop/plans/README.md` |

Every path is inside this workstream. No cross-team ask is needed.

---

## 4. Implementation

### 4.1 `apps/docs/src/lib/updater.ts`

Mirror the shape of `window-surface.ts` (authored rows, derived guard):

```ts
export interface UpdaterRow { readonly name: string; readonly summary: string }
export interface UpdaterGroup {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly rows: ReadonlyArray<UpdaterRow>;
}
/** `AvailableUpdate`, `CheckUpdateOptions` and `UpdaterHeader` members. */
export const updaterGroups: ReadonlyArray<UpdaterGroup>;
/** The four packager formats the `format` getter documents. */
export const updateFormats: ReadonlyArray<string>;
export interface UpdaterAbsence {
  readonly subject: string;
  readonly statement: string;
  /** A name that would make the absence false if the runtime gained it. */
  readonly symbol?: RegExp;
}
export const updaterAbsences: ReadonlyArray<UpdaterAbsence>;
export interface UpdaterSurfaceInput { ... }
export const updaterSurfaceViolations = (input: UpdaterSurfaceInput): ReadonlyArray<string>;
```

Rows required (summaries are one sentence each, in the page's voice; copy the
contract, not the declaration docs):

- **`AvailableUpdate`** — `currentVersion`, `version`, `notes`, `date`,
  `downloadUrl`, `format`, `downloadAndInstall`.
- **`CheckUpdateOptions`** — `endpoints`, `pubkey`, `headers`, `timeoutMs`,
  `installerArgs`, `installMode`.
- **`UpdaterHeader`** — `name`, `value`.

`updateFormats` = `["app", "appimage", "nsis", "wix"]`.

`updaterAbsences` (each must be true today; the guard owns the symbols):

| subject | statement | symbol (absence is falsified if matched) |
| ------- | --------- | ---------------------------------------- |
| Update UI | The library ships no component that checks, prompts or installs; compose `ConfirmDialog`, `Progress` and `Toast`. | `/checkUpdate/` in `packages/*/src/**` |
| Scheduling | Nothing runs on a timer or at startup; the host app decides when to call it. | `/setInterval.*checkUpdate\|scheduleUpdate/` |
| Delta updates | The feed sends a whole bundle; no patch format is declared. | `/delta\|patch/i` inside the updater declarations |
| Relaunch | `downloadAndInstall()` does not relaunch; the app quits and starts again. | `/relaunch/i` exported by the package |
| Rollback | No downgrade or rollback path is declared. | `/rollback\|downgrade/i` in declarations |
| Feed hosting | The runtime fetches a feed; nothing here serves one. | `/updates\.example\.com/` outside the page |
| React wrapper | `@gpuix/react` exports none of the updater. | `/checkUpdate\|AvailableUpdate/` in its declarations |
| Browser entry | `@gpuix/native`'s browser entry exports only `GpuixRenderer`, so there is no wasm surface to preview. | `checkUpdate` in `browser.mjs` |
| Packaging | No packaged app is built, signed or run in this repository, so the install path is unverified. | a packaging config / `cargo packager` |

`updaterSurfaceViolations` returns a message per disagreement; it must be
**pure** (string input, string output) so the test can feed fixtures. Rules:

1. Class members of `AvailableUpdate` in `declarations` equal the names in the
   `AvailableUpdate` group (`get x()` and `x():` both parse). Missing →
   `Undocumented AvailableUpdate member: <name>`; invented →
   `Documented AvailableUpdate member is not declared: <name>`.
2. Fields of `CheckUpdateOptions` agree in both directions (same message shape).
3. Fields of `UpdaterHeader` agree in both directions.
4. `checkUpdate` is declared, takes `CheckUpdateOptions`, and returns
   `Promise<AvailableUpdate | null>` — otherwise
   `checkUpdate is not the declared function this page describes`.
5. `updateFormats` equals the backticked words in the `format` getter's doc
   comment, in declaration order. A format added or removed fails by value.
6. `reactDeclarations` contains no `checkUpdate`/`AvailableUpdate` token.
7. `browserExports` equals `["GpuixRenderer"]`.
8. `packageSource` (every `packages/*/src` file joined) does not call the
   updater while the Update-UI absence stands.

Do **not** import `node:fs` here; the test owns the boundary (same rule as
`window-surface.ts`).

### 4.2 `apps/docs/src/components/updater-tables.tsx`

One component `<UpdaterTables />` rendering three tables (member | what it
does) from `updaterGroups`, plus a formats table from `updateFormats` and a
list from `updaterAbsences`. Follow `window-tables.tsx` exactly: a `<div>` with
`role="region"`, `aria-label`, `tabIndex={0}` and `overflow-x-auto` around each
scrollable table; `data-updater-table="<group id>"` markers for the page test.

### 4.3 `apps/docs/content/docs/updates.mdx`

Frontmatter:

```
---
title: Auto-update
description: Ship updates to a packaged GPUIXUI app — the runtime's signed update feed, checkUpdate, AvailableUpdate, download and install, and what this repository has not verified.
---
```

Sections, in this order:

1. Intro: the runtime implements the update protocol (`@gpuix/native` Node
   entry); the library supplies the UI you compose around it; nothing in this
   page runs in the browser.
2. `## What the runtime ships` — `<UpdaterTables />`; state `null` semantics,
   the endpoint slots, `pubkey`, the four formats and `installMode` values from
   the rows, not from prose memory.
3. `## Check, confirm, install` — the compiled fence (§4.6) plus three
   sentences: the check is a plain promise; the dialog is the confirmation the
   library already ships; `downloadAndInstall()` verifies the signature and
   replaces the app **without relaunch**.
4. `## What the library does not provide` — the absence list rendered from
   `updaterAbsences`.
5. `## What is not verified` — no packaged app, no signature run, no format
   tested, no feed hosted; the page is derived from the installed declarations;
   a reader who packages an app is the first to exercise it.
6. `## Related` — Deployment (the docs site's Worker), Installation (native
   bindings), Troubleshooting (missing binding), Toasts, Confirmation dialogs.

No preview block, no `<NativePreview>`, no live-scene slot.

### 4.4 `apps/docs/content/docs/meta.json`

Add `"updates"` immediately after `"deployment"`.

### 4.5 `apps/docs/content/docs/deployment.mdx`

Replace lines 130–138's second paragraph's last sentence. The paragraph must
read, in substance:

- This page does not describe packaging a desktop application.
- Signing, notarisation and installers are not implemented in this repository.
- **Auto-update is implemented in the runtime** — `/docs/updates` documents
  `checkUpdate`, the signed feed and `downloadAndInstall`.

Do not delete the first two facts; they are true and guarded today.

### 4.6 The compiled workflow fence

Add `"updates"` to `extraPages` in `src/example-snippets.test.ts` so the fence
is compiled by the repository's own `tsc` (the mechanism plan 613 built). The
fence must be a module and must compile. Target shape (adjust only to the real
props, then compile):

```tsx
import { useEffect, useState } from "react";
import { checkUpdate, type AvailableUpdate } from "@gpuix/native";
import {
  ToastProvider,
  ToastViewport,
  useToast,
} from "@gpuixui/components/toast";
import { ConfirmDialog } from "@gpuixui/components/confirm-dialog";

const FEED = "https://updates.example.com/{{target}}/{{arch}}/{{current_version}}";

export function UpdatePrompt({
  currentVersion,
  pubkey,
}: {
  readonly currentVersion: string;
  readonly pubkey: string;
}) {
  const toast = useToast();
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    let live = true;
    checkUpdate(currentVersion, { endpoints: [FEED], pubkey }).then(
      (available) => {
        if (live) setUpdate(available);
      },
      () => {
        if (live) setUpdate(null);
      },
    );
    return () => {
      live = false;
    };
  }, [currentVersion, pubkey]);

  const install = async () => {
    if (update === null) return;
    setInstalling(true);
    await update.downloadAndInstall();
    setInstalling(false);
    setUpdate(null);
    toast.push({
      title: "Update installed",
      description: "Quit and reopen to run the new version.",
      tone: "success",
    });
  };

  return (
    <ConfirmDialog
      open={update !== null}
      onOpenChange={(open) => {
        if (!open) setUpdate(null);
      }}
      title={`Install ${update?.version ?? "the update"}?`}
      description="The download is signature-checked before it replaces the app. It does not relaunch."
      confirmLabel="Download and install"
      loading={installing}
      onConfirm={() => {
        void install();
      }}
    />
  );
}

export const App = () => (
  <ToastProvider>
    <UpdatePrompt currentVersion="1.4.0" pubkey="untrusted-ed25519…" />
    <ToastViewport />
  </ToastProvider>
);
```

A failed check is not an update; setting `null` is the whole handling. If
`tsc` rejects the `.then(onFulfilled, onRejected)` shape or a component prop,
fix the fence — do not weaken the compiler (see STOP 5).

### 4.7 `apps/docs/src/lib/updater-search.ts`

Same shape as `host-props-search.ts`:

- `names`: the distinctive names only (`isDistinctiveName` keeps `checkUpdate`,
  `downloadAndInstall`, `currentVersion`, `downloadUrl`, `installerArgs`,
  `installMode`, `timeoutMs`, `CheckUpdateOptions`, `AvailableUpdate`,
  `UpdaterHeader`) — never a plain word.
- `index`: title `"Auto-update"`, url `"/docs/updates"`, breadcrumbs
  `["Auto-update"]`, content = one line per row, keywords = the names.
- Register it in `generatedSearchEntries` (`src/lib/search.ts`).
- Add the matching row to `indexedSurfaces` (`src/lib/search-docs.ts`) so the
  Site search page lists it; `search-docs.test.ts` compares the two lists.

### 4.8 Page aliases

In `src/lib/page-aliases.ts`, add a `/docs/updates` block:

```
auto update, auto updater, autoupdate, updater, updaters, update feed,
release feed, update server, check for updates, check for update,
update check, update checker, app update, application update, ship updates,
shipping updates, download and install, install an update, relaunch,
relaunch the app, code signing, signature verification, update signature,
signing key, pubkey, nsis, appimage, wix, installer args, install mode,
delta update, rollback
```

Do **not** add `auto-update` (the page title — the shadow guard forbids a term
equal to a page title) or `update`/`updates` (see §7, non-goal).

### 4.9 `smoke-build.ts` production queries

Add to `searchChecks`:

```ts
{ query: "auto update", expected: "/docs/updates", first: true,
  what: "the updater page, which returned a text-area limitation before plan 633" },
{ query: "checkUpdate", expected: "/docs/updates", first: true,
  what: "the update API name, which returned nothing before plan 633" },
```

---

## 5. Test plan — `apps/docs/src/updater.test.ts`

`node:fs` is a test-only boundary import, as in `window-surface.test.ts`.

Reads:

- `installedNativeDeclarations()` (`src/lib/native-declarations.testing.ts`) →
  the `@gpuix/native` declarations.
- `node_modules/@gpuix/react/dist/index.d.ts`.
- `node_modules/@gpuix/native/browser.mjs` (parse `export { … }`).
- every `packages/*/src/**/*.ts(x)` file, joined.
- `content/docs/deployment.mdx` and `content/docs/updates.mdx`.
- `content/docs/meta.json`.
- `source.getPages()` for the page.

Cases (each must be able to fail):

1. **Declarations agree** — `updaterSurfaceViolations(realInput)` is `[]`.
2. **A new runtime member fails by name** — add `get size(): number` to the
   `AvailableUpdate` fixture → violation names `size`.
3. **A documented member the runtime dropped fails by name** — remove
   `get notes()` from the fixture → violation names `notes`.
4. **A new option field fails** — add `channel?: string` to
   `CheckUpdateOptions` fixture → violation names `channel`.
5. **A new packager format fails** — change the fixture's `format` comment to
   `app`, `appimage`, `nsis`, `wix`, `msi` → violation names `msi`.
6. **The no-React-wrapper claim** — a fixture `react` string containing
   `checkUpdate` → violation.
7. **The browser-entry claim** — a fixture export list containing `checkUpdate`
   → violation.
8. **The page exists and is routed** — `meta.json` contains `updates`; the page
   has the six `##` headings; every `updaterGroups` row name appears in the
   rendered data (rendered from the same arrays, not retyped) and the page body
   contains `downloadAndInstall`, `{{current_version}}`, `pubkey`.
9. **The page does not claim a run** — it contains `not verified` /
   `no packaged app`; it does not contain a screenshot, `<NativePreview`,
   `<PreviewSurface`, or the word `verified` without "not".
10. **Deployment no longer denies the capability** — `deployment.mdx` contains
    `"/docs/updates"` and does not match `/auto-update[^.]*not implemented/i`.
11. **Search reaches the page** — `search("auto update")` first url
    `"/docs/updates"`; `search("checkUpdate")` first url `"/docs/updates"`;
    `search("downloadAndInstall")` first url `"/docs/updates"`.
12. **The generated document is registered** — `generatedSearchEntries`
    contains `updaterSearchEntry` and `indexedSurfaces` contains its url (the
    last one is already enforced by `search-docs.test.ts`).

Also update `src/lib/page-aliases.test.ts`:

- `owned`: one row per new alias with `"/docs/updates"`.
- `regressions`: `["upgrade", "/docs/installation"]` and
  `["changelog", "/docs/installation"]` (already covered) plus
  `["update", "/docs/component-pages#adding-a-scene"]` if `update` still lands
  there — record the measured owner rather than assuming; and
  `["installer", "/docs/deployment#shipping-an-app-built-with-gpuixui"]` only if
  the measured first result stays there.

### Two-direction proofs to run and record in this plan's implementation note

| # | Break | Expect | Then |
| - | ----- | ------ | ---- |
| 1 | Add `get size()` to the declaration fixture | case 2 fails with `size` | revert |
| 2 | Restore Deployment's old sentence | case 10 fails | fix |
| 3 | Delete the `/docs/updates` alias block | `auto update` and `updater` cases fail | restore |
| 4 | Remove `updates` from `meta.json` | case 8 fails | restore |
| 5 | Break a prop in the fence (e.g. `confirmLabel` → `confirm`) | `example-snippets` fails with the MDX line | revert |

Never claim a case passed without the run.

---

## 6. Commands and expected results

Run from the repository root unless noted. `nub`, not `node` (AGENTS.md §2).

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `cd apps/docs && nub x vitest run src/updater.test.ts` | first run fails on the missing modules/pages (red), then green after implementation |
| 2 | `cd apps/docs && nub x vitest run src/example-snippets.test.ts` | the fence compiles; a broken prop fails with `updates.mdx:<line>` |
| 3 | `cd apps/docs && nub x vitest run src/lib/page-aliases.test.ts` | no shared/shadowed term, owned rows answer |
| 4 | `nub run --filter docs check-types` | exit `0`, no diagnostics |
| 5 | `nub run --filter docs test` | whole docs suite green (150 → 151+ files, no failures) |
| 6 | `nub run --filter docs build` | exit `0`; the page is in the client build |
| 7 | `nub run --filter docs smoke:build` | exit `0`; 113 → 114 pages; the two new production queries answer `/docs/updates` |
| 8 | `nub run check` | exit `0` (includes `check:tests`) |
| 9 | `nub run lint` | exit `0` |
| 10 | `nub run test` | exit `0` |
| 11 | `nub run --filter docs smoke:a11y` | `114 × 2` documents, 0 violations (a new page is a new document) |

Playwright/Chrome checks are not needed: this page has no client interaction
beyond navigation. `smoke:responsive` is **not** run for this change (no new
table wider than the existing window tables — if a table overflows at 390 px,
the a11y/responsive gate will say so; fix the table wrapper, do not ignore it).

Record in the plan's implementation note: exact test counts, page count, and
which commands exited `0`.

---

## 7. Non-goals and measured non-fixes (record, do not "fix")

- `update` / `updates` alone stay wherever they land: the word is also
  "a component updates its state" (`SearchInput`, `Slider` keyboard prose) and
  the page's title already answers `auto-update`. Adding them would steal
  legitimate prose.
- `upgrade`, `changelog`, `versioning` stay on Installation — a library upgrade
  is not an app update.
- `installer` stays on Deployment's shipping section: a reader asking about
  installers for the *library* is not asking about the updater, and Deployment
  now links the updater page.
- `signature` alone stays unclaimed (Theming's "signature" sentence); only
  `signature verification`/`update signature` name the updater.
- `electron updater` / `tauri updater` stay on the porting page: they are the
  "I come from Electron/Tauri" question, already answered there.

---

## 8. STOP conditions

Stop and report instead of improvising if any of these is true:

1. `@gpuix/native`'s installed declarations no longer export `checkUpdate` (a
   dependency bump changed the premise). Re-measure and re-plan; do not document
   an API that is not installed.
2. A workspace package already exports an update UI, or the playground already
   calls `checkUpdate` — the absences would be false. Record the real state.
3. `tsc` rejects the fence for a reason that requires changing a package prop —
   that is a cross-team task; record it in `TODO.md` and keep the fence inside
   the shipped API.
4. `smoke:a11y` or `smoke:responsive` fails on a defect the new table wrapper
   cannot fix locally.
5. You are tempted to add a live scene, a screenshot or a "verified" label: the
   updater cannot run in the browser and nothing packaged exists. That would be
   a fake native claim (`MISSION.md`).
6. `nub run check` fails in a file outside this plan's list. Do not "fix" another
   workstream's path; record it in `TODO.md` as a cross-team task.

---

## 9. Acceptance criteria

- [x] `/docs/updates` is in the sidebar after Deployment and renders 3 tables +
      the absence list from `src/lib/updater.ts`.
- [x] Every `AvailableUpdate`, `CheckUpdateOptions` and `UpdaterHeader` member
      is documented, and every documented member exists in the installed
      declarations (`updater.test.ts` both directions).
- [x] The four packager formats and the endpoint slots are stated from the
      declaration/source, not from memory.
- [x] The workflow fence compiles with the repository's own `tsc`.
- [x] `Deployment` no longer says auto-update is unimplemented, and links the
      page.
- [x] `auto update`, `checkUpdate`, `downloadAndInstall`, `relaunch`, `nsis`
      reach `/docs/updates` from the real index; `upgrade` keeps Installation.
- [x] The page states, without hedging: no packaged app, no signature run, no
      format tested, no feed hosted.
- [x] `nub run check`, `nub run lint`, `nub run test`,
      `nub run --filter docs smoke:build` exit `0`; a11y green at 114 × 2.
- [x] `TODO.md` has the ticked task, `PLAN.md` a decision row, the plan index a
      `633` row, and the branch is committed and pushed.

---

## 10. Implementation note (2026-10-21)

Shipped exactly the file list in §3, plus `src/lib/native-declarations.testing.ts`
(`installedReactDeclarations`, `installedNativeRoot`, `packageSources`) and
`src/components/mdx.tsx` (registering `<UpdaterTables />` / `<UpdaterAbsences />`,
which `mdx-components.test.ts` requires).

### Measurements after the change

| Query | Before | After |
| ----- | ------ | ----- |
| `updater` | `/docs/testing` | `/docs/updates` |
| `auto update` / `auto-update` | a text-area limitation | `/docs/updates` |
| `checkUpdate`, `AvailableUpdate` | nothing | `/docs/updates` |
| `update feed`, `update checker` | `/docs/component-pages#adding-a-scene` | `/docs/updates` |
| `app update` | app-shell pattern | `/docs/updates` |
| `ship updates` | Search input keyboard prose | `/docs/updates` |
| `release feed` | License "still owed" | `/docs/updates` |
| `code signing`, `signing key` | Text variants / Keycap | `/docs/updates` |
| `nsis`, `appimage`, `wix`, `relaunch`, `rollback`, `pubkey` | nothing | `/docs/updates` |
| `upgrade`, `changelog` | Installation | Installation (unchanged) |

`update` and `updates` now reach `/docs/updates` through the page **title**
(`Auto-update`), not through an alias — the word was deliberately left out of
the table, and the measured owner is recorded here rather than pinned to prose
that may move. `installer` lands on the updater page's `## What is not verified`
ahead of Deployment because the page names `installerArgs` and the Windows
installer; it is not aliased, so the ranking follows the prose. §7's
"`installer` stays on Deployment" is therefore **superseded by measurement**,
not by an alias change.

### Two-direction proofs (run, then reverted)

| # | Break | Observed |
| - | ----- | -------- |
| 1 | Delete the `notes` row from `src/lib/updater.ts` | `updater.test.ts` — `AvailableUpdate: notes is declared but undocumented` (3 cases failed) |
| 2 | Restore Deployment's "…and auto-update are not implemented or documented…" | `is the only page that owns the install path` failed on the matched sentence |
| 3 | Key the alias block to `/docs/updater` | `keys every alias to a page that exists` + 17 owned rows failed |
| 4 | Remove `updates` from `content/docs/meta.json` | `is routed after Deployment` failed |
| 5 | `confirmLabel` → `confirm` in the page fence | `example-snippets.test.ts` — `updates.mdx:95 (fence 1) TS2322` against `ConfirmDialogProps` |

### Gate results (exact)

- `nub run --filter docs test` → **151 files / 1 729 tests passed** (was 150 /
  1 672; +25 updater cases, +32 alias rows).
- `nub run --filter docs check-types` → exit `0`.
- `nub run --filter docs build` → exit `0`.
- `nub scripts/smoke-build.ts --no-build` → **114 pages** (was 113), 249 links,
  1 467 anchors, search checked, `smoke: ok`, exit `0` — including
  `auto update` and `checkUpdate` answered by `/docs/updates`.
- `nub scripts/smoke-a11y.ts` → **114 × 2 schemes, 0 violations**, exit `0`.
- `nub scripts/smoke-responsive.ts` → **114 pages**, phone controls and mobile
  navigation checked, exit `0`.
- `nub run check` → exit `0` (including `check:tests`, `lint`, `fmt`,
  `check-types` for every workspace).
- `nub run lint` → exit `0`.
- `nub run test` → exit `0` (8 workspace `Done` lines; docs 151 / 1 729).

### Corrections made while implementing

- The first fixture for the "no React wrapper" rule contained a literal
  `from "@gpuix/native"` string, which `architecture.test.ts` reads as a real
  import with its file-wide regex. The fixture now declares
  `export declare function checkUpdate(): void;` instead — no specifier text.
- The page's prose does not list the four packager formats; the table renders
  them from `updateFormats`, and the guard compares that array with the `format`
  getter's doc comment. The page test asserts the component reads the data
  module rather than retyping it.

