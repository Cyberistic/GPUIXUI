import { avatarSize } from "@gpuixui/tokens";
import { useState, type ReactNode } from "react";
import {
  SIDEBAR_MODES,
  collapseLabel,
  panelOffset,
  panelWidth,
  type SidebarMode,
} from "./sidebar-preview";
import { MENU_WIDTH } from "./user-menu-preview";

/**
 * Browser previews for the Sidebar and User menu pages.
 *
 * The shipped sidebar is a GPUix tree — a width tween, an anchored mobile sheet
 * and a modal's focus rules — so the page cannot mount it. This drawing is the
 * same window the sheet and drawer pages draw: an app bar, the panel at the
 * component's widths as the window's left column, and the inset beside it. The
 * paint is the browser's and the page says so; the behaviour the component
 * promises is measured natively.
 */

const USER = {
  name: "Benji van der Brand",
  email: "benji@example.com",
} as const;

/** A drawn portrait for the identity: a picture, not an initials disc. */
const PORTRAIT = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0F766E"/><circle cx="16" cy="12" r="6" fill="#CCFBF1"/><path d="M4 32c0-7 5.4-12 12-12s12 5 12 12z" fill="#CCFBF1"/></svg>`,
)}`;

const glyph = (path: ReactNode) => (
  <svg
    aria-hidden="true"
    fill="none"
    height="16"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="16"
  >
    {path}
  </svg>
);

const MARK = {
  terminal: glyph(
    <>
      <path d="m4 17 6-6-6-6" />
      <path d="M12 19h8" />
    </>,
  ),
  home: glyph(
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </>,
  ),
  bot: glyph(
    <>
      <rect height="12" width="16" x="4" y="8" rx="2" />
      <path d="M12 8V4H8" />
      <path d="M9 13v2M15 13v2" />
    </>,
  ),
  settings: glyph(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>,
  ),
  updown: glyph(
    <>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </>,
  ),
  sparkles: glyph(
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
    </>,
  ),
  badge: glyph(
    <>
      <path d="M12 3l2.4 1.7 2.9-.2 1 2.7 2.3 1.8-1 2.8 1 2.8-2.3 1.8-1 2.7-2.9-.2L12 21l-2.4-1.7-2.9.2-1-2.7L3.4 15l1-2.8-1-2.8 2.3-1.8 1-2.7 2.9.2z" />
      <path d="m9 12 2 2 4-4" />
    </>,
  ),
  card: glyph(
    <>
      <rect height="14" width="20" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
    </>,
  ),
  bell: glyph(
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>,
  ),
  logout: glyph(
    <>
      <path d="M9 4H5v16h4" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </>,
  ),
};

const ITEMS = [
  { id: "playground", label: "Playground", mark: MARK.home },
  { id: "models", label: "Models", mark: MARK.bot },
  { id: "settings", label: "Settings", mark: MARK.settings },
] as const;

const RUNS = [
  { id: "run-1042", label: "Landing page copy", state: "done", ms: "1.2s" },
  { id: "run-1038", label: "Release notes", state: "done", ms: "0.9s" },
  { id: "run-1031", label: "Changelog digest", state: "failed", ms: "2.4s" },
] as const;

/** The identity disc: the picture every place the same person appears paints. */
const Identity = ({ size }: { readonly size: "sm" | "md" }) => {
  const diameter = avatarSize[size];
  return (
    <span
      aria-hidden="true"
      className="gx-avatar"
      style={{ height: diameter, width: diameter }}
    >
      <span className="gx-avatar-disc">
        <img alt="" className="gx-avatar-photo" src={PORTRAIT} />
      </span>
    </span>
  );
};

/** One row of the account menu: a mark and its label. */
const AccountRow = ({
  label,
  mark,
  onSelect,
  destructive = false,
}: {
  readonly label: string;
  readonly mark: ReactNode;
  readonly onSelect: () => void;
  readonly destructive?: boolean;
}) => (
  <button
    className="gx-user-item"
    data-destructive={destructive ? "" : undefined}
    onClick={onSelect}
    type="button"
  >
    {mark}
    <span className="gx-user-item-label">{label}</span>
  </button>
);

/**
 * The identity row and its dropdown.
 *
 * `side="right"` — the default a reader expects from a sidebar footer — puts the
 * menu beside the row, over the page rather than over the panel it belongs to.
 * `side="bottom"` is still available for a footer with no room beside it.
 */
const AccountMenu = ({
  collapsed,
  side,
  defaultOpen = false,
  onAction,
}: {
  readonly collapsed: boolean;
  readonly side: "bottom" | "right";
  readonly defaultOpen?: boolean;
  readonly onAction: (action: string) => void;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const identity = (
    <span className="gx-user-identity">
      <span className="gx-user-name">{USER.name}</span>
      <span className="gx-user-email">{USER.email}</span>
    </span>
  );
  const select = (action: string) => {
    setOpen(false);
    onAction(action);
  };

  return (
    <div className="gx-user-menu">
      <button
        aria-expanded={open}
        aria-label={`${USER.name} account menu`}
        className="gx-user-trigger"
        data-collapsed={collapsed ? "" : undefined}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Identity size={collapsed ? "sm" : "md"} />
        {collapsed ? null : (
          <>
            {identity}
            {MARK.updown}
          </>
        )}
      </button>
      {open ? (
        <div
          className="gx-user-menu-content"
          data-align="end"
          data-side={side}
          role="menu"
          style={{ width: MENU_WIDTH }}
        >
          <div className="gx-user-menu-identity">
            <Identity size="md" />
            {identity}
          </div>
          <span className="gx-user-separator" role="separator" />
          <AccountRow
            label="Upgrade to Pro"
            mark={MARK.sparkles}
            onSelect={() => select("Upgrade to Pro")}
          />
          <span className="gx-user-separator" role="separator" />
          <AccountRow
            label="Account"
            mark={MARK.badge}
            onSelect={() => select("Account")}
          />
          <AccountRow
            label="Billing"
            mark={MARK.card}
            onSelect={() => select("Billing")}
          />
          <AccountRow
            label="Notifications"
            mark={MARK.bell}
            onSelect={() => select("Notifications")}
          />
          <span className="gx-user-separator" role="separator" />
          <AccountRow
            destructive
            label="Log out"
            mark={MARK.logout}
            onSelect={() => select("Log out")}
          />
        </div>
      ) : null}
    </div>
  );
};

/**
 * The panel: the window's left column at the component's widths.
 *
 * The width and the offcanvas travel are the layout's, not the style sheet's,
 * because they follow the collapse state; the paint is in `demos.css`.
 */
export const SidebarPanel = ({
  mode,
  open,
  onAction,
}: {
  readonly mode: SidebarMode;
  readonly open: boolean;
  readonly onAction?: (action: string) => void;
}) => {
  const [active, setActive] = useState("playground");
  const icons = mode === "icon" && !open;
  const select = onAction ?? (() => undefined);

  return (
    <div
      className="gx-sidebar-panel"
      data-collapsible={mode}
      data-state={open ? "expanded" : "collapsed"}
      style={{
        marginLeft: panelOffset(mode, open),
        width: panelWidth(mode, open),
      }}
    >
      <div className="gx-sidebar-header">
        <button
          className="gx-sidebar-brand"
          onClick={() => select("Acme Inc")}
          type="button"
        >
          {MARK.terminal}
          {icons ? null : <span>Acme Inc</span>}
        </button>
      </div>
      <div className="gx-sidebar-content">
        {icons ? null : (
          <span className="gx-sidebar-group-label">Platform</span>
        )}
        {ITEMS.map((item) => (
          <button
            className="gx-sidebar-row"
            data-active={active === item.id ? "" : undefined}
            key={item.id}
            onClick={() => setActive(item.id)}
            type="button"
          >
            {item.mark}
            {icons ? null : (
              <span className="gx-sidebar-row-label">{item.label}</span>
            )}
          </button>
        ))}
      </div>
      <div className="gx-sidebar-footer">
        <AccountMenu
          collapsed={icons}
          onAction={select}
          side={icons ? "right" : "bottom"}
        />
      </div>
    </div>
  );
};

/** The content beside the panel: the room the gap reserves, with real rows. */
const SidebarInset = () => (
  <div className="gx-sidebar-inset">
    <div className="gx-sidebar-inset-bar">
      <span className="gx-sidebar-inset-title">Playground</span>
      <button className="gx-btn gx-btn-secondary gx-btn-sm" type="button">
        Run
      </button>
    </div>
    <div className="gx-sidebar-inset-body">
      <label className="gx-sidebar-prompt">
        <span>Prompt</span>
        <input
          className="gx-field"
          defaultValue="Summarise the release notes"
        />
      </label>
      <ul className="gx-sidebar-runs">
        {RUNS.map((run) => (
          <li className="gx-sidebar-run" data-state={run.state} key={run.id}>
            <span aria-hidden="true" className="gx-sidebar-run-dot" />
            <span className="gx-sidebar-run-title">{run.label}</span>
            <span className="gx-sidebar-run-meta">
              {run.id} · {run.ms}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

/** The window: the panel on its left, the inset beside it, the controls above. */
export const SidebarDemo = () => {
  const [mode, setMode] = useState<SidebarMode>("icon");
  const [open, setOpen] = useState(true);
  const [last, setLast] = useState("none");

  return (
    <div className="gx-demo gx-drawer-scene">
      <div className="gx-drawer-toolbar">
        <div aria-label="Collapsible mode" className="gx-tgroup" role="group">
          {SIDEBAR_MODES.map((entry) => (
            <button
              aria-pressed={mode === entry}
              className="gx-btn gx-toggle"
              data-pressed={mode === entry ? "" : undefined}
              key={entry}
              onClick={() => setMode(entry)}
              type="button"
            >
              {entry}
            </button>
          ))}
        </div>
        <button
          aria-expanded={open}
          aria-label={collapseLabel(open)}
          className="gx-btn gx-btn-secondary"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {collapseLabel(open)}
        </button>
      </div>
      <div className="gx-drawer-frame gx-sidebar-frame">
        <div className="gx-drawer-appbar">
          <span className="gx-drawer-apptitle">Acme Inc</span>
          <span className="gx-drawer-readout">
            collapsible=&quot;{mode}&quot; · state=&quot;
            {open ? "expanded" : "collapsed"}&quot;
          </span>
        </div>
        <div className="gx-sidebar-body">
          <SidebarPanel mode={mode} onAction={setLast} open={open} />
          <SidebarInset />
        </div>
      </div>
      <p className="gx-drawer-hint" role="status">
        Last action: {last}.
      </p>
    </div>
  );
};

/** The account row in a right-hand footer, on the window it belongs to. */
export const UserMenuDemo = () => {
  const [last, setLast] = useState("none");
  return (
    <div className="gx-demo gx-drawer-scene">
      <div className="gx-user-stage">
        <div className="gx-drawer-appbar">
          <span className="gx-drawer-apptitle">Acme Inc</span>
          <span className="gx-drawer-readout">align=&quot;end&quot;</span>
        </div>
        <div className="gx-user-page">
          <span className="gx-user-page-title">Workspace</span>
          <span className="gx-user-page-row">Members</span>
          <span className="gx-user-page-row">Invitations</span>
        </div>
        <div className="gx-user-footer">
          <AccountMenu
            defaultOpen
            onAction={setLast}
            side="right"
            collapsed={false}
          />
        </div>
      </div>
      <p className="gx-drawer-hint" role="status">
        Last action: {last}.
      </p>
    </div>
  );
};

export const sidebarDemoSource = `import { Icon } from "@gpuixui/icons";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail,
  SidebarTrigger, SidebarUserMenu,
} from "@gpuixui/components";

const user = {
  name: "Benji van der Brand",
  email: "benji@example.com",
  avatar: "/avatars/benji.png",
};

<SidebarProvider collapsible="icon">
  <Sidebar>
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" label="Acme Inc" tooltip="Acme Inc">
            <Icon name="terminal" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive label="Playground" tooltip="Playground">
                <Icon name="home" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <SidebarUserMenu user={user} />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
  <SidebarInset>
    <SidebarTrigger />
  </SidebarInset>
</SidebarProvider>;`;

export const userMenuDemoSource = `import { UserMenu, SidebarUserMenu } from "@gpuixui/components";

const user = {
  name: "Benji van der Brand",
  email: "benji@example.com",
  avatar: "/avatars/benji.png",
};

<UserMenu
  user={user}
  align="end"
  onUpgrade={upgrade}
  onAccount={() => navigate("/account")}
  onBilling={() => navigate("/billing")}
  onNotifications={() => navigate("/settings/notifications")}
  onLogOut={signOut}
/>;

// In a panel footer:
<SidebarFooter>
  <SidebarUserMenu user={user} onLogOut={signOut} />
</SidebarFooter>;`;
