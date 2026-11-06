import { useEffect, useState, type ReactNode } from "react";

export type Runtime = "kubernetes" | "vm";

export type UploadPhase = "uploading" | "cancelled";

export interface DashboardManagementState {
  readonly runtime: Runtime;
  readonly dismissedToasts: ReadonlyArray<string>;
  readonly copiedKey: string | null;
  readonly selectedBuild: string | null;
  readonly upload: UploadPhase;
}

export const initialDashboardManagementState: DashboardManagementState = {
  runtime: "kubernetes",
  dismissedToasts: [],
  copiedKey: null,
  selectedBuild: null,
  upload: "uploading",
};

export const selectRuntime = (
  state: DashboardManagementState,
  runtime: Runtime,
): DashboardManagementState => ({ ...state, runtime });

export const dismissToast = (
  state: DashboardManagementState,
  id: string,
): DashboardManagementState => ({
  ...state,
  dismissedToasts: [...state.dismissedToasts, id],
});

export const copyKey = (
  state: DashboardManagementState,
  id: string,
): DashboardManagementState => ({ ...state, copiedKey: id });

export const clearCopy = (
  state: DashboardManagementState,
): DashboardManagementState =>
  state.copiedKey === null ? state : { ...state, copiedKey: null };

export const selectBuild = (
  state: DashboardManagementState,
  build: string,
): DashboardManagementState => ({ ...state, selectedBuild: build });

export const cancelUpload = (
  state: DashboardManagementState,
): DashboardManagementState => ({ ...state, upload: "cancelled" });

export const resumeUpload = (
  state: DashboardManagementState,
): DashboardManagementState => ({ ...state, upload: "uploading" });

const GLYPHS = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  pencil: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  copy: (
    <>
      <rect height="13" rx="2" width="13" x="8" y="8" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
  folder: (
    <path d="M4 20a2 2 0 0 0 2-2V6a2 2 0 0 1 2-2h3l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z" />
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  terminal: (
    <>
      <path d="m4 17 6-6-6-6" />
      <path d="M12 19h8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.6-3 8-7 10-4-2-7-5.4-7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="16" r="4" />
      <path d="m11 13 9-9 2 2-2 2 2 2-3 3-2-2-2 2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4 10-10" />,
  warning: (
    <>
      <path d="M12 3 2 20h20Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
} satisfies Record<string, ReactNode>;

type GlyphName = keyof typeof GLYPHS;

const Glyph = ({
  name,
  className = "gx-mgmt-glyph",
}: {
  readonly name: GlyphName;
  readonly className?: string;
}) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.7"
    viewBox="0 0 24 24"
  >
    {GLYPHS[name]}
  </svg>
);

const STATS = [
  { label: "Requests", value: "12,847", delta: "+4.2%", tone: "good" },
  { label: "P95", value: "421ms", delta: "-3ms", tone: "good" },
  { label: "Errors", value: "12", delta: "-8.1%", tone: "good" },
  { label: "Uptime", value: "99.98%", delta: "30d", tone: "flat" },
] as const;

const ACTIONS = [
  { id: "deploy", label: "New deployment", key: "⌘N", glyph: "plus" },
  { id: "logs", label: "Open logs", key: "⌘L", glyph: "terminal" },
] as const;

const NAVIGATION = [
  { id: "overview", label: "Overview", glyph: "shield" },
  { id: "deployments", label: "Deployments", glyph: "terminal" },
  { id: "keys", label: "API keys", glyph: "key" },
  { id: "notifications", label: "Notifications", glyph: "bell" },
] as const;

const RUNTIMES = [
  {
    id: "kubernetes",
    label: "Kubernetes",
    description: "GPU workloads on a K8s cluster. Default.",
  },
  {
    id: "vm",
    label: "Virtual machine",
    description: "Access a VM-configured cluster.",
  },
] as const;

const TOASTS = [
  {
    id: "deploy",
    title: "Deployment succeeded",
    description: "atlas-edge built in 1.2s",
    tone: "success",
  },
  {
    id: "quota",
    title: "Rate limit approaching",
    description: "92% of monthly quota used",
    tone: "warning",
  },
] as const;

const DEPLOYMENTS = [
  { build: "a9f3b1", env: "prod", status: "OK", tone: "success" },
  { build: "cc02ae", env: "prod", status: "OK", tone: "success" },
  { build: "7d21ee", env: "preview", status: "SLOW", tone: "warning" },
  { build: "4b11cd", env: "preview", status: "FAIL", tone: "danger" },
] as const;

const MENU = [
  { id: "rename", label: "Rename", key: "⌘R", glyph: "pencil" },
  { id: "duplicate", label: "Duplicate", key: "⌘D", glyph: "copy" },
  { id: "move", label: "Move to…", key: "", glyph: "folder" },
  { id: "delete", label: "Delete", key: "", glyph: "trash" },
] as const;

const API_KEYS = [
  {
    id: "production",
    label: "production",
    masked: "sk_live_**********8ra2",
    calls: "12,847 calls",
  },
  {
    id: "staging",
    label: "staging",
    masked: "sk_test_**********kf91",
    calls: "3,201 calls",
  },
  {
    id: "legacy-cron",
    label: "legacy-cron",
    masked: "sk_live_**********abc4",
    calls: "No calls",
  },
] as const;

export interface DashboardManagementActions {
  readonly selectRuntime: (runtime: Runtime) => void;
  readonly dismissToast: (id: string) => void;
  readonly copyKey: (id: string) => void;
  readonly selectBuild: (build: string) => void;
  readonly cancelUpload: () => void;
  readonly resumeUpload: () => void;
}

const NO_ACTIONS: DashboardManagementActions = {
  selectRuntime: () => undefined,
  dismissToast: () => undefined,
  copyKey: () => undefined,
  selectBuild: () => undefined,
  cancelUpload: () => undefined,
  resumeUpload: () => undefined,
};

const Card = ({
  children,
  className = "",
  id,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
}) => (
  <section className={`gx-mgmt-card ${className}`.trim()} id={id}>
    {children}
  </section>
);

const Head = ({
  title,
  description,
}: {
  readonly title: string;
  readonly description?: string;
}) => (
  <div className="gx-mgmt-head">
    <h2 className="gx-mgmt-title">{title}</h2>
    {description === undefined ? null : (
      <p className="gx-mgmt-desc">{description}</p>
    )}
  </div>
);

const Section = ({
  title,
  description,
  id,
  className,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly id?: string;
  readonly className?: string;
  readonly children: ReactNode;
}) => (
  <Card className={className} id={id}>
    <Head description={description} title={title} />
    {children}
  </Card>
);

const ServiceCard = () => (
  <Card id="gx-mgmt-overview">
    <div className="gx-mgmt-service">
      <span aria-hidden="true" className="gx-mgmt-dot" />
      <div>
        <h2 className="gx-mgmt-service-name">atlas-edge · production</h2>
        <p className="gx-mgmt-service-meta">Last deploy 2m ago · main@a9f3b1</p>
      </div>
    </div>
    <dl className="gx-mgmt-stats">
      {STATS.map((stat) => (
        <div className="gx-mgmt-stat" key={stat.label}>
          <dt className="gx-mgmt-stat-label">{stat.label}</dt>
          <dd className="gx-mgmt-stat-row">
            <span className="gx-mgmt-stat-value">{stat.value}</span>
            <span className="gx-mgmt-delta" data-tone={stat.tone}>
              {stat.delta}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  </Card>
);

const WorkspaceNav = () => (
  <nav aria-label="Workspace" className="gx-mgmt-nav">
    <p className="gx-mgmt-group-label">Workspace</p>
    {NAVIGATION.map((item) => (
      <button
        aria-current={item.id === "overview" ? "page" : undefined}
        className="gx-mgmt-row"
        key={item.id}
        onClick={() => {
          const main = document.querySelector(".gx-mgmt-main");
          if (main === null) return;
          const target = document.getElementById(`gx-mgmt-${item.id}`);
          if (target === null || !main.contains(target)) {
            main.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
          const delta =
            target.getBoundingClientRect().top -
            main.getBoundingClientRect().top;
          main.scrollBy({ top: delta - 12, behavior: "smooth" });
        }}
        type="button"
      >
        <Glyph name={item.glyph} />
        <span className="gx-mgmt-row-label">{item.label}</span>
      </button>
    ))}
  </nav>
);

const CommandPaletteCard = () => (
  <Section
    description="Search + jump across the entire app"
    title="Command palette"
  >
    <div className="gx-search-field gx-mgmt-search">
      <span className="gx-search-mark">
        <Glyph name="search" />
      </span>
      <input
        aria-label="Search commands"
        className="gx-search-input"
        id="gx-mgmt-command"
        name="command"
        placeholder="Search commands…"
        type="search"
      />
      <span className="gx-keycap">⌘K</span>
    </div>
    <div className="gx-mgmt-group">
      <p className="gx-mgmt-group-label">Actions</p>
      {ACTIONS.map((action) => (
        <button
          className="gx-mgmt-row"
          data-action={action.id}
          key={action.id}
          type="button"
        >
          <Glyph name={action.glyph} />
          <span className="gx-mgmt-row-label">{action.label}</span>
          <span className="gx-keycap">{action.key}</span>
        </button>
      ))}
    </div>
  </Section>
);

const ErrorCallout = () => (
  <Card className="gx-mgmt-danger">
    <div className="gx-mgmt-error-head">
      <Glyph className="gx-mgmt-glyph gx-mgmt-error-glyph" name="warning" />
      <div>
        <h2 className="gx-mgmt-title">Deployment failed</h2>
        <p className="gx-mgmt-error-text">
          TypeError at line 42 of main.ts: Missing env DATABASE_URL
        </p>
      </div>
    </div>
    <div className="gx-mgmt-actions">
      <button className="gx-btn gx-btn-primary gx-btn-sm" type="button">
        Restore env
      </button>
      <button className="gx-btn gx-btn-ghost gx-btn-sm" type="button">
        Dismiss
      </button>
    </div>
  </Card>
);

const UploadCard = ({
  upload,
  onCancel,
  onResume,
}: {
  readonly upload: UploadPhase;
  readonly onCancel: () => void;
  readonly onResume: () => void;
}) => {
  const cancelled = upload === "cancelled";
  return (
    <Section
      className="gx-mgmt-upload"
      description={
        cancelled
          ? "Upload cancelled · dataset.parquet"
          : "Chunked multipart upload in progress"
      }
      title="Upload · dataset.parquet"
    >
      <div
        aria-label="Upload progress"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={cancelled ? 0 : 55}
        className="gx-meter gx-mgmt-meter"
        role="progressbar"
      >
        <div className="gx-meter-track">
          <div
            className="gx-meter-fill"
            data-tone={cancelled ? "muted" : undefined}
            style={{ width: cancelled ? "0%" : "55%" }}
          />
        </div>
      </div>
      <div className="gx-mgmt-meter-row">
        <span className="gx-mgmt-meter-label">
          {cancelled ? "Cancelled" : "55% · 2.4 MB of 4.3 MB"}
        </span>
        <button
          className="gx-btn gx-btn-ghost gx-btn-sm gx-mgmt-resume"
          onClick={cancelled ? onResume : onCancel}
          type="button"
        >
          {cancelled ? "Resume" : "Cancel"}
        </button>
      </div>
    </Section>
  );
};

const RuntimeCard = ({
  runtime,
  onSelect,
}: {
  readonly runtime: Runtime;
  readonly onSelect: (runtime: Runtime) => void;
}) => (
  <Section
    description="Select the runtime for this cluster"
    title="Compute environment"
  >
    <div
      aria-label="Compute environment"
      className="gx-mgmt-radios"
      role="radiogroup"
    >
      {RUNTIMES.map((option) => {
        const selected = runtime === option.id;
        return (
          <div
            aria-checked={selected}
            className="gx-mgmt-radio-card"
            data-runtime={option.id}
            key={option.id}
            onClick={() => onSelect(option.id)}
            onKeyDown={(event) => {
              if (event.key !== " " && event.key !== "Enter") return;
              event.preventDefault();
              onSelect(option.id);
            }}
            role="radio"
            tabIndex={0}
          >
            <span className="gx-radio" data-checked={selected ? "" : undefined}>
              <span className="gx-radio-dot" />
            </span>
            <span className="gx-mgmt-radio-copy">
              <span className="gx-mgmt-radio-title">{option.label}</span>
              <span className="gx-mgmt-radio-desc">{option.description}</span>
            </span>
          </div>
        );
      })}
    </div>
  </Section>
);

const ToastStack = ({
  dismissed,
  onDismiss,
}: {
  readonly dismissed: ReadonlyArray<string>;
  readonly onDismiss: (id: string) => void;
}) => {
  const visible = TOASTS.filter((toast) => !dismissed.includes(toast.id));
  return (
    <div aria-label="Notifications" className="gx-mgmt-toasts" role="list">
      {visible.length === 0 ? (
        <p className="gx-mgmt-toasts-empty">No new notifications</p>
      ) : (
        visible.map((toast) => (
          <div
            className={`gx-toast-card gx-toast-${toast.tone} gx-mgmt-toast`}
            data-toast={toast.id}
            key={toast.id}
            role="listitem"
          >
            <Glyph
              className="gx-toast-glyph"
              name={toast.tone === "success" ? "check" : "warning"}
            />
            <div className="gx-toast-copy">
              <p className="gx-toast-title">{toast.title}</p>
              <p className="gx-toast-desc">{toast.description}</p>
            </div>
            <button
              aria-label={`Dismiss ${toast.title}`}
              className="gx-toast-dismiss"
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  );
};

const DeploymentsCard = ({
  selectedBuild,
  onSelect,
}: {
  readonly selectedBuild: string | null;
  readonly onSelect: (build: string) => void;
}) => (
  <Section id="gx-mgmt-deployments" title="Recent deployments">
    <table className="gx-mgmt-table">
      <thead>
        <tr>
          <th scope="col">Build</th>
          <th scope="col">Env</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {DEPLOYMENTS.map((deployment) => (
          <tr
            aria-selected={selectedBuild === deployment.build}
            data-build={deployment.build}
            key={deployment.build}
            onClick={() => onSelect(deployment.build)}
            onKeyDown={(event) => {
              if (event.key !== " " && event.key !== "Enter") return;
              event.preventDefault();
              onSelect(deployment.build);
            }}
            tabIndex={0}
          >
            <td className="gx-mgmt-build">{deployment.build}</td>
            <td>{deployment.env}</td>
            <td>
              <span
                className={`gx-badge gx-badge-sm gx-badge-${deployment.tone}`}
              >
                {deployment.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <button className="gx-btn gx-btn-outline gx-mgmt-debug" type="button">
      <Glyph className="gx-mgmt-glyph gx-mgmt-debug-glyph" name="terminal" />
      <span>Debug prod deploy failure</span>
      <Glyph className="gx-mgmt-glyph gx-mgmt-debug-chevron" name="chevron" />
    </button>
  </Section>
);

const MenuCard = () => {
  const [open, setOpen] = useState(false);
  return (
    <Section
      description="Rename, duplicate, move or delete atlas-edge."
      title="Deployment actions"
    >
      <p className="gx-mgmt-group-label">Popover · context menu</p>
      <div className="gx-mgmt-menu-wrap">
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          className="gx-btn gx-btn-outline gx-btn-sm gx-mgmt-menu-trigger"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span>Service actions</span>
          <Glyph className="gx-mgmt-glyph" name="chevron" />
        </button>
        {open ? (
          <div className="gx-mgmt-menu" role="menu">
            {MENU.map((item) => (
              <button
                className="gx-mgmt-menu-row"
                data-menu={item.id}
                data-tone={item.id === "delete" ? "danger" : undefined}
                key={item.id}
                role="menuitem"
                type="button"
              >
                <Glyph name={item.glyph} />
                <span className="gx-mgmt-row-label">{item.label}</span>
                {item.key === "" ? null : (
                  <span className="gx-keycap">{item.key}</span>
                )}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
};

const AllClearCard = () => (
  <Card className="gx-mgmt-clear">
    <Glyph className="gx-mgmt-shield" name="shield" />
    <p className="gx-mgmt-clear-title">All clear</p>
    <p className="gx-mgmt-clear-desc">
      No security alerts in the last 24 hours. Your agents, deploys, and keys
      are healthy.
    </p>
    <button className="gx-btn gx-btn-ghost gx-btn-sm" type="button">
      View audit log
    </button>
  </Card>
);

const ApiKeysCard = ({
  copiedKey,
  onCopy,
}: {
  readonly copiedKey: string | null;
  readonly onCopy: (id: string) => void;
}) => (
  <Section
    description="Issued against atlas-edge"
    id="gx-mgmt-keys"
    title="API keys"
  >
    <div className="gx-mgmt-keys">
      {API_KEYS.map((key) => (
        <div className="gx-mgmt-key" data-key={key.id} key={key.id}>
          <div className="gx-mgmt-key-top">
            <span className="gx-mgmt-key-name">{key.label}</span>
            <span className="gx-mgmt-key-calls">{key.calls}</span>
            <button
              aria-label={`Copy the ${key.label} key`}
              className="gx-btn gx-btn-ghost gx-btn-sm gx-mgmt-key-copy-btn"
              onClick={() => onCopy(key.id)}
              type="button"
            >
              {copiedKey === key.id ? "Copied" : "Copy"}
            </button>
          </div>
          <span className="gx-mgmt-key-value">{key.masked}</span>
        </div>
      ))}
    </div>
    <button
      className="gx-btn gx-btn-primary gx-btn-sm gx-mgmt-new-key"
      type="button"
    >
      + New key
    </button>
  </Section>
);

export const DashboardManagementView = ({
  state,
  actions = NO_ACTIONS,
}: {
  readonly state: DashboardManagementState;
  readonly actions?: DashboardManagementActions;
}) => (
  <div className="gx-mgmt">
    <div className="gx-mgmt-bar">
      <span aria-hidden="true" className="gx-mgmt-lights">
        <i />
        <i />
        <i />
      </span>
      <span className="gx-mgmt-bar-title">atlas-edge — Settings</span>
      <span className="gx-mgmt-env">Production</span>
    </div>
    <div className="gx-mgmt-body">
      <div className="gx-mgmt-side">
        <ServiceCard />
        <WorkspaceNav />
        <p className="gx-mgmt-side-foot">main@a9f3b1 · us-east-1</p>
      </div>
      <div className="gx-mgmt-main">
        <ErrorCallout />
        <RuntimeCard onSelect={actions.selectRuntime} runtime={state.runtime} />
        <UploadCard
          onCancel={actions.cancelUpload}
          onResume={actions.resumeUpload}
          upload={state.upload}
        />
        <DeploymentsCard
          onSelect={actions.selectBuild}
          selectedBuild={state.selectedBuild}
        />
        <ApiKeysCard copiedKey={state.copiedKey} onCopy={actions.copyKey} />
        <AllClearCard />
        <Section
          description="Deploy and quota events from the workspace."
          id="gx-mgmt-notifications"
          title="Notifications"
        >
          <ToastStack
            dismissed={state.dismissedToasts}
            onDismiss={actions.dismissToast}
          />
        </Section>
        <CommandPaletteCard />
        <MenuCard />
      </div>
    </div>
  </div>
);

export const DashboardManagementRender = () => {
  const [state, setState] = useState(initialDashboardManagementState);

  useEffect(() => {
    if (state.copiedKey === null) return undefined;
    const timer = setTimeout(() => setState(clearCopy), 1000);
    return () => clearTimeout(timer);
  }, [state.copiedKey]);

  return (
    <DashboardManagementView
      actions={{
        selectRuntime: (runtime) =>
          setState((current) => selectRuntime(current, runtime)),
        dismissToast: (id) => setState((current) => dismissToast(current, id)),
        copyKey: (id) => setState((current) => copyKey(current, id)),
        selectBuild: (build) =>
          setState((current) => selectBuild(current, build)),
        cancelUpload: () => setState(cancelUpload),
        resumeUpload: () => setState(resumeUpload),
      }}
      state={state}
    />
  );
};

export const dashboardManagementSource = `import { useEffect, useState } from "react";
import * as Option from "effect/Option";
import { Alert, AlertDescription, AlertTitle } from "@gpuixui/components/alert";
import { Badge } from "@gpuixui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gpuixui/components/card";
import { CopyButton } from "@gpuixui/components/copy-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@gpuixui/components/dropdown-menu";
import { EmptyState } from "@gpuixui/components/empty-state";
import { Keycap } from "@gpuixui/components/keyboard-shortcuts";
import { SearchInput } from "@gpuixui/components/search-input";
import { ToastProvider, useToast } from "@gpuixui/components/toast";
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "@gpuixui/data";
import { Icon } from "@gpuixui/icons";
import { Button, Progress, RadioGroup, Stack, Text } from "@gpuixui/primitives";
import { useTheme } from "@gpuixui/tokens/react";

const stats = [
  { label: "Requests", value: "12,847", delta: "+4.2%", tone: "success" },
  { label: "P95", value: "421ms", delta: "-3ms", tone: "success" },
  { label: "Errors", value: "12", delta: "-8.1%", tone: "success" },
  { label: "Uptime", value: "99.98%", delta: "30d", tone: "neutral" },
] as const;

const deployments = [
  { build: "a9f3b1", env: "prod", status: "OK", tone: "success" },
  { build: "cc02ae", env: "prod", status: "OK", tone: "success" },
  { build: "7d21ee", env: "preview", status: "SLOW", tone: "warning" },
  { build: "4b11cd", env: "preview", status: "FAIL", tone: "danger" },
] as const;

const keys = [
  { label: "production", value: "sk_live_**********8ra2", calls: "12,847 calls" },
  { label: "staging", value: "sk_test_**********kf91", calls: "3,201 calls" },
  { label: "legacy-cron", value: "sk_live_**********abc4", calls: "No calls" },
] as const;

function Stat({ stat }: { stat: (typeof stats)[number] }) {
  return (
    <Stack direction="column" gap="2xs" grow>
      <Text role="label" tone="muted">{stat.label}</Text>
      <Stack direction="row" gap="2xs" align="center">
        <Text role="h3">{stat.value}</Text>
        <Badge variant={stat.tone}>{stat.delta}</Badge>
      </Stack>
    </Stack>
  );
}

function ServiceCard() {
  const theme = useTheme();
  return (
    <Card variant="outline">
      <CardHeader>
        <Stack direction="row" gap="sm" align="center">
          <span style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: theme.colors.success }} />
          <Stack direction="column" gap="2xs" grow>
            <CardTitle>atlas-edge · production</CardTitle>
            <Text role="caption" tone="muted">Last deploy 2m ago · main@a9f3b1</Text>
          </Stack>
        </Stack>
      </CardHeader>
      <CardContent>
        <Stack direction="column" gap="sm">
          <Stack direction="row" gap="sm"><Stat stat={stats[0]} /><Stat stat={stats[1]} /></Stack>
          <Stack direction="row" gap="sm"><Stat stat={stats[2]} /><Stat stat={stats[3]} /></Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function WorkspaceNav() {
  return (
    <Stack direction="column" gap="2xs">
      {["Overview", "Deployments", "API keys", "Notifications"].map((label) => (
        <Button key={label} variant="ghost">{label}</Button>
      ))}
    </Stack>
  );
}

function ErrorCallout({ onRestore, onDismiss }: { onRestore: () => void; onDismiss: () => void }) {
  return (
    <Alert tone="danger">
      <AlertTitle>Deployment failed</AlertTitle>
      <AlertDescription>TypeError at line 42 of main.ts: Missing env DATABASE_URL</AlertDescription>
      <Stack direction="row" gap="sm">
        <Button variant="primary" onActivate={onRestore}>Restore env</Button>
        <Button variant="ghost" onActivate={onDismiss}>Dismiss</Button>
      </Stack>
    </Alert>
  );
}

function RuntimeCard({ runtime, onRuntime }: { runtime: string; onRuntime: (value: string) => void }) {
  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Compute environment</CardTitle>
        <Text role="caption" tone="muted">Select the runtime for this cluster</Text>
      </CardHeader>
      <CardContent>
        <RadioGroup
          label="Compute environment"
          value={runtime}
          onValueChange={onRuntime}
          options={[
            { value: "kubernetes", label: "Kubernetes", description: "GPU workloads on a K8s cluster. Default." },
            { value: "vm", label: "Virtual machine", description: "Access a VM-configured cluster." },
          ]}
        />
      </CardContent>
    </Card>
  );
}

function UploadCard({ progress, cancelled, onCancel, onResume }: { progress: number; cancelled: boolean; onCancel: () => void; onResume: () => void }) {
  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Upload · dataset.parquet</CardTitle>
        <Text role="caption" tone="muted">
          {cancelled ? "Upload cancelled · dataset.parquet" : "Chunked multipart upload in progress"}
        </Text>
      </CardHeader>
      <CardContent>
        <Progress value={cancelled ? 0 : progress} label="Upload progress" />
        <Stack direction="row" justify="between" align="center">
          <Text role="caption" tone="muted">{cancelled ? "Cancelled" : progress + "%"}</Text>
          <Button variant="ghost" onActivate={cancelled ? onResume : onCancel}>
            {cancelled ? "Resume" : "Cancel"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function DeploymentsCard({ selected, onSelect }: { selected: string | null; onSelect: (build: string) => void }) {
  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Recent deployments</CardTitle>
      </CardHeader>
      <CardContent>
        <Table aria-label="Recent deployments">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Build</TableHeaderCell>
              <TableHeaderCell>Env</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((row) => (
              <TableRow key={row.build} selected={selected === row.build} onClick={() => onSelect(row.build)}>
                <TableCell>{row.build}</TableCell>
                <TableCell>{row.env}</TableCell>
                <TableCell><Badge variant={row.tone}>{row.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button variant="outline">Debug prod deploy failure</Button>
      </CardContent>
    </Card>
  );
}

function ApiKeysCard() {
  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        <Text role="caption" tone="muted">Issued against atlas-edge</Text>
      </CardHeader>
      <CardContent>
        {keys.map((key) => (
          <Stack direction="column" gap="2xs" key={key.label}>
            <Stack direction="row" justify="between" align="center">
              <Text role="label">{key.label}</Text>
              <Text role="caption" tone="muted">{key.calls}</Text>
              <CopyButton text={key.value} label={"Copy the " + key.label + " key"} />
            </Stack>
            <Text role="caption" tone="muted">{key.value}</Text>
          </Stack>
        ))}
        <Button variant="primary">+ New key</Button>
      </CardContent>
    </Card>
  );
}

// The store owns the cards: the deploy handler pushes the success, the quota
// watcher pushes the warning. The section renders what the queue holds.
function StatusWatchers() {
  const { push } = useToast();
  useEffect(() => {
    push({ title: "Deployment succeeded", description: "atlas-edge built in 1.2s", tone: "success" });
    push({ title: "Rate limit approaching", description: "92% of monthly quota used", tone: "warning" });
  }, [push]);
  return null;
}

function NotificationsCard() {
  const { toasts, dismiss } = useToast();
  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <Text role="caption" tone="muted">Deploy and quota events from the workspace.</Text>
      </CardHeader>
      <CardContent>
        {toasts.length === 0 ? (
          <Text role="caption" tone="muted">No new notifications</Text>
        ) : null}
        {toasts.map((toast) => (
          <Stack direction="row" align="center" gap="sm" key={toast.id}>
            <Stack direction="column" gap="2xs" grow>
              <Text role="label">{toast.title}</Text>
              {Option.isSome(toast.description) ? (
                <Text role="caption" tone="muted">{toast.description.value}</Text>
              ) : null}
            </Stack>
            <Button variant="ghost" onActivate={() => dismiss(toast.id)}>×</Button>
          </Stack>
        ))}
      </CardContent>
    </Card>
  );
}

function CommandPalette() {
  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Command palette</CardTitle>
        <Text role="caption" tone="muted">Search + jump across the entire app</Text>
      </CardHeader>
      <CardContent>
        <Stack direction="row" align="center" gap="sm">
          <SearchInput placeholder="Search commands…" />
          <Keycap>⌘K</Keycap>
        </Stack>
        <Text role="label" tone="muted">Actions</Text>
        <Button variant="ghost">New deployment</Button>
        <Button variant="ghost">Open logs</Button>
      </CardContent>
    </Card>
  );
}

function MenuCard() {
  const theme = useTheme();
  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Deployment actions</CardTitle>
        <Text role="caption" tone="muted">Rename, duplicate, move or delete atlas-edge.</Text>
      </CardHeader>
      <CardContent>
        <Text role="caption" tone="muted">Popover · context menu</Text>
        <DropdownMenu>
          <DropdownMenuTrigger><Button variant="outline">Service actions</Button></DropdownMenuTrigger>
          <DropdownMenuContent label="Deployment actions">
            <DropdownMenuItem leading={<Icon name="pencil" color={theme.colors.mutedForeground} />} trailing={<Keycap>⌘R</Keycap>}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem leading={<Icon name="copy" color={theme.colors.mutedForeground} />} trailing={<Keycap>⌘D</Keycap>}>
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem leading={<Icon name="folder" color={theme.colors.mutedForeground} />}>
              Move to…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger" leading={<Icon name="trash" color={theme.colors.destructive} />}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

function AllClearCard({ onAudit }: { onAudit: () => void }) {
  const theme = useTheme();
  return (
    <Card variant="outline">
      <EmptyState
        icon={<Icon name="shield" color={theme.colors.success} size="lg" />}
        title="All clear"
        description="No security alerts in the last 24 hours. Your agents, deploys, and keys are healthy."
        action={<Button variant="ghost" onActivate={onAudit}>View audit log</Button>}
      />
    </Card>
  );
}

export function DashboardManagementPage() {
  const [runtime, setRuntime] = useState("kubernetes");
  const [selected, setSelected] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  return (
    <ToastProvider>
      <StatusWatchers />
      <Stack direction="row" gap="md" align="start">
        <Stack direction="column" gap="md" style={{ width: 320 }}>
          <ServiceCard />
          <WorkspaceNav />
          <Text role="caption" tone="muted">main@a9f3b1 · us-east-1</Text>
        </Stack>
        <Stack direction="column" gap="md" grow>
          <ErrorCallout onRestore={() => {}} onDismiss={() => {}} />
          <RuntimeCard runtime={runtime} onRuntime={setRuntime} />
          <UploadCard
            progress={55}
            cancelled={cancelled}
            onCancel={() => setCancelled(true)}
            onResume={() => setCancelled(false)}
          />
          <DeploymentsCard selected={selected} onSelect={setSelected} />
          <ApiKeysCard />
          <AllClearCard onAudit={() => {}} />
          <NotificationsCard />
          <CommandPalette />
          <MenuCard />
        </Stack>
      </Stack>
    </ToastProvider>
  );
}`;
