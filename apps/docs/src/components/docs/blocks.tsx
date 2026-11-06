import desktopSource from "../../../../../examples/blocks/src/desktop/desktop.tsx?raw";
import pipelineSource from "../../../../../examples/blocks/src/pipeline/pipeline.tsx?raw";
import type { ReactNode } from "react";
import { useState } from "react";
import { TabStrip } from "./tab-strip";
import { SignInPageRender, signInPageSource } from "./auth-blocks";
import { CommandCentreRender, commandCentreSource } from "./command-centre";
import {
  ConversationsRender,
  conversationsPackages,
  conversationsSource,
} from "./conversations-block";
import {
  Dashboard01Render,
  dashboard01Packages,
  dashboard01Source,
} from "./dashboard-01";
import {
  DashboardRender,
  dashboardPackages,
  dashboardSource,
} from "./dashboard";
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
import { TasksRender, tasksPackages, tasksSource } from "./tasks-block";
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

export interface Block {
  readonly name: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly packages: ReadonlyArray<string>;
  readonly render: () => ReactNode;
  readonly source: string;
  readonly file: string;
}

const DesktopRender = () => (
  <div className="gx-block-desktop">
    {(
      [
        ["luna", "The XP-era look, Start menu open"],
        ["aero", "The Aero-era look, Start menu open"],
      ] as const
    ).map(([look, caption]) => (
      <figure key={look} className="gx-block-desktop-shot">
        <img
          alt={`${caption}: captured from the native window`}
          height={1000}
          src={`/blocks/desktop-${look}.webp`}
          width={1600}
        />
        <figcaption>{caption} — captured from the native window</figcaption>
      </figure>
    ))}
  </div>
);

const SettingsRender = () => {
  const [tab, setTab] = useState<"profile" | "notifications" | "security">(
    "profile",
  );
  const [photo, setPhoto] = useState<"photo" | "initials">("photo");
  const [alerts, setAlerts] = useState(true);
  const [digest, setDigest] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);

  return (
    <div className="gx-block-settings">
      <div className="gx-profile">
        <header className="gx-profile-head">
          <h3 className="gx-profile-title">Profile settings</h3>
          <p className="gx-block-desc">
            Manage your account and how the library greets you.
          </p>
        </header>

        <TabStrip
          className="gx-profile-tabs"
          label="Profile settings"
          onChange={setTab}
          options={[
            { value: "profile", label: "Profile" },
            { value: "notifications", label: "Notifications" },
            { value: "security", label: "Security" },
          ]}
          tabClassName="gx-profile-tab"
          value={tab}
        />

        {tab === "profile" ? (
          <div className="gx-profile-body">
            <section className="gx-profile-row">
              <div className="gx-profile-side">
                <p className="gx-profile-section">Profile picture</p>
                <p className="gx-block-desc">
                  A photo, or your initials when there is none.
                </p>
              </div>
              <div className="gx-profile-photo">
                <span
                  className="gx-profile-avatar"
                  data-photo={photo === "photo"}
                >
                  {photo === "photo" ? (
                    <img
                      alt="Gon and Killua on Whale Island"
                      src="/hxh-b.webp"
                    />
                  ) : (
                    "AD"
                  )}
                </span>
                <span className="gx-profile-photo-actions">
                  <button
                    className="gx-btn gx-btn-secondary gx-btn-sm"
                    onClick={() => setPhoto("photo")}
                    type="button"
                  >
                    Change photo
                  </button>
                  <button
                    aria-label="Remove photo"
                    className="gx-btn gx-btn-ghost gx-btn-sm"
                    onClick={() => setPhoto("initials")}
                    type="button"
                  >
                    Remove
                  </button>
                </span>
              </div>
            </section>

            <section className="gx-profile-row">
              <div className="gx-profile-side">
                <p className="gx-profile-section">Personal details</p>
                <p className="gx-block-desc">
                  The name and contact the account answers to.
                </p>
              </div>
              <div className="gx-profile-fields">
                <label className="gx-profile-field">
                  <span className="gx-block-label">First name</span>
                  <input
                    className="gx-field"
                    defaultValue="Ada"
                    name="first-name"
                  />
                </label>
                <label className="gx-profile-field">
                  <span className="gx-block-label">Surname</span>
                  <input
                    className="gx-field"
                    defaultValue="Lovelace"
                    name="surname"
                  />
                </label>
                <label className="gx-profile-field gx-profile-field-wide">
                  <span className="gx-block-label">Email</span>
                  <input
                    className="gx-field"
                    defaultValue="ada@example.com"
                    name="email"
                    type="email"
                  />
                </label>
                <label className="gx-profile-field gx-profile-field-wide">
                  <span className="gx-block-label">Phone</span>
                  <input
                    className="gx-field"
                    defaultValue="+44 20 7946 0958"
                    name="phone"
                    type="tel"
                  />
                </label>
              </div>
            </section>
          </div>
        ) : null}

        {tab === "notifications" ? (
          <div className="gx-profile-body">
            <section className="gx-profile-row">
              <div className="gx-profile-side">
                <p className="gx-profile-section">Notifications</p>
                <p className="gx-block-desc">What arrives, and when.</p>
              </div>
              <div className="gx-profile-stack">
                <div className="gx-block-row-between">
                  <div>
                    <p className="gx-block-label">Desktop alerts</p>
                    <p className="gx-block-desc">Runs that finish or fail.</p>
                  </div>
                  <button
                    aria-checked={alerts}
                    aria-label="Desktop alerts"
                    className="gx-block-switch"
                    data-on={alerts}
                    onClick={() => setAlerts((on) => !on)}
                    role="switch"
                    type="button"
                  >
                    <span />
                  </button>
                </div>
                <div className="gx-block-row-between">
                  <div>
                    <p className="gx-block-label">Daily digest</p>
                    <p className="gx-block-desc">A morning summary.</p>
                  </div>
                  <button
                    aria-checked={digest}
                    aria-label="Daily digest"
                    className="gx-block-switch"
                    data-on={digest}
                    onClick={() => setDigest((on) => !on)}
                    role="switch"
                    type="button"
                  >
                    <span />
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {tab === "security" ? (
          <div className="gx-profile-body">
            <section className="gx-profile-row">
              <div className="gx-profile-side">
                <p className="gx-profile-section">Password</p>
                <p className="gx-block-desc">Last changed 14 days ago.</p>
              </div>
              <div className="gx-profile-fields">
                <label className="gx-profile-field gx-profile-field-wide">
                  <span className="gx-block-label">Current password</span>
                  <input
                    className="gx-field"
                    defaultValue="hunter-exam"
                    name="current-password"
                    type="password"
                  />
                </label>
              </div>
            </section>
            <section className="gx-profile-row">
              <div className="gx-profile-side">
                <p className="gx-profile-section">Two-factor</p>
                <p className="gx-block-desc">A code from your phone.</p>
              </div>
              <div className="gx-profile-stack">
                <div className="gx-block-row-between">
                  <div>
                    <p className="gx-block-label">Authenticator app</p>
                    <p className="gx-block-desc">Required on a new device.</p>
                  </div>
                  <button
                    aria-checked={twoFactor}
                    aria-label="Two-factor authentication"
                    className="gx-block-switch"
                    data-on={twoFactor}
                    onClick={() => setTwoFactor((on) => !on)}
                    role="switch"
                    type="button"
                  >
                    <span />
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        <div className="gx-profile-footer">
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
};

const settingsSource = `import { Avatar } from "@gpuixui/components/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@gpuixui/components/card";
import { Field, FieldInput } from "@gpuixui/components/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gpuixui/components/tabs";
import { Button, Stack, Switch, Text } from "@gpuixui/primitives";

export function ProfileSettings() {
  const [photo, setPhoto] = useState(true);

  return (
    <Card variant="outline" style={{ width: 640 }}>
      <CardHeader>
        <CardTitle>Profile settings</CardTitle>
        <Text role="caption" tone="muted">
          Manage your account and how the library greets you.
        </Text>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile">
          <TabsList label="Profile settings">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Stack direction="row" gap="md" align="center">
              <Avatar name="Ada Lovelace" size="lg" />
              <Stack direction="column" gap="2xs">
                <Button variant="secondary" size="sm" onActivate={() => setPhoto(true)}>
                  Change photo
                </Button>
                <Button variant="ghost" size="sm" onActivate={() => setPhoto(false)}>
                  Remove
                </Button>
              </Stack>
            </Stack>
            <Field label="First name">
              <FieldInput defaultValue="Ada" />
            </Field>
            <Field label="Surname">
              <FieldInput defaultValue="Lovelace" />
            </Field>
            <Field label="Email">
              <FieldInput defaultValue="ada@example.com" type="email" />
            </Field>
            <Field label="Phone">
              <FieldInput defaultValue="+44 20 7946 0958" type="tel" />
            </Field>
          </TabsContent>

          <TabsContent value="notifications">
            <Switch label="Desktop alerts" defaultChecked />
            <Switch label="Daily digest" />
          </TabsContent>

          <TabsContent value="security">
            <Field label="Current password">
              <FieldInput type="password" />
            </Field>
            <Switch label="Authenticator app" defaultChecked />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary">Save changes</Button>
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
      "An activity dashboard: sidebar nav, a day's time and token stats, and charts — bars, a donut and stacked bars.",
    packages: [...dashboardPackages],
    render: DashboardRender,
    source: dashboardSource,
    file: "apps/docs/src/components/docs/dashboard.tsx",
  },
  "dashboard-01-shadcn": {
    name: "dashboard-01-shadcn",
    slug: "dashboard-01",
    title: "Dashboard 01",
    description:
      "shadcn's dashboard: an inset sidebar, four stat cards, an interactive area chart, a treemap of the sources, a sankey of the funnel, a sunburst of the devices and a documents table.",
    packages: [...dashboard01Packages],
    render: Dashboard01Render,
    source: dashboard01Source,
    file: "apps/docs/src/components/docs/dashboard-01.tsx",
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
    file: "apps/docs/src/components/docs/auth-blocks.tsx",
  },
  "dashboard-management-01": {
    name: "dashboard-management-01",
    slug: "dashboard-management",
    title: "Dashboard management",
    description:
      "A 16:9 settings console: a workspace rail beside one column of sections — service health, compute, uploads, deploys, keys, notifications and quick actions.",
    packages: [
      "@gpuixui/components",
      "@gpuixui/data",
      "@gpuixui/icons",
      "@gpuixui/primitives",
      "@gpuixui/tokens",
    ],
    render: DashboardManagementRender,
    source: dashboardManagementSource,
    file: "apps/docs/src/components/docs/dashboard-management.tsx",
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
    file: "examples/blocks/src/desktop/desktop.tsx",
  },
  "settings-01": {
    name: "settings-01",
    slug: "profile-settings",
    title: "Profile settings",
    description:
      "A profile page: photo, name, phone and email over tabbed settings.",
    packages: ["@gpuixui/primitives", "@gpuixui/components"],
    render: SettingsRender,
    source: settingsSource,
    file: "apps/docs/src/components/docs/blocks.tsx",
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
    file: "apps/docs/src/components/docs/kanban-board.tsx",
  },
  "tasks-01": {
    name: "tasks-01",
    slug: "tasks",
    title: "Tasks",
    description:
      "A Notion-style Tasks view: a workspace sidebar, an inbox of dated tasks, and two rows of document cards whose task counts follow every tick.",
    packages: [...tasksPackages],
    render: TasksRender,
    source: tasksSource,
    file: "apps/docs/src/components/docs/tasks-block.tsx",
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
    file: "apps/docs/src/components/docs/settings-dialog.tsx",
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
    file: "apps/docs/src/components/docs/notification-centre.tsx",
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
    file: "apps/docs/src/components/docs/command-centre.tsx",
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
    file: "examples/blocks/src/pipeline/pipeline.tsx",
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
    file: "apps/docs/src/components/docs/file-manager-block.tsx",
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
    file: "apps/docs/src/components/docs/email-inbox-block.tsx",
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
    file: "apps/docs/src/components/docs/conversations-block.tsx",
  },
  sidebar: {
    name: "sidebar",
    slug: "sidebar",
    title: "Sidebar",
    description:
      "All sixteen shadcn sidebar blocks on one page: docs navigation, floating, inset and icon panels, the nested inbox, calendar, settings dialog and site header. Every control is live.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar01Render,
    source: sidebar01Source,
    file: "apps/docs/src/components/docs/blocks/sidebar-01.tsx",
  },
};

export const blockList = Object.values(blocks);
