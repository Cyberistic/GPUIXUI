# 524 — The input payload contract: click counts, key chars and repeat

| Field | Value |
| ----- | ----- |
| Status | landed — `input-payload` 39 checks + `live-input-payload` 12; six mutation proofs (§6); headless total in §8, the full live suite is a merge gate |
| Phase | B→F (input contract / component API) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100` (harness), `140` (0.10.0 runs here), `160` (a11y dump), `163` (selection), `188` (text entry), `343` (pointer entry), `387` (a second press enters an edit) |
| Closes | the question plan `387` left implicit: can a component use a real double click instead of a "second press"? |

## 1. Question

Every pointer and key handler in the library receives `EventPayload`. Three of
its fields have never been measured, although component behaviour already
depends on them:

1. **`clickCount`** — `@gpuix/native` types it as `1 = single, 2 = double,
   3 = triple`, populated for `mouseDown`, `mouseUp` and `click`. `Grid` uses
   "a second press" to enter an edit (plan `387`) rather than a double click. Is
   a double click observable at all, and does a second press deliver `2`?
2. **`isHeld`** — `decideActivation` already refuses a repeat
   (`packages/primitives`), and `App` passes `event.isHeld === true`. Does the
   runtime populate it, and can a harness produce the held case?
3. **`keyChar`** — the terminal probe falls back to `event.key` when it is
   absent. Which surfaces receive it, and does it carry non-ASCII text?
4. **`precise` / `touchPhase`** — the scroll payload distinguishes a trackpad
   from a line wheel. A component that branches on `precise` needs to know what
   a simulated wheel reports.

The answer decides whether the library may offer a double-click contract, how a
key handler distinguishes a repeat, and how a text-producing key is read.

## 2. Reconnaissance (measured on this host, 0.10.0, before the plan)

A scratch view logged every field of every `click`/`mouseDown`/`mouseUp`/
`keyDown`/`scroll` payload, in the offscreen `TestRenderer` and in a real
window. The measured facts:

| Gesture | Measured |
| ------- | -------- |
| one click | `down n=1 b=0 x=100 y=50`, `up n=1`, `click n=1` — `x`/`y` are exact window coordinates of the centre |
| three clicks 100 ms apart | three `click` events, **each `clickCount=1`** |
| press/release pairs 80 ms apart (headless) | each `mouseDown`/`mouseUp`/`click` is `1` |
| two `mouse.click` calls 80 ms apart (live) | two `click` events, **each `clickCount=1`** |
| `keyDown(target, "a")` on a focusable `div` | `key=a`, `keyChar` **absent**, `isHeld=false` |
| `key("alt-s")` on a `div` | `key=s`, `keyChar` **absent**, no text produced |
| typing `h`, `é`, `日`, `space` into a focused `<input>` | `key=h/char=h`, `key=é/char=é`, `key=日/char=日`, `key=space/char=" "`; one `change` per key with the accumulated value (`hé日 `) |
| `cmd-a` in the input | **no** `keyDown` reaches React's handler; the native editor selects all |
| `space` after `cmd-a` | `change value=" "` — the editor replaced the selection |
| synthetic wheel `(0, 40)` | `deltaY=40`, **`precise=true`, `touchPhase="moved"`** — headless and live |

So `clickCount` is **always 1** in both harnesses, even for a real press/release
pair in a window. `keyChar` is a text-input field, not a general key field, and
it carries Unicode. `precise` is always true for a simulated wheel.

The probe must make these facts fail if they change, not restate them in prose.

## 3. Design

One new scenario pair, both reusing one view:
`input-payload` (headless) and `live-input-payload` (real window). Capability
`input` — no new capability, because this is the existing input contract.

### 3.1 `apps/playground/src/scenarios/input-payload.tsx` (new)

Export `InputPayloadProbe` and `inputPayloadScenario` (id `input-payload`,
capability `input`, title "Input payloads: click count, key char and repeat").

The view owns these readouts, each a `Readout` (`../ui.js`):

| testId | Contents |
| ------ | -------- |
| `payload-clicks` | number of `click` events |
| `payload-counts` | every click's `clickCount`, joined with `,` |
| `payload-last` | `${button}/${x},${y}` of the last click |
| `payload-press` | `clickCount` of the last `mouseDown` as a string |
| `payload-key` | last key on the div: `${key}/${keyChar ?? "-"}/${isHeld ? "held" : "down"}/${cmd ? "cmd" : "-"}` |
| `payload-field-key` | the same shape for the field's last key |
| `payload-keys` | every field key as `${key}:${keyChar ?? "-"}`, joined with `\|` |
| `payload-value` | the input's value |
| `payload-wheel` | `${deltaY}/${precise}/${touchPhase}` |

Layout: the target `div` first (`testId="payload-target"`, 200 × 120,
`tabIndex={0}`, `backgroundColor: theme.colors.muted`, `role="group"`,
`aria-label="Payload target"`), then the readouts, then the field
(`testId="payload-field"`, `<input>`, `width: 200`). The target is first so its
centre is derived from its own `bounds`, never assumed to be `(100, 60)`.

Handlers log only what the readouts need; no free-form event log (the scratch
version's log is why this plan exists, not the shipped probe).

### 3.2 Headless assertions — `input-payload`

| # | Label | Assertion |
| - | ----- | --------- |
| 1 | a click is counted once | `payload-clicks` = `1` |
| 2 | a click reports one click | `payload-counts` = `1` |
| 3 | a click carries the primary button and its centre | `payload-last` = `0/${cx},${cy}` (from `bounds("payload-target")`, rounded) |
| 4 | three clicks are three clicks | after two more clicks 80 ms apart: `payload-clicks` = `3` |
| 5 | no click is a double click | `payload-counts` = `1,1,1` |
| 6 | a press reports one click | `press("payload-target")` then `releasePointer(cx, cy)`: `payload-press` = `1` |
| 7 | a press/release pair is one more click | `payload-clicks` = `4` |
| 8 | a plain key is not held | click the target, `keyDown(..., "a")`: `payload-key` = `a/-/down/-` |
| 9 | a forced repeat is held | `keyDown(..., "a", true)`: `payload-key` = `a/-/held/-` |
| 10 | a div sees a command chord | `key("cmd-a")` with the target focused: `payload-key` = `a/-/down/cmd` |
| 11 | the field receives typed text | click `payload-field`, `key("h")`: `payload-keys` contains `h:h` |
| 12 | the field reports the character, not the key name | `key("space")`: `payload-field-key` = `space: ` (a **space**, not `space`) |
| 13 | non-ASCII typing reaches React | `key("é")` and `key("日")`: `payload-value` = `hé日 ` |
| 14 | every typed key is reported | `payload-keys` = `h:h\|é:é\|日:日\|space: ` |
| 15 | the native editor consumes select-all | `key("cmd-a")`: `payload-keys` is still exactly `h:h\|space: \|é:é\|日:日` (no `cmd-a` entry) |
| 16 | the selection was real | `key("space")`: `payload-value` = `" "` (the whole value replaced) |
| 17 | a synthetic wheel is precise | `wheel("payload-target", 0, 40)`: `payload-wheel` = `40/true/moved` |
| 18 | an option chord types nothing | click the target, `key("alt-s")`: `payload-key` = `s/-/down/-` and the field value is unchanged |

Checks 5, 12, 15 and 17 are the load-bearing negatives: they are the facts a
component author would otherwise guess wrong.

### 3.3 Live twin — `apps/playground/src/live/scenarios.tsx`

`live-input-payload`, capability `input`, `view: inputPayloadScenario.view`,
`ready: "payload-target"`:

1. two clicks 80 ms apart: `payload-clicks` = `2`, `payload-counts` = `1,1`
   (the negative transfers to a real window).
2. click the field, type `é`, `日`: `payload-value` = `é日`,
   `payload-keys` = `é:é|日:日`.
3. `cmd-a`, then `space`: `payload-value` = `" "` and no `cmd-a` entry.
4. wheel: `payload-wheel` = `40/true/moved`.
5. screenshot to `LIVE_ARTIFACTS/live-input-payload.png`.

### 3.4 `packages/testing` — the held key half

The runtime accepts it, the port already declares it, but no host verb exposes
it:

- `SmokeHost.keyDown(testId, key, isHeld?)` and the async twin gain an optional
  third argument.
- `Native.createHost` forwards it to
  `nativeSimulateKeyDown(id, key, isHeld)`.
- `apps/playground/src/live/host.ts` forwards it to the protocol's
  `keyDown({ key, elementId, isHeld })`.

This is additive: every existing call site keeps its two-argument form.

### 3.5 Registry

- `apps/playground/src/scenarios/index.ts`: import and register
  `inputPayloadScenario` after `inputScenario`.
- The live list registers `liveInputPayload` after `live-input`.
- No capability list changes.

## 4. Documentation

- `COMPONENTS.md` §"How the two evidence columns are decided": the `input` row
  gains `input-payload` and `live-input-payload`.
- `COMPONENTS.md` Tier 1 Text inputs / Tier 3 Tables rows: one sentence each —
  a **double click is not observable** (`clickCount` is always `1` in both
  harnesses), so edit-on-second-press is the honest pattern; `keyChar` carries
  the produced character on a text field (Unicode included) and is absent on a
  plain focusable `div`; the native editor consumes `cmd-a` before React sees it.
- `apps/playground/README.md`: a "Input payloads (plan `524`)" subsection after
  "Text entry (plan `188`)" with the table from §2 and the two scenario ids.
- `PLAN.md` §4: a new decision row (`D64`) recording that a double-click
  contract is unsupported and a component owns a second-press rule.
- `TODO.md`: tick this task; add a cross-team row for `components`: do **not**
  expose an `onDoubleClick` prop (List/Tree/Grid keep the second-press rule);
  the evidence is `input-payload` §8.
- `.agents/slop/plans/README.md`: index this plan under the playground table.

## 5. Commands and expected results

From the repository root:

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only input-payload
# expect: 1/1 scenario, 39/39 checks (18 assertions + presence checks), exit 0, input = verified
nub apps/playground/dist/live/run.js --list          # live-input-payload listed
nub apps/playground/dist/live/run.js --only live-input-payload
# expect: 1/1 live scenario, 12 checks, exit 0, one screenshot
nub run --filter @gpuixui/testing test               # the held-key adapter test
```

Then the gates:

```sh
nub run check
nub run lint
nub run test
```

Finally, once, because the change touches the capability table, the registry and
the host contract:

```sh
nub apps/playground/dist/smoke/run.js
# The full live suite is a merge/release gate, not a per-task check. Do not run
# `--all` for this task; the focused `live-input-payload` run is the evidence.
```

Record the headless total in §8 and in `apps/playground/README.md`. The live
registry gains one scenario (47); its full-suite total is only recorded when a
merge gate actually runs it.

## 6. Mutation proofs (the two-direction requirement)

Apply each, run the focused scenario, record the observed message, revert.

| # | Mutation | Expected failure |
| - | -------- | ---------------- |
| M1 | `onMouseDown` logs `2` instead of `event.clickCount` | #6 "a press reports one click" — `expected "1", got "2"` |
| M2 | the field logs `event.key` where `keyChar` belongs | #12 — `expected "space: ", got "space:space"` |
| M3 | expect `cmd-a:a` in the log (the reverse of the measured absence) | #15 — `expected "…\|cmd-a:a", got "h:h\|space: \|é:é\|日:日"` |
| M4 | log `isHeld` as `false` unconditionally | #9 — `expected "a/-/held/-", got "a/-/down/-"` |
| M5 | log `precise` as `false` | #17 — `expected "40/true/moved", got "40/false/moved"` |
| M6 | drop the `isHeld` argument in `Native.createHost` | the `packages/testing` adapter test fails: the fake renderer recorded `undefined`, expected `true` |

M1–M3 prove the payload readouts are not constants; M4/M5 prove the two newer
fields are read; M6 proves the new host argument is wired.

## 7. STOP conditions

Stop and report, do not improvise, if any of these holds:

- **`clickCount` is ever above 1.** The plan's central negative is wrong; record
  the measured sequence and window, turn #5 into a positive double-click
  assertion, and amend §2/§3 before continuing.
- **`cmd-a` reaches the field's `onKeyDown`.** Record the payload; #15/#16 are
  then a component-level consumption test, not an editor fact. Amend §2.
- **`keyDown(..., true)` still reads `down`.** The harness cannot express a
  repeat; record the measured value, keep #8, drop #9, and record the limitation
  instead of asserting a lie.
- **Non-ASCII typing fails live.** Keep the headless checks, record the live
  limitation with the exact error, and do not widen a tolerance to hide it.
- **The live run has no window (exit 2).** That is missing evidence, not a pass;
  leave `live-input-payload` unclaimed and say so.
- A check passes with its mutation applied (M1–M6). The check is not measuring
  what it claims; fix the check before continuing.

## 8. Results

Filled in when the plan is executed: the check counts, the mutation messages,
the full-suite totals, and the exact scenario ids that were run.

| Item | Result |
| ---- | ------ |
| reconnaissance | `clickCount` always `1` (3 clicks/2.4 s headless, 2 clicks live, press/release pairs); `keyChar` absent on a `div`, `é`/`日`/`space` on a field; `cmd-a` consumed by the editor; synthetic wheel `precise=true`, `touchPhase=moved` |
| `input-payload` | **39/39 checks**, exit `0`, `input=verified`; 18 assertions plus one presence check per readout |
| `live-input-payload` | **12/12 checks**, exit `0`, real window, one screenshot |
| `packages/testing` | the held-key adapter test passes; `SmokeHost`/`AsyncSmokeHost`/`Native`/live host forward `isHeld` |
| M1 | press logged `2` → "a press reports one click: expected \"1\", got \"2\"", exit `1` |
| M2 | field logged `key` as the character → "expected \"space: \", got \"space:space\"", exit `1` |
| M3 | expected `cmd-a:a` in the log → "expected \"h:h\|space: \|é:é\|日:日\|cmd-a:a\", got \"h:h\|space: \|é:é\|日:日\"", exit `1` |
| M4 | phase forced to `down` → "a forced repeat is held: expected \"a/-/held/-\", got \"a/-/down/-\"", exit `1` |
| M5 | wheel `precise` forced to `false` → "expected \"40/true/moved\", got \"40/false/moved\"", exit `1` |
| M6 | adapter dropped `isHeld` → the adapter test expects `keyDown:2:a:true`, got `keyDown:2:a:false` |
| full headless | `98/98` scenarios, **3428 checks**, exit `0` (one run, at the end; `input-payload` is 39 of them) |
| full live | **not run — merge gate.** The registry lists 47 scenarios; the focused `live-input-payload` run is 12/12 green. No full-suite total is claimed. |
| gates | pending |
