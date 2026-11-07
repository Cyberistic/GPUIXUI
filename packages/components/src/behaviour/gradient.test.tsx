import type { TestElement, TestRoot } from "@gpuix/react/testing";
import { motionLevels } from "@gpuixui/motion/timing";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  clickCentreOf,
  requireBounds,
  settle,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { alpha, darkTheme } from "../internal/theme.js";
import { Gradient, type GradientProps } from "../gradient.js";
import { gradientBaseAngle, rampOf, shiftedRampOf } from "../gradient/logic.js";
import { MotionProvider } from "../motion.js";

const from = "#101820";
const to = "#F2AA4C";

const byTestId = (
  renderer: TestRoot["renderer"],
  testId: string,
): TestElement => {
  const element = renderer.findByTestId(testId);
  if (element === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  return element;
};

const mount = (node: ReactNode) => {
  const page = renderComponent(<div />);
  page.renderer.clockPause();
  page.rerender(node);
  page.renderer.flush();
  settle(page);
  return page;
};

const Field = (props: Partial<GradientProps> = {}) => (
  <Gradient
    testId="field"
    from={from}
    to={to}
    durationMs={1_000}
    style={{ width: 320, height: 200 }}
    {...props}
  />
);

describe("Gradient", () => {
  it("paints the caller's two-stop ramp at the default angle", () => {
    const page = mount(<Field />);
    try {
      expect(byTestId(page.renderer, "field").style.background).toMatchObject(
        rampOf(from, to, gradientBaseAngle),
      );
    } finally {
      page.unmount();
    }
  });

  it("shifts the second ramp by the caller's angle", () => {
    const page = mount(<Field angle={45} shift={45} />);
    try {
      const shift = byTestId(page.renderer, "gradient-shift");

      expect(shift.style.background).toMatchObject(
        shiftedRampOf(from, to, 45, 45),
      );
      expect(shift.style.background).toMatchObject({
        angle: 90,
        stops: rampOf(from, to, 0).stops,
      });
    } finally {
      page.unmount();
    }
  });

  it("breathes the second ramp in and back out when the tween completes", () => {
    const page = mount(<Field />);
    try {
      const shift = byTestId(page.renderer, "gradient-shift");

      expect(shift.style.opacity).toBe(0);
      expect(shift.customProps?.motion).toMatchObject({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 1 },
      });

      page.renderer.clockFastForward(1_000);
      settle(page);
      expect(
        byTestId(page.renderer, "gradient-shift").customProps?.motion,
      ).toMatchObject({ animate: { opacity: 0 } });

      page.renderer.clockFastForward(1_000);
      settle(page);
      expect(
        byTestId(page.renderer, "gradient-shift").customProps?.motion,
      ).toMatchObject({ animate: { opacity: 1 } });
    } finally {
      page.unmount();
    }
  });

  it("paints one still ramp when the shift is a whole turn", () => {
    const page = mount(<Field shift={0} />);
    try {
      expect(page.renderer.findByTestId("gradient-shift")).toBeUndefined();
      expect(byTestId(page.renderer, "field").style.background).toMatchObject(
        rampOf(from, to, gradientBaseAngle),
      );

      page.rerender(<Field shift={360} />);
      page.renderer.flush();
      settle(page);
      expect(page.renderer.findByTestId("gradient-shift")).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("paints the resting ramp under the reduced preference", () => {
    const page = mount(
      <MotionProvider preference="reduced">
        <Field />
      </MotionProvider>,
    );
    try {
      expect(page.renderer.findByTestId("gradient-shift")).toBeUndefined();
      expect(
        byTestId(page.renderer, "field").customProps?.motion,
      ).toMatchObject({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0 },
      });
      expect(byTestId(page.renderer, "field").style.background).toMatchObject(
        rampOf(from, to, gradientBaseAngle),
      );
    } finally {
      page.unmount();
    }
  });

  it("paints its content above the layer and lets a press through", () => {
    const onClick = vi.fn();
    const page = mount(
      <Field>
        <div testId="content" onClick={onClick} style={{ height: 80 }}>
          Content
        </div>
      </Field>,
    );
    try {
      const field = byTestId(page.renderer, "field");
      const layer = byTestId(page.renderer, "gradient-shift");
      const content = byTestId(page.renderer, "content");

      expect(field.children.indexOf(layer.id)).toBeLessThan(
        field.children.indexOf(content.id),
      );
      expect(layer.style.pointerEvents).toBe("none");

      const layerBox = requireBounds(page, "gradient-shift");
      const contentBox = requireBounds(page, "content");
      expect(layerBox.x).toBeLessThanOrEqual(contentBox.x);
      expect(layerBox.y).toBeLessThanOrEqual(contentBox.y);
      expect(layerBox.x + layerBox.width).toBeGreaterThanOrEqual(
        contentBox.x + contentBox.width,
      );
      expect(layerBox.y + layerBox.height).toBeGreaterThanOrEqual(
        contentBox.y + contentBox.height,
      );

      clickCentreOf(page, "content");
      expect(onClick).toHaveBeenCalledTimes(1);
    } finally {
      page.unmount();
    }
  });

  it("fades the field in at the house slow level", () => {
    const page = mount(<Field />);
    try {
      expect(
        byTestId(page.renderer, "field").customProps?.motion,
      ).toMatchObject({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: motionLevels.slow / 1000 },
      });
    } finally {
      page.unmount();
    }
  });

  it("hands the field's shape to a style callback", () => {
    const page = mount(
      <Field
        angle={45}
        shift={45}
        style={(state) => ({
          opacity: state.animated ? 1 : 0.5,
          paddingTop: state.shift,
          paddingLeft: state.angle,
        })}
      />,
    );
    try {
      const field = byTestId(page.renderer, "field");
      expect(field.style.opacity).toBe(1);
      expect(field.style.paddingTop).toBe(45);
      expect(field.style.paddingLeft).toBe(45);

      page.rerender(
        <MotionProvider preference="reduced">
          <Field
            angle={45}
            shift={45}
            style={(state) => ({ opacity: state.animated ? 1 : 0.5 })}
          />
        </MotionProvider>,
      );
      page.renderer.flush();
      settle(page);
      expect(byTestId(page.renderer, "field").style.opacity).toBe(0.5);
    } finally {
      page.unmount();
    }
  });

  it("paints the caller's radius on the field and its layer", () => {
    const page = mount(
      <Gradient
        testId="field"
        radius={12}
        durationMs={1_000}
        style={{ width: 320, height: 200 }}
      />,
    );
    try {
      expect(byTestId(page.renderer, "field").style.borderRadius).toBe(12);
      expect(byTestId(page.renderer, "gradient-shift").style.borderRadius).toBe(
        12,
      );

      expect(byTestId(page.renderer, "field").style.background).toMatchObject({
        stops: [
          { color: darkTheme.colors.primary, position: 0 },
          { color: alpha(darkTheme.colors.primary, 0), position: 1 },
        ],
      });
    } finally {
      page.unmount();
    }
  });
});
