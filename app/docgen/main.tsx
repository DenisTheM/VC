import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DocGenApp } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocGenApp />
  </StrictMode>
);
