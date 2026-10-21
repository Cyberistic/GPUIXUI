import { patternById, patternChoices } from "../../lib/patterns";
import { gitConfig } from "../../lib/shared";

/**
 * One pattern, rendered under its own heading on `/docs/patterns`.
 *
 * The heading lives in the page so the "On this page" table of contents lists
 * every pattern; everything under it comes from `patterns.ts`, so the parts
 * table and the steps have one source. An id the data does not have throws at
 * render: a page and its data disagreeing is a build bug, not an empty section.
 */
export function Pattern({ id }: { id: string }) {
  const pattern = patternById(id);
  if (pattern === undefined) {
    throw new Error(`Pattern: no pattern named "${id}"`);
  }

  return (
    <div className="not-prose my-6 space-y-4 text-sm">
      <p className="m-0 text-muted-foreground">{pattern.situation}</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-left">
              <th className="px-3 py-2 font-semibold">Part</th>
              <th className="px-3 py-2 font-semibold">Its job here</th>
            </tr>
          </thead>
          <tbody>
            {pattern.parts.map((part) => (
              <tr
                className="border-b border-border align-top last:border-0"
                key={part.url}
              >
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  <a className="underline" href={part.url}>
                    {part.name}
                  </a>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{part.job}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="m-0">
        <strong className="text-foreground">State.</strong>{" "}
        <span className="text-muted-foreground">{pattern.state}</span>
      </p>
      <ol className="m-0 list-decimal space-y-1 pl-5 text-muted-foreground">
        {pattern.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="m-0 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <strong className="text-foreground">Prevents.</strong>{" "}
        <span className="text-muted-foreground">{pattern.prevents}</span>
      </p>
      <p className="m-0 font-mono text-xs text-muted-foreground">
        Runnable build:{" "}
        <a className="underline" href={blobUrl(pattern.example)}>
          {pattern.example}
        </a>{" "}
        · mounted by the library's{" "}
        <a className="underline" href="/docs/examples">
          examples registry
        </a>
      </p>
    </div>
  );
}

/**
 * The component chooser.
 *
 * Six questions a reader actually asks, answered with the shipped component and
 * the case where it is the wrong answer. Both columns are data, so the table
 * cannot recommend a page the library does not have.
 */
export function PatternChoices() {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/60 text-left">
            <th className="px-3 py-2 font-semibold">The reader needs to</th>
            <th className="px-3 py-2 font-semibold">Use</th>
            <th className="px-3 py-2 font-semibold">Why, and when not</th>
          </tr>
        </thead>
        <tbody>
          {patternChoices.map((choice) => (
            <tr
              className="border-b border-border align-top last:border-0"
              key={choice.need}
            >
              <td className="px-3 py-2">{choice.need}</td>
              <td className="whitespace-nowrap px-3 py-2 font-medium">
                <a className="underline" href={choice.use.url}>
                  {choice.use.name}
                </a>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {choice.because} Not {choice.not}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const blobUrl = (file: string): string =>
  `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${file}`;
