import { spans } from "../../lib/inventory";
import { licenseRecords, missingArtifacts } from "../../lib/licenses-data";

/**
 * The licence inventory, rendered from `LICENSES/*.md`.
 *
 * The page does not restate a licence: it mounts this table, so the record and
 * the page are the same document. A record that names what we take but not what
 * we leave out is a provenance claim with no boundary, so both columns are
 * always shown. An empty directory is a build bug, not an empty page.
 */
export function LicenseInventory() {
  if (licenseRecords.length === 0) {
    throw new Error(
      "LicenseInventory: LICENSES/ carries no readable record to render",
    );
  }

  return (
    <div className="not-prose my-6">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-left">
              <th className="px-3 py-2 font-semibold">Reference</th>
              <th className="px-3 py-2 font-semibold">Licence</th>
              <th className="px-3 py-2 font-semibold">What we take</th>
              <th className="px-3 py-2 font-semibold">What we do not take</th>
            </tr>
          </thead>
          <tbody>
            {licenseRecords.map((record) => (
              <tr
                className="border-b border-border align-top last:border-0"
                key={record.file}
              >
                <td className="px-3 py-2">
                  <span className="font-medium text-foreground">
                    {record.title}
                  </span>
                  <a
                    className="block font-mono text-xs text-muted-foreground underline"
                    href={record.source}
                  >
                    {record.source}
                  </a>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <Prose text={record.licence} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <Prose text={record.uses} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <Prose text={record.exclusions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {missingArtifacts.length === 0 ? null : (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Release artefacts still missing from{" "}
          <code className="text-foreground">LICENSES/</code>:{" "}
          {missingArtifacts.join(", ")}.
        </p>
      )}
    </div>
  );
}

/** A cell's Markdown without an MDX pipeline: inline code, bold, line breaks. */
const Prose = ({ text }: { readonly text: string }) => (
  <p className="m-0 whitespace-pre-line">
    {spans(text).map((span, index) =>
      span.code ? (
        <code
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em]"
          key={index}
        >
          {span.text}
        </code>
      ) : span.strong ? (
        <strong className="text-foreground" key={index}>
          {span.text}
        </strong>
      ) : (
        <span key={index}>{span.text}</span>
      ),
    )}
  </p>
);
