const MAX_LINES = 2;
const MAX_WORDS = 24;
const MAX_FILE_LINES = 3;

const KEEP_WORDS =
  /(copyright|spdx-license-identifier|licensed under|@license|all rights reserved)/i;
const KEEP_PREFIX =
  /^(?:!|@ts-|@jsx|@jsximportsource|@jsxruntime|@jsxfrag|@vitest-environment|@jest-environment|@vite-ignore|check-tests-ok:|oxlint-disable|eslint-disable|prettier-ignore|oxfmt-ignore|@__PURE__|#__PURE__|# sourcemappingurl|istanbul ignore|c8 ignore|v8 ignore|todo|fixme|hack|xxx)/i;

const text = (comment) => comment.value.replace(/^\s*\*+\s?/gm, "").trim();

const kept = (comment) => {
  const value = text(comment);
  return KEEP_WORDS.test(value) || KEEP_PREFIX.test(value);
};

const words = (comment) => text(comment).split(/\s+/).filter(Boolean).length;

const groups = (comments) =>
  comments.reduce((all, comment) => {
    const last = all.at(-1);
    const previous = last?.at(-1);
    if (
      last !== undefined &&
      previous !== undefined &&
      comment.type === "Line" &&
      previous.type === "Line" &&
      comment.loc.start.line === previous.loc.end.line + 1
    ) {
      last.push(comment);
      return all;
    }
    all.push([comment]);
    return all;
  }, []);

const span = (group) => group.at(-1).loc.end.line - group[0].loc.start.line + 1;

const plugin = {
  meta: { name: "comments" },
  rules: {
    "no-long-comments": {
      meta: {
        type: "problem",
        schema: [],
        fixable: "code",
        docs: {
          description:
            "Remove comments that are long, numerous or not a licence, directive or TODO.",
        },
      },
      create(context) {
        return {
          Program() {
            const source = context.sourceCode ?? context.getSourceCode?.();
            const comments = (source?.getAllComments?.() ?? []).filter(
              (comment) => !kept(comment),
            );
            const blocks = groups(comments);
            const selected = new Set(
              blocks
                .filter(
                  (block) =>
                    span(block) > MAX_LINES ||
                    block.reduce((sum, c) => sum + words(c), 0) > MAX_WORDS,
                )
                .flat(),
            );
            let total = blocks.reduce((sum, block) => sum + span(block), 0);
            const byLength = [...blocks].sort((a, b) => span(b) - span(a));
            for (const block of byLength) {
              if (total <= MAX_FILE_LINES) break;
              const already = block.every((comment) => selected.has(comment));
              if (!already) {
                for (const comment of block) selected.add(comment);
              }
              total -= span(block);
            }
            for (const comment of selected) {
              context.report({
                loc: comment.loc,
                message: `comment exceeds ${MAX_LINES} lines, ${MAX_WORDS} words or ${MAX_FILE_LINES} lines per file`,
                fix: (fixer) => {
                  const source =
                    context.sourceCode ?? context.getSourceCode?.();
                  const text = source?.text ?? "";
                  const [start, end] = comment.range;
                  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
                  const lineEnd = text.indexOf("\n", end);
                  const alone =
                    text.slice(lineStart, start).trim() === "" &&
                    (lineEnd === -1 || text.slice(end, lineEnd).trim() === "");
                  return fixer.removeRange(
                    alone
                      ? [lineStart, lineEnd === -1 ? text.length : lineEnd + 1]
                      : [start, end],
                  );
                },
              });
            }
          },
        };
      },
    },
  },
};

export default plugin;
