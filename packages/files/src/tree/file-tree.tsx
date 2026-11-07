import type {
  EventPayload,
  MotionProps,
  Props,
  PublicInstance,
} from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  TREE_INDENT,
  TREE_INSET,
  expandedSet,
  paintedRows,
  treeName,
  type TreeCursor,
  type TreeRow,
} from "@gpuixui/data";
import { useTree } from "@gpuixui/data/tree/use-tree";
import { Icon, type IconName } from "@gpuixui/icons";
import {
  delayedTiming,
  transitionWindowMs,
  type PresenceTiming,
} from "@gpuixui/motion/presence";
import { useSurfaceTiming } from "@gpuixui/motion/react/presence";
import { iconSideOf, rowHeightOf, storedText } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { recipeStyle } from "../recipe.js";
import { pointerWash, textStyle, themeColors, useTheme } from "../theme.js";
import {
  fileIcon,
  fileKindOf,
  fileTreePaths,
  fileTreeTab,
  visibleFileRows,
  type FileKind,
  type FileNode,
} from "./logic.js";
import { FILE_TREE_ROOT, FILE_TREE_ROW } from "./recipe.js";

export interface FileTreeProps extends Omit<Props, "children"> {
  readonly expanded?: Iterable<string>;

  readonly defaultExpanded?: Iterable<string>;

  readonly selected?: string | null;

  readonly onSelect?: (path: string) => void;

  readonly onExpandedChange?: (expanded: ReadonlyArray<string>) => void;

  readonly children?: ReactNode;

  readonly height?: number;
  readonly className?: string;

  readonly testId?: string;
}

export interface FileTreeFolderProps {
  readonly path: string;

  readonly name: string;

  readonly children?: ReactNode;
}

export interface FileTreeFileProps {
  readonly path: string;

  readonly name: string;

  readonly icon?: IconName;

  readonly children?: ReactNode;
}

export interface FileTreeIconProps {
  readonly name?: IconName;

  readonly selected?: boolean;

  readonly children?: ReactNode;
}

export interface FileTreeNameProps {
  readonly selected?: boolean;

  readonly children?: ReactNode;
}

const Declared = createContext(false);

const nameOf = (type: unknown): string =>
  typeof type === "function" && type.name !== "" ? type.name : "element";

const useDeclared = (part: string): void => {
  if (!useContext(Declared)) {
    throw new Error(`${part} must be used inside FileTree.`);
  }
};

export const FileTreeFolder = (_props: FileTreeFolderProps): null => {
  useDeclared("FileTreeFolder");
  return null;
};

export const FileTreeFile = (_props: FileTreeFileProps): null => {
  useDeclared("FileTreeFile");
  return null;
};

export const FileTreeIcon = ({
  name,
  selected = false,
  children,
}: FileTreeIconProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const tint = selected ? colors.foreground : colors.mutedForeground;
  return (
    <div
      role="presentation"
      style={{
        width: iconSideOf(theme, "md"),
        height: iconSideOf(theme, "md"),
        display: "flex",
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: theme.spacing.xs,
        pointerEvents: "none",
      }}
    >
      {name === undefined ? (
        children
      ) : tint === undefined ? undefined : (
        <Icon name={name} size="md" color={tint} />
      )}
    </div>
  );
};

export const FileTreeName = ({ children }: FileTreeNameProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  return (
    <div
      style={{
        flexGrow: 1,
        minWidth: 0,
        marginLeft: theme.spacing.xs,
        overflow: "hidden",
      }}
    >
      <text
        style={{
          ...textStyle(theme, "label"),
          color: colors.foreground,
          display: "block",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {children}
      </text>
    </div>
  );
};

interface DeclaredTree {
  readonly nodes: ReadonlyArray<FileNode>;
  readonly content: ReadonlyMap<string, ReactNode>;
}

const declare = (children: ReactNode): DeclaredTree => {
  const content = new Map<string, ReactNode>();

  const nodes = (next: ReactNode): ReadonlyArray<FileNode> =>
    Arr.flatMap(Children.toArray(next), (child) => {
      if (!isValidElement(child)) {
        throw new Error(
          `FileTree renders FileTreeFolder and FileTreeFile parts; received ${typeof child}.`,
        );
      }
      if (child.type === Fragment) {
        return nodes(
          (child.props as { readonly children?: ReactNode }).children,
        );
      }
      if (
        isValidElement<FileTreeFolderProps>(child) &&
        child.type === FileTreeFolder
      ) {
        return [
          {
            path: child.props.path,
            name: child.props.name,
            children: nodes(child.props.children),
          },
        ];
      }
      if (
        isValidElement<FileTreeFileProps>(child) &&
        child.type === FileTreeFile
      ) {
        if (child.props.children !== undefined) {
          content.set(child.props.path, child.props.children);
        }
        return [
          {
            path: child.props.path,
            name: child.props.name,
            ...(child.props.icon === undefined
              ? {}
              : { icon: child.props.icon }),
          },
        ];
      }
      throw new Error(
        `FileTree renders FileTreeFolder and FileTreeFile parts; ${nameOf(child.type)} is neither.`,
      );
    });

  return { nodes: nodes(children), content };
};

const kindOf = (node: FileNode): FileKind =>
  node.children === undefined ? fileKindOf(node.name, false) : "folder";

const glyphOf = (node: FileNode, expanded: boolean): IconName =>
  node.icon ?? fileIcon(kindOf(node), expanded);

interface FileTreeRowProps {
  readonly row: TreeRow<FileNode>;
  readonly selected: boolean;
  readonly tabbable: boolean;
  readonly content: ReactNode;
  readonly testId: string | undefined;

  readonly entering: boolean;

  readonly leaving: boolean;
  readonly timing: PresenceTiming;
  readonly onPress: () => void;
  readonly onKeyDown: (event: EventPayload) => void;
  readonly attach?: (instance: PublicInstance | null) => void;
}

const FOLD_LEAD_MS = 20;

const FileTreeRow = ({
  row,
  selected,
  tabbable,
  content,
  testId,
  entering,
  leaving,
  timing,
  onPress,
  onKeyDown,
  attach,
}: FileTreeRowProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const tint = selected ? colors.foreground : colors.mutedForeground;
  const hover = selected ? colors.hover : colors.hover;
  const press =
    pointerWash(theme, "active", selected ? "accent" : "hover") ??
    colors.active;
  const height = rowHeightOf(theme);
  const resting = { height, opacity: 1 };
  const folded = { height: 0, opacity: 0 };
  const motion: MotionProps = {
    initial: entering ? folded : resting,
    animate: leaving ? folded : resting,
    transition: leaving
      ? delayedTiming(timing.exit, FOLD_LEAD_MS)
      : timing.enter,
  };

  return (
    <div
      ref={attach}
      role="treeitem"
      aria-label={treeName(row.node.name, row.key)}
      aria-level={row.depth + 1}
      {...(leaving
        ? { "aria-hidden": true }
        : row.node.children === undefined
          ? { "aria-selected": selected }
          : row.hasChildren
            ? { "aria-expanded": row.expanded }
            : {})}
      tabIndex={!leaving && tabbable ? 0 : -1}
      testId={testId}
      onClick={leaving ? undefined : onPress}
      onKeyDown={leaving ? undefined : onKeyDown}
      motion={motion}
      style={{
        ...recipeStyle(FILE_TREE_ROW, theme),
        height,
        overflow: "hidden",
        paddingLeft: TREE_INSET + row.depth * TREE_INDENT,
        paddingRight: theme.spacing.sm,
        borderRadius: theme.radius.md,
        backgroundColor: selected ? colors.hover : undefined,
        ...(leaving ? { pointerEvents: "none" } : {}),
        hover: { backgroundColor: hover },
        active: { backgroundColor: press },
        focusVisible: {
          outlineWidth: 2,
          outlineColor: colors.ring,
          outlineOffset: -2,
        },
      }}
    >
      <div
        role="presentation"
        testId={testId === undefined ? undefined : `${testId}-slot`}
        style={{
          width: iconSideOf(theme, "md"),
          height: iconSideOf(theme, "md"),
          display: "flex",
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {row.hasChildren && tint !== undefined ? (
          <Icon
            name={row.expanded ? "chevron-down" : "chevron-right"}
            size="md"
            color={tint}
          />
        ) : undefined}
      </div>
      {content === undefined ? (
        <>
          <FileTreeIcon
            name={glyphOf(row.node, row.expanded)}
            selected={selected}
          />
          <FileTreeName selected={selected}>{row.node.name}</FileTreeName>
        </>
      ) : (
        content
      )}
    </div>
  );
};

type Fold = Option.Option<{
  readonly leaving: ReadonlyArray<TreeRow<FileNode>>;
  readonly before: ReadonlyArray<TreeRow<FileNode>>;
  readonly entering: HashSet.HashSet<string>;
}>;

export const FileTree = ({
  expanded,
  defaultExpanded,
  selected,
  onSelect,
  onExpandedChange,
  children,
  height,
  className,
  testId,
  style,
  ...rest
}: FileTreeProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const declared = useMemo(() => declare(children), [children]);
  const [storedExpanded, setStoredExpanded] = useState<HashSet.HashSet<string>>(
    () => expandedSet(defaultExpanded),
  );
  const open = expanded === undefined ? storedExpanded : expandedSet(expanded);
  const rows = useMemo(
    () => visibleFileRows(declared.nodes, open),
    [declared.nodes, open],
  );
  const selectedPath = storedText(selected);
  const [active, setActive] = useState<Option.Option<string>>(() =>
    Option.map(fileTreeTab(rows, selectedPath), (row) => row.key),
  );
  const pendingSelection = useRef(false);
  const timing = useSurfaceTiming("normal");
  const foldWindow = Math.max(
    transitionWindowMs(timing.enter),
    transitionWindowMs(delayedTiming(timing.exit, FOLD_LEAD_MS)),
  );
  const [fold, setFold] = useState<Fold>(Option.none());
  const [seen, setSeen] = useState(rows);

  if (seen !== rows) {
    const before = seen;
    const visible = HashSet.fromIterable(Arr.map(rows, (row) => row.key));
    const previous = HashSet.fromIterable(Arr.map(before, (row) => row.key));
    const leaving = Arr.filter(before, (row) => !HashSet.has(visible, row.key));
    const entering = Arr.filter(rows, (row) => !HashSet.has(previous, row.key));
    setSeen(rows);
    setFold(
      foldWindow === 0 ||
        (Arr.isReadonlyArrayEmpty(leaving) &&
          Arr.isReadonlyArrayEmpty(entering))
        ? Option.none()
        : Option.some({
            leaving,
            before,
            entering: HashSet.fromIterable(Arr.map(entering, (row) => row.key)),
          }),
    );
  }

  useEffect(() => {
    if (Option.isNone(fold)) return;
    const handle = setTimeout(() => setFold(Option.none()), foldWindow);
    return () => clearTimeout(handle);
  }, [fold, foldWindow]);

  const painted = paintedRows(
    rows,
    Option.match(fold, {
      onNone: () => [],
      onSome: (current) => current.leaving,
    }),
    Option.match(fold, {
      onNone: () => rows,
      onSome: (current) => current.before,
    }),
  );
  const report = (next: HashSet.HashSet<string>): void => {
    if (HashSet.isSubset(open, next) && HashSet.isSubset(next, open)) return;
    if (expanded === undefined) setStoredExpanded(next);
    onExpandedChange?.(fileTreePaths(next));
  };

  const commit = (next: TreeCursor): void => {
    setActive(next.active);
    report(next.expanded);
  };

  const tree = useTree({
    rows,
    labelOf: (node) => node.name,
    cursor: { expanded: open, active },
    onCursorChange: commit,
    onActivate: (row) => {
      if (row.node.children === undefined) onSelect?.(row.key);
    },
  });

  useEffect(() => {
    pendingSelection.current = true;
  }, [selectedPath]);

  useEffect(() => {
    if (!pendingSelection.current) return;
    if (selectedPath === undefined) {
      pendingSelection.current = false;
      return;
    }
    const tab = fileTreeTab(rows, selectedPath);
    if (Option.isNone(tab) || tab.value.key !== selectedPath) return;
    pendingSelection.current = false;
    if (Option.contains(active, selectedPath)) return;
    tree.commit(
      { expanded: open, active: Option.some(selectedPath) },
      { focus: false },
    );
  }, [selectedPath, active, rows, open, tree]);

  const bound =
    height !== undefined && Number.isFinite(height) && height > 0
      ? height
      : undefined;

  return (
    <Declared.Provider value={true}>
      <div
        {...rest}
        role="tree"
        testId={testId}
        style={mergeStyles(
          mergeStyles(recipeStyle(cn(FILE_TREE_ROOT, className), theme), {
            ...(bound === undefined
              ? {}
              : {
                  height: bound,
                  flexGrow: 0,
                  flexShrink: 0,
                  flexBasis: bound,
                }),
            overflowY: "scroll",
            scrollbarColor: colors.scrollbar,
          }),
          style,
        )}
      >
        {Arr.map(painted, ({ row, leaving }) => (
          <FileTreeRow
            key={row.key}
            row={row}
            selected={row.key === selectedPath}
            tabbable={Option.contains(tree.tabKey, row.key)}
            content={declared.content.get(row.key)}
            testId={
              testId === undefined ? undefined : `${testId}-row-${row.key}`
            }
            entering={Option.match(fold, {
              onNone: () => false,
              onSome: (current) => HashSet.has(current.entering, row.key),
            })}
            leaving={leaving}
            timing={timing}
            onPress={() => tree.activate(row)}
            onKeyDown={tree.handleKey}
            attach={leaving ? undefined : tree.attach(row.key)}
          />
        ))}
      </div>
    </Declared.Provider>
  );
};
