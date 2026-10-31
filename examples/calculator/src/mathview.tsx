/** @jsxImportSource @gpuix/react */
/**
 * Natural Display renderer.
 *
 * A `MathNode` from `@gpuixui/calc` is painted with the runtime's own layout:
 * a fraction is a column with a rule, a radical is the glyph beside a
 * vinculum, and rows align at their baseline. No MathML and no HTML math: the
 * dimensions scale from one base size so the LCD can reuse the same tree at
 * display size.
 */

import type { MathNode } from "@gpuixui/calc";
import type { Theme } from "@gpuixui/tokens";

export interface MathViewProps {
  readonly node: MathNode;
  readonly size: number;
  readonly color: string;
  readonly theme: Theme;
  readonly testId?: string;
}

const MathNodeView = ({
  node,
  size,
  color,
  theme,
}: {
  readonly node: MathNode;
  readonly size: number;
  readonly color: string;
  readonly theme: Theme;
}) => {
  const mono = theme.typography.mono;
  if (node.kind === "caret") {
    return (
      <div
        style={{
          width: Math.max(1.5, size * 0.06),
          height: size * 1.12,
          marginLeft: 1,
          marginRight: 1,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
    );
  }
  if (node.kind === "text") {
    return (
      <text
        style={{
          fontFamily: mono,
          fontSize: size,
          lineHeight: size * 1.18,
          fontWeight: 400,
          color,
          whiteSpace: "nowrap",
        }}
      >
        {node.text}
      </text>
    );
  }
  if (node.kind === "row") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems:
            node.align === "center"
              ? "center"
              : node.align === "baseline"
                ? "baseline"
                : "flex-end",
          gap: size * 0.06,
        }}
      >
        {node.items.map((item, index) => (
          <MathNodeView
            key={index}
            node={item}
            size={size}
            color={color}
            theme={theme}
          />
        ))}
      </div>
    );
  }
  if (node.kind === "fraction") {
    const child = Math.round(size * 0.72);
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: 2,
          paddingRight: 2,
        }}
      >
        <MathNodeView
          node={node.numerator}
          size={child}
          color={color}
          theme={theme}
        />
        <div
          style={{
            height: Math.max(1, size * 0.045),
            width: "100%",
            minWidth: size * 0.55,
            marginTop: 1,
            marginBottom: 1,
            backgroundColor: color,
          }}
        />
        <MathNodeView
          node={node.denominator}
          size={child}
          color={color}
          theme={theme}
        />
      </div>
    );
  }
  if (node.kind === "radical") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 0,
        }}
      >
        {node.coefficient === undefined ? null : (
          <MathNodeView
            node={node.coefficient}
            size={size}
            color={color}
            theme={theme}
          />
        )}
        <text
          style={{
            fontFamily: mono,
            fontSize: size * 1.18,
            lineHeight: size * 1.18,
            fontWeight: 400,
            color,
          }}
        >
          √
        </text>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderTopWidth: Math.max(1, size * 0.045),
            borderColor: color,
            paddingTop: 1,
            paddingLeft: 2,
            paddingRight: 2,
          }}
        >
          <MathNodeView
            node={node.radicand}
            size={size}
            color={color}
            theme={theme}
          />
        </div>
      </div>
    );
  }
  const scriptSize = Math.round(size * 0.56);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
      }}
    >
      <MathNodeView node={node.base} size={size} color={color} theme={theme} />
      <text
        style={{
          fontFamily: mono,
          fontSize: scriptSize,
          lineHeight: scriptSize * 1.1,
          color,
          marginBottom: node.position === "super" ? size * 0.32 : 0,
          marginTop: node.position === "sub" ? size * 0.2 : 0,
        }}
      >
        {node.position === "super" ? "" : ""}
      </text>
      <MathNodeView
        node={node.script}
        size={scriptSize}
        color={color}
        theme={theme}
      />
    </div>
  );
};

export const MathView = ({
  node,
  size,
  color,
  theme,
  testId = "calc-result-layout",
}: MathViewProps) => (
  <div
    testId={testId}
    style={{
      display: "flex",
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "flex-end",
      width: "100%",
      minHeight: size * 1.2,
    }}
  >
    <MathNodeView node={node} size={size} color={color} theme={theme} />
  </div>
);
