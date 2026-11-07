import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { entryPoints, parseManifest } from "./public-api.ts";
import {
  buildSymbolIndex,
  isComponentName,
  isHookName,
  type PublicSymbol,
  type PublicSymbolIndex,
  type PublicSymbolKind,
  type PublishedModule,
  type WorkspacePackage,
} from "./public-symbols.ts";

export const repoRoot = fileURLToPath(
  new URL("../../../../", import.meta.url),
).replace(/\/$/, "");

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

interface WorkspaceEntry {
  readonly pkg: WorkspacePackage;

  readonly entries: ReadonlyArray<{
    readonly specifier: string;
    readonly target: string;
    readonly pattern: boolean;
  }>;
}

export const readWorkspace = (root: string): ReadonlyArray<WorkspaceEntry> => {
  const packagesDir = join(root, "packages");
  if (!existsSync(packagesDir)) return [];

  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry): ReadonlyArray<WorkspaceEntry> => {
      const manifestPath = join(packagesDir, entry.name, "package.json");
      if (!existsSync(manifestPath)) return [];
      const manifest = parseManifest(
        JSON.parse(readFileSync(manifestPath, "utf8")),
      );
      if (manifest === undefined) return [];
      const entries = entryPoints(manifest);
      if (entries.length === 0) return [];
      return [
        {
          pkg: {
            dir: entry.name,
            name: manifest.name,
            description: manifest.description,
          },
          entries: entries.map((entry) => ({
            specifier: entry.specifier,
            target: entry.target,
            pattern: entry.pattern,
          })),
        },
      ];
    });
};

const sourceOf = (
  root: string,
  pkgDir: string,
  target: string,
): string | undefined => {
  const path = target.replace(/^\.\//, "");
  const candidates = path.startsWith("dist/")
    ? [
        `src/${path.slice("dist/".length).replace(/\.js$/, "")}.ts`,
        `src/${path.slice("dist/".length).replace(/\.js$/, "")}.tsx`,
      ]
    : [path.replace(/\.js$/, ".ts"), path.replace(/\.js$/, ".tsx"), path];

  return candidates
    .map((candidate) => join(root, "packages", pkgDir, candidate))
    .find((candidate) => existsSync(candidate));
};

const patternFiles = (
  root: string,
  pkgDir: string,
  target: string,
): ReadonlyArray<string> => {
  const [directory = "", suffix = ""] = target.replace(/^\.\//, "").split("*");
  const absolute = join(root, "packages", pkgDir, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute)
    .filter((name) => name.endsWith(suffix) && !name.includes(".test."))
    .map((name) => join(absolute, name));
};

const skipQuoted = (source: string, index: number, quote: string): number => {
  let cursor = index + 1;
  while (cursor < source.length) {
    const char = source[cursor] ?? "";
    if (char === "\\") {
      cursor += 2;
      continue;
    }
    if (char === quote) return cursor + 1;
    cursor += 1;
  }
  return source.length;
};

const skipSubstitution = (source: string, index: number): number => {
  let cursor = index;
  let depth = 1;
  while (cursor < source.length && depth > 0) {
    const char = source[cursor] ?? "";
    if (char === "{") {
      depth += 1;
      cursor += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      cursor += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      cursor = skipQuoted(source, cursor, char);
      continue;
    }
    if (char === "`") {
      cursor = skipTemplate(source, cursor);
      continue;
    }
    cursor += 1;
  }
  return cursor;
};

const skipTemplate = (source: string, index: number): number => {
  let cursor = index + 1;
  while (cursor < source.length) {
    const char = source[cursor] ?? "";
    if (char === "\\") {
      cursor += 2;
      continue;
    }
    if (char === "`") return cursor + 1;
    if (char === "$" && source[cursor + 1] === "{") {
      cursor = skipSubstitution(source, cursor + 2);
      continue;
    }
    cursor += 1;
  }
  return source.length;
};

interface ScannedExport {
  readonly text: string;

  readonly doc: string;
}

const atLineStart = (source: string, index: number): boolean => {
  let cursor = index - 1;
  while (cursor >= 0) {
    const char = source[cursor];
    if (char === "\n") return true;
    if (char !== " " && char !== "\t" && char !== "\r") return false;
    cursor -= 1;
  }
  return true;
};

const REGEX_KEYWORDS = new Set([
  "await",
  "case",
  "delete",
  "do",
  "else",
  "in",
  "instanceof",
  "new",
  "of",
  "return",
  "typeof",
  "void",
  "yield",
]);

const isWordChar = (char: string | undefined): boolean =>
  char !== undefined && /[A-Za-z0-9_$]/.test(char);

const isRegexStart = (source: string, index: number): boolean => {
  let cursor = index - 1;
  while (cursor >= 0) {
    const char = source[cursor];
    if (
      char === undefined ||
      char === " " ||
      char === "\t" ||
      char === "\n" ||
      char === "\r"
    ) {
      cursor -= 1;
      continue;
    }

    if (isWordChar(char)) {
      let start = cursor;
      while (isWordChar(source[start - 1])) start -= 1;
      return REGEX_KEYWORDS.has(source.slice(start, cursor + 1));
    }
    if (/[)\]}]/.test(char)) return false;

    if (char === "<" || char === ">") return false;
    return true;
  }
  return true;
};

const skipRegex = (source: string, index: number): number => {
  let cursor = index + 1;
  let inClass = false;
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === "\\") {
      cursor += 2;
      continue;
    }
    if (char === "[") {
      inClass = true;
      cursor += 1;
      continue;
    }
    if (char === "]") {
      inClass = false;
      cursor += 1;
      continue;
    }
    if (char === "/" && !inClass) {
      cursor += 1;
      while (cursor < source.length && /[a-z]/.test(source[cursor] ?? "")) {
        cursor += 1;
      }
      return cursor;
    }
    cursor += 1;
  }
  return source.length;
};

const isJsxStart = (source: string, index: number): boolean => {
  const next = source[index + 1];
  if (next === undefined) return false;

  if (next === "/") return true;

  if (next === ">") return true;
  if (!/[A-Za-z_$]/.test(next)) return false;

  let before = index - 1;
  while (before >= 0) {
    const char = source[before];
    if (
      char === undefined ||
      char === " " ||
      char === "\t" ||
      char === "\n" ||
      char === "\r"
    ) {
      before -= 1;
      continue;
    }
    if (/[A-Za-z0-9_$>]/.test(char)) return false;
    break;
  }

  const close = tagEnd(source, index);
  if (close === -1) return false;
  const after = source.slice(close + 1).match(/^\s*(.)/)?.[1];

  if (after === "(") return false;
  if (after !== undefined && ";,)=".includes(after)) return false;
  if (after === undefined) return false;
  return true;
};

const tagEnd = (source: string, index: number): number => {
  let cursor = index + 1;
  while (cursor < source.length) {
    const char = source[cursor];
    const next = source[cursor + 1];
    if (char === "/" && next === "/") {
      while (cursor < source.length && source[cursor] !== "\n") cursor += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const close = source.indexOf("*/", cursor + 2);
      cursor = close === -1 ? source.length : close + 2;
      continue;
    }
    if (char === "{") {
      cursor = skipBalanced(source, cursor);
      continue;
    }
    if (char === '"' || char === "'") {
      cursor = skipQuoted(source, cursor, char);
      continue;
    }
    if (char === "`") {
      cursor = skipTemplate(source, cursor);
      continue;
    }
    if (char === ">") return cursor;
    cursor += 1;
  }
  return -1;
};

const skipJsx = (source: string, index: number): number => {
  let cursor = index;

  const open: string[] = [];
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === "{") {
      cursor = skipBalanced(source, cursor);
      continue;
    }
    if (char === "<") {
      const close = tagEnd(source, cursor);
      if (close === -1) return source.length;
      const body = source.slice(cursor + 1, close);
      const name = /^\/?([A-Za-z_$][\w.$]*)/.exec(body)?.[1];
      if (body.startsWith("/")) {
        open.pop();
        cursor = close + 1;
        if (open.length === 0) return cursor;
        continue;
      }
      if (body.trimEnd().endsWith("/")) {
        cursor = close + 1;
        if (open.length === 0) return cursor;
        continue;
      }
      if (name !== undefined) open.push(name);
      cursor = close + 1;
      continue;
    }
    cursor += 1;
  }
  return source.length;
};

const skipBalanced = (source: string, index: number): number => {
  const open = source[index];
  const close =
    open === "{" ? "}" : open === "[" ? "]" : open === "(" ? ")" : "";
  if (close === "") return index + 1;
  let depth = 0;
  let cursor = index;
  while (cursor < source.length) {
    const char = source[cursor];
    const next = source[cursor + 1];
    if (char === "/" && next === "/") {
      while (cursor < source.length && source[cursor] !== "\n") cursor += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const close = source.indexOf("*/", cursor + 2);
      cursor = close === -1 ? source.length : close + 2;
      continue;
    }
    if (char === '"' || char === "'") {
      cursor = skipQuoted(source, cursor, char);
      continue;
    }
    if (char === "`") {
      cursor = skipTemplate(source, cursor);
      continue;
    }
    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return cursor + 1;
    }
    cursor += 1;
  }
  return source.length;
};

const nextCode = (source: string, index: number): string => {
  let cursor = index;
  while (cursor < source.length) {
    const char = source[cursor] ?? "";
    const next = source[cursor + 1] ?? "";
    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      cursor += 1;
      continue;
    }
    if (char === "/" && next === "/") {
      while (cursor < source.length && source[cursor] !== "\n") cursor += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const close = source.indexOf("*/", cursor + 2);
      cursor = close === -1 ? source.length : close + 2;
      continue;
    }
    return source.slice(cursor);
  }
  return "";
};

export const scanExports = (source: string): ReadonlyArray<ScannedExport> => {
  const found: ScannedExport[] = [];
  let index = 0;
  let start = -1;
  let doc = "";
  let pendingDoc = "";

  let open = 0;

  while (index < source.length) {
    const char = source[index] ?? "";
    const next = source[index + 1] ?? "";

    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      const close = source.indexOf("*/", index + 2);
      const end = close === -1 ? source.length : close + 2;
      const text = source.slice(index, end);
      if (text.startsWith("/**") && text.length > 4) {
        pendingDoc = text.slice(3, text.endsWith("*/") ? -2 : undefined);
      }
      index = end;
      continue;
    }

    if (char === '"' || char === "'") {
      index = skipQuoted(source, index, char);
      continue;
    }

    if (char === "`") {
      index = skipTemplate(source, index);
      continue;
    }

    if (char === "<") {
      const isJsx = isJsxStart(source, index);
      if (isJsx) {
        index = skipJsx(source, index);
        continue;
      }
    }

    if (char === "/" && isRegexStart(source, index)) {
      index = skipRegex(source, index);
      continue;
    }

    if (char === "(" || char === "[" || char === "{") open += 1;
    if (char === ")" || char === "]" || char === "}") open -= 1;
    if (start < 0) {
      const isExport =
        char === "e" &&
        source.startsWith("export", index) &&
        atLineStart(source, index);
      if (isExport) {
        start = index;
        doc = pendingDoc;
      } else if (char.trim() !== "") {
        pendingDoc = "";
      }
      index += 1;
      continue;
    }

    const endsAtSemicolon = char === ";" && open === 0;
    const endsAtBrace = char === "}" && open === 0;
    if (!endsAtSemicolon && !endsAtBrace) {
      index += 1;
      continue;
    }

    const after = nextCode(source, index + 1);
    if (endsAtBrace && (after.startsWith(",") || /^from\s/.test(after))) {
      index += 1;
      continue;
    }

    found.push({ text: source.slice(start, index + 1).trim(), doc });
    start = -1;
    doc = "";
    pendingDoc = "";
    index += 1;
  }

  return found;
};

interface NamedExport {
  readonly exported: string;

  readonly local: string;

  readonly typeOnly: boolean;
}

type ParsedExport =
  | { readonly type: "star"; readonly module: string }
  | {
      readonly type: "namespace";
      readonly name: string;
      readonly module: string;
    }
  | {
      readonly type: "named";
      readonly names: ReadonlyArray<NamedExport>;
      readonly module: string | undefined;
    }
  | {
      readonly type: "declaration";
      readonly names: ReadonlyArray<{
        readonly name: string;
        readonly kind: PublicSymbolKind;
      }>;
    };

const declarationKind = (
  name: string,
  initializer: string,
): PublicSymbolKind => {
  if (isHookName(name)) return "hook";
  const value = initializer.trim();
  const isFunction =
    value.startsWith("(") ||
    value.startsWith("<") ||
    value.startsWith("async") ||
    value.startsWith("function") ||
    value.startsWith("forwardRef");
  if (!isFunction) return "constant";
  return isComponentName(name) ? "component" : "function";
};

const assignmentOf = (text: string): number => {
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char !== "=") continue;
    const next = text[index + 1] ?? "";
    const previous = text[index - 1] ?? "";
    if (
      next === "=" ||
      previous === "=" ||
      previous === "!" ||
      previous === "<" ||
      previous === ">"
    ) {
      continue;
    }
    if (next === ">") continue;
    return index;
  }
  return -1;
};

const declarators = (text: string): ReadonlyArray<string> => {
  const body = text.replace(/^export\s+(?:const|let|var)\s+/, "");
  const parts: string[] = [];
  let depth = 0;
  let angle = 0;
  let current = "";
  let assigned = false;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index] ?? "";
    const next = body[index + 1] ?? "";
    if (char === "<" && next !== "=") angle += 1;
    else if (char === ">" && next !== "=" && angle > 0) angle -= 1;
    else if (char === "(" || char === "[" || char === "{") depth += 1;
    else if (char === ")" || char === "]" || char === "}") depth -= 1;

    if (char === "=" && next !== "=" && depth === 0 && angle === 0) {
      assigned = true;
    }
    if (char === "," && depth === 0 && angle === 0 && !assigned) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part !== "");
};

const variableNames = (text: string): ParsedExport => {
  const names = declarators(text).flatMap((declarator) => {
    const name = /^([A-Za-z_$][\w$]*)/.exec(declarator)?.[1];
    if (name === undefined) return [];
    const equals = assignmentOf(declarator);
    return [
      {
        name,
        kind: declarationKind(
          name,
          equals === -1 ? "" : declarator.slice(equals + 1),
        ),
      },
    ];
  });
  return { type: "declaration", names };
};

const namedExports = (list: string): ReadonlyArray<NamedExport> =>
  list
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .map((entry) => {
      const typeOnly = entry.startsWith("type ");
      const withoutType = typeOnly ? entry.slice("type ".length) : entry;
      const [local = "", exported = local] = withoutType
        .split(/\s+as\s+/)
        .map((part) => part.trim());
      return { exported, local, typeOnly };
    });

export const parseExport = (raw: string): ParsedExport | undefined => {
  const text = raw.replace(/;\s*$/, "");
  const namespace =
    /^export\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["']$/.exec(
      text,
    );
  if (namespace !== null) {
    return {
      type: "namespace",
      name: namespace[1] ?? "",
      module: namespace[2] ?? "",
    };
  }

  const star = /^export\s+\*\s+from\s+["']([^"']+)["']$/.exec(text);
  if (star !== null) return { type: "star", module: star[1] ?? "" };

  const named =
    /^export\s+(type\s+)?\{([\s\S]*?)\}\s*(?:from\s+["']([^"']+)["'])?$/.exec(
      text,
    );
  if (named !== null) {
    return {
      type: "named",
      names: namedExports(named[2] ?? ""),
      module: named[3],
    };
  }

  if (/^export\s+type\s+[A-Za-z_$]/.test(text)) {
    const name = /^export\s+type\s+([A-Za-z_$][\w$]*)/.exec(text)?.[1];
    return name === undefined
      ? undefined
      : { type: "declaration", names: [{ name, kind: "type" }] };
  }

  if (/^export\s+interface\s/.test(text)) {
    const name = /^export\s+interface\s+([A-Za-z_$][\w$]*)/.exec(text)?.[1];
    return name === undefined
      ? undefined
      : { type: "declaration", names: [{ name, kind: "interface" }] };
  }

  if (/^export\s+(?:const\s+)?enum\s/.test(text)) {
    const name = /^export\s+(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/.exec(
      text,
    )?.[1];
    return name === undefined
      ? undefined
      : { type: "declaration", names: [{ name, kind: "enum" }] };
  }

  if (/^export\s+(?:declare\s+)?namespace\s/.test(text)) {
    const name = /^export\s+(?:declare\s+)?namespace\s+([A-Za-z_$][\w$]*)/.exec(
      text,
    )?.[1];
    return name === undefined
      ? undefined
      : { type: "declaration", names: [{ name, kind: "namespace" }] };
  }

  if (/^export\s+(?:abstract\s+)?class\s/.test(text)) {
    const name = /^export\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/.exec(
      text,
    )?.[1];
    return name === undefined
      ? undefined
      : { type: "declaration", names: [{ name, kind: "class" }] };
  }

  if (/^export\s+(?:async\s+)?function\s/.test(text)) {
    const name =
      /^export\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/.exec(
        text,
      )?.[1];
    if (name === undefined) return undefined;
    const kind = isHookName(name)
      ? "hook"
      : isComponentName(name)
        ? "component"
        : "function";
    return { type: "declaration", names: [{ name, kind }] };
  }

  if (/^export\s+(?:const|let|var)\s/.test(text)) return variableNames(text);

  if (/^export\s+default\s/.test(text)) {
    return {
      type: "declaration",
      names: [{ name: "default", kind: "constant" }],
    };
  }

  return undefined;
};

const summaryOf = (doc: string): string => {
  const text = doc
    .replace(/^\s*\*\s?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text === "") return "";
  const end = text.indexOf(". ");
  return end === -1 ? text : text.slice(0, end + 1);
};

export const createSymbolReader = (root: string) => {
  const sources = new Map<string, string | undefined>();
  const exports = new Map<string, ReadonlyArray<PublicSymbol>>();
  const visiting = new Set<string>();

  const read = (path: string): string | undefined => {
    if (sources.has(path)) return sources.get(path);
    const absolute = join(root, path);
    const source = existsSync(absolute)
      ? readFileSync(absolute, "utf8")
      : undefined;
    sources.set(path, source);
    return source;
  };

  const resolve = (from: string, specifier: string): string | undefined => {
    const containing = join(root, from);
    const candidates = specifier.startsWith(".")
      ? relativeCandidates(root, containing, specifier)
      : workspaceCandidates(root, specifier);
    return candidates.find((candidate) => existsSync(join(root, candidate)));
  };

  const symbolsOf = (path: string): ReadonlyArray<PublicSymbol> => {
    const cached = exports.get(path);
    if (cached !== undefined) return cached;
    if (visiting.has(path)) return [];
    visiting.add(path);

    const source = read(path);
    const found = new Map<string, PublicSymbol>();

    if (source !== undefined) {
      scanExports(source).forEach((scanned) => {
        const parsed = parseExport(scanned.text);
        if (parsed === undefined) return;

        if (parsed.type === "declaration") {
          parsed.names.forEach((name) => {
            found.set(name.name, {
              name: name.name,
              kind: name.kind,
              module: path,
              summary: summaryOf(scanned.doc),
            });
          });
          return;
        }

        if (parsed.type === "star") {
          const target = resolve(path, parsed.module);
          if (target === undefined) return;
          symbolsOf(target).forEach((symbol) => {
            if (!found.has(symbol.name)) found.set(symbol.name, symbol);
          });
          return;
        }

        if (parsed.type === "namespace") {
          const target = resolve(path, parsed.module);
          found.set(parsed.name, {
            name: parsed.name,
            kind: "namespace",
            module: target ?? path,
            summary: summaryOf(scanned.doc),
          });
          return;
        }

        parsed.names.forEach((name) => {
          const from =
            parsed.module === undefined
              ? undefined
              : resolve(path, parsed.module);
          if (from === undefined) {
            found.set(name.exported, {
              name: name.exported,
              kind: "external",
              module: path,
              summary: summaryOf(scanned.doc),
            });
            return;
          }
          const source2 = symbolsOf(from).find(
            (symbol) => symbol.name === name.local,
          );
          found.set(name.exported, {
            name: name.exported,
            kind: source2?.kind ?? "external",
            module: source2?.module ?? from,
            summary: source2?.summary ?? summaryOf(scanned.doc),
          });
        });
      });
    }

    const symbols = [...found.values()];
    visiting.delete(path);
    exports.set(path, symbols);
    return symbols;
  };

  return { symbolsOf };
};

const relativeCandidates = (
  root: string,
  from: string,
  specifier: string,
): ReadonlyArray<string> => {
  const directory = join(from, "..");
  const base = specifier.replace(/^\.\//, "").replace(/\.js$/, "");
  return [
    join(directory, `${base}.ts`),
    join(directory, `${base}.tsx`),
    join(directory, base, "index.ts"),
    join(directory, base, "index.tsx"),
  ].map((candidate) => candidate.replace(`${root}/`, ""));
};

const workspaceCandidates = (
  root: string,
  specifier: string,
): ReadonlyArray<string> => {
  const withoutScope = specifier.replace(/^@gpuixui\//, "");
  if (withoutScope === specifier) return [];
  const [dir = "", subpath = ""] = withoutScope.split("/");
  const manifestPath = join(root, "packages", dir, "package.json");
  if (!existsSync(manifestPath)) return [];
  const manifest = parseManifest(
    JSON.parse(readFileSync(manifestPath, "utf8")),
  );
  if (manifest === undefined) return [];
  const key = subpath === "" ? "." : `./${subpath}`;
  const target = manifest.exports[key];
  const conditions = isRecord(target) ? target : undefined;
  const path =
    typeof target === "string"
      ? target
      : conditions === undefined
        ? undefined
        : (conditions["default"] ??
          conditions["import"] ??
          conditions["types"]);
  if (typeof path !== "string") return [];
  return [path.replace(/^\.\//, "").replace(/\.js$/, ".ts")].map((candidate) =>
    join("packages", dir, candidate),
  );
};

export const readPublishedModules = (
  root: string,
): ReadonlyArray<PublishedModule> => {
  const workspace = readWorkspace(root);
  const reader = createSymbolReader(root);

  return workspace.flatMap(({ pkg, entries }) =>
    entries.flatMap((entry): ReadonlyArray<PublishedModule> => {
      if (entry.pattern) {
        return patternFiles(root, pkg.dir, entry.target).map((file) => {
          const module = file.slice(root.length + 1);
          const base = file.split("/").pop() ?? "";
          return {
            specifier: `${pkg.name}/${base.replace(/\.tsx?$/, "")}`,
            packageName: pkg.name,
            module,
            symbols: reader.symbolsOf(module),
          };
        });
      }

      const source = sourceOf(root, pkg.dir, entry.target);
      if (source === undefined) return [];
      const module = source.slice(root.length + 1);
      return [
        {
          specifier: entry.specifier,
          packageName: pkg.name,
          module,
          symbols: reader.symbolsOf(module),
        },
      ];
    }),
  );
};

export const buildWorkspaceSymbolIndex = (root: string): PublicSymbolIndex =>
  buildSymbolIndex(
    readWorkspace(root).map(({ pkg }) => pkg),
    readPublishedModules(root),
  );
