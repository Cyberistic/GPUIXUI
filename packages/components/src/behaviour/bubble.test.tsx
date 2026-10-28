/**
 * Bubble behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a variant that paints the wrong role (or none); an
 * alignment that moves the content but not the avatar; a bubble that ignores
 * its 80% cap; a grouped run whose corners do not join; and an action strip
 * that only appears by taking height from the bubble — the layout shift the
 * chat rebuild removes. A focus event belongs to the focused element in
 * 0.11.0, so the strip's keyboard path is proven through a `BubbleAction`.
 */

import { Component, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  Bubble,
  BubbleAction,
  BubbleActions,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "../bubble.js";
import { Avatar } from "../avatar.js";
import { alpha, darkTheme } from "../internal/theme.js";
import {
  hoverCentreOf,
  requireBounds,
  settle,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

/** Catches a render throw so a placement error can be asserted on. */
class Caught extends Component<
  { readonly children?: ReactNode },
  { readonly message: string | null }
> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    return this.state.message === null ? (
      this.props.children
    ) : (
      <text testId="caught">{this.state.message}</text>
    );
  }
}

/** Render under the boundary and return the message a reader would see. */
const caught = (node: ReactNode): string => {
  const root = renderComponent(<Caught>{node}</Caught>);
  const text = root.renderer.getAllText().join("\n");
  root.unmount();
  return text;
};

const variants = [
  ["default", darkTheme.colors.primary, darkTheme.colors.primaryForeground],
  [
    "secondary",
    darkTheme.colors.secondary,
    darkTheme.colors.secondaryForeground,
  ],
  ["muted", darkTheme.colors.muted, darkTheme.colors.foreground],
  [
    "tinted",
    alpha(darkTheme.colors.primary, 0.14),
    darkTheme.colors.foreground,
  ],
  ["outline", darkTheme.colors.background, darkTheme.colors.foreground],
  ["ghost", "transparent", darkTheme.colors.foreground],
  [
    "destructive",
    darkTheme.colors.destructiveSoft,
    darkTheme.colors.destructiveSoftForeground,
  ],
] as const;

/** One bubble with a content surface, and the parts a case adds. */
const Surface = ({
  align = "start",
  group = "single",
  avatar,
  actions,
  reactions,
}: {
  readonly align?: "start" | "end";
  readonly group?: "single" | "first" | "middle" | "last";
  readonly avatar?: boolean;
  readonly actions?: boolean;
  readonly reactions?: boolean;
}) => (
  <div style={{ width: 400 }}>
    <Bubble
      testId="bubble"
      align={align}
      group={group}
      avatar={
        avatar ? (
          <Avatar testId="bubble-avatar" name="Ada" size="sm" />
        ) : undefined
      }
    >
      <BubbleContent testId="bubble-content">
        <text>Roll it out.</text>
      </BubbleContent>
      {actions ? (
        <BubbleActions testId="bubble-actions" label="Reply actions">
          <BubbleAction
            testId="copy-action"
            label="Copy"
            onClick={() => undefined}
          />
        </BubbleActions>
      ) : null}
      {reactions ? (
        <BubbleReactions testId="bubble-reactions" label="Reactions: thumbs up">
          <text>👍</text>
        </BubbleReactions>
      ) : null}
    </Bubble>
  </div>
);

describe("Bubble", () => {
  it("paints every surface with its documented role", () => {
    variants.forEach(([variant, fill, ink]) => {
      const root = renderComponent(
        <div style={{ width: 400 }}>
          <Bubble variant={variant}>
            <BubbleContent testId="bubble-content">
              <text>Roll it out.</text>
            </BubbleContent>
          </Bubble>
        </div>,
      );
      const content = root.renderer.findByTestId("bubble-content");
      expect({
        variant,
        fill: content?.style.backgroundColor,
        ink: content?.style.color,
      }).toEqual({
        variant,
        fill,
        ink,
      });
      root.unmount();
    });
  });

  it("mirrors an end-aligned row and puts the avatar on the outer edge", () => {
    const root = renderComponent(<Surface align="end" avatar />);

    expect(root.renderer.findByTestId("bubble")?.style.alignSelf).toBe(
      "flex-end",
    );
    const content = requireBounds(root, "bubble-content");
    const avatar = requireBounds(root, "bubble-avatar");
    expect(avatar.x).toBeGreaterThan(content.x);

    root.unmount();
  });

  it("caps the row at 80% and takes an override", () => {
    const root = renderComponent(<Surface />);

    expect(root.renderer.findByTestId("bubble")?.style.maxWidth).toBe(0.8);

    root.rerender(
      <Bubble testId="bubble" maxWidth={240}>
        <BubbleContent>
          <text>Roll it out.</text>
        </BubbleContent>
      </Bubble>,
    );
    expect(root.renderer.findByTestId("bubble")?.style.maxWidth).toBe(240);

    root.rerender(
      <Bubble testId="bubble" variant="ghost">
        <BubbleContent>
          <text>Roll it out.</text>
        </BubbleContent>
      </Bubble>,
    );
    expect(root.renderer.findByTestId("bubble")?.style.maxWidth).toBe(1);

    root.unmount();
  });

  it("paints the surface's type and corner from the theme", () => {
    const root = renderComponent(<Surface />);
    const content = root.renderer.findByTestId("bubble-content")?.style;

    expect(content?.fontSize).toBe(14);
    expect(content?.lineHeight).toBe(20);
    expect(content?.paddingTop).toBe(8);
    expect(content?.paddingLeft).toBe(12);
    expect(content?.borderTopLeftRadius).toBe(darkTheme.radius.xl);
    expect(content?.borderBottomRightRadius).toBe(darkTheme.radius.xl);

    root.unmount();
  });

  it("hangs the reaction pill over the surface's edge", () => {
    const root = renderComponent(<Surface reactions />);
    const content = requireBounds(root, "bubble-content");
    const pill = requireBounds(root, "bubble-reactions");
    const painted = root.renderer.findByTestId("bubble-reactions")?.style;

    // The pill is a 14px line in 2px of padding: 24 tall, and shadcn hangs a
    // quarter of it over the edge (`translate-y-3/4`).
    expect(pill.height).toBe(24);
    expect(content.y + content.height - pill.y).toBe(6);
    expect(painted?.fontSize).toBe(14);
    expect(painted?.borderRadius).toBe(9999);
    expect(painted?.marginTop).toBe(-(6 + 4));

    root.unmount();
  });

  it("insets the reaction pill from the sender's edge", () => {
    const gapToEdge = (align: "start" | "end") => {
      const root = renderComponent(<Surface align={align} reactions />);
      const content = requireBounds(root, "bubble-content");
      const pill = requireBounds(root, "bubble-reactions");
      const gap =
        align === "end"
          ? content.x + content.width - (pill.x + pill.width)
          : pill.x - content.x;
      root.unmount();
      return gap;
    };

    expect(gapToEdge("end")).toBe(darkTheme.spacing.lg);
    expect(gapToEdge("start")).toBe(darkTheme.spacing.lg);
  });

  it("joins a grouped run's corners and keeps a tail on the last", () => {
    const corners = (group: "first" | "middle" | "last") => {
      const root = renderComponent(<Surface group={group} />);
      const content = root.renderer.findByTestId("bubble-content")?.style;
      const painted = {
        topLeft: content?.borderTopLeftRadius,
        topRight: content?.borderTopRightRadius,
        bottomLeft: content?.borderBottomLeftRadius,
        bottomRight: content?.borderBottomRightRadius,
      };
      root.unmount();
      return painted;
    };

    expect(corners("first")).toEqual({
      topLeft: 12,
      topRight: 12,
      bottomLeft: 4,
      bottomRight: 4,
    });
    expect(corners("middle")).toEqual({
      topLeft: 4,
      topRight: 4,
      bottomLeft: 4,
      bottomRight: 4,
    });
    // The sender-side bottom corner keeps the short tail; the outer one stays
    // the full radius.
    expect(corners("last")).toEqual({
      topLeft: 4,
      topRight: 4,
      bottomLeft: 4,
      bottomRight: 12,
    });

    const run = renderComponent(
      <BubbleGroup testId="run">
        {(["first", "middle", "last"] as const).map((group) => (
          <Bubble key={group} testId={`run-${group}`} group={group}>
            <BubbleContent testId={`run-${group}-content`}>
              <text>{group}</text>
            </BubbleContent>
          </Bubble>
        ))}
      </BubbleGroup>,
    );
    const first = requireBounds(run, "run-first");
    const middle = requireBounds(run, "run-middle");
    const last = requireBounds(run, "run-last");
    // shadcn's `BubbleGroup` gap is 8px, tighter than the transcript's turns.
    expect(middle.y - (first.y + first.height)).toBe(8);
    expect(last.y - (middle.y + middle.height)).toBe(8);
    run.unmount();
  });

  it("reveals the action strip on hover without moving the bubble", () => {
    const root = renderComponent(<Surface actions />);
    const before = requireBounds(root, "bubble-content").y;
    expect(root.renderer.findByTestId("bubble-actions")?.style.opacity).toBe(0);

    hoverCentreOf(root, "bubble-content");
    settle(root);

    expect(root.renderer.findByTestId("bubble-actions")?.style.opacity).toBe(1);
    expect(requireBounds(root, "bubble-content").y).toBe(before);

    root.unmount();
  });

  it("reveals the action strip when a bubble action takes focus", () => {
    const root = renderComponent(<Surface actions />);
    const action = root.renderer.findByTestId("copy-action");

    expect(root.renderer.findByTestId("bubble-actions")?.style.opacity).toBe(0);
    root.renderer.focusElement(action?.id ?? -1);
    settle(root);

    expect(root.renderer.findByTestId("bubble-actions")?.style.opacity).toBe(1);

    root.unmount();
  });

  it("renders a named reaction row", () => {
    const root = renderComponent(<Surface reactions />);
    const nodes = root.renderer.getA11yTree().nodes ?? {};
    const named = Object.values(nodes).some(
      (node) => node.aria?.label === "Reactions: thumbs up",
    );

    expect(named).toBe(true);

    root.unmount();
  });

  it("rejects a bubble action outside its strip", () => {
    expect(caught(<BubbleAction label="Copy" />)).toContain(
      "BubbleAction must be used inside BubbleActions",
    );
  });
});
