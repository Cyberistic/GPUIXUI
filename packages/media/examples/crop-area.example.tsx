/**
 * CropArea example: a controlled crop over a picture with a live readout.
 *
 * The hole is the example's own state, so dragging a corner or pressing the
 * picture updates both the mask and the line under it from one value.
 */

import { useState } from "react";
import { CropRect } from "../src/crop/logic.js";
import { CropArea } from "../src/crop-area.js";

const PICTURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export const CropAreaExample = () => {
  const [crop, setCrop] = useState(
    new CropRect({ x: 60, y: 40, width: 100, height: 70 }),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <CropArea
        src={PICTURE}
        alt="The picture being cropped"
        width={240}
        height={160}
        value={crop}
        onChange={setCrop}
        label="Crop the thumbnail"
      />
      <text>
        {`Crop: ${Math.round(crop.x)}, ${Math.round(crop.y)} — ${Math.round(crop.width)} × ${Math.round(crop.height)}`}
      </text>
    </div>
  );
};
