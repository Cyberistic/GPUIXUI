/** @jsxImportSource @gpuix/react */
/**
 * UserMenu example: the standalone account row.
 *
 * It runs outside a sidebar, so the trigger opens below itself. Every row is a
 * callback; the example only records the last one so the paint shows it ran.
 */

import { useState } from "react";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { UserMenu } from "../src/user-menu.js";

/** The account menu with one handler per row. */
export const UserMenuExample = () => {
  const theme = useTheme();
  const [last, setLast] = useState("none");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
      }}
    >
      <UserMenu
        user={{ name: "Benji van der Brand", email: "benji@example.com" }}
        onUpgrade={() => setLast("upgrade")}
        onAccount={() => setLast("account")}
        onBilling={() => setLast("billing")}
        onNotifications={() => setLast("notifications")}
        onLogOut={() => setLast("log-out")}
      />
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Last action: {last}
      </text>
    </div>
  );
};
