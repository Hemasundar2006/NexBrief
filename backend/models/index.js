import mongoose, { Schema } from "mongoose";
import {
  interestLevels,
  leadStages,
  paymentStatuses,
  proposalStatuses,
} from "../config/constants.js";
const options = { timestamps: true, versionKey: false };
const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, trim: true, maxlength: 20 },
    passwordHash: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, enum: ["owner", "member"], default: "member" },
    platformOwner: { type: Boolean, default: false },
    accessRole: {
      type: String,
      default: "member",
      trim: true,
      lowercase: true,
      maxlength: 80,
    },
    serviceRole: {
      type: String,
      enum: ["web-developer", "video-editor", "custom-service"],
      default: "custom-service",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "invited"],
      default: "active",
      index: true,
    },
    lastLoginAt: Date,
    deletedAt: Date,
  },
  options,
);
const WorkspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
    profession: {
      type: String,
      enum: ["web-developer", "video-editor", "creative"],
      default: "creative",
    },
    currency: { type: String, default: "USD", maxlength: 3 },
    plan: { type: String, enum: ["free", "pro", "plus"], default: "free", index: true },
    billingStatus: { type: String, enum: ["trial", "active", "past_due"], default: "trial" },
    subscriptionId: { type: String, index: true },
    subscriptionStatus: { type: String, default: "NONE", index: true },
    billingCycle: { type: String, enum: ["MONTHLY", "YEARLY"] },
    subscriptionAmount: { type: Number, min: 0 },
    subscriptionCurrency: { type: String, default: "INR", uppercase: true },
    authorizationStatus: String,
    mandateStatus: String,
    activatedAt: Date,
    nextBillingDate: Date,
    expiresAt: Date,
    autoRenew: { type: Boolean, default: false },
    retentionDays: { type: Number, default: 730, min: 30, max: 3650 },
  },
  options,
);
const LeadSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    company: { type: String, required: true, trim: true, maxlength: 160 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 40 },
    website: { type: String, trim: true, maxlength: 500 },
    source: { type: String, trim: true, maxlength: 80 },
    service: { type: String, required: true, trim: true, maxlength: 160 },
    value: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD", maxlength: 3 },
    stage: { type: String, enum: leadStages, default: "New lead", index: true },
    interest: { type: String, enum: interestLevels, default: "Warm" },
    qualificationScore: { type: Number, default: 0, min: 0, max: 100 },
    nextAction: { type: String, default: "Qualify this lead", maxlength: 240 },
    nextActionAt: Date,
    deadline: Date,
    contactConsentAt: Date,
    captureId: String,
    qualification: Schema.Types.Mixed,
    notes: { type: String, maxlength: 1e4 },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    archivedAt: Date,
  },
  options,
);
LeadSchema.index({ workspaceId: 1, updatedAt: -1 });
const ActivitySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, index: true },
    actorId: Schema.Types.ObjectId,
    type: { type: String, required: true, maxlength: 80 },
    summary: { type: String, required: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  options,
);
const DraftSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, required: true, index: true },
    kind: {
      type: String,
      enum: ["outreach", "followup", "proposal"],
      required: true,
    },
    content: { type: String, required: true, maxlength: 3e4 },
    provider: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "approved", "discarded"],
      default: "draft",
    },
  },
  options,
);
const ProposalSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    summary: { type: String, maxlength: 1e4 },
    deliverables: [{ type: String, maxlength: 500 }],
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", maxlength: 3 },
    deposit: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: proposalStatuses, default: "Draft" },
    timeline: { type: String, required: true, maxlength: 500 },
    validUntil: Date,
    paymentStatus: {
      type: String,
      enum: paymentStatuses,
      default: "Not requested",
    },
    paymentProvider: {
      type: String,
      enum: ["manual", "stripe"],
      default: "manual",
    },
    externalPaymentId: String,
    sentAt: Date,
    acceptedAt: Date,
    revisions: {type:Number,default:1,min:0},
    terms: {type:String,maxlength:5000},
  },
  options,
);
const ConsentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    purpose: {
      type: String,
      enum: ["service", "ai-processing", "marketing"],
      required: true,
    },
    granted: { type: Boolean, required: true },
    policyVersion: { type: String, required: true },
    source: { type: String, default: "app" },
    recordedAt: { type: Date, default: Date.now },
  },
  options,
);
const AuditSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, index: true },
    actorId: Schema.Types.ObjectId,
    action: { type: String, required: true, index: true },
    entityType: String,
    entityId: String,
    ipHash: String,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  options,
);
AuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536e3 });
const RefreshSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null, index: true },
    replacedBy: String,
    userAgent: { type: String, maxlength: 500 },
    ipAddress: { type: String, maxlength: 100 },
  },
  options,
);
RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const RoleSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/,
      maxlength: 80,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 300 },
    permissions: [{ type: String, trim: true, maxlength: 80 }],
    builtIn: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  options,
);
RoleSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
const DiscoveryJobSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    query: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
      index: true,
    },
    provider: { type: String, default: "not-configured" },
    resultCount: { type: Number, default: 0 },
    errorCode: String,
    errorMessage: String,
    startedAt: Date,
    completedAt: Date,
  },
  options,
);
DiscoveryJobSchema.index({ workspaceId: 1, createdAt: -1 });
const DiscoveredBusinessSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, required: true, index: true },
    provider: { type: String, required: true },
    providerId: String,
    name: { type: String, required: true, trim: true, maxlength: 200 },
    websiteUrl: { type: String, trim: true, maxlength: 1000 },
    location: { type: String, maxlength: 300 },
    category: { type: String, maxlength: 160 },
    publicContact: { type: Schema.Types.Mixed, default: {} },
    auditStatus: {
      type: String,
      enum: ["not-started", "queued", "running", "completed", "failed"],
      default: "not-started",
    },
    opportunityScore: { type: Number, min: 0, max: 100 },
    scoreReason: String,
    crmLeadId: Schema.Types.ObjectId,
  },
  options,
);
DiscoveredBusinessSchema.index(
  { workspaceId: 1, provider: 1, providerId: 1 },
  { unique: true, sparse: true },
);
DiscoveredBusinessSchema.index({ workspaceId: 1, opportunityScore: -1 });
const WebsiteAuditSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, required: true, index: true },
    url: { type: String, required: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
      index: true,
    },
    summary: String,
    healthScore: { type: Number, min: 0, max: 100 },
    findings: [
      {
        code: String,
        severity: { type: String, enum: ["info", "low", "medium", "high"] },
        title: String,
        explanation: String,
        evidence: String,
        affectedUrl: String,
        suggestedService: String,
      },
    ],
    checks: { type: Schema.Types.Mixed, default: {} },
    provider: { type: String, default: "built-in-fetch" },
    errorCode: String,
    errorMessage: String,
    startedAt: Date,
    completedAt: Date,
  },
  options,
);
WebsiteAuditSchema.index({ workspaceId: 1, businessId: 1, createdAt: -1 });
const UsageLedgerSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    feature: { type: String, required: true },
    periodStart: { type: Date, required: true },
    limit: { type: Number, required: true },
    used: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
  },
  options,
);
UsageLedgerSchema.index(
  { workspaceId: 1, feature: 1, periodStart: 1 },
  { unique: true },
);
const QuotaReservationSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    feature: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["reserved", "confirmed", "released"],
      default: "reserved",
    },
    periodStart: { type: Date, required: true },
  },
  options,
);
QuotaReservationSchema.index(
  { workspaceId: 1, feature: 1, idempotencyKey: 1 },
  { unique: true },
);
const OutreachDraftSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, required: true },
    leadId: Schema.Types.ObjectId,
    kind: {
      type: String,
      enum: ["cold-email", "proposal", "follow-up", "linkedin"],
      required: true,
    },
    content: { type: String, required: true, maxlength: 30000 },
    evidence: [{ type: String }],
    provider: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "approved", "discarded"],
      default: "draft",
    },
  },
  options,
);
const BillingTransactionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: ["free", "pro", "plus"], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true },
    orderId: { type: String, required: true, unique: true, index: true },
    transactionId: String,
    status: { type: String, enum: ["created", "pending", "success", "failed"], default: "created", index: true },
    paymentMode: String,
    responseCode: String,
    responseMessage: String,
    rawResponse: Schema.Types.Mixed,
  },
  { timestamps: true },
);
const SubscriptionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: String, enum: ["pro", "plus"], required: true },
    planName: { type: String, required: true },
    billingCycle: { type: String, enum: ["MONTHLY", "YEARLY"], required: true },
    recurringAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true },
    subscriptionId: { type: String, required: true, unique: true, index: true },
    cashfreeSubscriptionId: String,
    subscriptionSessionId: String,
    subscriptionStatus: { type: String, default: "INITIALIZED", index: true },
    authorizationStatus: { type: String, default: "INITIALIZED" },
    mandateStatus: String,
    activatedAt: Date,
    nextBillingDate: Date,
    expiresAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    autoRenew: { type: Boolean, default: true },
    checkoutLock: { type: Boolean, default: false },
    pendingPlanId: String,
    pendingBillingCycle: String,
    pendingCashfreePlanId: String,
    pendingCancel: { type: Boolean, default: false },
    paidThrough: Date,
    lastPaymentAt: Date,
    lastPaymentStatus: String,
  },
  options,
);
SubscriptionSchema.index({ workspaceId: 1, subscriptionStatus: 1, createdAt: -1 });
SubscriptionSchema.index({ workspaceId: 1 }, { unique: true, partialFilterExpression: { checkoutLock: true } });
const SubscriptionTransactionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription", index: true },
    cashfreeSubscriptionId: String,
    cashfreePaymentId: { type: String, index: true },
    transactionType: { type: String, enum: ["initial", "recurring", "refund", "adjustment"], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true },
    paymentStatus: { type: String, enum: ["SUCCESS", "FAILED", "PENDING", "REFUNDED"], required: true, index: true },
    paymentMethod: String,
    paymentTimestamp: Date,
    verifiedAt: Date,
    rawReference: { type: Schema.Types.Mixed, select: false },
  },
  options,
);
SubscriptionTransactionSchema.index({ cashfreePaymentId: 1 }, { unique: true, sparse: true });
const SubscriptionWebhookSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    subscriptionId: String,
    paymentId: String,
    signatureVerified: { type: Boolean, required: true },
    processingStatus: { type: String, enum: ["received", "processed", "failed", "ignored"], default: "received" },
    rawPayload: { type: Schema.Types.Mixed, select: false },
    processedAt: Date,
    errorMessage: String,
  },
  options,
);
const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
const WorkspaceModel =
  mongoose.models.Workspace || mongoose.model("Workspace", WorkspaceSchema);
const LeadModel = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
const ActivityModel =
  mongoose.models.Activity || mongoose.model("Activity", ActivitySchema);
const DraftModel =
  mongoose.models.Draft || mongoose.model("Draft", DraftSchema);
const ProposalModel =
  mongoose.models.Proposal || mongoose.model("Proposal", ProposalSchema);
const ConsentModel =
  mongoose.models.Consent || mongoose.model("Consent", ConsentSchema);
const AuditModel =
  mongoose.models.Audit || mongoose.model("Audit", AuditSchema);
const RefreshSessionModel =
  mongoose.models.RefreshSession ||
  mongoose.model("RefreshSession", RefreshSessionSchema);
const RoleModel = mongoose.models.Role || mongoose.model("Role", RoleSchema);
const DiscoveryJobModel =
  mongoose.models.DiscoveryJob ||
  mongoose.model("DiscoveryJob", DiscoveryJobSchema);
const DiscoveredBusinessModel =
  mongoose.models.DiscoveredBusiness ||
  mongoose.model("DiscoveredBusiness", DiscoveredBusinessSchema);
const WebsiteAuditModel =
  mongoose.models.WebsiteAudit ||
  mongoose.model("WebsiteAudit", WebsiteAuditSchema);
const UsageLedgerModel =
  mongoose.models.UsageLedger ||
  mongoose.model("UsageLedger", UsageLedgerSchema);
const QuotaReservationModel =
  mongoose.models.QuotaReservation ||
  mongoose.model("QuotaReservation", QuotaReservationSchema);
const OutreachDraftModel =
  mongoose.models.OutreachDraft ||
  mongoose.model("OutreachDraft", OutreachDraftSchema);
const PlatformSettingSchema = new Schema(
  {
    key: { type: String, default: "global", unique: true, index: true },
    maintenanceMode: { type: Boolean, default: false },
    pauseRegistrations: { type: Boolean, default: false },
    maintenanceNotice: {
      type: String,
      default:
        "NexBrief is currently undergoing scheduled maintenance. Please check back shortly.",
      maxlength: 500,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  options,
);
const PlatformSettingModel =
  mongoose.models.PlatformSetting ||
  mongoose.model("PlatformSetting", PlatformSettingSchema);
const WaitlistSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  profession: { type: String, enum: ["web-developer", "video-editor", "creative"], required: true },
  monthlyClientVolume: { type: String, required: true, maxlength: 80 },
  currentMethod: { type: String, required: true, maxlength: 160 },
  heardFrom: { type: String, required: true, maxlength: 160 },
  expectedUse: { type: String, required: true, maxlength: 1000 },
  consent: { type: Boolean, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  proGrantedAt: Date,
  betaAccessUntil: Date,
  reviewedAt: Date,
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
}, options);
WaitlistSchema.index({ email: 1 }, { unique: true });
const FeedbackSchema = new Schema({
  waitlistId: { type: Schema.Types.ObjectId, ref: "Waitlist", index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  difficulty: { type: String, required: true, maxlength: 1000 },
  dislikedFeature: { type: String, required: true, maxlength: 1000 },
  desiredFeature: { type: String, required: true, maxlength: 1000 },
  recommend: { type: String, enum: ["yes", "maybe", "no"], required: true },
  status: { type: String, enum: ["new", "reviewed", "planned", "completed"], default: "new", index: true },
}, options);
FeedbackSchema.index({ email: 1, createdAt: -1 });
const WaitlistModel = mongoose.models.Waitlist || mongoose.model("Waitlist", WaitlistSchema);
const FeedbackModel = mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);
const BillingTransactionModel =
  mongoose.models.BillingTransaction ||
  mongoose.model("BillingTransaction", BillingTransactionSchema);
const SubscriptionModel = mongoose.models.Subscription || mongoose.model("Subscription", SubscriptionSchema);
const SubscriptionTransactionModel = mongoose.models.SubscriptionTransaction || mongoose.model("SubscriptionTransaction", SubscriptionTransactionSchema);
const SubscriptionWebhookModel = mongoose.models.SubscriptionWebhook || mongoose.model("SubscriptionWebhook", SubscriptionWebhookSchema);
export {
  ActivityModel,
  AuditModel,
  ConsentModel,
  DraftModel,
  LeadModel,
  ProposalModel,
  UserModel,
  WorkspaceModel,
  RefreshSessionModel,
  RoleModel,
  DiscoveryJobModel,
  DiscoveredBusinessModel,
  WebsiteAuditModel,
  UsageLedgerModel,
  QuotaReservationModel,
  OutreachDraftModel,
  BillingTransactionModel,
  PlatformSettingModel,
  WaitlistModel,
  FeedbackModel,
  SubscriptionModel,
  SubscriptionTransactionModel,
  SubscriptionWebhookModel,
};
