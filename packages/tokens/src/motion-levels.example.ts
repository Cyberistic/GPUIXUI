import { motion, motionLevels, motionPhases } from "./index.js";

/**
 * The motion scale as a documentation table: the timings in level order and
 * the easing each phase runs. `Object.keys(motion)` would also enumerate a
 * field the index has not adopted; the indexes are the owner.
 */
export const motionScale = () => ({
  levels: motionLevels.map((level) => ({
    level,
    milliseconds: motion[level],
  })),
  phases: motionPhases.map((phase) => ({ phase, ease: motion.ease[phase] })),
});
