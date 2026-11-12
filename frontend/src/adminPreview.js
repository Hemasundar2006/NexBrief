export const previewPermissionCatalog = [
  'leads:read','leads:write','pipeline:read','pipeline:write','outreach:generate',
  'proposals:read','proposals:write','payments:read','team:read','team:manage',
  'roles:manage','audit:read','workspace:manage',
];

export const previewRoles = [
  {id:'role-admin',key:'admin',name:'Admin',description:'Full workspace access and team management.',permissions:previewPermissionCatalog,builtIn:true,active:true},
  {id:'role-web',key:'web-developer',name:'Web Developer',description:'Manage web projects from lead to deposit.',permissions:previewPermissionCatalog.slice(0,8),builtIn:true,active:true},
  {id:'role-video',key:'video-editor',name:'Video Editor',description:'Manage editing projects from brief to deposit.',permissions:previewPermissionCatalog.slice(0,8),builtIn:true,active:true},
  {id:'role-creative',key:'custom-service',name:'Custom Services',description:'Manage other creative client work.',permissions:previewPermissionCatalog.slice(0,8),builtIn:true,active:true},
  {id:'role-assistant',key:'sales-assistant',name:'Sales Assistant',description:'Review leads and the pipeline.',permissions:['leads:read','leads:write','pipeline:read','proposals:read'],builtIn:false,active:true},
];

export const previewTeam = [
  {id:'user-owner',name:'Hemasundar Maroti',email:'founder@example.com',role:'admin',serviceRole:'web-developer',accountType:'owner',status:'active',lastLoginAt:'2026-11-12T10:20:00Z',createdAt:'2026-10-28T09:00:00Z'},
  {id:'user-web',name:'Alex Morgan',email:'alex@example.com',role:'web-developer',serviceRole:'web-developer',accountType:'member',status:'active',lastLoginAt:'2026-11-11T15:30:00Z',createdAt:'2026-11-02T11:00:00Z'},
  {id:'user-editor',name:'Casey Rivera',email:'casey@example.com',role:'video-editor',serviceRole:'video-editor',accountType:'member',status:'active',lastLoginAt:'2026-11-10T13:10:00Z',createdAt:'2026-11-03T10:00:00Z'},
  {id:'user-assistant',name:'Jordan Lee',email:'jordan@example.com',role:'sales-assistant',serviceRole:'custom-service',accountType:'member',status:'suspended',lastLoginAt:null,createdAt:'2026-11-04T12:00:00Z'},
];

export const previewAudit = [
  {_id:'audit-1',actorId:'user-owner',action:'role.create',entityType:'role',entityId:'role-assistant',createdAt:'2026-11-12T09:30:00Z',metadata:{key:'sales-assistant'}},
  {_id:'audit-2',actorId:'user-owner',action:'user.update',entityType:'user',entityId:'user-assistant',createdAt:'2026-11-11T16:00:00Z',metadata:{status:'suspended'}},
  {_id:'audit-3',actorId:'user-web',action:'proposal.create',entityType:'proposal',entityId:'proposal-example',createdAt:'2026-11-11T14:00:00Z',metadata:{}},
  {_id:'audit-4',actorId:'user-owner',action:'user.create',entityType:'user',entityId:'user-editor',createdAt:'2026-11-03T10:00:00Z',metadata:{role:'video-editor'}},
];
