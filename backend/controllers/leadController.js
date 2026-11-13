import { z } from "zod";
import { LeadModel } from "../models/index.js";
import { interestLevels, leadStages } from "../config/constants.js";
import { audit, recordActivity } from "../services/auditService.js";
const servicePattern={
  "video-editor":/(video|editing|editor|youtube|podcast|reels|short-form|motion graphics)/i,
  "web-developer":/(website|web|landing page|portfolio|e-commerce|shopify|wordpress)/i,
};
function serviceAllowed(service,role){return !servicePattern[role]||servicePattern[role].test(String(service||""));}
function scopeFilter(req){const pattern=servicePattern[req.user.serviceRole];return pattern?{service:{$regex:pattern}}:{};}
export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  website: z.string().url().optional().or(z.literal("")),
  source: z.string().max(80).optional(),
  service: z.string().min(2).max(160),
  value: z.number().nonnegative().default(0),
  currency: z.string().length(3).default("USD"),
  stage: z.enum(leadStages).default("New lead"),
  interest: z.enum(interestLevels).default("Warm"),
  qualificationScore: z.number().int().min(0).max(100).default(0),
  nextAction: z.string().max(240).default("Qualify this lead"),
  nextActionAt: z.coerce.date().optional(),
  notes: z.string().max(10000).optional(),
  tags: z.array(z.string().max(40)).max(20).default([]),
});
export async function list(req, res) {
  const search = String(req.query.search || "").slice(0, 100),
    filter = { workspaceId: req.user.workspaceId, archivedAt: null, ...scopeFilter(req) };
  if (req.query.stage) filter.stage = req.query.stage;
  if (search)
    filter.$or = ["name", "company", "service", "email"].map((key) => ({
      [key]: {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      },
    }));
  const page = Math.max(1, Number(req.query.page) || 1),
    limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const [data, total] = await Promise.all([
    LeadModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    LeadModel.countDocuments(filter),
  ]);
  res.json({ data, meta: { page, limit, total } });
}
export async function get(req, res) {
  const data = await LeadModel.findOne({
    _id: req.params.id,
    workspaceId: req.user.workspaceId,
    archivedAt: null,
    ...scopeFilter(req),
  }).lean();
  data
    ? res.json({ data })
    : res.status(404).json({ error: { code: "LEAD_NOT_FOUND" } });
}
export async function create(req, res) {
  const p = leadSchema.safeParse(req.body);
  if (!p.success)
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", details: p.error.flatten() },
    });
  if (!serviceAllowed(p.data.service,req.user.serviceRole)) return res.status(403).json({error:{code:"SERVICE_SCOPE_MISMATCH",message:"This account can only manage leads for its assigned service."}});
  const data = await LeadModel.create({
    ...p.data,
    workspaceId: req.user.workspaceId,
  });
  await recordActivity(req, "lead.created", `${data.company} added to leads`, data._id);
  await audit(req, "lead.create", "lead", String(data._id));
  res.status(201).json({ data });
}
export async function importMany(req, res) {
  const p = z
    .object({ leads: z.array(leadSchema).min(1).max(500) })
    .safeParse(req.body);
  if (!p.success)
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", details: p.error.flatten() },
    });
  const invalid=p.data.leads.find(lead=>!serviceAllowed(lead.service,req.user.serviceRole));
  if(invalid)return res.status(403).json({error:{code:"SERVICE_SCOPE_MISMATCH",message:"Imported leads must match this account's assigned service."}});
  const data = await LeadModel.insertMany(
    p.data.leads.map((lead) => ({
      ...lead,
      workspaceId: req.user.workspaceId,
    })),
  );
  await recordActivity(req, "lead.imported", `${data.length} leads imported`);
  await audit(req, "lead.import", "lead", null, { count: data.length });
  res.status(201).json({ data, meta: { imported: data.length } });
}
export async function update(req, res) {
  const p = leadSchema.partial().safeParse(req.body);
  if (!p.success)
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", details: p.error.flatten() },
    });
  if (p.data.service&&!serviceAllowed(p.data.service,req.user.serviceRole)) return res.status(403).json({error:{code:"SERVICE_SCOPE_MISMATCH",message:"This account can only manage leads for its assigned service."}});
  const data = await LeadModel.findOneAndUpdate(
    { _id: req.params.id, workspaceId: req.user.workspaceId, archivedAt: null, ...scopeFilter(req) },
    p.data,
    { new: true, runValidators: true },
  );
  if (!data) return res.status(404).json({ error: { code: "LEAD_NOT_FOUND" } });
  await recordActivity(req, "lead.updated", `${data.company} updated${p.data.stage ? ` · ${p.data.stage}` : ""}`, data._id);
  await audit(req, "lead.update", "lead", String(req.params.id), {
    fields: Object.keys(p.data),
  });
  res.json({ data });
}
export async function archive(req, res) {
  const data = await LeadModel.findOneAndUpdate(
    { _id: req.params.id, workspaceId: req.user.workspaceId, archivedAt: null, ...scopeFilter(req) },
    { archivedAt: new Date() },
  );
  if (!data) return res.status(404).json({ error: { code: "LEAD_NOT_FOUND" } });
  await recordActivity(req, "lead.archived", `${data.company} archived`, data._id);
  await audit(req, "lead.archive", "lead", String(req.params.id));
  res.status(204).send();
}
