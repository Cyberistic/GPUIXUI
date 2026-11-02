/**
 * The editor's files: a small tree and the code each file opens. Short on
 * purpose — the block is the layout, the syntax paint and the open-file state,
 * not a project.
 */
export interface CodeFile {
  readonly name: string;
  readonly language: string;
  readonly code: ReadonlyArray<string>;
}

export interface Folder {
  readonly name: string;
  readonly files: ReadonlyArray<string>;
}

export const files: ReadonlyArray<CodeFile> = [
  {
    name: "page.tsx",
    language: "TypeScript JSX",
    code: [
      'import { Stack, Text } from "@gpuixui/primitives";',
      "",
      "export default function Page() {",
      "  return (",
      '    <Stack direction="column" gap="md">',
      '      <Text role="h2">Hunter Association</Text>',
      '      <Text tone="muted">Every block, one tree, every platform.</Text>',
      "    </Stack>",
      "  );",
      "}",
    ],
  },
  {
    name: "theme.ts",
    language: "TypeScript",
    code: [
      'import { platformTheme, lightTheme } from "@gpuixui/tokens";',
      "",
      "// One tree, restyled by the platform it runs on.",
      'export const mac = platformTheme(lightTheme, "darwin");',
      'export const win = platformTheme(lightTheme, "win32");',
      "",
      "export const accent = (theme: Theme) => theme.colors.accent;",
    ],
  },
  {
    name: "package.json",
    language: "JSON",
    code: [
      "{",
      '  "name": "hunter",',
      '  "private": true,',
      '  "dependencies": {',
      '    "@gpuix/native": "0.11.0",',
      '    "@gpuixui/primitives": "0.0.0"',
      "  }",
      "}",
    ],
  },
];

export const tree: ReadonlyArray<Folder> = [
  { name: "apps", files: ["page.tsx"] },
  { name: "packages", files: ["theme.ts"] },
  { name: "root", files: ["package.json"] },
];
