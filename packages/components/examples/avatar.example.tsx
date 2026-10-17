/**
 * Avatar example: a members panel and a facepile.
 *
 * Composition, not a gallery: the row shows how an avatar, a name and a status
 * badge read together, and the facepile shows the small sizes overlapping the
 * way a comment thread does.
 */

import * as Arr from "effect/Array";
import { Avatar, type AvatarStatus } from "../src/avatar.js";
import { Badge } from "../src/badge.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../src/card.js";
import { textStyle, useTheme } from "../src/internal/theme.js";

/** One member: the initials fallback, a role badge and a presence state. */
const members: ReadonlyArray<{
  readonly name: string;
  readonly role: string;
  readonly status: AvatarStatus;
}> = [
  { name: "Ada Lovelace", role: "Owner", status: "online" },
  { name: "Jean-Luc Picard", role: "Reviewer", status: "away" },
  { name: "Grace Hopper", role: "Engineer", status: "busy" },
  { name: "李 小龙", role: "Designer", status: "offline" },
];

/** The tiny overlapping avatars a comment thread shows. */
const faces: ReadonlyArray<string> = [
  "Ada Lovelace",
  "Grace Hopper",
  "Jean-Luc Picard",
  "Alan Turing",
];

/** A members panel with a facepile footer. */
export const AvatarExample = () => {
  const theme = useTheme();
  return (
    <Card style={{ maxWidth: 440 }}>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>4 of 20 seats used</CardDescription>
      </CardHeader>
      <CardContent>
        {Arr.map(members, (member) => (
          <div
            key={member.name}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.lg,
            }}
          >
            <Avatar name={member.name} size="md" status={member.status} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
              }}
            >
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.foreground,
                }}
              >
                {member.name}
              </text>
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {member.status}
              </text>
            </div>
            <Badge variant="neutral" size="sm">
              {member.role}
            </Badge>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.lg,
          }}
        >
          <div style={{ display: "flex", flexDirection: "row" }}>
            {Arr.map(faces, (name, index) => (
              <Avatar
                key={name}
                name={name}
                size="sm"
                // Overlap every face after the first, the way a facepile does.
                style={index === 0 ? undefined : { marginLeft: -6 }}
              />
            ))}
          </div>
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            and 16 others
          </text>
        </div>
      </CardContent>
    </Card>
  );
};
