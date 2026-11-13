import { createHmac, timingSafeEqual } from "node:crypto";

const mode = String(process.env.CASHFREE_ENV || "sandbox").toLowerCase() === "production" ? "production" : "sandbox";
const baseUrl = process.env.CASHFREE_API_BASE_URL || (mode === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg");
const clientId = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
const clientSecret = process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_CLIENT_SECRET;
const apiVersion = process.env.CASHFREE_API_VERSION || "2026-01-01";

export function cashfreeConfigured() { return Boolean(clientId && clientSecret); }
function assertConfigured() {
  if (!cashfreeConfigured()) {
    const error = new Error("Cashfree subscription credentials are not configured on the server.");
    error.status = 503; error.code = "CASHFREE_NOT_CONFIGURED"; throw error;
  }
}
async function cashfreeRequest(path, options = {}) {
  assertConfigured();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "x-api-version": apiVersion, "x-client-id": clientId, "x-client-secret": clientSecret, ...(options.headers || {}) },
  });
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) { const error = new Error(data.message || "Cashfree request failed."); error.status = response.status >= 500 ? 502 : response.status; error.code = data.code || "CASHFREE_REQUEST_FAILED"; error.details = data; throw error; }
  return data;
}
export function createCashfreeSubscription(payload) { return cashfreeRequest("/subscriptions", { method: "POST", body: JSON.stringify(payload) }); }
export function fetchCashfreeSubscription(subscriptionId) { return cashfreeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: "GET" }); }
export function fetchCashfreeSubscriptionPayment(subscriptionId, paymentId) { return cashfreeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}/payments/${encodeURIComponent(paymentId)}`, { method: "GET" }); }
export function manageCashfreeSubscription(subscriptionId, action, actionDetails = {}) { return cashfreeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}/manage`, { method: "POST", body: JSON.stringify({ subscription_id: subscriptionId, action, action_details: actionDetails }) }); }

export function verifyCashfreeWebhook(rawBody, signature, timestamp) {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET || clientSecret;
  if (!secret || !signature || !timestamp) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}${rawBody}`).digest("base64");
  const a = Buffer.from(String(signature)); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export { mode };
