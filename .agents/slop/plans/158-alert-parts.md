# 158 — Alert becomes a compound part (the first contract migration)

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200-adopt-compound-part-api.md`, `157-components-consume-token-helpers.md` |
| Status | done — 2026-10-17; 11 native tests, both-direction proof measured |
| Source | `docs/component-api.md` §8/§9; `TODO.md` → "Split the landed deviations … into parts" |

This plan is self-contained. It migrates Alert — the smallest landed deviation
in `docs/component-api.md` §9 — to the compound contract, with no compatibility
props left behind.

---

## 1. Why

`Alert` still takes `title`, `icon`, `onDismiss` and `dismissLabel` as props on
one node. That hides three regions (icon, heading, dismiss) behind props and
makes the action slot implicit. The contract says every region is a part. Alert
is the smallest component with this problem, so it goes first; CommandMenu,
Pagination, Combobox and the date/time pickers follow under the same TODO task.

This is a **breaking API change** to a `private` package at `0.0.0`. No app in
this repo consumes Alert yet (the playground mount is an interlock), so the
break costs nothing today.

## 2. The target API

```tsx
<Alert tone="warning">
  <AlertIcon>⚠</AlertIcon>
  <AlertContent>
    <AlertTitle>3 tokens are missing</AlertTitle>
    <AlertDescription>The platform themes fall back to the default palette.</AlertDescription>
  </AlertContent>
  <AlertDismiss onDismiss={hide} />
</Alert>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `Alert` | `role="alert"`, the tone surface, the row layout and the tone context | `tone?` |
| `AlertIcon` | the leading glyph, painted in the tone's foreground | host props |
| `AlertContent` | the growing column between the glyph and the dismiss control | host props |
| `AlertTitle` | the heading, `bodyStrong` in the tone's foreground | host props |
| `AlertDescription` | body prose in the page foreground; may hold a real action | host props |
| `AlertDismiss` | the focusable dismiss button (local `IconButton`) | `onDismiss` (required), `label?` |

A part used outside `Alert` throws the same `"Alert parts must be used inside
Alert"` error every other compound in the package uses.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/alert.tsx` | rewrite as six parts over a tone context |
| `packages/components/src/behaviour/alert.test.tsx` | rewrite for the parts (11 tests) |
| `packages/components/examples/alert.example.tsx` | compose the parts |
| `packages/components/docs/alert.mdx` | anatomy, usage, API and verification |
| `COMPONENTS.md` | Alerts row: 11 tests, the parts contract |
| `docs/component-api.md` | §8 Alert row lists all six parts; remove Alert from §9 |
| `TODO.md` | split the deviation task; tick Alert |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # 281 tests, Alert 11
nub run --filter @gpuixui/components test             # logic suites + inventory
nub run check                                         # exit 0
nub run test                                          # exit 0
```

## 5. STOP conditions

Stop and report if:

- a part cannot read the tone without prop drilling (the context is the fix; do
  not add a `tone` prop to every part);
- the local `IconButton` cannot be focused and activated by keyboard in the
  behaviour suite (that would affect every consumer of it, not just Alert);
- a consumer in this repo still imports the old `title`/`onDismiss` props
  (`grep -rn "<Alert" packages apps examples`); update the importer instead of
  keeping a compatibility prop.

## 6. Test plan

The rewritten `src/behaviour/alert.test.tsx` (real GPUix renderer):

1. the root is one `role="alert"` node and the parts render in order;
2. every tone paints the root surface from `tone(darkTheme, value)`;
3. `AlertTitle` uses the tone foreground; `AlertDescription` keeps the page
   foreground (the unreadable-body regression);
4. `AlertIcon` paints the tone foreground and is optional;
5. no dismiss control exists unless `AlertDismiss` is composed;
6. a real click on `AlertDismiss` fires `onDismiss` once;
7. `AlertDismiss` is focusable and Enter fires it;
8. `AlertDismiss`'s accessible name defaults to `"Dismiss"` and takes `label`;
9. an action inside `AlertDescription` still receives its click;
10. a consumer `style` on the root wins.

The orphan-part `throw` is a code guarantee, not a behaviour assertion: the
renderer catches render errors, so `expect(...).toThrow` cannot see it.

**Both directions.** Temporarily replace the context's tone with the literal
`"info"`: tests 2 and 3 fail for the other tones. Restore. Also, before the
migration the suite cannot compile against the parts at all (the old props are
gone); the positive run is the second direction.

## 7. Acceptance criteria

- Six exported parts with JSDoc, no compatibility props on `Alert`.
- The tone context is the only place the foreground is resolved.
- 11 native behaviour tests, both themes, and the docs page shows the parts.
- The inventory row, `COMPONENTS.md` and `docs/component-api.md` agree.
- All gates green; `TODO.md` records Alert done and the remaining four
  deviations open.

## 8. Result

Landed 2026-10-17:

- `alert.tsx` — six parts over a tone context, no compatibility props.
- `alert.test.tsx` — 11 tests. Both directions: making `AlertTitle` paint
  `theme.colors.foreground` instead of the tone foreground fails 10 tests;
  restored, green.
- Example and the two composed examples (dialog, confirm dialog) updated; docs
  page rewritten for the parts; `COMPONENTS.md` says 11; the contract's §8 Alert
  row lists all six parts and Alert left §9.
- Gates: `nub run check` green, 222 unit tests, 281 behaviour tests.
