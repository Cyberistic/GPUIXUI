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
  Message,
  MessageActions,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
  type MessageToolCall,
  type MessageVariant,
} from "../message.js";
import { Bubble, BubbleContent } from "../bubble.js";

const themes: ReadonlyArray<readonly [TestTheme, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
];

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
    <Message
      testId="row"
      variant={variant}
      timestamp="09:41"
      meta={<text>read</text>}
    >
      <MessageAvatar />
      <MessageContent
        testId="content"
        reasoning={reasoning}
        toolCalls={toolCalls}
        sources={sources}
        streaming={streaming}
      >
        <MessageHeader />
        <Bubble
          align={variant === "user" ? "end" : "start"}
          variant={variant === "user" ? "muted" : "ghost"}
        >
          <BubbleContent testId="message-bubble">
            <text>{body}</text>
          </BubbleContent>
        </Bubble>
        <MessageFooter>
          <MessageActions
            testId="actions"
            onCopy={onCopy}
            onRetry={onRetry}
            onFeedback={onFeedback}
          />
        </MessageFooter>
      </MessageContent>
    </Message>
  </div>
);

const fillOf = (
  root: ComponentTestRoot,
  testId: string,
): Option.Option<unknown> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.findByTestId(testId)),
    (element) => Option.fromNullishOr(element.style.backgroundColor),
  );

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

  it("reads a stored variant name it does not ship as the documented default", () => {
    // @ts-expect-error — a variant a store wrote, not the union the props declare.
    const stored: MessageVariant = "customer";

    const root = renderComponent(<Row variant={stored} />);
    const groups = nodesWithRole(root.renderer, "group").map(
      (node) => node.name,
    );
    const images = nodesWithRole(root.renderer, "image").map(
      (node) => node.name,
    );

    expect(groups).toContain("Assistant");
    expect(images).toContain("Assistant");
    expect(root.renderer.findByTestId("row")?.style.flexDirection).toBe("row");

    root.unmount();
  });

  it("paints no slot for a saved reply whose slots are not lists", () => {
    const root = renderComponent(
      <div style={{ width: 520, padding: 24 }}>
        <Message testId="row" variant="assistant">
          <MessageAvatar />
          <MessageContent
            testId="content"
            // @ts-expect-error — a slot a store wrote as absent.
            toolCalls={null}
            // @ts-expect-error — a slot a store wrote as absent.
            sources={null}
          >
            <Bubble>
              <BubbleContent>
                <text>The layout pass is done.</text>
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </div>,
    );

    expect(root.renderer.findByText("The layout pass is done.")).toBeDefined();
    expect(nodesWithRole(root.renderer, "list")).toHaveLength(0);
    expect(root.renderer.findByTestId("row")).toBeDefined();

    root.unmount();
  });

  it("reads a blank slot name or sentence as the documented words", () => {
    const root = renderComponent(
      <div style={{ width: 520, padding: 24 }}>
        <Message variant="assistant">
          <MessageAvatar />
          <MessageContent
            reasoning="Checked the layout pass."
            reasoningLabel="   "
            sources={[{ label: "Docs" }]}
            sourcesLabel=""
            streaming
            streamingLabel="  "
          >
            <Bubble>
              <BubbleContent>
                <text>Body</text>
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
        <Message variant="assistant">
          <MessageContent reasoning="   ">
            <Bubble>
              <BubbleContent>
                <text>Body</text>
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </div>,
    );

    const lists = nodesWithRole(root.renderer, "list").map((node) => node.name);
    expect(lists).toContain("Sources");
    expect(root.renderer.findByText("Reasoning")).toBeDefined();
    expect(root.renderer.findByText("Streaming…")).toBeDefined();

    expect(
      root.renderer.getAllText().filter((line) => line === "Reasoning"),
    ).toHaveLength(1);
    expect(root.renderer.findByText("   ")).toBeUndefined();

    root.unmount();
  });

  it("reads a slot name that is not text as the documented words", () => {
    const root = renderComponent(
      <div style={{ width: 520, padding: 24 }}>
        <Message variant="assistant">
          <MessageContent
            reasoning="Checked the layout pass."
            // @ts-expect-error — the names a stored reply wrote.
            reasoningLabel={42}
            sources={[{ label: "Docs" }]}
            // @ts-expect-error — the names a stored reply wrote.
            sourcesLabel={{ text: "Sources" }}
            streaming
            // @ts-expect-error — the names a stored reply wrote.
            streamingLabel={42}
          >
            <Bubble>
              <BubbleContent>
                <text>Body</text>
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </div>,
    );

    try {
      const lists = nodesWithRole(root.renderer, "list").map(
        (node) => node.name,
      );
      expect(lists).toEqual(["Sources"]);
      expect(root.renderer.findByText("Reasoning")).toBeDefined();
      expect(root.renderer.findByText("Streaming…")).toBeDefined();
    } finally {
      root.unmount();
    }
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

      expect(fillOf(assistant, "message-bubble")).toEqual(
        Option.some("transparent"),
      );
      assistant.unmount();
    });
  });

  it("paints the author, timestamp and meta the root owns", () => {
    const root = renderComponent(<Row />);

    expect(root.renderer.getAllText()).toEqual(
      expect.arrayContaining(["Assistant", "09:41", "read"]),
    );

    root.unmount();
  });

  it("reads a blank timestamp as no timestamp, never a blank line", () => {
    const root = renderComponent(
      <div style={{ width: 520 }}>
        <Message timestamp="   ">
          <MessageAvatar />
          <MessageContent>
            <MessageHeader />
            <Bubble>
              <BubbleContent>
                <text>Body</text>
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </div>,
    );

    expect(root.renderer.getAllText()).toContain("Assistant");
    expect(
      root.renderer.getAllText().filter((line) => line.trim() === ""),
    ).toEqual([]);

    root.unmount();
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

  it("reads a stored tool status it does not name as Unknown, not a blank line", () => {
    const root = renderComponent(
      <Row
        toolCalls={[
          // @ts-expect-error — a status a store wrote, not the union the prop declares.
          { name: "search", status: "succeeded", result: "3 files" },
          { name: "deploy", status: "error", result: "No credentials" },
        ]}
      />,
    );
    try {
      const text = root.renderer.getAllText();

      expect(text).toEqual(
        expect.arrayContaining(["search", "Unknown", "deploy", "Failed"]),
      );

      expect(root.renderer.findByType("svg")).toHaveLength(1);
    } finally {
      root.unmount();
    }
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
        <Message>
          <MessageContent>
            <Bubble>
              <BubbleContent>
                <text>Body</text>
              </BubbleContent>
            </Bubble>
          </MessageContent>
          <MessageActions onCopy={() => undefined} />
        </Message>,
      ),
    ).toContain("MessageActions cannot be used inside Message");
  });

  it("rejects an avatar inside the content", () => {
    expect(
      caught(
        <Message>
          <MessageContent>
            <MessageAvatar />
            <Bubble>
              <BubbleContent>
                <text>Body</text>
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>,
      ),
    ).toContain("MessageAvatar cannot be used inside MessageContent");
  });
});
