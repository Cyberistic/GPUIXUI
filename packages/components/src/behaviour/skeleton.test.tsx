/**
 * Skeleton behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: `animate={false}` still scheduled the pulse (so a
 * reduced-motion still frame moved), a provider reduced preference was
 * overruled, the block ignored the sides it was given, and the placeholder
 * painted a literal instead of the active platform's `skeleton` role.
 */

import { platformTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { after, waitFor } from "../internal/interaction.js";
import { lightTheme, type Theme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import { Skeleton } from "../skeleton.js";

/** The opacity the block painted on the frame just read. */
const opacityOf = (root: ReturnType<typeof renderComponent>): unknown =>
  root.renderer.findByTestId("s")?.style.opacity;

describe("Skeleton", () => {
  it("paints one frame and schedules no pulse when animation is off", async () => {
    const still = renderComponent(
      <Skeleton testId="s" width={120} height={20} animate={false} />,
    );

    expect(opacityOf(still)).toBe(1);
    await after(800);
    expect(opacityOf(still)).toBe(1);

    still.unmount();
  });

  it("pulses while animation is allowed", async () => {
    const pulsing = renderComponent(
      <Skeleton testId="s" width={120} height={20} />,
    );

    expect(opacityOf(pulsing)).toBe(1);
    await waitFor(() => expect(opacityOf(pulsing)).not.toBe(1));

    pulsing.unmount();
  });

  it("holds the still frame for a reduced-motion provider", async () => {
    const still = renderComponent(
      <MotionProvider preference="reduced">
        <Skeleton testId="s" width={120} height={20} />
      </MotionProvider>,
    );

    await after(800);
    expect(opacityOf(still)).toBe(1);

    still.unmount();
  });

  it("paints the box it was given", () => {
    const block = renderComponent(
      <Skeleton testId="s" width={120} height={24} />,
    );
    const style = block.renderer.findByTestId("s")?.style;

    expect(style?.width).toBe(120);
    expect(style?.height).toBe(24);
    expect(style?.borderRadius).toBe(lightTheme.radius.sm);

    block.unmount();
  });

  it("keeps the placeholder on the active platform's skeleton role", () => {
    const paint = (theme: Theme) => {
      const root = renderComponent(
        <Skeleton testId="s" width={80} height={12} animate={false} />,
        theme,
      );
      const colour = root.renderer.findByTestId("s")?.style.backgroundColor;
      root.unmount();
      return colour;
    };
    const macOS = platformTheme(lightTheme, "darwin");
    const windows = platformTheme(lightTheme, "win32");

    expect(paint(macOS)).toBe(macOS.colors.skeleton);
    expect(paint(windows)).toBe(windows.colors.skeleton);
    // The premise: the two styles do not paint the same placeholder.
    expect(macOS.colors.skeleton).not.toBe(windows.colors.skeleton);
  });
});
