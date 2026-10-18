# 472 — A live scene looks for text its component paints, not its own heading

**Phase:** F (showcase truth) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 455–458 (the live surface and the scene table), 471 (the
command-menu guard)

## 1. Why

The command-menu false green (plan 471) came from the same blind spot in a
second form: the smoke asserted a string that the scene **contained** but the
component never painted. Four more scenes have it. Their `SCENE_TEXT` value is
the scene's own `<Text role="h3">` heading, which renders whether or not the
component below it works:

| Scene | Expectation | Where it lives |
| ----- | ----------- | -------------- |
| `icon` | `"Icon set"` | `<Text role="h3">Icon set</Text>` above the gallery |
| `scroll-area` | `"Activity log"` | `<Text role="h3">Activity log</Text>` above the container |
| `skeleton` | `"Loading profile"` | `<Text role="h3">` — the skeleton paints no text |
| `spinner` | `"Saving changes"` | `<Text role="h3">` above the rows |

The surface smoke would stay green if `Icon`, `ScrollArea`, `Skeleton` and
`Spinner` rendered nothing. Three have real component-region text to assert
instead; `Spinner` and `Skeleton` paint no text at all (the spinner's name is an
`aria-label`, the skeleton has no content), so they need a documented exception
rather than a fake assertion.

`tabs` is weaker for a different reason: `"Notifications"` is both a
`TabsTrigger` label and a `TabsContent` heading, so a broken trigger list still
passes. The active panel's sentence proves the content region painted.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/preview/scenes.ts` | Four `SCENE_TEXT` values become component-region text (§3); add `SCENE_TEXT_IS_SCENE_PROSE` with the one measured exception. |
| `apps/docs/src/components/preview/scene-contract.test.ts` | One guard: no expectation may be a scene's `h3` heading unless the exception table explains it, and the table is exactly `skeleton`. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Add and tick the row; keep the count current. |

No scene view changes: every new string is already rendered.

## 3. The new expectations

| Scene | Old | New | Rendered by |
| ----- | --- | --- | ----------- |
| `icon` | `Icon set` | `Folder` | the icon gallery row (`ICON_GALLERY` label beside `<Icon name="folder">`) |
| `scroll-area` | `Activity log` | `09:45  Saved layout` | a row inside `<ScrollArea>` |
| `spinner` | `Saving changes` | `Writing 3 files…` | the row holding the `Spinner` |
| `tabs` | `Notifications` | `Your name and avatar appear beside every comment you write.` | the active `TabsContent value="profile"` |

`skeleton` keeps `Loading profile` and is declared:

```ts
/**
 * Scenes whose expectation is the scene's own prose because the component
 * paints no text. A reason is mandatory; the guard pins the set.
 */
export const SCENE_TEXT_IS_SCENE_PROSE: Readonly<
  Partial<Record<LiveScene, string>>
> = {
  skeleton:
    "Skeleton paints no text: the canvas plus three muted bars are the evidence.",
};
```

## 4. The guard

In `scene-contract.test.ts`, inside `describe("live scene table")`:

```ts
  it("looks for text the component paints, not the scene's own heading", () => {
    const headings = [...viewSource.matchAll(/<Text role="h3">([^<]+)<\/Text>/g)]
      .map((match) => match[1]);
    const offenders = LIVE_SCENES.filter(
      (scene) =>
        headings.includes(SCENE_TEXT[scene]) &&
        SCENE_TEXT_IS_SCENE_PROSE[scene] === undefined,
    ).map((scene) => `${scene}: ${SCENE_TEXT[scene]}`);
    expect(offenders).toEqual([]);
    expect(Object.keys(SCENE_TEXT_IS_SCENE_PROSE)).toEqual(["skeleton"]);
  });
```

The second assertion makes an exemption a deliberate, reviewed act: adding a
scene that needs one fails this test until it is written down.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test src/components/preview/scene-contract.test.ts` **before §3** | fails naming `icon`, `scroll-area`, `skeleton`, `spinner` |
| same, **after §3** | 10/10 pass |
| `nub run --filter docs smoke:preview --no-build` **after §3** | exit `1` until the preview is rebuilt, then exit `0` with all eleven scenes |
| `nub run --filter docs smoke:preview` | exit `0`; the four new strings are in their trees |
| `nub run --filter docs test` | 0 failures |
| `nub run check` / `nub run lint` | exit `0` |

## 6. STOP conditions

- A new expectation is not in that scene's GPUI tree: STOP; do not revert to the
  heading. Record the real tree text in this plan and pick text the component
  paints, or add a reasoned exception for a component that paints none.
- The tabs panel sentence only appears because a tab is active: verify
  `defaultValue="profile"` still selects it before changing the expectation.
- Making a scene prove a component that paints nothing would need a new
  component API: STOP; that is a component ask, not a docs change.

## 7. Test plan

- **Non-vacuous:** the guard fails on today's table with four names.
- **Two directions:** restore `scroll-area` to `Activity log` → fails naming it;
  restore the new value → green. Remove an exception reason → the pinned-set
  assertion fails.
- **Surface proof:** one `smoke:preview` run after the rebuild shows all eleven
  scenes ready; record the command-menu and one changed scene's text count.

## 8. Acceptance

- No scene except `skeleton` asserts its own heading.
- The guard fails before and passes after; both measured.
- `smoke:preview`, the docs suite, `check` and `lint` pass; the plan index and
  `TODO.md` are current; the commit is pushed on `agent/docs-site`.

## 9. Progress (2026-10-18)

- Four expectations changed; `SCENE_TEXT_IS_SCENE_PROSE` declares `skeleton`
  with its measured reason.
- Guard added; 10/10 in `scene-contract.test.ts`.
- **Non-vacuous proof:** with the four old values restored, the guard failed with
  `expected [ 'icon: Icon set', …(2) ] to deeply equal []` and the received rows
  `icon: Icon set`, `scroll-area: Activity log`, `spinner: Saving changes`
  (skeleton is exempt by the table the fix adds). Restored the new values → 10/10.
- `nub run --filter docs smoke:preview` exit `0` after the rebuild; the changed
  scenes reported `tabs 6`, `icon 13`, `scroll-area 12`, `spinner 3`,
  `command-menu 15` and `skeleton 1` text nodes, and every page iframe loaded.
- `nub run --filter docs smoke:preview --no-build`: exit `0`.
