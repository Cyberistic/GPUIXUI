import {
  platformTypes,
  typography,
  type PlatformName,
  type TextRole,
} from "@gpuixui/tokens";

const textRoles: ReadonlyArray<TextRole> = [
  "display",
  "h1",
  "h2",
  "h3",
  "body",
  "bodyStrong",
  "label",
  "caption",
  "code",
  "codeBlock",
];

const platforms: ReadonlyArray<PlatformName> = [
  "darwin",
  "linux",
  "win32",
  "default",
];

const mono = "font-mono text-xs";

/**
 * The real type scale from `@gpuixui/tokens` (plan 416): size, leading, weight
 * and a sample rendered at that role. Generated, so the page cannot document a
 * scale the package does not ship.
 */
export function TypeScale() {
  return (
    <div className="not-prose my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-fd-border text-left">
            <th className="py-2 pr-4 font-medium">Role</th>
            <th className="py-2 pr-4 font-medium">Size / leading</th>
            <th className="py-2 pr-4 font-medium">Weight</th>
            <th className="py-2 font-medium">Sample</th>
          </tr>
        </thead>
        <tbody>
          {textRoles.map((role) => {
            const style = typography[role];
            return (
              <tr
                key={role}
                data-role={role}
                className="border-b border-fd-border/60"
              >
                <td className="py-2 pr-4 font-mono text-xs">{role}</td>
                <td className="py-2 pr-4 font-mono text-xs">
                  {style.fontSize}px / {style.lineHeight}px
                </td>
                <td className="py-2 pr-4 font-mono text-xs">
                  {style.fontWeight}
                </td>
                <td className="py-2">
                  <span
                    style={{
                      fontSize: style.fontSize,
                      lineHeight: `${style.lineHeight}px`,
                      fontWeight: style.fontWeight,
                    }}
                  >
                    The quick brown fox
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The platform type table from `@gpuixui/tokens`. `sans` is GPUI's
 * `.SystemUIFont` sentinel; only the monospace family is a named face.
 */
export function PlatformTypes() {
  return (
    <div className="not-prose my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-fd-border text-left">
            <th className="py-2 pr-4 font-medium">Platform</th>
            <th className="py-2 pr-4 font-medium">Sans</th>
            <th className="py-2 font-medium">Mono</th>
          </tr>
        </thead>
        <tbody>
          {platforms.map((platform) => {
            const type = platformTypes[platform];
            return (
              <tr
                key={platform}
                data-platform={platform}
                className="border-b border-fd-border/60"
              >
                <td className="py-2 pr-4">{type.label}</td>
                <td className={`py-2 pr-4 ${mono}`}>{type.sans}</td>
                <td className={`py-2 ${mono}`}>{type.mono}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
