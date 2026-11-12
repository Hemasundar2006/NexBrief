import crypto from "node:crypto";
import PaytmChecksum from "paytmchecksum";
import { z } from "zod";
import { BillingTransactionModel, UserModel, WorkspaceModel } from "../models/index.js";

const plans = { pro: 1, plus: 1 };
const endpoint = () => process.env.PAYTM_ENV === "production" ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";
const configured = () => Boolean(process.env.PAYTM_MID && process.env.PAYTM_MERCHANT_KEY);
function orderId(){return `NB_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`.slice(0,50)}

export async function createPaytmOrder(req,res){
  const parsed=z.object({plan:z.enum(["pro","plus"])}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:{code:"INVALID_PLAN"}});
  if(!configured())return res.status(503).json({error:{code:"PAYTM_NOT_CONFIGURED",message:"Paytm test credentials are not configured yet."}});
  const id=orderId(), amount=plans[parsed.data.plan].toFixed(2);
  const body={requestType:"Payment",mid:process.env.PAYTM_MID,websiteName:process.env.PAYTM_WEBSITE||"WEBSTAGING",orderId:id,callbackUrl:process.env.PAYTM_CALLBACK_URL||`${process.env.PUBLIC_API_ORIGIN||"http://localhost:4000"}/api/paytm/callback`,txnAmount:{value:amount,currency:"INR"},userInfo:{custId:String(req.user.id)}};
  const signature=await PaytmChecksum.generateSignature(JSON.stringify(body),process.env.PAYTM_MERCHANT_KEY);
  const response=await fetch(`${endpoint()}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(process.env.PAYTM_MID)}&orderId=${encodeURIComponent(id)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body,head:{signature}})});
  const result=await response.json();
  if(!response.ok||result.body?.resultInfo?.resultStatus!=="S")return res.status(502).json({error:{code:"PAYTM_INIT_FAILED",message:result.body?.resultInfo?.resultMsg||"Could not start Paytm checkout."}});
  await BillingTransactionModel.create({workspaceId:req.user.workspaceId,userId:req.user.id,plan:parsed.data.plan,amount:Number(amount),orderId:id,status:"pending"});
  res.status(201).json({data:{orderId:id,txnToken:result.body.txnToken,mid:process.env.PAYTM_MID,amount}});
}

export async function paytmCallback(req,res){
  const payload={...req.body};const checksum=payload.CHECKSUMHASH;delete payload.CHECKSUMHASH;
  if(!checksum||!process.env.PAYTM_MERCHANT_KEY||!(await PaytmChecksum.verifySignature(payload,process.env.PAYTM_MERCHANT_KEY,checksum)))return res.status(400).send("Invalid payment signature");
  const orderId=payload.ORDERID;const transaction=await BillingTransactionModel.findOne({orderId});if(!transaction)return res.status(404).send("Order not found");
  if(Number(payload.TXNAMOUNT)!==Number(transaction.amount).toFixed(2)*1)return res.status(400).send("Amount mismatch");
  const status=payload.STATUS==="TXN_SUCCESS"?"success":payload.STATUS==="PENDING"?"pending":"failed";
  transaction.status=status;transaction.transactionId=payload.TXNID;transaction.paymentMode=payload.PAYMENTMODE;transaction.responseCode=payload.RESPCODE;transaction.responseMessage=payload.RESPMSG;transaction.rawResponse=payload;await transaction.save();
  if(status==="success")await WorkspaceModel.updateOne({_id:transaction.workspaceId},{$set:{plan:transaction.plan,billingStatus:"active"}});
  res.send("Payment received. You can return to NexBrief.");
}

export async function listMyBilling(req,res){res.json({data:await BillingTransactionModel.find({workspaceId:req.user.workspaceId,userId:req.user.id}).select("plan amount currency orderId transactionId status paymentMode responseCode createdAt updatedAt").sort({createdAt:-1}).limit(50).lean()});}

export async function listAdminBilling(req,res){const rows=await BillingTransactionModel.find({}).populate("userId","name email").select("workspaceId userId plan amount currency orderId transactionId status paymentMode responseCode createdAt updatedAt").sort({createdAt:-1}).limit(500).lean();res.json({data:rows});}
