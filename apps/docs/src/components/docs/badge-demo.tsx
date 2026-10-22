/**
 * Browser previews for the Badge page.
 *
 * The shipped badge is a GPUix host tree: one `div` with a recipe-compiled
 * pill, and no role, tab stop or press of its own. The preview cannot mount it,
 * so it draws the same shapes from the theme bridge and says so. The rules that
 * can be wrong — the status vocabulary, the filter and the press route the pill
 * leaves to its row — live in `badge-preview.ts` so a test can fail on them;
 * this file only renders them. The deployments panel around the pills is app
 * composition, not a component.
 */

import { useState } from "react";
import {
  badgeSizes,
  badgeVariantFor,
  badgeVariants,
  deploymentFilters,
  deploymentStatuses,
  describeDeployments,
  initialDeployments,
  pressTarget,
  statusText,
  visibleDeployments,
  type BadgeSize,
  type BadgeVariant,
  type Deployment,
  type DeploymentFilter,
  type PressSurface,
} from "./badge-preview";
import { usePlatform } from "./platform-toggle";

/** The word each variant is shown with: a label, a state or a version. */
const sampleText: Readonly<Record<BadgeVariant, string>> = {
  neutral: "main",
  primary: "Production",
  success: "Passed",
  warning: "Deprecated",
  danger: "Failed",
  info: "Running",
  outline: "v1.4.2",
};

interface PillProps {
  readonly children: string;
  readonly variant?: BadgeVariant;
  readonly size?: BadgeSize;
}

/**
 * One badge.
 *
 * The pill is out of the pointer, exactly as the shipped component declares it:
 * a filled child is the boundary the runtime's hit test stops counting at, so a
 * status pill in a selectable row must not swallow the row's press.
 */
const Pill = ({ children, variant = "neutral", size = "md" }: PillProps) => (
  <span
    className={`gx-badge gx-badge-${variant} gx-badge-${size}`}
    data-badge="true"
  >
    {children}
  </span>
);

/** A labelled run of pills, as the states preview prints them. */
const Run = ({
  children,
  label,
}: {
  readonly children: React.ReactNode;
  readonly label: string;
}) => (
  <div aria-label={label} className="gx-badge-run" role="group">
    <p className="gx-badge-run-label">{label}</p>
    <div className="gx-badge-row">{children}</div>
  </div>
);

/** Whether a press landed on a pill rather than the row around it. */
const landedOnPill = (target: EventTarget): boolean =>
  target instanceof Element && target.closest("[data-badge]") !== null;

/** The deployment row: the version, its branch label and its status pill. */
const DeploymentRow = ({
  deployment,
  selected,
  eagerPill,
  onPress,
}: {
  readonly deployment: Deployment;
  readonly selected: boolean;
  readonly eagerPill: boolean;
  readonly onPress: (surface: PressSurface) => void;
}) => (
  <li className="gx-badge-deploy">
    <button
      aria-pressed={selected}
      className="gx-badge-deploy-row"
      data-selected={selected ? "" : undefined}
      onClick={(event) => {
        const pill = landedOnPill(event.target);
        onPress(pill ? (eagerPill ? "eager-pill" : "status-pill") : "row");
      }}
      type="button"
    >
      <span className="gx-badge-deploy-copy">
        <span className="gx-badge-deploy-name">{deployment.name}</span>
        <span className="gx-badge-deploy-when">{deployment.when}</span>
      </span>
      <span className="gx-badge-deploy-meta">
        <Pill size="sm" variant="outline">
          {deployment.branch}
        </Pill>
        <span
          className={`gx-badge gx-badge-${badgeVariantFor(deployment.status)} gx-badge-sm`}
          data-badge="true"
          data-eager={eagerPill ? "" : undefined}
        >
          {statusText(deployment.status)}
        </span>
      </span>
    </button>
  </li>
);

/**
 * The interactive preview: a deployments panel with a filter and selectable
 * rows.
 *
 * The panel is app composition — the shipped `Badge` draws one pill and owns
 * nothing around it. Two measured routes are reachable here: a press on the
 * status pill selects its row, and the same pill handed the pointer by the
 * caller (`badge-eager` in the live probe) selects nothing.
 */
export function BadgeWorkflowBody() {
  const [filter, setFilter] = useState<DeploymentFilter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [route, setRoute] = useState<string>("");
  const [eagerPill, setEagerPill] = useState(false);

  const shown = visibleDeployments(initialDeployments, filter);
  const chosen = initialDeployments.find(
    (deployment) => deployment.id === selected,
  );

  const press = (surface: PressSurface): void => {
    const target = pressTarget(surface);
    setRoute(
      surface === "status-pill"
        ? "press landed on the status pill → the row heard it"
        : surface === "eager-pill"
          ? "press landed on a pill handed the pointer → the row heard nothing"
          : "press landed on the row",
    );
    if (target === "none") return;
    setSelected((current) => (current === chosen?.id ? null : selected));
  };

  return (
    <div className="gx-badge-demo">
      <div className="gx-badge-head">
        <div>
          <p className="gx-badge-title">Deployments</p>
          <p className="gx-badge-readout">{describeDeployments(shown)}</p>
        </div>
        <div className="gx-badge-filters">
          {deploymentFilters.map((entry) => (
            <button
              aria-pressed={filter === entry}
              className="gx-badge-choice"
              data-chosen={filter === entry ? "" : undefined}
              key={entry}
              onClick={() => setFilter(entry)}
              type="button"
            >
              {entry === "all" ? "All" : statusText(entry)}
            </button>
          ))}
        </div>
      </div>

      <ul className="gx-badge-deploys">
        {shown.map((deployment) => (
          <DeploymentRow
            deployment={deployment}
            eagerPill={eagerPill}
            key={deployment.id}
            onPress={press}
            selected={deployment.id === selected}
          />
        ))}
      </ul>

      <label className="gx-badge-eager">
        <input
          checked={eagerPill}
          onChange={(event) => setEagerPill(event.target.checked)}
          type="checkbox"
        />
        Hand the status pill the pointer (the <code>badge-eager</code> control)
      </label>

      <p className="gx-badge-status" role="status">
        {route === ""
          ? "Press a row, or the pill inside it, and watch which handler runs."
          : route}
      </p>
      {chosen === undefined ? null : (
        <p className="gx-badge-selected">
          Selected <b>{chosen.name}</b> · {statusText(chosen.status)} ·{" "}
          {chosen.branch}
        </p>
      )}

      <p className="gx-badge-foot">
        The panel, its filter and the eager-pill control are the preview&apos;s
        composition; the shipped <code>Badge</code> draws one pill. Its fill is
        never the only signal, so every state is printed as a word.
      </p>
    </div>
  );
}

/** The still preview: every variant, both sizes, and the outline's edge. */
export function BadgeStatesBody() {
  return (
    <div className="gx-badge-demo">
      <Run label="Variants">
        {badgeVariants.map((variant) => (
          <span className="gx-badge-state" key={variant}>
            <Pill variant={variant}>{sampleText[variant]}</Pill>
            <span className="gx-badge-state-label">{variant}</span>
          </span>
        ))}
      </Run>

      <Run label="Sizes">
        {badgeSizes.map((size) => (
          <span className="gx-badge-state" key={size}>
            <Pill size={size} variant="success">
              Passed
            </Pill>
            <span className="gx-badge-state-label">{size}</span>
          </span>
        ))}
      </Run>

      <Run label="Outline on the surface it sits on">
        <span className="gx-badge-stage" data-wash="page">
          <Pill variant="outline">v1.4.2</Pill>
          <span className="gx-badge-state-label">page</span>
        </span>
        <span className="gx-badge-stage" data-wash="hover">
          <Pill variant="outline">v1.4.2</Pill>
          <span className="gx-badge-state-label">hover wash</span>
        </span>
        <span className="gx-badge-stage" data-wash="selected">
          <Pill variant="outline">v1.4.2</Pill>
          <span className="gx-badge-state-label">selected row</span>
        </span>
      </Run>

      <Run label="States">
        {deploymentStatuses.map((status) => (
          <span className="gx-badge-state" key={status}>
            <Pill variant={badgeVariantFor(status)}>{statusText(status)}</Pill>
            <span className="gx-badge-state-label">{status}</span>
          </span>
        ))}
      </Run>

      <p className="gx-badge-foot">
        Every state is printed as a word beside its tint. The outline pill is the
        one variant with no fill, so its edge carries it on every wash a row
        wears.
      </p>
    </div>
  );
}

/** The panel on the platform switch's theme. */
export const BadgeWorkflow = () => {
  const { look, platform } = usePlatform();
  return <BadgeWorkflowBody key={`${platform}-${look}`} />;
};

/** The states on the platform switch's theme. */
export const BadgeStates = () => {
  const { look, platform } = usePlatform();
  return <BadgeStatesBody key={`${platform}-${look}`} />;
};

const workflowSource = `import { useState } from "react";
import { Badge } from "@gpuixui/components/badge";

// A panel is app composition: the shipped Badge draws one pill, and the
// caller owns the rows, the filter and the selection.
const deployments = [
  { name: "api-1.4.2", branch: "release/1.4", status: "passed" },
  { name: "web-2.0.0", branch: "main", status: "failed" },
  { name: "search-index", branch: "main", status: "running" },
];

export const Deployments = () => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {deployments.map((deployment) => (
        <button
          key={deployment.name}
          onClick={() => setSelected(deployment.name)}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 12,
            paddingRight: 12,
            height: 36,
          }}
        >
          <text>{deployment.name}</text>
          {/* The pill takes no pointer, so this press reaches the row. */}
          <Badge variant="outline" size="sm">
            {deployment.branch}
          </Badge>
          <Badge
            variant={deployment.status === "failed" ? "danger" : "success"}
            size="sm"
          >
            {deployment.status === "failed" ? "Failed" : "Passed"}
          </Badge>
        </button>
      ))}
      <text>{selected === null ? "Nothing selected" : \`Selected \${selected}\`}</text>
    </div>
  );
};`;

const statesSource = `import { Badge } from "@gpuixui/components/badge";

// A badge is a label, not a control: no tab stop, no press, no dismiss.
<Badge>main</Badge>
<Badge variant="primary">Production</Badge>
<Badge variant="success" size="sm">Passed</Badge>
<Badge variant="warning">Deprecated</Badge>
<Badge variant="danger" size="sm">Failed</Badge>
<Badge variant="info">Running</Badge>
<Badge variant="outline" size="sm">v1.4.2</Badge>;

// An interactive badge is a Button with the pill's styling, not a Badge.
<Badge style={{ pointerEvents: "auto" }}>Opted back in</Badge>;`;

export {
  statesSource as badgeStatesSource,
  workflowSource as badgeWorkflowSource,
};
