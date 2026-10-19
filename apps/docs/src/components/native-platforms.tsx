import { nativePlatforms } from "@/lib/native-platforms";

/**
 * The published native targets for the pinned GPUix release (plan 584). The
 * rows come from `nativePlatforms`; `native-platforms.test.tsx` compares the
 * `published` set with the installed `@gpuix/native` package, so the page cannot
 * offer a binary that does not exist or hide one that does.
 */
export function NativePlatforms() {
  return (
    <div
      className="not-prose my-4 overflow-x-auto"
      role="region"
      aria-label="Published GPUix native bindings"
      tabIndex={0}
    >
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-fd-border text-fd-muted-foreground">
            <th className="py-2 pr-4 font-medium">Platform</th>
            <th className="py-2 pr-4 font-medium">Rust target</th>
            <th className="py-2 font-medium">Prebuilt binary</th>
          </tr>
        </thead>
        <tbody>
          {nativePlatforms.map((platform) => (
            <tr
              key={platform.target}
              data-target={platform.target}
              data-published={platform.published ? "yes" : "no"}
              className="border-b border-fd-border align-top last:border-0"
            >
              <td className="py-2 pr-4 font-medium">{platform.label}</td>
              <td className="py-2 pr-4 font-mono text-sm">{platform.target}</td>
              <td className="py-2 text-sm">
                {platform.published
                  ? "Yes"
                  : "No — build the pinned source from this repository"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
