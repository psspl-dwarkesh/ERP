import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./ds/tokens.css";
import "./ds/base.css";
import "./ds/components.css";
import "./app/shell.css";
import "./app/patterns.css";
import "./app/guide.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
