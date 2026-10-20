/**
 * Checkbox example: selecting release assets.
 *
 * The standalone `Checkbox` in its real role — a column of labelled boxes. Each
 * box owns its visible text as the accessible name (`report.pdf`) and the whole
 * row as the hit area, and the header box is the tri-state parent: `checked`
 * when every asset is chosen, `indeterminate` when some are.
 *
 * A label **beside** a standalone box is still inert (GPUix has no
 * `aria-labelledby`); a label **inside** the control is the supported shape,
 * which is what every row here uses. `CheckboxGroup` remains the shape for a
 * value list with a select-all parent plus descriptions.
 */

import { useState, type ReactElement } from "react";
import * as Arr from "effect/Array";
import { Box, Checkbox, Separator, Spacer, Stack, Text } from "../src/index.js";

/** The assets a draft release carries. */
const ASSETS = [
  { name: "report.pdf", detail: "2.4 MB" },
  { name: "screenshot.png", detail: "820 KB" },
  { name: "notes.md", detail: "4 KB" },
] as const;

/** Release assets: a tri-state header and one standalone box per row. */
export const CheckboxExample = (): ReactElement => {
  const [selected, setSelected] = useState<ReadonlyArray<string>>(["notes.md"]);
  const all = Arr.length(selected) === Arr.length(ASSETS);
  const none = Arr.isReadonlyArrayEmpty(selected);

  return (
    <Box
      tone="card"
      padding="lg"
      radius="md"
      border
      testId="checkbox-example"
      style={{ width: 420 }}
    >
      <Stack direction="column" gap="sm">
        <Text role="h3">Release assets</Text>

        <Checkbox
          testId="checkbox-example-all"
          checked={all}
          indeterminate={!all && !none}
          onValueChange={(next) =>
            setSelected(next ? Arr.map(ASSETS, (asset) => asset.name) : [])
          }
        >
          Select all assets
        </Checkbox>

        <Separator orientation="horizontal" />

        {Arr.map(ASSETS, (asset, index) => (
          <Stack key={asset.name} direction="row" align="center" gap="sm">
            <Checkbox
              testId={`checkbox-example-asset-${index}`}
              checked={Arr.contains(selected, asset.name)}
              onValueChange={() =>
                setSelected((current) =>
                  Arr.contains(current, asset.name)
                    ? Arr.filter(current, (value) => value !== asset.name)
                    : Arr.append(current, asset.name),
                )
              }
            >
              {asset.name}
            </Checkbox>
            <Spacer />
            <Text role="caption" tone="muted">
              {asset.detail}
            </Text>
          </Stack>
        ))}

        <Separator orientation="horizontal" />

        <Text role="caption" tone="muted" testId="checkbox-example-status">
          {`${Arr.length(selected)} of ${Arr.length(ASSETS)} selected`}
        </Text>
      </Stack>
    </Box>
  );
};
