export const previewUser = {
  name: 'Alex Morgan',
  role: 'web-developer',
  accountType: 'owner',
  permissions: ['leads:read','leads:write','pipeline:read','pipeline:write','outreach:generate','proposals:read','proposals:write','payments:read','workspace:manage'],
  workspace: { name: 'Morgan Creative Studio', currency: 'USD', profession: 'web-developer' },
};

export const previewLeads = [
  {id:'preview-1',name:'Jordan Lee',company:'Bright Dental',email:'jordan@example.com',service:'Website redesign',value:3500,currency:'USD',stage:'Interested',interest:'Hot',qualificationScore:85,nextAction:'Review the redesign brief',nextActionAt:'2026-11-13T15:00:00Z'},
  {id:'preview-2',name:'Sam Rivera',company:'Oak & Pine',email:'sam@example.com',service:'Portfolio website',value:5200,currency:'USD',stage:'Proposal sent',interest:'Warm',qualificationScore:72,nextAction:'Check in on proposal',nextActionAt:'2026-11-15T16:00:00Z'},
  {id:'preview-3',name:'Taylor Brooks',company:'Northstar Fitness',email:'taylor@example.com',service:'Landing page',value:1800,currency:'USD',stage:'New lead',interest:'Warm',qualificationScore:60,nextAction:'Qualify the project',nextActionAt:'2026-11-18T15:00:00Z'},
  {id:'preview-4',name:'Casey Wong',company:'Studio Frame',email:'casey@example.com',service:'Video editing',value:2400,currency:'USD',stage:'Contacted',interest:'Warm',qualificationScore:68,nextAction:'Share editing packages',nextActionAt:'2026-11-14T17:00:00Z'},
  {id:'preview-5',name:'Jamie Park',company:'Kindred Coffee',email:'jamie@example.com',service:'Website refresh',value:2800,currency:'USD',stage:'Won',interest:'Hot',qualificationScore:91,nextAction:'Begin project kickoff'},
];

export const previewProposals = [
  {id:'preview-proposal-1',leadId:'preview-2',title:'Oak & Pine portfolio website',amount:5200,deposit:1560,currency:'USD',timeline:'4 weeks',status:'Sent',paymentStatus:'Deposit due'},
  {id:'preview-proposal-2',leadId:'preview-5',title:'Kindred Coffee website refresh',amount:2800,deposit:840,currency:'USD',timeline:'3 weeks',status:'Accepted',paymentStatus:'Deposit paid'},
];

export const previewActivities = [
  {_id:'preview-activity-1',type:'proposal.created',summary:'Oak & Pine portfolio website proposal created',createdAt:'2026-11-11T14:00:00Z'},
  {_id:'preview-activity-2',type:'payment.updated',summary:'Kindred Coffee website refresh · Deposit paid',createdAt:'2026-11-10T10:00:00Z'},
  {_id:'preview-activity-3',type:'lead.created',summary:'Northstar Fitness added to leads',createdAt:'2026-11-09T13:00:00Z'},
];
