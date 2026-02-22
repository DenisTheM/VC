import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LoginApp } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LoginApp />
  </StrictMode>
);
