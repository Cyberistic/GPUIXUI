/**
 * EmptyState behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a panel that renders placeholders for parts it was not
 * given; an action whose click never arrives because the panel sits over it; a
 * description painted as loudly as the title; a panel that is not actually
 * centred; and a title that was a plain text node, so the panel had no heading a
 * screen-reader user could jump to.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { Button } from "../internal/button.js";
import { clickCentreOf } from "../internal/interaction.js";
import { darkTheme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { EmptyState } from "../empty-state.js";

describe("EmptyState", () => {
  it("renders a title, a description and an action in order", () => {
    const panel = renderComponent(
      <EmptyState
        testId="empty"
        title="No projects yet"
        description="Create one to see it here."
        action={<Button testId="create">New project</Button>}
      />,
    );

    expect(panel.renderer.getAllText()).toEqual([
      "No projects yet",
      "Create one to see it here.",
      "New project",
    ]);

    panel.unmount();
  });

  it("renders nothing for the parts it was not given", () => {
    const panel = renderComponent(
      <EmptyState testId="empty" title="No results" />,
    );

    expect(panel.renderer.getAllText()).toEqual(["No results"]);
    // Title only: the panel itself and the title's own column.
    expect(panel.renderer.findByType("div")).toHaveLength(1);

    panel.unmount();
  });

  it("centres its content", () => {
    const panel = renderComponent(
      <EmptyState testId="empty" title="No results" />,
    );

    expect(panel.renderer.findByTestId("empty")?.style).toMatchObject({
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      padding: darkTheme.spacing["3xl"],
    });

    panel.unmount();
  });

  it("paints the title with the foreground and the description with the muted role", () => {
    const panel = renderComponent(
      <EmptyState
        testId="empty"
        title="No results"
        description="Try fewer filters."
      />,
    );

    // A GPUix `<text>` host element wraps an anonymous child node that holds the
    // string, so `findByType("text")` returns both and only the wrapper carries
    // the style (measured 2026-10-17).
    const wrappers = Arr.filter(
      panel.renderer.findByType("text"),
      (element) => element.style.color !== undefined,
    );
    expect(wrappers.map((element) => element.style.color)).toEqual([
      darkTheme.colors.foreground,
      darkTheme.colors.mutedForeground,
    ]);
    expect(wrappers.map((element) => element.style.maxWidth)).toEqual([
      undefined,
      360,
    ]);

    panel.unmount();
  });

  it("passes a click through to its action", () => {
    const onCreate = vi.fn();
    const panel = renderComponent(
      <EmptyState
        testId="empty"
        title="No projects yet"
        action={
          <Button testId="create" onClick={onCreate}>
            New project
          </Button>
        }
      />,
    );

    clickCentreOf(panel, "create");

    expect(onCreate).toHaveBeenCalledTimes(1);

    panel.unmount();
  });

  it("lets a consumer's style win", () => {
    const panel = renderComponent(
      <EmptyState testId="empty" title="No results" style={{ padding: 0 }} />,
    );

    expect(panel.renderer.findByTestId("empty")?.style.padding).toBe(0);

    panel.unmount();
  });

  it("announces its title as a level-3 heading by default", () => {
    const panel = renderComponent(
      <EmptyState testId="empty" title="No projects yet" />,
    );

    const headings = nodesWithRole(panel.renderer, "heading");
    expect(
      Arr.map(headings, (node) => [
        node.name,
        Option.getOrUndefined(node.level),
      ]),
    ).toEqual([["No projects yet", 3]]);

    panel.unmount();
  });

  it("lets the caller place the title in the document outline", () => {
    const panel = renderComponent(
      <EmptyState testId="empty" title="No runs yet" level={4} />,
    );

    const headings = nodesWithRole(panel.renderer, "heading");
    expect(
      Arr.map(headings, (node) => Option.getOrUndefined(node.level)),
    ).toEqual([4]);

    panel.unmount();
  });

  it("honours a raw aria-level when no typed level is supplied", () => {
    const panel = renderComponent(
      <EmptyState testId="empty" title="No matches" aria-level={2} />,
    );

    const headings = nodesWithRole(panel.renderer, "heading");
    expect(
      Arr.map(headings, (node) => Option.getOrUndefined(node.level)),
    ).toEqual([2]);

    panel.unmount();
  });
});
