# 509 — The platform toggle is one choice, and a click proves it

**Status:** implemented (2026-10-18) · **Phase:** F (showcase) / G (release gate) ·
**Owner:** docs-site
**Depends on:** `410`, `412`, `416`, `420`, `434`, `444`, `445`, `446`, `495`,
`496`
**Owns:** `apps/docs`, `docs/preview-strategy.md` is untouched, the
component-page template is untouched
**Number:** `509` — `400–499` is full and `500–508` are used; this is the next
free number, as `README.md` records.

## 1. The gap this plan closes

`MISSION.md` states the platform-style acceptance in one sentence:

> A reader toggles macOS -> Windows and every preview changes; … Furthermore the
> toggle state belongs in the page URL (shareable) and is remembered across
> navigation.

**Nothing in the gate operates the control.** `smoke:browser` *loads*
`/docs/components/button?platform=win32`, `/docs/components/badge?platform=win32`
and `/docs/theming?platform=linux` and asserts the painted platform, and
`src/platform/platform.test.ts` covers the pure URL/storage helpers. No check
clicks a platform option, so a regression in any of these would pass every gate:

- `PlatformProvider.setPlatform` no longer calls `replaceSearch` (the URL stops
  carrying the choice, so a copied link loses it);
- it no longer calls `writeStored` (a navigation that drops the query string
  forgets it);
- the `<html data-platform>` effect is removed (previews stop following the
  toggle, even though a shared URL still works);
- `applyPlatformToSearch` stops removing `?platform` for `default` (canonical
  URLs gain a meaningless parameter).

Measured on the production build in headless Chrome today (evidence for the
step values the smoke will assert):

```text
/docs/components/button, dark          platform=default  search=""              preview mono=Menlo
click Windows                          platform=win32    search="?platform=win32" preview mono=Consolas
click Badge in the sidebar             platform=win32    search="?platform=win32" preview mono=Consolas
/docs/theming (fresh load, no param)   platform=linux    search="?platform=linux" note="Showing the Linux platform style…"
click Default                          platform=default  search=""              preview mono=Menlo
```

So the click path works **today**. This plan is a gate, not a repair — plus one
real semantics defect:

**The control is not one choice.** It renders four independent toggle buttons
(`aria-pressed`) for a single-select value: a screen reader announces four
"toggle button, pressed / not pressed" controls, the tab order has four stops,
and no arrow key does anything. A single-select control is a **radio group**
(WAI-ARIA APG): `role="radiogroup"` with `role="radio"` children,
`aria-checked`, one roving tab stop, and arrows that move and apply.

**One sentence for the plan's result:** the platform switcher is one radio
group, and a new `smoke:platform` drives the acceptance sentence end to end —
click, URL, storage, navigation, Default and the keyboard — failing by name when
any of it breaks.

## 2. Files to change

All paths relative to the worktree root. **Do not edit `packages/*`,
`examples/*`, `apps/playground` or `docs/*`.** If a step finds a defect outside
`apps/docs`, record it in `TODO.md` and stop at that step's STOP condition.

### 2.1 New: `apps/docs/src/platform/platform-toggle-logic.ts`

Pure, DOM-free, no `effect` import (the docs bundle forbids it —
`src/architecture.test.ts`). The neighbour table is explicit so no index
arithmetic can be off by one; the list of platforms stays owned by
`platformNames` in `./platform.ts` and a test proves the table follows it.

```ts
import type { PlatformName } from "@gpuixui/tokens";

/** The direction an arrow key moves the choice. */
export type PlatformStep = "next" | "previous";

/**
 * Each platform's neighbour in both directions. `platformNames` owns the order;
 * `platform-toggle-logic.test.ts` walks this table and proves it agrees.
 */
export const platformSteps: Readonly<
  Record<PlatformName, Readonly<Record<PlatformStep, PlatformName>>>
> = {
  darwin: { next: "linux", previous: "default" },
  linux: { next: "win32", previous: "darwin" },
  win32: { next: "default", previous: "linux" },
  default: { next: "darwin", previous: "win32" },
};

const ARROW_STEP: Readonly<Record<string, PlatformStep>> = {
  ArrowRight: "next",
  ArrowDown: "next",
  ArrowLeft: "previous",
  ArrowUp: "previous",
};

/** The choice an arrow key moves to; any other key is not a navigation. */
export const movePlatform = (
  current: PlatformName,
  key: string,
): PlatformName | undefined => {
  const step = ARROW_STEP[key];
  return step === undefined ? undefined : platformSteps[current][step];
};
```

`platformNames` is imported by the **test**, not this module: the browser reads
the table, and a script imports this file directly under Node, where only
explicitly-extended imports resolve.

### 2.2 New: `apps/docs/src/platform/platform-toggle-logic.test.ts`

Header comment: *what breaks without this* — the arrows move to a neighbour the
visible order does not have, or a new platform is added to `platformNames` and
the table silently keeps four entries.

Tests (each must be able to fail):

1. **Walk forward** — from `"default"`, four `next` steps visit
   `["default", "darwin", "linux", "win32", "default"]`. This pins the table to
   `platformNames`' order without index access.
2. **Walk backward** — the same walk with `previous` returns the reverse order.
3. **Every neighbour is invertible** — for each name in `platformNames`,
   `platformSteps[platformSteps[name].next].previous === name` and the reverse.
4. **Every listed platform is covered** — `Object.keys(platformSteps)` equals
   `[...platformNames]` (sorted compare) and each entry has both directions.
5. **Only arrows navigate** — `movePlatform("darwin", "Enter")`, `"Tab"`, `" "`,
   `"k"` and `""` are `undefined`; all four arrow keys return a platform.
6. **The four arrows are two directions** — `ArrowRight`/`ArrowDown` give the
   same answer, `ArrowLeft`/`ArrowUp` give the same answer, and the two differ.

### 2.3 Change: `apps/docs/src/platform/platform-toggle.tsx`

Replace the four `aria-pressed` buttons with one radio group. Keep
`data-platform-toggle` (the smokes and `platform-values.test.tsx` select it) and
keep the existing Tailwind classes.

```tsx
import { useRef } from "react";
import { platformTypes, type PlatformName } from "@gpuixui/tokens";
import { platformNames } from "./platform";
import { movePlatform } from "./platform-toggle-logic";
import { usePlatform } from "./platform-provider";

/**
 * Switches the docs between the library's platform styles. One choice, so it is
 * one radio group: a roving tab stop, arrows that move and apply, and the
 * provider keeping the URL and storage in step (plan 509).
 */
export function PlatformToggle() {
  const { platform, setPlatform } = usePlatform();
  const options = useRef(new Map<PlatformName, HTMLButtonElement>());

  const move = (next: PlatformName): void => {
    setPlatform(next);
    options.current.get(next)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Platform style"
      data-platform-toggle=""
      className="flex items-center gap-0.5 rounded-md border border-fd-border bg-fd-muted p-0.5 text-xs"
    >
      {platformNames.map((name) => {
        const checked = platform === name;
        return (
          <button
            key={name}
            ref={(element) => {
              if (element === null) options.current.delete(name);
              else options.current.set(name, element);
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => setPlatform(name)}
            onKeyDown={(event) => {
              const next = movePlatform(platform, event.key);
              if (next === undefined) return;
              event.preventDefault();
              move(next);
            }}
            className={`rounded px-2 py-1 transition-colors ${
              checked
                ? "bg-fd-primary text-fd-primary-foreground"
                : "text-fd-muted-foreground hover:text-fd-foreground"
            }`}
          >
            {platformTypes[name].label}
          </button>
        );
      })}
    </div>
  );
}
```

Rules this encodes: automatic activation (an arrow selects and applies, the APG
radio-group rule); exactly one `tabIndex={0}`; the clicked option keeps focus and
becomes the tab stop; `event.preventDefault()` stops the arrow from scrolling
the sidebar.

### 2.4 Change: `apps/docs/src/components/platform-values.test.tsx`

The existing assertion `markup.match(/aria-pressed="true"/g)` must become
`aria-checked="true"` — **and gain a roving-tabindex assertion**, because a
radio group with four tab stops is still four tab stops:

```ts
it("is one radio group with one tab stop", () => {
  const markup = renderToStaticMarkup(<PlatformToggle />);
  expect(markup).toContain('role="radiogroup"');
  expect(markup.match(/role="radio"/g)).toHaveLength(platformNames.length);
  expect(markup.match(/aria-checked="true"/g)).toHaveLength(1);
  expect(markup.match(/tabindex="0"/g)).toHaveLength(1);
  expect(markup.match(/tabindex="-1"/g)).toHaveLength(platformNames.length - 1);
});
```

Update the test file's header comment to name the new failure (a toggle that
looks like four independent switches).

### 2.5 New: `apps/docs/scripts/smoke-platform.ts`

Header: plan 509, what it proves, usage, the `0`/`1`/`2` contract. Copy the
`parseOptions` shape from `scripts/smoke-search.ts` (same flags: `--base-url`,
`--chrome`, `--no-build`, `--help`).

**Every expected value is derived**, never typed: `platformTypes[name].label`
for the option text, `platformTheme(themes.dark, name).typography.mono` for the
mono family, `platformNames` for the order. The one literal is the route.

Pure helpers in the script:

```ts
const monoFor = (platform: PlatformName): string =>
  platformTheme(themes.dark, platform).typography.mono;

const labelFor = (platform: PlatformName): string =>
  platformTypes[platform].label;
```

Read the control's state with one `evaluate`:

```ts
interface ToggleState {
  readonly platform: string;
  readonly search: string;
  readonly path: string;
  readonly mono: ReadonlyArray<string>;
  readonly checked: string;
  readonly tabStops: number;
  readonly note: string;
}
```

- `platform` = `document.documentElement.dataset.platform ?? ""`
- `mono` = every `[data-preview-surface]` style's `--preview-font-mono`, in
  document order (reuse the regex used by `scripts/smoke-browser.ts`)
- `checked` = the text of `[data-platform-toggle] [role="radio"][aria-checked="true"]`
- `tabStops` = the count of `[data-platform-toggle] [role="radio"][tabindex="0"]`
- `note` = `[data-platform-previews] p` text (the Theming page's live sentence)

Click an option by label:

```ts
const clickPlatform = async (
  session: Session,
  platform: PlatformName,
): Promise<boolean> => {
  const result = await session.evaluate(`(() => {
    const option = [...document.querySelectorAll('[data-platform-toggle] [role="radio"]')]
      .find((button) => (button.textContent ?? "").trim() === ${JSON.stringify(labelFor(platform))});
    if (option === undefined) return "missing";
    option.click();
    return "clicked";
  })()`);
  if (result !== "clicked") return false;
  return session.waitFor(
    `document.documentElement.dataset.platform === ${JSON.stringify(platform)}`,
  );
};
```

**The steps, in one browser session, dark scheme:**

`open(path, platform)` navigates, then waits for a **settled** document: exactly
one toggle group, `<html data-platform>` equal to the expected platform, at least
one preview surface, and every surface's `--preview-font-mono` equal to
`monoFor(platform)`. Without that wait the check reads the server's default
snapshot for a frame (measured while writing this plan) and the *settle* failure
would be reported as a preview failure.

1. Open `/docs/components/button` on `default`.
   - `platform === "default"`, `search === ""`
   - every `mono` entry === `monoFor("default")`
   - `checked === labelFor("default")`, `tabStops === 1`
2. Click `"win32"`; settle on `win32`.
   - `platform === "win32"`, `search` carries `platform=win32`
   - every `mono` entry === `monoFor("win32")` (**this is the repaint**)
   - `checked === labelFor("win32")`, `tabStops === 1`
3. **A fresh, parameter-free document** — open `/docs/components/button` with no
   query at all.
   - `platform === "win32"` and the provider re-writes `?platform=win32`
   - every `mono` entry === `monoFor("win32")`
4. Click the sidebar link `a[href="/docs/components/badge"]` (a client
   navigation); wait for the path, then settle on `win32`.
   - `platform === "win32"`, `search` still carries `platform=win32`
   - every `mono` entry === `monoFor("win32")`
5. Open `/docs/theming` (fresh, parameter-free), settle on `win32`.
   - `note` includes `labelFor("win32")` (the page's live sentence follows)
6. Click `"default"`; settle on `default`.
   - `platform === "default"`, `search === ""` (**Default removes the parameter**)
   - `note` includes `labelFor("default")`, every `mono` === `monoFor("default")`
7. Keyboard: focus the checked radio, `press("ArrowRight")`, settle on `next`.
   - `next = movePlatform("default", "ArrowRight")` (`darwin`); STOP if undefined
   - `search` carries `platform=darwin`, `checked === labelFor(next)`
   - **focus is on that option** (`activeElement === [aria-checked="true"]`)
   - then `press("ArrowLeft")`: settle on `"default"`, `search === ""`
8. Open `/docs/theming` again (parameter-free) and assert `platform === "default"`
   — the run leaves the profile as it found it, and Default was stored.

Every step appends named problems (`"step 2: …"`) instead of throwing, so one run
reports every disagreement. Return `1` when any problem exists, `0` otherwise,
`2` only through `SetupError`; copy the `main`/`finally` shape of
`scripts/smoke-search.ts` (`session.stop()` and `preview.stop()` always run).

**Do not add a step that needs the live iframe.** The renderer's platform is
already proved by `smoke:preview`; this script proves the control.

### 2.6 Change: `apps/docs/scripts/chrome-session.ts`

`SessionKey` gains `"ArrowLeft"` and `"ArrowRight"`, and `KEY_CODES` their
virtual keys (`37`, `39`). `press` already builds `code` from the key, so nothing
else changes. Update the type's doc comment if it now reads as "the keys the
smokes drive".

### 2.7 Change: `apps/docs/package.json`

Add, alphabetically beside the other smokes:

```json
"smoke:platform": "nub scripts/smoke-platform.ts",
```

### 2.8 Change: `apps/docs/README.md`

1. The **Commands** block gains one line, in the order the other smokes appear:

   ```sh
   nub run --filter docs smoke:platform # the toggle: click, URL, storage, arrows
   ```

2. A new section after **Keyboard and focus**, `## Platform toggle smoke`,
   stating: what it drives (steps 1–7 above, in one paragraph), that every
   expected label and mono family comes from `@gpuixui/tokens`, that `--no-build`
   and `--base-url` work like the other smokes, and that exit `2` is never a
   pass. Mention that the radio contract (one tab stop, arrows apply) is the APG
   single-select rule.

### 2.9 Change: `content/docs/contributing.mdx`

Add one row to the **Docs site** table, after `smoke:responsive`:

```md
| `nub run --filter docs smoke:platform` | the platform toggle is one radio group: a click updates the URL, the stored choice survives a full load, every preview repaints, arrows move and apply, and Default removes the parameter | `1` wrong, `2` could not verify |
```

`src/docs-checks.test.ts` fails until this row exists — that is the plan's own
guard, not a nicety.

### 2.10 Change: `content/docs/theming.mdx`

In **Platform styles**, after the paragraph that names the URL and `localStorage`,
add two sentences:

> The switcher is one **radio group**, not four independent toggles: one tab stop,
> and the arrow keys move the choice and apply it. `nub run --filter docs
> smoke:platform` clicks it in a real browser and proves the URL, the stored
> choice and every preview follow.

Keep the existing prose; do not retype any platform value.

## 3. Commands and expected results

Run from the worktree root, in this order:

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | `Test Files 63 passed`, `Tests 432+ passed` (the two new logic tests and the two updated toggle assertions are the delta); exit `0` |
| `nub run --filter docs check-types` | no diagnostics; exit `0` |
| `nub run --filter docs build` | ends `Done`; exit `0` |
| `nub run --filter docs smoke:platform` | prints one `smoke:` line per step, ends `smoke: ok`; exit `0` |
| `nub run --filter docs smoke:browser` | unchanged behaviour: every preview page in both schemes, exit `0` (the toggle markup change must not disturb the hydrated gate) |
| `nub run check` | `tests: every test asserts something…`, lint, fmt, types; exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` | whole workspace green (runtime suites opt-in, unchanged) |

`smoke:platform` may be re-run against an existing server:
`nub run --filter docs build && nub apps/docs/scripts/smoke-platform.ts --no-build`.

## 4. Two-direction proofs (all required)

Apply each defect, run the named command, record the exact failure line in this
plan's results section, then revert. A smoke that passes with the defect present
is a broken smoke.

| # | Forced defect | Where | Must fail with | Measured (2026-10-18) |
| - | ------------- | ----- | -------------- | --------------------- |
| A | delete `replaceSearch(next)` from `setPlatform` | `platform-provider.tsx` | step 2: the URL no longer carries `platform=win32` | 4 problems, exit `1`: `step 2: the URL carries platform=null, expected win32`; steps 6–7 keep the stale parameter |
| B | delete `writeStored(next)` from `setPlatform` | `platform-provider.tsx` | the choice does not survive without the query string | 113 problems, exit `1`: `step 6: clicking Default left data-platform "win32"` — the mount effect re-resolves from storage, so without the click's write Default does not stick. **Not step 3 as planned:** the mount effect persists the URL value on navigation, so a parameter-free load still recovers `win32`; the click's write is proved by Default |
| C | make `subscribeToDocument` return `() => {}` without observing | `src/components/preview/theme-surface.tsx` | a surface keeps the previous mono family | 104 problems, exit `1`: `step 6: the page did not settle on Default (data-platform "default", previews Consolas…)` and `preview surface 1 paints Consolas, expected Menlo`. **Not step 2 as planned:** the first click re-renders the route for another reason, the second repaint needs the observer |
| D | delete the `onKeyDown` handler | `platform-toggle.tsx` | step 7: the arrow keys do nothing | 3 problems, exit `1`: `step 7: ArrowRight left the platform on default` (reported as `did not settle on macOS`, `URL carries platform=null, expected darwin`, `checked "Default", expected "macOS"`) |
| E | change `tabIndex={checked ? 0 : -1}` to `tabIndex={0}` | `platform-toggle.tsx` | `platform-values.test.tsx` "one tab stop" test | `2 failed | 432 passed` — the radio test fails, as does `docs-checks.test.ts` while the new smoke is undocumented |

Proofs A–D need a rebuilt site (`nub run --filter docs smoke:platform` builds by
default); E is the unit suite. Every defect was reverted with `git checkout --`
before the next proof.

**What the proofs changed in the plan.** Two predictions were wrong and the
plan now records the truth rather than the guess: B fails at Default (the mount
effect is a second writer, so the click's storage write is what keeps Default
from being re-resolved back to the stored platform), and C fails on the second
platform change, not the first. Both are stronger tests than planned: they drive
the state machine through a mount effect and a click, not a single attribute
write.

## 5. STOP conditions

- **A step reveals a real defect** in the click path (URL, storage, repaint,
  navigation). Fix it in this plan when the fix is inside `apps/docs`, with the
  failing assertion kept as the regression guard; if the fix belongs to another
  workstream, `STOP`, record the ask in `TODO.md`, and do not weaken the step.
- **The radio group breaks the sidebar layout** (the four labels wrap or clip at
  390 px). `STOP` and report with the measured widths — do not shrink the labels
  to fit.
- **A layout or a preview value is not derivable** from `@gpuixui/tokens`. `STOP`
  — a typed literal mono family or label is how the site starts documenting a
  platform the package does not ship.
- **`smoke:platform` cannot build, serve or find Chrome** → exit `2`; report it
  as unverified. Never adjust an assertion to make a `2` pass.
- **`smoke:browser` changes outcome** after the component rewrite. `STOP` and
  diagnose; the toggle's markup must not affect a preview surface.

## 6. Test plan (summary)

- Pure logic: `platform-toggle-logic.test.ts` — six tests, including the walk
  that pins the table to `platformNames` and the coverage test that fails when a
  platform is added to the list but not the table.
- Rendered contract: `platform-values.test.tsx` — one radio group, one checked,
  one tab stop.
- Browser gate: `smoke:platform` — seven steps, expectations from tokens, and
  proofs A–D above proving it can fail.
- Unit gate: `smoke:platform` is named in `contributing.mdx`, enforced by
  `docs-checks.test.ts`.

## 7. Acceptance

- The toggle is `role="radiogroup"` with `role="radio"` children, exactly one
  `aria-checked="true"` and exactly one tab stop; arrows move, apply and keep
  focus on the checked option.
- `nub run --filter docs smoke:platform` exits `0` on the production build and
  `1` for each of the four forced defects (A–D), with the failing step named.
- `docs/preview-strategy.md` and the component-page template are untouched.
- All three repo gates (`check`, `lint`, `test`) pass, and `smoke:browser`
  remains green.
- The plan index, `TODO.md` and this plan's results section are updated in the
  same branch.

## 8. Results (2026-10-18)

### What shipped

- `apps/docs/src/platform/platform-toggle-logic.ts` — the neighbour table and
  `movePlatform`; `platform-toggle-logic.test.ts` — seven tests.
- `apps/docs/src/platform/platform-toggle.tsx` — a `radiogroup` with roving
  tabindex, `aria-checked`, arrows that select and apply, and focus that follows.
- `apps/docs/src/components/platform-values.test.tsx` — the radio contract
  replaces the `aria-pressed` assertion, plus a one-tab-stop test.
- `apps/docs/scripts/smoke-platform.ts` — eight steps, `smoke:platform` in
  `package.json`, `ArrowLeft`/`ArrowRight` in `scripts/chrome-session.ts`.
- `apps/docs/README.md` — the command and its section;
  `content/docs/contributing.mdx` — the gate row (`docs-checks.test.ts` refuses
  to let the smoke ship undocumented); `content/docs/theming.mdx` — the radio
  and arrow-key contract, and the gate that proves it.

### Commands

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 63 files, **434 tests**, exit `0` (was 62 / 426) |
| `nub run --filter docs check-types` | `Done`, exit `0` |
| `nub run --filter docs smoke:platform` | **step 1–8 checked**, `smoke: ok`, exit `0` |
| `nub run --filter docs smoke:browser` (`--no-build`) | every preview page in both schemes + the three platform URLs, `smoke: ok`, exit `0` |
| `nub run --filter docs smoke:build` | exit `0` |
| `nub run check` | test-quality, lint, format, types, exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` | every workspace package green, exit `0` |

### Two facts found while building the gate

1. **The server HTML is not the settled page.** On a fresh parameter-free load
   the provider publishes `<html data-platform>` and rewrites the URL after
   hydration, and a preview repaints one frame later. The first draft read the
   DOM as soon as a toggle and a surface existed, so a working site reported
   `preview surface 1 paints Menlo, expected Consolas` and a note still saying
   "Default". `open` now waits for exactly **one** toggle group, the expected
   `data-platform`, and every surface's `--preview-font-mono`. The settle
   failure is reported as a settle failure, not as a preview failure.
2. **A client-side route change briefly renders a second toggle group**
   (measured: 2 groups with 2 `tabindex="0"` options for ~300 ms after a
   navigation, then 1). Counting tab stops across the document made step 1 flake
   for that frame. Requiring exactly one group in `settle` both removes the
   flake and fails by name if a duplicate control ever persists.

### Two-direction proofs

The table in §4 records every measured failure. Two predictions were wrong and
are corrected there: removing the click's `writeStored` fails at **Default**, not
at the parameter-free load (the provider's mount effect is a second writer), and
removing the preview subscription fails on the **second** platform change, not
the first. Both failures are real and named; neither assertion was weakened.

### Not touched

- `docs/preview-strategy.md` — this plan adds no preview tier or capture.
- The component-page template and every component record.
- `packages/*`, `examples/*`, `apps/playground`.
