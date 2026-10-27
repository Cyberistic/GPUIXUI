/**
 * The file tree's pure half: what a path is, how it nests, and the glyph a row
 * paints.
 *
 * A file tree is the generic `@gpuixui/data` tree with a **kind** — a folder, a
 * source file, an image, a data file, a config file — so a row can paint the
 * right glyph. {@link buildFileTree} turns a flat list of `/`-separated paths
 * into the nested {@link FileNode} tree the generic controller flattens;
 * {@link fileKindOf} and {@link fileIcon} answer the glyph. Expansion, the
 * cursor, type-ahead and the keyboard stay the generic tree's rules
 * (`@gpuixui/data`), which this package reuses rather than re-implements.
 */

import {
  findRow,
  flattenTree,
  type TreeRow,
  type TreeSpec,
} from "@gpuixui/data";
import type { IconName } from "@gpuixui/icons";
import { Result, pipe } from "effect";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Str from "effect/String";

/** What a file tree distinguishes, for the glyph a row paints. */
export type FileKind = "folder" | "file" | "image" | "code" | "data" | "config";

/** One node of a file tree: a name, a path, and children when it is a folder. */
export interface FileNode {
  /** The leaf name, without its ancestors. */
  readonly name: string;
  /** The full `/`-joined path, stable across the tree. */
  readonly path: string;
  /** The folder's children, in paint order. Absent on a file. */
  readonly children?: ReadonlyArray<FileNode>;
  /** A glyph that overrides the kind's own — `FileTreeFile`'s `icon` slot. */
  readonly icon?: IconName;
}

/** Extensions painted as an image glyph. */
const IMAGE_EXTENSIONS: ReadonlyArray<string> = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "ico",
];

/** Extensions painted as a source glyph. */
const CODE_EXTENSIONS: ReadonlyArray<string> = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "c",
  "h",
  "cpp",
  "hpp",
  "css",
  "html",
  "sh",
];

/** Extensions painted as a config glyph. */
const CONFIG_EXTENSIONS: ReadonlyArray<string> = [
  "json",
  "yaml",
  "yml",
  "toml",
  "ini",
  "env",
  "lock",
  "gitignore",
];

/** Extensions painted as a data glyph. */
const DATA_EXTENSIONS: ReadonlyArray<string> = ["csv", "sql", "db", "sqlite"];

/** The extension after the last dot, or `None` when the name has no dot. */
const extensionOf = (name: string): Option.Option<string> => {
  const segments = Str.split(".")(name);
  return segments.length > 1
    ? Option.map(Arr.last(segments), Str.toLowerCase)
    : Option.none();
};

/**
 * Classify a file or folder by its name.
 *
 * A directory is always `folder`; a file's kind comes from its extension, with
 * `file` the fallback an unknown or extension-less name lands on.
 */
export const fileKindOf = (name: string, isDirectory: boolean): FileKind => {
  if (isDirectory) return "folder";
  const extension = Option.getOrElse(extensionOf(name), () => "");
  if (Arr.contains(IMAGE_EXTENSIONS, extension)) return "image";
  if (Arr.contains(CODE_EXTENSIONS, extension)) return "code";
  if (Arr.contains(CONFIG_EXTENSIONS, extension)) return "config";
  if (Arr.contains(DATA_EXTENSIONS, extension)) return "data";
  return "file";
};

/** The glyph a kind paints; an open folder paints the open glyph. */
export const fileIcon = (kind: FileKind, expanded: boolean): IconName =>
  kind === "folder"
    ? expanded
      ? "folder-open"
      : "folder"
    : kind === "image"
      ? "image"
      : kind === "code"
        ? "code"
        : kind === "config"
          ? "settings"
          : kind === "data"
            ? "database"
            : "file";

/** A path into its non-empty segments, failing on a blank path. */
const toSegments = (
  path: string,
): Result.Result<ReadonlyArray<string>, void> => {
  const segments = Arr.filter(Str.split("/")(path), Str.isNonEmpty);
  return Arr.isReadonlyArrayNonEmpty(segments)
    ? Result.succeed(segments)
    : Result.failVoid;
};

/** The segments after the first, failing when a path is a single segment. */
const nonEmptyTail = (
  segments: ReadonlyArray<string>,
): Result.Result<ReadonlyArray<string>, void> =>
  Option.match(Arr.tail(segments), {
    onNone: () => Result.failVoid,
    onSome: (rest) =>
      Arr.isReadonlyArrayNonEmpty(rest)
        ? Result.succeed(rest)
        : Result.failVoid,
  });

/** Folders first, then by name — the order a file tree reads. */
const byFolderThenName: Order.Order<FileNode> = Order.combine(
  Order.mapInput(Order.Number, (node: FileNode) =>
    node.children === undefined ? 1 : 0,
  ),
  Order.mapInput(Order.String, (node: FileNode) => node.name),
);

const sortNodes = (nodes: ReadonlyArray<FileNode>): ReadonlyArray<FileNode> =>
  Arr.sort(nodes, byFolderThenName);

const build = (
  prefix: ReadonlyArray<string>,
  paths: ReadonlyArray<ReadonlyArray<string>>,
): ReadonlyArray<FileNode> =>
  pipe(
    Arr.groupBy(paths, (segments) =>
      Option.getOrElse(Arr.head(segments), () => ""),
    ),
    R.toEntries,
    Arr.map(([name, members]) => {
      const path = Arr.join([...prefix, name], "/");
      const children = sortNodes(
        build([...prefix, name], Arr.filterMap(members, nonEmptyTail)),
      );
      return Arr.isReadonlyArrayNonEmpty(children)
        ? { name, path, children }
        : { name, path };
    }),
    sortNodes,
  );

/**
 * A nested file tree from a flat list of `/`-separated paths.
 *
 * A path that has descendants is a folder, even when it also appears bare
 * (`"src"` beside `"src/a.ts"`), and a duplicated path paints one node. The
 * result is sorted folders-first, then by name, so the same input always
 * answers the same tree.
 */
export const buildFileTree = (
  paths: ReadonlyArray<string>,
): ReadonlyArray<FileNode> => build([], Arr.filterMap(paths, toSegments));

/** The hierarchy the generic tree walks: a node's path is its key. */
export const fileTreeSpec: TreeSpec<FileNode> = {
  keyOf: (node) => node.path,
  childrenOf: (node) => node.children ?? [],
};

/**
 * The rows a reader can see, from the open folder paths.
 *
 * A stored expansion is read by the caller (`expandedSet`) before it reaches
 * this walk, so a list that is not a list never opens a row.
 */
export const visibleFileRows = (
  roots: ReadonlyArray<FileNode>,
  expanded: Iterable<string>,
): ReadonlyArray<TreeRow<FileNode>> =>
  flattenTree(roots, fileTreeSpec, HashSet.fromIterable(expanded));

/**
 * The row the tab stop sits on: the selected file while it paints, else the
 * first visible row. A selection hidden inside a closed folder is not a tab
 * stop, because the keyboard cannot stand on a row that is not painted.
 */
export const fileTreeTab = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  selected: string | undefined,
): Option.Option<TreeRow<T>> =>
  Option.orElse(findRow(rows, Option.fromNullishOr(selected)), () =>
    Arr.head(rows),
  );

/** The open paths as a stable, store-friendly list: sorted, one copy each. */
export const fileTreePaths = (
  expanded: Iterable<string>,
): ReadonlyArray<string> =>
  Arr.sort(Arr.fromIterable(HashSet.fromIterable(expanded)), Order.String);
