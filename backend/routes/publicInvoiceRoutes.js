import {Router} from 'express';
import {asyncHandler} from '../middleware/errors.js';
import {ClientPortal,Invoice} from '../models/journey.js';
const router=Router();
router.get('/public/client/:token/invoices',asyncHandler(async(req,res)=>{const portal=await ClientPortal.findOne({token:req.params.token,active:true}).lean();if(!portal)return res.status(404).json({error:{message:'This client portal link is unavailable.'}});const invoices=await Invoice.find({workspaceId:portal.workspaceId,projectId:portal.projectId}).select('number items subtotal tax total currency status dueDate paidAt notes createdAt').sort({createdAt:-1}).lean();res.json({data:invoices});}));
export default router;
