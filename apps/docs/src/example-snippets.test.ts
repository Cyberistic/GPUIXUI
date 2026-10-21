import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { describe, expect, it } from "vitest";
import {
  fencedExamples,
  isModule,
  type ExampleSnippet,
} from "./lib/example-snippets";

/**
 * Guards the copyable examples (plan 613). The docs call a fenced `tsx` block a
 * usage example, but nothing checked that it compiles: measured 2026-10-20, 47
 * of 73 examples failed with 133 diagnostics, and three pages named props the
 * component does not have (Alert `title`, Combobox `label`, DatePicker `label`).
 * The guard compiles every example as its own module with the app's real
 * options, so a reader who copies one gets TypeScript's answer before we ship.
 *
 * `node:fs` and `node:child_process` are deliberate test-boundary imports, like
 * `content-references.test.ts`: the test reads the repository and runs the
 * repository's own `tsc`, and the domain modules never import them.
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const pagesDirectory = join(appRoot, "content/docs/components");

const pages = Arr.sort(
  readdirSync(pagesDirectory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.slice(0, -".mdx".length)),
  Order.String,
);

/**
 * Non-component pages whose fences are also copyable modules. Plan 632's async
 * page teaches a request hook with a real `effect`/`react` import, so it gets
 * the same compiler the component pages get; the other hand-authored pages hold
 * illustrative fragments that are not standalone modules.
 */
const extraPages = ["async-data", "updates", "automation", "events"] as const;

const examples: ReadonlyArray<ExampleSnippet> = [
  ...pages.map((page) => ({
    page,
    path: join(pagesDirectory, `${page}.mdx`),
  })),
  ...extraPages.map((page) => ({
    page,
    path: join(appRoot, "content/docs", `${page}.mdx`),
  })),
].flatMap(({ page, path }) => fencedExamples(page, readFileSync(path, "utf8")));

/**
 * Compile every example through the repository's own `tsc`, in a generated
 * project under the app's gitignored `.cache`. `tsc` is the tool that answers
 * `check-types`, so the guard cannot disagree with the gate it protects.
 */
const compileExamples = (
  snippets: ReadonlyArray<ExampleSnippet>,
): ReadonlyArray<string> => {
  const directory = join(appRoot, ".cache/example-snippets");
  const examplesDirectory = join(directory, "examples");
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(examplesDirectory, { recursive: true });

  const byFile = new Map<string, ExampleSnippet>();
  snippets.forEach((snippet) => {
    const file = `${snippet.page}-${snippet.index}.${snippet.lang}`;
    byFile.set(file, snippet);
    writeFileSync(join(examplesDirectory, file), snippet.code);
  });
  writeFileSync(
    join(directory, "tsconfig.json"),
    `{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@gpuix/react",
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noEmit": true
  },
  "include": ["examples/*.ts", "examples/*.tsx"]
}
`,
  );

  const result = spawnSync(
    process.execPath,
    [
      join(appRoot, "node_modules/typescript/bin/tsc"),
      "-p",
      join(directory, "tsconfig.json"),
      "--pretty",
      "false",
    ],
    { cwd: appRoot, encoding: "utf8" },
  );
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const diagnostics = output.split("\n").flatMap((line) => {
    const match = /^(.+)\((\d+),\d+\): error (TS\d+): (.*)$/.exec(line);
    if (match === null) return [];
    const [, file, lineNumber, code, message] = match;
    const snippet = byFile.get(file?.split("/").at(-1) ?? "");
    return snippet === undefined
      ? []
      : [
          `${snippet.page}.mdx:${snippet.line + Number(lineNumber)} (fence ${snippet.index}) ${code}: ${message}`,
        ];
  });

  if (result.error !== undefined) {
    return [`tsc did not run: ${result.error.message}`];
  }
  if (result.status !== 0 && diagnostics.length === 0) {
    return [
      `tsc exited ${result.status ?? "null"} without a mapped diagnostic:\n${output}`,
    ];
  }
  return diagnostics;
};

describe("component example extractor", () => {
  it("reads code fences with their page, ordinal and MDX line", () => {
    const markdown = [
      "# Page",
      "",
      "```sh",
      "nub run check",
      "```",
      "",
      "```tsx",
      'import { useState } from "react";',
      'const [value, setValue] = useState("");',
      'const save = () => setValue("saved");',
      "```",
      "",
      "An inline `import` is prose, not an example.",
    ].join("\n");

    expect(fencedExamples("fixture", markdown)).toEqual([
      {
        page: "fixture",
        index: 1,
        lang: "tsx",
        line: 7,
        code: 'import { useState } from "react";\nconst [value, setValue] = useState("");\nconst save = () => setValue("saved");',
      },
    ]);
  });

  it("keeps an unclosed fence so the compiler can name it", () => {
    const [snippet] = fencedExamples("broken", "```tsx\nconst value = 1;");

    expect(snippet?.code).toBe("const value = 1;");
  });

  it("finds every component page's examples", () => {
    expect(pages.length).toBeGreaterThanOrEqual(66);
    expect(examples.length).toBeGreaterThanOrEqual(73);
  });
});

describe("component examples compile", () => {
  it("every fenced example is a standalone module", () => {
    const scripts = examples.filter((example) => !isModule(example));

    expect(
      scripts.map((example) => `${example.page}.mdx:${example.line}`),
    ).toEqual([]);
  });

  it("compiles every fenced example against the real packages", () => {
    expect(examples.length).toBeGreaterThan(0);
    expect(compileExamples(examples)).toEqual([]);
  }, 120_000);
});
