import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { useState } from "react";
import { examples } from "../../lib/examples-data";
import { filterExamples, type ExampleEntry } from "../../lib/examples";
import { gitConfig } from "../../lib/shared";

/**
 * The example registry, filterable.
 *
 * The rows are generated from `packages/*\/examples/*.example.tsx`
 * (`examples-data.ts`), so the page cannot list an example that does not exist.
 * The source is a **reading** aid, not a preview: these are GPUix modules, and
 * a browser rendering of them would be the fake native preview MISSION.md
 * forbids. It stays collapsed until a reader asks for it.
 */

const sectionsOf = (
  entries: ReadonlyArray<ExampleEntry>,
): ReadonlyArray<string> =>
  entries.reduce<ReadonlyArray<string>>(
    (sections, entry) =>
      sections.includes(entry.section)
        ? sections
        : [...sections, entry.section],
    [],
  );

const githubUrl = (file: string): string =>
  `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${file}`;

export function ExamplesIndex() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<ReadonlyArray<string>>([]);
  const matches = filterExamples(examples, query);
  const sections = sectionsOf(matches);

  const toggle = (id: string) =>
    setExpanded((open) =>
      open.includes(id) ? open.filter((name) => name !== id) : [...open, id],
    );

  return (
    <div className="not-prose my-6">
      <label className="block">
        <span className="sr-only">
          Filter examples by name, purpose or package
        </span>
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name, purpose or package — try “dialog”, “form”, “primitives”"
          type="search"
          value={query}
        />
      </label>
      <p
        aria-live="polite"
        className="m-0 my-3 font-mono text-xs text-muted-foreground"
        role="status"
      >
        {`${matches.length} of ${examples.length} examples`}
      </p>
      {matches.length === 0 ? (
        <p className="rounded-xl border border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No example matches “{query.trim()}”. Try a shorter word, or the search
          box at the top of the page.
        </p>
      ) : (
        sections.map((section) => (
          <section className="mt-8" key={section}>
            <h2 className="mb-3 border-b border-border pb-2 text-base font-semibold text-foreground">
              {section}
            </h2>
            <ul className="grid list-none grid-cols-1 gap-3 p-0">
              {matches
                .filter((entry) => entry.section === section)
                .map((entry) => {
                  const open = expanded.includes(entry.id);
                  return (
                    <li
                      className="m-0 rounded-xl border border-border px-4 py-3"
                      key={`${entry.packageName}/${entry.id}`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <a
                          className="font-medium text-foreground no-underline hover:underline"
                          href={entry.url}
                        >
                          {entry.title}
                        </a>
                        <a
                          className="font-mono text-[0.7rem] text-muted-foreground hover:text-foreground"
                          href={githubUrl(entry.file)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {entry.file}
                        </a>
                      </div>
                      <p className="m-0 mt-1 text-sm text-muted-foreground">
                        {entry.summary}
                        {entry.grouped
                          ? " A grouped example: it covers more than one page of this lane."
                          : ""}
                      </p>
                      <button
                        aria-expanded={open}
                        aria-label={`Show the source for ${entry.title}`}
                        className="mt-2 cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        onClick={() => toggle(entry.id)}
                        type="button"
                      >
                        {open ? "Hide the source" : "Show the source"}
                      </button>
                      {open ? (
                        <div className="mt-3">
                          <DynamicCodeBlock lang="tsx" code={entry.source} />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
