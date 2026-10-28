import type { ReactNode } from "react";
import { SignInPageRender, signInPageSource } from "./auth-blocks";
import { CommandCentreRender, commandCentreSource } from "./command-centre";
import { HunterPipelineRender, hunterPipelineSource } from "./hunter-pipeline";
import {
  ConversationsRender,
  conversationsPackages,
  conversationsSource,
} from "./conversations-block";
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
  /** The docs page slug under `/docs/blocks/`. */
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly packages: ReadonlyArray<string>;
  readonly render: () => ReactNode;
  readonly source: string;
}

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
      "An activity dashboard: sidebar nav, a day's time and token stats, and charts — bars, a donut and stacked bars.",
    packages: [...dashboardPackages],
    render: DashboardRender,
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
  "hunter-pipeline-01": {
    name: "hunter-pipeline-01",
    slug: "hunter-pipeline",
    title: "Hunter pipeline",
    description:
      "A guild's licence dashboard: five readings, a seven-stage strip, the dossiers staged and the ones a missing fact blocks, over the renown a fortnight gained.",
    packages: ["@gpuixui/primitives", "@gpuixui/components"],
    render: HunterPipelineRender,
    source: hunterPipelineSource,
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
