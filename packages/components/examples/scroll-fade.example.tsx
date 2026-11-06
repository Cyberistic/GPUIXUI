/** @jsxImportSource @gpuix/react */
import { ScrollFade } from "../src/scroll-fade.js";
import { useTheme } from "../src/internal/theme.js";

const notes: ReadonlyArray<{ readonly title: string; readonly body: string }> =
  [
    {
      title: "Anchored surfaces",
      body: "Popovers and menus now describe the side they open on.",
    },
    {
      title: "Keyboard rings",
      body: "Every control paints its ring on Tab and keeps it off on a press.",
    },
    {
      title: "Platform styles",
      body: "macOS, Linux and Windows ship as editable token themes.",
    },
    {
      title: "Scroll readings",
      body: "New scroll progress and edge fade primitives.",
    },
    {
      title: "Reduced motion",
      body: "One provider removes the journey from every entry and exit.",
    },
    {
      title: "Theming",
      body: "Contrast, series and the design system are held by tests.",
    },
  ];

export const ScrollFadeExample = () => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 320,
        padding: 12,
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.md,
      }}
    >
      <text style={{ color: theme.colors.foreground, fontSize: 14 }}>
        What is new
      </text>
      <ScrollFade
        testId="example-fade"
        color={theme.colors.card}
        edgeSize={28}
        style={{ height: 160 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notes.map((note) => (
            <div
              key={note.title}
              style={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <text style={{ color: theme.colors.foreground, fontSize: 13 }}>
                {note.title}
              </text>
              <text
                style={{ color: theme.colors.mutedForeground, fontSize: 12 }}
              >
                {note.body}
              </text>
            </div>
          ))}
        </div>
      </ScrollFade>
    </div>
  );
};
