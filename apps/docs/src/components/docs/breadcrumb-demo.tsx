import { useState, type ReactNode } from "react";
import {
  BUDGETS,
  CRUMBS,
  collapseCrumbs,
  openLabel,
  separatorCount,
  type Crumb,
  type CrumbEntry,
} from "./breadcrumb-preview";

/**
 * Browser previews for the Breadcrumb page.
 *
 * The shipped trail is declarative and `maxItems` collapses its middle; the
 * drawing takes the same rule (`collapseCrumbs` mirrors the component's
 * `collapse`, and its test holds the two together), so changing the budget
 * hides an entry *and* its separator instead of re-labelling a picture.
 *
 * The paint is the library's: the list is `flex-wrap` at the caption type role,
 * a link is `mutedForeground` and hovers to `foreground`, and the current page
 * is plain `foreground` text marked `aria-selected` — 0.11.0 has no
 * `aria-current`. The preview's crumbs are `<button>`s because a drawing has to
 * be pressable; the component's are `role="link"` divs.
 */

function Trail({
  entries,
  separator = "/",
  label = "Breadcrumb",
  onOpen,
}: {
  readonly entries: ReadonlyArray<CrumbEntry>;
  readonly separator?: string;
  readonly label?: string;
  readonly onOpen?: (entry: Crumb) => void;
}): ReactNode {
  return (
    <nav aria-label={label} className="gx-breadcrumb">
      <ol className="gx-breadcrumb-list">
        {entries.map((entry, index) => (
          <li className="gx-breadcrumb-item" key={`${entry.kind}-${index}`}>
            {index === 0 ? null : (
              <span aria-hidden="true" className="gx-breadcrumb-sep">
                {separator}
              </span>
            )}
            {entry.kind === "ellipsis" ? (
              <span aria-label="More" className="gx-breadcrumb-ellipsis">
                …
              </span>
            ) : entry.item.current === true ? (
              <span aria-selected="true" className="gx-breadcrumb-page">
                {entry.item.label}
              </span>
            ) : (
              <button
                className="gx-breadcrumb-link"
                onClick={() => onOpen?.(entry.item)}
                type="button"
              >
                {entry.item.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** A repository trail with the budget as a control, the composition the component is for. */
const BreadcrumbWorkflow = (): ReactNode => {
  const [budget, setBudget] = useState<number | "all">(BUDGETS[1]);
  const [opened, setOpened] = useState("Nothing opened yet");
  const entries = collapseCrumbs(
    CRUMBS,
    budget === "all" ? CRUMBS.length : budget,
  );

  return (
    <div className="gx-demo-breadcrumb">
      <div className="gx-breadcrumb-scene">
        <div className="gx-breadcrumb-head">
          <div>
            <p className="gx-breadcrumb-title">Repository</p>
            <p className="gx-breadcrumb-subtitle">
              The trail to a file, collapsed to a budget
            </p>
          </div>
          <div
            aria-label="Collapse budget"
            className="gx-breadcrumb-budget"
            role="group"
          >
            {[...BUDGETS, "all" as const].map((value) => (
              <button
                aria-pressed={budget === value}
                className={`gx-btn gx-btn-sm ${
                  budget === value ? "gx-btn-secondary" : "gx-btn-ghost"
                }`}
                key={value}
                onClick={() => setBudget(value)}
                type="button"
              >
                {value === "all" ? "All" : value}
              </button>
            ))}
          </div>
        </div>
        <div className="gx-breadcrumb-bar">
          <Trail
            entries={entries}
            onOpen={(entry) =>
              setOpened(openLabel(CRUMBS, CRUMBS.indexOf(entry)))
            }
          />
          <span className="gx-breadcrumb-count">
            {separatorCount(entries)} separators · {entries.length} entries
          </span>
        </div>
      </div>
      <p aria-live="polite" className="gx-breadcrumb-readout" role="status">
        maxItems={budget} · {opened}
      </p>
      <p className="gx-breadcrumb-hint">
        Below three the budget is clamped, because a trail needs its start, a
        gap and its end. A hidden entry takes its separator with it: the count
        above follows what is rendered, not what was authored.
      </p>
    </div>
  );
};

interface StateTileProps {
  readonly title: string;
  readonly note: string;
  readonly crumbs: ReadonlyArray<Crumb>;
  readonly maxItems?: number;
  readonly separator?: string;
}

const BreadcrumbTile = ({
  title,
  note,
  crumbs,
  maxItems,
  separator,
}: StateTileProps): ReactNode => {
  const entries =
    maxItems === undefined
      ? collapseCrumbs(crumbs, crumbs.length)
      : collapseCrumbs(crumbs, maxItems);

  return (
    <div className="gx-breadcrumb-tile">
      <p className="gx-breadcrumb-tile-title">{title}</p>
      <div className="gx-breadcrumb-tile-rail">
        <Trail entries={entries} label={title} separator={separator ?? "/"} />
      </div>
      <p className="gx-breadcrumb-tile-note">{note}</p>
    </div>
  );
};

/** Two levels, a custom separator, a collapsed middle and a clamped budget. */
const BreadcrumbStates = (): ReactNode => (
  <div className="gx-demo-breadcrumb">
    <div className="gx-breadcrumb-tiles">
      <BreadcrumbTile
        crumbs={[
          { label: "Projects" },
          { label: "settings.tsx", current: true },
        ]}
        note="No maxItems: every entry renders, and the last is the page."
        title="Two levels"
      />
      <BreadcrumbTile
        crumbs={[
          { label: "Projects" },
          { label: "GPUIXUI" },
          { label: "readme.md", current: true },
        ]}
        note="separator accepts a node, so a chevron replaces the slash."
        separator="›"
        title="A custom separator"
      />
      <BreadcrumbTile
        crumbs={CRUMBS}
        maxItems={4}
        note="First, ellipsis, tail — the current page never collapses away."
        title="A collapsed middle"
      />
      <BreadcrumbTile
        crumbs={CRUMBS}
        maxItems={1}
        note="maxItems={1} is clamped to three entries, not one."
        title="A budget below three"
      />
    </div>
    <p className="gx-breadcrumb-hint">
      The list is <code>flex-wrap</code>: a trail longer than the bar wraps
      rather than clipping, and collapse is a budget rather than an overflow
      strategy.
    </p>
  </div>
);

const workflowSource = `import { useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@gpuixui/components/breadcrumb";

const PATH = ["Projects", "GPUIXUI", "packages", "components", "src", "breadcrumb.tsx"];

export const RepositoryTrail = () => {
  const [maxItems, setMaxItems] = useState(4);

  return (
    <>
      <Breadcrumb maxItems={maxItems}>
        <BreadcrumbList>
          {PATH.map((label, index) => {
            const current = index === PATH.length - 1;
            return (
              <BreadcrumbItem key={label}>
                {index === 0 ? null : <BreadcrumbSeparator />}
                {current ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink onSelect={() => open(index)}>
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <button onClick={() => setMaxItems(maxItems === 4 ? 3 : maxItems + 1)}>
        Budget: {maxItems}
      </button>
    </>
  );
};`;

const statesSource = `import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@gpuixui/components/breadcrumb";

// No maxItems: the trail renders whole.
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink onSelect={() => go("Projects")}>Projects</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>settings.tsx</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>;

// A custom glyph, and a budget that keeps the first entry and the page.
<Breadcrumb maxItems={4} separator="›">
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink onSelect={() => go("Projects")}>Projects</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbItem>
      <BreadcrumbLink onSelect={() => go("GPUIXUI")}>GPUIXUI</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbItem>
      <BreadcrumbLink onSelect={() => go("packages")}>packages</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbItem>
      <BreadcrumbLink onSelect={() => go("components")}>components</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbItem>
      <BreadcrumbLink onSelect={() => go("src")}>src</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbItem>
      <BreadcrumbPage>breadcrumb.tsx</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>;`;

export {
  BreadcrumbStates,
  BreadcrumbWorkflow,
  statesSource as breadcrumbStatesSource,
  workflowSource as breadcrumbWorkflowSource,
};
