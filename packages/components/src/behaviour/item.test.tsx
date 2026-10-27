/**
 * Item in the real GPUix renderer.
 *
 * The bugs these guard: an actions slot painted before the text it acts on (or
 * media after it) when the row wraps; a header that shares the media/content
 * line instead of taking its own; a stored `variant`/`size` the tables do not
 * carry dropping the surface instead of painting the documented default; and a
 * row that paints its own hover although it is a layout primitive with no
 * state.
 */

import { describe, expect, it } from "vitest";
import { Button } from "../internal/button.js";
import { requireBounds, settle } from "../internal/interaction.js";
import { darkTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "../item.js";

/** A row with media, text and an action. */
const Row = ({
  variant,
  size,
}: {
  readonly variant?: "default" | "outline" | "muted";
  readonly size?: "default" | "sm";
}) => (
  <div style={{ padding: 20, width: 400 }}>
    <Item testId="row" variant={variant} size={size}>
      <ItemMedia testId="media" variant="icon">
        <text>◆</text>
      </ItemMedia>
      <ItemContent testId="content">
        <ItemTitle testId="title">Tokens</ItemTitle>
        <ItemDescription testId="description">
          The semantic roles every surface reads.
        </ItemDescription>
      </ItemContent>
      <ItemActions testId="actions">
        <Button testId="action">Open</Button>
      </ItemActions>
    </Item>
  </div>
);

/** A row whose header and footer take their own lines. */
const HeaderRow = () => (
  <div style={{ padding: 20, width: 400 }}>
    <Item testId="row">
      <ItemHeader testId="header">
        <text>Deploy</text>
      </ItemHeader>
      <ItemContent testId="content">
        <ItemTitle>Production</ItemTitle>
      </ItemContent>
    </Item>
  </div>
);

describe("Item", () => {
  it("lays the media before the content and the actions after it", () => {
    const page = renderComponent(<Row />);
    try {
      settle(page);
      const media = requireBounds(page, "media");
      const content = requireBounds(page, "content");
      const actions = requireBounds(page, "actions");

      expect(media.x + media.width).toBeLessThanOrEqual(content.x);
      expect(content.x + content.width).toBeLessThanOrEqual(actions.x);
    } finally {
      page.unmount();
    }
  });

  it("gives the header its own line above the content", () => {
    const page = renderComponent(<HeaderRow />);
    try {
      settle(page);
      const row = requireBounds(page, "row");
      const header = requireBounds(page, "header");
      const content = requireBounds(page, "content");

      expect(header.width).toBeLessThanOrEqual(row.width);
      expect(header.y + header.height).toBeLessThanOrEqual(content.y);
    } finally {
      page.unmount();
    }
  });

  it("paints the surface its variant names", () => {
    const outline = renderComponent(<Row variant="outline" />);
    try {
      settle(outline);
      expect(outline.renderer.findByTestId("row")?.style.borderWidth).toBe(1);
      expect(outline.renderer.findByTestId("row")?.style.borderColor).toBe(
        darkTheme.colors.border,
      );
    } finally {
      outline.unmount();
    }

    const muted = renderComponent(<Row variant="muted" />);
    try {
      settle(muted);
      expect(muted.renderer.findByTestId("row")?.style.backgroundColor).toBe(
        darkTheme.colors.muted,
      );
    } finally {
      muted.unmount();
    }
  });

  it("paints the compact density for the small size", () => {
    const regular = renderComponent(<Row />);
    let regularHeight = 0;
    try {
      settle(regular);
      regularHeight = requireBounds(regular, "row").height;
    } finally {
      regular.unmount();
    }

    const compact = renderComponent(<Row size="sm" />);
    try {
      settle(compact);
      expect(requireBounds(compact, "row").height).toBeLessThan(regularHeight);
    } finally {
      compact.unmount();
    }
  });

  it("groups rows in a list and paints the documented default for a renamed slot", () => {
    const page = renderComponent(
      <div style={{ padding: 20, width: 400 }}>
        <ItemGroup testId="group">
          {/* @ts-expect-error a stored name is not the union's literal */}
          <Item testId="row" variant="renamed" size="renamed">
            <ItemContent>
              <ItemTitle testId="title">Tokens</ItemTitle>
            </ItemContent>
          </Item>
        </ItemGroup>
      </div>,
    );
    try {
      settle(page);
      const group = page.renderer.findByTestId("group");
      expect(group?.customProps).toMatchObject({ role: "list" });
      expect(
        page.renderer.findByTestId("row")?.style.borderWidth,
      ).toBeUndefined();
      expect(page.renderer.findByTestId("title")).toBeDefined();
    } finally {
      page.unmount();
    }
  });

  it("paints no hover of its own", () => {
    const page = renderComponent(<Row />);
    try {
      settle(page);
      expect(page.renderer.findByTestId("row")?.style.hover).toBeUndefined();
    } finally {
      page.unmount();
    }
  });
});
