import React from "react";
import { createRoot } from "react-dom/client";
// The kit stylesheet must load before App: pages import their own CSS, and
// page rules need to come later in the cascade to override kit defaults.
import "./styles/index.css";
import App from "./App";
import { applyTheme, savedTheme } from "./utils/themes";

// Apply the theme before the first render so there is no flash of the wrong palette.
applyTheme(savedTheme());

createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);
