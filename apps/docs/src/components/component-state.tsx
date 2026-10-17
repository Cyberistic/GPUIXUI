import { bySlug } from "@/component-meta/registry";
import { supportMeaning } from "@/component-meta/support";

const badge =
  "rounded-md border border-fd-border px-2 py-0.5 text-xs font-medium";

export function ComponentState({ slug }: { slug: string }) {
  const record = bySlug.get(slug);
  if (record === undefined) {
    return (
      <p className="not-prose text-sm text-fd-muted-foreground">
        Unknown component “{slug}”.
      </p>
    );
  }

  return (
    <dl
      data-component-state={record.slug}
      className="not-prose my-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border border-fd-border bg-fd-card px-3 py-2 text-sm"
    >
      <dt className="text-fd-muted-foreground">Status</dt>
      <dd>
        <span className={badge} data-status={record.status}>
          {record.status}
        </span>
      </dd>
      <dt className="text-fd-muted-foreground">GPUix support</dt>
      <dd className="flex flex-wrap items-baseline gap-2">
        <span className={badge} data-gpuix={record.gpuix}>
          {record.gpuix}
        </span>
        <span className="text-fd-muted-foreground">
          {supportMeaning[record.gpuix]}
        </span>
      </dd>
      <dt className="text-fd-muted-foreground">Package</dt>
      <dd>
        <code>{record.packageName}</code>
      </dd>
      {record.limitations.length > 0 ? (
        <>
          <dt className="text-fd-muted-foreground">Limitations</dt>
          <dd>
            <ul className="list-disc pl-4">
              {record.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </dd>
        </>
      ) : null}
    </dl>
  );
}
