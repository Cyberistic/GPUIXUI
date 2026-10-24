/**
 * Every media page's `## API` table against the props its type declares.
 *
 * The bug guarded: a page that lists the props its author remembered, so a prop
 * added to a `*Props` interface later is documented nowhere and a reader cannot
 * discover it. This package's pages are also the only place a consumer learns
 * what a crop or a symbol takes, so a silently added prop is an undiscoverable
 * feature rather than a docs blemish.
 *
 * The check is exact in both directions: a declared prop must have a row and a
 * row must name a declared prop. A row may document two props in one cell
 * (`width` / `height`); its names are read as a set, not as its first span.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import {
  QR_MAX_VERSION,
  qrByteCapacity,
  qrModeCapacity,
  type QrMode,
} from "./qr/encode.js";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** A page and the props type its source declares, with a floor for the reader. */
interface PageContract {
  readonly page: string;
  readonly source: string;
  readonly type: string;
  /** Minimum props a table must resolve, so a broken reader cannot pass. */
  readonly floor: number;
}

const PAGES: ReadonlyArray<PageContract> = [
  {
    page: "../docs/crop-area.mdx",
    source: "./crop-area.tsx",
    type: "CropAreaProps",
    floor: 12,
  },
  {
    page: "../docs/qr-code.mdx",
    source: "./qr-code.tsx",
    type: "QrCodeProps",
    floor: 8,
  },
  {
    page: "../docs/media-player.mdx",
    source: "./media-player.tsx",
    type: "MediaPlayerProps",
    floor: 17,
  },
  {
    page: "../docs/image-preview.mdx",
    source: "./image-preview.tsx",
    type: "ImagePreviewProps",
    floor: 12,
  },
  {
    page: "../docs/file-upload.mdx",
    source: "./file-upload.tsx",
    type: "FileUploadProps",
    floor: 6,
  },
  {
    page: "../docs/drop-zone.mdx",
    source: "./drop-zone.tsx",
    type: "DropZoneProps",
    floor: 6,
  },
];

/** The body of one interface, however its `extends` list is wrapped. */
const interfaceBody = (source: string, type: string): string => {
  const header = new RegExp(
    `export interface ${type}(?:<[^>]*>)?(?:\\s+extends[^{]+)?\\s*\\{`,
  ).exec(source);
  if (header === null) return "";
  const start = header.index + header[0].length;
  const end = source.indexOf("\n}", start);
  return end < 0 ? "" : source.slice(start, end);
};

/**
 * The surface every part inherits from `Props`.
 *
 * A page may document these beside the props its interface declares, so a row
 * naming one is not reported as a phantom prop; every locally declared prop is
 * still required, which is what catches a real omission.
 */
const INHERITED: ReadonlySet<string> = new Set([
  "aria-id",
  "children",
  "onLayout",
  "ref",
  "style",
  "testId",
]);

/** The props one interface declares, from its own body. */
const declaredProps = (source: string, type: string): ReadonlyArray<string> =>
  Arr.map(
    Arr.fromIterable(
      interfaceBody(source, type).matchAll(/^ {2}readonly ([A-Za-z]+)\??:/gm),
    ),
    (match) => match[1] ?? "",
  );

/** Every name a row's prop cell documents, in backticks. */
const namesIn = (cell: string): ReadonlyArray<string> =>
  Arr.map(Arr.fromIterable(cell.matchAll(/`([A-Za-z][\w-]*)`/g)), (match) =>
    String(match[1]),
  );

/** The props a page's `## API` table documents. */
const documentedProps = (page: string): ReadonlyArray<string> => {
  const start = page.indexOf("## API");
  if (start < 0) return [];
  const rest = page.slice(start);
  const end = rest.indexOf("\n## ", 1);
  const section = end < 0 ? rest : rest.slice(0, end);
  return Arr.flatMap(Str.split(section, "\n"), (line) =>
    Str.startsWith("| `")(line) ? namesIn(Str.split(line, "|")[1] ?? "") : [],
  );
};

describe("the qr-code page", () => {
  it("prints the byte capacity the encoder reports", () => {
    // The bug guarded: the page advertised 274 bytes because that is the
    // version-10 `L` symbol's *data codeword* count, not the byte capacity a
    // reader can actually encode (the mode indicator and the count field take
    // their bits first). A reader chose a payload by the larger number and got
    // the overflow box the same page promises not to paint.
    const stated = /largest symbol holds (\d+) bytes at `L`/.exec(
      read("../docs/qr-code.mdx"),
    )?.[1];
    expect(stated).toBe(String(qrByteCapacity(QR_MAX_VERSION, "L")));
  });

  it("prints the capacity each mode reaches from the encoder", () => {
    // The bug guarded: the page's mode table is how a reader chooses a payload
    // shape, so a printed length the encoder refuses would send them into the
    // overflow box the same page promises not to paint.
    const page = read("../docs/qr-code.mdx");
    const printed: ReadonlyArray<readonly [QrMode, string]> = [
      ["numeric", "digits"],
      ["alphanumeric", "characters"],
      ["byte", "bytes"],
    ];
    Arr.forEach(printed, ([mode, unit]) => {
      expect(page).toContain(
        `| ${mode} | ${qrModeCapacity(mode, 1, "L")} ${unit} |`,
      );
    });
  });
});

describe.each(PAGES)("the $page page", (contract) => {
  it("documents every prop its type declares, and nothing else", () => {
    const declared = declaredProps(read(contract.source), contract.type);
    const documented = documentedProps(read(contract.page));

    // A floor so a reader that resolved nothing cannot pass vacuously.
    expect(declared.length).toBeGreaterThan(contract.floor - 1);
    expect(Arr.filter(declared, (name) => !documented.includes(name))).toEqual(
      [],
    );
    expect(
      Arr.filter(
        documented,
        (name) => !declared.includes(name) && !INHERITED.has(name),
      ),
    ).toEqual([]);
  });
});
