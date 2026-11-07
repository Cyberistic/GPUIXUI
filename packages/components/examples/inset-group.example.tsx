/** @jsxImportSource @gpuix/react */
import { Switch } from "@gpuixui/primitives";
import { useState } from "react";
import { InsetGroup, InsetGroupRow } from "../src/inset-group.js";

export const InsetGroupExample = () => {
  const [previews, setPreviews] = useState(true);
  const [badge, setBadge] = useState(false);
  return (
    <div style={{ width: 420 }}>
      <InsetGroup title="Notifications">
        <InsetGroupRow
          label="Show previews"
          description="Message text on the lock screen"
          control={
            <Switch
              label="Show previews"
              checked={previews}
              onCheckedChange={setPreviews}
            />
          }
        />
        <InsetGroupRow
          label="Badge app icon"
          control={
            <Switch
              label="Badge app icon"
              checked={badge}
              onCheckedChange={setBadge}
            />
          }
        />
      </InsetGroup>
    </div>
  );
};
