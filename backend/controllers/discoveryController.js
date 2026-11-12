import { z } from "zod";
import {
  DiscoveredBusinessModel,
  DiscoveryJobModel,
  LeadModel,
  OutreachDraftModel,
  WebsiteAuditModel,
} from "../models/index.js";
import { auditWebsite } from "../services/websiteAuditService.js";
import { discoverBusinesses } from "../services/discoveryService.js";
import {
  confirmQuota,
  getUsage,
  releaseQuota,
  reserveQuota,
} from "../services/quotaService.js";
import { audit } from "../services/auditService.js";

const discoverySchema = z.object({
  country: z.string().trim().min(2).max(80),
  state: z.string().trim().max(80).optional(),
  city: z.string().trim().max(100).optional(),
  category: z.string().trim().min(2).max(120),
  keywords: z.string().trim().max(200).optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
const auditSchema = z.object({
  businessId: z.string().regex(/^[a-f\d]{24}$/i),
});
const outreachSchema = z.object({
  kind: z
    .enum(["cold-email", "proposal", "follow-up", "linkedin"])
    .default("cold-email"),
});
const id = (value) => String(value);

async function runDiscovery(job, reservationId) {
  await DiscoveryJobModel.updateOne(
    { _id: job._id },
    { $set: { status: "running", startedAt: new Date() } },
  );
  try {
    const businesses = await discoverBusinesses(job.query);
    if (businesses.length)
      await DiscoveredBusinessModel.insertMany(
        businesses.map((business) => ({
          ...business,
          workspaceId: job.workspaceId,
          jobId: job._id,
          provider:
            process.env.BUSINESS_DISCOVERY_PROVIDER_NAME ||
            "configured-provider",
        })),
        { ordered: false },
      );
    await DiscoveryJobModel.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "completed",
          resultCount: businesses.length,
          completedAt: new Date(),
        },
      },
    );
    await confirmQuota(reservationId);
  } catch (error) {
    await DiscoveryJobModel.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "failed",
          errorCode: error.code || "DISCOVERY_FAILED",
          errorMessage: error.message,
          completedAt: new Date(),
        },
      },
    );
    await releaseQuota(reservationId);
  }
}
export async function startDiscovery(req, res) {
  const value = discoverySchema.safeParse(req.body);
  if (!value.success)
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", details: value.error.flatten() },
    });
  const quota = await reserveQuota(req, "discoveries", 1);
  if (!quota)
    return res.status(429).json({
      error: {
        code: "QUOTA_EXCEEDED",
        message: "Your discovery limit has been reached.",
        upgrade: quota?.planName !== "pro",
      },
    });
  const job = await DiscoveryJobModel.create({
    workspaceId: req.user.workspaceId,
    createdBy: req.user.id,
    query: value.data,
    provider: process.env.BUSINESS_DISCOVERY_PROVIDER_NAME || "not-configured",
  });
  setImmediate(() => runDiscovery(job, quota.reservation._id));
  res.status(202).json({
    data: {
      jobId: id(job._id),
      status: job.status,
      providerConfigured: Boolean(
        process.env.BUSINESS_DISCOVERY_PROVIDER_URL &&
          process.env.BUSINESS_DISCOVERY_PROVIDER_TOKEN,
      ),
    },
  });
}
export async function getDiscoveryJob(req, res) {
  const job = await DiscoveryJobModel.findOne({
    _id: req.params.id,
    workspaceId: req.user.workspaceId,
  }).lean();
  if (!job) return res.status(404).json({ error: { code: "JOB_NOT_FOUND" } });
  res.json({ data: job });
}
export async function listBusinesses(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const filter = { workspaceId: req.user.workspaceId };
  if (req.query.jobId) filter.jobId = req.query.jobId;
  const [items, total] = await Promise.all([
    DiscoveredBusinessModel.find(filter)
      .sort({ opportunityScore: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DiscoveredBusinessModel.countDocuments(filter),
  ]);
  res.json({
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
async function runAudit(auditRecord, reservationId) {
  await WebsiteAuditModel.updateOne(
    { _id: auditRecord._id },
    { $set: { status: "running", startedAt: new Date() } },
  );
  try {
    const result = await auditWebsite(auditRecord.url);
    await WebsiteAuditModel.updateOne(
      { _id: auditRecord._id },
      { $set: { ...result, status: "completed", completedAt: new Date() } },
    );
    await DiscoveredBusinessModel.updateOne(
      { _id: auditRecord.businessId },
      {
        $set: {
          auditStatus: "completed",
          opportunityScore: Math.min(
            100,
            Math.round(
              (result.findings.length ? 55 : 30) +
                result.findings.filter((finding) => finding.severity === "high")
                  .length *
                  15,
            ),
          ),
          scoreReason: result.findings.length
            ? "Score is based on verified website findings and service relevance; it does not indicate buying intent."
            : "No verified issues were found in the checks completed.",
        },
      },
    );
    await confirmQuota(reservationId);
  } catch (error) {
    await WebsiteAuditModel.updateOne(
      { _id: auditRecord._id },
      {
        $set: {
          status: "failed",
          errorCode: error.code || "AUDIT_FAILED",
          errorMessage: error.message,
          completedAt: new Date(),
        },
      },
    );
    await DiscoveredBusinessModel.updateOne(
      { _id: auditRecord.businessId },
      { $set: { auditStatus: "failed" } },
    );
    await releaseQuota(reservationId);
  }
}
export async function startAudit(req, res) {
  const value = auditSchema.safeParse(req.body);
  if (!value.success)
    return res.status(400).json({ error: { code: "VALIDATION_ERROR" } });
  const business = await DiscoveredBusinessModel.findOne({
    _id: value.data.businessId,
    workspaceId: req.user.workspaceId,
  }).lean();
  if (!business?.websiteUrl)
    return res.status(400).json({
      error: {
        code: "WEBSITE_REQUIRED",
        message: "This business does not have a verified website URL.",
      },
    });
  const quota = await reserveQuota(req, "audits", 1);
  if (!quota)
    return res.status(429).json({
      error: {
        code: "QUOTA_EXCEEDED",
        message: "Your website audit limit has been reached.",
        upgrade: true,
      },
    });
  const auditRecord = await WebsiteAuditModel.create({
    workspaceId: req.user.workspaceId,
    businessId: business._id,
    url: business.websiteUrl,
  });
  await DiscoveredBusinessModel.updateOne(
    { _id: business._id },
    { $set: { auditStatus: "queued" } },
  );
  setImmediate(() => runAudit(auditRecord, quota.reservation._id));
  res.status(202).json({
    data: { auditId: id(auditRecord._id), status: auditRecord.status },
  });
}
export async function getAudit(req, res) {
  const item = await WebsiteAuditModel.findOne({
    _id: req.params.id,
    workspaceId: req.user.workspaceId,
  }).lean();
  if (!item)
    return res.status(404).json({ error: { code: "AUDIT_NOT_FOUND" } });
  res.json({ data: item });
}
export async function saveBusiness(req, res) {
  const business = await DiscoveredBusinessModel.findOne({
    _id: req.params.id,
    workspaceId: req.user.workspaceId,
  }).lean();
  if (!business)
    return res.status(404).json({ error: { code: "BUSINESS_NOT_FOUND" } });
  if (business.crmLeadId)
    return res.json({
      data: { leadId: id(business.crmLeadId), alreadySaved: true },
    });
  const existing = await LeadModel.findOne({
    workspaceId: req.user.workspaceId,
    $or: [{ website: business.websiteUrl }, { company: business.name }],
  }).lean();
  if (existing) {
    await DiscoveredBusinessModel.updateOne(
      { _id: business._id },
      { $set: { crmLeadId: existing._id } },
    );
    return res.json({ data: { leadId: id(existing._id), alreadySaved: true } });
  }
  const lead = await LeadModel.create({
    workspaceId: req.user.workspaceId,
    name: business.publicContact?.name || business.name,
    company: business.name,
    email: business.publicContact?.email,
    phone: business.publicContact?.phone,
    website: business.websiteUrl,
    source: `business-discovery:${business.provider}`,
    service: business.category || "Website improvement",
    qualificationScore: business.opportunityScore || 0,
    notes: business.scoreReason,
  });
  await DiscoveredBusinessModel.updateOne(
    { _id: business._id },
    { $set: { crmLeadId: lead._id } },
  );
  await audit(req, "discovery.save_to_crm", "lead", lead.id, {
    businessId: id(business._id),
  });
  res.status(201).json({ data: { leadId: id(lead._id), alreadySaved: false } });
}
export async function generateOutreach(req, res) {
  const value = outreachSchema.safeParse(req.body);
  if (!value.success)
    return res.status(400).json({ error: { code: "VALIDATION_ERROR" } });
  const business = await DiscoveredBusinessModel.findOne({
    _id: req.params.id,
    workspaceId: req.user.workspaceId,
  }).lean();
  if (!business)
    return res.status(404).json({ error: { code: "BUSINESS_NOT_FOUND" } });
  const latestAudit = await WebsiteAuditModel.findOne({
    businessId: business._id,
    workspaceId: req.user.workspaceId,
    status: "completed",
  })
    .sort({ createdAt: -1 })
    .lean();
  if (!latestAudit)
    return res
      .status(400)
      .json({
        error: {
          code: "AUDIT_REQUIRED",
          message: "Complete a website audit before generating outreach.",
        },
      });
  const quota = await reserveQuota(req, "outreach", 1);
  if (!quota)
    return res
      .status(429)
      .json({
        error: {
          code: "QUOTA_EXCEEDED",
          message: "Your outreach draft limit has been reached.",
          upgrade: true,
        },
      });
  const firstFinding = latestAudit.findings[0];
  const evidence = latestAudit.findings
    .slice(0, 3)
    .map(
      (finding) =>
        `${finding.title}: ${finding.evidence} (${finding.affectedUrl})`,
    );
  const content =
    value.data.kind === "linkedin"
      ? `Hi, I noticed ${business.name}'s website could benefit from ${firstFinding?.suggestedService || "a few improvements"}. I found: ${firstFinding?.title || "a website opportunity"} — ${firstFinding?.evidence || "verified during a page audit"}. Would it be useful to share a few ideas?`
      : `Subject: A quick website idea for ${business.name}\n\nHi,\n\nI was looking at ${business.name}'s website and noticed ${firstFinding?.title || "an opportunity to improve the site"}. The audit evidence was: ${firstFinding?.evidence || "a verified website finding"}\n\nI help businesses with ${firstFinding?.suggestedService || "website improvements"}. If useful, I can share a short plan for addressing this.\n\nBest,\n[Your name]`;
  const draft = await OutreachDraftModel.create({
    workspaceId: req.user.workspaceId,
    businessId: business._id,
    leadId: business.crmLeadId,
    kind: value.data.kind,
    content,
    evidence,
    provider: process.env.OPENAI_API_KEY ? "openai-ready" : "evidence-template",
  });
  await confirmQuota(quota.reservation._id);
  res.status(201).json({ data: draft });
}
export async function usage(req, res) {
  res.json({ data: await getUsage(req.user.workspaceId) });
}
