# 471 — The command-menu live scene renders its parts, and the guard notices when it does not

**Phase:** F (showcase truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455 (the wasm surface), 456/457 (the scene table and the
command-menu scene), components 114 (the palette's part split)

## 1. Why

`nub run --filter docs smoke:preview` fails at the command-menu scene:

```
FAIL live scene command-menu: expected "Go to Components" in the GPUI tree
(["Workspace", "The palette opens with the scene, so the grouped commands and
their shortcuts are visible without a pointer."])
```

The GPUI tree holds only the scene's own heading and caption. The palette is
missing entirely, deterministically, on two runs.

Root cause: `CommandMenu` renders `<DialogContent>{children}</DialogContent>`,
and since the part split (components plan 114) a caller must supply
`CommandMenuInput`, `CommandMenuList` and `CommandMenuEmpty`. The scene passes
`actions` and **no children**, so it mounts an empty dialog: `actions` is input
data, never a default rendering. The component's own example passes the three
parts.

Why no test caught it: `scene-contract.test.ts` only asserts that the expected
string occurs somewhere in `scene-views.tsx`. `"Go to Components"` occurs in the
`commandActions` array, so the expectation was satisfied by data the palette
never painted. The same blind spot would hide any scene whose expectation lives
in its data rather than in a rendered element.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/preview/scene-views.tsx` | Import `CommandMenuEmpty`, `CommandMenuInput`, `CommandMenuList`; pass them as `CommandMenu`'s children in `CommandMenuScene`. |
| `apps/docs/src/components/preview/scene-contract.test.ts` | Add one guard: the command-menu scene composes the three parts. Name the bug in its comment. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Add and tick the row under the docs-site workstream; keep the count current. |

No component, record or page change: the component is correct, the scene is not.

## 3. The scene fix

```tsx
<CommandMenu open={open} onOpenChange={setOpen} actions={commandActions}>
  <CommandMenuInput />
  <CommandMenuList />
  <CommandMenuEmpty />
</CommandMenu>
```

`CommandMenuInput` autofocuses; `CommandMenuList` renders the grouped rows and
the key hint; `CommandMenuEmpty` renders only when the query matches nothing, so
the opening state shows the rows.

## 4. The guard

In `scene-contract.test.ts`, inside `describe("live scene table")`:

```ts
  it("composes the command palette from its parts, not only its actions", () => {
    const scene = viewSource.slice(
      viewSource.indexOf("const CommandMenuScene"),
      viewSource.indexOf("const ConfirmDialogScene"),
    );
    const missing = [
      "<CommandMenuInput",
      "<CommandMenuList",
      "<CommandMenuEmpty",
    ].filter((part) => !scene.includes(part));
    expect(missing).toEqual([]);
  });
```

The slice keeps the check on the scene that owns the palette: `CommandMenu` is
only used there, and the parts list is the component's contract (plan 114). A
palette with data but no parts fails by name.

## 5. Commands and expected results

Run from `workspaces/docs-site`, with no dev or preview server of this app
alive (`.agents/slop/docs-site-concurrency.md`, 05:30 note).

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs smoke:preview --no-build` **before §3** | exit `1`, the failure quoted in §1 |
| `nub run --filter docs test src/components/preview/scene-contract.test.ts` **with §4 and without §3** | exit `1`, `missing` names the three parts |
| `nub run --filter docs smoke:preview` **after §3** | exit `0`; eleven scenes and eleven pages |
| `nub run --filter docs test` | 0 failures |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |

## 6. STOP conditions

- `smoke:preview` still fails the command-menu scene with the parts composed:
  STOP and record the new tree text; do not change `SCENE_TEXT` to a string the
  scene itself renders (that would re-vacuous the check).
- The palette needs a prop the component does not export: STOP; that is a
  component ask for `TODO.md`, not a docs workaround.
- A dev/preview server for this app is alive and the build hangs: STOP that
  server first; do not record a timeout as a scene failure.

## 7. Test plan

- **Non-vacuous:** the new guard fails on the current scene with all three part
  names missing, then passes after §3.
- **Two directions:** delete `<CommandMenuList />` again → the guard fails
  naming it; restore → green. Re-run `smoke:preview` once on the fixed scene and
  record the tree size.
- `scene-contract.test.ts`'s existing five tests must keep passing.

## 8. Acceptance

- `smoke:preview` exits `0`; the command-menu scene reports a real canvas and
  text count.
- The guard fails without the parts and passes with them; both measured.
- `TODO.md` and the plan index are current; the commit is pushed on
  `agent/docs-site`.

## 9. Progress (2026-10-18)

- Failure reproduced twice, before any edit: `smoke:preview` exit `1` with the
  tree text quoted in §1 (two scene texts, no palette).
- `CommandMenuScene` now passes `CommandMenuInput`, `CommandMenuList` and
  `CommandMenuEmpty`; the three parts are imported from
  `@gpuixui/components/command-menu`.
- Guard added and proven in both directions:
  - with the parts removed, `scene-contract.test.ts` failed with
    `expected [ '<CommandMenuInput', …(2) ] to deeply equal []`;
  - with the parts restored, 9/9 in that file pass.
- `nub run --filter docs smoke:preview` exit `0`: `scene command-menu ready —
  640x160 canvas, **15 text nodes**` (was 2), all eleven scenes and eleven page
  iframes green, the unknown scene reports its reason, and the platform toggle
  reaches the surface at `?platform=win32`.
- `nub run --filter docs test`: 44 files / 272 tests green (the new test
  included).
- `nub run check` (test-quality, lint, format, types) and `nub run lint` exit
  `0`; `nub run fmt:fix` normalised the scene's JSX before the final run.
