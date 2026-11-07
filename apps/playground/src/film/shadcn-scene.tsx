import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gpuixui/components/card";
import { BarChart } from "@gpuixui/data";
import { Button, Input, Stack } from "@gpuixui/primitives";
import {
  darkTheme,
  lightTheme,
  platformTheme,
  shadcnBuilderTheme,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { SHADCN_FRAMES, SHOWN, THEMES } from "./shadcn-timeline.js";
import type { Take } from "./take.js";

const WIDTH = 640;
const HEIGHT = 720;
const mac = platformTheme(lightTheme, "darwin");
const macDark = platformTheme(darkTheme, "darwin");

const themed: ReadonlyArray<{ readonly frame: number; readonly theme: Theme }> =
  Arr.map(THEMES, ({ frame, css, mode }) => ({
    frame,
    theme: shadcnBuilderTheme(css, mode === "dark" ? macDark : mac, mode).theme,
  }));

const themeAt = (frame: number): Theme =>
  Option.match(
    Arr.findLast(themed, (one) => one.frame <= frame),
    { onNone: () => mac, onSome: (one) => one.theme },
  );

const APPLICANTS = [
  { key: "applied", label: "Applied", values: [62, 88, 74, 120, 96, 148] },
];

const License = ({ frame }: { readonly frame: number }) => {
  const theme = themeAt(frame);
  return (
    <ThemeProvider theme={theme}>
      <div
        style={{
          display: "flex",
          width: WIDTH,
          height: HEIGHT,
          padding: 44,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        {frame < SHOWN.card ? null : (
          <Card variant="outline" style={{ width: 520 }}>
            <CardHeader>
              {frame < SHOWN.title ? null : (
                <CardTitle>Hunter License</CardTitle>
              )}
              {frame < SHOWN.description ? null : (
                <CardDescription>The 287th exam</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <Stack direction="column" gap="md">
                {frame < SHOWN.input ? null : (
                  <Input label="Email" placeholder="gon@whale-island" />
                )}
                {frame < SHOWN.button ? null : (
                  <Button variant="primary" fullWidth>
                    Apply
                  </Button>
                )}
                {frame < SHOWN.chart ? null : (
                  <BarChart
                    aria-label="Applicants"
                    labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
                    series={APPLICANTS}
                    width={470}
                    height={190}
                    axis={false}
                    legend={false}
                    radius={6}
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </div>
    </ThemeProvider>
  );
};

/** The whole scene's right half, one frame per film frame. */
export const shadcnTake: Take = {
  width: WIDTH,
  height: HEIGHT,
  frames: SHADCN_FRAMES,
  view: (frame) => <License frame={frame} />,
};
