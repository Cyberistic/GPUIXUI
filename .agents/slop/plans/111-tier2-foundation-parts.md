# 111 — Tier 2 foundation parts

- **Phase:** C-1
- **Workstream:** components · **Owns:** `packages/components/**`
- **Depends on:** plan 110 (package), tokens, primitives
- **Produces:** Card, Badge, Avatar, Alert, EmptyState, List/ListItem

These six are the composition vocabulary the rest of Tier 2 uses: a dialog body
is card-shaped, a menu row is a list item, a toast is an alert. Build them first;
they have no overlay or state-machine risk.

Read plan 110 first. Every rule there applies and is not repeated here.

---

## Order of work

1. `internal/collection.ts` + test (shared with 113 and 114).
2. `internal/key.ts` + test.
3. Card → Badge → Avatar → Alert → EmptyState → List.
4. `src/index.ts` barrel, package `README.md`, `COMPONENTS.md` rows.
5. `nub run check` before the commit.

---

## 1. Shared internals

### `src/internal/key.ts`

Named predicates over GPUix `KeyEvent`, so components never compare raw strings
in five places. GPUix key names are lowercase (`"enter"`, `"escape"`, `"down"`,
`"space"`, `"tab"`, letters).

```ts
import type { KeyEvent } from "@gpuix/react";

export const isActivation = (e: KeyEvent) => e.key === "enter" || e.key === "space";
export const isMoveDown = (e: KeyEvent) => e.key === "down";
export const isMoveUp = (e: KeyEvent) => e.key === "up";
export const isMoveNext = (e: KeyEvent) => e.key === "right";
export const isMovePrev = (e: KeyEvent) => e.key === "left";
export const isEscape = (e: KeyEvent) => e.key === "escape";
export const isTab = (e: KeyEvent) => e.key === "tab";
```

Test (`key.test.ts`): construct minimal `KeyEvent` fixtures and assert each
predicate true for its key and false for a neighbouring one. This test can fail
because a typo in `"space"` would return false.

### `src/internal/collection.ts`

The ordered-item registry behind List (single selection), Tabs and every menu.
It replaces per-component index arithmetic — the place where off-by-one bugs and
disabled-item bugs live.

```ts
export interface CollectionItem { readonly id: number; readonly disabled: boolean }

export interface Collection {
  readonly register: (item: CollectionItem) => () => void;
  readonly items: () => ReadonlyArray<CollectionItem>;
}

export const createCollection: () => Collection;

/** Wrap-around move skipping disabled items. `None` when nothing is enabled. */
export const nextEnabled: (
  items: ReadonlyArray<CollectionItem>,
  current: number | null,
  delta: 1 | -1,
) => Option.Option<number>;

export const firstEnabled: (items: ReadonlyArray<CollectionItem>) => Option.Option<number>;
export const lastEnabled: (items: ReadonlyArray<CollectionItem>) => Option.Option<number>;
export const indexOfId: (items: ReadonlyArray<CollectionItem>, id: number) => Option.Option<number>;
```

Implementation rules: `Arr`/`Option` only, no `for`, no `Array.prototype.find`.
Registration order is declaration order; unregister removes by id.

Test (`collection.test.ts`, `@effect/vitest` + plain `it`):
- `nextEnabled([a,b,c], null, 1)` → `Some(b)` (starts after the first).
- from the last item, `+1` wraps to the first.
- disabled items are skipped, including a run of disabled items at the wrap point.
- all-disabled → `None`.
- register/unregister keeps order and removes the right item.
- `firstEnabled`/`lastEnabled` skip disabled edges.

Every assertion fails if the arithmetic is wrong — state that in the file header.

---

## 2. Card

**Responsibility:** a bounded surface that groups related content. No state, no
interaction.

```tsx
export type CardVariant = "outline" | "elevated" | "plain";
export interface CardProps extends Props { variant?: CardVariant } // default "outline"
export const Card: FC<CardProps>;
export const CardHeader: FC<Props>;
export const CardTitle: FC<Props>;        // renders <text role="heading" aria-level={3}>
export const CardDescription: FC<Props>;
export const CardContent: FC<Props>;
export const CardFooter: FC<Props>;
```

Layout (all values from `useTokens()`):

| Part | Style |
| ---- | ----- |
| Card | `display:"flex"`, `flexDirection:"column"`, `backgroundColor: color.card`, `borderRadius: radius.lg`, `overflow:"hidden"`; outline: `borderWidth:1,borderColor:color.border`; elevated: `boxShadow: elevation.popover`; plain: neither |
| Header | `display:"flex",flexDirection:"column",gap:space(1),padding:space(4),paddingBottom:space(3)` |
| Title | `fontSize:font.size.lg,fontWeight:font.weight.semibold,color:color.foreground` |
| Description | `fontSize:font.size.sm,color:color.mutedForeground,lineHeight:1.5` |
| Content | `display:"flex",flexDirection:"column",gap:space(3),padding:space(4)` |
| Footer | `display:"flex",flexDirection:"row",alignItems:"center",justifyContent:"flex-end",gap:space(2),padding:space(3),borderTopWidth:1,borderTopColor:color.border` |

Every part merges `props.style` last.

**Test (`card.test.tsx`)** — what it must catch: the variant failing to change
the surface treatment, and a part not rendering its content.
- renders header/title/description/content/footer text in order (`getAllText()`).
- `variant="elevated"` sets `boxShadow` and no `borderWidth`; `variant="outline"`
  sets `borderWidth:1` and no `boxShadow`; `variant="plain"` sets neither.
- title node has `role: "heading"` and `aria-level: 3` in the tree JSON.
- a `style={{ backgroundColor: "#fff" }}` override wins over the variant.
- both themes: card background equals `dark`/`light` token values (loop).

**Example (`examples/card.example.tsx`):** a settings card with header, two
description lines, a form row and footer buttons — a realistic composition, not
a rectangle.

**Docs (`docs/card.mdx`):** description; preview id `card`; variants table;
composition snippet; API table for all six parts; "Card is a surface only — it
does not focus, scroll or dismiss"; related: List, Dialog.

---

## 3. Badge

**Responsibility:** a short status label. Non-interactive; never used as a button.

```tsx
export type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "outline";
export type BadgeSize = "sm" | "md";
export interface BadgeProps extends Props { variant?: BadgeVariant; size?: BadgeSize }
```

| size | height | paddingX | fontSize |
| ---- | ------ | -------- | -------- |
| sm | 18 | space(2) | font.size.xs |
| md | 22 | space(2) | font.size.sm |

`borderRadius: radius.full`, `alignItems:"center"`, `flexDirection:"row"`,
`fontWeight:medium`, `whiteSpace:"nowrap"`.

Tone map (fill / text / optional border):

| variant | background | color |
| ------- | ---------- | ----- |
| neutral | `color.muted` | `color.foreground` |
| primary | `color.primary` | `color.primaryForeground` |
| success | `color.successSoft` | `color.success` |
| warning | `color.warningSoft` | `color.warning` |
| danger | `color.destructiveSoft` | `color.destructive` |
| info | `color.infoSoft` | `color.info` |
| outline | transparent | `color.mutedForeground` + `borderWidth:1,borderColor:color.border` |

**Test:** each variant maps to its token pair (table-driven over all seven);
`variant="outline"` has a border and no background; the two sizes produce the
expected heights; `style` override wins; text renders.

**Example:** a status column (Active / Paused / Failed / Draft / New).

**Docs:** variant gallery, size note, "badges are not buttons" note.

---

## 4. Avatar

**Responsibility:** identify a person or entity by image, with a deterministic
initials fallback. State: none.

```tsx
export type AvatarSize = "xs" | "sm" | "md" | "lg";   // 20 / 26 / 32 / 40
export type AvatarStatus = "online" | "away" | "busy" | "offline";
export interface AvatarProps extends Props {
  name: string;              // required: initials source and accessible name
  src?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
}
```

Logic (`src/avatar/logic.ts`, pure, no React):

```ts
/** Up to two uppercase initials, unicode-safe; "?" when there is no letter. */
export const initials: (name: string) => string;
```

Rules: split on whitespace and `-`; first character of the first and last part;
one part → one letter; no letters → `"?"`; use `Arr`/`Option`/`Str`, and
`Array.from` for code points (never `str[0]`, which splits surrogate pairs).

**Test:** `"Ada Lovelace"→"AL"`, `"ada"→"A"`, `"  "→"?"`, `"Jean-Luc Picard"→"JP"`,
`"李 小龙"→"李小"`, `"🎨 Artist"→"🎨A"` (the emoji is a single code point),
lowercase input is uppercased. Each case fails if the rule regresses.

Rendering: `div` with `borderRadius: radius.full`, `overflow:"hidden"`,
width/height from size, `backgroundColor: color.muted`,
`alignItems/justifyContent: center`. With `src`: `<img src objectFit="cover"
alt={name} style={{width:"100%",height:"100%"}}/>`. Without: `<text>` initials in
`color.foreground`, fontSize = size * 0.4. `status`: a `div` dot at
`position:"absolute",right:-1,bottom:-1`, 10px, `borderRadius:full`,
`borderWidth:2,borderColor:color.card`, fill by status
(online=`success`, away=`warning`, busy=`destructive`, offline=`textFaint`).
Avatar root gets `"aria-label": name`, `role: "img"`, `position:"relative"`.

**Test:** image branch requests an `img` element with `src`; fallback branch
renders computed initials; status dot fill matches the token for each status;
accessible name equals `name`; both sizes.

**Example:** a member row with an avatar, name and status; and a stacked group.

**Docs:** sizes, fallback rules (documented exactly as the tests), status
colours, "no image loading/error state in v1" limitation + the fallback story.

---

## 5. Alert

**Responsibility:** a persistent, in-flow message about the current context.

```tsx
export type AlertTone = "info" | "success" | "warning" | "danger";
export interface AlertProps extends Props {
  tone?: AlertTone;          // default "info"
  title: string;
  icon?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;     // default "Dismiss"
}
```

Root: `display:"flex",flexDirection:"row",gap:space(3),padding:space(3),
borderRadius:radius.md`, background `*Soft`, `borderWidth:1`,
`borderColor: tone colour`, `role:"alert"`. Content column `flexGrow:1`, gap 1.
Title `fontSize:sm,fontWeight:semibold,color:tone colour`. Body
`fontSize:sm,color:color.foreground`. When `onDismiss`, an `IconButton` labelled
`dismissLabel` with `testId="alert-dismiss"`.

**Test:** each tone sets its own background/border/text colour; dismiss button
is absent without `onDismiss` and calls it once when clicked (real
`simulateClick` on its bounds); `role="alert"` in the tree; body children render.

**Example:** an upgrade banner with a dismiss button, plus an error alert with a
retry action in the body.

**Docs:** tones, dismiss, "use Toast for transient messages, Alert for
in-flow state", a11y note (`role="alert"` is announced).

---

## 6. EmptyState

**Responsibility:** the "nothing here yet" panel for a list, table or panel.

```tsx
export interface EmptyStateProps extends Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}
```

`display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
gap:space(3),padding:space(8)`. Title `fontSize:md,fontWeight:semibold,color:text`.
Description `fontSize:sm,color:textMuted,textAlign:"center",maxWidth:360`.
No border, no fill: it lives inside a Card or panel that supplies the surface.

**Test:** renders title/description/action; omitting optional parts does not
render empty nodes; the action slot renders an interactive child that still
receives its click (proves no pointer-events trap).

**Example:** "No projects yet" with a primary action; and a filter-empty variant.

---

## 7. List / ListItem

**Responsibility:** a vertical collection of rows, optionally single-selectable
with roving focus. This is the keyboard/selection foundation menus and tabs reuse.

```tsx
export type ListSelectionMode = "none" | "single";

export interface ListProps extends Props {
  selectionMode?: ListSelectionMode;   // default "none"
  value?: string;                      // controlled selected id
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  dense?: boolean;                     // row height 32 instead of 40
}

export interface ListItemProps extends Props {
  value: string;                       // stable id; also the selection value
  disabled?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}
export const ListItemTitle: FC<Props>;
export const ListItemDescription: FC<Props>;
```

Behaviour:
- `selectionMode="none"`: `List` role `"list"`, items role `"listitem"`, no
  keyboard handling, no tab stop.
- `selectionMode="single"`: `List` role `"listbox"` with `tabIndex={0}`; items
  role `"option"`, `"aria-selected"` set from the value. `ArrowDown`/`ArrowUp`
  move focus and the active item with wrap-around, skipping disabled items;
  `Home`/`End` jump; `Enter`/`Space` select the focused item; clicking selects.
  Exactly one item is in the tab order (the selected one, else the first).
- Roving focus uses `collection.ts` + `renderer.focusElement(id)`; the registry
  is a `useRef` and registration happens in `useLayoutEffect`.
- Selecting a disabled item is impossible from either path.

Styling: `List` `display:"flex",flexDirection:"column"`; `ListItem`
`flexDirection:"row",alignItems:"center",gap:space(3),paddingX:space(3)`,
height `dense ? 32 : 40`, `borderRadius:radius.sm`, `cursor:"pointer"` only when
selectable. State style: `hover.backgroundColor = color.accent`,
selected `backgroundColor = color.muted`, disabled `opacity:0.5`.
`ListItemTitle` `fontSize:sm,color:text`; `ListItemDescription`
`fontSize:xs,color:textMuted,textOverflow:"ellipsis",whiteSpace:"nowrap"`.

**Test:**
- list mode renders `role:"list"` and items `"listitem"`, no tab stop.
- single mode: clicking row 2 calls `onValueChange("b")`; the row shows
  `aria-selected: true` and the token fill; clicking row 1 moves selection.
- keyboard: focus the list, `simulateKeyDown("down")` focuses row 2
  (`getFocusedElementId()` equals the row's id); `"end"` focuses the last;
  `"enter"` selects the focused row; wrap-around from last with `"down"`.
- a disabled row in the middle is skipped by both arrow keys and clicks.
- dense changes row height (bounds assertion).
- controlled: with `value` fixed and no state update, clicking does not change
  the visual selection but still fires `onValueChange`.

That last one is the classic controlled-component bug; keep it.

**Example:** a "recent files" list with leading icons, descriptions and trailing
badges, single-selection wiring shown in the example's comment.

**Docs:** modes, keyboard table, controlled/uncontrolled, density, a11y roles.

---

## 8. Barrel, README, inventory

`src/index.ts` exports every part and its props type. Alphabetical, one line per
module:

```ts
export * from "./alert.js";
export * from "./avatar.js";
...
```

`packages/components/README.md`: one paragraph on the boundary, the component
list, the "add a component" checklist from plan 110 §8, and how to run tests.

`COMPONENTS.md` Tier 2 rows for these six move to `done` with
`GPUix support: yes` and a limitation note only where one exists (Avatar: no
image error state in v1).

---

## 9. Commands

```
nub install
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run check:tests
nub run fmt
nub run lint
```

Expected: all exit 0. `… test` reports at least the runtime guard plus six
behaviour suites, none skipped.

## 10. STOP conditions

Plan 110 §12 applies. Additional:

1. `collection.ts` needs a behaviour the GPUix renderer cannot support (for
   example focusing a node by id) — report the missing renderer method with the
   failing test; do not fall back to internal "selected index" state that
   diverges from real focus.
2. Avatar initials cannot be made unicode-safe without a dependency — STOP and
   report; do not ship a code-unit split.
3. A test cannot be made to fail, or passes before the implementation exists —
   the test is wrong; rewrite it, never relax the assertion.

## 11. Acceptance criteria

- [ ] Six components with the exact APIs above, each with JSDoc on exports.
- [ ] Tests for every behaviour bullet, all capable of failing.
- [ ] `examples/<name>.example.tsx` for each; no example is a bare rectangle.
- [ ] `docs/<name>.mdx` for each with description, variants, usage, API table,
      keyboard/a11y, related components.
- [ ] `COMPONENTS.md` rows updated.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.
