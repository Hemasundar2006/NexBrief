export function parseLeadCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') { if (quoted && input[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = ''; if (char === '\r' && input[i + 1] === '\n') i++; }
    else field += char;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quote.');
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() || []).map(value => value.toLowerCase());
  if (!['name','company','service'].every(key => headers.includes(key))) throw new Error('CSV needs name, company, and service columns.');
  if (!rows.length || rows.length > 500) throw new Error('Choose a CSV containing 1 to 500 leads.');
  return rows.map((values, index) => {
    const entry = Object.fromEntries(headers.map((header, i) => [header, values[i] || '']));
    const value = entry.value ? Number(entry.value) : 0;
    if (!entry.name || !entry.company || !entry.service || !Number.isFinite(value) || value < 0) throw new Error(`Check the required fields and value on row ${index + 2}.`);
    return {name:entry.name, company:entry.company, service:entry.service, value, ...(entry.email ? {email:entry.email} : {}), ...(entry.notes ? {notes:entry.notes} : {})};
  });
}
