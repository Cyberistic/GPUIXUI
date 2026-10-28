/**
 * Browser preview for the Item page.
 *
 * The row is a layout primitive, so the drawing is the layout: media, text and
 * actions on one line, header and footer on their own lines, and the three
 * surfaces a `variant` picks. It paints no hover, because the shipped row does
 * not either — the action is the button the row carries.
 */

const rows = [
  {
    id: "default",
    variant: "default",
    title: "design-system.md",
    description: "Tokens, semantic roles and the theme extension mechanism.",
    action: "Open",
  },
  {
    id: "outline",
    variant: "outline",
    title: "contributing.md",
    description: "How to add a component and keep the gates green.",
    action: "Review",
  },
  {
    id: "muted",
    variant: "muted",
    title: "release-notes.md",
    description: "What shipped in the last wave.",
    action: "Read",
  },
] as const;

export function ItemDemo() {
  return (
    <div className="gx-item-scene">
      <div className="gx-item-group" role="list">
        {rows.map((row) => (
          <div
            className="gx-item"
            data-variant={row.variant}
            key={row.id}
            role="listitem"
          >
            <span aria-hidden="true" className="gx-item-media">
              ▤
            </span>
            <div className="gx-item-content">
              <p className="gx-item-title">{row.title}</p>
              <p className="gx-item-description">{row.description}</p>
            </div>
            <div className="gx-item-actions">
              <button className="gx-item-action" type="button">
                {row.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const itemDemoSource = `import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@gpuixui/components/item";

<ItemGroup>
  <Item variant="outline" size="default">
    <ItemMedia variant="icon">▤</ItemMedia>
    <ItemContent>
      <ItemTitle>design-system.md</ItemTitle>
      <ItemDescription>Tokens and semantic roles.</ItemDescription>
    </ItemContent>
    <ItemActions>
      <Button size="sm">Open</Button>
    </ItemActions>
  </Item>
</ItemGroup>;`;
