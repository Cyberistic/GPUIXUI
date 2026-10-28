import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * Browser previews for the Sidebar and User menu pages.
 *
 * The shipped sidebar is a GPUix tree — a width tween, an anchored mobile sheet
 * and a modal's focus rules — so the page cannot mount it. This drawing keeps
 * the parts a reader is learning: the panel, its gap, the icon collapse, the
 * active row and the account menu. The paint is the browser's and the page says
 * so; the behaviour the component promises is measured natively.
 */

const FONT = 13;

const page: CSSProperties = {
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  display: "flex",
  height: 320,
  overflow: "hidden",
  position: "relative",
  width: "100%",
};

const panel = (collapsed: boolean): CSSProperties => ({
  background: "var(--sidebar)",
  borderRight: "1px solid var(--sidebar-border)",
  color: "var(--sidebar-foreground)",
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
  gap: 6,
  padding: 8,
  transition: "width 160ms ease",
  width: collapsed ? 48 : 176,
});

const row = (active: boolean, collapsed: boolean): CSSProperties => ({
  alignItems: "center",
  background: active ? "var(--sidebar-accent)" : "transparent",
  borderRadius: 6,
  color: active
    ? "var(--sidebar-accent-foreground)"
    : "var(--sidebar-foreground)",
  display: "flex",
  fontSize: FONT,
  fontWeight: active ? 600 : 400,
  gap: 8,
  height: 30,
  justifyContent: collapsed ? "center" : "flex-start",
  padding: "0 8px",
  whiteSpace: "nowrap",
});

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
};

const ITEMS = [
  { id: "playground", label: "Playground", mark: MARK.home },
  { id: "models", label: "Models", mark: MARK.bot },
  { id: "settings", label: "Settings", mark: MARK.settings },
] as const;

const note: CSSProperties = {
  color: "var(--muted-foreground)",
  fontSize: 12,
  marginTop: 8,
  textAlign: "center",
};

/** The identity row and its dropdown, shared by both previews. */
const AccountMenu = ({
  collapsed,
  onAction,
}: {
  readonly collapsed: boolean;
  readonly onAction: (action: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const entries = ["Upgrade to Pro", "Account", "Billing", "Notifications"];
  return (
    <div style={{ position: "relative" }}>
      <button
        aria-expanded={open}
        aria-label="Benji van der Brand account menu"
        onClick={() => setOpen((value) => !value)}
        style={{
          alignItems: "center",
          background: "transparent",
          border: "none",
          borderRadius: 6,
          color: "inherit",
          cursor: "pointer",
          display: "flex",
          font: "inherit",
          gap: 8,
          justifyContent: collapsed ? "center" : "flex-start",
          padding: 4,
          width: "100%",
        }}
        type="button"
      >
        <span
          aria-hidden="true"
          style={{
            alignItems: "center",
            background: "var(--muted)",
            borderRadius: 999,
            color: "var(--foreground)",
            display: "flex",
            fontSize: 11,
            height: 24,
            justifyContent: "center",
            width: 24,
          }}
        >
          B
        </span>
        {collapsed ? null : (
          <>
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
                lineHeight: 1.3,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                Benji van der Brand
              </span>
              <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
                benji@example.com
              </span>
            </span>
            {MARK.updown}
          </>
        )}
      </button>
      {open ? (
        <div
          style={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            bottom: collapsed ? 40 : 44,
            boxShadow: "0 12px 28px rgb(0 0 0 / 0.18)",
            color: "var(--popover-foreground)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            left: collapsed ? 40 : 0,
            minWidth: 208,
            padding: 6,
            position: "absolute",
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 11, padding: "4px 8px" }}>
            Benji van der Brand
          </span>
          {entries.map((entry) => (
            <button
              key={entry}
              onClick={() => {
                setOpen(false);
                onAction(entry);
              }}
              style={{
                background: "transparent",
                border: "none",
                borderRadius: 6,
                color: "inherit",
                cursor: "pointer",
                font: "inherit",
                fontSize: 12,
                padding: "6px 8px",
                textAlign: "left",
              }}
              type="button"
            >
              {entry}
            </button>
          ))}
          <span
            style={{ background: "var(--border)", height: 1, margin: "4px 0" }}
          />
          <button
            onClick={() => {
              setOpen(false);
              onAction("Log out");
            }}
            style={{
              background: "transparent",
              border: "none",
              borderRadius: 6,
              color: "var(--destructive)",
              cursor: "pointer",
              font: "inherit",
              fontSize: 12,
              padding: "6px 8px",
              textAlign: "left",
            }}
            type="button"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
};

/** The panel, its content and the account footer. */
export const SidebarDemo = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("playground");
  const [last, setLast] = useState("none");

  return (
    <div>
      <div style={page}>
        <div style={panel(collapsed)}>
          <div style={{ ...row(false, collapsed), fontWeight: 600 }}>
            {glyph(
              <>
                <path d="M12 8V4H8" />
                <rect height="12" width="16" x="4" y="8" rx="2" />
              </>,
            )}
            {collapsed ? null : "Acme Inc"}
          </div>
          <div style={{ height: 4 }} />
          {ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              style={{
                ...row(active === item.id, collapsed),
                border: "none",
                cursor: "pointer",
                font: "inherit",
                fontSize: FONT,
                width: "100%",
              }}
              type="button"
            >
              {item.mark}
              {collapsed ? null : item.label}
            </button>
          ))}
          <div style={{ flexGrow: 1 }} />
          <AccountMenu collapsed={collapsed} onAction={setLast} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
          <div
            style={{
              alignItems: "center",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              gap: 8,
              padding: 8,
            }}
          >
            <button
              aria-label="Toggle Sidebar"
              onClick={() => setCollapsed((value) => !value)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--foreground)",
                cursor: "pointer",
                display: "flex",
                padding: 5,
              }}
              type="button"
            >
              {glyph(
                <>
                  <rect height="18" width="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                </>,
              )}
            </button>
            <span
              style={{
                color: "var(--foreground)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {ITEMS.find((item) => item.id === active)?.label}
            </span>
          </div>
          <div style={{ flexGrow: 1 }} />
        </div>
      </div>
      <p style={note}>Last action: {last}.</p>
    </div>
  );
};

/** The account row alone, for the User menu page. */
export const UserMenuDemo = () => {
  const [last, setLast] = useState("none");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          background: "var(--sidebar)",
          border: "1px solid var(--sidebar-border)",
          borderRadius: 10,
          color: "var(--sidebar-foreground)",
          minWidth: 240,
          padding: 8,
        }}
      >
        <AccountMenu collapsed={false} onAction={setLast} />
      </div>
      <p style={{ ...note, marginTop: 0 }}>Last action: {last}.</p>
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

const user = { name: "Benji van der Brand", email: "benji@example.com" };

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

<UserMenu
  user={{ name: "Benji van der Brand", email: "benji@example.com" }}
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
