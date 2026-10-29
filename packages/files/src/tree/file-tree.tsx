/**
 * `FileTree` — shadcn's AI Elements file tree over `@gpuixui/data`'s tree.
 *
 * The reference composes a tree from declarative parts:
 *
 * ```tsx
 * <FileTree defaultExpanded={["src"]} selected={file} onSelect={setFile}>
 *   <FileTreeFolder path="src" name="src">
 *     <FileTreeFile path="src/index.ts" name="index.ts" />
 *   </FileTreeFolder>
 *   <FileTreeFile path="readme.md" name="readme.md" />
 * </FileTree>
 * ```
 *
 * `FileTreeFolder` and `FileTreeFile` **declare** the tree; the root reads
 * their props into the `FileNode` model and paints one flat row list. A flat
 * list is what makes the generic tree's one tab stop, arrow walk and
 * Left/Right collapse/expand possible — a recursive part renderer would need a
 * second registration pass to know the visible order.
 *
 * The rows are the generic tree's (`useTree`, `flattenTree`); this file adds
 * the file-tree anatomy: one guide cell per ancestor, a chevron that swaps
 * glyphs (the runtime has no transform, so it cannot rotate), a glyph per kind,
 * a monospace name, and one selected file path.
 */

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

/** {@link FileTree} props. */
export interface FileTreeProps extends Omit<Props, "children"> {
  /** The open folder paths, when the caller holds them. Omit for uncontrolled. */
  readonly expanded?: Iterable<string>;
  /** The open folder paths at first paint. Defaults to none. */
  readonly defaultExpanded?: Iterable<string>;
  /** The selected file path. Absence paints no selection. */
  readonly selected?: string | null;
  /** A press or Enter on a file row, after the row becomes the tab stop. */
  readonly onSelect?: (path: string) => void;
  /** Reports the open paths, sorted, after every change. */
  readonly onExpandedChange?: (expanded: ReadonlyArray<string>) => void;
  /** The folders and files, in paint order. */
  readonly children?: ReactNode;
  /** A definite height. The rows scroll inside it; omit it to lay out naturally. */
  readonly height?: number;
  readonly className?: string;
  /** The tree's test id. Each row is `${testId}-row-${path}`. */
  readonly testId?: string;
}

/** {@link FileTreeFolder} props. */
export interface FileTreeFolderProps {
  /** The folder's stable path, and the key its expansion is stored by. */
  readonly path: string;
  /** The leaf name the row paints and type-ahead matches. */
  readonly name: string;
  /** The folder's entries, in paint order. */
  readonly children?: ReactNode;
}

/** {@link FileTreeFile} props. */
export interface FileTreeFileProps {
  /** The file's stable path, and what {@link FileTreeProps.onSelect} reports. */
  readonly path: string;
  /** The leaf name the row paints and type-ahead matches. */
  readonly name: string;
  /** A glyph that overrides the one the file's kind picks. */
  readonly icon?: IconName;
  /**
   * A custom row after the guides and chevron slot. A file with this slot
   * supplies its own {@link FileTreeIcon}, {@link FileTreeName} and actions; the
   * default row is the kind's glyph and the name.
   */
  readonly children?: ReactNode;
}

/** {@link FileTreeIcon} props. */
export interface FileTreeIconProps {
  /** The glyph to paint. A `children` slot wins when `name` is absent. */
  readonly name?: IconName;
  /** Paint the glyph in the selected row's ink. */
  readonly selected?: boolean;
  /** A custom glyph, painted in an icon-sized box. */
  readonly children?: ReactNode;
}

/** {@link FileTreeName} props. */
export interface FileTreeNameProps {
  /** Paint the name in the selected row's ink. */
  readonly selected?: boolean;
  /** The name. */
  readonly children?: ReactNode;
}

/** Whether a part is being rendered at all, so a declaration outside a tree fails. */
const Declared = createContext(false);

/** The name a part is called in a rejection. */
const nameOf = (type: unknown): string =>
  typeof type === "function" && type.name !== "" ? type.name : "element";

/** Reject a part rendered outside the tree that reads it. */
const useDeclared = (part: string): void => {
  if (!useContext(Declared)) {
    throw new Error(`${part} must be used inside FileTree.`);
  }
};

/**
 * A folder row. The root reads its `path`, `name` and children; it paints the
 * row itself, so this part renders nothing.
 */
export const FileTreeFolder = (_props: FileTreeFolderProps): null => {
  useDeclared("FileTreeFolder");
  return null;
};

/**
 * A file row. The root reads its `path`, `name`, `icon` and custom row; it
 * paints the row itself, so this part renders nothing.
 */
export const FileTreeFile = (_props: FileTreeFileProps): null => {
  useDeclared("FileTreeFile");
  return null;
};

/** A row's icon slot: the default glyph, or a caller's own. */
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

/** A row's name slot: one truncated line in the theme's sans role. */
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

/** The parts' declared tree and the custom rows a file supplied. */
interface DeclaredTree {
  readonly nodes: ReadonlyArray<FileNode>;
  readonly content: ReadonlyMap<string, ReactNode>;
}

/** Read the parts' props into the pure tree model. */
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

/** A folder is a node with a children list, even an empty one. */
const kindOf = (node: FileNode): FileKind =>
  node.children === undefined ? fileKindOf(node.name, false) : "folder";

/** The glyph a row paints: the file's override, else the kind's own. */
const glyphOf = (node: FileNode, expanded: boolean): IconName =>
  node.icon ?? fileIcon(kindOf(node), expanded);

/** {@link FileTreeRow} props. */
interface FileTreeRowProps {
  readonly row: TreeRow<FileNode>;
  readonly selected: boolean;
  readonly tabbable: boolean;
  readonly content: ReactNode;
  readonly testId: string | undefined;
  /** The row has just arrived and folds in from nothing. */
  readonly entering: boolean;
  /** The row's branch closed; it paints only for its exit tween. */
  readonly leaving: boolean;
  readonly timing: PresenceTiming;
  readonly onPress: () => void;
  readonly onKeyDown: (event: EventPayload) => void;
  readonly attach?: (instance: PublicInstance | null) => void;
}

/**
 * How long a fold waits before its rows travel.
 *
 * The disclosure's glyph swaps in the frame it is pressed, so the fold starts a
 * beat later and reads as the branch following the chevron. It is also the
 * delay the exit's mount window counts.
 */
const FOLD_LEAD_MS = 20;

/** One painted row: guides, the chevron slot, the glyph, the name. */
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

/** The rows a branch change is moving: those folding out, and those folding in. */
type Fold = Option.Option<{
  readonly leaving: ReadonlyArray<TreeRow<FileNode>>;
  readonly before: ReadonlyArray<TreeRow<FileNode>>;
  readonly entering: HashSet.HashSet<string>;
}>;

/**
 * A file tree: folders that open, one selected file, guide lines and a glyph
 * per kind.
 *
 * A press on a folder toggles **only that folder's** subtree; a press on a file
 * selects it and reports it once through `onSelect`. The tree holds one tab
 * stop — the selected file while it paints, else the first row — and the arrow
 * keys walk the visible rows, with Right opening and Left closing a folder.
 */
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

  // A closed branch is gone from `visibleFileRows` in the frame its cursor
  // changes, so its rows are handed to `paintedRows` with the order they stood
  // in and kept for the exit window. The fold is decided while the rows change
  // render, before React commits, so the branch paints its exit instead of
  // unmounting for a frame and growing back. A reduced run has no window: the
  // rows are absent at once, which is the snap the preference asks for.
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

  // A selection the caller changes waits for the row to paint, then moves the
  // tab stop without taking focus. The flag is a *reaction to the prop*, not a
  // rule that drags the cursor back after every arrow key; a selection hidden
  // inside a closed folder stays pending until its folder opens.
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
