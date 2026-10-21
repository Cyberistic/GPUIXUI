# 638 — Shipping a desktop app: the packaging path has no owner

**Phase:** G (release-readiness documentation; a measured documentation gap)
**Depends on:** 410, 412, 413, 419, 431, 439, 568, 574, 584, 598, 603, 609, 617, 624, 625, 633, 637
**Status:** planned
**Owner:** docs-site workstream (`apps/docs`, `docs/preview-strategy.md`, the component-page template)

---

## 1. The gap this plan closes

`MISSION.md` asks for clear install and usage instructions and a reproducible
build, and `deployment.mdx` says in writing:

> Shipping a desktop app built with the library is a different problem, answered
> under Native bindings and Troubleshooting; **no packaging guide exists yet.**

That sentence is accurate today, and it is the gap. Installation says which
prebuilt binding to install, Updates documents the update client and names the
packager formats it consumes, and nothing on the site answers **how an
application built on this library becomes something a user can install**: the
single-file build, the app wrapper, the icon, the signing key, the release
assets, and which of those this repository has never done.

Measured on 2026-10-21 in this worktree against the real `/api/search` merge (a
scratch vitest calling `search()`; deleted afterwards):

| Query | First result before | Correct owner |
| ----- | ------------------- | ------------- |
| `shipping` | `/docs/dark-mode` (page) | this page |
| `distribute` | `/docs/components/spacer#accessibility-and-limitations` (text) | this page |
| `distributing` | `/docs/extending` (page) | this page |
| `packaging` | `/docs/api-values` (page) | this page |
| `packager` | `/docs/updates#what-is-not-verified` (text) | this page |
| `bundle identifier` | `/docs/components/text#variants` (text) | this page |
| `app bundle` | `/docs/patterns/app-shell` (page) | this page |
| `ship an app` | `/docs/patterns/app-shell` (page) | this page |
| `notarize` | **nothing** | this page |
| `notarization` | **nothing** | this page |
| `executable` | **nothing** | this page |
| `dmg` | `/docs/roadmap` (page) | this page |
| `installer` | `/docs/updates#what-is-not-verified` (text) | this page |
| `cross compile` | `/docs/selection#highlighting-matches` (text) | this page |
| `app icon` | `/docs/components/icon` (page) | this page |
| `release` | `/docs/installation` (page) | stays — see §7 |

Two facts make the page necessary rather than nice:

1. **The runtime documents the packaging path in its own repository, and the
   site documents the half after it.** GPUix's README has a five-step shipping
   section — `bun build --compile`, `cargo-packager` with a `packager.json`,
   the `.icns` pipeline, `cargo packager signer generate`, and the GitHub
   Releases feed — and the installed `@gpuix/native@0.10.0` declarations confirm
   the half the update client reads: `AvailableUpdate.format` is
   `app | appimage | nsis | wix`, `CheckUpdateOptions.pubkey` names
   `cargo packager signer generate`, and `WindowOptions.appName`'s own comment
   says "only a `.app` bundle changes" the application menu title. A consumer
   reading this site's Updates page learns what to call and not what to build.
2. **The site's own words are the strongest evidence of the gap.** The docs
   deploy is documented in detail and the app build is one paragraph that
   denies itself. `MISSION.md`'s release criterion — "install and examples work
   from a clean checkout" — cannot be assessed for an app the docs never teach a
   reader to build.

### Provenance boundary (read before writing prose)

The recipe comes from the **GPUix repository at `main`**, not from the pinned
release: the published `@gpuix/native@0.10.0` tarball ships no README (`files` is
`index.js`, `index.cjs`, `index.d.ts`, `browser.mjs`, `dist`, `wasm`, `LICENSE`).
PLAN.md D9 already forbids treating the reference clone as the API of the pinned
dependency. Therefore:

- **Installed-declaration facts** (the four update formats, `pubkey`, the target
  list, `appName`) are stated as the pinned release's contract and guarded by
  test.
- **The recipe** (commands, `packager.json` keys, `.icns` pipeline, `.sig`
  naming, GitHub Releases feed) is attributed in the page to GPUix's repository
  README, and the page's `## Provenance` section says this site has not run it.
- **Sizes** (82 MB Bun `.app`, 34 MB Hermes `.app`, 12 MB + 22 MB sidecar) are
  quoted as *GPUix's* measurements on *its* machine, never as this site's.
- **This repository** has packaged nothing. The page says so, and a test reads
  the repository to keep that true.

---

## 2. What the page says (and where each claim comes from)

Page: `/docs/distribution`, title **Shipping a desktop app**, sidebar directly
before `deployment` (the release cluster reads: shipping the app, deploying the
docs site, auto-update).

Sections, in order:

1. **`## What ships`** — a GPUix app is three things: the React tree, the
   `@gpuix/native` addon, and the JavaScript runtime that loads it. The addon is
   a Node-API binary with three published targets and one unpublished one; the
   table and the install path belong to
   [Installation](/docs/installation#native-bindings), not here. The browser
   entry (`browser.mjs` + wasm) is a rendering target for the web, not a desktop
   package — link [Architecture](/docs/architecture) and
   [Security](/docs/security). The window's own options — including
   `appName` and `appId` — belong to [Application window](/docs/window).
   State the one runtime fact a packager needs: `appName` defaults to `title`
   and names the macOS Hide/Quit items, while the application **menu** title
   comes from the executable, so only a real `.app` bundle changes it (quoted
   from the installed `WindowOptions` declaration).
2. **`## Build one binary`** — the upstream step, attributed:
   `bun build --compile app.tsx --outfile dist/app`. The upstream README's claim
   is that the binary carries the renderer and runs with no Bun or Node install;
   the page labels it as GPUix's documented behaviour and says this site has not
   measured a compiled binary. The runtime is Node-API, so Node also hosts the
   app (without Bun's `--hot`); link [Frame loop](/docs/frame-loop) for what the
   entry calls.
3. **`## Wrap it in an app`** — `<PackagerFormats />` and `<PackagerConfig />`
   from `src/components/distribution-tables.tsx`, then the commands:
   `cargo install cargo-packager --locked`,
   `cargo packager --release --config packager.json`. State the two upstream
   facts that surprise people: `--release` is the **packager profile**
   (`binariesDir` must already hold a release binary; it is not
   `cargo build --release`), and the packager builds the **host OS only** — a
   release matrix runs it on macOS, Linux and Windows separately.
4. **`## The app icon`** — the `.icns` pipeline as one copyable shell fence
   (the ten `sips` sizes and `iconutil`), with the reason: a raw Mach-O has no
   Dock icon and `cargo-packager` rejects a 1024 PNG with `No matching
   IconType`, so the icon passed is the `.icns`. Platform `formats` per OS in
   the table above (`app` and optional `dmg` on macOS, `appimage` on Linux,
   `nsis` on Windows) with the note that the update client also declares `wix`.
5. **`## Sign the bundle`** — `cargo packager signer generate`; the private key
   and its password live in `CARGO_PACKAGER_SIGN_PRIVATE_KEY` /
   `CARGO_PACKAGER_SIGN_PRIVATE_KEY_PASSWORD`; the **public** key goes into the
   app's `checkUpdate` call as `pubkey`. Signing produces the sibling `.sig`
   files the updater requires, and the macOS update asset is
   `My App.app.tar.gz` — not the `.app` and not the `.dmg`. Say plainly that
   this is **update-payload signing**, not OS code signing or notarisation,
   which the runtime does not provide and this repository has never run
   (cross-link [Security](/docs/security) and
   [Auto-update](/docs/updates#check-confirm-install)).
6. **`## Publish a release`** — GitHub Releases is the feed the update client
   expects; create the release first, upload the bundle **and** its `.sig`, keep
   the repository public (a private one 404s the API), and do not upload a feed
   JSON. The Linux and Windows asset names use the **binary stem** (`app`), not
   `productName`; NSIS uses arch `x64`, not `x86_64`. Hand the API itself to
   [Auto-update](/docs/updates), which owns `checkUpdate`/`downloadAndInstall`.
7. **`## What this repository does not do`** — `<DistributionAbsences />`:
   no packaging config, no packaging CI, no signed or notarised bundle, no
   packaged app ever launched, no cross-compilation, no Windows/Linux packaging
   run, no icon or bundle-identifier API in the runtime, no auto-launch, and no
   installer UI. Each row's checkable half is guarded (§6).
8. **`## Provenance`** — the upstream-repository vs pinned-release boundary
   above, the sizes as upstream's measurements, and the exact unverified list.

---

## 3. Files to create or change

### Create

1. `apps/docs/src/lib/distribution.ts` — the page's data:
   - `PackagerFormatRow` + `packagerFormats` (five rows: the four
     `updateFormats` plus `dmg`), each with `os`, `format`, `output`,
     `updateAsset`, `update` (whether `AvailableUpdate.format` returns it);
   - `PackagerConfig` (`Schema.Class`) + `packagerConfig` (the object the page
     renders and the JSON fence repeats);
   - `PackagingStep` + `packagingSteps` (build, wrap, sign, publish);
   - `DistributionAbsence` + `distributionAbsences` with optional `symbol:
     RegExp` and `deniedDependencies: ReadonlyArray<string>` for the checkable
     half;
   - `distributionProvenance` (upstream sizes and the attribution sentence, as
     data so the page and the test agree);
   - `distributionSurfaceViolations(input)` — a pure function that returns the
     names of violations, in the shape `updaterSurfaceViolations` /
     `windowSurfaceViolations` already use.
2. `apps/docs/src/components/distribution-tables.tsx` — `<PackagerFormats />`,
   `<PackagerConfig />`, `<DistributionAbsences />`. Render tables from the data
   above; no inline literals. Follow `updater-tables.tsx` (same table markup,
   same `Table`/`Td`/`Th` helpers if it uses them).
3. `apps/docs/src/lib/distribution-search.ts` — `distributionSearchEntry`:
   promoted names `cargo-packager`, `packager.json`, `binariesDir`,
   `CARGO_PACKAGER_SIGN_PRIVATE_KEY`,
   `CARGO_PACKAGER_SIGN_PRIVATE_KEY_PASSWORD`; index content from
   `packagingSteps`, `packagerFormats` and `distributionAbsences`. Do **not**
   promote `NSIS`, `WiX`, `AppImage`, `appimage`, `nsis` or `wix` — Updates owns
   those words as aliases (plan 633); they are indexed as text only.
4. `apps/docs/content/docs/distribution.mdx` — the page in §2.
5. `apps/docs/src/distribution.test.ts` — the suite in §6.

### Change

6. `apps/docs/src/lib/search.ts` — add `distributionSearchEntry` to
   `generatedSearchEntries` (import + array).
7. `apps/docs/src/lib/search-docs.ts` — add the `Site search` page row for
   `/docs/distribution` (`title: "Shipping a desktop app"`, `what:` the single
   file, wrapper, icon, signing key and release assets). `search-docs.test.ts`
   compares the list with `generatedSearchEntries`, so this is required.
8. `apps/docs/src/lib/page-aliases.ts` — a new block (§7) on
   `/docs/distribution`; **remove** `installer` from `/docs/deployment` (it moves
   here) and extend the doc comment with the plan-638 paragraph.
9. `apps/docs/src/components/mdx.tsx` — register `PackagerFormats`,
   `PackagerConfig`, `DistributionAbsences` (import + object).
10. `apps/docs/content/docs/meta.json` — insert `"distribution"` immediately
    before `"deployment"`.
11. `apps/docs/content/docs/deployment.mdx` — replace the "no packaging guide
    exists yet" paragraph in the frontmatter description and the intro with a
    link to `/docs/distribution`; replace `## Shipping an app built with
    GPUIXUI` with a short section that still states this page does not package
    the docs site and hands the app to the new page. The section must keep the
    unverified boundary and link Updates.
12. `apps/docs/content/docs/updates.mdx` — in `## What the library does not
    provide` (the `Packaging pipeline` row) and the intro, link
    `/docs/distribution` as the owner of building/signing/publishing.
13. `apps/docs/scripts/smoke-build.ts` — one production query:
    `{ query: "bundle identifier", expected: "/docs/distribution", first: true,
    what: "the packaging path's bundle-identifier phrase" }`.
14. `TODO.md` — tick the delivered task with the measured before/after, the
    counts and the scenario ids actually run.
15. `PLAN.md` — a D-rule row: "shipping has a page, and the recipe is attributed
    to the upstream repository while the declarations own the format table".
16. `.agents/slop/plans/README.md` — the plan 638 row (status implemented).

`docs/preview-strategy.md` and the component-page template need **no** change:
this page has no component preview and no component record.

---

## 4. The data, verbatim

`packagerFormats` (five rows):

| OS | `formats` | Output in `outDir` | Update asset | `update` |
| -- | --------- | ------------------ | ------------ | -------- |
| macOS | `app` | `My App.app`; on sign `My App.app.tar.gz` + `.sig` | `My App.app.tar.gz` | `true` |
| macOS | `dmg` | `My App.dmg` — a human install image | none — the updater cannot install a `.dmg` | `false` |
| Linux | `appimage` | `app_0.1.0_x86_64.AppImage` + `.sig` | the `.AppImage` | `true` |
| Windows | `nsis` | `app_0.1.0_x64-setup.exe` + `.sig` | the setup `.exe` | `true` |
| Windows | `wix` | a WiX/MSI setup | the MSI | `true` |

`packagerConfig`:

```json
{
  "productName": "Notes",
  "version": "0.1.0",
  "identifier": "dev.example.notes",
  "binariesDir": "dist",
  "outDir": "bundle",
  "binaries": [{ "path": "app", "main": true }],
  "icons": ["AppIcon.icns"],
  "formats": ["app"]
}
```

`packagingSteps` (four rows: `build` → `wrap` → `sign` → `publish`), each with
`command` and `source`. `distributionAbsences` (nine rows) mirror §2.7.

The MDX JSON fence must be generated from `packagerConfig` (a test parses the
fence and compares it, both directions), so the copyable file cannot drift from
the row table.

---

## 5. Commands to run, and the expected result of each

From `apps/docs`:

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test -- src/distribution.test.ts` | every case green; the data + page + repository guards pass |
| `nub run --filter docs check-types` | exit `0`, no diagnostics |
| `nub run --filter docs build` | exit `0`; `dist/client` and `dist/server` written |
| `nub run --filter docs smoke:build` | exit `0`; page count rises by one (118 → 119) and the new production query answers |
| `nub run --filter docs smoke:console -- --only /docs/distribution --no-build` | exit `0`, no console error |
| `nub run --filter docs smoke:a11y -- --only /docs/distribution --no-build` | exit `0` in both schemes |
| `nub run check` (repo root) | exit `0` |
| `nub run lint` (repo root) | exit `0` |
| `nub run test` (repo root) | exit `0` |

Record the exact counts printed by `check`/`test`/`smoke:build` in the TODO entry;
do not round or remember them.

---

## 6. Test plan — every case must be able to fail

`apps/docs/src/distribution.test.ts` (header comment states the bug: the site
had no packaging page and `deployment.mdx` denied one existed).

1. **Format rows agree with the updater, both directions.**
   - every `updateFormats` entry appears once in `packagerFormats` with
     `update: true`;
   - no row has a format outside `updateFormats ∪ {"dmg"}`;
   - `dmg` exists and is the only `update: false` row.
   Forced defect: drop the `wix` row → fails naming `wix`; add `"deb"` → fails
   naming `deb`.
2. **The published targets match Installation, both directions.**
   Compare the page's prose target list with `nativePlatforms` from
   `src/lib/native-platforms.ts`: three `published: true` labels appear, and the
   Intel macOS row (`published: false`) is named as unpublished. Forced defect:
   remove `Linux · x64` → fails by label.
3. **The copyable config is the documented config.**
   Decode `packagerConfig` with the `PackagerConfig` schema; parse the MDX
   ```json fence with `Schema.fromJsonString(Schema.Unknown)` and compare with
   the schema's encoded value. Forced defect: change `outDir` in the MDX fence
   only → fails with the two differing keys.
4. **The repository has no packaging pipeline, and the detector works.**
   `packagingArtifactsIn(names)` is pure: prove it detects
   `packager.json`, `tauri.conf.json`, `electron-builder.yml`, `forge.config.js`,
   `app.wxs`, `app.nsi`, `Info.plist`, `notes.desktop` and rejects
   `package.json`/`README.md` (a fixture list, so an empty repository result is
   meaningful). Then scan the repository (`../../../../` from
   `src/distribution.test.ts`) with `readdirSync` for those names at any depth
   (`node_modules`, `references`, `workspaces` excluded) and assert `[]`.
5. **No workspace installs a packager.** Collect every workspace manifest's
   dependency names (the pattern `test-surface.test.ts` already uses) and assert
   none of `electron`, `electron-builder`, `@electron-forge/cli`,
   `@tauri-apps/cli`, `cargo-packager` is declared. Forced defect: add
   `"electron-builder"` to a fixture manifest object → the pure collector names
   it.
6. **The runtime has no bundle identifier or icon.** Reuse
   `window-surface.ts`'s parsed `WindowOptions` rows: assert a row named
   `appId` exists, and no row is named `icon`, `bundleIdentifier` or `version`.
   The page states exactly that (`appId` is a Wayland `app_id` / X11 `WM_CLASS`,
   not a bundle identifier). Forced defect: filter `appId` out of the rows →
   fails.
7. **Every absence is stated, both directions.** Each
   `distributionAbsences` subject and statement appears in the MDX; the MDX has
   no absence row the data module does not declare (compare the rendered
   `<DistributionAbsences />` tag, the section heading and the count).
8. **Deployment hands the subject over, both directions.** `deployment.mdx`
   contains no `no packaging guide exists yet`; it links `/docs/distribution`;
   `updates.mdx` links `/docs/distribution`. Forced defect: restore the old
   sentence → fails by name.
9. **The page keeps its machinery.** The MDX contains `<PackagerFormats />`,
   `<PackagerConfig />` and `<DistributionAbsences />`, each registered in
   `getMDXComponents()` (the `mdx-components.test.ts` rule, asserted locally
   too), and the page carries the `## Build one binary`,
   `## Wrap it in an app`, `## The app icon`, `## Sign the bundle`,
   `## Publish a release` and `## Provenance` headings.
10. **Search reaches it (owned queries) and does not steal (regressions).**
    Owned, each first result `/docs/distribution`: `shipping`, `distribute`,
    `packaging`, `packager`, `bundle identifier`, `app bundle`, `ship an app`,
    `notarize`, `notarization`, `executable`, `dmg`, `installer`,
    `cross compile`, `app icon`, `cargo packager`, `cargo-packager`.
    Regressions that must stay: `native bindings`/`installation` →
    `/docs/installation`; `auto update`/`checkUpdate`/`downloadAndInstall` →
    `/docs/updates`; `icon` → `/docs/components/icon`; `release` stays on
    `/docs/installation` (a library release, not an app build); `updater` →
    `/docs/updates`.
    Forced defect: empty the alias block → every owned query fails; add
    `"native bindings"` to the new page → the alias guard rejects the duplicate.
11. **The generated document is registered once.** `generatedSearchEntries`
    contains `distributionSearchEntry`; its `names` include `cargo-packager`
    and the two env keys and exclude `wix`/`nsis` (Updates' aliases).
12. **The Site search page lists it.** `indexedSurfaces` contains
    `/docs/distribution` (the existing `search-docs.test.ts` compares the list
    with `generatedSearchEntries`; this case pins the row's title).

Every forced defect above is run once and reverted, and the exact failure text is
copied into the TODO entry (plans 633–637 set that rule).

---

## 7. Search vocabulary

`pageAliases` gains a `/docs/distribution` block. Exact whole-query terms only
(plan 598's rule):

`shipping`, `ship an app`, `shipping an app`, `distribute`, `distribution`,
`distribute an app`, `packaging`, `packager`, `app packaging`, `bundle
identifier`, `app bundle`, `notarize`, `notarization`, `app signing`, `sign the
app`, `dmg`, `installer`, `installer build`, `executable`, `cross compile`,
`app icon`, `release build`, `mac app`, `windows installer`, `linux app`.

Deliberately **not** claimed:

- `code signing`, `signing key`, `pubkey`, `nsis`, `appimage`, `wix` — Updates
  documents the update client's signing and formats (plan 633), and the new page
  links there.
- `install` / `installation` / `native bindings` — Installation.
- `icon` — the Icons page; `app icon` is the packaging artefact.
- `release` — Installation's release words (plan 620); the page says "app
  release" instead.
- `desktop app` — generic; App shell and Window answer it today.

`installer` moves from Deployment to this page; update plan 633's comment block
and `page-aliases.test.ts` will prove the old key no longer holds it (a term is
owned once).

---

## 8. STOP conditions

Stop and report, do not improvise, if:

- `cargo-packager` or any packager is missing at test time — the page must not
  gain a "verified" packaging claim; the recipe stays attributed. (The guards
  read the repository and declarations only; no command in §5 builds a bundle.)
- A guard in §6 can only be written by mocking the repository (e.g. the scan
  cannot be made pure). Then the absence row is reduced to prose and the plan is
  amended before implementation continues.
- `deployment.mdx`'s "Shipping" section cannot be shortened without losing a
  claim the deployment guard (`deployment-page.test.ts`) asserts. Read that test
  first; extend it rather than deleting a guarded sentence.
- The search alias guard rejects a term because it shadows another page or
  component name — drop the term and record it as a measured non-fix instead of
  renaming a page.
- `smoke:a11y` or `smoke:console` reports a violation on the new page and the
  fix would change a shared token or component — record it and stop.

## 9. Acceptance criteria

- `/docs/distribution` is in the sidebar (before Deployment), the sitemap, the
  `llms.txt` list and the Site search document list.
- The page renders its format table, config object and absence table from
  `src/lib/distribution.ts`; the MDX JSON fence equals the object.
- Every installed-declaration fact on the page is guarded in both directions;
  every recipe claim is attributed to GPUix's repository.
- Deployment no longer denies that a packaging guide exists; Updates and
  Deployment link the new page; the new page links Installation, Frame loop,
  Window, Updates and Security.
- `bundle identifier`, `cargo packager` and two reader phrases answer the new
  page first in the built index; the six pinned regressions stay.
- All gates in §5 pass, and the TODO entry records the measured before/after,
  the counts and the exact commands run.
