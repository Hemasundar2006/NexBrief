import { Router } from 'express';
import { z } from 'zod';
import { FeedbackModel, UserModel, WaitlistModel } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';
import { rateLimit } from '../middleware/security.js';

const router = Router();
const waitlistSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), profession: z.enum(['web-developer', 'video-editor', 'creative']), monthlyClientVolume: z.string().trim().min(1).max(80), currentMethod: z.string().trim().min(2).max(160), heardFrom: z.string().trim().min(2).max(160), expectedUse: z.string().trim().min(2).max(1000), consent: z.literal(true) });
const feedbackSchema = z.object({ difficulty: z.string().trim().min(2).max(1000), dislikedFeature: z.string().trim().min(2).max(1000), desiredFeature: z.string().trim().min(2).max(1000), recommend: z.enum(['yes', 'maybe', 'no']) });

router.get('/waitlist/count', asyncHandler(async (_req, res) => {
  const [submitted, capacity] = await Promise.all([WaitlistModel.countDocuments({ status: { $ne: 'rejected' } }), Promise.resolve(Number(process.env.WAITLIST_CAPACITY || 100))]);
  res.json({ data: { submitted, capacity, remaining: Math.max(0, capacity - submitted) } });
}));
router.post('/waitlist', rateLimit(5, 3600000), asyncHandler(async (req, res) => {
  const parsed = waitlistSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please complete every waitlist field and consent checkbox.' } });
  const data = { ...parsed.data, email: parsed.data.email.toLowerCase() };
  const existing = await WaitlistModel.findOne({ email: data.email });
  if (existing) return res.status(409).json({ error: { code: 'ALREADY_WAITLISTED', message: 'This email is already on the NexBrief beta waitlist.' } });
  const capacity = Number(process.env.WAITLIST_CAPACITY || 100);
  if (await WaitlistModel.countDocuments({ status: { $ne: 'rejected' } }) >= capacity) return res.status(409).json({ error: { code: 'WAITLIST_FULL', message: 'The current beta cohort is full.' } });
  await WaitlistModel.create(data);
  res.status(201).json({ data: { submitted: true } });
}));
router.post('/feedback', requireAuth, rateLimit(5, 3600000), asyncHandler(async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please answer each feedback question.' } });
  const user = await UserModel.findById(req.user.id).select('email').lean();
  const waitlist = user && await WaitlistModel.findOne({ email: user.email }).select('_id').lean();
  const data = await FeedbackModel.create({ ...parsed.data, email: user.email, userId: req.user.id, waitlistId: waitlist?._id });
  res.status(201).json({ data: { id: data._id, submitted: true } });
}));

router.get('/admin/waitlist', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.platformOwner) return res.status(403).json({ error: { code: 'PLATFORM_OWNER_REQUIRED' } });
  const rows = await WaitlistModel.find({}).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ data: rows });
}));
router.patch('/admin/waitlist/:id', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.platformOwner) return res.status(403).json({ error: { code: 'PLATFORM_OWNER_REQUIRED' } });
  const action = z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional(), grantProDays: z.number().int().min(1).max(90).optional() }).safeParse(req.body);
  if (!action.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
  const update = { reviewedAt: new Date(), reviewedBy: req.user.id };
  if (action.data.status) update.status = action.data.status;
  if (action.data.grantProDays) { update.proGrantedAt = new Date(); update.betaAccessUntil = new Date(Date.now() + action.data.grantProDays * 86400000); update.status = 'approved'; }
  const row = await WaitlistModel.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
  if (!row) return res.status(404).json({ error: { code: 'WAITLIST_ENTRY_NOT_FOUND' } });
  res.json({ data: row });
}));
router.get('/admin/feedback', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.platformOwner) return res.status(403).json({ error: { code: 'PLATFORM_OWNER_REQUIRED' } });
  const rows = await FeedbackModel.find({}).sort({ createdAt: -1 }).limit(500).lean();
  res.json({ data: rows });
}));
router.patch('/admin/feedback/:id', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.platformOwner) return res.status(403).json({ error: { code: 'PLATFORM_OWNER_REQUIRED' } });
  const parsed = z.object({ status: z.enum(['new', 'reviewed', 'planned', 'completed']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
  const row = await FeedbackModel.findByIdAndUpdate(req.params.id, { $set: parsed.data }, { new: true }).lean();
  if (!row) return res.status(404).json({ error: { code: 'FEEDBACK_NOT_FOUND' } });
  res.json({ data: row });
}));
export default router;
