/** @jsxImportSource @gpuix/react */
/**
 * Item: one row of a list — media, text and actions in one line.
 *
 * A layout primitive and nothing more: it holds no state, takes no presses and
 * paints no hover. shadcn's `Item` is the row a settings list, a file list or a
 * picker repeats, so the parts are named by their job and the row itself only
 * decides the surface (`variant`) and the density (`size`).
 *
 * Order is the layout's: the row is a wrapping flex line, so
 * `ItemMedia` before `ItemContent` paints before the text and `ItemActions`
 * after it paints after. `ItemHeader` and `ItemFooter` take the full width and
 * therefore their own line, above and below the media/content/actions line.
 *
 * A variant or size a release renamed paints the documented default, the rule
 * `Card` follows: the surface is read at the boundary rather than dropped.
 */

import type { Props } from "@gpuix/react";
import type { ReactNode } from "react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  ITEM_ACTIONS,
  ITEM_BASE,
  ITEM_CONTENT,
  ITEM_DESCRIPTION,
  ITEM_FOOTER,
  ITEM_GROUP,
  ITEM_HEADER,
  ITEM_MEDIA,
  ITEM_MEDIA_VARIANTS,
  ITEM_SIZES,
  ITEM_TITLE,
  ITEM_VARIANTS,
  cn,
} from "@gpuixui/tw";
import * as Schema from "effect/Schema";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

const ItemVariants = Schema.Literals(["default", "outline", "muted"]);

/** The surface a row paints. */
export type ItemVariant = typeof ItemVariants.Type;

const ItemSizes = Schema.Literals(["default", "sm"]);

/** The row's density. */
export type ItemSize = typeof ItemSizes.Type;

const ItemMediaVariants = Schema.Literals(["default", "icon", "image"]);

/** What the leading slot holds: anything, an icon, or a picture. */
export type ItemMediaVariant = keyof typeof ITEM_MEDIA_VARIANTS;

/** A stored name the union does not carry reads as the documented default. */
const itemVariantOf = (value: unknown): ItemVariant =>
  Schema.is(ItemVariants)(value) ? value : "default";

const itemSizeOf = (value: unknown): ItemSize =>
  Schema.is(ItemSizes)(value) ? value : "default";

const itemMediaOf = (value: unknown): ItemMediaVariant =>
  Schema.is(ItemMediaVariants)(value) ? value : "default";

/** Props every layout part shares: the caller's class, style and children. */
interface PartProps extends Omit<Props, "children"> {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** Props for a part that paints one line of text. */
interface TextPartProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

/** {@link Item} props. */
export interface ItemProps extends PartProps {
  /** Default `"default"`. */
  readonly variant?: ItemVariant;
  /** Default `"default"`. */
  readonly size?: ItemSize;
}

/** {@link ItemGroup} props. */
export interface ItemGroupProps extends PartProps {}

/** {@link ItemMedia} props. */
export interface ItemMediaProps extends PartProps {
  /** Default `"default"`. */
  readonly variant?: ItemMediaVariant;
}

/** One row. */
export const Item = ({
  variant = "default",
  size = "default",
  className,
  children,
  style,
  ...rest
}: ItemProps) => {
  const theme = useTheme();
  assertParts(itemContract, children);
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(
          cn(
            ITEM_BASE,
            ITEM_VARIANTS[itemVariantOf(variant)],
            ITEM_SIZES[itemSizeOf(size)],
            className,
          ),
          theme,
        ),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** The rows of one list. */
export const ItemGroup = ({
  className,
  children,
  style,
  ...rest
}: ItemGroupProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      role="list"
      style={mergeStyles(recipeStyle(cn(ITEM_GROUP, className), theme), style)}
    >
      {children}
    </div>
  );
};

/** The leading slot: an icon, a picture or any mark. */
export const ItemMedia = ({
  variant = "default",
  className,
  children,
  style,
  ...rest
}: ItemMediaProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(
          cn(ITEM_MEDIA, ITEM_MEDIA_VARIANTS[itemMediaOf(variant)], className),
          theme,
        ),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** The text column. */
export const ItemContent = ({
  className,
  children,
  style,
  ...rest
}: PartProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(ITEM_CONTENT, className), theme),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** The row's name. */
export const ItemTitle = ({
  className,
  children,
  style,
  ...rest
}: TextPartProps) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(recipeStyle(cn(ITEM_TITLE, className), theme), style)}
    >
      {children}
    </text>
  );
};

/** The supporting line under the name. */
export const ItemDescription = ({
  className,
  children,
  style,
  ...rest
}: TextPartProps) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(ITEM_DESCRIPTION, className), theme),
        style,
      )}
    >
      {children}
    </text>
  );
};

/** The trailing controls. */
export const ItemActions = ({
  className,
  children,
  style,
  ...rest
}: PartProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(ITEM_ACTIONS, className), theme),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** A full-width line above the content. */
export const ItemHeader = ({
  className,
  children,
  style,
  ...rest
}: PartProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(recipeStyle(cn(ITEM_HEADER, className), theme), style)}
    >
      {children}
    </div>
  );
};

/** A full-width line below the content. */
export const ItemFooter = ({
  className,
  children,
  style,
  ...rest
}: PartProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(recipeStyle(cn(ITEM_FOOTER, className), theme), style)}
    >
      {children}
    </div>
  );
};

/** Every part, so a misplaced sibling is named. */
const itemParts: ReadonlyArray<PartComponent> = [
  Item,
  ItemGroup,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemHeader,
  ItemFooter,
];

const itemContract: PartsContract = {
  parent: "Item",
  family: itemParts,
  accepts: [
    ItemMedia,
    ItemContent,
    ItemTitle,
    ItemDescription,
    ItemActions,
    ItemHeader,
    ItemFooter,
  ],
  hint: "Put ItemMedia, ItemContent and ItemActions directly inside Item.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const itemMeta = {
  name: "Item",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "`line-clamp-2` has no native utility, so a description clips its overflow instead of ending in an ellipsis after two lines",
    "no `ItemSeparator` part: put a `Separator` between rows",
    "a row paints no hover or press state — wrap it in a `ListItem` or a Button when it acts",
  ],
  docs: "docs/item.mdx",
  example: "examples/item.example.tsx",
  testFile: "src/behaviour/item.test.tsx",
} as const;
