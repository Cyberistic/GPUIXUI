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
