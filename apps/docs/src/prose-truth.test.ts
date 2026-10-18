import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { previewsBySlug } from "./components/preview/approximations";
import { deniesLiveSurface } from "./lib/live-surface-truth";
import { LIVE_SCENES } from "../preview/scenes";

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
 *
 * Bug guarded (plan 436): the first version matched only "not built yet" while
 * the pages said "has not been built yet", so the site kept announcing a
 * missing playground after the app had been green since plan 140. The rule now
 * covers the wording class, not one sentence.
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

const numberWords: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

/**
 * A sentence that states how many previews the site carries. The number is a
 * word or a digit, then within one sentence an `approximation`. A digit followed
 * by `.` is an ordered-list marker, not a count.
 */
const previewCountClaim =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\d+)\b(?![.\d])(?=(?:[^\n.]|\n(?!\n)){0,64}\bapproximations?\b)/gi;

const previewCountClaims = (body: string): ReadonlyArray<number> =>
  [...body.matchAll(previewCountClaim)].map((match) => {
    const word = (match[1] ?? "").toLowerCase();
    return numberWords[word] ?? Number(word);
  });

/** The wording class plan 436 shipped under: any way of saying the app is absent. */
const stalePlaygroundClaims = [
  /\bnot built yet\b/i,
  /\bnot been built\b/i,
  /\bno `?package\.json`?/i,
  /\bdoes not resolve\b/i,
  /\bPhase B deliverable\b/i,
  /\bwill host\b/i,
];

/**
 * The patterns index said the confirmation flow and the command palette appear
 * "once the components they compose are implemented and proven" (plan 427).
 * Both are `done` rows with native suites, so the blocker is one composed
 * example, not the components (plan 485).
 */
const stalePatternClaims = [
  /once the components they compose are implemented/i,
  /components? (?:are|is) not (?:yet )?implemented/i,
];

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
    const stale = playgroundIsRunnable
      ? pages.flatMap(({ path, body }) =>
          /apps\/playground|dev:playground/.test(body)
            ? stalePlaygroundClaims
                .filter((claim) => claim.test(body))
                .map((claim) => `${path}: ${String(claim)}`)
            : [],
        )
      : [];
    expect(stale).toEqual([]);
  });

  it("does not call a shipped pattern component the blocker", () => {
    const page = pages.find(({ path }) => path === "patterns/index.mdx");
    expect(page).toBeDefined();
    const found = stalePatternClaims.filter((claim) =>
      claim.test(page?.body ?? ""),
    );
    expect(found).toEqual([]);
  });

  it("names only playground commands the root package defines", () => {
    const rootPackage = readFileSync(join(repoRoot, "package.json"), "utf8");
    const missing = pages.flatMap(({ path, body }) =>
      [...body.matchAll(/\bnub run ([a-z][\w:-]*)/g)]
        .map((match) => match[1] ?? "")
        .filter((script) => script.includes("playground"))
        .filter((script) => !rootPackage.includes(`"${script}":`))
        .map((script) => `${path}: nub run ${script}`),
    );
    expect(missing).toEqual([]);
  });

  it("recognises a preview total, so the count guard cannot pass vacuously", () => {
    expect(previewCountClaims("two labelled browser approximations")).toEqual([
      2,
    ]);
    expect(previewCountClaims("four carry a labelled approximation")).toEqual([
      4,
    ]);
  });

  it("never states a preview total that disagrees with the registry", () => {
    const mismatches = pages.flatMap(({ path, body }) =>
      previewCountClaims(body)
        .filter((claimed) => claimed !== previewsBySlug.size)
        .map(
          (claimed) =>
            `${path}: claims ${claimed}, registry has ${previewsBySlug.size}`,
        ),
    );
    expect(mismatches).toEqual([]);
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

  /**
   * The Architecture page is the repository overview a reader opens first
   * (plan 459). It had drifted twice: it named three of the seven packages, and
   * it promised `docs/architecture.md`, a document that does not exist. Both
   * checks read the repository, so neither can pass on prose alone.
   */
  it("names every implemented package on the architecture page", () => {
    const page = pages.find(({ path }) => path === "architecture.mdx");
    expect(page).toBeDefined();
    const body = page?.body ?? "";
    const missing = implementedPackages.filter(
      (name) => !body.includes(`@gpuixui/${name}`),
    );
    expect(missing).toEqual([]);
  });

  it("does not promise a maintainer document that does not exist", () => {
    const page = pages.find(({ path }) => path === "architecture.mdx");
    const body = page?.body ?? "";
    const missing = [...body.matchAll(/docs\/[\w-]+\.md/g)]
      .map((match) => match[0])
      .filter((named) => !existsSync(join(repoRoot, named)));
    expect(missing).toEqual([]);
  });

  /**
   * The site ships real GPUix components on the browser renderer (plans
   * 455–458). Before plan 460 the introduction, getting-started and the landing
   * page all denied it, while four component pages said the site could not
   * render a component they showed live. The guard turns red only while a scene
   * exists, so removing the live surface cannot leave a stale denial rule.
   */
  it("does not deny the live surface it ships", () => {
    const liveSceneCount: number = LIVE_SCENES.length;
    const denials =
      liveSceneCount === 0
        ? []
        : pages
            .filter(({ body }) => deniesLiveSurface(body))
            .map(({ path }) => path);
    expect(denials).toEqual([]);
  });
});
