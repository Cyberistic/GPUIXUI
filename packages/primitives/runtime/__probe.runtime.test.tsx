import { expect, it } from "vitest";
import { Select } from "../src/components/Select.js";
import { Surface, openWindow } from "./fixture.js";

const openSelect = async (report: (value: string) => void) => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Select
        testId="s"
        label="Letter"
        defaultValue="a"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta", disabled: true },
          { value: "c", label: "Gamma" },
        ]}
        onValueChange={report}
      />
    </Surface>,
  );
  runtime.click("s-trigger");
  runtime.flush();
  return runtime;
};

it("probe: keyboard after one Down", async () => {
  const values: string[] = [];
  const runtime = await openSelect((value) => values.push(value));
  runtime.keyDown("s-trigger", "down");
  runtime.keyDown("s-trigger", "enter");
  expect(values).toStrictEqual([]);
});

it("probe: click the disabled option", async () => {
  const values: string[] = [];
  const runtime = await openSelect((value) => values.push(value));
  const beta = runtime.renderer
    .findByType("text")
    .find((element) => element.text === "Beta");
  expect(beta !== undefined).toBe(true);
  if (beta !== undefined) runtime.clickElement(beta);
  expect(values).toStrictEqual([]);
});

it("probe: click the enabled option", async () => {
  const values: string[] = [];
  const runtime = await openSelect((value) => values.push(value));
  const gamma = runtime.renderer
    .findByType("text")
    .find((element) => element.text === "Gamma");
  expect(gamma !== undefined).toBe(true);
  if (gamma !== undefined) runtime.clickElement(gamma);
  expect(values).toStrictEqual([]);
});
