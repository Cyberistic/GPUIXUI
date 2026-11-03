import desktopSource from "../../../../../examples/blocks/src/desktop/desktop.tsx?raw";
import macosSource from "../../../../../examples/blocks/src/macos/macos.tsx?raw";
import editorSource from "../../../../../examples/blocks/src/editor/editor.tsx?raw";
import musicSource from "../../../../../examples/blocks/src/music/music.tsx?raw";
import monitorSource from "../../../../../examples/blocks/src/monitor/monitor.tsx?raw";
import licenseSource from "../../../../../examples/blocks/src/license/license.tsx?raw";
import notesSource from "../../../../../examples/blocks/src/notes/notes.tsx?raw";
import preferencesSource from "../../../../../examples/blocks/src/preferences/preferences.tsx?raw";
import launcherSource from "../../../../../examples/blocks/src/launcher/launcher.tsx?raw";
import menubarSource from "../../../../../examples/blocks/src/menubar/menubar.tsx?raw";
import agentSource from "../../../../../examples/blocks/src/agent/agent.tsx?raw";
import calendarSource from "../../../../../examples/blocks/src/calendar/calendar.tsx?raw";
import welcomeSource from "../../../../../examples/blocks/src/welcome/welcome.tsx?raw";
import viewerSource from "../../../../../examples/blocks/src/viewer/viewer.tsx?raw";
import pipelineSource from "../../../../../examples/blocks/src/pipeline/pipeline.tsx?raw";
import dashboardSource from "../../../../../examples/blocks/src/dashboard/dashboard.tsx?raw";
import type { ReactNode } from "react";
import { SignInPageRender, signInPageSource } from "./auth-blocks";
import { CommandCentreRender, commandCentreSource } from "./command-centre";
import {
  ConversationsRender,
  conversationsPackages,
  conversationsSource,
} from "./conversations-block";
import {
  EmailInboxRender,
  emailInboxPackages,
  emailInboxSource,
} from "./email-inbox-block";
import {
  FileManagerRender,
  fileManagerPackages,
  fileManagerSource,
} from "./file-manager-block";
import { KanbanRender, kanbanPackages, kanbanSource } from "./kanban-board";
import { PipelineRender } from "./pipeline-block";
import {
  SettingsDialogRender,
  settingsDialogPackages,
  settingsDialogSource,
} from "./settings-dialog";
import {
  NotificationCentreRender,
  notificationCentreSource,
} from "./notification-centre";
import {
  DashboardManagementRender,
  dashboardManagementSource,
} from "./dashboard-management";
import { Sidebar01Render, sidebar01Source } from "./blocks/sidebar-01";
import { LiveBlock } from "./live-block";

/**
 * Block recipes for the docs. A block is a page-level composition of real
 * `@gpuixui/*` components — not a new component — shown exactly as shadcn/ui
 * presents its blocks: a browser rendering plus the real `@gpuixui` source.
 *
 * `render` reproduces the native geometry/palette with HTML (the shipped
 * components render through GPUix, not the DOM); `source` is the recipe a
 * consumer copies; `packages` is what the recipe composes.
 */

export interface Block {
  readonly name: string;
  /** The docs page slug under `/blocks/`. */
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly packages: ReadonlyArray<string>;
  readonly render: () => ReactNode;
  readonly source: string;
}

const DesktopRender = () => (
  <div className="gx-block-desktop">
    <LiveBlock capture="desktop-luna" slug="desktop" variant="luna" />
    <LiveBlock capture="desktop-aero" slug="desktop" variant="aero" />
  </div>
);

const SettingsRender = () => (
  <div className="gx-block-settings">
    <div className="gx-block-card">
      <div className="gx-block-profile">
        <span className="gx-block-avatar">AD</span>
        <div className="gx-block-profile-text">
          <p className="gx-block-title">Ada Lovelace</p>
          <p className="gx-block-desc">ada@example.com</p>
        </div>
        <span className="gx-block-badge">Pro</span>
      </div>
      <div
        aria-label="Settings"
        className="gx-tabs-list gx-block-tabs"
        role="tablist"
      >
        <button
          aria-selected="true"
          className="gx-tab gx-block-tab"
          role="tab"
          type="button"
        >
          Profile
        </button>
        <button
          aria-selected="false"
          className="gx-tab gx-block-tab"
          role="tab"
          type="button"
        >
          Notifications
        </button>
      </div>
      <div className="gx-block-panel">
        <label className="gx-block-label" htmlFor="gx-set-name">
          Display name
        </label>
        <input
          className="gx-field gx-block-field"
          defaultValue="Ada Lovelace"
          id="gx-set-name"
        />
        <label className="gx-block-label" htmlFor="gx-set-email">
          Email
        </label>
        <input
          className="gx-field gx-block-field"
          defaultValue="ada@example.com"
          id="gx-set-email"
        />
        <div className="gx-block-row-between">
          <div>
            <p className="gx-block-label">Desktop alerts</p>
            <p className="gx-block-desc">
              Alerts for runs that finish or fail.
            </p>
          </div>
          <span aria-checked="true" className="gx-block-switch" role="switch" />
        </div>
      </div>
      <div className="gx-block-footer">
        <button className="gx-btn gx-btn-ghost" type="button">
          Cancel
        </button>
        <button className="gx-btn gx-btn-primary" type="button">
          Save changes
        </button>
      </div>
    </div>
  </div>
);

const settingsSource = `import { Avatar } from "@gpuixui/components/avatar";
import { Badge } from "@gpuixui/components/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@gpuixui/components/card";
import { Field, FieldInput } from "@gpuixui/components/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gpuixui/components/tabs";
import { Button, Select, Stack, Switch, Text } from "@gpuixui/primitives";

export function SettingsPage() {
  return (
    <Card variant="outline" style={{ width: 640 }}>
      <CardHeader>
        <Stack direction="row" gap="sm" align="center">
          <Avatar name="Ada Lovelace" size="md" />
          <Stack direction="column" gap="2xs" grow>
            <CardTitle>Ada Lovelace</CardTitle>
            <Text role="caption" tone="muted">ada@example.com</Text>
          </Stack>
          <Badge variant="primary">Pro</Badge>
        </Stack>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile">
          <TabsList label="Settings">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <Field label="Display name">
              <FieldInput defaultValue="Ada Lovelace" />
            </Field>
            <Field label="Email">
              <FieldInput defaultValue="ada@example.com" />
            </Field>
          </TabsContent>
          <TabsContent value="notifications">
            <Stack direction="row" justify="between" align="center">
              <Text role="label">Desktop alerts</Text>
              <Switch label="Desktop alerts" defaultChecked />
            </Stack>
            <Field label="Timezone">
              <Select
                label="Timezone"
                options={[
                  { value: "utc", label: "UTC" },
                  { value: "eastern", label: "Eastern" },
                ]}
                defaultValue="utc"
              />
            </Field>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary" onActivate={save}>
          Save changes
        </Button>
      </CardFooter>
    </Card>
  );
}`;

export const blocks: Readonly<Record<string, Block>> = {
  "dashboard-01": {
    name: "dashboard-01",
    slug: "dashboard",
    title: "Dashboard",
    description:
      "A report dashboard: a workspace sidebar, four KPI tiles, a visitors chart whose range control swaps the data, and a document table you can select.",
    packages: [
      "@gpuixui/components",
      "@gpuixui/data",
      "@gpuixui/icons",
      "@gpuixui/primitives",
      "@gpuixui/tokens",
    ],
    render: () => <LiveBlock slug="dashboard" />,
    source: dashboardSource,
  },
  "sign-in-01": {
    name: "sign-in-01",
    slug: "sign-in",
    title: "Sign in",
    description:
      "A full sign-in page: a product navbar, a centred form card with a password reveal and two providers, and an illustrated quote panel that folds away under 900px.",
    packages: ["@gpuixui/primitives", "@gpuixui/components"],
    render: SignInPageRender,
    source: signInPageSource,
  },
  "dashboard-management-01": {
    name: "dashboard-management-01",
    slug: "dashboard-management",
    title: "Dashboard management",
    description:
      "A three-column management console: service health, a command palette, deploys, toasts, a context menu and API keys.",
    packages: [
      "@gpuixui/components",
      "@gpuixui/data",
      "@gpuixui/icons",
      "@gpuixui/primitives",
      "@gpuixui/tokens",
    ],
    render: DashboardManagementRender,
    source: dashboardManagementSource,
  },
  "desktop-01": {
    name: "desktop-01",
    slug: "desktop",
    title: "Desktop",
    description:
      "A whole XP-era or Aero-era desktop — wallpaper, shortcuts, windows in the era's chrome, the taskbar and the Start menu — with library components themed by the look inside.",
    packages: [
      "@gpuixui/components",
      "@gpuixui/icons",
      "@gpuixui/primitives",
      "@gpuixui/tokens",
    ],
    render: DesktopRender,
    source: desktopSource,
  },
  "settings-01": {
    name: "settings-01",
    slug: "settings",
    title: "Settings",
    description:
      "A settings page: profile header, tabbed sections and controls.",
    packages: ["@gpuixui/primitives", "@gpuixui/components"],
    render: SettingsRender,
    source: settingsSource,
  },
  "kanban-01": {
    name: "kanban-01",
    slug: "kanban",
    title: "Kanban board",
    description:
      "A project task board: an app sidebar, four counted columns and cards that move between them.",
    packages: [...kanbanPackages],
    render: KanbanRender,
    source: kanbanSource,
  },
  "settings-dialog-01": {
    name: "settings-dialog-01",
    slug: "settings-dialog",
    title: "Settings dialog",
    description:
      "A modal settings window: a section nav beside theme rows — a switch, a font-size slider and two layout cards.",
    packages: [...settingsDialogPackages],
    render: SettingsDialogRender,
    source: settingsDialogSource,
  },
  "notification-centre-01": {
    name: "notification-centre-01",
    slug: "notification-centre",
    title: "Notifications",
    description:
      "A notification centre: three filter tabs, four row bodies, unread dots and an invite you can accept.",
    packages: ["@gpuixui/primitives", "@gpuixui/components", "@gpuixui/icons"],
    render: NotificationCentreRender,
    source: notificationCentreSource,
  },
  "command-centre-01": {
    name: "command-centre-01",
    slug: "command-centre",
    title: "Command centre",
    description:
      "A command palette over a dimmed page: a filter field, six keyed actions, an arrow-key highlight and a run line.",
    packages: ["@gpuixui/primitives", "@gpuixui/components"],
    render: CommandCentreRender,
    source: commandCentreSource,
  },
  "license-01": {
    name: "license-01",
    slug: "license",
    title: "Hunter License",
    description:
      "The Hunter Association's registry as a Mac app: hunters by specialty under the traffic lights, the chosen hunter's licence card with its rank in stars, and its privileges as switches.",
    packages: ["@gpuixui/shell", "@gpuixui/components", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="license" />,
    source: licenseSource,
  },
  "notes-01": {
    name: "notes-01",
    slug: "notes",
    title: "Notes",
    description:
      "A three-pane writing app: folders under the traffic lights, the folder's notes with live excerpts, and the editor.",
    packages: ["@gpuixui/shell", "@gpuixui/components", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="notes" />,
    source: notesSource,
  },
  "preferences-01": {
    name: "preferences-01",
    slug: "preferences",
    title: "Preferences",
    description:
      "A System-Settings-style window: a searchable source list of panes and a pane built from inset groups.",
    packages: ["@gpuixui/shell", "@gpuixui/components", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="preferences" />,
    source: preferencesSource,
  },
  "launcher-01": {
    name: "launcher-01",
    slug: "launcher",
    title: "Launcher",
    description:
      "The ⌘K command HUD: a large search field, ranked results with their shortcuts and an action footer.",
    packages: ["@gpuixui/shell", "@gpuixui/components", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="launcher" />,
    source: launcherSource,
  },
  "menubar-01": {
    name: "menubar-01",
    slug: "menubar",
    title: "Menu bar",
    description:
      "A menu-bar extra's popover: a status line, toggles, a sync progress and a footer.",
    packages: ["@gpuixui/shell", "@gpuixui/components", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="menubar" />,
    source: menubarSource,
  },
  "agent-01": {
    name: "agent-01",
    slug: "agent",
    title: "Agent",
    description:
      "An AI coding assistant window: sessions, the transcript and composer, and the files the session touched.",
    packages: ["@gpuixui/shell", "@gpuixui/components", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="agent" />,
    source: agentSource,
  },
  "macos-01": {
    name: "macos-01",
    slug: "macos",
    title: "macOS desktop",
    description:
      "A whole macOS desktop: the wallpaper drawn from gradients, the menu bar with its menus, the dock, and a floating window layer for real windows.",
    packages: ["@gpuixui/shell", "@gpuixui/icons", "@gpuixui/tokens"],
    render: () => <LiveBlock slug="macos" />,
    source: macosSource,
  },
  "editor-01": {
    name: "editor-01",
    slug: "editor",
    title: "Editor",
    description:
      "A code editor: the explorer, the open file painted token by token, and a status bar — press a file to open it.",
    packages: ["@gpuixui/shell", "@gpuixui/icons", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="editor" />,
    source: editorSource,
  },
  "music-01": {
    name: "music-01",
    slug: "music",
    title: "Music",
    description:
      "A player: album art, a seeded waveform, the transport and the queue — press a row to play it.",
    packages: ["@gpuixui/shell", "@gpuixui/icons", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="music" />,
    source: musicSource,
  },
  "monitor-01": {
    name: "monitor-01",
    slug: "monitor",
    title: "Hardware monitor",
    description:
      "Temperatures as sparklines, one bar per core and memory as a ring, over a 1 / 5 / 15-minute window.",
    packages: ["@gpuixui/shell", "@gpuixui/data", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="monitor" />,
    source: monitorSource,
  },
  "calendar-01": {
    name: "calendar-01",
    slug: "calendar",
    title: "Calendar",
    description:
      "A week view: calendars with switches, the week's events in hourly rows, overlaps side by side.",
    packages: ["@gpuixui/shell", "@gpuixui/components", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="calendar" />,
    source: calendarSource,
  },
  "welcome-01": {
    name: "welcome-01",
    slug: "welcome",
    title: "Welcome",
    description:
      "A first-run window: the app's mark, feature rows per step, Continue and Import….",
    packages: ["@gpuixui/shell", "@gpuixui/components", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="welcome" />,
    source: welcomeSource,
  },
  "viewer-01": {
    name: "viewer-01",
    slug: "viewer",
    title: "Viewer",
    description:
      "A media viewer: albums, a grid of thumbnails, and the open photo under a floating HUD.",
    packages: ["@gpuixui/shell", "@gpuixui/components", "@gpuixui/primitives"],
    render: () => <LiveBlock slug="viewer" />,
    source: viewerSource,
  },
  "pipeline-01": {
    name: "pipeline-01",
    slug: "pipeline",
    title: "Pipeline",
    description:
      "A release pipeline in a native Mac window: projects in a source list under the traffic lights, a unified toolbar, the stage strip over the work, and an inspector for the chosen item.",
    packages: [
      "@gpuixui/shell",
      "@gpuixui/components",
      "@gpuixui/primitives",
      "@gpuixui/tokens",
    ],
    render: PipelineRender,
    source: pipelineSource,
  },

  "file-manager-01": {
    name: "file-manager-01",
    slug: "file-manager",
    title: "File manager",
    description:
      "A three-pane browser: a folder tree, a grid of image tiles and the selected file's facts.",
    packages: [...fileManagerPackages],
    render: FileManagerRender,
    source: fileManagerSource,
  },
  "email-inbox-01": {
    name: "email-inbox-01",
    slug: "email-inbox",
    title: "Email inbox",
    description:
      "A four-pane mail client: folders, a filterable message list, the reading pane and the sender's contact card.",
    packages: [...emailInboxPackages],
    render: EmailInboxRender,
    source: emailInboxSource,
  },
  "conversations-01": {
    name: "conversations-01",
    slug: "conversations",
    title: "Conversations",
    description:
      "A macOS Messages window: a searchable conversation list, the open thread's bubbles and a composer that sends.",
    packages: [...conversationsPackages],
    render: ConversationsRender,
    source: conversationsSource,
  },
  sidebar: {
    name: "sidebar",
    slug: "sidebar",
    title: "Sidebar",
    description:
      "All sixteen shadcn sidebar blocks on one page: docs navigation, floating, inset and icon panels, the nested inbox, calendar, settings dialog and site header. Every control is live.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    // The page shows all sixteen; these are its first example, which is also the
    // frame the index tile captures.
    render: Sidebar01Render,
    source: sidebar01Source,
  },
};

export const blockList = Object.values(blocks);
