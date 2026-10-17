/**
 * Tabs example: account settings, three panels, one disabled tab.
 *
 * The tab set is uncontrolled; the header reads the same state from
 * `onValueChange`, which is what a real settings screen would persist.
 */

import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../src/tabs.js";

/** One read-only settings row. */
const Row = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: theme.spacing.lg,
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    >
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {label}
      </text>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {value}
      </text>
    </div>
  );
};

/** Account settings with the profile, notification and danger panels. */
export const TabsExample = () => {
  const theme = useTheme();
  const [tab, setTab] = useState("profile");

  return (
    <Card style={{ maxWidth: 560 }}>
      <CardHeader>
        <CardTitle>Account settings</CardTitle>
        <CardDescription>Showing the {tab} panel</CardDescription>
      </CardHeader>
      <Tabs
        defaultValue="profile"
        onValueChange={setTab}
        style={{ padding: theme.spacing.lg, paddingTop: 0 }}
      >
        <TabsList testId="settings-tabs">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="danger">Danger</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Row label="Name" value="Ada Lovelace" />
          <Row label="Email" value="ada@example.com" />
          <Row label="Plan" value="Team" />
        </TabsContent>
        <TabsContent value="notifications">
          <Row label="Build failures" value="Immediate" />
          <Row label="Weekly digest" value="Mondays" />
          <Row label="Mentions" value="Immediate" />
        </TabsContent>
        <TabsContent value="danger">
          <Row label="Delete workspace" value="Owner only" />
          <Row label="Transfer ownership" value="Owner only" />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
