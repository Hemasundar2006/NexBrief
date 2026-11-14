import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';
import { LeadModel, ProposalModel } from '../models/index.js';
import { ActivityModel } from '../models/index.js';
import { ClientProfile, Deposit, FollowSequence } from '../models/journey.js';
import { z } from 'zod';

const router = Router();
const scoped = req => ({ workspaceId: req.user.workspaceId, archivedAt: null });

router.use(requireAuth, requirePermission('leads:read'));

router.get('/', asyncHandler(async (req, res) => {
  const leads = await LeadModel.find({ ...scoped(req), stage: 'Won' }).sort({ updatedAt: -1 }).limit(200).lean();
  const proposals = await ProposalModel.find({ workspaceId: req.user.workspaceId }).select('leadId status paymentStatus amount currency').lean();
  const leadIds = leads.map(item => item._id);
  const [profiles, payments, activity, followups] = await Promise.all([
    Promise.all(leads.map(lead => ClientProfile.findOneAndUpdate({ workspaceId: req.user.workspaceId, leadId: lead._id }, { $setOnInsert: { workspaceId: req.user.workspaceId, leadId: lead._id } }, { upsert: true, new: true }).lean())),
    Deposit.find({ workspaceId: req.user.workspaceId, proposalId: { $in: proposals.map(item => item._id) } }).lean(),
    ActivityModel.find({ workspaceId: req.user.workspaceId, leadId: { $in: leadIds } }).sort({ createdAt: -1 }).limit(500).lean(),
    FollowSequence.find({ workspaceId: req.user.workspaceId, leadId: { $in: leadIds } }).lean(),
  ]);
  const data = leads.map((client,index) => { const relatedProposals=proposals.filter(item=>String(item.leadId)===String(client._id)); return { ...client, ...profiles[index]?.toObject?.()||profiles[index], id:String(client._id), proposals:relatedProposals, payments:payments.filter(item=>relatedProposals.some(p=>String(p._id)===String(item.proposalId))), followups:followups.filter(item=>String(item.leadId)===String(client._id)), activity:activity.filter(item=>String(item.leadId)===String(client._id)) }; });
  res.json({ data });
}));

router.patch('/:id', requirePermission('leads:write'), asyncHandler(async (req,res)=>{
  if(!mongoose.isValidObjectId(req.params.id)) return res.sendStatus(404);
  const value=z.object({notes:z.string().max(10000).optional(),projects:z.array(z.object({name:z.string().min(2).max(160),status:z.string().max(50),deadline:z.coerce.date().optional(),budget:z.number().nonnegative().optional(),currency:z.string().length(3).optional()})).max(50).optional()}).parse(req.body);
  const lead=await LeadModel.findOne({...scoped(req),_id:req.params.id,stage:'Won'}); if(!lead)return res.sendStatus(404);
  const profile=await ClientProfile.findOneAndUpdate({workspaceId:req.user.workspaceId,leadId:lead._id},{$set:value,$setOnInsert:{workspaceId:req.user.workspaceId,leadId:lead._id}},{upsert:true,new:true}); res.json({data:profile});
}));

router.post('/:id/files', requirePermission('leads:write'), asyncHandler(async(req,res)=>{
  if(!mongoose.isValidObjectId(req.params.id))return res.sendStatus(404);
  const value=z.object({name:z.string().min(1).max(200),url:z.string().url().max(2000),publicId:z.string().max(300).optional(),mimeType:z.string().max(120).optional(),bytes:z.number().int().nonnegative().optional()}).parse(req.body);
  const lead=await LeadModel.findOne({...scoped(req),_id:req.params.id,stage:'Won'});if(!lead)return res.sendStatus(404);
  const profile=await ClientProfile.findOneAndUpdate({workspaceId:req.user.workspaceId,leadId:lead._id},{$setOnInsert:{workspaceId:req.user.workspaceId,leadId:lead._id},$push:{files:value}},{upsert:true,new:true});res.status(201).json({data:profile.files.at(-1)});
}));

router.post('/from-lead/:id', requirePermission('leads:write'), asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.sendStatus(404);
  const client = await LeadModel.findOneAndUpdate(
    { ...scoped(req), _id: req.params.id },
    { $set: { stage: 'Won', nextAction: 'Plan project kickoff', nextActionAt: null } },
    { new: true },
  );
  if (!client) return res.status(404).json({ error: { message: 'Client request not found.' } });
  res.status(201).json({ data: { ...client.toObject(), id: String(client._id) } });
}));

export default router;
