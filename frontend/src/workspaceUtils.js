export const stages = ['New lead', 'Contacted', 'Interested', 'Call scheduled', 'Proposal sent', 'Won', 'Lost'];
export const proposalStatuses = ['Draft', 'Sent', 'Viewed', 'Accepted', 'Declined', 'Expired'];
export const paymentStatuses = ['Not requested', 'Deposit due', 'Deposit paid', 'Partially paid', 'Paid in full', 'Refunded'];
export const can = (user, permission) => !!user?.permissions?.includes(permission);
export const initials = (name = '') => name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'CF';
export const money = (value = 0, currency = 'USD') => {
  try { return new Intl.NumberFormat('en-US', {style:'currency',currency,maximumFractionDigits:2}).format(value); }
  catch { return `${currency} ${Number(value).toLocaleString()}`; }
};
export const totalsByCurrency = (items, field = 'value') => {
  const sums = items.reduce((totals, item) => { const currency = item.currency || 'USD'; totals[currency] = (totals[currency] || 0) + Number(item[field] || 0); return totals; }, {});
  return Object.entries(sums).map(([currency, value]) => money(value, currency)).join(' / ') || '$0';
};
export const isOpen = lead => !['Won','Lost'].includes(lead.stage);
export const isDue = lead => isOpen(lead) && lead.nextActionAt && new Date(lead.nextActionAt) <= new Date();
export const localDateInput = value => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const dateLabel = value => value ? new Date(value).toLocaleDateString(undefined, {month:'short',day:'numeric'}) : 'No date set';
