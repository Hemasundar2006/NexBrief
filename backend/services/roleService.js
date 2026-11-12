import { builtInRoles } from "../config/roles.js";
import { RoleModel } from "../models/index.js";

export async function seedWorkspaceRoles(workspaceId) {
  await Promise.all(
    builtInRoles.map((role) =>
      RoleModel.updateOne(
        { workspaceId, key: role.key },
        { $setOnInsert: { ...role, workspaceId, builtIn: true } },
        { upsert: true },
      ),
    ),
  );
}
