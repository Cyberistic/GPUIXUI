/**
 * Message behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a row whose variant changes nothing (a user message
 * that reads as an assistant's); a bubble that borrows the wrong role; a
 * reasoning panel that is open by default (the plan's contract is closed); a
 * tool call whose failed state is invisible; citations that are not a list; a
 * streaming marker that stays after the stream ends; an action row that renders
 * controls no handler can serve — and a part used in the wrong parent of its own
 * family, which must name both sides instead of painting in the wrong place.
 */

import * as Option from "effect/Option";
import { Component, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { clickCentreOf } from "../internal/interaction.js";
import { lightTheme, darkTheme, type Theme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import {
  MessageActions,
  MessageAvatar,
  MessageContent,
  MessageRoot,
  type MessageToolCall,
  type MessageVariant,
} from "../message.js";

const themes: ReadonlyArray<readonly [TestTheme, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
];

/** One row with the slots a test supplies. */
const Row = ({
  variant = "assistant",
  body = "The layout pass is done.",
  reasoning,
  toolCalls,
  sources,
  streaming,
  onCopy,
  onRetry,
  onFeedback,
}: {
  readonly variant?: MessageVariant;
  readonly body?: string;
  readonly reasoning?: string;
  readonly toolCalls?: ReadonlyArray<MessageToolCall>;
  readonly sources?: ReadonlyArray<{
    readonly label: string;
    readonly href?: string;
  }>;
  readonly streaming?: boolean;
  readonly onCopy?: () => void;
  readonly onRetry?: () => void;
  readonly onFeedback?: (feedback: "helpful" | "not-helpful") => void;
}) => (
  <div style={{ width: 520, padding: 24 }}>
    <MessageRoot testId="row" variant={variant}>
      <MessageAvatar />
      <MessageContent
        testId="content"
        reasoning={reasoning}
        toolCalls={toolCalls}
        sources={sources}
        streaming={streaming}
      >
        <text>{body}</text>
        <MessageActions
          testId="actions"
          onCopy={onCopy}
          onRetry={onRetry}
          onFeedback={onFeedback}
        />
      </MessageContent>
    </MessageRoot>
  </div>
);

/** The background a `testId` paints, `None` when it paints none. */
const fillOf = (
  root: ComponentTestRoot,
  testId: string,
): Option.Option<unknown> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.findByTestId(testId)),
    (element) => Option.fromNullishOr(element.style.backgroundColor),
  );

/** Click the element whose painted text is `label`. */
const clickText = (root: ComponentTestRoot, label: string): void => {
  const element = root.renderer.findByText(label);
  const bounds =
    element === undefined
      ? undefined
      : root.renderer.getElementBounds(element.id);
  if (element === undefined || bounds === undefined || bounds === null) {
    throw new Error(`behaviour: no painted element reading "${label}"`);
  }
  root.renderer.nativeSimulateClick(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
};

/** Catches a render throw so a placement error can be asserted on. */
class Caught extends Component<
  { readonly children?: ReactNode },
  { readonly message: string | null }
> {
  state: { readonly message: string | null } = { message: null };

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
  const text = root.renderer.getAllText();
  root.unmount();
  return text.join("\n");
};

describe("Message", () => {
  it("names the row after its variant", () => {
    const variants: ReadonlyArray<readonly [string, MessageVariant]> = [
      ["You", "user"],
      ["Assistant", "assistant"],
      ["System", "system"],
    ];
    const names: ReadonlyArray<string> = variants.map(([expected, variant]) => {
      const root = renderComponent(<Row variant={variant} />);
      const groups = nodesWithRole(root.renderer, "group");
      root.unmount();
      return groups.some((node) => node.name === expected) ? expected : "none";
    });

    expect(names).toEqual(["You", "Assistant", "System"]);
  });

  it("mirrors a user row and leaves an assistant row leading", () => {
    const user = renderComponent(<Row variant="user" />);
    expect(user.renderer.findByTestId("row")?.style.flexDirection).toBe(
      "row-reverse",
    );
    user.unmount();

    const assistant = renderComponent(<Row variant="assistant" />);
    expect(assistant.renderer.findByTestId("row")?.style.flexDirection).toBe(
      "row",
    );
    assistant.unmount();
  });

  it("paints a user bubble and leaves an assistant's body plain, in both themes", () => {
    themes.forEach(([name, theme]) => {
      const user = renderComponent(<Row variant="user" />, name);
      expect(fillOf(user, "message-bubble")).toEqual(
        Option.some(theme.colors.muted),
      );
      user.unmount();

      const assistant = renderComponent(<Row variant="assistant" />, name);
      // No bubble: the recipe paints no surface, so the strip behind it shows.
      expect(fillOf(assistant, "message-bubble")).toEqual(
        Option.some("transparent"),
      );
      assistant.unmount();
    });
  });

  it("keeps reasoning closed until its trigger is activated", () => {
    const root = renderComponent(<Row reasoning="Checked the layout pass." />);

    expect(
      root.renderer.findByTestId("message-reasoning-content"),
    ).toBeUndefined();

    clickCentreOf(root, "message-reasoning-trigger");

    expect(
      root.renderer.findByTestId("message-reasoning-content"),
    ).toBeDefined();
    expect(root.renderer.getAllText()).toContain("Checked the layout pass.");

    root.unmount();
  });

  it("renders no reasoning panel when none was supplied", () => {
    const root = renderComponent(<Row />);

    expect(
      root.renderer.findByTestId("message-reasoning-trigger"),
    ).toBeUndefined();

    root.unmount();
  });

  it("lists every tool call with its status and marks a failed one", () => {
    const root = renderComponent(
      <Row
        toolCalls={[
          { name: "read_file", status: "complete", result: "42 lines" },
          { name: "search", status: "running" },
          { name: "deploy", status: "error", result: "No credentials" },
        ]}
      />,
    );
    const text = root.renderer.getAllText();

    expect(text).toEqual(
      expect.arrayContaining([
        "read_file",
        "Done",
        "search",
        "Running",
        "deploy",
        "Failed",
      ]),
    );
    expect(text).toContain("42 lines");
    expect(text).toContain("No credentials");
    // Only the failed call carries the error glyph.
    expect(root.renderer.findByType("svg")).toHaveLength(1);

    root.unmount();
  });

  it("lists citations as a named list and carries each address as its description", () => {
    const root = renderComponent(
      <Row
        sources={[
          { label: "Design system", href: "https://example.test/design" },
          { label: "Release notes" },
        ]}
      />,
    );
    const list = nodesWithRole(root.renderer, "list");

    expect(list.map((node) => node.name)).toEqual(["Sources"]);
    expect(nodesWithRole(root.renderer, "listitem")).toHaveLength(2);
    expect(
      root.renderer
        .findByType("div")
        .map((element) => element.customProps?.["aria-description"]),
    ).toContain("https://example.test/design");

    root.unmount();
  });

  it("shows the streaming marker only while streaming", () => {
    const root = renderComponent(<Row streaming />);

    expect(root.renderer.findByTestId("message-streaming")).toBeDefined();
    expect(root.renderer.getAllText()).toContain("Streaming…");

    root.rerender(<Row />);
    expect(root.renderer.findByTestId("message-streaming")).toBeUndefined();

    root.unmount();
  });

  it("renders no action row until a handler can serve it", () => {
    const root = renderComponent(<Row />);

    expect(root.renderer.findByTestId("actions")).toBeUndefined();
    expect(root.renderer.getAllText()).not.toContain("Copy");

    root.unmount();
  });

  it("runs only the actions whose handler was supplied", () => {
    const onCopy = vi.fn();
    const onFeedback = vi.fn();
    const root = renderComponent(
      <Row onCopy={onCopy} onFeedback={onFeedback} />,
    );

    expect(root.renderer.getAllText()).toEqual(
      expect.arrayContaining(["Copy", "Helpful", "Not helpful"]),
    );
    expect(root.renderer.getAllText()).not.toContain("Retry");

    clickText(root, "Copy");
    expect(onCopy).toHaveBeenCalledTimes(1);

    clickText(root, "Not helpful");
    expect(onFeedback).toHaveBeenCalledWith("not-helpful");

    root.unmount();
  });

  it("rejects an action row directly in the root", () => {
    expect(
      caught(
        <MessageRoot>
          <MessageContent>
            <text>Body</text>
          </MessageContent>
          <MessageActions onCopy={() => undefined} />
        </MessageRoot>,
      ),
    ).toContain("MessageActions cannot be used inside MessageRoot");
  });

  it("rejects an avatar inside the content", () => {
    expect(
      caught(
        <MessageRoot>
          <MessageContent>
            <MessageAvatar />
            <text>Body</text>
          </MessageContent>
        </MessageRoot>,
      ),
    ).toContain("MessageAvatar cannot be used inside MessageContent");
  });
});
