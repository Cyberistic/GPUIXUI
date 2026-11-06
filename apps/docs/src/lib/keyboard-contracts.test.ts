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
import { curatedTwinOf } from "./curated-twins";

const root = fileURLToPath(new URL("../../../../", import.meta.url)).replace(
  /\/$/,
  "",
);

const read = (path: string): string => readFileSync(join(root, path), "utf8");

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

const chordKeys: Readonly<Record<string, KeyLabel>> = {
  n: "Ctrl+N",
  p: "Ctrl+P",
};

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

const citedModules = (contract: KeyboardContract): readonly string[] => [
  ...contract.sources,
  ...(contract.runtime === undefined ? [] : [contract.runtime]),
];

const derivedKeys = (contract: KeyboardContract): ReadonlySet<KeyLabel> =>
  citedModules(contract).reduce<Set<KeyLabel>>((keys, source) => {
    keysIn(read(source)).forEach((key) => keys.add(key));
    return keys;
  }, new Set());

const ordered = (keys: ReadonlySet<KeyLabel>): ReadonlyArray<KeyLabel> =>
  keyLabels.filter((key) => keys.has(key));

const difference = (
  left: ReadonlySet<KeyLabel>,
  right: ReadonlySet<KeyLabel>,
): ReadonlyArray<KeyLabel> =>
  ordered(new Set([...left].filter((k) => !right.has(k))));

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
    const cited = keyboardContracts.flatMap((contract) =>
      contract.runtime === undefined ? [] : [contract.runtime],
    );

    expect(cited.length).toBeGreaterThan(0);
    expect(
      cited.filter((path) => !path.includes("/node_modules/@gpuix/")),
    ).toEqual([]);
  });

  it("mounts only on a page the site serves", () => {
    const served = mountedPages();
    expect(
      keyboardContracts.filter((contract) => !served.has(contract.url)),
    ).toEqual([]);
  });
});
