import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { ToastViewport } from "./components/custom/toast-viewport.tsx";
import { getAppEnvironment } from "./lib/env.ts";
import { queryClient } from "./lib/query-client.ts";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Application root element was not found");
}

try {
  getAppEnvironment();
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Invalid app configuration";
  rootElement.style.whiteSpace = "pre-line";
  rootElement.textContent = [
    message,
    "",
    "1. Copy .env.example to .env (skip if you already have one)",
    "2. Fill in the value above in .env",
    "",
    "Then reload. If Vite doesn't pick up the change, restart the dev server.",
  ].join("\n");
  throw error;
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ToastViewport />
    </QueryClientProvider>
  </StrictMode>,
);
