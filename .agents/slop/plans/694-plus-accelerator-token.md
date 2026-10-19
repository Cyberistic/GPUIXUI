# 694 — A plus chord names its key

**Owner:** components workstream · **Phase:** F (interaction consistency) ·
**Depends on:** 110, 200, 310, 316, 324, 693

**Numbering:** `693` is this workstream's hotkey-clear plan and `690`–`692` are
claimed across the worktrees, so `694` is the first free number. Recorded in
`PLAN.md` D30.

## 1. What is measured today

The shared accelerator grammar (`src/shortcut/accelerator.ts`) splits a chord on
`+` and **drops every empty segment**:

```ts
Arr.filter(Str.split("+")(accelerator), (segment) => Str.trim(segment) !== "")
```

That is right for a stray separator (`"mod+"`), but the plus key is itself a `+`
token, so the natural spelling of a plus chord cannot be expressed:

| Input | `parseAccelerator` | `formatAccelerator(…, "darwin")` |
| ----- | ------------------ | -------------------------------- |
| `"mod++"` | `["mod"]` | `["⌘"]` — the plus key vanished |
| `"plus"` | `["plus"]` | `["Plus"]` — title-cased as an unknown word |
| `"++"` | `[]` | `[]` — no keycap at all |

Zoom-in is `mod++` in most shortcut tables, and the recorder captures a pressed
`+` as the literal token `"+"`, so `acceleratorOf` joins it into `"mod++"`.
Measured by reading the pure functions (they have no renderer dependency):

- `parseAccelerator("mod++")` → `["mod"]`;
- `formatAccelerator("mod++", "darwin")` → `["⌘"]`;
- `acceleratorOf(key("+", { cmd: true }), "darwin")` → `"mod++"`, which then
  renders one keycap.

So a user binds Cmd+Plus and the cheat sheet says **⌘** only; the key that
distinguishes zoom-in from Cmd is invisible. The same defect reaches
`KeyboardShortcut accelerator="mod++"` and the hotkey recorder's display, which
both consume this module. The grammar documents "unknown multi-character tokens
display verbatim", so a literal plus has no spelling today.

## 2. The decision

Name the key:

- add a `plus` token whose display is `+` on every platform;
- capture a literal `+` as `plus` in `hotkey/logic.ts`;
- accept a trailing `++` as the literal plus key in `parseAccelerator`, so the
  common spelling `"mod++"` also works. Only a **trailing** doubled separator is
  the key: `"mod++k"` keeps its current meaning (`["mod", "k"]`; the double
  separator is still treated as stray), and the existing pinned test stays.

This is additive: no existing token changes, `"mod+"` still drops its stray
separator, and `plus` is the canonical spelling the recorder emits.

## 3. Exact changes

### 3.1 `packages/components/src/shortcut/accelerator.ts`

Add to `DISPLAY`:

```ts
plus: () => "+",
```

Change `parseAccelerator` so it keeps only real tokens, then appends the plus key
when the chord ends with `++`:

```ts
/** The tokens of a chord, lower-cased, with stray empty segments dropped. A
 *  trailing `++` is the literal plus key (the separator doubled). */
export const parseAccelerator = (accelerator: string): ReadonlyArray<string> =>
  pipe(
    Arr.filter(
      Str.split("+")(accelerator),
      (segment) => Str.trim(segment) !== "",
    ),
    Arr.map((segment) => Str.toLowerCase(Str.trim(segment))),
    (tokens) => (Str.endsWith("++")(accelerator) ? [...tokens, "plus"] : tokens),
  );
```

`Str.endsWith` is the namespace helper already imported by this module.

### 3.2 `packages/components/src/hotkey/logic.ts`

In `keyToken`, before the `return lower`:

```ts
if (lower === "+") return "plus";
```

The recorder then emits `"mod+plus"`; the display grammar renders `⌘ +`.

### 3.3 Tests (write first, prove they fail at `HEAD`)

`packages/components/src/shortcut/accelerator.test.ts`:

```ts
it("names the literal plus key", () => {
  // A plus key is a token, not a stray separator (plan 694).
  expect(parseAccelerator("mod++")).toEqual(["mod", "plus"]);
  expect(parseAccelerator("++")).toEqual(["plus"]);
  expect(formatAccelerator("mod++", "darwin")).toEqual(["⌘", "+"]);
  expect(formatAccelerator("plus", "linux")).toEqual(["+"]);
});
```

Keep the existing "drops empty segments" case (`"mod++k"` → `["mod", "k"]`) as
the contrast pin.

`packages/components/src/hotkey/logic.test.ts`:

```ts
it("captures a plus key as the plus token, not a stray separator", () => {
  const captured = acceleratorOf(key("+", { cmd: true }), "darwin");
  expect(captured).toEqual(Option.some("mod+plus"));
  expect(formatAccelerator("mod+plus", "darwin")).toEqual(["⌘", "+"]);
});
```

Import `formatAccelerator` from `../shortcut/accelerator.js` in that test file.

`packages/components/src/behaviour/keyboard-shortcuts.test.tsx`:

```tsx
it("paints a plus chord's key, not only its modifier", () => {
  // Cmd+Plus rendered a single ⌘ cap before plan 694.
  const sheet = renderComponent(
    <KeyboardShortcuts label="Zoom">
      <KeyboardShortcutsGroup label="View">
        <KeyboardShortcut
          label="Zoom in"
          accelerator="mod++"
          platform="darwin"
        />
      </KeyboardShortcutsGroup>
    </KeyboardShortcuts>,
  );

  expect(sheet.renderer.getAllText()).toEqual([
    "View",
    "Zoom in",
    "⌘",
    "+",
  ]);

  sheet.unmount();
});
```

At `HEAD`: the accelerator test fails on `["mod"]`/`["⌘"]`/`["Plus"]`, the
capture test fails on `"mod++"`, and the native case paints only `⌘`.

### 3.4 Docs

- `docs/keyboard-shortcuts.mdx` — grammar table: add `| plus (or a trailing +) |
  + | + |`; a bullet states that `"mod++"` and `"mod+plus"` are the same chord,
  that only a trailing doubled separator is the key, and that `"mod++k"` is not a
  plus chord. Verification: `9 tests` → `10 tests`; `10 pure tests` → `11`.
- `docs/hotkey-recorder.mdx` — note that a captured `+` is reported as `plus`
  and displays as `+`; `(8 pure tests)` → `(9 pure tests)`.
- `COMPONENTS.md` — Hotkey row: `+ 8 capture tests` → `+ 9` and a clause about
  the plus token; Keyboard shortcuts row: `9 native behaviour tests + 10
  accelerator tests` → `10 native behaviour tests + 11 accelerator tests`.
- `TODO.md` — one ticked hardening entry.
- Plan index + `PLAN.md` D30.

## 4. Test plan

- **Can the tests fail?** Yes, at `HEAD`: see §1. The contrast assertions
  (`"mod++k"` still `["mod","k"]`, `"mod+"` still `["mod"]`) pass before and
  after, so the parser cannot pass by keeping every empty segment.
- **Both-direction proof:** run the three tests before §3.1/§3.2 and record the
  failures; apply the change; re-run. Then remove the `plus` display entry and
  confirm the native case fails; restore.
- **No regression:** `accelerator.test.ts`, `hotkey/logic.test.ts`, the
  KeyboardShortcut behaviour file and the Hotkey recorder behaviour file (16
  cases, one recorded plan-540 focus-ring failure) all keep their other results.
- `check-types`, `check`, `lint`, `test` pass.

## 5. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run src/shortcut/accelerator.test.ts src/hotkey/logic.test.ts
# before: 2 new cases fail; after: 11 + 9 pass

nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/keyboard-shortcuts.test.tsx
# before: the new case fails; after: 10 pass

nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/hotkey-recorder.test.tsx
# 15 pass + 1 recorded plan-540 failure, before and after

nub run check-types
```

From the worktree root: `nub run check`, `nub run lint`, `nub run test` — exit 0.

## 6. STOP conditions

- `Str.endsWith("++")` is not available in the installed `effect/String`: stop
  and report; do not fall back to a raw string method in domain code.
- `formatAccelerator("++")` produces a duplicate keycap because the parser keeps
  an empty segment: stop and report the token array rather than special-casing
  the display.
- The runtime reports the plus key as something other than `"+"` in
  `EventPayload.key` (measured while writing the capture test): stop and record
  the actual key name; do not guess another token.
- The native case cannot render a plus text node (the renderer drops it): stop
  and report the text dump.

## 7. Acceptance

- `"mod++"` and `"mod+plus"` render two keycaps, `⌘` and `+`, on every platform.
- A captured `+` reports `plus` and displays `+`.
- `"mod++k"` and `"mod+"` keep their current token arrays.
- Docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 agree with
  the code and the new counts (Keyboard shortcuts 10 native / 11 pure
  accelerator; Hotkey recorder 16 native / 9 capture).
