#!/usr/bin/env node
/**
 * A test has to be able to fail.
 *
 * `AGENTS.md` already asks for that ("testing something meaningful and not just
 * testing for the sake of testing", "a test file that fails without the fix"),
 * and the standard it mirrors — seenkw's, where each suite is *proven*
 * non-tautological by reverting the source — is not something a checker can
 * prove on a committed tree. So this gate holds the line where proof is not
 * needed: a test that *cannot* fail, whatever the code does.
 *
 *   no-assertionless-test  the test asserts nothing at all
 *   no-identical-operands  `expect(x).toBe(x)` — a variable against itself
 *   no-literal-assertion   `expect(2).toBe(2)` — a literal against itself
 *   no-mock-round-trip     asserting back the value the test itself stubbed
 *
 * Deliberately narrow. `expect(render()).toBe(render())` is a *determinism*
 * assertion and is not flagged; a call on both sides is a claim about the call,
 * not a comparison of one value with itself. A judgment call — "this test
 * asserts the wrong thing" — is still a reviewer's, or a revert proof's.
 *
 * Each finding prints the remedy. Where a finding is a false positive (the
 * reason is real and worth keeping), the line takes
 * `// check-tests-ok: <why>`, so the exception is greppable and argued.
 *
 *   nub scripts/check-tests.ts [--self-test]
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

/** A `/` starts a regex literal where a value cannot end: `toMatch(/don't/)`
 *  carries an apostrophe and parens that are not code. The character before may
 *  be whitespace (`const re = /"([^"]*)"/`), and the token before that may be a
 *  keyword whose expression starts here (`return /x/`). Reading only the
 *  immediately preceding character missed both, and a quote inside such a regex
 *  opened a string that swallowed the rest of the file. */
const REGEX_PRECEDERS = /[([{,;:!&|?=+\-*%<>~^\n]/;
const REGEX_KEYWORDS =
  /(?:^|[^\w$])(return|typeof|instanceof|delete|void|in|of|yield|await|case|do|else)$/;
const regexStart = (src, at) => {
  let i = at - 1;
  while (i >= 0 && /\s/.test(src[i])) i -= 1;
  if (i < 0) return true;
  return (
    REGEX_PRECEDERS.test(src[i]) ||
    REGEX_KEYWORDS.test(src.slice(0, i + 1))
  );
};
/** Index of the `/` that closes the regex starting at `at`, or `at` if this is
 *  not a regex after all. */
const skipRegex = (src, at) => {
  let i = at + 1;
  let inClass = false;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") i += 2;
    else if (c === "[") {
      inClass = true;
      i += 1;
    } else if (c === "]") {
      inClass = false;
      i += 1;
    } else if (c === "/" && !inClass) return i;
    else if (c === "\n") return at;
    else i += 1;
  }
  return at;
};

const ROOT = new URL("..", import.meta.url).pathname;
const SKIP_DIRS = new Set([
  // Not ours to gate: `packages/meow` is the upstream clone (never edited here)
  // and `packages/@meowkit` is generated from it.
  "meow",
  "@meowkit",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".git",
  ".jj",
  ".alchemy",
  "backups",
  "references",
  "workspaces",
  ".agents",
]);
const TEST_FILE = /\.test\.tsx?$|^test_.*\.py$|_test\.py$/;
/** Every way a suite in this repo says "assert": vitest's and `@effect/vitest`'s
 *  `expect`, node/`uv` `assert`, the throw-matchers, and pytest's `raises`. */
const ASSERTION =
  /(^|[^\w.])expect\s*\(|(^|[^\w.])assert[.(\w]|AssertionError\b|\.toThrow\b|\.rejects\b|raises\(|expectTypeOf/;
const OK_COMMENT = /check-tests-ok:\s*\S/;

/** Comments removed, string bodies intact — one pass, because prose is full of
 *  apostrophes and every URL is full of `//`. A regex that strips comments
 *  blind to strings truncates `"http://x"` at the `//` and takes the block's
 *  closing parenthesis with it. */
const stripComments = (src) => {
  let out = "";
  let quote = null;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i += 1;
      } else if (c === quote) quote = null;
      continue;
    }
    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i += 1;
      }
      i += 1;
      continue;
    }
    if (c === "/" && regexStart(src, i)) {
      const end = skipRegex(src, i);
      out += src.slice(i, end + 1);
      i = end;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    out += c;
  }
  return out;
};

/** Every `it(...)`/`test(...)` call, with its title and the body's text. */
/** Python suites: a `def test_*` body must assert (or expect a raise). The
 *  JS block model does not apply, and `pytest.raises` is this repo's way of
 *  asserting a failure. */
const pythonTests = (src) => {
  const lines = src.split("\n");
  const starts = [];
  lines.forEach((line, i) => {
    const m = line.match(/^(\s*)def (test_\w+)\s*\(/);
    if (m) starts.push({ title: m[2], indent: m[1].length, line: i + 1 });
  });
  return starts.map((start, i) => {
    const until = starts[i + 1]?.line ?? lines.length + 1;
    return {
      ...start,
      body: lines.slice(start.line - 1, until - 1).join("\n"),
    };
  });
};

const testBlocks = (src) => {
  const clean = stripComments(src);
  const call =
    /(^|[^\w.$])(it|test)(?:\.each|\.skip|\.only|\.todo|\.fails)?\s*\(/g;
  const blocks = [];
  for (const match of clean.matchAll(call)) {
    const open = clean.indexOf("(", match.index + match[0].length - 1);
    let depth = 0;
    let end = open;
    let quote = null;
    for (let i = open; i < clean.length; i += 1) {
      const c = clean[i];
      // A parenthesis inside a string is text: `it("splits on (", ...)`.
      if (quote) {
        if (c === "\\") i += 1;
        else if (c === quote) quote = null;
        continue;
      }
      if (c === "/" && regexStart(clean, i)) {
        i = skipRegex(clean, i);
        continue;
      }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "(") depth += 1;
      else if (c === ")") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    let body = clean.slice(open, end);
    // `it.each([...])("title", fn)` is two calls: the first parens hold the
    // cases, the callback is the second group. Keep walking while the group we
    // just closed is immediately followed by another one.
    let cursor = end;
    while (/^\s*\(/.test(clean.slice(cursor + 1))) {
      const next = clean.indexOf("(", cursor + 1);
      let depth2 = 0;
      let quote2 = null;
      let close2 = next;
      for (let i = next; i < clean.length; i += 1) {
        const c = clean[i];
        if (quote2) {
          if (c === "\\") i += 1;
          else if (c === quote2) quote2 = null;
          continue;
        }
        if (c === '"' || c === "'" || c === "`") quote2 = c;
        else if (c === "(") depth2 += 1;
        else if (c === ")") {
          depth2 -= 1;
          if (depth2 === 0) {
            close2 = i;
            break;
          }
        }
      }
      body = clean.slice(next, close2);
      cursor = close2;
    }
    const title =
      (body.match(/^\s*\(\s*(?:`[^`]*`|"[^"]*"|'[^']*')/) ?? [])[0]
        ?.trim()
        .slice(1, 90) ?? "(dynamic)";
    const line = clean.slice(0, open).split("\n").length;
    blocks.push({
      title,
      body,
      line,
      raw: src
        .split("\n")
        .slice(line - 1, line + 1)
        .join("\n"),
    });
  }
  return blocks;
};

const fixtures = (kind, body) => {
  if (kind === "no-mock-round-trip") return mockRoundTrips(body);
  return [];
};

/** The values the test itself told a double to return. */
const mockRoundTrips = (body) => {
  const stubbed = [
    ...body.matchAll(
      /mock(?:Return|Resolved|Implementation)?Value\w*\(\s*([^()]{1,60}?)\s*\)/g,
    ),
  ].map((m) => m[1].trim());
  if (!stubbed.length) return [];
  const findings = [];
  for (const comparison of body.matchAll(
    /expect\((.{1,120}?)\)\s*\.\s*(toBe|toEqual|toStrictEqual)\((.{1,120}?)\)/g,
  )) {
    const [, , , expected] = comparison;
    if (stubbed.some((value) => value === expected.trim()))
      findings.push(comparison[0].trim());
  }
  return findings;
};

export const inspect = (file, source) => {
  const findings = [];
  if (file.endsWith(".py")) {
    for (const block of pythonTests(source)) {
      if (OK_COMMENT.test(block.body)) continue;
      if (
        !/assert[\s(\w]|AssertionError\b|raises\(|pytest\.fail/.test(block.body)
      )
        findings.push({
          where: `${file}:${block.line}`,
          rule: "no-assertionless-test",
          title: block.title,
          detail: "no assert/raises in the test",
        });
    }
    return findings;
  }
  for (const block of testBlocks(source)) {
    const where = `${file}:${block.line}`;
    if (OK_COMMENT.test(block.raw)) continue;
    const add = (rule, detail) =>
      findings.push({ where, rule, title: block.title, detail });
    if (!ASSERTION.test(block.body)) {
      add(
        "no-assertionless-test",
        "no expect()/assert/throw-matcher in the test",
      );
    }
    for (const m of block.body.matchAll(
      /expect\((.{1,120}?)\)\s*\.\s*(toBe|toEqual|toStrictEqual)\((.{1,120}?)\)/g,
    )) {
      const [, left, , right] = m;
      const [a, b] = [left.trim(), right.trim()];
      const isLiteral = (s) =>
        /^(\d+|true|false|null|undefined|"[^"]*"|'[^']*')$/.test(s);
      // A call on either side is a claim about the call (determinism, purity);
      // a bare name compared with itself can never fail.
      if (a === b && !a.includes("(") && !isLiteral(a))
        add("no-identical-operands", m[0].trim());
      if (isLiteral(a) && a === b) add("no-literal-assertion", m[0].trim());
    }
    for (const detail of fixtures("no-mock-round-trip", block.body))
      add("no-mock-round-trip", detail);
  }
  return findings;
};

const walk = (dir) => {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (TEST_FILE.test(entry.name)) files.push(path);
  }
  return files;
};

const SELF_TEST = [
  ["no-assertionless-test", 'it("nothing", () => { const x = 1; });'],
  [
    "no-identical-operands",
    'it("self", () => { const x = 1; expect(x).toBe(x); });',
  ],
  ["no-literal-assertion", 'it("literal", () => { expect(2).toBe(2); });'],
  [
    "no-assertionless-test",
    'const re = /"([^"]*)"/.exec(source);\nit("nothing after a quoted regex", () => { const x = 1; });',
  ],
  [
    "no-mock-round-trip",
    'it("stub", () => { vi.mocked(f).mockReturnValue("stubbed"); expect(f()).toBe("stubbed"); });',
  ],
];
/** Shapes that must stay quiet — the false positives this gate would otherwise
 *  train people to ignore. */
const NEGATIVE = [
  ["determinism", 'it("same id", () => { expect(render()).toBe(render()); });'],
  ["real assertion", 'it("adds", () => { expect(add(1, 2)).toBe(3); });'],
  [
    "quoted regex then a real test",
    'const re = /"([^"]*)"/.exec(source);\nit("adds", () => { expect(add(1, 2)).toBe(3); });',
  ],
  [
    "regex after return",
    'function f(s) { return /don\'t/.exec(s); }\nit("adds", () => { expect(add(1, 2)).toBe(3); });',
  ],
  [
    "throw matcher",
    'it("throws", () => { expect(() => parse("")).toThrow(); });',
  ],
  ["python assert", "def test_x():\n    assert 1 + 1 == 2\n"],
  [
    "python raises",
    'def test_y():\n    with pytest.raises(ValueError):\n        parse("")\n',
  ],
  [
    "escape hatch",
    'it("ok", () => { // check-tests-ok: asserts via harness\n  run(); });',
  ],
];

const selfTest = () => {
  const failures = [];
  for (const [expected, source] of SELF_TEST) {
    const got = inspect("fixture.test.ts", source);
    if (!got.some((f) => f.rule === expected))
      failures.push(
        `expected ${expected} for: ${source}\n  got ${JSON.stringify(got)}`,
      );
  }
  for (const [label, source] of NEGATIVE) {
    const got = inspect("fixture.test.ts", source);
    if (got.length)
      failures.push(
        `expected no finding for ${label}: ${source}\n  got ${JSON.stringify(got)}`,
      );
  }
  if (failures.length) {
    for (const f of failures) console.error(`FAIL ${f}`);
    process.exit(1);
  }
  console.log(`ok — ${SELF_TEST.length} flagged, ${NEGATIVE.length} quiet`);
};

const main = () => {
  if (process.argv.includes("--self-test")) return selfTest();
  const findings = walk(ROOT).flatMap((file) =>
    inspect(relative(ROOT, file), readFileSync(file, "utf8")),
  );
  for (const f of findings) {
    console.error(`${f.where}  ${f.rule}`);
    console.error(`  "${f.title}"`);
    console.error(`  ${f.detail}`);
  }
  if (findings.length) {
    console.error(
      `\n${findings.length} test(s) that cannot fail. Fix them, or argue the exception on the line with "// check-tests-ok: <why>".`,
    );
    process.exit(1);
  }
  console.log(
    "tests: every test asserts something, and nothing asserts itself",
  );
};

if (import.meta.url === `file://${process.argv[1]}`) main();
