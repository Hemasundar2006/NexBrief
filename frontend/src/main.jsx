import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const path = window.location.pathname;
const Page =
  path === "/"
    ? lazy(() => import("./LandingPage.jsx"))
    : path === "/sign-in" || path === "/start-free"
      ? lazy(() =>
          import("./AuthPage.jsx").then(({ default: AuthPage }) => ({
            default: () => (
              <AuthPage mode={path === "/start-free" ? "signup" : "signin"} />
            ),
          })),
        )
      : lazy(() => import("./App.jsx"));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback={<div className="page-loading" aria-label="Loading NexBrief" />}>
      <Page />
    </Suspense>
  </StrictMode>,
);
