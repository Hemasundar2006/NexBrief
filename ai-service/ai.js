async function generateDraft(lead, kind) {
  const fallback = kind === "outreach" ? `Hi ${lead.name.split(" ")[0]},

I came across ${lead.company} and noticed an opportunity to improve your ${lead.service.toLowerCase()} experience. I help small teams turn that kind of opportunity into a polished, practical result.

Would it be useful to compare notes for 15 minutes this week?

Best,
Jordan` : kind === "followup" ? `Hi ${lead.name.split(" ")[0]},

Just following up on my note about helping ${lead.company} with ${lead.service.toLowerCase()}. If this is on your roadmap, I can share a simple scope and timeline.

Would Tuesday or Wednesday work for a quick chat?` : `Proposal: ${lead.service} for ${lead.company}

Scope: A focused ${lead.service.toLowerCase()} engagement designed around your current goals.
Timeline: 2\u20133 weeks
Investment: $${lead.value.toLocaleString()}
Deposit: $${Math.round(lead.value * 0.3).toLocaleString()}

This scope can be refined together after a short discovery call.`;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { draft: fallback, provider: "mock", note: "Add OPENAI_API_KEY to enable live AI drafts." };
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages: [{ role: "system", content: "You write concise, specific sales drafts for independent creative freelancers. Never invent facts. Return only the draft." }, { role: "user", content: `Create a ${kind} draft for ${lead.name} at ${lead.company}. Service: ${lead.service}. Estimated value: $${lead.value}. Notes: ${lead.notes || "None"}.` }], temperature: 0.7 }) });
    if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
    const data = await response.json();
    return { draft: data.choices?.[0]?.message?.content || fallback, provider: "openai" };
  } catch {
    return { draft: fallback, provider: "mock", note: "Live AI was unavailable; returned a safe local draft." };
  }
}
export {
  generateDraft
};
