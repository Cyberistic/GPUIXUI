import * as P from "effect/Predicate";
import { useState } from "react";
import {
  PropertyPanel,
  type PropertyRecord,
  type PropertyRow,
} from "../src/index.js";
import { textStyle, useTheme } from "../src/theme.js";

const KINDS = [
  { value: "box", label: "Box" },
  { value: "sphere", label: "Sphere" },
  { value: "cone", label: "Cone" },
];

export const PropertyPanelExample = () => {
  const theme = useTheme();
  const [name, setName] = useState("cube");
  const [count, setCount] = useState(3);
  const [active, setActive] = useState(true);
  const [kind, setKind] = useState("box");

  const rows: ReadonlyArray<PropertyRow> = [
    { type: "text", key: "name", label: "Name", value: name },
    { type: "number", key: "count", label: "Count", value: count },
    { type: "boolean", key: "active", label: "Active", value: active },
    { type: "select", key: "kind", label: "Kind", value: kind, options: KINDS },
  ];

  const apply = (record: PropertyRecord): void => {
    if (P.isString(record.name)) setName(record.name);
    if (P.isNumber(record.count)) setCount(record.count);
    if (P.isBoolean(record.active)) setActive(record.active);
    if (P.isString(record.kind)) setKind(record.kind);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        width: 360,
      }}
    >
      <PropertyPanel title="Shape" rows={rows} onChange={apply} />
      <text
        testId="property-readout"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`${name} × ${count} · ${active ? "active" : "idle"} · ${kind}`}
      </text>
    </div>
  );
};
