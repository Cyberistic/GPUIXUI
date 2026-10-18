/**
 * Breadcrumb: the trail to the current page, with an optional collapsed middle.
 *
 * The trail is declarative — `BreadcrumbItem` and `BreadcrumbLink` are the parts
 * a consumer composes — while the collapse rule is the pure, table-tested
 * `breadcrumb/logic.ts`. `BreadcrumbList` reads its direct children to keep the
 * parts declarative *and* collapse correctly: authored separators are attached to
 * the item that follows them, so hiding an item hides its separator too.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { collapse, type Crumb } from "./breadcrumb/logic.js";
import { activationHandlers } from "./internal/activate.js";
import { controlName } from "./internal/name.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { focusRing, textStyle, useTheme } from "./internal/theme.js";

/** The rules a breadcrumb part follows; throws outside a root. */
interface BreadcrumbContextValue {
  readonly maxItems: number | undefined;
  readonly separator: ReactNode;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(
  undefined,
);

const useBreadcrumbContext = (): BreadcrumbContextValue => {
  const value = useContext(BreadcrumbContext);
  if (value === undefined) {
    throw new Error("Breadcrumb parts must be used inside Breadcrumb");
  }
  return value;
};

/** {@link Breadcrumb} props. */
export interface BreadcrumbProps extends Omit<Props, "children"> {
  /** Rendered entries to keep; fewer than 3 is clamped to 3. */
  readonly maxItems?: number;
  /** The separator between entries. Default `/`. */
  readonly separator?: ReactNode;
  readonly children?: PartChildren;
}

/** The trail's root: a labelled navigation landmark and the collapse budget. */
export const Breadcrumb = ({
  maxItems,
  separator,
  children,
  style,
  ...rest
}: BreadcrumbProps) => {
  const context: BreadcrumbContextValue = { maxItems, separator };
  assertParts(breadcrumbRoot, children);

  return (
    <BreadcrumbContext.Provider value={context}>
      <div
        role="navigation"
        aria-label="Breadcrumb"
        {...rest}
        style={mergeStyles(
          { display: "flex", flexDirection: "row", alignItems: "center" },
          style,
        )}
      >
        {children}
      </div>
    </BreadcrumbContext.Provider>
  );
};

/** One parsed trail entry: the child and the separator authored before it. */
interface Entry {
  readonly element: ReactNode;
  readonly separator: ReactNode;
}

/** Pair each item with the separator that precedes it; a trailing one is dropped. */
const entries = (
  children: ReactNode,
  fallback: ReactNode,
): ReadonlyArray<Entry> => {
  const collected: Array<{ element: ReactNode; separator: ReactNode }> = [];
  let pending: ReactNode = fallback;

  Arr.forEach(Children.toArray(children), (child) => {
    if (isValidElement(child) && child.type === BreadcrumbSeparator) {
      pending = child;
      return;
    }
    collected.push({ element: child, separator: pending });
    pending = fallback;
  });

  return collected;
};

/** The text standing in for the hidden middle. Not focusable, and labelled. */
const Ellipsis = () => {
  const theme = useTheme();
  return (
    <text
      aria-label="More"
      style={{
        ...textStyle(theme, "caption"),
        color: theme.colors.mutedForeground,
      }}
    >
      …
    </text>
  );
};

/** {@link BreadcrumbList} props. */
export interface BreadcrumbListProps extends Omit<Props, "children"> {
  readonly children?: PartChildren;
}

/** The horizontal row of crumbs. Collapses its middle when `maxItems` is set. */
export const BreadcrumbList = ({
  style,
  children,
  ...rest
}: BreadcrumbListProps) => {
  const theme = useTheme();
  const { maxItems, separator } = useBreadcrumbContext();
  const fallback = separator ?? <BreadcrumbSeparator />;
  const parsed = entries(children, fallback);
  assertParts(breadcrumbList, children);
  const crumbs: ReadonlyArray<Crumb<Entry>> =
    maxItems === undefined
      ? Arr.map(parsed, (item) => ({ kind: "item", item }))
      : collapse(parsed, maxItems);

  return (
    <div
      role="list"
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: theme.spacing.xs,
        },
        style,
      )}
    >
      {Arr.map(crumbs, (crumb, index) => {
        const item = crumb.kind === "item" ? crumb.item : undefined;
        return (
          <Fragment key={index}>
            {index === 0
              ? null
              : item === undefined
                ? fallback
                : item.separator}
            {item === undefined ? <Ellipsis /> : item.element}
          </Fragment>
        );
      })}
    </div>
  );
};

/** One entry in the trail. */
export interface BreadcrumbItemProps extends Omit<Props, "children"> {
  readonly children?: PartChildren;
}

/** One entry in the trail. */
export const BreadcrumbItem = ({
  children,
  style,
  ...rest
}: BreadcrumbItemProps) => {
  const theme = useTheme();
  assertParts(breadcrumbItem, children);
  return (
    <div
      role="listitem"
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.xs,
        },
        style,
      )}
    >
      {children}
    </div>
  );
};

/** {@link BreadcrumbLink} props. */
export interface BreadcrumbLinkProps extends Props {
  /** Called on click or Enter/Space. */
  readonly onSelect?: () => void;
  /** Render as the current page instead of an interactive link. */
  readonly current?: boolean;
}

/** A link back up the trail, or — with `current` — plain text. */
export const BreadcrumbLink = ({
  onSelect,
  current = false,
  onClick,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  autoFocus = false,
  style,
  children,
  ...rest
}: BreadcrumbLinkProps) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(autoFocus);
  const name = controlName(rest["aria-label"], children);

  if (current) {
    return (
      <BreadcrumbPage {...rest} style={style}>
        {children}
      </BreadcrumbPage>
    );
  }

  return (
    <div
      role="link"
      {...rest}
      {...(name === undefined ? {} : { "aria-label": name })}
      autoFocus={autoFocus}
      tabIndex={0}
      onClick={(event) => {
        onClick?.(event);
        onSelect?.();
      }}
      {...activationHandlers(() => onSelect?.(), { onKeyDown, onKeyUp })}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        {
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
          cursor: "pointer",
          paddingLeft: theme.spacing["2xs"],
          paddingRight: theme.spacing["2xs"],
          borderRadius: theme.radius.sm,
          hover: { color: theme.colors.foreground },
          ...(focused ? focusRing(theme) : {}),
        },
        style,
      )}
    >
      {children}
    </div>
  );
};

/** The current page: text, with no interaction and no tab stop. */
export const BreadcrumbPage = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        {
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        },
        style,
      )}
    />
  );
};

/** The glyph between entries. Not focusable and not announced as content. */
export const BreadcrumbSeparator = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <text
      role="presentation"
      {...rest}
      style={mergeStyles(
        {
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
          userSelect: "none",
        },
        style,
      )}
    >
      /
    </text>
  );
};

/** Every part of Breadcrumb, so a misplaced sibling is named. */
const breadcrumbParts: ReadonlyArray<PartComponent> = [
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
];

const breadcrumbRoot: PartsContract = {
  parent: "Breadcrumb",
  family: breadcrumbParts,
  accepts: [BreadcrumbList],
  hint: "Put BreadcrumbList directly inside Breadcrumb.",
};

const breadcrumbList: PartsContract = {
  parent: "BreadcrumbList",
  family: breadcrumbParts,
  accepts: [BreadcrumbItem, BreadcrumbSeparator],
  hint: "Put BreadcrumbItem and BreadcrumbSeparator directly inside BreadcrumbList.",
};

const breadcrumbItem: PartsContract = {
  parent: "BreadcrumbItem",
  family: breadcrumbParts,
  accepts: [BreadcrumbLink, BreadcrumbPage],
  hint: "Put BreadcrumbLink or BreadcrumbPage directly inside BreadcrumbItem.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const breadcrumbMeta = {
  name: "Breadcrumbs",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no aria-current in 0.10.0; the current page is marked by BreadcrumbPage and colour only",
    "maxItems reads direct children, so a custom wrapper element is counted as one entry",
  ],
  docs: "docs/breadcrumb.mdx",
  example: "examples/breadcrumb.example.tsx",
  testFile: "src/behaviour/breadcrumb.test.tsx",
} as const;
