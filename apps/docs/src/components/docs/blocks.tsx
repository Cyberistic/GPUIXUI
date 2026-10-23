import type { ReactNode } from "react";
import {
  ForgotPasswordRender,
  LoginRender,
  OtpRender,
  SignupRender,
  forgotPasswordSource,
  loginSource,
  otpSource,
  signupSource,
} from "./auth-blocks";
import {
  DashboardRender,
  dashboardPackages,
  dashboardSource,
} from "./dashboard";

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
  "login-01": {
    name: "login-01",
    slug: "login",
    title: "Login",
    description:
      "A centered sign-in card: email and password, a forgot-password link, two OAuth buttons and a sign-up footer.",
    packages: ["@gpuixui/primitives", "@gpuixui/components"],
    render: LoginRender,
    source: loginSource,
  },
  "signup-01": {
    name: "signup-01",
    slug: "signup",
    title: "Sign up",
    description:
      "A centered registration card: name, email, password and confirmation, a terms checkbox and an account footer.",
    packages: ["@gpuixui/primitives", "@gpuixui/components"],
    render: SignupRender,
    source: signupSource,
  },
  "forgot-password-01": {
    name: "forgot-password-01",
    slug: "forgot-password",
    title: "Forgot password",
    description:
      "A centered reset card: one email field, a send-reset-link action, an inline success note and a way back to sign in.",
    packages: ["@gpuixui/primitives", "@gpuixui/components"],
    render: ForgotPasswordRender,
    source: forgotPasswordSource,
  },
  "otp-01": {
    name: "otp-01",
    slug: "otp",
    title: "One-time code",
    description:
      "A centered verification card: six code cells, a verify action, a resend countdown and an inline error state.",
    packages: ["@gpuixui/primitives", "@gpuixui/components"],
    render: OtpRender,
    source: otpSource,
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
};

export const blockList = Object.values(blocks);
