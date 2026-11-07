/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  BREADCRUMB_ELLIPSIS,
  BREADCRUMB_ITEM,
  BREADCRUMB_LINK,
  BREADCRUMB_LIST,
  BREADCRUMB_PAGE,
  BREADCRUMB_ROOT,
  BREADCRUMB_SEPARATOR,
  cn,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  type ReactNode,
} from "react";
import { collapse, type Crumb } from "./breadcrumb/logic.js";
import { activationHandlers } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { keyboardRing, useTheme } from "./internal/theme.js";

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

export interface BreadcrumbProps extends Omit<Props, "children"> {
  readonly maxItems?: number;

  readonly separator?: ReactNode;

  readonly className?: string;
  readonly children?: PartChildren;
}

export const Breadcrumb = ({
  maxItems,
  separator,
  className,
  children,
  style,
  ...rest
}: BreadcrumbProps) => {
  const theme = useTheme();
  const context: BreadcrumbContextValue = { maxItems, separator };
  assertParts(breadcrumbRoot, children);

  return (
    <BreadcrumbContext.Provider value={context}>
      <div
        role="navigation"
        aria-label="Breadcrumb"
        {...rest}
        style={mergeStyles(
          recipeStyle(cn(BREADCRUMB_ROOT, className), theme),
          style,
        )}
      >
        {children}
      </div>
    </BreadcrumbContext.Provider>
  );
};

interface Entry {
  readonly element: ReactNode;
  readonly separator: ReactNode;
}

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

const Ellipsis = () => {
  const theme = useTheme();
  return (
    <div style={recipeStyle(BREADCRUMB_ELLIPSIS, theme)}>
      <Icon
        name="ellipsis"
        size="xs"
        color={theme.colors.mutedForeground}
        label="More"
      />
    </div>
  );
};

export interface BreadcrumbListProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

export const BreadcrumbList = ({
  className,
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
        recipeStyle(cn(BREADCRUMB_LIST, className), theme),
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

export interface BreadcrumbItemProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

export const BreadcrumbItem = ({
  className,
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
        recipeStyle(cn(BREADCRUMB_ITEM, className), theme),
        style,
      )}
    >
      {children}
    </div>
  );
};

export interface BreadcrumbLinkProps extends Props {
  readonly onSelect?: () => void;

  readonly current?: boolean;

  readonly className?: string;
}

export const BreadcrumbLink = ({
  onSelect,
  current = false,
  onClick,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  className,
  style,
  ...rest
}: BreadcrumbLinkProps) => {
  const theme = useTheme();

  if (current) {
    return <BreadcrumbPage {...rest} className={className} style={style} />;
  }

  return (
    <div
      role="link"
      {...rest}
      tabIndex={0}
      onClick={(event) => {
        onClick?.(event);
        onSelect?.();
      }}
      {...activationHandlers(() => onSelect?.(), { onKeyDown, onKeyUp })}
      onFocus={(event) => onFocus?.(event)}
      onBlur={(event) => onBlur?.(event)}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(BREADCRUMB_LINK, className), theme), {
          hover: { color: theme.colors.foreground },
          ...keyboardRing(theme),
        }),
        style,
      )}
    />
  );
};

export interface BreadcrumbPageProps extends Props {
  readonly className?: string;
}

export const BreadcrumbPage = ({
  className,
  style,
  ...rest
}: BreadcrumbPageProps) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      aria-selected
      style={mergeStyles(
        recipeStyle(cn(BREADCRUMB_PAGE, className), theme),
        style,
      )}
    />
  );
};

export interface BreadcrumbSeparatorProps extends Props {
  readonly className?: string;
}

export const BreadcrumbSeparator = ({
  className,
  style,
  ...rest
}: BreadcrumbSeparatorProps) => {
  const theme = useTheme();
  return (
    <text
      role="presentation"
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(BREADCRUMB_SEPARATOR, className), theme),
        style,
      )}
    >
      /
    </text>
  );
};

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

export const breadcrumbMeta = {
  name: "Breadcrumbs",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no aria-current in 0.11.0; the current page publishes aria-selected, the stand-in Pagination/Stepper/Timeline use",
    "maxItems reads direct children, so a custom wrapper element is counted as one entry",
  ],
  docs: "docs/breadcrumb.mdx",
  example: "examples/breadcrumb.example.tsx",
  testFile: "src/behaviour/breadcrumb.test.tsx",
} as const;
