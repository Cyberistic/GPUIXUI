/**
 * Browser preview for the ThemeProvider page.
 *
 * `ThemeProvider` puts a theme in context; every primitive reads it. The
 * preview shows the same surface — a box, a heading and a button — painted by
 * the dark and light themes side by side. The Code tab shows the native usage.
 */

import { darkTheme, lightTheme } from "@gpuixui/tokens";
import { toCssVars } from "../../lib/theme-css";

const Surface = ({
  label,
  theme,
}: {
  readonly label: string;
  readonly theme: typeof darkTheme;
}) => (
  <div className="gx-theme-surface" style={toCssVars(theme)}>
    <span className="gx-theme-name">{label}</span>
    <div className="gx-theme-box">
      <span className="gx-theme-title">Settings</span>
      <span className="gx-theme-body">
        The surface reads the provider&apos;s theme.
      </span>
      <button className="gx-btn gx-btn-primary" type="button">
        Save changes
      </button>
    </div>
  </div>
);

export const ThemeProviderDemo = () => (
  <div className="gx-demo gx-theme-scene">
    <Surface label="darkTheme" theme={darkTheme} />
    <Surface label="lightTheme" theme={lightTheme} />
  </div>
);

const themeProviderDemoSource = `import { ThemeProvider, Box, Text, Button } from "@gpuixui/primitives";
import { darkTheme } from "@gpuixui/tokens";

<ThemeProvider theme={darkTheme}>
  <Box tone="background" padding="lg">
    <Text role="h2">Settings</Text>
    <Button variant="primary">Save changes</Button>
  </Box>
</ThemeProvider>;

// The nearest provider supplies the whole theme; providers do not merge.
<ThemeProvider theme={lightTheme}>…</ThemeProvider>;`;

export { themeProviderDemoSource };
