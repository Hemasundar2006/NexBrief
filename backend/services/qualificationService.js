// Transparent baseline scoring; this is a heuristic, not an AI prediction.
export function qualifyInquiry(lead) {
  const reasons = [];
  let score = 0;
  if (lead.email) { score += 20; reasons.push('Contact email supplied'); }
  if (lead.service) { score += 20; reasons.push('Service identified'); }
  if (lead.value > 0) { score += 30; reasons.push('Budget supplied'); }
  if ((lead.notes || '').length >= 80) { score += 20; reasons.push('Detailed project brief'); }
  if (lead.deadline) { score += 10; reasons.push('Target date supplied'); }
  return { score, reasons, provider: 'rules', interest: score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold', nextAction: lead.value > 0 ? 'Confirm scope and availability' : 'Ask about budget and scope' };
}
