import { absentElements, nativeElements } from "@/lib/native-elements";

/**
 * The runtime's element catalogue (plan 626). Every row comes from
 * `src/lib/native-elements.ts`, whose guard compares it with the installed
 * `ElementType`, `JSX.IntrinsicElements`, the props interfaces and the package
 * source. This component owns presentation only.
 */
export function NativeElementsTable() {
  return (
    <div
      className="my-3 overflow-x-auto"
      role="region"
      aria-label="The runtime's twelve elements, their props and the components that compose them"
      tabIndex={0}
    >
      <table className="w-full text-left text-sm" data-native-elements>
        <thead>
          <tr className="border-b border-fd-border text-fd-muted-foreground">
            <th className="py-2 pr-4 font-medium">Element</th>
            <th className="py-2 pr-4 font-medium">What it paints</th>
            <th className="py-2 pr-4 font-medium">Its own props</th>
            <th className="py-2 font-medium">In the library</th>
          </tr>
        </thead>
        <tbody>
          {nativeElements.map((element) => (
            <tr
              key={element.tag}
              data-element={element.tag}
              className="border-b border-fd-border align-top last:border-0"
            >
              <td className="py-2 pr-4 whitespace-nowrap">
                <code>{`<${element.tag}>`}</code>
              </td>
              <td className="py-2 pr-4">
                {element.paints}
                {element.note === undefined ? null : (
                  <span className="mt-1 block text-fd-muted-foreground">
                    {element.note}
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 font-mono text-xs">
                {element.props.length === 0
                  ? "shared host props only"
                  : element.props.join(", ")}
              </td>
              <td className="py-2">
                {element.composedBy.length === 0 ? (
                  <span className="text-fd-muted-foreground">
                    No component
                    {element.roadmap === undefined ? null : (
                      <>
                        {" — "}
                        <a href="/docs/roadmap">{element.roadmap}</a>
                      </>
                    )}
                  </span>
                ) : (
                  element.composedBy.join(", ")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The tags a React developer expects and this runtime does not have (plan 626).
 * A row's replacement is a real component or a real element recipe, and the
 * owner is a page the site serves.
 */
export function AbsentElements() {
  return (
    <div
      className="my-3 overflow-x-auto"
      role="region"
      aria-label="HTML elements the runtime does not have, and what replaces each"
      tabIndex={0}
    >
      <table className="w-full text-left text-sm" data-absent-elements>
        <thead>
          <tr className="border-b border-fd-border text-fd-muted-foreground">
            <th className="py-2 pr-4 font-medium">Not an element</th>
            <th className="py-2 pr-4 font-medium">What replaces it</th>
            <th className="py-2 font-medium">Owner</th>
          </tr>
        </thead>
        <tbody>
          {absentElements.map((row) => (
            <tr
              key={row.tag}
              data-absent={row.tag}
              className="border-b border-fd-border align-top last:border-0"
            >
              <td className="py-2 pr-4 font-mono whitespace-nowrap">
                {row.tag}
              </td>
              <td className="py-2 pr-4">{row.replacement}</td>
              <td className="py-2 whitespace-nowrap">
                <a href={row.owner}>Read more</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
