const profiles={
 'web-developer':{
  label:'Web developer',
  shortLabel:'Web work',
  services:['Website development','Website redesign','Landing page','Portfolio website','Website refresh','E-commerce website'],
  starters:['Website redesign','Landing page package'],
  headline:'Turn website inquiries into paid projects.'
 },
 'video-editor':{
  label:'Video editor',
  shortLabel:'Video work',
  services:['Video editing','Short-form video','YouTube editing','Podcast editing','Reels and social clips','Motion graphics'],
  starters:['Video editing package','Short-form content package'],
  headline:'Turn editing inquiries into paid projects.'
 },
 'custom-service':{
  label:'Independent creative',
  shortLabel:'Creative work',
  services:['Custom service','Creative consultation','Content production'],
  starters:['Creative service package'],
  headline:'Turn creative inquiries into paid projects.'
 }
};
export function serviceProfile(role){return profiles[role]||profiles['custom-service'];}
export function matchesServiceRole(service,role){
 const text=String(service||'').toLowerCase();
 if(role==='video-editor')return /(video|editing|editor|youtube|podcast|reels|short-form|motion graphics)/i.test(text);
 if(role==='web-developer')return /(website|web|landing page|portfolio|e-commerce|shopify|wordpress)/i.test(text);
 return true;
}
export function scopedLeads(leads,role){return role==='custom-service'?leads:leads.filter(lead=>matchesServiceRole(lead.service,role));}
