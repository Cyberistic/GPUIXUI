/**
 * The example registry: `id → example`, for the **native** playground.
 *
 * `apps/playground` mounts these in real GPUix, and
 * `runtime/examples.runtime.test.tsx` mounts the same components to prove they
 * paint. The browser docs site must not render them as live previews: they are
 * GPUix host elements, not DOM.
 */

import type { ComponentType } from "react";
import { ButtonGroupExample } from "./button-group.example.js";
import { CheckboxExample } from "./checkbox.example.js";
import { FeedbackExample } from "./feedback.example.js";
import { FormExample } from "./form.example.js";
import { IconsExample } from "./icons.example.js";
import { LayoutExample } from "./layout.example.js";
import { NumberFieldExample } from "./number-field.example.js";
import { OtpExample } from "./otp.example.js";
import { RatingExample } from "./rating.example.js";
import { ScrollTriggerExample } from "./scroll-trigger.example.js";
import { SelectionExample } from "./selection.example.js";
import { ToggleExample } from "./toggle.example.js";
import { ToggleGroupExample } from "./toggle-group.example.js";
import { TooltipExample } from "./tooltip.example.js";
import { TypographyExample } from "./typography.example.js";
import { ValueExample } from "./value.example.js";

/** Every example, by the id a docs page and the playground both use. */
export const examples: Readonly<Record<string, ComponentType>> = {
  buttonGroup: ButtonGroupExample,
  checkbox: CheckboxExample,
  feedback: FeedbackExample,
  form: FormExample,
  icons: IconsExample,
  layout: LayoutExample,
  numberField: NumberFieldExample,
  otp: OtpExample,
  rating: RatingExample,
  scrollTrigger: ScrollTriggerExample,
  selection: SelectionExample,
  toggle: ToggleExample,
  toggleGroup: ToggleGroupExample,
  tooltip: TooltipExample,
  typography: TypographyExample,
  value: ValueExample,
};
