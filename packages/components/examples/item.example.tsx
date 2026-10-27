/** @jsxImportSource @gpuix/react */
/**
 * Item example: a shared drive's rows in the three surfaces.
 *
 * The row is a layout primitive — it paints no hover — so the actions are the
 * buttons that act on it, and the media carries the kind of file the row names.
 */

import { Icon } from "@gpuixui/icons";
import { Button } from "../src/internal/button.js";
import { useTheme } from "../src/internal/theme.js";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "../src/item.js";

/** Three rows: default, outline and muted. */
export const ItemExample = () => {
  const theme = useTheme();
  const rows = [
    {
      id: "default",
      title: "design-system.md",
      description: "Tokens, semantic roles and the theme extension mechanism.",
      variant: "default",
    },
    {
      id: "outline",
      title: "contributing.md",
      description: "How to add a component and keep the gates green.",
      variant: "outline",
    },
    {
      id: "muted",
      title: "release-notes.md",
      description: "What shipped in the last wave.",
      variant: "muted",
    },
  ] as const;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, width: 460 }}
    >
      <ItemGroup>
        {rows.map((row) => (
          <Item key={row.id} variant={row.variant}>
            <ItemMedia variant="icon">
              <Icon
                name="file"
                size="sm"
                color={theme.colors.mutedForeground}
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{row.title}</ItemTitle>
              <ItemDescription>{row.description}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Open ${row.title}`}
              >
                Open
              </Button>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
};
