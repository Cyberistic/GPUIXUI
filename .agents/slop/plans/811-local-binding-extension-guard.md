# 811 — The binding fingerprint must see a local runtime extension

**Phase:** F (native evidence integrity) · **Workstream:** playground · **Status:** landed

**Depends on:** `100`, `140`, `189`, `529`, `530`.

**Owns:** `apps/playground` and `packages/testing` only. No other path is
edited.

---

## 1. The bug being guarded

Plan `529` closed one provenance hole: the suite had claimed `verified 0.10.0`
while running a binding built from GPUix `main`, so `packages/testing/src/binding.ts`
now scans the artifact for serde field names the release does not contain
(`MAIN_ONLY_MARKERS`) and both runners refuse to run when one is found.

Plan `530` then added a **second** kind of non-release artifact: this repo's own
patch, `apps/playground/patches/gpuix-zindex.patch`, which adds
`StyleDesc.zIndex` to the pinned source. Its Rust field is `z_index` in a struct
declared `#[serde(rename_all = "camelCase")]`, so a patched binary contains the
literal `zIndex` and a release binary does not.

The fingerprint cannot see it:

```ts
// packages/testing/src/binding.ts
export const MAIN_ONLY_MARKERS = [ "focusVisible", …, "scrollY" ]; // no "zIndex"
```

Measured on this host (2026-10-20):

| Artifact | SHA-256 (12) | Bytes | `strings … \| grep -c zIndex` |
| -------- | ------------ | ----- | ----------------------------- |
| `apps/playground/native/gpuix-native.darwin-x64.node` (the copy `install-binding.mjs` installs) | `fee1fcaa7d44` | 25 546 368 | **0** |
| the same file installed at `apps/playground/node_modules/@gpuix/native/` | `fee1fcaa7d44` | 25 546 368 | **0** |
| plan `530`'s patched build (superseded, no longer on disk) | `e8064859…` | 25 606 504 | 1 by construction |

Release style keys are present exactly once in the same artifact
(`backgroundColor`, `pointerEvents`, `gridColumnMin`, `boxShadow`), and
`focusVisible`/`registerFont` are absent, so `strings` is a valid witness for
this class of name.

So the current state is consistent **by luck**: the artifact in use is plan
`529`'s release-tag build (`build-release.sh` → `release/gpuix`), because the
build hook `apps/playground/scripts/install-binding.mjs` copies
`apps/playground/native/` over the store copy on every
`nub run --filter playground build`. Nothing in the suite would notice if a
`zIndex` build were installed instead — the run would print the release pin and
claim `verified 0.10.0` on a runtime a consumer cannot install. That is exactly
the failure mode plan `529` exists to prevent, one layer down.

Two secondary defects follow from the same root:

1. **The documented build is not release-parity by default.**
   `apps/playground/scripts/build-native-binding.sh` applies the `zIndex` patch
   unconditionally (step 4), while the transform patch one step later is
   opt-in (`GPUIX_TRANSFORM=1`) with an explicit reverse-revert. The README
   tells a reader the built artifact carries `zIndex`; the artifact the suite
   actually runs does not.
2. **The record overstates the artifact.** `apps/playground/README.md` "The
   binding on this host" says the script "applies `gpuix-zindex.patch` … and
   drops it at `node_modules/…`" without saying that the artifact is then
   replaced, or that no scenario exercises `zIndex` (plan `530` measured it with
   a scratch probe outside the registry, and its own §5 records that the
   published typings cannot express the field).

**Goal:** make "release parity" a checked property of the artifact for both
failure modes (newer source *and* local extension), make the default build
match the pinned release, and correct the record. No `zIndex` scenario is added:
the published package cannot type the field, the library deliberately ships
"no `zIndex`" (`packages/tw/src/unsupported.ts`, `ToastViewport`), and a
capability the consumer cannot install is not evidence.

---

## 2. What is deliberately *not* claimed

- **No `zIndex` behaviour probe.** The extension stays a research artifact; a
  scenario would have to run on a non-release binding and could not be cited as
  library evidence. Plan `530`'s Rust tests remain its only automated guard.
- **No transform marker.** `GPUIX_TRANSFORM=1` (plan `538`) adds renderer API,
  not a uniquely named style field: `transform` occurs 58 times in the release
  binary, so it is not a usable witness. Recorded as a limit, not silently
  ignored.
- **No published-binary CI run.** Still the gold standard, still a TODO
  (`.github/workflows/native-smoke.yml`).
- **No change to the patch, the Rust tree or the built `.node`.** This plan
  changes the detector, the default build flag, the refusal message and the
  record.

---

## 3. Design

### 3.1 One more marker list, one combined seam

`packages/testing/src/binding.ts`:

```ts
/**
 * Names that exist only in this repo's patches to the pinned source, never in a
 * published release. Each is a serde field name the compiler keeps in the
 * binary. Unlike MAIN_ONLY_MARKERS the fix is a rebuild without the patch.
 */
export const LOCAL_EXTENSION_MARKERS: ReadonlyArray<string> = ["zIndex"];

export const extensionIssue = (binary, pin): Option.Option<string> => …;

/** `Some(reason)` when the artifact is not release-parity: newer source first,
 *  then a local extension. */
export const artifactIssue = (binary, pin): Option.Option<string> =>
  Option.orElse(fingerprintIssue(binary, pin), () => extensionIssue(binary, pin));
```

Rules:

- **Gated on the pin it was measured against** (`MARKER_VERSION = "0.10.0"`),
  exactly like `MAIN_ONLY_MARKERS`: GPUix may ship `zIndex` later, and then it
  is a release capability, not an extension.
- **The main-only reason wins** when both are present, because "built from a
  newer source" is the stronger claim.
- **`zIndex` is the only marker**; a second extension must be measured against
  the release artifact before it is added (a marker that already exists in the
  release is useless).
- `firstMarker`/`firstPresent` use `Arr.findFirst` over the list (Effect-first
  rule), not `Array.prototype.find`.

The app boundary already has the single seam:

```ts
// apps/playground/src/binding.ts
Binding.fingerprintIssue(bytes, bindingPin)  // → Binding.artifactIssue(…)
```

Both runners print a neutral remedy instead of "newer source", because the fix
for an extension is a restore, not a rebuild:

> `rebuild the binding from the 0.10.0 tag (plan 529 §3) — the suite cannot
> claim verified 0.10.0 on a newer source`

becomes

> `the suite reports verified 0.10.0 only on the pinned release build — restore
> it with nub run --filter playground build (plans 529 §3, 811)`

### 3.2 The default build matches the release

`apps/playground/scripts/build-native-binding.sh` step 4 becomes the same
shape as the transform step:

- `GPUIX_ZINDEX=1` → apply the patch (idempotent), and say the artifact is not
  release evidence;
- otherwise → reverse-apply a stale application, so a build always matches the
  flag, and print that the flag turns it on.

The build still installs into `node_modules` only. That is now safe: the next
`nub run --filter playground build` runs `install-binding.mjs`, which restores
the pinned release copy from `apps/playground/native/`, and the suite refuses
the extension artifact in the meantime.

### 3.3 The record

- `apps/playground/README.md` "The binding on this host": the default build is
  the pinned release; `zIndex` is opt-in and not part of the suite's evidence;
  the fingerprint refuses an extension artifact; name the two install routes
  (`build-native-binding.sh` → `node_modules`; `install-binding.mjs` → the
  `native/` copy on every build).
- `.agents/slop/plans/530-gpuix-zindex.md`: status line amended — landed, then
  opt-in (plan `811`), artifact superseded by plan `529`'s release build; no
  scenario.
- `.agents/slop/plans/README.md`: row `811`, and `530`'s row notes the flag.

---

## 4. Exact files

| File | Change |
| ---- | ------ |
| `packages/testing/src/binding.ts` | `LOCAL_EXTENSION_MARKERS`, `extensionIssue`, `artifactIssue`; `firstPresent` over `Arr.findFirst`; module doc |
| `packages/testing/src/binding.test.ts` | header comment; six new cases (§6) |
| `apps/playground/src/binding.ts` | call `Binding.artifactIssue`; doc comment |
| `apps/playground/src/smoke/run.ts` | refusal remedy line (~line 426) |
| `apps/playground/src/live/run.ts` | refusal remedy line (~line 131) |
| `apps/playground/scripts/build-native-binding.sh` | step 4 opt-in via `GPUIX_ZINDEX`; header usage |
| `apps/playground/README.md` | "The binding on this host" correction |
| `.agents/slop/plans/530-gpuix-zindex.md` | status amendment |
| `.agents/slop/plans/README.md` | row `811`; row `530` note |
| `TODO.md` | new playground row, ticked; cross-team note for the pin decision |

No other path is touched.

---

## 5. Steps, commands, expected results

1. **Read the current seam.**
   `sed -n '1,120p' packages/testing/src/binding.ts` and
   `sed -n '30,72p' apps/playground/src/binding.ts`.
   Expected: `MAIN_ONLY_MARKERS` lists eleven names, none of them `zIndex`.

2. **Confirm the artifact has no marker (the release baseline).**
   ```sh
   shasum -a 256 apps/playground/native/gpuix-native.darwin-x64.node | cut -c1-12
   strings -a apps/playground/native/gpuix-native.darwin-x64.node \
     | grep -c zIndex
   ```
   Expected: `fee1fcaa7d44` (or the current pinned build) and `0`.

3. **Write the failing test first.** Add the six cases in §6 and run
   ```sh
   nub run --filter @gpuixui/testing test
   ```
   Expected: **red** — `extensionIssue`/`artifactIssue` do not exist yet (a
   compile error in the test file is the first red).

4. **Implement §3.1–§3.3.** Run
   ```sh
   nub run --filter @gpuixui/testing test
   ```
   Expected: green, `binding.test.ts` has six more passing cases.

5. **Prove the boundary in both directions.**
   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only layout-flex
   ```
   Expected: `1/1 scenarios passed`, exit `0` (the release artifact is accepted).
   Then poison a copy of the artifact and re-run:
   ```sh
   cp apps/playground/native/gpuix-native.darwin-x64.node \
      apps/playground/node_modules/@gpuix/native/gpuix-native.darwin-x64.node
   printf 'zIndex' >> \
      apps/playground/node_modules/@gpuix/native/gpuix-native.darwin-x64.node
   nub apps/playground/dist/smoke/run.js --only layout-flex
   ```
   Expected: exit `1`, the message names the local `zIndex` extension and the
   remedy; **no scenario runs** (the guard is before the binding import).
   Restore and re-run:
   ```sh
   nub run --filter playground build   # install-binding: "installed … from native/"
   nub apps/playground/dist/smoke/run.js --only layout-flex
   ```
   Expected: exit `0` again.

6. **Check the build script's default.**
   ```sh
   GPUIX_ZINDEX= sh apps/playground/scripts/build-native-binding.sh
   ```
   STOP — do **not** rebuild the binding for this plan: it costs ~12 minutes
   and rewrites the shared artifact. Read step 4 instead and confirm by
   inspection that the default branch reverse-applies and the flag branch
   applies. (If a rebuild is ever run, its output must read
   `reverted gpuix-zindex.patch` with no flag and
   `applied gpuix-zindex.patch; this artifact is NOT release evidence` with
   `GPUIX_ZINDEX=1`.)

7. **Gates.**
   ```sh
   nub run check
   nub run lint
   nub run test
   ```
   Expected: all green; playground test count unchanged, testing `+6`.

8. **Ledgers.** Update `TODO.md` (new ticked row), the plan index (`811`, and
   `530`'s amendment) and the README section. Commit, then push
   `agent/playground`.

---

## 6. Test plan

`packages/testing/src/binding.test.ts` — each case must fail without its fix:

| Test | Guards | Red without the fix |
| ---- | ------ | ------------------- |
| `names the local extension a patched binding carries` | `extensionIssue` finds `zIndex` in a release binary plus that one marker | function absent → compile error |
| `accepts a release artifact that only carries release fields` | `extensionIssue` is `None` on `backgroundColor`/`lineClamp`/`boxShadow` | a detector that flags any string |
| `does not apply an extension marker to another version` | the `MARKER_VERSION` gate | a permanent ban on `zIndex` |
| `artifactIssue reports a newer source before a local extension` | `fingerprintIssue` precedence when both exist | returning the extension reason for a `main` build |
| `artifactIssue reports a local extension on its own` | the fall-through | `artifactIssue` == `fingerprintIssue` (the bug) |
| `artifactIssue accepts a release artifact` | no false positives on the artifact the suite runs | a guard that refuses everything |

The boundary proof in §5.5 is the second direction at the real seam: the
release artifact runs, a `zIndex`-tagged artifact exits `1` before any scenario,
and the restored artifact runs again. It is the same trick plan `529` used with
`focusVisible` and it needs no rebuild.

---

## 7. STOP conditions

- **STOP** if `strings` finds `zIndex` in `apps/playground/native/*.node`: the
  baseline is already an extension build, so the "release accepted" half cannot
  be proven. Record the hash and report; do not weaken the guard.
- **STOP** if the installed artifact's hash differs from `native/` after
  `nub run --filter playground build` (its `install-binding.mjs` hook).
- **STOP** if `zIndex` is not present in a binary built with `GPUIX_ZINDEX=1`
  after a rebuild — the marker premise is wrong and the detector needs a
  different witness (do not guess one).
- **STOP** if the boundary proof runs scenarios on the poisoned artifact (that
  means the guard is after the import and the run may have loaded a mismatched
  library).
- **STOP** if any gate needs a tolerance, a skipped test or a `check-tests-ok`
  exception.
- **Do not** rebuild the binding for this plan, and **do not** add a `zIndex`
  scenario.

---

## 8. Acceptance

- `extensionIssue` and `artifactIssue` are exported, documented and tested with
  six cases that each fail in the documented direction.
- The app boundary calls `artifactIssue`; both runners print the restore remedy.
- `build-native-binding.sh` is release-parity by default and prints the opt-in
  notice with `GPUIX_ZINDEX=1`.
- The README states what the artifact is, what `zIndex` is not, and the two
  install routes; plan `530`'s status records the supersession; `TODO.md` has
  the ticked row.
- `nub run check`, `nub run lint`, `nub run test` green; the focused headless
  scenario `layout-flex` is green on the release artifact and the poisoned copy
  exits `1` with the new message.

---

## 9. Outcome (measured on this host, 2026-10-20)

**Status:** landed. Code, tests, pipeline default and record agree.

**The artifact (before any change).** `apps/playground/native/` and the
installed store copy were both `fee1fcaa7d44`, 25 546 368 B, with `zIndex`
**0** times in `strings` and `backgroundColor`/`pointerEvents`/`gridColumnMin`/
`boxShadow` once each; `focusVisible` and `registerFont` absent. The release
build (`build-release.sh` → `release/gpuix`, plan `529`) is what the build hook
installs, so the suite had been running a release-parity artifact even though
the documented build would produce the extension.

**Red first.** The six new cases failed with
`TypeError: extensionIssue is not a function` / `artifactIssue is not a
function` (6 failed) before the implementation, then passed. `packages/testing`
went **69 → 75** tests.

**Boundary proof (both directions, no rebuild).**

| Step | Command | Result |
| ---- | ------- | ------ |
| release | `nub apps/playground/dist/smoke/run.js --only layout-flex` | `1/1 scenarios passed`, `layout=verified`, exit `0` |
| poisoned | the installed `.node` plus a trailing `zIndex`, same command | exit `1`; `@gpuix/native 0.10.0 carries the local zIndex extension: this artifact is not the pinned release build`; **no scenario line** — the guard precedes the binding import |
| restored | `nub run --filter playground build` (its `install-binding.mjs` hook) then the same command | hashes `fee1fcaa7d44` on both copies, `1/1`, exit `0` |

**Measured correction while proving it:** the first remedy text told the reader
to run `node apps/playground/scripts/install-binding.mjs`; a bare `node` on this
box is too old (`SyntaxError: Unexpected reserved word`), and the repo rule is
to go through `nub`. Both runners now say
`restore it with nub run --filter playground build`, which runs the hook under
the pinned Node.

**Gates.**

- `nub run check` → exit `0`.
- `nub run lint` → exit `0`.
- `nub run test` → exit `0` (playground **635**, testing **75**, components
  **308**, primitives **282**, tokens **196**, tw **103**, icons **19**,
  motion **34**, docs **7**).
- Full headless suite (end-of-task, because the guard is on every scenario's
  path): **121/121** scenarios, **4573** checks, **66** capabilities,
  **476.9 s**, exit `0`; `host` still reads
  `gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`.
  No live suite (merge/release gate; no live code path changed).

**Files changed:** `packages/testing/src/binding.ts` (+ test),
`apps/playground/src/binding.ts`, `apps/playground/src/{smoke,live}/run.ts`,
`apps/playground/scripts/build-native-binding.sh`, `apps/playground/README.md`,
`.agents/slop/plans/530-gpuix-zindex.md`, `.agents/slop/plans/README.md`,
`TODO.md`.

**Not changed:** the patch, the Rust tree, the built `.node`, the library's
paint-order stacking model, and the absence of a `zIndex` scenario.
