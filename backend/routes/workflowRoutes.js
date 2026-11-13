import {Router} from 'express';
import {randomBytes} from 'node:crypto';
import mongoose from 'mongoose';
import {z} from 'zod';
import {requireAuth,requirePermission} from '../middleware/auth.js';
import {asyncHandler as wrap} from '../middleware/errors.js';
import {rateLimit} from '../middleware/security.js';
import {LeadModel,ProposalModel,UserModel,ConsentModel} from '../models/index.js';
import {FollowSequence,ProposalShare,ServiceTemplate,JourneySettings,MailJob,Deposit} from '../models/journey.js';
import {qualify} from '../../ai-service/qualification.js';
import {reserveQuota,confirmQuota,releaseQuota} from '../services/quotaService.js';
import {integrationStatus,encryptSecret,toMinor} from '../services/journeyService.js';
import {merchant,gateway,paytmRequest,syncDeposit,verifyDeposit} from '../services/clientPaymentService.js';
const router=Router(),id=z.string().regex(/^[a-f\d]{24}$/i),currency=z.enum(['USD','INR','EUR','GBP','CAD','AUD']);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const scoped=req=>({workspaceId:req.user.workspaceId});
async function publicProposal(token){const share=await ProposalShare.findOne({token,expiresAt:{$gt:new Date()}});const proposal=share&&await ProposalModel.findOne({_id:share.proposalId,workspaceId:share.workspaceId});const owner=share&&await UserModel.findOne({workspaceId:share.workspaceId,status:'active',deletedAt:null});if(!proposal||!owner)fail('Proposal link expired or unavailable.',404);return {share,proposal};}
router.post('/public/proposals/:token/checkout',rateLimit(5),wrap(async(req,res)=>{
 const {share,proposal}=await publicProposal(req.params.token);if(share.decision!=='Accepted')fail('Accept the proposal before paying.');if(proposal.currency!=='INR')fail('Paytm checkout supports INR proposals only.');if(!process.env.PUBLIC_API_ORIGIN)fail('Payment callback URL needs owner setup.',503);
 const paid=await syncDeposit(proposal),amountMinor=toMinor(proposal.deposit)-paid;if(amountMinor<=0)fail('No deposit is outstanding.');
 const s=await merchant(share.workspaceId),orderId=`NBD_${randomBytes(16).toString('hex')}`;
 const order=await Deposit.create({workspaceId:share.workspaceId,proposalId:proposal._id,orderId,amountMinor,currency:'INR',provider:'paytm'});
 const body={requestType:'Payment',mid:s.paytmMid,websiteName:s.paytmWebsite||'WEBSTAGING',orderId,callbackUrl:`${process.env.PUBLIC_API_ORIGIN}/api/public/payments/${orderId}/callback`,txnAmount:{value:(amountMinor/100).toFixed(2),currency:'INR'},userInfo:{custId:String(proposal.leadId)}};
 const result=await paytmRequest(s,`/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(s.paytmMid)}&orderId=${orderId}`,body);
 if(result.body?.resultInfo?.resultStatus!=='S'){order.status='failed';await order.save();fail('Unable to start checkout. Please try again.',502);}
 res.json({data:{orderId,txnToken:result.body.txnToken,amount:body.txnAmount.value,mid:s.paytmMid,gateway:gateway(s)}});
}));
router.post('/public/payments/:orderId/callback',rateLimit(30),wrap(async(req,res)=>{const order=await Deposit.findOne({orderId:req.params.orderId,provider:'paytm'});if(!order)fail('Order not found.',404);const verified=await verifyDeposit(order);res.type('text').send(verified?'Payment verified. Return to your proposal to see the updated status.':'Payment is not confirmed yet. Return to your proposal and check again.');}));
router.post('/public/proposals/:token/verify',rateLimit(10),wrap(async(req,res)=>{const {proposal}=await publicProposal(req.params.token);const order=await Deposit.findOne({proposalId:proposal._id,orderId:z.string().max(60).parse(req.body.orderId),provider:'paytm'});if(!order)fail('Order not found.',404);res.json({data:{paid:await verifyDeposit(order)}});}));
router.use('/workflow',requireAuth,requirePermission('leads:read'));
router.post('/workflow/qualify/:id',requirePermission('leads:write'),rateLimit(20),wrap(async(req,res)=>{
 const lead=await LeadModel.findOne({...scoped(req),_id:id.parse(req.params.id),archivedAt:null});if(!lead)fail('Lead not found.',404);const useAI=req.body.useAI===true;let quota;
 if(useAI){if(!integrationStatus().ai)fail('AI is awaiting owner setup.',503);const consent=await ConsentModel.findOne({userId:req.user.id,purpose:'ai-processing'}).sort({recordedAt:-1,_id:-1});if(!consent?.granted)fail('Enable AI processing in account privacy settings.',403);quota=await reserveQuota(req,'outreach');if(!quota)fail('Your AI usage limit is reached.',402);}
 try{const result=await qualify(lead,useAI);lead.qualification=result;lead.qualificationScore=result.score;lead.interest=result.interest;lead.nextAction=result.nextAction;await lead.save();if(quota)await confirmQuota(quota.reservation._id);res.json({data:result});}catch(error){if(quota)await releaseQuota(quota.reservation._id);throw error;}
}));
const templateInput=z.object({name:z.string().trim().min(2).max(120),profession:z.enum(['web-developer','video-editor','custom-service']),description:z.string().max(2000),deliverables:z.array(z.string().min(1).max(500)).min(1).max(30),questions:z.array(z.string().max(300)).max(20),amount:z.number().positive().max(10000000),currency,depositPercent:z.number().min(0).max(100),timeline:z.string().min(2).max(500),revisions:z.number().int().min(0).max(100),terms:z.string().max(5000)});
router.get('/workflow/templates',wrap(async(req,res)=>res.json({data:await ServiceTemplate.find(scoped(req)).sort({createdAt:-1}).lean()})));
router.post('/workflow/templates',requirePermission('proposals:write'),wrap(async(req,res)=>res.status(201).json({data:await ServiceTemplate.create({...templateInput.parse(req.body),...scoped(req)})})));
router.patch('/workflow/templates/:id',requirePermission('proposals:write'),wrap(async(req,res)=>{const data=await ServiceTemplate.findOneAndUpdate({...scoped(req),_id:id.parse(req.params.id)},{$set:templateInput.parse(req.body)},{new:true});if(!data)fail('Template not found.',404);res.json({data});}));
router.delete('/workflow/templates/:id',requirePermission('proposals:write'),wrap(async(req,res)=>{await ServiceTemplate.deleteOne({...scoped(req),_id:id.parse(req.params.id)});res.sendStatus(204);}));
router.post('/workflow/proposals',requirePermission('proposals:write'),wrap(async(req,res)=>{const p=templateInput.extend({leadId:id}).parse(req.body);const lead=await LeadModel.findOne({...scoped(req),_id:p.leadId,archivedAt:null});if(!lead)fail('Lead not found.',404);res.status(201).json({data:await ProposalModel.create({...scoped(req),leadId:lead._id,title:p.name,summary:p.description,deliverables:p.deliverables,amount:p.amount,currency:p.currency,deposit:Math.round(p.amount*p.depositPercent)/100,timeline:p.timeline,revisions:p.revisions,terms:p.terms})});}));
router.patch('/workflow/sequences/:id',requirePermission('leads:write'),wrap(async(req,res)=>{
 const p=z.object({paused:z.boolean().optional(),step:z.number().int().min(0).max(2).optional(),content:z.string().min(1).max(5000).optional(),subject:z.string().min(1).max(200).optional(),dueAt:z.coerce.date().optional(),done:z.boolean().optional(),approve:z.boolean().optional()}).parse(req.body);
 const s=await FollowSequence.findOne({...scoped(req),_id:id.parse(req.params.id)});if(!s)fail('Sequence not found.',404);if(p.paused!==undefined)s.paused=p.paused;
 if(p.step!==undefined){const step=s.steps[p.step];if(!step)fail('Step not found.');const jobKey=`follow-${s._id}-${step._id}`;const existing=await MailJob.findOne({key:jobKey});if(existing?.status==='sending'||existing?.status==='sent')fail('This message is already sending or sent.',409);if(step.done)fail('This step is complete.',409);
  for(const k of ['content','subject','dueAt','done'])if(p[k]!==undefined)step[k]=p[k];step.approved=false;
  if(existing){existing.status='cancelled';await existing.save();}
  if(p.approve){if(!integrationStatus().email||!integrationStatus().worker)fail('Email delivery needs owner setup.',503);const lead=await LeadModel.findOne({...scoped(req),_id:s.leadId,archivedAt:null});if(!lead?.email||!lead.contactConsentAt)fail('Sending requires a lead email and recorded contact permission.');if(s.paused||['Won','Lost'].includes(lead.stage))fail('Resume an open opportunity before approving.');const user=await UserModel.findById(req.user.id);const settings=await JourneySettings.findOne(scoped(req));step.approved=true;await MailJob.findOneAndUpdate({key:jobKey},{$set:{...scoped(req),leadId:lead._id,sequenceId:s._id,stepId:step._id,to:lead.email,replyTo:user.email,subject:step.subject||'Project follow-up',text:step.content+'\n\n'+(settings?.signature||user.name),dueAt:step.dueAt,status:'queued',error:null}},{upsert:true});}
 }await s.save();res.json({data:s});
}));
router.get('/workflow/outbox',wrap(async(req,res)=>res.json({data:await MailJob.find(scoped(req)).select('-text').sort({createdAt:-1}).limit(100).lean()})));
router.get('/workflow/integrations',wrap(async(req,res)=>{const settings=await JourneySettings.findOne(scoped(req));res.json({data:{status:integrationStatus(),settings:settings||{},merchantKeySaved:Boolean(await JourneySettings.exists({...scoped(req),encryptedKey:{$exists:true,$ne:''}}))}});}));
router.put('/workflow/integrations',requirePermission('workspace:manage'),wrap(async(req,res)=>{const p=z.object({signature:z.string().max(1000),paymentInstructions:z.string().max(2000),paytmMid:z.string().regex(/^[a-zA-Z0-9]*$/).max(40),paytmWebsite:z.string().max(40),paytmEnvironment:z.enum(['staging','production']),merchantKey:z.string().min(16).max(64).optional()}).parse(req.body);const {merchantKey,...settings}=p;if(merchantKey)settings.encryptedKey=encryptSecret(merchantKey);await JourneySettings.findOneAndUpdate(scoped(req),{$set:settings},{upsert:true});res.json({data:{saved:true}});}));
router.get('/workflow/deposits',requirePermission('payments:read'),wrap(async(req,res)=>res.json({data:await Deposit.find(scoped(req)).sort({createdAt:-1}).limit(200).lean()})));
router.post('/workflow/deposits',requirePermission('payments:read'),wrap(async(req,res)=>{
 const p=z.object({proposalId:id,amount:z.number().positive().max(10000000),reference:z.string().trim().min(2).max(200),paidAt:z.coerce.date().max(new Date()),requestId:z.string().uuid()}).parse(req.body);let data;
 await mongoose.connection.transaction(async session=>{const proposal=await ProposalModel.findOneAndUpdate({...scoped(req),_id:p.proposalId},{$set:{updatedAt:new Date()}},{new:true,session});if(!proposal)fail('Proposal not found.',404);data=await Deposit.findOne({orderId:`manual-${req.user.workspaceId}-${p.requestId}`}).session(session);if(data)return;const rows=await Deposit.find({...scoped(req),proposalId:proposal._id,status:'paid'}).session(session);const paid=rows.reduce((n,r)=>n+r.amountMinor,0);if(paid+toMinor(p.amount)>toMinor(proposal.amount))fail('Payment exceeds the remaining balance.');[data]=await Deposit.create([{...scoped(req),proposalId:p.proposalId,amountMinor:toMinor(p.amount),currency:proposal.currency,reference:p.reference,paidAt:p.paidAt,provider:'manual',status:'paid',orderId:`manual-${req.user.workspaceId}-${p.requestId}`,createdBy:req.user.id}],{session});});
 await syncDeposit(await ProposalModel.findOne({...scoped(req),_id:p.proposalId}));res.status(201).json({data});
}));
router.get('/workflow/analytics',wrap(async(req,res)=>{
 const end=req.query.to?new Date(`${String(req.query.to).slice(0,10)}T23:59:59.999Z`):new Date();
 const start=req.query.from?new Date(`${String(req.query.from).slice(0,10)}T00:00:00.000Z`):new Date(end.getTime()-29*86400000);
 if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||start>end||Math.ceil((end-start)/86400000)>=30)return fail('Analytics range must be between 1 and 30 days.');
 const range={createdAt:{$gte:start,$lte:end}};
 const leads=await LeadModel.find({...scoped(req),archivedAt:null,...range}).select('stage qualificationScore source createdAt').lean();
 const proposals=await ProposalModel.find({...scoped(req),...range}).select('status createdAt').lean();
 const deposits=await Deposit.find({...scoped(req),status:'paid',paidAt:{$gte:start,$lte:end}}).select('amountMinor currency paidAt').lean();
 const key=date=>new Date(date).toISOString().slice(0,10),daily=[];for(let cursor=new Date(start);cursor<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){daily.push({date:key(cursor),leads:0,proposals:0,won:0,revenue:0});}
 const byDate=new Map(daily.map(item=>[item.date,item]));leads.forEach(l=>{const item=byDate.get(key(l.createdAt));if(item){item.leads++;if(l.stage==='Won')item.won++;}});proposals.forEach(p=>{const item=byDate.get(key(p.createdAt));if(item)item.proposals++;});const revenue={};deposits.forEach(d=>{const amount=d.amountMinor/100;const item=byDate.get(key(d.paidAt));if(item)item.revenue+=amount;revenue[d.currency]=(revenue[d.currency]||0)+amount;});
 const won=leads.filter(l=>l.stage==='Won').length;
 res.json({data:{range:{from:key(start),to:key(end),days:daily.length},daily,leads:leads.length,qualified:leads.filter(l=>l.qualificationScore>=70).length,proposals:proposals.length,accepted:proposals.filter(p=>p.status==='Accepted').length,won,conversionRate:leads.length?Math.round(won/leads.length*100):0,revenue,sources:leads.reduce((a,l)=>{const source=l.source||'Unspecified';a[source]=(a[source]||0)+1;return a;},Object.create(null)),stages:leads.reduce((a,l)=>{a[l.stage]=(a[l.stage]||0)+1;return a;},Object.create(null)),due:await FollowSequence.countDocuments({...scoped(req),paused:false,steps:{$elemMatch:{done:false,dueAt:{$lte:new Date()}}}})}});
}));
export default router;
