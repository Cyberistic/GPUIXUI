import { createContext, useContext, useMemo, type ReactNode } from "react";
import { previewFontStack } from "../../lib/fonts";
import { toCssVars } from "../../lib/theme-css";
import { usePlatform } from "./platform-toggle";

const PreviewInteractive = createContext(true);

export const usePreviewInteractive = (): boolean =>
  useContext(PreviewInteractive);

export function PreviewSurface({
  children,
  className,
  interactive = true,
}: {
  readonly children: ReactNode;
  readonly className?: string;

  readonly interactive?: boolean;
}) {
  const { look, platform, theme } = usePlatform();

  const vars = useMemo(
    () => ({
      ...toCssVars(theme),
      "--font-sans": previewFontStack(theme, platform),
    }),
    [platform, theme],
  );

  return (
    <PreviewInteractive.Provider value={interactive}>
      <div
        className={className === undefined ? "gx-demo" : `gx-demo ${className}`}
        data-look={look}
        data-mode={theme.mode}
        data-platform={platform}
        suppressHydrationWarning
        style={vars}
      >
        {children}
      </div>
    </PreviewInteractive.Provider>
  );
}
