# Plan 397 — `ScrollArea`'s documented default axis is not reachable

**Owner:** primitives workstream (`packages/primitives`).
**Phase:** F (API truth), type-level change only; no runtime behaviour change.
**Depends on:** 072 (`ScrollArea` keyboard), 337 (position), 396 (blank labels).

## 1. The defect, measured

`docs/scroll-area.mdx` documents `axis` as **optional**, defaulting to
`"vertical"`, and `renderScrollArea` implements that default:

```ts
// src/components/ScrollArea.tsx
export const renderScrollArea = (
  { axis = "vertical", ... }: ScrollAreaProps, ...)
```

But `ScrollAreaProps extends ScrollSpec`, and `ScrollSpec.axis` is required:

```ts
// src/core/style.ts
export interface ScrollSpec {
  readonly axis: "vertical" | "horizontal" | "both";
}
```

So the documented default cannot be used from TypeScript:

```
$ nub run --filter @gpuixui/primitives check-types
packages/primitives check-types: runtime/name.runtime.test.tsx:433:10:
  error TS2741: Property 'axis' is missing in type '{ label: string; ... }'
  but required in type 'ScrollAreaProps'.
```

A consumer writing the shape the API table promises — `<ScrollArea label="Activity">` — has to pass `axis` anyway, or cast. The renderer's own default is dead code for typed callers.

## 2. What ships

- `ScrollSpec.axis` becomes optional (`axis?: ...`).
- `scrollStyle` resolves the default itself (`const axis = spec.axis ?? "vertical"`), so every caller of the exported resolver gets the same rule the renderer already had.
- One core test proves the default resolves to the vertical overflow pair, and the new `ScrollArea` case in `runtime/name.runtime.test.tsx` omits `axis`, so the type change is exercised by the package's own type check.

No behaviour change: `"vertical"` is the value the renderer already used.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/397-scroll-area-default-axis.md` | this plan |
| `.agents/slop/plans/README.md` | index row |
| `packages/primitives/src/core/style.ts` | optional `axis` + resolver default |
| `packages/primitives/src/core/style.test.ts` | the default resolves to the vertical pair |
| `packages/primitives/runtime/name.runtime.test.tsx` | the blank-label case omits `axis` |
| `TODO.md` | one ticked row under the primitives section |

## 4. Steps

1. Change `ScrollSpec.axis` to optional and resolve it in `scrollStyle`:

   ```ts
   export interface ScrollSpec {
     /** Defaults to `"vertical"`. */
     readonly axis?: "vertical" | "horizontal" | "both";
   }

   export const scrollStyle = (spec: ScrollSpec): StyleDesc => {
     const axis = spec.axis ?? "vertical";
     return {
       overflowY: axis === "horizontal" ? "hidden" : "scroll",
       overflowX: axis === "vertical" ? "hidden" : "scroll",
     };
   };
   ```

   Keep the existing docstring and add the default sentence.
2. In `src/core/style.test.ts`, add a case beside the existing three:
   `expect(scrollStyle({})).toStrictEqual(scrollStyle({ axis: "vertical" }))`.
3. In the blank-label runtime case, drop `axis="vertical"`; run `check-types`.
4. Run the commands in §5; tick `TODO.md`; index this plan.

## 5. Test plan and commands

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives check-types
nub run --filter @gpuixui/primitives test:runtime runtime/name.runtime.test.tsx
nub run check
```

Expected: offline green; `check-types` green (it fails today with TS2741);
the scoped live file green; `check` green.

**Both directions:** restore `readonly axis: ...` in `ScrollSpec` and the new
core case still passes (it is a value test), but `check-types` fails on the
axis-less `ScrollArea` in the runtime suite. With the default removed from
`scrollStyle`, the new core case fails (`overflowY` undefined). Record both.

## 6. STOP conditions

- `ScrollSpec.axis` is required by a consumer other than `ScrollArea`: stop and
  report; the optional change would ripple.
- The default is not `"vertical"` in the docs or `renderScrollArea`: stop and
  report; this plan has the wrong value.

## 7. Acceptance

- `<ScrollArea label="Activity">` type-checks.
- `scrollStyle({})` paints the vertical pair, and the core case proves it.
- Docs, type and renderer agree on one default; no other file changes.
