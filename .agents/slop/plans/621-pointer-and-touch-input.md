# 621 — Pointer and touch input have an answer

**Phase:** F · **Owner:** docs-site · **Status:** in progress
**Depends on:** 410, 413, 419, 431, 565, 568, 576, 598, 601, 612, 620

## 1. Why this plan exists

`MISSION.md` requires every capability GPUix does not provide to be documented
with evidence, and plan 565 made `/docs/accessibility` the page that states what
the runtime supports and what it substitutes. That page covers `aria-*`,
keyboard and focus, but not the pointer surface: a reader cannot learn whether
the library responds to touch, a stylus or a pen.

Measured 2026-10-20 at `1310ba80` against the production index:

| Query | First result | What the reader wanted |
| ----- | ------------ | ---------------------- |
| `touch` | `/docs/components/preview-card#accessibility-and-limitations` | whether touch input works |
| `touchscreen` | *(nothing)* | the same question |
| `stylus` | `/docs/styling` | the same question |
| `pointer input` | `/docs/components/text-input` | the same question |
| `mouse events` | `/docs/components/number-field#keyboard-and-focus` | the event surface |
| `skip link` | `/docs/components/breadcrumb` | the site's own skip link |
| `macos style` / `windows style` / `linux style` | `/docs/styling` | the platform styles Theming owns |

The installed declarations are unambiguous. `@gpuix/native@0.10.0`'s
`HostProps` declares:

- mouse/click: `onClick`, `onAuxClick`, `onMouseDown`, `onMouseUp`,
  `onMouseEnter`, `onMouseLeave`, `onMouseMove`, `onMouseDownOutside`;
- keyboard: `onKeyDown`, `onKeyUp`, `onFocus`, `onBlur`;
- scrolling: `onScroll`;
- **no** `onTouch*`, `onPointer*` or stylus handler.

So touch and pen input are a real, evidenced limitation, not a missing keyword.
The platform-style question is the same class: Theming has a
`## Platform styles` section, but a reader typing `windows style` lands on
Styling, which is about the `style` prop.

## 2. The decision

1. **Accessibility owns the input surface.** A new
   `## Pointer and touch input` section, immediately after `## Keyboard`, names
   every mouse and key handler the runtime declares, names `onScroll`, and
   states the absence of touch/pointer/stylus events with the consequence: a
   component sees OS-synthesised mouse events only, and multi-touch, pressure
   and tilt must be handled by the host application.
2. **The claim is a pure function over the declarations.**
   `src/lib/input-capabilities.ts` groups the `HostProps` names into mouse,
   keyboard, touch and scroll, and returns named violations when the page and
   the installed package disagree. The page test feeds the real declarations and
   the fixture tests feed a package that declares `onTouchStart`, so the rule
   fails in both directions without editing `node_modules`.
3. **Theming's platform vocabulary is explicit.** The alias table gains the
   three platform style/theme phrases; no new prose is needed because
   `## Platform styles` already renders the table from the two `Theme` values.
4. **Accessibility gains the site's own `skip link` term**, because its
   `## What is verified` section already states that the keyboard gate drives
   it.

## 3. Files

### Create

| File | Responsibility |
| ---- | -------------- |
| `.agents/slop/plans/621-pointer-and-touch-input.md` | this plan |
| `apps/docs/src/lib/input-capabilities.ts` | pure grouping and violation rules over `HostProps` |
| `apps/docs/src/lib/input-capabilities.test.ts` | the pure rule and its two-direction fixtures |
| `apps/docs/src/input-capabilities-page.test.ts` | the page against the installed declarations |

### Change

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/accessibility.mdx` | `## Pointer and touch input` after `## Keyboard` |
| `apps/docs/src/accessibility-page.test.ts` | the new heading joins the ordered section list |
| `apps/docs/src/lib/page-aliases.ts` | Accessibility and Theming blocks gain the terms |
| `apps/docs/src/lib/page-aliases.test.ts` | one `owned` row per term, one `platform style` regression |
| `apps/docs/scripts/smoke-build.ts` | three production search checks |
| `apps/docs/README.md` | one paragraph beside the operational answers |
| `.agents/slop/plans/README.md` | this plan's row |
| `TODO.md` | the workstream task and progress fraction |

No package source changes; nothing outside `apps/docs/`, `TODO.md` and the plan
index is edited.

## 4. The page section

`apps/docs/content/docs/accessibility.mdx`, immediately after `## Keyboard` and
before `## Recorded limitations`:

```mdx
## Pointer and touch input

The runtime declares mouse and keyboard events, not the DOM's Pointer Events. A
part can receive `onClick`, `onAuxClick`, `onMouseDown`, `onMouseUp`,
`onMouseEnter`, `onMouseLeave`, `onMouseMove` and `onMouseDownOutside`, plus
`onKeyDown` and `onKeyUp`; scrolling arrives as `onScroll` on the container.

It declares **no touch, pointer or stylus events**: there is no `onTouch*`,
`onPointer*` or stylus handler. A touchscreen or pen therefore works only where
the operating system synthesises mouse events, and a component cannot read
multi-touch gestures, pressure or tilt. Build those interactions in the host
application and pass the resulting state in, the same way a file drop or a
window shortcut is passed in.

`autoFocus` sets native focus without dispatching `onFocus`; a click is the
reliable way to focus a field. [Component API](/docs/component-api#shared-host-props)
lists the shared props and [Styling](/docs/styling) records the cursor values
the runtime accepts.
```

## 5. The rule

`apps/docs/src/lib/input-capabilities.ts`:

```ts
import { hostPropNames } from "./host-props";

/** The handler groups a page must describe. */
export interface InputHandlers {
  readonly mouse: ReadonlyArray<string>;
  readonly keyboard: ReadonlyArray<string>;
  readonly touch: ReadonlyArray<string>;
  readonly scroll: ReadonlyArray<string>;
}

export const ABSENT_INPUT_CLAIM = "no touch, pointer or stylus events";

const isMouse = (name: string): boolean =>
  name === "onClick" || name === "onAuxClick" || name.startsWith("onMouse");
const isKeyboard = (name: string): boolean => name.startsWith("onKey");
const isTouch = (name: string): boolean =>
  name.startsWith("onTouch") ||
  name.startsWith("onPointer") ||
  name.toLowerCase().includes("stylus");

export const inputHandlers = (declarations: string): InputHandlers => {
  const names = hostPropNames(declarations);
  return {
    mouse: names.filter(isMouse),
    keyboard: names.filter(isKeyboard),
    touch: names.filter(isTouch),
    scroll: names.filter((name) => name === "onScroll"),
  };
};

/** Named failures, empty when the page matches the installed declarations. */
export const inputCapabilityViolations = (input: {
  readonly declarations: string;
  readonly page: string;
}): ReadonlyArray<string> => {
  const handlers = inputHandlers(input.declarations);
  const missing = [
    ...handlers.mouse,
    ...handlers.keyboard,
    ...handlers.scroll,
  ].filter((name) => !input.page.includes(name));

  const claimsAbsence = input.page.includes(ABSENT_INPUT_CLAIM);
  const absence = handlers.touch.length === 0;

  return [
    ...missing.map((name) => `${name} is declared but not named on the page`),
    ...(absence && !claimsAbsence
      ? ["the page does not state that touch, pointer and stylus events are absent"]
      : []),
    ...(!absence && claimsAbsence
      ? [
          `the page claims no touch input while the package declares ${handlers.touch.join(", ")}`,
        ]
      : []),
  ];
};
```

## 6. The guards

### 6.1 `src/lib/input-capabilities.test.ts`

1. The real declarations produce four non-empty groups, with no touch handler.
2. `inputCapabilityViolations` returns `[]` for the real page.
3. A fixture package whose `HostProps` adds `onTouchStart` fails with the
   package's handler named.
4. A page that drops `onMouseMove` fails with `onMouseMove` named.
5. A page that removes the absence sentence (real declarations) fails.

### 6.2 `src/input-capabilities-page.test.ts`

Read `content/docs/accessibility.mdx` and the installed declarations through
`installedNativeDeclarations()`, and assert
`inputCapabilityViolations({ declarations, page })` is `[]`. This is the guard
that runs on every change to the page or a dependency upgrade.

### 6.3 `accessibility-page.test.ts`

The ordered heading list gains `"Pointer and touch input"` between `"Keyboard"`
and `"Recorded limitations"`, so the section cannot move or disappear.

### 6.4 `page-aliases.test.ts`

Owned rows:

```ts
["touch", "/docs/accessibility"],
["touchscreen", "/docs/accessibility"],
["touch screen", "/docs/accessibility"],
["stylus", "/docs/accessibility"],
["pen input", "/docs/accessibility"],
["pointer events", "/docs/accessibility"],
["pointer input", "/docs/accessibility"],
["mouse events", "/docs/accessibility"],
["mouse input", "/docs/accessibility"],
["skip link", "/docs/accessibility"],
["macos style", "/docs/theming"],
["macos theme", "/docs/theming"],
["windows style", "/docs/theming"],
["windows theme", "/docs/theming"],
["linux style", "/docs/theming"],
["linux theme", "/docs/theming"],
```

Regression: `["platform style", "/docs/theming"]` already reaches the
`## Platform styles` heading; pin it so the longer phrases do not shadow it.

### 6.5 `smoke:build`

```ts
{
  query: "touch",
  expected: "/docs/accessibility",
  first: true,
  what: "the touch question the input section now answers",
},
{
  query: "skip link",
  expected: "/docs/accessibility",
  first: true,
  what: "the site's own skip link, which Accessibility verifies",
},
{
  query: "windows style",
  expected: "/docs/theming",
  first: true,
  what: "a platform style phrase Theming owns",
},
```

## 7. Commands and expected results

From `apps/docs`:

```sh
nub exec vitest run src/lib/input-capabilities.test.ts src/input-capabilities-page.test.ts
# pre-fix: the page read and the no-touch tests fail; post-fix: all pass
nub exec vitest run src/accessibility-page.test.ts src/lib/page-aliases.test.ts
# pre-fix: the heading list and 16 owned rows fail; post-fix: all pass
```

From the workspace root:

```sh
nub run --filter docs test          # exit 0 — 129 files / 1 350 tests
nub run --filter docs check-types   # exit 0
nub run --filter docs smoke:build   # exit 0 — 107 pages, 235 links, 1 382 anchors, three new queries
nub run check                       # exit 0
nub run lint                        # exit 0
```

Because this changes `/docs/accessibility`, the scoped axe sweep was run over
that page:
`nub scripts/smoke-a11y.ts --no-build --only /docs/accessibility` reported
`1 pages × 2 schemes, 0 violations` and exit `0`.

## 8. Two-direction proofs

The forced defects were run on 2026-10-20; the first is a permanent unit case
that asserts the exact violation for a package that declares touch.

1. **A package with touch fails the claim.** The fixture in
   `input-capabilities.test.ts` declares `onTouchStart` and asserts the single
   violation `the page claims no touch input while the package declares
   onTouchStart` — the branch a real dependency upgrade would take.
2. **Deleting `onMouseMove` from the page fails by name.** The page suite failed
   with `+ "onMouseMove is declared but not named on the page"`; the page was
   restored.
3. **Deleting the absence sentence fails.** Replacing
   `It declares **no touch, pointer or stylus events**` with
   `It declares no touch handlers` failed with
   `+ "the page does not state that touch, pointer and stylus events are absent"`;
   restored.
4. **The aliases are load-bearing.** Removing `touch` and `windows style` from
   the table failed both owned rows (`× touch → /docs/accessibility`,
   `× windows style → /docs/theming`, 366 passed / 2 failed); restored.
5. **Renaming the section fails the ordered outline.** Changing
   `## Pointer and touch input` to `## Input` failed
   `carries every section in the documented order` with
   `- "Pointer and touch input"`; restored.
6. **The production index serves the new answers.** `smoke:build` queried
   `touch`, `skip link` and `windows style` against the built site and passed
   (part of the 107-page run in §7).

## 9. STOP conditions

- Stop if the installed `HostProps` already declares a touch, pointer or stylus
  handler: the premise changed. Document the handler and rewrite §4 instead of
  claiming absence.
- Stop if `HostProps` no longer has an `onScroll` or a mouse handler the section
  names; the rule will name it — follow the declarations, do not trim the guard.
- Stop if a proposed alias shadows a page title, a component name or another
  page's alias; the alias guard names it. Drop the term.
- Stop if `smoke:build` exits `2` (unverified is never a pass).
- Do not claim the library supports touch through OS synthesis without saying
  that is what happens; do not add pointer-event shims.

## 10. Acceptance

- `/docs/accessibility` answers touch, stylus, pointer, mouse and skip-link
  questions and states the absent event families with evidence.
- A dependency that adds a touch handler fails the suite by handler name, and a
  page that stops naming a real handler fails too.
- `touch`, `touchscreen`, `stylus`, `pointer events`, `mouse events`,
  `skip link`, `macos style`, `windows style` and `linux style` reach their
  owner first.
- `nub run --filter docs test`, `check-types`, `smoke:build`, `nub run check`
  and `nub run lint` pass; the counts and six proofs are recorded in §8.
