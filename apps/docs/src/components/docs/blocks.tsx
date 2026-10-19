import type { ReactNode } from "react";

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

const LoginRender = () => (
  <div className="gx-block-login">
    <div className="gx-block-card">
      <div aria-hidden="true" className="gx-block-mark" />
      <h3 className="gx-block-title">Sign in</h3>
      <p className="gx-block-desc">Enter your email to continue.</p>
      <label className="gx-block-label" htmlFor="gx-login-email">
        Email
      </label>
      <input
        className="gx-field gx-block-field"
        id="gx-login-email"
        placeholder="you@example.com"
      />
      <label className="gx-block-label" htmlFor="gx-login-password">
        Password
      </label>
      <input
        className="gx-field gx-block-field"
        id="gx-login-password"
        placeholder="••••••••"
        type="password"
      />
      <div className="gx-block-remember">
        <span aria-checked="true" className="gx-block-check" role="checkbox" />
        <span>Remember me</span>
      </div>
      <button className="gx-btn gx-btn-primary gx-block-submit" type="button">
        Sign in
      </button>
      <div className="gx-block-divider">or continue with</div>
      <button className="gx-btn gx-btn-secondary gx-block-submit" type="button">
        GitHub
      </button>
    </div>
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

const loginSource = `import { Button, Checkbox, Input, Label, Separator, Stack, Text } from "@gpuixui/primitives";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@gpuixui/components/card";

export function LoginPage() {
  return (
    <Stack direction="column" gap="xl" align="center" style={{ padding: 48 }}>
      <Card variant="outline" style={{ width: 360 }}>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your email to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Email</Label>
          <Input label="Email" placeholder="you@example.com" fullWidth />
          <Label>Password</Label>
          <Input label="Password" placeholder="••••••••" fullWidth />
          <Stack direction="row" gap="sm" align="center">
            <Checkbox label="Remember me" defaultChecked />
            <Text role="label">Remember me</Text>
          </Stack>
        </CardContent>
        <CardFooter>
          <Button variant="primary" fullWidth onActivate={signIn}>
            Sign in
          </Button>
        </CardFooter>
      </Card>
      <Separator label="or continue with" style={{ width: 360 }} />
      <Button variant="secondary" fullWidth style={{ width: 360 }}>
        GitHub
      </Button>
    </Stack>
  );
}`;

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
  "login-01": {
    name: "login-01",
    slug: "login",
    title: "Login",
    description:
      "A centered sign-in card: email, password and a secondary action.",
    packages: ["@gpuixui/primitives", "@gpuixui/components"],
    render: LoginRender,
    source: loginSource,
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
