import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./editor/App";
import "./editor/editor.css";

// Renderer cokmelerini yakala ve kullaniciya goster (sessiz kapanmasin)
window.addEventListener("error", (e) => {
  const msg = `[HATA] ${e.message}\n${e.error?.stack || ""}`;
  console.error(msg);
  try {
    (window as any).editor?.writeFile?.(
      `${Math.random()}.err`,
      msg
    );
  } catch {
    /* yoksay */
  }
  alert(msg);
});

window.addEventListener("unhandledrejection", (e) => {
  const reason = (e as PromiseRejectionEvent).reason;
  const msg = `[PROMISE HATA] ${reason?.stack || reason}`;
  console.error(msg);
  alert(msg);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
