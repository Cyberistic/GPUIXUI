/** @jsxImportSource @gpuix/react */
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

export type ItemVariant = typeof ItemVariants.Type;

const ItemSizes = Schema.Literals(["default", "sm"]);

export type ItemSize = typeof ItemSizes.Type;

const ItemMediaVariants = Schema.Literals(["default", "icon", "image"]);

export type ItemMediaVariant = keyof typeof ITEM_MEDIA_VARIANTS;

const itemVariantOf = (value: unknown): ItemVariant =>
  Schema.is(ItemVariants)(value) ? value : "default";

const itemSizeOf = (value: unknown): ItemSize =>
  Schema.is(ItemSizes)(value) ? value : "default";

const itemMediaOf = (value: unknown): ItemMediaVariant =>
  Schema.is(ItemMediaVariants)(value) ? value : "default";

interface PartProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

interface TextPartProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: ReactNode;
}

export interface ItemProps extends PartProps {
  readonly variant?: ItemVariant;

  readonly size?: ItemSize;
}

export interface ItemGroupProps extends PartProps {}

export interface ItemMediaProps extends PartProps {
  readonly variant?: ItemMediaVariant;
}

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
