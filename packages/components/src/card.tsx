/**
 * Card: a bounded surface that groups related content.
 *
 * A surface only — it does not focus, scroll, dismiss or trap anything, and it
 * has no state. Compose the parts in reading order: header (title, description),
 * content, footer. Every part merges the caller's `style` last so a consumer can
 * override one rule without forking the component (plan 110 §8).
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match } from "effect";
import { headingLevel, type HeadingLevel } from "./internal/heading.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  elevationShadow,
  textStyle,
  useTheme,
  type Theme,
} from "./internal/theme.js";

/** The surface treatment. `outline` borders, `elevated` floats, `plain` does neither. */
export type CardVariant = "outline" | "elevated" | "plain";

/** {@link Card} props. */
export interface CardProps extends Omit<Props, "children"> {
  /** Default `"outline"`. */
  readonly variant?: CardVariant;
  readonly children?: PartChildren;
}

/** The rules a variant adds to the base surface. */
const surface = (theme: Theme, variant: CardVariant) =>
  Match.value(variant).pipe(
    Match.when("outline", () => ({
      borderWidth: theme.borderWidth.thin,
      borderColor: theme.colors.border,
    })),
    Match.when("elevated", () => ({ boxShadow: elevationShadow(theme, "md") })),
    Match.when("plain", () => ({})),
    Match.exhaustive,
  );

/** A bordered or elevated surface that groups related content. */
export const Card = ({
  variant = "outline",
  children,
  style,
  ...rest
}: CardProps) => {
  const theme = useTheme();
  assertParts(cardRoot, children);
  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          ...surface(theme, variant),
        },
        style,
      )}
    >
      {children}
    </div>
  );
};

/** The block above the content: a title, a description and any meta row. */
export interface CardHeaderProps extends Omit<Props, "children"> {
  readonly children?: PartChildren;
}

/** The block above the content: a title, a description and any meta row. */
export const CardHeader = ({ children, style, ...rest }: CardHeaderProps) => {
  const theme = useTheme();
  assertParts(cardHeaderContract, children);
  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xs,
          padding: theme.spacing.xl,
          paddingBottom: theme.spacing.lg,
        },
        style,
      )}
    >
      {children}
    </div>
  );
};

/** The card's heading. Announced as a level-3 heading unless `level` says otherwise. */
export interface CardTitleProps extends Props {
  /** The heading level in the document outline. Default `3`. */
  readonly level?: HeadingLevel;
}

/** The card's heading; its level belongs to the surrounding outline. */
export const CardTitle = ({ level, style, ...rest }: CardTitleProps) => {
  const theme = useTheme();
  return (
    <text
      role="heading"
      {...rest}
      aria-level={headingLevel(level, rest["aria-level"], 3)}
      style={mergeStyles(
        { ...textStyle(theme, "h3"), color: theme.colors.foreground },
        style,
      )}
    />
  );
};

/** One line of supporting copy under {@link CardTitle}. */
export const CardDescription = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        {
          ...textStyle(theme, "body"),
          color: theme.colors.mutedForeground,
        },
        style,
      )}
    />
  );
};

/** The card body: rows of whatever the card is about, stacked with a gap. */
export const CardContent = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
        },
        style,
      )}
    />
  );
};

/** The actions row, separated from the content by a top border. */
export const CardFooter = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderTopWidth: theme.borderWidth.thin,
          // `StyleDesc` has no `borderTopColor`; the footer's only border is the
          // top one, so `borderColor` colours exactly it.
          borderColor: theme.colors.border,
        },
        style,
      )}
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
  focusable: false,
  limitations: [],
  docs: "docs/card.mdx",
  example: "examples/card.example.tsx",
  testFile: "src/behaviour/card.test.tsx",
} as const;
