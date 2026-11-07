/** Every effect's example, by the id a docs page and the playground both use. */
import type { ComponentType } from "react";
import { BubblesExample } from "./bubbles.example.js";
import { FireworksExample } from "./fireworks.example.js";
import { GravityStarsExample } from "./gravity-stars.example.js";
import { HexagonExample } from "./hexagon.example.js";
import { LiquidButtonExample } from "./liquid-button.example.js";
import { MagneticExample } from "./magnetic.example.js";
import { MotionGridExample } from "./motion-grid.example.js";
import { ParticlesExample } from "./particles.example.js";
import { RippleButtonExample } from "./ripple-button.example.js";
import { RollingTextExample } from "./rolling-text.example.js";
import { RotatingTextExample } from "./rotating-text.example.js";
import { ShaderLayerExample } from "./shader-layer.example.js";
import { ShineButtonExample } from "./shine-button.example.js";
import { SlidingTextExample } from "./sliding-text.example.js";
import { SplittingTextExample } from "./splitting-text.example.js";
import { StarsExample } from "./stars.example.js";
import { TypingTextExample } from "./typing-text.example.js";

export const examples: Readonly<Record<string, ComponentType>> = {
  bubbles: BubblesExample,
  fireworks: FireworksExample,
  "gravity-stars": GravityStarsExample,
  hexagon: HexagonExample,
  "liquid-button": LiquidButtonExample,
  magnetic: MagneticExample,
  "motion-grid": MotionGridExample,
  particles: ParticlesExample,
  "ripple-button": RippleButtonExample,
  "rolling-text": RollingTextExample,
  "rotating-text": RotatingTextExample,
  "shader-layer": ShaderLayerExample,
  "shine-button": ShineButtonExample,
  "sliding-text": SlidingTextExample,
  "splitting-text": SplittingTextExample,
  stars: StarsExample,
  "typing-text": TypingTextExample,
};
