# 469 — The page-template guard stops tripping the test-quality checker

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 411 (the page template), 466 (the guard that broke the checker)

## 1. Why

`nub run check` failed its first gate on a committed test:

```text
apps/docs/src/component-pages.test.ts:127  no-assertionless-test
  "(dynamic)"
  no expect()/assert/throw-matcher in the test
```

The test **does** assert (`expect(problems).toEqual([])`), so the checker was
wrong — and the reason matters, because the usual remedy (`// check-tests-ok`)
would hide a parser defect rather than state an intent.

`scripts/check-tests.ts` strips comments and then scans a test's block by
counting parentheses outside strings and regexes. It recognises a regex literal
only when the `/` follows one of `([{,;:!&|?=+-*%<>~^` or a newline — not a
space. The guard's line

```ts
/^```(tsx|ts)\b/m.test(usage)
```

has a space before the `/`, so the scanner treated it as division, then read
the three backticks inside it as template-literal delimiters. From there the
quote state never realigned: every following `(` was "inside a string", the
paren depth never returned to zero, and the block body ended at `"("`. A test
whose body is `"("` asserts nothing, so the checker was right about the input it
had.

## 2. What changes

| File | Change |
| ---- | ------ |
| `apps/docs/src/component-pages.test.ts` | The fence test becomes `hasTsExample(usage)`: split on newlines, `startsWith("```tsx")` or `startsWith("```ts")` on the trimmed line, plus the existing `@gpuixui/` import check. No regex literal, no behaviour change. |
| `.agents/slop/plans/README.md` | Add this plan to the docs table. |
| `TODO.md` | Tick the row. |

`scripts/check-tests.ts` is **not** edited: it lives in repo tooling outside this
workstream, and the workaround is local and honest. The parser weakness is
recorded as a cross-team row in `TODO.md` (a regex after a space, containing a
backtick, truncates a block).

## 3. Test plan (both directions)

1. The gate itself: `nub run check:tests` → before, one finding
   (`component-pages.test.ts:127`); after, `tests: every test asserts something`.
2. The assertion still bites: change `## Usage`'s ` ```tsx ` fence to
   ` ```text ` in `countdown.mdx` → `component-pages.test.ts` fails with
   `countdown: Usage has no @gpuixui example`; restore → 8/8 pass.
3. The docs suite is unchanged by the rewrite: `nub run --filter docs test`
   passes (excluding the untracked plan-467 editor suite, which is another
   workstream's in-flight file).

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run check:tests` | exit 0 |
| `nub run --filter docs test` | exit 0 |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |

## 5. STOP conditions

- The rewritten helper accepts a page whose example is not TypeScript: stop;
  the fence check is the assertion and must be exact.
- The checker still reports the block: stop and report the parser state; do not
  add `// check-tests-ok`, because the test does assert.

## 6. Acceptance

- The gate is green, the assertion is proven to fail on a real defect, and the
  checker weakness is recorded for its owner.
