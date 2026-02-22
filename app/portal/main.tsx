import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PortalApp } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PortalApp />
  </StrictMode>
);
