import { Router } from "express";
import {
  consents,
  deleteAccount,
  exportData,
  setConsent,
  updateWorkspace,
} from "../controllers/privacyController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { WorkspaceModel } from "../models/index.js";
const router = Router();
router.use(requireAuth);
router.get("/consents", asyncHandler(consents));
router.put("/consents/:purpose", asyncHandler(setConsent));
router.get("/export", requirePermission("workspace:manage"), asyncHandler(exportData));
router.delete("/account", asyncHandler(async(req,res,next)=>{
  const workspace=await WorkspaceModel.findOne({_id:req.user.workspaceId,ownerId:req.user.id}).select("_id").lean();
  return workspace?next():res.status(403).json({error:{code:'ACCOUNT_OWNER_REQUIRED',message:'Only the registered account owner can delete this account.'}});
}), asyncHandler(deleteAccount));
router.patch("/workspace", requirePermission("workspace:manage"), asyncHandler(updateWorkspace));
export default router;
