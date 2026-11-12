const providerUrl = process.env.BUSINESS_DISCOVERY_PROVIDER_URL;
const providerToken = process.env.BUSINESS_DISCOVERY_PROVIDER_TOKEN;

export async function discoverBusinesses(query) {
  if (!providerUrl || !providerToken) {
    const error = new Error(
      "A compliant business-data provider is not configured. No businesses were created.",
    );
    error.code = "DISCOVERY_PROVIDER_NOT_CONFIGURED";
    throw error;
  }
  const response = await fetch(providerUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const error = new Error(`Business provider returned ${response.status}.`);
    error.code = "DISCOVERY_PROVIDER_ERROR";
    throw error;
  }
  const body = await response.json();
  if (!Array.isArray(body.businesses)) {
    const error = new Error("Business provider response was invalid.");
    error.code = "DISCOVERY_PROVIDER_INVALID_RESPONSE";
    throw error;
  }
  return body.businesses
    .slice(0, query.limit)
    .map((business) => ({
      providerId: String(business.providerId || business.id || ""),
      name: String(business.name || "").trim(),
      websiteUrl: business.websiteUrl ? String(business.websiteUrl) : undefined,
      location: business.location ? String(business.location) : undefined,
      category: business.category ? String(business.category) : undefined,
      publicContact: business.publicContact || {},
    }))
    .filter((business) => business.name && business.providerId);
}
