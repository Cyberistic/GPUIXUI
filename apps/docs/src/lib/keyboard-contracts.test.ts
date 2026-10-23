import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { packageCollections } from "./collection-routes";
import {
  keyLabels,
  keyboardContracts,
  type KeyLabel,
} from "./keyboard-contracts";
import { readCuratedPages, readPackagePages } from "./page-dependencies-source";
import { servedPages } from "./curated-twins";

/**
 * The keyboard strip is the only place a component page states its keys, so it
 * is held to the component, in both directions: every fixed key the cited
 * modules handle is printed, and nothing is printed that they do not handle.
 * The second half is the one a reader pays for — a page that teaches `Escape`
 * on a surface that never dismisses is worse than no note.
 *
 * The completeness case reads every mounted page's resolved module — the
 * curated page's own `<ComponentSource>` and each package page's component —
 * and requires a contract wherever the module handles a named key, so a
 * component cannot ship with keys and no notes. The predicate table is the
 * shared seam: `@gpuixui/components` decides keys through `internal/key.ts`, and
 * the primitives through `core/keyboard.ts`'s `decideActivation`, `decideMove`,
 * `decideAbsolute` and `core/rating.ts`'s `decideRating`; a component that grows
 * a handler by one of these names is covered without a docs edit.
 *
 * What remains outside this wave is the primitives' `Select` (its keys belong to
 * the runtime's headless list) and a page whose keys are handled by a sink the
 * derivation cannot see; `TODO.md` carries the first.
 */

const root = fileURLToPath(new URL("../../../../", import.meta.url)).replace(
  /\/$/,
  "",
);

const read = (path: string): string => readFileSync(join(root, path), "utf8");

/** The keys a predicate or decision stands for. */
const predicateKeys: Readonly<Record<string, readonly KeyLabel[]>> = {
  isActivation: ["Enter", "Space"],
  activationHandlers: ["Enter", "Space"],
  decideActivation: ["Enter", "Space"],
  decideMove: ["Arrow Up", "Arrow Down", "Arrow Left", "Arrow Right"],
  decideAbsolute: ["Home", "End"],
  decideRating: [
    "Arrow Up",
    "Arrow Down",
    "Arrow Left",
    "Arrow Right",
    "Home",
    "End",
    "Delete",
    "Backspace",
  ],
  isEnter: ["Enter"],
  isDismiss: ["Escape"],
  isTab: ["Tab"],
  isFirst: ["Home"],
  isLast: ["End"],
  isUp: ["Arrow Up", "Ctrl+P"],
  isDown: ["Arrow Down", "Ctrl+N"],
  isLeft: ["Arrow Left"],
  isRight: ["Arrow Right"],
  isPageUp: ["Page Up"],
  isPageDown: ["Page Down"],
  isSelectAll: ["Cmd/Ctrl+A"],
  isMenuKey: ["Shift+F10"],
};

/**
 * A key matched by its literal name. The shape is the one a handler writes —
 * `Match.when("up", …)`, `event.key === "tab"`, or the same comparison against
 * a local `key` (`const key = event.key ?? ""`) — so an unrelated `"up"` string
 * cannot add a key to the contract.
 */
const literalKeys: Readonly<Record<string, KeyLabel>> = {
  up: "Arrow Up",
  down: "Arrow Down",
  left: "Arrow Left",
  right: "Arrow Right",
  home: "Home",
  end: "End",
  escape: "Escape",
  tab: "Tab",
  enter: "Enter",
  space: "Space",
  pageup: "Page Up",
  pagedown: "Page Down",
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every named key a module handles. */
const keysIn = (source: string): ReadonlySet<KeyLabel> => {
  const predicates = Object.entries(predicateKeys).flatMap(
    ([predicate, keys]) =>
      new RegExp(`\\b${predicate}\\b`).test(source) ? keys : [],
  );
  const literals = Object.entries(literalKeys).flatMap(([literal, key]) => {
    const pattern = new RegExp(
      `(?:Match\\.when|(?:event\\.)?key ===|(?:event\\.)?key !==)\\s*\\(?\\s*"${escapeRegExp(literal)}"`,
    );
    return pattern.test(source) ? [key] : [];
  });
  return new Set([...predicates, ...literals]);
};

/** The keys a contract's cited modules handle. */
const derivedKeys = (sources: readonly string[]): ReadonlySet<KeyLabel> =>
  sources.reduce<Set<KeyLabel>>((keys, source) => {
    keysIn(read(source)).forEach((key) => keys.add(key));
    return keys;
  }, new Set());

/** Vocabulary order, so a failure reads like the strip prints. */
const ordered = (keys: ReadonlySet<KeyLabel>): ReadonlyArray<KeyLabel> =>
  keyLabels.filter((key) => keys.has(key));

const difference = (
  left: ReadonlySet<KeyLabel>,
  right: ReadonlySet<KeyLabel>,
): ReadonlyArray<KeyLabel> =>
  ordered(new Set([...left].filter((k) => !right.has(k))));

/** Every URL the site serves, so a strip cannot mount on a 404. */
const mountedPages = (): ReadonlySet<string> => {
  const site = (directory: string, prefix: string): string[] =>
    readdirSync(join(root, directory), { withFileTypes: true }).flatMap(
      (entry) => {
        if (entry.isDirectory())
          return site(`${directory}/${entry.name}`, `${prefix}/${entry.name}`);
        if (!entry.name.endsWith(".mdx")) return [];
        const page = entry.name.replace(/\.mdx$/, "");
        return [page === "index" ? prefix : `${prefix}/${page}`];
      },
    );

  return new Set([
    ...site("apps/docs/content/docs", "/docs"),
    ...packageCollections.flatMap((collection) =>
      readdirSync(join(root, collection.dir))
        .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
        .map((name) => `${collection.route}/${name.replace(/\.mdx$/, "")}`),
    ),
  ]);
};

const contractFor = (url: string) =>
  keyboardContracts.find((contract) => contract.url === url);

describe("the keyboard contracts", () => {
  it("prints every key the cited modules handle, and no other", () => {
    const failures = keyboardContracts.flatMap((contract) => {
      const derived = derivedKeys(contract.sources);
      const printed = new Set(contract.notes.flatMap((note) => note.keys));
      const missing = difference(derived, printed);
      const invented = difference(printed, derived);

      return [
        ...(missing.length === 0
          ? []
          : [`${contract.url}: missing ${missing.join(", ")}`]),
        ...(invented.length === 0
          ? []
          : [`${contract.url}: invented ${invented.join(", ")}`]),
      ];
    });

    expect(failures).toEqual([]);
  });

  it("names each key once, so a page cannot print two meanings for it", () => {
    const failures = keyboardContracts.flatMap((contract) => {
      const printed = contract.notes.flatMap((note) => note.keys);
      const repeated = printed.filter(
        (key, index) => printed.indexOf(key) !== index,
      );
      return repeated.length === 0
        ? []
        : [`${contract.url}: ${repeated.join(", ")}`];
    });

    expect(failures).toEqual([]);
  });

  it("reads at least one key from every contract, and a real module", () => {
    expect(keyboardContracts.length).toBeGreaterThanOrEqual(20);
    expect(
      keyboardContracts.filter((contract) => contract.sources.length === 0),
    ).toEqual([]);
    expect(
      keyboardContracts.filter((contract) => contract.notes.length === 0),
    ).toEqual([]);

    const unreadable = keyboardContracts.flatMap((contract) =>
      contract.sources.filter((source) => read(source).trim() === ""),
    );

    expect(unreadable).toEqual([]);
  });

  it("gives every page whose component handles a key a contract", () => {
    const missing = servedPages([
      ...readCuratedPages(root),
      ...readPackagePages(root),
    ]).flatMap((page) => {
      if (page.module === undefined) return [];
      const keys = keysIn(read(page.module));
      return keys.size > 0 && contractFor(page.url) === undefined
        ? [`${page.url} (${page.module}: ${ordered(keys).join(", ")})`]
        : [];
    });

    expect(missing).toEqual([]);
  });

  it("mounts only on a page the site serves", () => {
    const served = mountedPages();
    expect(
      keyboardContracts.filter((contract) => !served.has(contract.url)),
    ).toEqual([]);
  });

  it("is taught on the page that explains what a page carries", () => {
    // The index's "How to read a page" table is the reader's map of a
    // component page; a generated block it does not name is one a reader
    // cannot look for.
    expect(read("apps/docs/content/docs/components/index.mdx")).toContain(
      "| Keyboard | every key the component handles, and what each does (generated) |",
    );
  });
});
