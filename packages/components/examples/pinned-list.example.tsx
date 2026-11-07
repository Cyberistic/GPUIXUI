/** @jsxImportSource @gpuix/react */
import * as Arr from "effect/Array";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../src/card.js";
import { PinnedList, type PinnedListSection } from "../src/pinned-list.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

interface Setting {
  readonly label: string;
  readonly value: string;
}

const settings: ReadonlyArray<readonly [string, ReadonlyArray<Setting>]> = [
  [
    "Account",
    [
      { label: "Display name", value: "Ada Lovelace" },
      { label: "Email", value: "ada@example.com" },
      { label: "Two-factor", value: "Enabled" },
    ],
  ],
  [
    "Notifications",
    [
      { label: "Mentions", value: "All channels" },
      { label: "Weekly digest", value: "Mondays" },
      { label: "Sound", value: "Off" },
    ],
  ],
  [
    "Danger zone",
    [
      { label: "Delete workspace", value: "Requires confirmation" },
      { label: "Transfer ownership", value: "Two admins" },
    ],
  ],
];

export const PinnedListExample = () => {
  const theme = useTheme();
  const sections: ReadonlyArray<PinnedListSection> = Arr.map(
    settings,
    ([title, rows]) => ({
      title,
      children: Arr.map(rows, (row) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            height: 40,
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.md,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            {row.label}
          </text>
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {row.value}
          </text>
        </div>
      )),
    }),
  );

  return (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>
          Scroll the list; the section titles hold
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PinnedList
          testId="settings"
          aria-label="Settings"
          headerHeight={32}
          surfaceColor={theme.colors.card}
          style={{ height: 240 }}
          sections={sections}
        />
      </CardContent>
    </Card>
  );
};
