/**
 * Message behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a user row that aligns like an assistant row; markdown
 * that never repaints when a stream appends a token; reasoning that starts open
 * (and costs height before the reader asks); a failed tool call that looks like
 * a successful one and hides its result; citations that report the wrong source
 * or fire twice; slots that paint empty space when they have no data; a
 * streaming status that is always visible; a streaming status announced with no
 * name at all (0.10.0 does not name a role-bearing `div` from its text child, so
 * the visible label has to become `aria-label`, and a blank authored value must
 * fall back to it); actions that appear without a consumer wiring them.
 */

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { darkTheme } from "../internal/theme.js";
import { clickCentreOf, requireBounds } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import type { PartChildren } from "../internal/parts.js";
import { nodesWithRole } from "../internal/a11y.js";
import { Button } from "../internal/button.js";
import {
  Message,
  MessageActions,
  MessageAttachments,
  MessageAvatar,
  MessageContent,
  MessageReasoning,
  MessageSources,
  MessageStreaming,
  MessageToolCalls,
} from "../message.js";

/** A single row in a fixed column, so alignment is comparable. */
const Row = ({
  variant,
  streaming = false,
  children,
}: {
  readonly variant: "user" | "assistant" | "system";
  readonly streaming?: boolean;
  readonly children?: PartChildren;
}) => (
  <div style={{ width: 420, display: "flex", flexDirection: "column" }}>
    <Message variant={variant} streaming={streaming} testId={`row-${variant}`}>
      {children}
    </Message>
  </div>
);

describe("Message", () => {
  it("aligns the user row opposite the assistant row", () => {
    const row = renderComponent(
      <div style={{ width: 420, display: "flex", flexDirection: "column" }}>
        <Message variant="assistant">
          <MessageContent testId="assistant" text="From the model" />
        </Message>
        <Message variant="user">
          <MessageContent testId="user" text="From me" />
        </Message>
      </div>,
    );

    expect(requireBounds(row, "user").x).toBeGreaterThan(
      requireBounds(row, "assistant").x,
    );

    row.unmount();
  });

  it("paints markdown and repaints when a stream appends a token", () => {
    const Streaming = () => {
      const [body, setBody] = useState("The layout");
      return (
        <Row variant="assistant">
          <MessageContent testId="body" text={body} />
          <Button testId="append" onClick={() => setBody("The layout is done")}>
            Append
          </Button>
        </Row>
      );
    };
    const row = renderComponent(<Streaming />);

    expect(row.renderer.getPaintedText().join(" ")).toContain("The layout");
    expect(row.renderer.getPaintedText().join(" ")).not.toContain("is done");

    clickCentreOf(row, "append");

    expect(row.renderer.getPaintedText().join(" ")).toContain(
      "The layout is done",
    );

    row.unmount();
  });

  it("keeps reasoning closed until the reader opens it", () => {
    const row = renderComponent(
      <Row variant="assistant">
        <MessageReasoning testId="reasoning" text="Compared two layouts." />
      </Row>,
    );

    expect(row.renderer.getPaintedText().join(" ")).not.toContain(
      "Compared two layouts.",
    );

    clickCentreOf(row, "reasoning-trigger");

    expect(row.renderer.getPaintedText().join(" ")).toContain(
      "Compared two layouts.",
    );

    row.unmount();
  });

  it("shows a failed tool call as failed and keeps its result", () => {
    const row = renderComponent(
      <Row variant="assistant">
        <MessageToolCalls
          testId="calls"
          calls={[
            { name: "search", status: "done", result: "3 results" },
            { name: "fetch", status: "failed", result: "connection refused" },
          ]}
        />
      </Row>,
    );

    expect(row.renderer.getAllText()).toEqual(
      expect.arrayContaining([
        "search",
        "done",
        "3 results",
        "fetch",
        "failed",
        "connection refused",
      ]),
    );
    const failedLeaf = row.renderer.findByText("failed");
    const failedRow =
      failedLeaf?.parentId == null
        ? undefined
        : row.renderer.getElement(failedLeaf.parentId);
    expect(failedRow?.style.color).toBe(darkTheme.colors.destructive);

    row.unmount();
  });

  it("renders no tool-call group for an empty list", () => {
    const row = renderComponent(
      <Row variant="assistant">
        <MessageToolCalls testId="calls" calls={[]} />
      </Row>,
    );

    expect(row.renderer.findByTestId("calls")).toBeUndefined();
    expect(nodesWithRole(row.renderer, "list")).toHaveLength(0);

    row.unmount();
  });

  it("reports the clicked source once", () => {
    const onSelect = vi.fn();
    const row = renderComponent(
      <Row variant="assistant">
        <MessageSources
          testId="sources"
          sources={[{ label: "Spec", url: "https://example.com/spec" }]}
          onSelect={onSelect}
        />
      </Row>,
    );

    expect(row.renderer.getAllText()).toEqual(
      expect.arrayContaining(["Spec", "https://example.com/spec"]),
    );

    clickCentreOf(row, "sources-0");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      label: "Spec",
      url: "https://example.com/spec",
    });

    row.unmount();
  });

  it("renders attachment chips and nothing for an empty list", () => {
    const row = renderComponent(
      <Row variant="user">
        <MessageAttachments
          testId="attachments"
          attachments={[{ name: "report.pdf", meta: "1.2 MB" }]}
        />
      </Row>,
    );

    expect(row.renderer.getAllText()).toEqual(
      expect.arrayContaining(["report.pdf", "1.2 MB"]),
    );

    row.rerender(
      <Row variant="user">
        <MessageAttachments testId="attachments" attachments={[]} />
      </Row>,
    );

    expect(row.renderer.findByTestId("attachments")).toBeUndefined();

    row.unmount();
  });

  it("shows the streaming status only while streaming", () => {
    const row = renderComponent(
      <Row variant="assistant">
        <MessageStreaming testId="streaming" />
      </Row>,
    );

    expect(row.renderer.findByTestId("streaming")).toBeUndefined();

    row.rerender(
      <Row variant="assistant" streaming>
        <MessageStreaming testId="streaming" />
      </Row>,
    );

    expect(row.renderer.findByTestId("streaming")).toBeDefined();
    expect(row.renderer.getAllText()).toContain("Streaming");
    // The one element that exists to announce progress must carry a name: the
    // visible label is the name (plan 799).
    expect(nodesWithRole(row.renderer, "status")).toMatchObject([
      { role: "status", name: "Streaming" },
    ]);

    row.unmount();
  });

  it("names the streaming status from its visible label", () => {
    const row = renderComponent(
      <Row variant="assistant" streaming>
        <MessageStreaming label="Writing" />
      </Row>,
    );

    expect(nodesWithRole(row.renderer, "status")).toMatchObject([
      { role: "status", name: "Writing" },
    ]);
    expect(row.renderer.getAllText()).toContain("Writing");

    row.unmount();
  });

  it("lets a caller's status name win whole", () => {
    const row = renderComponent(
      <Row variant="assistant" streaming>
        <MessageStreaming label="Writing" aria-label="Assistant is writing" />
      </Row>,
    );

    expect(nodesWithRole(row.renderer, "status")).toMatchObject([
      { role: "status", name: "Assistant is writing" },
    ]);
    expect(row.renderer.getAllText()).toContain("Writing");

    row.unmount();
  });

  it("falls back to the label when the caller's status name is blank", () => {
    const row = renderComponent(
      <Row variant="assistant" streaming>
        <MessageStreaming label="Writing" aria-label="   " />
      </Row>,
    );

    expect(nodesWithRole(row.renderer, "status")).toMatchObject([
      { role: "status", name: "Writing" },
    ]);

    row.unmount();
  });

  it("renders no actions until the consumer wires them, then runs one", () => {
    const retry = vi.fn();
    const row = renderComponent(
      <Row variant="assistant">
        <MessageActions testId="actions" />
      </Row>,
    );

    expect(row.renderer.findByTestId("actions")).toBeUndefined();

    row.rerender(
      <Row variant="assistant">
        <MessageAvatar name="Ada Lovelace" testId="avatar" />
        <MessageContent text="Try again" />
        <MessageActions testId="actions">
          <Button testId="retry" size="sm" onClick={retry}>
            Retry
          </Button>
        </MessageActions>
      </Row>,
    );

    expect(row.renderer.findByTestId("actions")).toBeDefined();

    clickCentreOf(row, "retry");

    expect(retry).toHaveBeenCalledTimes(1);

    row.unmount();
  });

  it("is a named group for the variant", () => {
    const row = renderComponent(
      <Row variant="system">
        <MessageContent text="Session started" />
      </Row>,
    );

    expect(
      nodesWithRole(row.renderer, "group").map((node) => node.name),
    ).toContain("system message");

    row.unmount();
  });
});
