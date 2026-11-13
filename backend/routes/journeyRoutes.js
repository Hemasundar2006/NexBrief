import { Router } from 'express';
import mongoose, { Schema } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';
import { rateLimit } from '../middleware/security.js';
import { LeadModel, ProposalModel, WorkspaceModel, UserModel } from '../models/index.js';
import { effectiveWorkspacePlan, plans } from '../config/plans.js';
import { qualifyInquiry } from '../services/qualificationService.js';
import {CaptureForm as Form,FollowSequence as Sequence,ProposalShare as Share,JourneySettings} from '../models/journey.js';
import {queueMail,integrationStatus} from '../services/journeyService.js';

const router=Router();
const wrap=asyncHandler;
const roleServices={
 'web-developer':['Website development','Website redesign','Landing page','Portfolio website','Website refresh','E-commerce website'],
 'video-editor':['Video editing','Short-form video','YouTube editing','Podcast editing','Reels and social clips','Motion graphics'],
};
const allowedServices = role => roleServices[role] || null;
const input=z.object({name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),phone:z.string().max(40).default(''),deadline:z.string().date().optional().or(z.literal('')),company:z.string().trim().max(160).default(''),service:z.string().trim().min(2).max(160),value:z.number().nonnegative().max(10000000),notes:z.string().trim().min(20).max(10000),consent:z.literal(true),website:z.string().max(0).optional(),submissionId:z.string().uuid()});
router.get('/public/forms/:token',rateLimit(60),wrap(async(req,res)=>{
 const form=await Form.findOne({token:req.params.token,enabled:true});
 if(!form)return res.status(404).json({error:{message:'This inquiry form is unavailable.'}});
 const workspace=await WorkspaceModel.findById(form.workspaceId).select('name currency profession');
 const permitted=allowedServices(workspace?.profession);
 res.json({data:{name:workspace?.name,currency:workspace?.currency||'USD',title:form.title,description:form.description,services:permitted ? form.services.filter(service=>permitted.includes(service)) : form.services}});
}));
router.post('/public/forms/:token',rateLimit(5),wrap(async(req,res)=>{
 const parsed=input.safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:{message:'Please check the form and consent checkbox.'}});
 const form=await Form.findOne({token:req.params.token,enabled:true});
 if(!form)return res.status(404).json({error:{message:'This inquiry form is unavailable.'}});
 const workspace=await WorkspaceModel.findById(form.workspaceId);
 const owner=workspace&&await UserModel.findOne({_id:workspace.ownerId,status:'active',deletedAt:null});
 if(!owner)return res.status(404).json({error:{message:'This inquiry form is unavailable.'}});
 const p=parsed.data,qualification=qualifyInquiry(p);
 if(!form.services.includes(p.service) || (allowedServices(workspace.profession) && !allowedServices(workspace.profession).includes(p.service)))return res.status(400).json({error:{message:'Choose an available service.'}});
 let lead;
 await mongoose.connection.transaction(async session=>{
  await WorkspaceModel.updateOne({_id:workspace._id},{$set:{updatedAt:new Date()}},{session});
  lead=await LeadModel.findOne({workspaceId:workspace._id,captureId:p.submissionId}).session(session);if(lead)return;
  const count=await LeadModel.countDocuments({workspaceId:workspace._id,archivedAt:null}).session(session);
  if(count>=(plans[effectiveWorkspacePlan(workspace)]||plans.free).storedLeads)throw Object.assign(new Error('This form cannot accept more inquiries right now.'),{status:409});
  [lead]=await LeadModel.create([{workspaceId:workspace._id,captureId:p.submissionId,name:p.name,email:p.email,phone:p.phone,deadline:p.deadline||undefined,company:p.company||p.name,service:p.service,value:p.value,currency:workspace.currency,notes:p.notes,contactConsentAt:new Date(),source:'Public inquiry form',qualification,qualificationScore:qualification.score,interest:qualification.interest,nextAction:qualification.nextAction,nextActionAt:new Date()}],{session});
 });
 if(form.notify)await queueMail({workspaceId:workspace._id,key:`inquiry-${lead._id}`,to:owner.email,subject:'A new inquiry arrived in NexBrief',text:'A client submitted your inquiry form. Open your workspace to review it.',dueAt:new Date()});
 res.status(201).json({data:{received:true}});
}));
router.get('/public/proposals/:token',rateLimit(60),wrap(async(req,res)=>{
 const share=await Share.findOne({token:req.params.token,expiresAt:{$gt:new Date()}});
 if(!share)return res.status(404).json({error:{message:'Proposal link expired or unavailable.'}});
 const p=await ProposalModel.findOne({_id:share.proposalId,workspaceId:share.workspaceId});
 if(!p)return res.sendStatus(404);
 if(p.status==='Sent'){p.status='Viewed';await p.save();}
 const settings=await JourneySettings.findOne({workspaceId:share.workspaceId});
 res.json({data:{...(share.snapshot||{title:p.title,summary:p.summary,deliverables:p.deliverables,amount:p.amount,currency:p.currency,deposit:p.deposit,timeline:p.timeline,terms:p.terms,revisions:p.revisions}),status:p.status,paymentStatus:p.paymentStatus,decision:share.decision,expiresAt:share.expiresAt,paymentInstructions:settings?.paymentInstructions||'',checkoutReady:Boolean(settings?.paytmMid&&integrationStatus().paymentEncryption&&p.currency==='INR')}});
}));
router.post('/public/proposals/:token',rateLimit(10),wrap(async(req,res)=>{
 const p=z.object({decision:z.enum(['Accepted','Declined']),name:z.string().trim().min(2).max(120),consent:z.literal(true)}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:{message:'Enter your name and confirm your decision.'}});
 await mongoose.connection.transaction(async session=>{
 const share=await Share.findOneAndUpdate({token:req.params.token,expiresAt:{$gt:new Date()},decision:'pending'},{$set:{decision:p.data.decision,respondent:p.data.name,respondedAt:new Date()}},{new:true,session});
 if(!share)throw Object.assign(new Error('This proposal has expired or already received a response.'),{status:409});
 const updated=await ProposalModel.updateOne({_id:share.proposalId,workspaceId:share.workspaceId},{$set:{status:p.data.decision,...(p.data.decision==='Accepted'?{acceptedAt:new Date(),paymentStatus:'Deposit due'}:{})}},{session});if(!updated.matchedCount)throw Object.assign(new Error('Proposal not found.'),{status:404});
 });
 res.json({data:{received:true}});
}));
router.use('/journey',requireAuth,requirePermission('leads:write'));
router.get('/journey/sequences',wrap(async(req,res)=>res.json({data:await Sequence.find({workspaceId:req.user.workspaceId}).lean()})));
router.post('/journey/sequences/:id',wrap(async(req,res)=>{
 if(!mongoose.isValidObjectId(req.params.id))return res.sendStatus(404);
 const lead=await LeadModel.findOne({_id:req.params.id,workspaceId:req.user.workspaceId,archivedAt:null});
 if(!lead)return res.sendStatus(404);
 const data=await Sequence.findOneAndUpdate({workspaceId:req.user.workspaceId,leadId:lead._id},{$setOnInsert:{steps:[2,5,10].map((day,i)=>({dueAt:new Date(Date.now()+day*86400000),subject:`Following up: ${lead.service}`,content:`Hi ${lead.name}, ${['thank you for your interest in','checking in about','would you still like to discuss'][i]} ${lead.service}? Please let me know your next step.`}))}},{upsert:true,new:true});
 res.json({data});
}));
router.patch('/journey/sequences/:id',wrap(async(req,res)=>{
 return res.status(409).json({error:{message:'Use the updated follow-up editor to change or approve messages.'}});
 /* Legacy endpoint retired to keep approved outbox messages consistent.
 if(!mongoose.isValidObjectId(req.params.id))return res.sendStatus(404);
 const p=z.object({paused:z.boolean().optional(),step:z.number().int().min(0).max(2).optional(),content:z.string().min(1).max(5000).optional(),done:z.boolean().optional()}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:{message:'Invalid sequence update.'}});
 const updates={};if(p.data.paused!==undefined)updates.paused=p.data.paused;
 if(p.data.step!==undefined){if(p.data.content!==undefined)updates[`steps.${p.data.step}.content`]=p.data.content;if(p.data.done!==undefined)updates[`steps.${p.data.step}.done`]=p.data.done;}
 const data=await Sequence.findOneAndUpdate({_id:req.params.id,workspaceId:req.user.workspaceId},{$set:updates},{new:true});if(!data)return res.sendStatus(404);res.json({data}); */
}));
router.post('/journey/proposals/:id/share',requirePermission('proposals:write'),wrap(async(req,res)=>{
 if(!mongoose.isValidObjectId(req.params.id))return res.sendStatus(404);
 const p=await ProposalModel.findOne({_id:req.params.id,workspaceId:req.user.workspaceId});if(!p)return res.sendStatus(404);
 if(['Accepted','Declined'].includes(p.status))return res.status(409).json({error:{message:'Create a new proposal to revise a completed decision.'}});
 const snapshot=Object.fromEntries(['title','summary','deliverables','amount','currency','deposit','timeline','terms','revisions'].map(k=>[k,p[k]]));
 const data=await Share.findOneAndUpdate({proposalId:p._id},{$set:{workspaceId:req.user.workspaceId,token:randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+30*86400000),snapshot,decision:'pending'},$unset:{respondent:1,respondedAt:1}},{upsert:true,new:true});
 if(p.status==='Draft'){p.status='Sent';p.sentAt=new Date();await p.save();}res.json({data});
}));
router.get('/journey/form',wrap(async(req,res)=>{
 const workspace=await WorkspaceModel.findById(req.user.workspaceId).select('profession');
 const services=roleServices[workspace?.profession]||roleServices[req.user.serviceRole]||['Custom service','Creative consultation','Content production'];
 const data=await Form.findOneAndUpdate({workspaceId:req.user.workspaceId},{$setOnInsert:{token:randomBytes(24).toString('hex'),services}},{upsert:true,new:true});
 if (roleServices[workspace?.profession]) {
  const filtered=data.services.filter(service=>services.includes(service));
  if (filtered.length !== data.services.length || !filtered.length) { data.services=filtered.length ? filtered : services; await data.save(); }
 }
 res.json({data});
}));
router.patch('/journey/form',wrap(async(req,res)=>{
 const value=z.object({enabled:z.boolean().optional(),title:z.string().trim().min(2).max(120).optional(),description:z.string().max(1000).optional(),services:z.array(z.string().trim().min(2).max(160)).min(1).max(20).optional(),notify:z.boolean().optional()}).parse(req.body);
 const workspace=await WorkspaceModel.findById(req.user.workspaceId).select('profession').lean();
 const permitted=allowedServices(workspace?.profession);
 if (permitted && value.services?.some(service=>!permitted.includes(service))) return res.status(400).json({error:{message:'Choose services for your account role.'}});
 const data=await Form.findOneAndUpdate({workspaceId:req.user.workspaceId},{$set:value},{new:true});res.json({data});
}));
router.post('/journey/qualify/:id',wrap(async(req,res)=>{
 if(!mongoose.isValidObjectId(req.params.id))return res.sendStatus(404);
 const lead=await LeadModel.findOne({_id:req.params.id,workspaceId:req.user.workspaceId,archivedAt:null});
 if(!lead)return res.sendStatus(404);
 const result=qualifyInquiry(lead);lead.qualificationScore=result.score;lead.interest=result.interest;lead.nextAction=result.nextAction;await lead.save();res.json({data:result});
}));
export default router;
