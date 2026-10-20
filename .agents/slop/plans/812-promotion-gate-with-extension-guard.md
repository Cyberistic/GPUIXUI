# 812 — Promotion gate on the head that includes the binding-extension guard

**Phase:** F (merge gate) · **Workstream:** playground · **Status:** landed

**Depends on:** `639`, `653`, `656`, `675`, `677`, `691`, `699`, `702`, `714`,
`723`, `735`, `739`, `745`, `751`, `755`, `762`, `768`, `777`, `786`, `791`,
`797`, `801`, `807`, `811`.

**Owns:** no source. Verification only, plus the ledgers (`TODO.md`,
`.agents/slop/plans/README.md`, `apps/playground/README.md` if a reported total
moves).

---

## 1. Why this gate exists

The last promotion gate (plan `786`) measured headless **117/117** (`4278`
checks, 65 capabilities) and live **106/106** (`3059` checks, 62 capabilities).
Since then four scenarios have landed and **no full live run has included
them**:

| Plan | Live id | Checks |
| ---- | ------- | ------ |
| `791` | `live-dialog-scrim` | 62 |
| `797` | `live-field-ink` | 19 |
| `801` | `live-scroll-affordance` | 93 |
| `807` | `live-gradient` | 121 |

Plan `811` then changed the **preflight of both runners** (the binding
fingerprint), which is on the path of every live scenario, and added no live id.
The live registry lists **110** ids.

The branch is prepared for the promotion merge (`TODO.md` → Playground
workstream, `[~]`), and D6 says the owner/supervisor performs the merge. This
plan produces the gate the merge needs on the current head; it does not merge.

---

## 2. Preconditions (each must hold before a run)

1. `git status --short` is empty.
2. `git rev-list --count HEAD..origin/master` is `0`; if not, merge first and
   re-record the head. **Amended 2026-10-20:** master is red (four implicit-`any`
   parameters in `packages/primitives/src/recipe/registry.ts`; see the TODO
   blocker), so this gate runs on the last buildable head, `071a9670`, three
   commits behind. The promotion merge stays blocked until master type-checks —
   merging it now makes the playground build fail before any scenario runs.
3. `git rev-parse --short HEAD` is recorded in the report's `commit` field.
4. The installed binding is the **pinned release** artifact:
   ```sh
   shasum -a 256 apps/playground/native/gpuix-native.darwin-x64.node \
     apps/playground/node_modules/@gpuix/native/gpuix-native.darwin-x64.node | cut -c1-12
   ```
   Both hashes must match and `strings -a … | grep -c zIndex` must be `0`.
5. `nub run --filter playground build` is current.
6. `nub apps/playground/dist/smoke/run.js --list` prints **121** ids and
   `nub apps/playground/dist/live/run.js --list` prints **110** ids.

**STOP** if the artifact is not release-parity: the fingerprint refuses it
(plan `811`), and a run on it is not evidence.

---

## 3. Commands and expected results

```sh
# 1. Headless: the whole registry (bare command — `--all` is a usage error here).
nub apps/playground/dist/smoke/run.js > .artifacts/gate-headless.log 2>&1; echo $?

# 2. Live: the whole registry, in a real window.
nub apps/playground/dist/live/run.js --all > .artifacts/gate-live.log 2>&1; echo $?

# 3. The three gates.
nub run check; echo $?
nub run lint; echo $?
nub run test; echo $?
```

Expected:

| Run | Expectation |
| --- | ----------- |
| headless | `121/121 scenarios passed`, exit `0`, **4573** checks, 66 capabilities (re-baselined by plan `807`; re-measured on this head) |
| live | `110/110 scenarios passed`, exit `0`, **≈ 3354** checks, 62 capabilities |
| check / lint / test | exit `0`; playground **635**, testing **75**, components **308**, primitives **282**, tokens **196**, tw **103**, icons **19**, motion **34**, docs **7** |

The live total is derived, not guessed: `3059` (plan `786`) `+ 295` (the four
new ids above). `live-tier2-editing` may report its documented 32- or 33-check
branch (plan `555`), so **±1** is acceptable; anything further from `3354`
needs an explanation written into §5. Read the true numbers from
`apps/playground/.artifacts/{smoke-report.json,live-report.json}`, never from a
prediction.

Verify in both reports: every `host` line ends with
`@gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`; the
headless `capabilities` list is all `verified`.

Verify no provenance side effects: a plain run writes **no** `provenance.json`
and no capture directory under `.artifacts/`.

---

## 4. Test plan for the gate itself

A gate is verification, so its "test" is the two directions it must distinguish:

- **Green direction:** all scenarios pass, the totals are read back from the
  JSON, and the headless/live ids include the four new ones.
- **Red direction:** do **not** break a scenario to prove the suite can fail —
  plans `791`/`797`/`801`/`807` each recorded mutation proofs at their own
  landing. Instead assert the total arithmetic against the reports: if a new
  scenario silently failed to register, the count would be `3059 + less than
  295` and the gate must stop.

**STOP** if any scenario fails, flakes, or is skipped; if the totals move
without a named scenario explaining the delta; if a `host` line lacks the
release pins; or if the live run opens no window (exit `2`).

A failure is investigated on its own scenario first
(`--only <id>`), never by re-running the full suite blindly. A flake is recorded
with both run ids and its exact check name; if it reproduces, STOP and write a
plan for the fixture rather than widening a tolerance.

---

## 5. Outcome (measured 2026-10-21)

**Head:** `071a9670` (three behind `origin/master`, which is red — see below).
Registries listed before the runs: **121** headless / **110** live.

**Headless** — `nub apps/playground/dist/smoke/run.js`, exit `0`:
**121/121** scenarios · **4573** checks · **66** capabilities ·
**368.4 s**. `host`: `gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0
(gpuix 9fcd6288, zed 81c99f81, runtime shaders)`.

**Live** — `nub apps/playground/dist/live/run.js --all`, exit `0`:
**110/110** scenarios · **3354** checks · **64** capabilities ·
**1582.3 s**. `host`: `gpuix live window darwin-x64 @gpuix/native 0.10.0
(gpuix 9fcd6288, zed 81c99f81, runtime shaders)`.

**Delta arithmetic (exact):** the live total is plan `786`'s `3059 + 295`, and
the four new ids report their planned counts — `live-dialog-scrim` **62**,
`live-field-ink` **19**, `live-scroll-affordance` **93**, `live-gradient`
**121**; `live-tier2-editing` took its **33**-check branch. Capabilities went
**62 → 64**, not the predicted 62: `modal` (`live-dialog-scrim`) and `gradient`
(`live-gradient`) are now covered by a live scenario directly, where `modal`
was previously only an alias of `live-focus`/`live-overlay`.

**Provenance:** both `host` lines carry the release pins; a plain run wrote no
`provenance.json` and no capture directory. The artifact used was the pinned
release (`fee1fcaa7d44`, `zIndex` count `0`).

**Gates:** `nub run check` exit `0`, `nub run lint` exit `0`, `nub run test`
exit `0` (playground **635**, testing **75**, components **308**, primitives
**282**, tokens **196**, tw **103**, icons **19**, motion **34**, docs **7**).

**The merge is blocked by master, not by this branch.** `origin/master` gained
the three-tier migration (`a6cf3328`) and does not type-check:
`nub run --filter @gpuixui/primitives check-types` exits `1` with four
implicit-`any` callback parameters in
`packages/primitives/src/recipe/registry.ts` (lines 257, 269, 275, 278). A
local merge was taken **cleanly** and then failed
`nub run --filter playground build` at the same errors (the playground vendors
primitives), so the merge was reset and this gate ran on the last buildable
head. A TODO cross-team blocker records it; once master type-checks, the merge
and a fresh gate are the remaining steps.

- Head: `<sha>`, 0 behind `origin/master`.
- Registries listed before the runs: `<n>` headless / `<n>` live.
- Headless: `<passed>/<total>` · `<checks>` checks · `<capabilities>`
  capabilities · `<duration>` s · exit `<code>`.
- Live: `<passed>/<total>` · `<checks>` checks · `<capabilities>`
  capabilities · `<duration>` s · exit `<code>`; `live-tier2-editing` took its
  `<n>`-check branch.
- Delta arithmetic: live total `= 3059 + <n>` with the four new ids named and
  their per-scenario checks read from the report.
- Gates: check `<code>`, lint `<code>`, test `<code>` (playground `<n>`).
- Ledgers updated: `TODO.md` row, plan index status, any README total that moved.

---

## 6. Acceptance

- Both full suites ran on the recorded head and both exited `0`.
- The four new live ids appear in the live report with non-zero checks.
- The totals are consistent with the prior gate plus the named additions.
- `nub run check`, `nub run lint` and `nub run test` are green.
- No `provenance.json` and no capture directory were written.
- The outcome is recorded here, in `TODO.md` and in the plan index.
