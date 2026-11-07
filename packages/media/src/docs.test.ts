import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { qrModeCapacity, type QrMode } from "./qr/encode.js";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

interface PageContract {
  readonly page: string;
  readonly source: string;
  readonly type: string;

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

const interfaceBody = (source: string, type: string): string => {
  const header = new RegExp(
    `export interface ${type}(?:<[^>]*>)?(?:\\s+extends[^{]+)?\\s*\\{`,
  ).exec(source);
  if (header === null) return "";
  const start = header.index + header[0].length;
  const end = source.indexOf("\n}", start);
  return end < 0 ? "" : source.slice(start, end);
};

const INHERITED: ReadonlySet<string> = new Set([
  "aria-id",
  "children",
  "onLayout",
  "ref",
  "style",
  "testId",
]);

const declaredProps = (source: string, type: string): ReadonlyArray<string> =>
  Arr.map(
    Arr.fromIterable(
      interfaceBody(source, type).matchAll(/^ {2}readonly ([A-Za-z]+)\??:/gm),
    ),
    (match) => match[1] ?? "",
  );

const namesIn = (cell: string): ReadonlyArray<string> =>
  Arr.map(Arr.fromIterable(cell.matchAll(/`([A-Za-z][\w-]*)`/g)), (match) =>
    String(match[1]),
  );

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
  it("prints the capacity each mode reaches from the encoder", () => {
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
