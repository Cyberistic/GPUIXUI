/**
 * A press on an avatar inside a row reaches the row (plan 731).
 *
 * Bug guarded: the disc paints a fill, and on 0.11.0 an element with a fill
 * takes the press itself, so a list row, a kanban card or an inbox thread did
 * nothing when the reader pressed the person's initials — every block had to
 * remember `clickThrough`, and the pipeline, inbox and kanban blocks did not.
 */
import { describe, expect, it, vi } from "vitest";
import { Avatar } from "../avatar.js";
import { clickCentreOf } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

describe("an avatar in a row", () => {
  it("lets the press through to the row", () => {
    const onRow = vi.fn();
    const root = renderComponent(
      <div
        testId="row"
        onClick={onRow}
        style={{ display: "flex", padding: 20 }}
      >
        <Avatar name="Killua Zoldyck" testId="avatar" />
      </div>,
    );
    clickCentreOf(root, "avatar");
    root.unmount();
    expect(onRow).toHaveBeenCalledOnce();
  });

  it("keeps the press when the avatar is a control of its own", () => {
    const onAvatar = vi.fn();
    const onRow = vi.fn();
    const root = renderComponent(
      <div
        testId="row"
        onClick={onRow}
        style={{ display: "flex", padding: 20 }}
      >
        <Avatar name="Gon Freecss" testId="avatar" onClick={onAvatar} />
      </div>,
    );
    clickCentreOf(root, "avatar");
    root.unmount();
    expect(onAvatar).toHaveBeenCalledOnce();
  });
});
