/** @jsxImportSource @gpuix/react */
import { AvatarGroup, type AvatarGroupMember } from "../src/avatar-group.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

const team: ReadonlyArray<AvatarGroupMember> = [
  { name: "Ada Lovelace", status: "online" },
  { name: "Grace Hopper", status: "busy" },
  { name: "Alan Turing" },
  { name: "Katherine Johnson", status: "away" },
  { name: "Jean Bartik" },
  { name: "Margaret Hamilton", status: "offline" },
];

export const AvatarGroupExample = () => {
  const theme = useTheme();
  return (
    <Card style={{ maxWidth: 440 }}>
      <CardHeader>
        <CardTitle>Project team</CardTitle>
        <CardDescription>6 members, 2 online</CardDescription>
      </CardHeader>
      <CardContent>
        <AvatarGroup members={team} max={4} size="md" label="Project team" />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.sm,
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.muted,
          }}
        >
          <AvatarGroup
            members={team.slice(0, 3)}
            size="sm"
            label="Thread participants"
            ringColor={theme.colors.muted}
          />
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            3 replied in this thread
          </text>
        </div>
      </CardContent>
    </Card>
  );
};
