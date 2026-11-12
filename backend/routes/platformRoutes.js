import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { WorkspaceModel, UserModel } from "../models/index.js";
import { asyncHandler } from "../middleware/errors.js";
import { listAdminBilling } from "../controllers/paytmController.js";

const router = Router();
router.use(requireAuth, (req, res, next) => req.user.platformOwner
  ? next()
  : res.status(403).json({error:{code:"PLATFORM_OWNER_REQUIRED",message:"Platform account access is required."}}));

router.get("/overview", asyncHandler(async (_req, res) => {
  const workspaces = await WorkspaceModel.find({}).select("name ownerId profession plan billingStatus createdAt").sort({createdAt:-1}).lean();
  const members = await UserModel.find({platformOwner:{$ne:true},deletedAt:null}).select("name email workspaceId accessRole serviceRole status lastLoginAt createdAt").sort({createdAt:-1}).lean();
  const workspaceById = new Map(workspaces.map(workspace=>[String(workspace._id),workspace]));
  const data = members.map(member=>{
    const workspace=workspaceById.get(String(member.workspaceId));
    return {id:String(member._id),name:member.name,email:member.email,status:member.status,role:member.accessRole||member.serviceRole||"custom-service",serviceRole:member.serviceRole||"custom-service",lastLoginAt:member.lastLoginAt,createdAt:member.createdAt,workspace:workspace?{id:String(workspace._id),name:workspace.name,profession:workspace.profession,plan:workspace.plan||"free",billingStatus:workspace.billingStatus||"trial"}:null};
  });
  res.json({data,summary:{members:data.length,active:data.filter(item=>item.status==="active").length,webDevelopers:data.filter(item=>item.serviceRole==="web-developer").length,videoEditors:data.filter(item=>item.serviceRole==="video-editor").length}});
}));
router.get("/billing/transactions", asyncHandler(listAdminBilling));

router.patch("/members/:id", asyncHandler(async (req, res) => {
  const value=z.object({status:z.enum(["active","suspended"])}).safeParse(req.body);
  if(!value.success)return res.status(400).json({error:{code:"VALIDATION_ERROR"}});
  const member=await UserModel.findOneAndUpdate({_id:req.params.id,platformOwner:{$ne:true},deletedAt:null},{$set:{status:value.data.status}},{new:true}).select("name email status accessRole serviceRole lastLoginAt createdAt").lean();
  if(!member)return res.status(404).json({error:{code:"MEMBER_NOT_FOUND"}});
  res.json({data:{id:String(member._id),name:member.name,email:member.email,status:member.status,role:member.accessRole,serviceRole:member.serviceRole,lastLoginAt:member.lastLoginAt,createdAt:member.createdAt}});
}));

export default router;
