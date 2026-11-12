import mongoose from "mongoose";
import { z } from "zod";
import { generateDraft } from "../../ai-service/ai.js";
import {
  ActivityModel,
  ConsentModel,
  DraftModel,
  LeadModel,
  ProposalModel,
} from "../models/index.js";
import { paymentStatuses, proposalStatuses } from "../config/constants.js";
import { audit, recordActivity } from "../services/auditService.js";
import { confirmQuota, releaseQuota, reserveQuota } from "../services/quotaService.js";
export async function pipeline(req, res) {
  const workspaceId = new mongoose.Types.ObjectId(req.user.workspaceId);
  const [stages, totals, due] = await Promise.all([
    LeadModel.aggregate([
      { $match: { workspaceId, archivedAt: null } },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          value: { $sum: "$value" },
        },
      },
    ]),
    LeadModel.aggregate([
      { $match: { workspaceId, archivedAt: null } },
      { $group: { _id: null, value: { $sum: "$value" }, count: { $sum: 1 } } },
    ]),
    LeadModel.countDocuments({
      workspaceId,
      archivedAt: null,
      nextActionAt: { $lte: new Date() },
    }),
  ]);
  res.json({
    data: {
      stages,
      totals: totals[0] || { value: 0, count: 0 },
      followUpsDue: due,
    },
  });
}
export async function activities(req, res) {
  const filter = { workspaceId: req.user.workspaceId };
  if (req.query.leadId) filter.leadId = req.query.leadId;
  res.json({
    data: await ActivityModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  });
}
export async function createDraft(req, res) {
  const p = z
    .object({
      leadId: z.string(),
      kind: z.enum(["outreach", "followup", "proposal"]),
    })
    .safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: { code: "VALIDATION_ERROR" } });
  const lead = await LeadModel.findOne({
    _id: p.data.leadId,
    workspaceId: req.user.workspaceId,
    archivedAt: null,
  }).lean();
  if (!lead) return res.status(404).json({ error: { code: "LEAD_NOT_FOUND" } });
  const latestAiConsent = process.env.OPENAI_API_KEY ? await ConsentModel.findOne({userId:req.user.id,purpose:'ai-processing'}).sort({recordedAt:-1,_id:-1}).lean() : null;
  if (process.env.OPENAI_API_KEY && !latestAiConsent?.granted)
    return res.status(403).json({ error: { code: "AI_CONSENT_REQUIRED" } });
  const quota = await reserveQuota(req, "outreach", 1);
  if (!quota) return res.status(402).json({ error: { code: "USAGE_LIMIT_REACHED", message: "Your AI draft limit has been reached for this period." } });
  try {
    const result = await generateDraft(
      { ...lead, id: String(lead._id) },
      p.data.kind,
    );
    const data = await DraftModel.create({
      workspaceId: req.user.workspaceId,
      leadId: lead._id,
      kind: p.data.kind,
      content: result.draft,
      provider: result.provider,
    });
    await confirmQuota(quota.reservation._id);
    await recordActivity(req, "draft.created", `${lead.company} · ${p.data.kind} draft created`, lead._id);
    await audit(req, "ai.draft", "draft", String(data._id), { provider: result.provider });
    res.status(201).json({ data: { ...data.toObject(), note: result.note } });
  } catch (error) {
    await releaseQuota(quota.reservation._id);
    throw error;
  }
}
export async function listDrafts(req, res) {
  const data = await DraftModel.find({workspaceId:req.user.workspaceId})
    .sort({createdAt:-1}).limit(100).lean();
  res.json({data});
}
export async function listProposals(req, res) {
  const filter = { workspaceId: req.user.workspaceId };
  if (req.query.leadId) filter.leadId = req.query.leadId;
  res.json({
    data: await ProposalModel.find(filter).sort({ updatedAt: -1 }).lean(),
  });
}
export async function createProposal(req, res) {
  const schema = z
    .object({
      leadId: z.string(),
      title: z.string().min(2).max(200),
      summary: z.string().max(10000).optional(),
      deliverables: z.array(z.string().max(500)).max(50).default([]),
      amount: z.number().positive(),
      currency: z.string().length(3).default("USD"),
      deposit: z.number().nonnegative(),
      status: z.enum(proposalStatuses).default("Draft"),
      timeline: z.string().min(2).max(500),
    })
    .refine((v) => v.deposit <= v.amount);
  const p = schema.safeParse(req.body);
  if (!p.success)
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", details: p.error.flatten() },
    });
  if (
    !(await LeadModel.exists({
      _id: p.data.leadId,
      workspaceId: req.user.workspaceId,
    }))
  )
    return res.status(404).json({ error: { code: "LEAD_NOT_FOUND" } });
  const data = await ProposalModel.create({
    ...p.data,
    workspaceId: req.user.workspaceId,
  });
  await recordActivity(req, "proposal.created", `${data.title} proposal created`, data.leadId);
  await audit(req, "proposal.create", "proposal", String(data._id));
  res.status(201).json({ data });
}
export async function updateProposal(req, res) {
  const p = z
    .object({
      status: z.enum(proposalStatuses).optional(),
      paymentStatus: z.enum(paymentStatuses).optional(),
      title: z.string().max(200).optional(),
      summary: z.string().max(10000).optional(),
      amount: z.number().positive().optional(),
      deposit: z.number().nonnegative().optional(),
      timeline: z.string().max(500).optional(),
    })
    .safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: { code: "VALIDATION_ERROR" } });
  const data = await ProposalModel.findOneAndUpdate(
    { _id: req.params.id, workspaceId: req.user.workspaceId },
    p.data,
    { new: true, runValidators: true },
  );
  if (!data) return res.status(404).json({ error: { code: "PROPOSAL_NOT_FOUND" } });
  await recordActivity(req, "proposal.updated", `${data.title} · ${data.status}`, data.leadId);
  res.json({ data });
}
export async function recordPayment(req, res) {
  const p = z
    .object({
      proposalId: z.string(),
      status: z.enum(paymentStatuses),
      reference: z.string().max(200).optional(),
    })
    .safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: { code: "VALIDATION_ERROR" } });
  const data = await ProposalModel.findOneAndUpdate(
    { _id: p.data.proposalId, workspaceId: req.user.workspaceId },
    {
      paymentStatus: p.data.status,
      paymentProvider: "manual",
      externalPaymentId: p.data.reference,
    },
    { new: true },
  );
  if (!data) return res.status(404).json({ error: { code: "PROPOSAL_NOT_FOUND" } });
  await recordActivity(req, "payment.updated", `${data.title} · ${data.paymentStatus}`, data.leadId);
  res.json({ data });
}
