import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards the prose pages against the Phase A -> Phase C drift (plan 426).
 *
 * The failure mode is a sentence that was true when it was written and is false
 * now: "the primitives package does not exist yet", "no example exists". The
 * page still builds and still links, so only a reader notices. These checks
 * derive their facts from the repository (a package is real when it has a
 * `package.json`) and fail when prose contradicts them.
 *
 * The playground check is deliberately inverted: it stays green while the
 * playground has no app and turns red the moment `apps/playground/package.json`
 * lands, so the page is updated in the same change that makes it runnable.
 */
const contentDirectory = fileURLToPath(
  new URL("../content/docs/", import.meta.url),
);
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const hasPackage = (directory: string): boolean =>
  existsSync(join(repoRoot, directory, "package.json"));

const implementedPackages = readdirSync(join(repoRoot, "packages")).filter(
  (name) => hasPackage(`packages/${name}`),
);
const runnableExamples = readdirSync(join(repoRoot, "examples")).filter(
  (name) => hasPackage(`examples/${name}`),
);
const playgroundIsRunnable = hasPackage("apps/playground");

/** Every MDX page under `content/docs`, keyed by its repo-relative path. */
const pages = readdirSync(contentDirectory, {
  recursive: true,
  withFileTypes: true,
})
  .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
  .map((entry) => {
    const path = join(entry.parentPath, entry.name);
    return {
      path: relative(contentDirectory, path),
      body: readFileSync(path, "utf8"),
    };
  });

/** A path the owning directory's README presents as planned. */
const registered = (path: string): boolean => {
  const [head, child] = path.split("/");
  const readme = join(repoRoot, head ?? "", "README.md");
  if (!existsSync(readme)) return false;
  const text = readFileSync(readme, "utf8");
  return text.includes(path) || (child !== undefined && text.includes(child));
};

const pathPattern = /`((?:packages|apps|examples|docs|LICENSES)\/[^`\s]+)`/g;

describe("prose truth", () => {
  it("scans the content tree, so a missing directory cannot pass vacuously", () => {
    expect(pages.length).toBeGreaterThan(10);
    expect(implementedPackages.length).toBeGreaterThanOrEqual(4);
    expect(runnableExamples.length).toBeGreaterThanOrEqual(1);
  });

  it("does not call an implemented package future work", () => {
    const futureClaims = pages.flatMap(({ path, body }) =>
      [...body.matchAll(/will live in `@gpuixui\/([\w-]+)`/g)]
        .map((match) => match[1] ?? "")
        .filter((name) => implementedPackages.includes(name))
        .map((name) => `${path}: "will live in @gpuixui/${name}"`),
    );
    expect(futureClaims).toEqual([]);
  });

  it("does not say no example exists while a runnable example does", () => {
    const denials = pages
      .filter(
        ({ body }) =>
          runnableExamples.length > 0 &&
          /\bNeither exists yet\b/.test(body) &&
          body.includes("`examples/"),
      )
      .map(({ path }) => path);
    expect(denials).toEqual([]);
  });

  it("revisit the playground claim once the playground app exists", () => {
    const stale = pages
      .filter(
        ({ body }) =>
          playgroundIsRunnable &&
          /\bnot built yet\b/i.test(body) &&
          /apps\/playground|dev:playground/.test(body),
      )
      .map(({ path }) => path);
    expect(stale).toEqual([]);
  });

  it("names only repository paths that exist or are registered as planned", () => {
    const missing = pages.flatMap(({ path, body }) =>
      [...body.matchAll(pathPattern)]
        .map((match) => match[1] ?? "")
        .filter((named) => !existsSync(join(repoRoot, named)))
        .filter((named) => !registered(named))
        .map((named) => `${path}: missing ${named}`),
    );
    expect(missing).toEqual([]);
  });
});
