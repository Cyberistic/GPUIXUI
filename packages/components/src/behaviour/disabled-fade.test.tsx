/**
 * The disabled fade, in the real GPUix renderer.
 *
 * The bug these guard: every disabled part painted its own copy of the share
 * (`opacity: disabled ? 0.5 : 1`), and the tag chip painted **0.6** inside a
 * root that already faded — two fades of one control, the second a number no
 * token names. `internal/theme.ts`'s `disabledFade` is the one declaration; these
 * cases read the share back off three different kinds of part so the seam cannot
 * be imported without painting.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as P from "effect/Predicate";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion.js";
import { disabledOpacity } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import { TagInput, TagInputChip, TagInputField } from "../tag-input.js";
import { TimePicker } from "../time-picker.js";

/** The opacity a part paints, or `undefined` when it declares none. */
const opacityOf = (
  root: ComponentTestRoot,
  testId: string,
): number | undefined => {
  const value = root.renderer.findByTestId(testId)?.style.opacity;
  return P.isNumber(value) ? value : undefined;
};

const modes: ReadonlyArray<TestTheme> = ["dark", "light"];

describe("the disabled fade", () => {
  it("fades a disclosure trigger by the measured share, and not at rest", () => {
    Arr.forEach(modes, (mode) => {
      const faq = renderComponent(
        <Accordion type="single">
          <AccordionItem value="one">
            <AccordionTrigger testId="enabled">What is GPUix?</AccordionTrigger>
            <AccordionContent>
              <text>Body</text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="two" disabled>
            <AccordionTrigger testId="disabled">Is it free?</AccordionTrigger>
            <AccordionContent>
              <text>Body</text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>,
        mode,
      );

      expect(opacityOf(faq, "disabled"), mode).toBe(disabledOpacity);
      expect(opacityOf(faq, "enabled"), mode).toBeUndefined();

      faq.unmount();
    });
  });

  it("fades a tag group once, at the group and not again at its chips", () => {
    Arr.forEach(modes, (mode) => {
      const tags = renderComponent(
        <TagInput
          label="Tags"
          value={["a"]}
          onValueChange={() => undefined}
          disabled
          testId="tags"
        >
          <TagInputChip testId="chip-a" value="a" />
          <TagInputField testId="tag-field" placeholder="Add a tag" />
        </TagInput>,
        mode,
      );

      expect(opacityOf(tags, "tags"), mode).toBe(disabledOpacity);
      // One fade per control: a second share here would composite the chip's own
      // ink twice, which is the 0.6 the suite replaced.
      expect(opacityOf(tags, "chip-a"), mode).toBeUndefined();

      tags.unmount();
    });
  });

  it("fades a picker's field while disabled, and only then", () => {
    Arr.forEach(modes, (mode) => {
      const disabled = renderComponent(
        <TimePicker testId="time" defaultValue="09:30" disabled />,
        mode,
      );

      expect(opacityOf(disabled, "time"), mode).toBe(disabledOpacity);
      disabled.unmount();

      const enabled = renderComponent(
        <TimePicker testId="time" defaultValue="09:30" />,
        mode,
      );

      expect(opacityOf(enabled, "time"), mode).toBeUndefined();
      enabled.unmount();
    });
  });
});
