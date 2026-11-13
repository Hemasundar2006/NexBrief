import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {MailJob,FollowSequence} from '../models/journey.js';
import {LeadModel,UserModel} from '../models/index.js';
import {databaseReady} from '../config/database.js';
import {isMaintenanceActive} from './platformSettingsService.js';
export function integrationStatus(){return {ai:Boolean(process.env.OPENAI_API_KEY),email:Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM),paymentEncryption:Boolean(process.env.INTEGRATION_ENCRYPTION_KEY&&/^[a-f\d]{64}$/i.test(process.env.INTEGRATION_ENCRYPTION_KEY)),worker:process.env.EMAIL_WORKER_ENABLED==='true'};}
function key(){if(!integrationStatus().paymentEncryption)throw Object.assign(new Error('Payment credential encryption needs owner setup.'),{status:503});return Buffer.from(process.env.INTEGRATION_ENCRYPTION_KEY,'hex');}
export function encryptSecret(value){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([c.update(value,'utf8'),c.final()]);return [iv,c.getAuthTag(),data].map(b=>b.toString('base64')).join('.');}
export function decryptSecret(value){const [iv,tag,data]=value.split('.').map(v=>Buffer.from(v,'base64'));const d=createDecipheriv('aes-256-gcm',key(),iv);d.setAuthTag(tag);return Buffer.concat([d.update(data),d.final()]).toString();}
export function toMinor(value){return Math.round((Number(value)+Number.EPSILON)*100);}
export function paymentState(total,deposit,paid){return paid>=total?'Paid in full':paid>=deposit&&paid>0?'Deposit paid':paid>0?'Partially paid':'Deposit due';}
export async function queueMail(values){return MailJob.findOneAndUpdate({key:values.key},{$setOnInsert:values},{upsert:true,new:true});}
let running=false;
export async function deliverMail(){
 if(running||!databaseReady()||!integrationStatus().email||isMaintenanceActive())return;
 running=true;
 try{
  // Do not automatically retry uncertain deliveries after a crash; avoid duplicate client messages.
  await MailJob.updateMany({status:'sending',attemptedAt:{$lt:new Date(Date.now()-300000)}},{$set:{status:'failed',error:'Delivery unconfirmed. Check provider logs before retrying.'}});
  for(let i=0;i<10;i++){
   const job=await MailJob.findOneAndUpdate({status:'queued',dueAt:{$lte:new Date()}},{$set:{status:'sending',attemptedAt:new Date()}},{new:true,sort:{dueAt:1}});
   if(!job)break;
   try{
    const owner=await UserModel.findOne({workspaceId:job.workspaceId,status:'active',deletedAt:null,platformOwner:{$ne:true}});
    if(!owner){job.status='cancelled';await job.save();continue;}
    if(job.sequenceId){
     const sequence=await FollowSequence.findOne({_id:job.sequenceId,workspaceId:job.workspaceId});
     const step=sequence?.steps.id(job.stepId);
     const lead=await LeadModel.findOne({_id:job.leadId,workspaceId:job.workspaceId,archivedAt:null});
     if(!sequence||!step||!step.approved||step.done||!lead||['Won','Lost'].includes(lead.stage)){job.status='cancelled';await job.save();continue;}
     if(sequence.paused){job.status='queued';job.dueAt=new Date(Date.now()+60000);await job.save();continue;}
    }
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':job.key},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[job.to],reply_to:job.replyTo,subject:job.subject,text:job.text}),signal:AbortSignal.timeout(20000)});
    const result=await response.json();if(!response.ok||!result.id)throw new Error(`Email provider rejected delivery (${response.status}).`);
    job.status='sent';job.providerId=result.id;job.sentAt=new Date();job.error=undefined;await job.save();
    if(job.sequenceId)await FollowSequence.updateOne({_id:job.sequenceId,'steps._id':job.stepId},{$set:{'steps.$.done':true,'steps.$.sentAt':job.sentAt}});
   }catch(error){job.status='failed';job.error=error.message.slice(0,200);await job.save();}
  }
 }finally{running=false;}
}
export function startMailWorker(){if(process.env.EMAIL_WORKER_ENABLED!=='true')return;const timer=setInterval(()=>deliverMail().catch(()=>console.error('Email worker failed')),30000);timer.unref();}
