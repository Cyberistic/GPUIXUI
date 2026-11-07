import * as Option from "effect/Option";
import { icons } from "@gpuixui/icons";
import { describe, expect, it, vi } from "vitest";
import type { ChatStatus } from "../chat/logic.js";
import { ChatComposer, ChatHeader, ChatMessages, ChatRoot } from "../chat.js";
import { a11yNodes, nodesWithRole } from "../internal/a11y.js";
import {
  clickCentreOf,
  requireBounds,
  settle,
} from "../internal/interaction.js";
import { darkTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { Message, MessageContent } from "../message.js";
import { Bubble, BubbleContent } from "../bubble.js";

const Conversation = ({
  rows,
  status,
  onSubmit,
  onStop,
  onRetry,
  onStatusChange,
  error,
  empty,
  grown,
}: {
  readonly rows: number;
  readonly status?: ChatStatus;
  readonly onSubmit?: (message: string) => void;
  readonly onStop?: () => void;
  readonly onRetry?: () => void;
  readonly onStatusChange?: (status: ChatStatus) => void;
  readonly error?: string;
  readonly empty?: string;
  readonly grown?: boolean;
}) => (
  <div style={{ height: 320, display: "flex", flexDirection: "column" }}>
    <ChatRoot
      testId="chat"
      status={status}
      onSubmit={onSubmit ?? (() => undefined)}
      onStop={onStop}
      onRetry={onRetry}
      onStatusChange={onStatusChange}
      error={error}
    >
      <ChatHeader title="Release thread" />
      <ChatMessages
        empty={
          empty === undefined ? undefined : <text testId="empty">{empty}</text>
        }
      >
        {Array.from({ length: rows }, (_, index) => (
          <Message
            key={index}
            testId={`row-${index}`}
            variant="assistant"
            style={grown && index === rows - 1 ? { height: 120 } : undefined}
          >
            <MessageContent testId={`body-${index}`}>
              <Bubble>
                <BubbleContent>
                  <text>{`message ${index}`}</text>
                </BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        ))}
      </ChatMessages>
      <ChatComposer testId="composer" hint="Enter to send" />
    </ChatRoot>
  </div>
);

const LAYOUT_CASE_TIMEOUT_MS = 30_000;

const type = (root: ComponentTestRoot, text: string): void => {
  root.renderer.focusElement(
    root.renderer.findByTestId("chat-field")?.id ?? -1,
  );
  text.split("").forEach((key) => root.renderer.simulateKeystrokes(key));
};

const jumpActive = (root: ComponentTestRoot): boolean =>
  root.renderer.findByTestId("chat-jump")?.customProps?.tabIndex === 0;

const offsetOf = (root: ComponentTestRoot): number =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(root.renderer.findByTestId("chat-messages")),
      (viewport) =>
        Option.fromNullishOr(root.renderer.getScrollOffset(viewport.id)?.[1]),
    ),
    () => 0,
  );

const wheel = (root: ComponentTestRoot, deltaY: number): void => {
  const { x, y, width, height } = requireBounds(root, "chat-messages");
  root.renderer.nativeSimulateScrollWheel(
    x + width / 2,
    y + height / 2,
    0,
    deltaY,
  );
};

const endIsVisible = (root: ComponentTestRoot, last: number): boolean => {
  const viewport = requireBounds(root, "chat-messages");
  const row = requireBounds(root, `row-${last}`);
  return row.y + row.height <= viewport.y + viewport.height + 1;
};

describe("Chat", () => {
  it("explains an empty conversation", () => {
    const root = renderComponent(<Conversation rows={0} />);

    expect(root.renderer.findByTestId("chat-empty")).toBeDefined();
    expect(root.renderer.getAllText()).toEqual(
      expect.arrayContaining([
        "Start the conversation",
        "Messages you send appear here.",
      ]),
    );

    root.unmount();
  });

  it("lets the caller replace the empty panel and hides it once rows exist", () => {
    const root = renderComponent(<Conversation rows={0} empty="Nothing yet" />);

    expect(root.renderer.getAllText()).toContain("Nothing yet");
    expect(root.renderer.getAllText()).not.toContain("Start the conversation");

    root.rerender(<Conversation rows={2} empty="Nothing yet" />);
    expect(root.renderer.findByTestId("chat-empty")).toBeUndefined();
    expect(root.renderer.getAllText()).not.toContain("Nothing yet");

    root.unmount();
  });

  it("sends the drafted text on Enter, clears the draft and moves to submitting", () => {
    const onSubmit = vi.fn();
    const onStatusChange = vi.fn();
    const root = renderComponent(
      <Conversation
        rows={1}
        onSubmit={onSubmit}
        onStatusChange={onStatusChange}
      />,
    );

    type(root, "hello");
    root.renderer.simulateKeystrokes("enter");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("hello");
    expect(onStatusChange).toHaveBeenCalledWith("submitting");

    root.rerender(
      <Conversation
        rows={1}
        status="idle"
        onSubmit={onSubmit}
        onStatusChange={onStatusChange}
      />,
    );

    type(root, "again");
    root.renderer.simulateKeystrokes("enter");
    expect(onSubmit).toHaveBeenLastCalledWith("again");

    root.unmount();
  });

  it("opens a new line on Shift+Enter without sending", () => {
    const onSubmit = vi.fn();
    const root = renderComponent(<Conversation rows={1} onSubmit={onSubmit} />);

    type(root, "first");
    root.renderer.simulateKeystrokes("shift-enter");
    type(root, "second");

    expect(onSubmit).not.toHaveBeenCalled();

    root.renderer.simulateKeystrokes("enter");
    expect(onSubmit).toHaveBeenCalledWith("first\nsecond");

    root.unmount();
  });

  it("offers Stop instead of Send while a reply is open", () => {
    const root = renderComponent(
      <Conversation rows={1} status="streaming" onStop={() => undefined} />,
    );

    expect(root.renderer.findByTestId("chat-stop")).toBeDefined();
    expect(root.renderer.findByTestId("chat-send")).toBeUndefined();

    root.unmount();
  });

  it("draws Send as the icon set's paper plane and keeps the word as its name", () => {
    const root = renderComponent(<Conversation rows={1} />);
    try {
      const [plane] = root.renderer.findByType("svg");

      expect(plane?.customProps?.source).toBe(icons.send);

      expect(root.renderer.getAllText()).not.toContain("Send");
      expect(
        a11yNodes(root.renderer)
          .filter((node) => node.role === "button")
          .map((node) => node.name),
      ).toContain("Send");
    } finally {
      root.unmount();
    }
  });

  it("refuses a send while a reply is open, and keeps the draft it refused", () => {
    const onSubmit = vi.fn();
    const root = renderComponent(
      <Conversation
        rows={1}
        status="streaming"
        onSubmit={onSubmit}
        onStop={() => undefined}
      />,
    );

    type(root, "queued");
    root.renderer.simulateKeystrokes("enter");

    expect(onSubmit).not.toHaveBeenCalled();

    expect(root.renderer.findByTestId("chat-field")?.customProps?.value).toBe(
      "queued",
    );

    root.rerender(
      <Conversation rows={1} onSubmit={onSubmit} onStop={() => undefined} />,
    );
    root.renderer.simulateKeystrokes("enter");
    expect(onSubmit).toHaveBeenCalledWith("queued");

    root.unmount();
  });

  it("stops the open reply with Escape and re-enables Send", () => {
    const onStop = vi.fn();
    const onStatusChange = vi.fn();
    const onSubmit = vi.fn();
    const root = renderComponent(
      <Conversation
        rows={1}
        status="streaming"
        onSubmit={onSubmit}
        onStop={onStop}
        onStatusChange={onStatusChange}
      />,
    );

    type(root, "a");
    root.renderer.simulateKeystrokes("escape");

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith("idle");

    root.rerender(
      <Conversation
        rows={1}
        onSubmit={onSubmit}
        onStop={onStop}
        onStatusChange={onStatusChange}
      />,
    );
    expect(root.renderer.findByTestId("chat-send")).toBeDefined();

    root.unmount();
  });

  it("shows a failed reply and retries it", () => {
    const onRetry = vi.fn();
    const onStatusChange = vi.fn();
    const root = renderComponent(
      <Conversation
        rows={2}
        onRetry={onRetry}
        onStatusChange={onStatusChange}
      />,
    );
    const composer = requireBounds(root, "composer").y;

    root.rerender(
      <Conversation
        rows={2}
        status="error"
        error="The model timed out."
        onRetry={onRetry}
        onStatusChange={onStatusChange}
      />,
    );

    expect(requireBounds(root, "composer").y).toBe(composer);
    expect(root.renderer.findByTestId("chat-error")).toBeDefined();
    expect(root.renderer.getAllText()).toContain("The model timed out.");

    clickCentreOf(root, "chat-error-retry");
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith("submitting");

    root.unmount();
  });

  it("keeps the failed reply visible when the reader is scrolled to the top", () => {
    const root = renderComponent(
      <Conversation rows={30} status="error" onRetry={() => undefined} />,
    );
    wheel(root, 2000);

    const error = requireBounds(root, "chat-error");
    const viewport = requireBounds(root, "chat-messages");
    const chat = requireBounds(root, "chat");
    expect(error.y).toBeGreaterThanOrEqual(chat.y);
    expect(error.y + error.height).toBeLessThanOrEqual(viewport.y);

    root.unmount();
  });

  it("takes a disabled field out of the tab order and paints the disabled role", () => {
    const root = renderComponent(
      <div style={{ height: 320, display: "flex", flexDirection: "column" }}>
        <ChatRoot onSubmit={() => undefined}>
          <ChatMessages>
            <Message testId="row">
              <MessageContent>
                <Bubble>
                  <BubbleContent>
                    <text>hi</text>
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          </ChatMessages>
          <ChatComposer testId="composer" disabled />
        </ChatRoot>
      </div>,
    );
    const field = root.renderer.findByTestId("chat-field");
    const theme = darkTheme;

    expect(field?.customProps?.tabIndex).toBe(-1);
    expect(field?.style.color).toBe(theme.colors.disabledForeground);

    root.unmount();
  });

  it("keeps the composer in place when a message arrives and follows the tail", () => {
    const root = renderComponent(<Conversation rows={30} />);
    const composerBefore = requireBounds(root, "composer");
    expect(endIsVisible(root, 29)).toBe(true);

    root.rerender(<Conversation rows={31} />);

    expect(endIsVisible(root, 30)).toBe(true);
    expect(requireBounds(root, "composer").y).toBe(composerBefore.y);

    root.unmount();
  });

  it("does not yank a reader who scrolled up while a message arrives", () => {
    const root = renderComponent(<Conversation rows={30} />);
    wheel(root, 160);
    const before = offsetOf(root);
    expect(before).toBeLessThan(0);

    root.rerender(<Conversation rows={31} />);

    expect(offsetOf(root)).toBe(before);
    expect(endIsVisible(root, 30)).toBe(false);

    root.unmount();
  });

  it(
    "appends three messages without moving the composer, following only at the bottom",
    () => {
      const root = renderComponent(<Conversation rows={30} />);
      const composer = requireBounds(root, "composer").y;
      const viewport = requireBounds(root, "chat-messages");
      expect(viewport.height).toBeGreaterThan(100);
      expect(composer).toBeGreaterThan(viewport.y + viewport.height);
      const before = offsetOf(root);
      expect(endIsVisible(root, 29)).toBe(true);

      [31, 32, 33].forEach((rows) => {
        root.rerender(<Conversation rows={rows} />);
        expect(requireBounds(root, "composer").y).toBe(composer);
        expect(endIsVisible(root, rows - 1)).toBe(true);
      });

      expect(offsetOf(root)).toBeLessThan(before);
      expect(jumpActive(root)).toBe(false);

      root.unmount();
    },
    LAYOUT_CASE_TIMEOUT_MS,
  );

  it(
    "appends three messages without moving a reader who scrolled up",
    () => {
      const root = renderComponent(<Conversation rows={30} />);
      const composer = requireBounds(root, "composer").y;
      const viewport = requireBounds(root, "chat-messages").height;
      wheel(root, 160);
      settle(root);

      expect(requireBounds(root, "chat-messages").height).toBe(viewport);
      expect(requireBounds(root, "composer").y).toBe(composer);
      const before = offsetOf(root);
      expect(before).toBeLessThan(0);

      [31, 32, 33].forEach((rows) => {
        root.rerender(<Conversation rows={rows} />);
        expect(requireBounds(root, "composer").y).toBe(composer);
        expect(offsetOf(root)).toBe(before);
        expect(endIsVisible(root, rows - 1)).toBe(false);
      });

      expect(jumpActive(root)).toBe(true);
      expect(root.renderer.getAllText()).toContain("3 new messages");

      root.unmount();
    },
    LAYOUT_CASE_TIMEOUT_MS,
  );

  it(
    "grows a streaming row without moving the composer, pinned or away",
    () => {
      const pinnedRoot = renderComponent(<Conversation rows={30} />);
      const pinnedComposer = requireBounds(pinnedRoot, "composer").y;
      pinnedRoot.rerender(<Conversation rows={30} status="streaming" grown />);

      settle(pinnedRoot);
      expect(requireBounds(pinnedRoot, "composer").y).toBe(pinnedComposer);
      expect(endIsVisible(pinnedRoot, 29)).toBe(true);
      pinnedRoot.unmount();

      const awayRoot = renderComponent(<Conversation rows={30} />);
      wheel(awayRoot, 160);
      const awayComposer = requireBounds(awayRoot, "composer").y;
      const awayOffset = offsetOf(awayRoot);
      awayRoot.rerender(<Conversation rows={30} status="streaming" grown />);
      expect(requireBounds(awayRoot, "composer").y).toBe(awayComposer);
      expect(offsetOf(awayRoot)).toBe(awayOffset);
      awayRoot.unmount();
    },
    LAYOUT_CASE_TIMEOUT_MS,
  );

  it("renders the attachments and hint a caller supplies", () => {
    const root = renderComponent(
      <div style={{ height: 320, display: "flex", flexDirection: "column" }}>
        <ChatRoot onSubmit={() => undefined}>
          <ChatMessages>
            <Message testId="row">
              <MessageContent>
                <Bubble>
                  <BubbleContent>
                    <text>hi</text>
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          </ChatMessages>
          <ChatComposer
            testId="composer"
            hint="Enter to send"
            attachments={<text>report.pdf</text>}
          />
        </ChatRoot>
      </div>,
    );

    expect(root.renderer.getAllText()).toEqual(
      expect.arrayContaining(["report.pdf", "Enter to send"]),
    );

    root.unmount();
  });

  it("reads a stored draft that is not text as an empty composer", () => {
    const owned = renderComponent(
      <div style={{ height: 320, display: "flex", flexDirection: "column" }}>
        <ChatRoot onSubmit={() => undefined}>
          <ChatMessages />
          <ChatComposer value={null as unknown as string} />
        </ChatRoot>
      </div>,
    );
    try {
      expect(
        owned.renderer.findByTestId("chat-field")?.customProps?.value,
      ).toBe("");
    } finally {
      owned.unmount();
    }

    const fallback = renderComponent(
      <div style={{ height: 320, display: "flex", flexDirection: "column" }}>
        <ChatRoot onSubmit={() => undefined}>
          <ChatMessages />
          <ChatComposer defaultValue={null as unknown as string} />
        </ChatRoot>
      </div>,
    );
    try {
      expect(
        fallback.renderer.findByTestId("chat-field")?.customProps?.value,
      ).toBe("");
    } finally {
      fallback.unmount();
    }
  });

  it("reads blank copy as the documented words, never a nameless control or a blank line", () => {
    const Surface = ({ status }: { readonly status?: ChatStatus }) => (
      <div style={{ height: 320, display: "flex", flexDirection: "column" }}>
        <ChatRoot
          label="  "
          error="   "
          status={status}
          onSubmit={() => undefined}
          onStop={() => undefined}
        >
          <ChatHeader />
          <ChatMessages emptyTitle="" emptyDescription="  " />
          <ChatComposer label="" submitLabel="  " stopLabel="" hint="   " />
        </ChatRoot>
      </div>
    );

    const page = renderComponent(<Surface status="streaming" />);
    try {
      expect(
        nodesWithRole(page.renderer, "region").map((node) => node.name),
      ).toEqual(["Conversation"]);
      expect(
        nodesWithRole(page.renderer, "multilinetextinput").map(
          (node) => node.name,
        ),
      ).toEqual(["Message"]);
      expect(
        nodesWithRole(page.renderer, "button").map((node) => node.name),
      ).toEqual(["Stop"]);
      expect(page.renderer.getAllText()).toEqual(
        expect.arrayContaining([
          "Start the conversation",
          "Messages you send appear here.",
        ]),
      );

      expect(
        page.renderer.getAllText().filter((line) => line.trim() === ""),
      ).toEqual([]);

      page.rerender(<Surface />);
      expect(
        nodesWithRole(page.renderer, "button").map((node) => node.name),
      ).toEqual(["Send"]);

      page.rerender(<Surface status="error" />);
      const painted = page.renderer.getAllText();
      expect(painted).toContain("The reply failed.");
      expect(painted.filter((line) => line.trim() === "")).toEqual([]);
    } finally {
      page.unmount();
    }
  });

  it("reads the names and the help a stored conversation wrote as text", () => {
    const Surface = ({ status }: { readonly status?: ChatStatus }) => (
      <div style={{ height: 320, display: "flex", flexDirection: "column" }}>
        <ChatRoot
          // @ts-expect-error — the name a stored conversation wrote.
          label={42}
          // @ts-expect-error — the sentence a stored conversation wrote.
          error={{ text: "The reply failed." }}
          status={status}
          onSubmit={() => undefined}
          onStop={() => undefined}
        >
          <ChatMessages
            // @ts-expect-error — the copy a stored conversation wrote.
            emptyTitle={42}
            // @ts-expect-error — the copy a stored conversation wrote.
            emptyDescription={{ text: "Messages you send appear here." }}
          />
          <ChatComposer
            // @ts-expect-error — the names a stored composer wrote.
            label={42}
            // @ts-expect-error — the names a stored composer wrote.
            submitLabel={42}
            // @ts-expect-error — the names a stored composer wrote.
            stopLabel={{ text: "Stop" }}
            // @ts-expect-error — the help a stored composer wrote.
            hint={42}
          />
        </ChatRoot>
      </div>
    );

    const page = renderComponent(<Surface />);
    try {
      expect(
        nodesWithRole(page.renderer, "region").map((node) => node.name),
      ).toEqual(["Conversation"]);
      expect(
        nodesWithRole(page.renderer, "multilinetextinput").map(
          (node) => node.name,
        ),
      ).toEqual(["Message"]);
      expect(
        nodesWithRole(page.renderer, "button").map((node) => node.name),
      ).toEqual(["Send"]);
      expect(page.renderer.getAllText()).toEqual(
        expect.arrayContaining([
          "Start the conversation",
          "Messages you send appear here.",
        ]),
      );
    } finally {
      page.unmount();
    }
  });
});

const ComposerAt = ({ value }: { readonly value: string }) => (
  <div style={{ height: 320, display: "flex", flexDirection: "column" }}>
    <ChatRoot onSubmit={() => undefined}>
      <ChatHeader title="Guild desk" />
      <ChatComposer value={value} />
    </ChatRoot>
  </div>
);

const composerGaps = (
  root: ComponentTestRoot,
): {
  readonly above: number;
  readonly below: number;
  readonly height: number;
} => {
  const row = requireBounds(root, "chat-composer-row");
  const send = requireBounds(root, "chat-send");
  return {
    above: send.y - row.y,
    below: row.y + row.height - (send.y + send.height),
    height: row.height,
  };
};

describe("ChatComposer's send control", () => {
  it("keeps equal space above and below at one line and at a grown field", () => {
    const single = renderComponent(<ComposerAt value="One line" />);
    const one = composerGaps(single);
    single.unmount();

    const grown = renderComponent(
      <ComposerAt value={"One\nTwo\nThree\nFour"} />,
    );
    const tall = composerGaps(grown);
    grown.unmount();

    expect(one.above).toBe(one.below);
    expect(tall.above).toBe(tall.below);
    expect(tall.height).toBeGreaterThan(one.height);
  });
});
