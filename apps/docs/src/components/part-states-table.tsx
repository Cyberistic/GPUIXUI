import { stateTypes } from "@/lib/part-states.generated";

/**
 * Every exported `*State` interface in `@gpuixui/components` and the fields it
 * declares (plan 623). The rows are generated from the package by
 * `nub run --filter docs part-states`; `part-states-generated.test.ts` fails
 * while the module is stale, so nothing here is retyped.
 */
const summary = `${stateTypes.length} exported state types across ${
  new Set(stateTypes.map((state) => state.file)).size
} files.`;

export function PartStates() {
  return (
    <div className="not-prose my-3" data-part-states={stateTypes.length}>
      <p className="mb-4 text-sm text-fd-muted-foreground">{summary}</p>
      <div
        className="overflow-x-auto"
        role="region"
        aria-label="Every exported component state type and its fields"
        tabIndex={0}
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-fd-border text-fd-muted-foreground">
              <th className="py-2 pr-4 font-medium">State type</th>
              <th className="py-2 pr-4 font-medium">Fields</th>
              <th className="py-2 font-medium">Declared in</th>
            </tr>
          </thead>
          <tbody>
            {stateTypes.map((state) => (
              <tr
                key={state.name}
                data-state-type={state.name}
                className="border-b border-fd-border align-top last:border-0"
              >
                <td className="py-2 pr-4 font-mono whitespace-nowrap">
                  {state.name}
                </td>
                <td className="py-2 pr-4">
                  {state.fields.map((field) => (
                    <code
                      key={field}
                      className="mr-1 rounded border border-fd-border px-1 text-xs"
                    >
                      {field}
                    </code>
                  ))}
                </td>
                <td className="py-2 font-mono text-xs text-fd-muted-foreground">
                  {state.file}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
