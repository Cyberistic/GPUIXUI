import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { packageCollections } from "./collection-routes";
import {
  keyLabels,
  keyboardContracts,
  type KeyboardContract,
  type KeyLabel,
} from "./keyboard-contracts";
import { readCuratedPages, readPackagePages } from "./page-dependencies-source";
import { curatedTwinOf, servedPages } from "./curated-twins";

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
 * A component whose keys belong to the runtime's headless surface cites the
 * installed `@gpuix/*` module (`KeyboardContract.runtime`) instead of workspace
 * source, and the same derivation reads it: the primitives' `Select` prints the
 * arrows, Enter, Space, Escape and Tab its runtime list handles, so a release
 * that moves one of those handlers fails the page by key.
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
  onEscapeKeyDown: ["Escape"],
};

/**
 * A key the runtime handles through its own modifier guard — the headless list
 * writes `event.key === "n" && event.modifiers?.ctrl`, so the chord is read only
 * where the guard is there; a plain `"n"` is type-ahead, not Ctrl+N.
 */
const chordKeys: Readonly<Record<string, KeyLabel>> = {
  n: "Ctrl+N",
  p: "Ctrl+P",
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
  const chords = Object.entries(chordKeys).flatMap(([literal, key]) =>
    new RegExp(
      `key === "${escapeRegExp(literal)}"\\s*&&\\s*event\\.modifiers\\?\\.ctrl`,
    ).test(source)
      ? [key]
      : [],
  );
  return new Set([...predicates, ...literals, ...chords]);
};

/** Every module a contract's keys are read from, workspace or runtime. */
const citedModules = (contract: KeyboardContract): readonly string[] => [
  ...contract.sources,
  ...(contract.runtime === undefined ? [] : [contract.runtime]),
];

/** The keys a contract's cited modules handle. */
const derivedKeys = (contract: KeyboardContract): ReadonlySet<KeyLabel> =>
  citedModules(contract).reduce<Set<KeyLabel>>((keys, source) => {
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

/**
 * Every URL the site serves, so a strip cannot mount on a 404.
 *
 * A retired package twin redirects to its curated page, so a contract on the
 * retired address would never render; `servedUrls`' rule is applied here too.
 */
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

  return new Set(
    [
      ...site("apps/docs/content/docs", ""),
      ...packageCollections.flatMap((collection) =>
        readdirSync(join(root, collection.dir))
          .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
          .map((name) => `${collection.route}/${name.replace(/\.mdx$/, "")}`),
      ),
    ].filter((url) => curatedTwinOf(url) === undefined),
  );
};

const contractFor = (url: string) =>
  keyboardContracts.find((contract) => contract.url === url);

describe("the keyboard contracts", () => {
  it("prints every key the cited modules handle, and no other", () => {
    const failures = keyboardContracts.flatMap((contract) => {
      const derived = derivedKeys(contract);
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
      keyboardContracts.filter(
        (contract) => citedModules(contract).length === 0,
      ),
    ).toEqual([]);
    expect(
      keyboardContracts.filter((contract) => contract.notes.length === 0),
    ).toEqual([]);

    const unreadable = keyboardContracts.flatMap((contract) =>
      citedModules(contract).filter((source) => read(source).trim() === ""),
    );

    expect(unreadable).toEqual([]);
  });

  it("cites the installed runtime for a page the wrapper does not handle", () => {
    // `Select` is a themed wrapper: every key is the runtime's headless list's,
    // so its contract names the installed module rather than workspace source —
    // a path outside `node_modules` would be a file this repo could edit, and
    // the point is that a runtime release moves the page.
    const cited = keyboardContracts.flatMap((contract) =>
      contract.runtime === undefined ? [] : [contract.runtime],
    );

    expect(cited.length).toBeGreaterThan(0);
    expect(
      cited.filter((path) => !path.includes("/node_modules/@gpuix/")),
    ).toEqual([]);
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
});
