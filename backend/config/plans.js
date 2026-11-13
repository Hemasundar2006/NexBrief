// Prices live on the server.  The values below are intentionally sandbox-safe
// until production pricing is approved; override them with environment values.
const amount = (key, fallback = 1) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export const planCatalog = {
  free: {
    id: "free", name: "Free", monthlyAmount: 0, yearlyAmount: 0, currency: "INR",
    limits: { discoveries: 20, audits: 5, outreach: 10, storedLeads: 20 },
    features: ["20 stored leads", "10 AI drafts", "5 website audits", "20 discoveries"],
  },
  pro: {
    id: "pro", name: "Pro", monthlyAmount: amount("CASHFREE_PRO_MONTHLY_AMOUNT", 99),
    yearlyAmount: amount("CASHFREE_PRO_YEARLY_AMOUNT", 1100), currency: "INR",
    limits: { discoveries: 500, audits: 100, outreach: 200, storedLeads: 1000 },
    features: ["1,000 stored leads", "200 AI drafts", "100 website audits", "500 discoveries"],
  },
  plus: {
    id: "plus", name: "Plus", monthlyAmount: amount("CASHFREE_PLUS_MONTHLY_AMOUNT", 199),
    yearlyAmount: amount("CASHFREE_PLUS_YEARLY_AMOUNT", 2300), currency: "INR",
    limits: { discoveries: 2000, audits: 500, outreach: 1000, storedLeads: 5000 },
    features: ["5,000 stored leads", "1,000 AI drafts", "500 website audits", "2,000 discoveries"],
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
