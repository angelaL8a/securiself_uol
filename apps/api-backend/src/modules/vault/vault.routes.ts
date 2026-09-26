import { Router } from "express";
import { getSessionUser } from "../../lib/request";
import { authUser } from "../../middleware/authUser";
import { updateVaultSchema } from "./vault.schemas";
import { getVault, updateVault } from "./vault.service";

export const vaultRouter = Router();

vaultRouter.use(authUser);

vaultRouter.get("/", async (req, res) => {
  const user = getSessionUser(req);
  const vault = await getVault(user.id);
  res.json({ status: "success", data: vault });
});

vaultRouter.put("/", async (req, res) => {
  const user = getSessionUser(req);
  const body = updateVaultSchema.parse(req.body);
  const vault = await updateVault(user.id, body);
  res.json({ status: "success", data: vault });
});
