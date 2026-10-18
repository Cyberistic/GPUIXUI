# 497 — The remaining value and disclosure controls get live scenes

**Phase:** F (docs showcase completeness) · **Owner:** docs-site
**Depends on:** 412 (preview strategy), 434 (platform-styled previews), 455–458
(the live wasm surface), 461/465 (Tier 2 records and limitation truth), 475
(sized canvas), 486 (gap truth), 492/493 (the earlier scene batches)
**Status:** implemented

## 1. Why this plan exists

Six delivered, interactive controls still show **only their tier-A browser
approximation**: Accordions, Number fields, OTP fields, Ratings, Tag inputs and
Toggles. Their records carry a real native suite (tier V), so the pages are
honest, but a reader cannot operate the real component on the page the way they
can for Buttons, Tabs, Sliders and the other 30 scenes.

Two facts make this the right next batch:

- every one of the six exposes a prop that opens it in its documented state
  (`defaultValue`, `pressed`, `value`), so no new automation gesture is needed;
- the batch covers the value and disclosure groups a browser approximation
  cannot make real: an opened section, a bounded number, a completed code, a
  rating, a token set and a pressed toggle. The remaining interactive pages
  (Collapsible, Pagination, Colour picker, Carousel, Inline edit, Time picker,
  List, Form and the message scroller) stay tier A until a later batch; the
  static parts keep tier A deliberately because their rest layout is the whole
  claim.

While checking the pages, one stale denial was measured:

> `apps/docs/content/docs/components/search-input.mdx` says *“No live scene
> ships for this component yet”*, but `search-input` has shipped a live scene
> since plan 493.

The existing guard looks for “cannot render it live”, not for this phrasing, so
it passed. This plan fixes the page and widens the guard, so a page can no
longer deny a scene its record declares.

## 2. Goal and acceptance

| Scene / page     | Composition                                                        | Text the smoke expects                  |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------- |
| `accordion`      | single, non-collapsible `Accordion`, first section open            | `Email me when a deployment finishes.`  |
| `number-field`   | controlled `NumberField` at `12`, `min={1}`, `max={99}`            | `Quantity is 12`                        |
| `otp-field`      | controlled `OTPField`, six digits `482913`                         | `Six digits entered`                    |
| `rating`         | controlled `Rating` at `4` of `5`                                  | `Rated 4 of 5`                          |
| `tag-input`      | controlled `TagInput` holding `["design", "runtime"]`              | `runtime` (a chip the component paints) |
| `toggle`         | controlled `Toggle`, pressed, labelled `Bold`                      | `Bold is on`                            |

Acceptance:

- each of the six pages renders tier **L** (`<NativePreview>` shows the live
  surface) and keeps its tier-A illustration beneath it;
- `smoke:preview` drives all **36** scenes, prints each new scene as ready and
  exits `0`;
- no page or record that declares a `liveScene` denies having one, including
  `search-input`; the widened guard fails on the old sentence;
- `docs/preview-strategy.md` and `apps/docs/README.md` name the real scene
  total and list the new scenes;
- no component source changes, so no `COMPONENTS.md` status row changes. The
  component workstreams' inventory stays authoritative; this plan only changes
  what the docs show.

## 3. Exact changes

### 3.1 `apps/docs/preview/scenes.ts`

Add six keys to `LIVE_SCENES`, after `"accordion"` is not there yet — append
after `"text-area"` in this order:

```ts
"accordion",
"number-field",
"otp-field",
"rating",
"tag-input",
"toggle",
```

Add their expectations to `SCENE_TEXT`:

```ts
accordion: "Email me when a deployment finishes.",
"number-field": "Quantity is 12",
"otp-field": "Six digits entered",
rating: "Rated 4 of 5",
"tag-input": "runtime",
toggle: "Bold is on",
```

No entry in `SCENE_GESTURE` and no entry in `SCENE_INTERACTION`: these scenes
open in the documented state through a prop, like the Button and Tabs scenes.
`SCENE_TEXT_IS_SCENE_PROSE` stays exactly `["skeleton"]`.

### 3.2 `apps/docs/preview/scene-views.tsx`

Add the imports:

```ts
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@gpuixui/components/accordion";
import {
  TagInput,
  TagInputChip,
  TagInputField,
} from "@gpuixui/components/tag-input";
```

and add `NumberField`, `OTPField`, `Rating`, `Toggle` to the existing
`@gpuixui/primitives` import block.

Add the six views before `LIVE_SCENE_VIEWS`:

```tsx
const AccordionScene = (): ReactElement => (
  <Stack direction="column" gap="lg">
    <Text role="h3">Release settings</Text>
    <Text role="caption" tone="muted">
      The real Accordion, first section open, on the GPUix renderer.
    </Text>
    <Accordion type="single" collapsible={false} defaultValue="deployments">
      <AccordionItem value="deployments">
        <AccordionTrigger>Deployments</AccordionTrigger>
        <AccordionContent>
          <Text role="body">Email me when a deployment finishes.</Text>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="billing">
        <AccordionTrigger>Billing</AccordionTrigger>
        <AccordionContent>
          <Text role="body">Invoices are sent on the first of the month.</Text>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </Stack>
);

const NumberFieldScene = (): ReactElement => {
  const [quantity, setQuantity] = useState(12);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Order</Text>
      <Text role="caption" tone="muted">
        The real NumberField at 12. Arrows step, PageUp pages.
      </Text>
      <NumberField
        label="Quantity"
        value={quantity}
        onChange={setQuantity}
        min={1}
        max={99}
        testId="scene-number"
      />
      {quantity === 12 ? <Text role="body">Quantity is 12</Text> : null}
    </Stack>
  );
};

const OTPFieldScene = (): ReactElement => {
  const [code, setCode] = useState("482913");
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Verify your email</Text>
      <Text role="caption" tone="muted">
        The real OTPField with a complete code. Type to edit a cell.
      </Text>
      <OTPField label="Verification code" value={code} onChange={setCode} />
      {code.length === 6 ? <Text role="body">Six digits entered</Text> : null}
    </Stack>
  );
};

const RatingScene = (): ReactElement => {
  const [rating, setRating] = useState(4);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Rate this release</Text>
      <Text role="caption" tone="muted">
        The real Rating at four of five. Arrows move the filled star.
      </Text>
      <Rating label="Rating" value={rating} onChange={setRating} />
      {rating === 4 ? <Text role="body">Rated 4 of 5</Text> : null}
    </Stack>
  );
};

const TagInputScene = (): ReactElement => {
  const [tags, setTags] = useState<ReadonlyArray<string>>([
    "design",
    "runtime",
  ]);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Labels</Text>
      <Text role="caption" tone="muted">
        The real TagInput with two tokens. Type and press Enter to add one.
      </Text>
      <TagInput label="Labels" value={tags} onValueChange={setTags}>
        {tags.map((tag) => (
          <TagInputChip key={tag} value={tag} />
        ))}
        <TagInputField label="Add a label" />
      </TagInput>
    </Stack>
  );
};

const ToggleScene = (): ReactElement => {
  const [bold, setBold] = useState(true);
  return (
    <Stack direction="column" gap="lg">
      <Text role="h3">Formatting</Text>
      <Text role="caption" tone="muted">
        The real Toggle, pressed. Activate it to turn bold off.
      </Text>
      <Toggle
        label="Bold"
        pressed={bold}
        onPressedChange={setBold}
        testId="scene-toggle"
      >
        Bold
      </Toggle>
      {bold ? <Text role="body">Bold is on</Text> : null}
    </Stack>
  );
};
```

Add them to `LIVE_SCENE_VIEWS`:

```ts
accordion: AccordionScene,
"number-field": NumberFieldScene,
"otp-field": OTPFieldScene,
rating: RatingScene,
"tag-input": TagInputScene,
toggle: ToggleScene,
```

### 3.3 `apps/docs/src/component-meta/entries.ts`

Add `liveScene: "<slug>"` to the six records. The scene key must equal the page
slug — `scene-contract.test.ts` enforces it:

- `number-field` record (around line 620): `liveScene: "number-field",`
- `otp-field` record: `liveScene: "otp-field",`
- `toggle` record: `liveScene: "toggle",`
- `rating` record: `liveScene: "rating",`
- `accordion` record: `liveScene: "accordion",`
- `tag-input` record: `liveScene: "tag-input",`

Do not change any other field: status, runtime suite, limitations and support
are already true.

### 3.4 The pages

- `apps/docs/content/docs/components/accordion.mdx`: delete the bullet
  `- No live scene ships for this component yet; the example and source are real.`
- `apps/docs/content/docs/components/search-input.mdx`: delete the same bullet.
  The page's other five limitations stay.

The other four pages do not carry the sentence.

### 3.5 `apps/docs/src/components/preview/scene-contract.test.ts`

Widen the existing “never tell a reader a page with a scene cannot render it
live” test to cover the shipped phrasing and the record's limitations:

```ts
it("never tells a reader a page with a scene has none", () => {
  const denial = /(?:no live scene ships|cannot render (?:it|this component) live)/i;
  const denied = components.flatMap((entry) => {
    if (entry.liveScene === null) return [];
    const page = denial.test(pageBody(entry.slug)) ? ["page"] : [];
    const record = entry.limitations.some((line) => denial.test(line))
      ? ["limitations"]
      : [];
    return page.length + record.length === 0
      ? []
      : [`${entry.slug}: ${[...page, ...record].join(", ")}`];
  });
  expect(denied).toEqual([]);
});
```

This replaces the old test body; keep its comment and update it to name the
measured `search-input` bug this plan fixes.

### 3.6 The documents that count and list scenes

`docs/preview-strategy.md`:

- the tier-L table row: add Accordions, Number fields, OTP fields, Ratings, Tag
  inputs and Toggles to the enumerated list;
- `**30 scenes ship today**` → `**36 scenes ship today**` (the derived count
  guard in `preview-gaps.test.ts` enforces the digit);
- the “chosen because a still cannot prove the point” sentence gains the six
  new states (an opened section, a bounded number, a completed code, a rating, a
  token set, a pressed toggle).

`apps/docs/README.md`:

- the live-scene list gains the six names;
- the gesture total stays `14 of those` (these scenes need no gesture);
- no other count changes.

### 3.7 Tracking

- Add the plan row to `.agents/slop/plans/README.md` in the docs block.
- Add one item to the “Docs site workstream” list in `TODO.md`, tick it after
  the gates pass, and move the section total from `97/97` to `98/98`.

## 4. Test plan

The two directions use the same commands; restore the file after each proof.

1. **Scene text drift** — change `SCENE_TEXT.rating` to `"Rated 9 of 5"`.
   `nub run --filter docs test` fails in
   `scene-contract.test.ts` → “keeps every expectation in the view that
   renders it”. Restore; the suite passes.
2. **Dead scene** — remove `rating: RatingScene` from `LIVE_SCENE_VIEWS`.
   `nub run --filter docs check-types` fails because
   `Record<LiveScene, () => ReactElement>` is incomplete. Restore.
3. **Stale denial** — put the old bullet back into `search-input.mdx`.
   `nub run --filter docs test` fails the widened guard, naming
   `search-input: page`. Remove it; the suite passes. (Before this plan, the
   same edit passed — that is the bug being guarded.)
4. **Record denial** — add `"No live scene ships for this component yet."` to
   the `rating` record's limitations. The same test fails with
   `rating: limitations`. Remove it.
5. **Count truth** — change `36` to `37` in `docs/preview-strategy.md`.
   `preview-gaps.test.ts` fails on the derived scene total. Restore.
6. **Smoke coverage** — remove one new `liveScene` from a record (for example
   `toggle`). `smoke:preview` no longer visits that page's iframe, and
   `scene-contract.test.ts` does not fail (a page with an illustration is still
   honest). This is expected: the smoke proves scenes that records declare, not
   that every interactive page must have one. Restore the record; the six pages
   render tier L again.

## 5. Commands and expected results

Run from the worktree root:

```sh
nub run --filter docs test
# 54+ files, all tests pass, including the widened scene-contract suite.

nub run --filter docs check-types
# fumadocs-mdx, tsc --noEmit, and the preview project's tsc --noEmit pass.

nub run --filter docs build
# builds the live preview bundle, then the SSR app; exit 0.

nub run --filter docs smoke:preview
# builds, serves the preview and drives all 36 scenes in headless Chrome;
# prints each new scene as ready and exits 0.

nub run --filter docs smoke:build
# the built-site crawl still finds every page, link and search answer.

nub run check && nub run lint && nub run test
# the repo completion gate (AGENTS.md §7).
```

## 6. STOP conditions

- Stop and report if the published wasm renderer cannot paint one of the six
  compositions (a scene reports `failed` with a reason). Do **not** swap the
  component for a mock or claim the scene passed; record the failure and leave
  that page at tier A.
- Stop if a scene's expectation also occurs in its `<Text role="h3">` heading —
  that is the plan-472 defect; choose text the component paints or a caller
  state line instead.
- Stop if `smoke:preview` cannot run (exit `2`): a missing Chrome or missing
  wasm bundle is “unverified”, never a pass. Report the exit code and the
  reason.
- Stop if `nub run test` fails outside `apps/docs`; that is another
  workstream's tree, and this plan does not authorise fixing it here.

## 7. Acceptance checklist

- [x] six scene keys, six expectations, six views, six registry records;
- [x] the six pages render tier L and keep their tier-A illustration;
- [x] `search-input` and `accordion` no longer deny the live surface;
- [x] the widened guard fails on a restored denial in either the page or the
      record;
- [x] the documents state 36 scenes and list all six;
- [x] `nub run --filter docs test`, `check-types`, `build`, `smoke:preview`,
      `smoke:build`, `nub run check`, `nub run lint` and `nub run test` pass;
- [x] `TODO.md` and the plan index are updated.

## 8. Measured results (2026-10-18)

Every proof below was run against the worktree, then the file was restored.

| Proof | Change | Observed failure |
| ----- | ------ | ---------------- |
| A | `SCENE_TEXT.rating` → `"Rated 9 of 5"` | `scene-contract.test.ts` → `keeps every expectation in the view that renders it`: `expected [ 'rating: Rated 9 of 5' ] to deeply equal []` |
| B | restored the old bullet in `search-input.mdx` | `never tells a reader a page with a scene has none`: `expected [ 'search-input: page' ]` |
| C | `36` → `37` in `docs/preview-strategy.md` | `preview-gaps.test.ts` → `states the scene total the code ships`: `expected 37 to be 36` |
| D | added the old sentence to the rating record's limitations | same guard: `expected [ 'rating: limitations' ]` |

After restoring each file:

- `nub run --filter docs test` — 54 files / 354 tests passed.
- `nub run --filter docs check-types` — both projects clean.
- `nub run --filter docs smoke:preview --no-build` — **36** scenes and **90**
  pages, exit `0`; the six new scenes reported:
  `accordion ready — 640x520 canvas`, `number-field`, `otp-field`, `rating`,
  `tag-input`, `toggle`.
- `nub run --filter docs smoke:build --no-build` — 90 pages / 109 links,
  search, 404 and robots checked, exit `0`.
- `nub run --filter docs smoke:browser --no-build` — every preview page in both
  modes, exit `0`.
- `nub run --filter docs smoke:keyboard --no-build` — three pages, exit `0`.
- `nub run check`, `nub run lint`, `nub run test` — exit `0`.
