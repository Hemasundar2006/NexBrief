import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { authToken } from "./api";
import "./styles.css";

const rawPath = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
const isPreview = typeof window !== "undefined" && window.location.search.includes("preview=");
const hasToken = typeof window !== "undefined" && Boolean(authToken.get());

// Restrict logged-in members from navigating back to the public landing pages or sign-in.
// Only explicit sign out clears the session and returns them to the sign-in page.
if (hasToken && !isPreview) {
  if (
    rawPath === "/" ||
    rawPath === "" ||
    rawPath === "/features" ||
    rawPath === "/how-it-works" ||
    rawPath === "/how" ||
    rawPath === "/pricing" ||
    rawPath === "/testimonials" ||
    rawPath === "/founder" ||
    rawPath === "/start-free" ||
    rawPath === "/sign-in"
  ) {
    window.location.replace("/app");
  }
}

let Page;
if (rawPath === "/" || rawPath === "") {
  Page = lazy(() => import("./LandingPage.jsx"));
} else if (rawPath === "/features") {
  Page = lazy(() => import("./FeaturesPage.jsx"));
} else if (rawPath === "/how-it-works" || rawPath === "/how") {
  Page = lazy(() => import("./HowItWorksPage.jsx"));
} else if (rawPath === "/pricing") {
  Page = lazy(() => import("./PricingPage.jsx"));
} else if (rawPath === "/testimonials") {
  Page = lazy(() => import("./TestimonialsPage.jsx"));
} else if (rawPath === "/founder") {
  Page = lazy(() => import("./FounderPage.jsx"));
} else if (rawPath === "/sign-in" || rawPath === "/start-free") {
  Page = lazy(() =>
    import("./AuthPage.jsx").then(({ default: AuthPage }) => ({
      default: () => (
        <AuthPage mode={rawPath === "/start-free" ? "signup" : "signin"} />
      ),
    })),
  );
} else {
  Page = lazy(() => import("./App.jsx"));
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback={<div className="page-loading" aria-label="Loading NexBrief" />}>
      <Page />
    </Suspense>
  </StrictMode>,
);
