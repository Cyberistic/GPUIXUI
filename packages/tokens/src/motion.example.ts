import { motionTransition, type MotionTransition } from "./motion.js";
import { lightTheme, type Theme } from "./theme.js";

/**
 * A step indicator's interval, in the milliseconds `setInterval` takes. The
 * token is the single source for the `120` that used to sit in each loading
 * indicator. Exercised by `motion.test.ts`.
 */
export const stepInterval = (theme: Theme = lightTheme): number =>
  theme.motion.step;

/**
 * A panel's slide-in transition, in the shape the runtime's
 * `MotionProps.transition` takes. The token stores milliseconds; the runtime
 * takes seconds.
 */
export const panelTransition = (theme: Theme = lightTheme): MotionTransition =>
  motionTransition(theme, "slow", "enter");
