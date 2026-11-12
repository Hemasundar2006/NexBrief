export const permissionCatalog = [
  "leads:read",
  "leads:write",
  "pipeline:read",
  "pipeline:write",
  "outreach:generate",
  "proposals:read",
  "proposals:write",
  "payments:read",
  "workspace:manage",
];

export const builtInRoles = [
  {
    key: "web-developer",
    name: "Web Developer",
    description:
      "Manage web development leads, outreach, proposals, and payments.",
    permissions: [
      "leads:read",
      "leads:write",
      "pipeline:read",
      "pipeline:write",
      "outreach:generate",
      "proposals:read",
      "proposals:write",
      "payments:read",
      "workspace:manage",
    ],
  },
  {
    key: "video-editor",
    name: "Video Editor",
    description:
      "Manage video editing leads, outreach, proposals, and payments.",
    permissions: [
      "leads:read",
      "leads:write",
      "pipeline:read",
      "pipeline:write",
      "outreach:generate",
      "proposals:read",
      "proposals:write",
      "payments:read",
      "workspace:manage",
    ],
  },
  {
    key: "custom-service",
    name: "Custom Services",
    description: "Manage assigned creative-service leads and sales work.",
    permissions: [
      "leads:read",
      "leads:write",
      "pipeline:read",
      "pipeline:write",
      "outreach:generate",
      "proposals:read",
      "proposals:write",
      "payments:read",
      "workspace:manage",
    ],
  },
];
