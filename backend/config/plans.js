// Prices live on the server.  The values below are intentionally sandbox-safe
// until production pricing is approved; override them with environment values.
const amount = (key, fallback = 1) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export const planCatalog = {
  free: {
    id: "free", name: "Free", monthlyAmount: 0, yearlyAmount: 0, currency: "INR",
    limits: { discoveries: 20, audits: 5, outreach: 10, storedLeads: 20, clients: 5, proposals: 5, activeProjects: 2, tasks: 50, storageBytes: 262144000, portals: 1, invoices: 5, reviews: 5 },
    features: ["20 leads", "10 AI drafts", "5 website audits", "2 active projects", "250 MB file storage"],
  },
  pro: {
    id: "pro", name: "Pro", monthlyAmount: amount("CASHFREE_PRO_MONTHLY_AMOUNT", 99),
    yearlyAmount: amount("CASHFREE_PRO_YEARLY_AMOUNT", 1100), currency: "INR",
    limits: { discoveries: 500, audits: 100, outreach: 200, storedLeads: 1000, clients: 30, proposals: 30, activeProjects: 10, tasks: 300, storageBytes: 2147483648, portals: 10, invoices: 50, reviews: 30 },
    features: ["1,000 leads", "200 AI drafts", "100 website audits", "10 active projects", "2 GB file storage"],
  },
  plus: {
    id: "plus", name: "Plus", monthlyAmount: amount("CASHFREE_PLUS_MONTHLY_AMOUNT", 199),
    yearlyAmount: amount("CASHFREE_PLUS_YEARLY_AMOUNT", 2300), currency: "INR",
    limits: { discoveries: 2000, audits: 500, outreach: 1000, storedLeads: 5000, clients:  null, proposals: null, activeProjects: null, tasks: null, storageBytes: 10737418240, portals: null, invoices: null, reviews: null },
    features: ["5,000 leads", "1,000 AI drafts", "Unlimited projects and proposals", "10 GB file storage"],
  },
};

export const plans = Object.fromEntries(
  Object.entries(planCatalog).map(([key, value]) => [key, value.limits]),
);

export const quotaFeature = {
  discoveries: "discoveries",
  audits: "audits",
  outreach: "outreach",
};

export function getPlan(planId, billingCycle = "MONTHLY") {
  const plan = planCatalog[String(planId || "").toLowerCase()];
  if (!plan) return null;
  const cycle = String(billingCycle).toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";
  return { ...plan, billingCycle: cycle, amount: cycle === "YEARLY" ? plan.yearlyAmount : plan.monthlyAmount };
}
export function effectiveWorkspacePlan(workspace) {
  if (workspace?.subscriptionId && workspace.expiresAt && new Date(workspace.expiresAt) <= new Date()) return "free";
  return workspace?.plan || "free";
}

export function publicPlans() {
  return Object.values(planCatalog).map(({ limits, ...plan }) => ({ ...plan, features: plan.features, limits }));
}
