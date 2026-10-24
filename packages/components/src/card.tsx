/** @jsxImportSource @gpuix/react */
/**
 * Card: a bounded surface that groups related content.
 *
 * A surface only — it does not focus, scroll, dismiss or trap anything, and it
 * has no state. Compose the parts in reading order: header (title, description),
 * content, footer. The resting appearance is a Tailwind recipe
 * (`@gpuixui/tw`'s `CARD_*`), compiled against shadcn's fixed metrics; the
 * caller's `className` is joined after the recipe and its `style` is merged
 * last, so a consumer can override one rule without forking the component.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  CARD_BASE,
  CARD_CONTENT,
  CARD_DESCRIPTION,
  CARD_FOOTER,
  CARD_HEADER,
  CARD_TITLE,
  CARD_VARIANTS,
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

/** The surface treatments, as the guard reads them. */
const CardVariants = Schema.Literals(["outline", "elevated", "plain"]);

/** The surface treatment. `outline` borders, `elevated` floats, `plain` does neither. */
export type CardVariant = typeof CardVariants.Type;

/**
 * The treatment a stored variant paints.
 *
 * A variant is a stored choice as often as a literal — a saved dashboard, a
 * settings section, a layout record — so a name a release renamed arrives as a
 * string the union no longer carries. The raw table read answered `undefined`
 * and the recipe dropped the entry, so the surface painted neither the
 * documented `outline` edge nor a lift: a card with no boundary on the page. A
 * name the table does not carry paints the documented default, the rule the
 * `Badge` guard and `internal/button.tsx`'s `lookOf` follow.
 */
const variantOf = (value: unknown): CardVariant =>
  Schema.is(CardVariants)(value) ? value : "outline";

/** {@link Card} props. */
export interface CardProps extends Omit<Props, "children"> {
  /** Default `"outline"`; a stored name the table does not carry reads as the default. */
  readonly variant?: CardVariant;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** A bordered or elevated surface that groups related content. */
export const Card = ({
  variant = "outline",
  className,
  children,
  style,
  ...rest
}: CardProps) => {
  const theme = useTheme();
  assertParts(cardRoot, children);
  const treatment = variantOf(variant);
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(CARD_BASE, CARD_VARIANTS[treatment], className), theme),
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link CardHeader} props. */
export interface CardHeaderProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The block above the content: a title, a description and any meta row. */
export const CardHeader = ({
  className,
  children,
  style,
  ...rest
}: CardHeaderProps) => {
  const theme = useTheme();
  assertParts(cardHeaderContract, children);
  return (
    <div
      {...rest}
      style={mergeStyles(recipeStyle(cn(CARD_HEADER, className), theme), style)}
    >
      {children}
    </div>
  );
};

/** {@link CardTitle} props. */
export interface CardTitleProps extends Props {
  readonly className?: string;
}

/** The card's heading. Announced as a level-3 heading. */
export const CardTitle = ({ className, style, ...rest }: CardTitleProps) => {
  const theme = useTheme();
  return (
    <text
      role="heading"
      aria-level={3}
      {...rest}
      style={mergeStyles(recipeStyle(cn(CARD_TITLE, className), theme), style)}
    />
  );
};

/** {@link CardDescription} props. */
export interface CardDescriptionProps extends Props {
  readonly className?: string;
}

/** One line of supporting copy under {@link CardTitle}. */
export const CardDescription = ({
  className,
  style,
  ...rest
}: CardDescriptionProps) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(CARD_DESCRIPTION, className), theme),
        style,
      )}
    />
  );
};

/** {@link CardContent} props. */
export interface CardContentProps extends Props {
  readonly className?: string;
}

/** The card body: rows of whatever the card is about, stacked with a gap. */
export const CardContent = ({
  className,
  style,
  ...rest
}: CardContentProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(CARD_CONTENT, className), theme),
        style,
      )}
    />
  );
};

/** {@link CardFooter} props. */
export interface CardFooterProps extends Props {
  readonly className?: string;
}

/** The actions row, separated from the content by a top border. */
export const CardFooter = ({ className, style, ...rest }: CardFooterProps) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(recipeStyle(cn(CARD_FOOTER, className), theme), style)}
    />
  );
};

/** Every part of Card, so a misplaced sibling is named. */
const cardParts: ReadonlyArray<PartComponent> = [
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
];

/** The root hosts the three regions. */
const cardRoot: PartsContract = {
  parent: "Card",
  family: cardParts,
  accepts: [CardHeader, CardContent, CardFooter],
  hint: "Put the header, content and footer directly inside Card.",
};

/** The header hosts the title and the description; any other content is a meta row. */
const cardHeaderContract: PartsContract = {
  parent: "CardHeader",
  family: cardParts,
  accepts: [CardTitle, CardDescription],
  hint: "Put CardTitle and CardDescription directly inside CardHeader.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const cardMeta = {
  name: "Cards",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [],
  docs: "docs/card.mdx",
  example: "examples/card.example.tsx",
  testFile: "src/behaviour/card.test.tsx",
} as const;
