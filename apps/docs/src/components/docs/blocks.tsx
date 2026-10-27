import type { ReactNode } from "react";
import { SignInPageRender, signInPageSource } from "./auth-blocks";
import { CommandCentreRender, commandCentreSource } from "./command-centre";
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
import { Sidebar02Render, sidebar02Source } from "./blocks/sidebar-02";
import { Sidebar03Render, sidebar03Source } from "./blocks/sidebar-03";
import { Sidebar04Render, sidebar04Source } from "./blocks/sidebar-04";
import { Sidebar05Render, sidebar05Source } from "./blocks/sidebar-05";
import { Sidebar06Render, sidebar06Source } from "./blocks/sidebar-06";
import { Sidebar07Render, sidebar07Source } from "./blocks/sidebar-07";
import { Sidebar08Render, sidebar08Source } from "./blocks/sidebar-08";
import { Sidebar09Render, sidebar09Source } from "./blocks/sidebar-09";
import { Sidebar10Render, sidebar10Source } from "./blocks/sidebar-10";
import { Sidebar11Render, sidebar11Source } from "./blocks/sidebar-11";
import { Sidebar12Render, sidebar12Source } from "./blocks/sidebar-12";
import { Sidebar13Render, sidebar13Source } from "./blocks/sidebar-13";
import { Sidebar14Render, sidebar14Source } from "./blocks/sidebar-14";
import { Sidebar15Render, sidebar15Source } from "./blocks/sidebar-15";
import { Sidebar16Render, sidebar16Source } from "./blocks/sidebar-16";

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
  "sidebar-01": {
    name: "sidebar-01",
    slug: "sidebar-01",
    title: "Sidebar 01 — Sectioned docs navigation",
    description:
      "A version switcher, a search field and four labelled docs sections beside a breadcrumbed page.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar01Render,
    source: sidebar01Source,
  },
  "sidebar-02": {
    name: "sidebar-02",
    slug: "sidebar-02",
    title: "Sidebar 02 — Collapsible sections",
    description:
      "Every docs section folds away, over a long page that scrolls under a sticky header.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar02Render,
    source: sidebar02Source,
  },
  "sidebar-03": {
    name: "sidebar-03",
    slug: "sidebar-03",
    title: "Sidebar 03 — Submenus",
    description:
      "One always-open tree: five sections with their pages listed under each.",
    packages: ["@gpuixui/components"],
    render: Sidebar03Render,
    source: sidebar03Source,
  },
  "sidebar-04": {
    name: "sidebar-04",
    slug: "sidebar-04",
    title: "Sidebar 04 — Floating submenus",
    description:
      "The same tree on a floating, lifted panel with a gutter around it.",
    packages: ["@gpuixui/components"],
    render: Sidebar04Render,
    source: sidebar04Source,
  },
  "sidebar-05": {
    name: "sidebar-05",
    slug: "sidebar-05",
    title: "Sidebar 05 — Collapsible submenus",
    description:
      "Parent rows open their pages in place; one section starts open.",
    packages: ["@gpuixui/components", "@gpuixui/icons"],
    render: Sidebar05Render,
    source: sidebar05Source,
  },
  "sidebar-06": {
    name: "sidebar-06",
    slug: "sidebar-06",
    title: "Sidebar 06 — Dropdown sections",
    description:
      "Each section is a dropdown menu, with the newsletter card in the footer.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar06Render,
    source: sidebar06Source,
  },
  "sidebar-07": {
    name: "sidebar-07",
    slug: "sidebar-07",
    title: "Sidebar 07 — Icon rail",
    description:
      "A workspace that collapses to icons: team switcher, platform sections, project actions and the account.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar07Render,
    source: sidebar07Source,
  },
  "sidebar-08": {
    name: "sidebar-08",
    slug: "sidebar-08",
    title: "Sidebar 08 — Inset panel",
    description:
      "A floating workspace panel beside a rounded content sheet, with Support and Feedback pinned low.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar08Render,
    source: sidebar08Source,
  },
  "sidebar-09": {
    name: "sidebar-09",
    slug: "sidebar-09",
    title: "Sidebar 09 — Nested inbox",
    description:
      "An icon folder rail, a searchable message column and the open thread.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar09Render,
    source: sidebar09Source,
  },
  "sidebar-10": {
    name: "sidebar-10",
    slug: "sidebar-10",
    title: "Sidebar 10 — Actions popover",
    description:
      "The workspace panel with a header popover holding four groups of page actions.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar10Render,
    source: sidebar10Source,
  },
  "sidebar-11": {
    name: "sidebar-11",
    slug: "sidebar-11",
    title: "Sidebar 11 — File tree",
    description:
      "Changed files with their state, and a collapsible repository tree on button.tsx.",
    packages: ["@gpuixui/components", "@gpuixui/icons"],
    render: Sidebar11Render,
    source: sidebar11Source,
  },
  "sidebar-12": {
    name: "sidebar-12",
    slug: "sidebar-12",
    title: "Sidebar 12 — Calendar",
    description:
      "A month picker above three calendar lists, beside the month's page.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar12Render,
    source: sidebar12Source,
  },
  "sidebar-13": {
    name: "sidebar-13",
    slug: "sidebar-13",
    title: "Sidebar 13 — Settings dialog",
    description:
      "A settings modal with its own sidebar of sections and the selected section's settings.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar13Render,
    source: sidebar13Source,
  },
  "sidebar-14": {
    name: "sidebar-14",
    slug: "sidebar-14",
    title: "Sidebar 14 — Right panel",
    description:
      "The docs table of contents on the right edge, with its toggle in the page header.",
    packages: ["@gpuixui/components", "@gpuixui/primitives"],
    render: Sidebar14Render,
    source: sidebar14Source,
  },
  "sidebar-15": {
    name: "sidebar-15",
    slug: "sidebar-15",
    title: "Sidebar 15 — Two panels",
    description:
      "A workspace on the left, the open project in the middle and a calendar on the right.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar15Render,
    source: sidebar15Source,
  },
  "sidebar-16": {
    name: "sidebar-16",
    slug: "sidebar-16",
    title: "Sidebar 16 — Site header",
    description:
      "A sticky site header above both columns: toggle, trail and search.",
    packages: ["@gpuixui/components", "@gpuixui/icons", "@gpuixui/primitives"],
    render: Sidebar16Render,
    source: sidebar16Source,
  },
};

export const blockList = Object.values(blocks);
