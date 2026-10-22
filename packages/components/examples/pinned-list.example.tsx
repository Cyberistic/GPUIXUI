/**
 * PinnedList example: a settings page's sectioned scroll region.
 *
 * Composition, not a gallery: a real preferences panel where the section titles
 * pin as the reader scrolls, and one section whose rows are a plain list so the
 * spacer and the header's own surface are visible against content of their own.
 */

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

/** One setting: a label and the state a reader would change. */
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

/** A settings card whose section titles pin to the top of the scroll box. */
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
          // The card is the surface behind a held header.
          surfaceColor={theme.colors.card}
          style={{ height: 240 }}
          sections={sections}
        />
      </CardContent>
    </Card>
  );
};
