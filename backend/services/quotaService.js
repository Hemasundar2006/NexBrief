import {
  QuotaReservationModel,
  UsageLedgerModel,
  WorkspaceModel,
  LeadModel,
} from "../models/index.js";
import { plans } from "../config/plans.js";

function periodStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
function reservationKey(req) {
  return (
    req.get("idempotency-key") ||
    `${req.user.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  );
}
export async function reserveQuota(req, feature, amount = 1) {
  const workspace = await WorkspaceModel.findById(req.user.workspaceId)
    .select("plan")
    .lean();
  const planName = workspace?.plan || "free";
  const limit = plans[planName]?.[feature] ?? plans.free[feature];
  const start = periodStart();
  const key = reservationKey(req);
  let existing = await QuotaReservationModel.findOne({
    workspaceId: req.user.workspaceId,
    feature,
    idempotencyKey: key,
  }).lean();
  if (existing)
    return existing.status === "reserved" || existing.status === "confirmed"
      ? { reservation: existing, planName, limit }
      : null;
  await UsageLedgerModel.updateOne(
    { workspaceId: req.user.workspaceId, feature, periodStart: start },
    { $setOnInsert: { limit, used: 0, reserved: 0 } },
    { upsert: true },
  );
  const ledger = await UsageLedgerModel.findOneAndUpdate(
    {
      workspaceId: req.user.workspaceId,
      feature,
      periodStart: start,
      $expr: { $lte: [{ $add: ["$used", "$reserved"] }, limit - amount] },
    },
    { $inc: { reserved: amount } },
    { new: true },
  ).lean();
  if (!ledger) return null;
  try {
    existing = await QuotaReservationModel.create({
      workspaceId: req.user.workspaceId,
      feature,
      idempotencyKey: key,
      amount,
      status: "reserved",
      periodStart: start,
    });
  } catch (error) {
    await UsageLedgerModel.updateOne(
      { workspaceId: req.user.workspaceId, feature, periodStart: start },
      { $inc: { reserved: -amount } },
    );
    if (error.code === 11000) return reserveQuota(req, feature, amount);
    throw error;
  }
  return { reservation: existing.toObject(), planName, limit };
}
export async function confirmQuota(reservationId) {
  const reservation = await QuotaReservationModel.findOneAndUpdate(
    { _id: reservationId, status: "reserved" },
    { $set: { status: "confirmed" } },
    { new: true },
  );
  if (!reservation) return;
  await UsageLedgerModel.updateOne(
    {
      workspaceId: reservation.workspaceId,
      feature: reservation.feature,
      periodStart: reservation.periodStart,
    },
    { $inc: { reserved: -reservation.amount, used: reservation.amount } },
  );
}
export async function releaseQuota(reservationId) {
  const reservation = await QuotaReservationModel.findOneAndUpdate(
    { _id: reservationId, status: "reserved" },
    { $set: { status: "released" } },
    { new: true },
  );
  if (!reservation) return;
  await UsageLedgerModel.updateOne(
    {
      workspaceId: reservation.workspaceId,
      feature: reservation.feature,
      periodStart: reservation.periodStart,
    },
    { $inc: { reserved: -reservation.amount } },
  );
}
export async function getUsage(workspaceId) {
  const start = periodStart();
  const workspace = await WorkspaceModel.findById(workspaceId)
    .select("plan")
    .lean();
  const planName = workspace?.plan || "free";
  const plan = plans[planName] || plans.free;
  const ledgers = await UsageLedgerModel.find({
    workspaceId,
    periodStart: start,
  }).lean();
  const storedLeads = await LeadModel.countDocuments({ workspaceId, archivedAt: null });
  const data = {};
  for (const [feature, limit] of Object.entries({
    discoveries: plan.discoveries,
    audits: plan.audits,
    outreach: plan.outreach,
  })) {
    const row = ledgers.find((item) => item.feature === feature);
    data[feature] = {
      used: row?.used || 0,
      reserved: row?.reserved || 0,
      limit,
      remaining: Math.max(0, limit - (row?.used || 0) - (row?.reserved || 0)),
    };
  }
  return {
    plan: planName,
    storedLeads,
    resetAt: new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    ),
    data,
  };
}
