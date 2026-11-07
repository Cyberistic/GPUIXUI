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

export type FileKind = "folder" | "file" | "image" | "code" | "data" | "config";

export interface FileNode {
  readonly name: string;

  readonly path: string;

  readonly children?: ReadonlyArray<FileNode>;

  readonly icon?: IconName;
}

const IMAGE_EXTENSIONS: ReadonlyArray<string> = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "ico",
];

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

const DATA_EXTENSIONS: ReadonlyArray<string> = ["csv", "sql", "db", "sqlite"];

const extensionOf = (name: string): Option.Option<string> => {
  const segments = Str.split(".")(name);
  return segments.length > 1
    ? Option.map(Arr.last(segments), Str.toLowerCase)
    : Option.none();
};

export const fileKindOf = (name: string, isDirectory: boolean): FileKind => {
  if (isDirectory) return "folder";
  const extension = Option.getOrElse(extensionOf(name), () => "");
  if (Arr.contains(IMAGE_EXTENSIONS, extension)) return "image";
  if (Arr.contains(CODE_EXTENSIONS, extension)) return "code";
  if (Arr.contains(CONFIG_EXTENSIONS, extension)) return "config";
  if (Arr.contains(DATA_EXTENSIONS, extension)) return "data";
  return "file";
};

export const fileIcon = (kind: FileKind, _expanded: boolean): IconName =>
  kind === "folder" ? "folder" : "file";

const toSegments = (
  path: string,
): Result.Result<ReadonlyArray<string>, void> => {
  const segments = Arr.filter(Str.split("/")(path), Str.isNonEmpty);
  return Arr.isReadonlyArrayNonEmpty(segments)
    ? Result.succeed(segments)
    : Result.failVoid;
};

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

export const buildFileTree = (
  paths: ReadonlyArray<string>,
): ReadonlyArray<FileNode> => build([], Arr.filterMap(paths, toSegments));

export const fileTreeSpec: TreeSpec<FileNode> = {
  keyOf: (node) => node.path,
  childrenOf: (node) => node.children ?? [],
};

export const visibleFileRows = (
  roots: ReadonlyArray<FileNode>,
  expanded: Iterable<string>,
): ReadonlyArray<TreeRow<FileNode>> =>
  flattenTree(roots, fileTreeSpec, HashSet.fromIterable(expanded));

export const fileTreeTab = <T>(
  rows: ReadonlyArray<TreeRow<T>>,
  selected: string | undefined,
): Option.Option<TreeRow<T>> =>
  Option.orElse(findRow(rows, Option.fromNullishOr(selected)), () =>
    Arr.head(rows),
  );

export const fileTreePaths = (
  expanded: Iterable<string>,
): ReadonlyArray<string> =>
  Arr.sort(Arr.fromIterable(HashSet.fromIterable(expanded)), Order.String);
