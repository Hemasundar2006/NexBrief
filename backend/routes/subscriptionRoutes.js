import { Router } from "express";
import { z } from "zod";
import { createHash } from "node:crypto";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { UserModel, WorkspaceModel, SubscriptionModel, SubscriptionTransactionModel, SubscriptionWebhookModel } from "../models/index.js";
import { getPlan, publicPlans } from "../config/plans.js";
import { cashfreeConfigured, createCashfreeSubscription, fetchCashfreeSubscription, fetchCashfreeSubscriptionPayment, manageCashfreeSubscription, verifyCashfreeWebhook } from "../services/cashfreeSubscriptionService.js";
import { rateLimit } from "../middleware/security.js";

const router = Router();
const bodySchema = z.object({ planId: z.enum(["pro", "plus"]), billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"), phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/).optional() });
const successStatuses = new Set(["ACTIVE", "SUCCESS"]);
const failedStatuses = new Set(["FAILED", "CANCELLED", "EXPIRED", "PAST_DUE"]);
function pagination(query) { const page = Math.max(1, Math.min(100000, Number.parseInt(query.page, 10) || 1)); const limit = Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || 25)); return { page, limit, skip: (page - 1) * limit }; }
function asDate(value) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
function cashfreeSession(data) { return data.subscription_session_id || data.subscriptionSessionId || data.payment_session_id || data.auth_link || data.authorization_link || null; }
function cashfreeAuthStatus(data) { return data.authorisation_details?.authorization_status || data.authorization_details?.authorization_status || data.authorization_status || data.subscription_status || "INITIALIZED"; }
function nextDate(data) { return asDate(data.next_schedule_date || data.next_billing_date || data.subscription_next_charge_date); }

async function syncSubscription(record, data, { allowPlanActivation = true } = {}) {
  const status = String(data.subscription_status || record.subscriptionStatus || "INITIALIZED").toUpperCase();
  const authorizationStatus = String(cashfreeAuthStatus(data)).toUpperCase();
  const [paid, latestPayment] = await Promise.all([
    SubscriptionTransactionModel.findOne({ subscriptionId: record._id, paymentStatus: "SUCCESS" }).sort({ paymentTimestamp: -1 }).lean(),
    SubscriptionTransactionModel.findOne({ subscriptionId: record._id }).sort({ paymentTimestamp: -1 }).lean(),
  ]);
  const expired = Boolean(record.paidThrough && record.paidThrough <= new Date());
  const active = allowPlanActivation && successStatuses.has(status) && successStatuses.has(authorizationStatus) && Boolean(paid) && !record.cancelledAt && !expired;
  const failed = failedStatuses.has(status) || failedStatuses.has(authorizationStatus);
  const terminal = ["FAILED", "CANCELLED", "EXPIRED"].includes(status);
  record.subscriptionStatus = status;
  record.authorizationStatus = authorizationStatus;
  record.mandateStatus = authorizationStatus;
  record.cashfreeSubscriptionId = data.cf_subscription_id || record.cashfreeSubscriptionId;
  record.nextBillingDate = nextDate(data) || record.nextBillingDate;
  if (terminal) { record.autoRenew = false; record.checkoutLock = false; }
  if (paid) record.lastPaymentAt = paid.paymentTimestamp || paid.createdAt;
  if (latestPayment) record.lastPaymentStatus = latestPayment.paymentStatus;
  if (active && !record.paidThrough) {
    const through = new Date(record.lastPaymentAt || Date.now());
    if (record.billingCycle === "YEARLY") through.setUTCFullYear(through.getUTCFullYear() + 1);
    else through.setUTCMonth(through.getUTCMonth() + 1);
    record.paidThrough = through;
  }
  if (active) { record.activatedAt ||= new Date(); record.autoRenew = true; }
  await record.save();
  if (active) {
    await WorkspaceModel.findByIdAndUpdate(record.workspaceId, { $set: { plan: record.planId, billingStatus: "active", subscriptionId: record.subscriptionId, subscriptionStatus: status, billingCycle: record.billingCycle, subscriptionAmount: record.recurringAmount, subscriptionCurrency: record.currency, authorizationStatus, mandateStatus: authorizationStatus, activatedAt: record.activatedAt, nextBillingDate: record.nextBillingDate, expiresAt: record.paidThrough, autoRenew: true } });
  } else if (failed || expired) {
    const stillPaid = record.paidThrough && record.paidThrough > new Date();
    await WorkspaceModel.updateOne({ _id: record.workspaceId, subscriptionId: record.subscriptionId }, { $set: { ...(stillPaid ? {} : { plan: "free" }), billingStatus: stillPaid ? "active" : "past_due", subscriptionStatus: status, authorizationStatus, mandateStatus: authorizationStatus, autoRenew: record.autoRenew } });
  }
  return record;
}

router.get("/plans", (_req, res) => res.json({ data: publicPlans() }));

router.post("/subscriptions/create", requireAuth, requirePermission("workspace:manage"), rateLimit(8, 60000), asyncHandler(async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } });
  if (!cashfreeConfigured()) return res.status(503).json({ error: { code: "CASHFREE_NOT_CONFIGURED", message: "Cashfree sandbox credentials are not configured yet." } });
  const plan = getPlan(parsed.data.planId, parsed.data.billingCycle);
  const workspace = await WorkspaceModel.findById(req.user.workspaceId).lean();
  const user = await UserModel.findById(req.user.id).lean();
  if (!workspace || !user) return res.status(404).json({ error: { code: "ACCOUNT_NOT_FOUND" } });
  const existing = await SubscriptionModel.findOne({ workspaceId: workspace._id, $or: [{ checkoutLock: true }, { subscriptionStatus: { $in: ["CREATING", "INITIALIZED", "PENDING", "ACTIVE", "SUCCESS"] }, autoRenew: { $ne: false } }] }).sort({ createdAt: -1 });
  if (existing) return res.status(409).json({ error: { code: "SUBSCRIPTION_ALREADY_EXISTS", message: "A subscription is already pending or active. Manage it from Billing." } });
  const phone = parsed.data.phone || user.phone || (process.env.CASHFREE_ENV === "production" ? null : process.env.CASHFREE_TEST_CUSTOMER_PHONE);
  if (!phone) return res.status(400).json({ error: { code: "PHONE_REQUIRED", message: "Add a phone number before starting recurring billing." } });
  const subscriptionId = `nexbrief_${String(workspace._id).slice(-10)}_${Date.now()}`;
  const returnUrlValue = process.env.CASHFREE_RETURN_URL || `${process.env.FRONTEND_URL || "http://localhost:5173"}/app/billing?cashfree_return=1`;
  const returnUrlObject = new URL(returnUrlValue);
  returnUrlObject.searchParams.set("subscription_id", subscriptionId);
  const returnUrl = returnUrlObject.toString();
  const payload = {
    subscription_id: subscriptionId,
    customer_details: { customer_name: user.name, customer_email: user.email, customer_phone: phone },
    plan_details: { plan_name: `NexBrief ${plan.name} ${plan.billingCycle}`, plan_type: "PERIODIC", plan_amount: plan.amount, plan_max_amount: plan.amount, plan_max_cycles: plan.billingCycle === "YEARLY" ? 10 : 120, plan_intervals: 1, plan_currency: plan.currency, plan_interval_type: plan.billingCycle === "YEARLY" ? "YEAR" : "MONTH", plan_note: `NexBrief ${plan.name} recurring plan` },
    authorization_details: { authorization_amount: plan.amount, authorization_amount_refund: true, payment_methods: ["upi", "card", "enach"] },
    subscription_meta: { return_url: returnUrl, notification_channel: ["EMAIL"] },
    subscription_expiry_time: new Date(Date.now() + 10 * 365 * 86400000).toISOString(),
    subscription_tags: { workspace_id: String(workspace._id), plan_id: plan.id, billing_cycle: plan.billingCycle },
  };
  let record;
  try {
    record = await SubscriptionModel.create({ workspaceId: workspace._id, userId: user._id, planId: plan.id, planName: plan.name, billingCycle: plan.billingCycle, recurringAmount: plan.amount, currency: plan.currency, subscriptionId, subscriptionStatus: "CREATING", authorizationStatus: "INITIALIZED", mandateStatus: "INITIALIZED", autoRenew: true, checkoutLock: true });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: { code: "SUBSCRIPTION_ALREADY_EXISTS" } });
    throw error;
  }
  let response;
  try { response = await createCashfreeSubscription(payload); }
  catch (error) { record.subscriptionStatus = "CREATE_FAILED"; record.checkoutLock = false; record.autoRenew = false; await record.save(); throw error; }
  record.cashfreeSubscriptionId = response.cf_subscription_id;
  record.subscriptionSessionId = cashfreeSession(response);
  record.subscriptionStatus = response.subscription_status || "INITIALIZED";
  record.authorizationStatus = cashfreeAuthStatus(response);
  record.mandateStatus = record.authorizationStatus;
  await record.save();
  res.status(201).json({ data: { subscriptionId: record.subscriptionId, sessionId: record.subscriptionSessionId, cashfreeSubscriptionId: record.cashfreeSubscriptionId, mode: process.env.CASHFREE_ENV || "sandbox", plan: { id: plan.id, name: plan.name, amount: plan.amount, currency: plan.currency, billingCycle: plan.billingCycle } } });
}));

router.post("/subscriptions/verify", requireAuth, requirePermission("workspace:manage"), rateLimit(20, 60000), asyncHandler(async (req, res) => {
  const id = String(req.body?.subscriptionId || "");
  const record = await SubscriptionModel.findOne({ subscriptionId: id, workspaceId: req.user.workspaceId });
  if (!record) return res.status(404).json({ error: { code: "SUBSCRIPTION_NOT_FOUND" } });
  const response = await fetchCashfreeSubscription(record.subscriptionId);
  await syncSubscription(record, response);
  res.json({ data: { subscription: record.toObject(), verified: successStatuses.has(record.subscriptionStatus) || successStatuses.has(record.authorizationStatus) } });
}));

router.get("/subscriptions/current", requireAuth, requirePermission("workspace:manage"), asyncHandler(async (req, res) => {
  const subscription = await SubscriptionModel.findOne({ workspaceId: req.user.workspaceId }).sort({ createdAt: -1 }).lean();
  res.json({ data: subscription || null });
}));
router.get("/subscriptions/history", requireAuth, requirePermission("workspace:manage"), asyncHandler(async (req, res) => {
  const data = await SubscriptionModel.find({ workspaceId: req.user.workspaceId }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ data });
}));
router.get("/subscriptions/payments", requireAuth, requirePermission("workspace:manage"), asyncHandler(async (req, res) => {
  const data = await SubscriptionTransactionModel.find({ workspaceId: req.user.workspaceId }).sort({ paymentTimestamp: -1, createdAt: -1 }).limit(100).lean();
  res.json({ data });
}));
router.post("/subscriptions/cancel", requireAuth, requirePermission("workspace:manage"), rateLimit(8, 60000), asyncHandler(async (req, res) => {
  const record = await SubscriptionModel.findOne({ workspaceId: req.user.workspaceId, subscriptionId: req.body?.subscriptionId });
  if (!record) return res.status(404).json({ error: { code: "SUBSCRIPTION_NOT_FOUND" } });
  await manageCashfreeSubscription(record.subscriptionId, "CANCEL");
  record.pendingCancel = true; await record.save();
  const provider = await fetchCashfreeSubscription(record.subscriptionId);
  if (String(provider.subscription_status).toUpperCase() === "CANCELLED") { record.cancelledAt ||= new Date(); record.pendingCancel = false; await syncSubscription(record, provider); }
  res.status(record.pendingCancel ? 202 : 200).json({ data: record });
}));
router.post("/subscriptions/change-plan", requireAuth, requirePermission("workspace:manage"), rateLimit(8, 60000), asyncHandler(async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR" } });
  const record = await SubscriptionModel.findOne({ workspaceId: req.user.workspaceId, subscriptionStatus: { $in: ["ACTIVE", "SUCCESS"] }, autoRenew: true }).sort({ createdAt: -1 });
  if (!record) return res.status(409).json({ error: { code: "ACTIVE_SUBSCRIPTION_REQUIRED", message: "Start a verified subscription before changing plans." } });
  const cashfreePlanId = process.env[`CASHFREE_${parsed.data.planId.toUpperCase()}_${parsed.data.billingCycle}_PLAN_ID`] || process.env[`CASHFREE_${parsed.data.planId.toUpperCase()}_PLAN_ID`];
  if (!cashfreePlanId) return res.status(409).json({ error: { code: "CASHFREE_PLAN_ID_REQUIRED", message: "Configure the Cashfree recurring plan ID before changing an active plan." } });
  const next = getPlan(parsed.data.planId, parsed.data.billingCycle);
  record.pendingPlanId = next.id; record.pendingBillingCycle = next.billingCycle; record.pendingCashfreePlanId = cashfreePlanId; await record.save();
  try { await manageCashfreeSubscription(record.subscriptionId, "CHANGE_PLAN", { plan_id: cashfreePlanId }); }
  catch (error) { record.pendingPlanId = undefined; record.pendingBillingCycle = undefined; record.pendingCashfreePlanId = undefined; await record.save(); throw error; }
  res.status(202).json({ data: record, message: "Plan change is pending Cashfree confirmation and payment." });
}));

async function processWebhook(rawBody, signature, timestamp) {
  const valid = verifyCashfreeWebhook(rawBody, signature, timestamp);
  if (!valid) { const error = new Error("Invalid Cashfree webhook signature."); error.status = 401; error.code = "INVALID_WEBHOOK_SIGNATURE"; throw error; }
  const payload = JSON.parse(rawBody.toString("utf8"));
  const data = payload.data || payload;
  const eventType = payload.type || payload.event_type || payload.eventType || "UNKNOWN";
  const eventId = String(payload.event_id || payload.eventId || createHash("sha256").update(rawBody).digest("hex"));
  let hook;
  try { hook = await SubscriptionWebhookModel.create({ eventId, eventType, subscriptionId: data.subscription_id || data.cf_subscription_id, paymentId: data.payment_id || data.cf_payment_id, signatureVerified: true, rawPayload: payload }); }
  catch (error) { if (error.code !== 11000) throw error; hook = await SubscriptionWebhookModel.findOne({ eventId }); if (hook?.processingStatus === "processed" || hook?.processingStatus === "ignored") return { duplicate: true }; }
  if (!hook) throw new Error("Webhook event could not be stored.");
  const id = data.subscription_id || data.subscription?.subscription_id || data.cf_subscription_id;
  const record = id ? await SubscriptionModel.findOne({ $or: [{ subscriptionId: id }, { cashfreeSubscriptionId: id }] }) : null;
  if (!record) { hook.processingStatus = "ignored"; hook.processedAt = new Date(); await hook.save(); return { duplicate: false }; }
  try {
    const providerSubscription = await fetchCashfreeSubscription(record.subscriptionId);
    const eventPayment = data.payment || data.payment_details || data;
    const paymentId = eventPayment.subscription_payment_id || eventPayment.payment_id || eventPayment.cf_payment_id || eventPayment.paymentId;
    if (paymentId) {
      const payment = await fetchCashfreeSubscriptionPayment(record.subscriptionId, paymentId);
      const status = String(payment.payment_status || payment.status || "").toUpperCase();
      const amount = Number(payment.payment_amount ?? payment.amount);
      const currency = String(payment.payment_currency || payment.currency || record.currency).toUpperCase();
      if (!Number.isFinite(amount) || amount < 0 || currency !== record.currency) throw new Error("Cashfree payment details do not match the subscription.");
      const normalized = status === "SUCCESS" ? "SUCCESS" : status === "FAILED" ? "FAILED" : status === "REFUNDED" ? "REFUNDED" : "PENDING";
      const providerPlanId = providerSubscription.plan_details?.plan_id || providerSubscription.plan_id;
      const pendingPlan = record.pendingPlanId && getPlan(record.pendingPlanId, record.pendingBillingCycle);
      const confirmedChange = pendingPlan && providerPlanId === record.pendingCashfreePlanId && normalized === "SUCCESS" && amount >= pendingPlan.amount;
      if (normalized === "SUCCESS" && !confirmedChange && amount < record.recurringAmount) throw new Error("Cashfree payment amount is below the subscribed price.");
      if (confirmedChange) {
        record.planId = pendingPlan.id; record.planName = pendingPlan.name; record.billingCycle = pendingPlan.billingCycle; record.recurringAmount = pendingPlan.amount;
        record.pendingPlanId = undefined; record.pendingBillingCycle = undefined; record.pendingCashfreePlanId = undefined;
        await record.save();
      }
      const existing = await SubscriptionTransactionModel.findOne({ cashfreePaymentId: paymentId });
      if (existing && String(existing.subscriptionId) !== String(record._id)) throw new Error("Cashfree payment belongs to a different subscription.");
      if (!existing || existing.paymentStatus !== "SUCCESS" || normalized === "REFUNDED") await SubscriptionTransactionModel.updateOne({ cashfreePaymentId: paymentId }, { $set: { paymentStatus: normalized, verifiedAt: new Date(), paymentTimestamp: asDate(payment.payment_time || payment.payment_time_stamp) || new Date(), rawReference: payment }, $setOnInsert: { workspaceId: record.workspaceId, userId: record.userId, subscriptionId: record._id, cashfreeSubscriptionId: record.cashfreeSubscriptionId, cashfreePaymentId: paymentId, transactionType: eventType.toLowerCase().includes("recurring") ? "recurring" : "initial", amount, currency, paymentMethod: payment.payment_group || payment.payment_method } }, { upsert: true });
      if (normalized === "REFUNDED") {
        const previous = await SubscriptionTransactionModel.findOne({ subscriptionId: record._id, paymentStatus: "SUCCESS" }).sort({ paymentTimestamp: -1 }).lean();
        const through = new Date(previous?.paymentTimestamp || 0);
        if (previous) { if (record.billingCycle === "YEARLY") through.setUTCFullYear(through.getUTCFullYear() + 1); else through.setUTCMonth(through.getUTCMonth() + 1); }
        record.paidThrough = through;
        await record.save();
      }
      if (normalized === "SUCCESS" && (!record.lastPaymentAt || (asDate(payment.payment_time || payment.payment_time_stamp) || new Date()) > record.lastPaymentAt)) {
        const paidAt = asDate(payment.payment_time || payment.payment_time_stamp) || new Date();
        const through = new Date(paidAt);
        if (record.billingCycle === "YEARLY") through.setUTCFullYear(through.getUTCFullYear() + 1);
        else through.setUTCMonth(through.getUTCMonth() + 1);
        record.paidThrough = through;
        record.lastPaymentAt = paidAt;
        await record.save();
      }
    }
    if (String(providerSubscription.subscription_status).toUpperCase() === "CANCELLED") { record.cancelledAt ||= new Date(); record.pendingCancel = false; }
    await syncSubscription(record, providerSubscription);
    hook.processingStatus = "processed"; hook.processedAt = new Date(); hook.errorMessage = undefined; await hook.save();
    return { duplicate: false };
  } catch (error) { hook.processingStatus = "failed"; hook.errorMessage = String(error.message).slice(0, 500); await hook.save(); throw error; }
}
router.post("/subscriptions/webhook", rateLimit(120, 60000), asyncHandler(async (req, res) => { const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {})); await processWebhook(raw, req.headers["x-webhook-signature"], req.headers["x-webhook-timestamp"]); res.json({ ok: true }); }));

router.get("/admin/subscriptions", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.platformOwner) return res.status(403).json({ error: { code: "PLATFORM_OWNER_REQUIRED" } });
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (req.query.status) filter.subscriptionStatus = String(req.query.status).toUpperCase();
  if (req.query.plan && ["pro", "plus"].includes(req.query.plan)) filter.planId = req.query.plan;
  if (req.query.search) { const term = String(req.query.search).trim().slice(0, 100); const users = await UserModel.find({ $or: [{ name: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }, { email: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }] }).select("_id").lean(); filter.userId = { $in: users.map(user => user._id) }; }
  const [rows, total] = await Promise.all([SubscriptionModel.find(filter).populate("userId", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), SubscriptionModel.countDocuments(filter)]);
  res.json({ data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
router.get("/admin/subscriptions/:id", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.platformOwner) return res.status(403).json({ error: { code: "PLATFORM_OWNER_REQUIRED" } });
  const row = await SubscriptionModel.findById(req.params.id).populate("userId", "name email serviceRole").lean();
  if (!row) return res.status(404).json({ error: { code: "SUBSCRIPTION_NOT_FOUND" } });
  const payments = await SubscriptionTransactionModel.find({ subscriptionId: row._id }).sort({ createdAt: -1 }).lean();
  res.json({ data: { subscription: row, payments } });
}));
router.get("/admin/transactions", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.platformOwner) return res.status(403).json({ error: { code: "PLATFORM_OWNER_REQUIRED" } });
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (req.query.status) filter.paymentStatus = String(req.query.status).toUpperCase();
  if (req.query.type && ["initial", "recurring", "refund", "adjustment"].includes(req.query.type)) filter.transactionType = req.query.type;
  const [rows, total] = await Promise.all([SubscriptionTransactionModel.find(filter).populate("userId", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), SubscriptionTransactionModel.countDocuments(filter)]);
  res.json({ data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
router.get("/admin/transactions/:id", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.platformOwner) return res.status(403).json({ error: { code: "PLATFORM_OWNER_REQUIRED" } });
  const row = await SubscriptionTransactionModel.findById(req.params.id).populate("userId", "name email").lean();
  if (!row) return res.status(404).json({ error: { code: "TRANSACTION_NOT_FOUND" } });
  res.json({ data: row });
}));
router.get("/admin/subscription-analytics", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.platformOwner) return res.status(403).json({ error: { code: "PLATFORM_OWNER_REQUIRED" } });
  const [subscriptions, successful, failed] = await Promise.all([SubscriptionModel.countDocuments({}), SubscriptionModel.countDocuments({ subscriptionStatus: { $in: ["ACTIVE", "SUCCESS"] } }), SubscriptionTransactionModel.countDocuments({ paymentStatus: "FAILED" })]);
  const revenue = await SubscriptionTransactionModel.aggregate([{ $match: { paymentStatus: "SUCCESS" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]);
  res.json({ data: { subscriptions, active: successful, failedRenewals: failed, collectedRevenue: revenue[0]?.total || 0, successfulPayments: revenue[0]?.count || 0 } });
}));
router.get("/admin/subscription-revenue", requireAuth, asyncHandler(async (req, res) => { if (!req.user.platformOwner) return res.status(403).json({ error: { code: "PLATFORM_OWNER_REQUIRED" } }); const rows = await SubscriptionTransactionModel.aggregate([{ $match: { paymentStatus: "SUCCESS" } }, { $group: { _id: "$currency", total: { $sum: "$amount" }, count: { $sum: 1 } } }]); res.json({ data: rows }); }));
router.get("/admin/subscriptions/export", requireAuth, asyncHandler(async (req, res) => { if (!req.user.platformOwner) return res.status(403).json({ error: { code: "PLATFORM_OWNER_REQUIRED" } }); const rows = await SubscriptionTransactionModel.find({}).populate("userId", "name email").sort({ createdAt: -1 }).lean(); const header = "transactionId,customerEmail,amount,currency,status,type,timestamp"; const lines = rows.map(row => [row.cashfreePaymentId || row._id, row.userId?.email || "", row.amount, row.currency, row.paymentStatus, row.transactionType, row.paymentTimestamp?.toISOString() || ""].map(value => `"${String(value).replaceAll('"','""')}"`).join(",")); res.type("text/csv").send([header, ...lines].join("\n")); }));

export { processWebhook, syncSubscription };
export default router;
